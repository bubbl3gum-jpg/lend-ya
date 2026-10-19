import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, fields, integer, text, explanation } from "./http";
import { locked, permitted, event, hash } from "./service";
type Tx = Prisma.TransactionClient;
async function reviewer(tx: Tx, userId: number, lock = true) {
  if (lock) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR SHARE`;
    await tx.$queryRaw`SELECT "userId" FROM "ChatReviewer" WHERE "userId"=${userId} FOR SHARE`;
  }
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, accountStatus: true, chatReviewer: true } });
  if (user?.role !== "ADMIN" || user.accountStatus !== "ACTIVE" || !user.chatReviewer?.enabled) fail(403,"REVIEWER_REQUIRED","An explicit active chat-reviewer grant is required.");
}
async function caseRecord(tx: Tx, userId: number, caseId: number, assigned = true) {
  await tx.$queryRaw`SELECT id FROM "ChatModerationCase" WHERE id=${caseId} FOR UPDATE`;
  const c = await tx.chatModerationCase.findUnique({ where: { id: caseId }, include: { conversation: true, parent: true } });
  if (!c) fail(404,"NOT_FOUND","Moderation case not found.");
  if ([c.conversation.ownerId,c.conversation.borrowerId].includes(userId)) fail(403,"REVIEW_CONFLICT","Participants cannot investigate their own conversation.");
  if (c.parent?.assignedTo === userId) fail(403,"REVIEW_CONFLICT","An appeal requires a different reviewer.");
  if (assigned && c.assignedTo !== userId) fail(403,"CASE_SCOPE_REQUIRED","Claim this case before accessing evidence.");
  return c;
}
async function audit(tx: Tx, adminId: number, id: number, action: string, previousState: Prisma.InputJsonObject, newState: Prisma.InputJsonObject) {
  // Case reasons and message text stay in the scoped case. General audit readers receive references only.
  await tx.adminAuditLog.create({ data: { adminId, action, targetType: "CHAT_CASE", targetId: id, reason: `Chat moderation ${action.toLowerCase()} for case ${id}`, previousState, newState } });
}
export async function queue(userId: number, limit: number, before?: number) {
  return prisma.$transaction(async (tx) => {
    await reviewer(tx,userId);
    const rows = await tx.chatModerationCase.findMany({ where: { status: "OPEN", conversation: { ownerId: { not: userId }, borrowerId: { not: userId } }, ...(before ? { id: { lt: before } } : {}) }, orderBy: { id: "desc" }, take: limit+1, select: { id: true, kind: true, category: true, status: true, assignedTo: true, createdAt: true } });
    return { cases: rows.slice(0,limit), nextBefore: rows.length > limit ? rows[limit-1].id : null };
  });
}
export async function claim(userId: number, caseId: number) {
  return prisma.$transaction(async (tx) => {
    await reviewer(tx,userId); const c = await caseRecord(tx,userId,caseId,false);
    if (c.status !== "OPEN") fail(409,"CASE_CLOSED","Case is already decided.");
    if (c.assignedTo && c.assignedTo !== userId) fail(409,"CASE_ASSIGNED","Another reviewer owns this case.");
    if (c.assignedTo === userId) return { caseId, assigned: true };
    await tx.chatModerationCase.update({ where: { id: caseId }, data: { assignedTo: userId, version: { increment: 1 } } });
    await audit(tx,userId,caseId,"CHAT_CASE_CLAIMED",{ assigned: false },{ assignedTo: userId });
    return { caseId, assigned: true };
  });
}
export async function readCase(userId: number, caseId: number) {
  return prisma.$transaction(async (tx) => {
    await reviewer(tx,userId); const c = await caseRecord(tx,userId,caseId);
    const snapshot = c.evidence as { messages?: { id: number; contentHash: string }[]; bookingId?: number };
    if (!Array.isArray(snapshot.messages) || snapshot.messages.length > 5) fail(500,"EVIDENCE_INVALID","Evidence snapshot is invalid.");
    const messages = await tx.chatMessage.findMany({ where: { conversationId: c.conversationId, id: { in: snapshot.messages.map((m) => m.id) } }, orderBy: { sequence: "asc" }, select: { id: true, senderId: true, body: true, contentHash: true, status: true, sequence: true, categories: true, ruleCodes: true, policyVersion: true, createdAt: true, bookingId: true } });
    if (messages.length !== snapshot.messages.length || messages.some((m) => hash(m.body) !== snapshot.messages!.find((ref) => ref.id === m.id)?.contentHash)) fail(500,"EVIDENCE_INVALID","Evidence integrity check failed.");
    await audit(tx,userId,caseId,"CHAT_EVIDENCE_VIEWED",{}, { messageIds: messages.map((m) => m.id) });
    return { case: { id: c.id, kind: c.kind, status: c.status, category: c.category, version: c.version, targetUserId: c.targetUserId, messageId: c.messageId, reportReason: c.reportReason, decision: c.decision, decisionReason: c.decisionReason, parentId: c.parentId, bookingId: snapshot.bookingId ?? null }, messages };
  });
}
const classifications = ["NO_VIOLATION","ILLEGAL_GOODS","PROHIBITED_SOLICITATION","SCAMS","THREATS","HARASSMENT","SPAM","OTHER"];
export async function decide(userId: number, caseId: number, body: Record<string, unknown>) {
  fields(body,["action","reason","classification","expectedVersion"]);
  const action = text(body.action,24), reason = explanation(body.reason,2000), classification = text(body.classification,40), version = integer(body.expectedVersion,0);
  if (!["RELEASE","REJECT","WARN","DISMISS","CORRECT"].includes(action) || !classifications.includes(classification)) fail(400,"INVALID_INPUT","Choose a supported decision and classification.");
  return prisma.$transaction(async (tx) => {
    await reviewer(tx,userId,false);
    const original = await tx.chatModerationCase.findUnique({ where: { id: caseId } });
    if (!original) fail(404,"NOT_FOUND","Case not found.");
    const conversation = await locked(tx,original.conversationId,userId,true);
    await reviewer(tx,userId); const c = await caseRecord(tx,userId,caseId);
    if (c.status !== "OPEN" || c.version !== version) fail(409,"CASE_CHANGED","Case changed or was already decided. Refresh before deciding.");
    const m = c.messageId ? await tx.chatMessage.findUniqueOrThrow({ where: { id: c.messageId } }) : null;
    if (action === "RELEASE" || action === "REJECT") {
      if (!m || (m.status !== "HELD" && !(action === "RELEASE" && c.kind === "APPEAL" && m.status === "REJECTED"))) fail(409,"MESSAGE_STATE","This decision requires a held message, or an appeal of a rejected message.");
      if (action === "RELEASE") await permitted(tx,conversation);
      const sequence = conversation.version+1;
      await tx.conversation.update({ where: { id: conversation.id }, data: { version: sequence, ...(action === "RELEASE" ? {lastActivityAt: new Date()} : {}) } });
      await tx.chatMessage.update({ where: { id: m.id }, data: { status: action === "RELEASE" ? "ALLOWED" : "REJECTED", updatedSequence: sequence, deliverySequence: action === "RELEASE" ? sequence : null } });
      if (action === "RELEASE") await event(tx,"MESSAGE_VISIBLE",`message:${m.id}:visible`,{ conversationId: conversation.id, messageId: m.id, deliverySequence: sequence });
    } else if (m?.status === "HELD") fail(409,"HELD_DECISION_REQUIRED","Explicitly release or reject a held message.");
    if (action === "CORRECT" && (c.kind !== "APPEAL" || c.parent?.decision !== "WARN")) fail(400,"INVALID_INPUT","Corrections require an appeal case.");
    if (action === "WARN") {
      await tx.chatWarning.create({ data: { caseId, userId: c.targetUserId, reason } });
      await audit(tx,userId,caseId,"CHAT_WARNING",{}, { targetUserId: c.targetUserId });
    }
    await tx.chatModerationCase.update({ where: { id: caseId }, data: { status: "DECIDED", decision: action, decisionReason: reason, decisionCategory: classification, decidedAt: new Date(), version: { increment: 1 } } });
    await audit(tx,userId,caseId,"CHAT_CASE_DECIDED",{ status: "OPEN" },{ status: "DECIDED", action, classification, messageId: c.messageId });
    await event(tx,"CASE_DECIDED",`case:${caseId}:decided`,{ caseId, conversationId: c.conversationId, targetUserId: c.targetUserId });
    return { caseId, status: "DECIDED", action, accountStatusChanged: false, bookingStateChanged: false };
  });
}
