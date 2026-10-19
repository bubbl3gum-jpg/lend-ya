import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, fields, integer, text, explanation } from "./http";
import { moderateText, normalizeMessage, CHAT_POLICY_VERSION } from "./policy";
import { retentionSettings } from "./config";
type Tx = Prisma.TransactionClient;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const visible = (userId: number): Prisma.ChatMessageWhereInput => ({ OR: [{ status: { in: ["ALLOWED", "FLAGGED"] } }, { senderId: userId }] });
const person = { id: true, name: true, accountStatus: true } as const;
const conversationInclude = { participants: true, owner: { select: person }, borrower: { select: person }, listing: { select: { id: true, title: true } } } as const;
export async function member(tx: Tx, id: number, userId: number) {
  const row = await tx.conversation.findUnique({ where: { id }, include: conversationInclude });
  if (!row || ![row.ownerId, row.borrowerId].includes(userId) || !row.participants.some((p) => p.userId === userId)) fail(404, "NOT_FOUND", "Conversation not found.");
  return row;
}
async function locked(tx: Tx, id: number, actorId: number, staff = false) {
  const c = await tx.conversation.findUnique({ where: { id } });
  if (!c || (!staff && ![c.ownerId, c.borrowerId].includes(actorId))) fail(404, "NOT_FOUND", "Conversation not found.");
  for (const userId of [...new Set([c.ownerId, c.borrowerId, actorId])].sort((a,b) => a-b)) await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id=${id} FOR UPDATE`;
  return tx.conversation.findUniqueOrThrow({ where: { id }, include: conversationInclude });
}
async function rate(tx: Tx, userId: number, action: string, limit: number, seconds: number) {
  const now = new Date(), bucket = Math.floor(now.getTime() / (seconds * 1000));
  const key = `${action}:${userId}:${bucket}`;
  const record = await tx.chatRateLimit.upsert({ where: { key }, create: { key, attempts: 1, expiresAt: new Date((bucket+1)*seconds*1000) }, update: { attempts: { increment: 1 } } });
  if (record.attempts > limit) fail(429, "RATE_LIMITED", "Too many requests. Try again after the current rate window.");
  await tx.chatRateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
}
async function permitted(tx: Tx, c: { ownerId: number; borrowerId: number; owner: { accountStatus: string }; borrower: { accountStatus: string } }) {
  if (c.owner.accountStatus !== "ACTIVE" || c.borrower.accountStatus !== "ACTIVE") fail(403, "CONTACT_RESTRICTED", "Free-text contact is restricted. Use rental coordination or customer service.");
  const block = await tx.userBlock.findFirst({ where: { OR: [{ blockerId: c.ownerId, blockedId: c.borrowerId }, { blockerId: c.borrowerId, blockedId: c.ownerId }] } });
  if (block) fail(403, "CONTACT_BLOCKED", "Contact is blocked. Existing rental obligations remain available.");
}
export async function createConversation(userId: number, body: Record<string, unknown>) {
  fields(body, ["listingId"]); const listingId = integer(body.listingId);
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId }, include: { owner: { select: person } } });
    if (!listing) fail(404, "NOT_FOUND", "Listing not found.");
    if (listing.ownerId === userId) fail(400, "SELF_CONTACT", "You cannot message yourself.");
    const existing = await tx.conversation.findUnique({ where: { listingId_ownerId_borrowerId: { listingId, ownerId: listing.ownerId, borrowerId: userId } } });
    if (existing) return { conversationId: existing.id };
    for (const id of [userId, listing.ownerId].sort((a,b) => a-b)) await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR UPDATE`;
    const [borrower, owner] = await Promise.all([tx.user.findUniqueOrThrow({ where: { id: userId }, select: person }), tx.user.findUniqueOrThrow({ where: { id: listing.ownerId }, select: person })]);
    await permitted(tx, { ownerId: listing.ownerId, borrowerId: userId, owner, borrower });
    if (listing.status !== "ACTIVE" || listing.adminRestricted) fail(409, "LISTING_UNAVAILABLE", "This listing is not accepting new conversations.");
    await rate(tx, userId, "conversation", 5, 60);
    const c = await tx.conversation.upsert({ where: { listingId_ownerId_borrowerId: { listingId, ownerId: owner.id, borrowerId: userId } }, update: {}, create: { listingId, ownerId: owner.id, borrowerId: userId, participants: { create: [{ userId: owner.id }, { userId }] } } });
    return { conversationId: c.id };
  });
}
function messageDto(m: { id: number; sequence: number; updatedSequence: number; deliverySequence: number | null; senderId: number; body: string; status: string; bookingId: number | null; createdAt: Date }) {
  return { id: m.id, sequence: m.sequence, updatedSequence: m.updatedSequence, deliverySequence: m.deliverySequence, senderId: m.senderId, body: m.body, status: m.status, bookingId: m.bookingId, createdAt: m.createdAt.toISOString() };
}
async function bookingReference(tx: Tx, c: { listingId: number; ownerId: number; borrowerId: number }, id: number) {
  const b = await tx.booking.findUnique({ where: { id } });
  if (!b || b.listingId !== c.listingId || b.ownerId !== c.ownerId || b.renterId !== c.borrowerId) fail(400, "INVALID_BOOKING", "Booking must belong to this listing and both conversation participants.");
  return b;
}
async function evidence(tx: Tx, conversationId: number, anchorId?: number) {
  const anchor = anchorId ? await tx.chatMessage.findUniqueOrThrow({ where: { id: anchorId } }) : null;
  const rows = await tx.chatMessage.findMany({ where: { conversationId, ...(anchor ? { sequence: { gte: Math.max(1, anchor.sequence-2), lte: anchor.sequence+2 }, OR: [{ status: { in: ["ALLOWED", "FLAGGED"] } }, { id: anchor.id }] } : { status: { in: ["ALLOWED", "FLAGGED"] } }) }, orderBy: { sequence: "desc" }, take: 5, select: { id: true, contentHash: true } });
  return { capturedAt: new Date().toISOString(), messages: rows };
}
async function event(tx: Tx, kind: string, dedupKey: string, payload: Prisma.InputJsonObject) {
  await tx.chatOutboxEvent.create({ data: { kind, dedupKey, payload } });
}
export async function sendMessage(userId: number, conversationId: number, body: Record<string, unknown>) {
  fields(body, ["clientMessageId", "body", "bookingId"]);
  const key = text(body.clientMessageId, 128); if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) fail(400, "INVALID_INPUT", "Provide a valid clientMessageId.");
  const content = text(body.body, 4000), normalizedHash = hash(normalizeMessage(content));
  const bookingId = body.bookingId === undefined ? null : integer(body.bookingId);
  const requestHash = hash(JSON.stringify({ conversationId, content, bookingId }));
  const decision = moderateText(content);
  if (decision.outcome === "REJECTED") fail(422, "MESSAGE_REJECTED", "Message violates technical text limits.");
  return prisma.$transaction(async (tx) => {
    const c = await locked(tx, conversationId, userId);
    await member(tx, c.id, userId);
    const old = await tx.chatMessage.findUnique({ where: { senderId_clientMessageId: { senderId: userId, clientMessageId: key } } });
    if (old) {
      if (old.requestHash !== requestHash) fail(409, "KEY_REUSED", "This clientMessageId belongs to different message content.");
      return { message: messageDto(old), replayed: true };
    }
    await permitted(tx, c);
    if (bookingId) await bookingReference(tx, c, bookingId);
    await rate(tx, userId, "send", 20, 60);
    const duplicate = await tx.chatMessage.findFirst({ where: { senderId: userId, normalizedHash, createdAt: { gt: new Date(Date.now()-60000) } } });
    if (duplicate) fail(429, "DUPLICATE_CONTENT", "Repeated message content is temporarily limited. Retry the original message key after connection failure.");
    const sequence = c.version + 1, delivered = decision.outcome !== "HELD";
    await tx.conversation.update({ where: { id: c.id }, data: { version: sequence, lastActivityAt: new Date() } });
    const m = await tx.chatMessage.create({ data: { conversationId: c.id, senderId: userId, clientMessageId: key, requestHash, contentHash: hash(content), normalizedHash, body: content, sequence, updatedSequence: sequence, deliverySequence: delivered ? sequence : null, status: decision.outcome, categories: decision.categories, ruleCodes: decision.ruleCodes, policyVersion: CHAT_POLICY_VERSION, bookingId } });
    if (decision.outcome !== "ALLOWED") await tx.chatModerationCase.create({ data: { conversationId: c.id, messageId: m.id, targetUserId: userId, kind: "SYSTEM", category: decision.categories[0], evidence: await evidence(tx, c.id, m.id), dedupKey: `system:${m.id}` } });
    if (delivered) await event(tx, "MESSAGE_VISIBLE", `message:${m.id}:visible`, { conversationId: c.id, messageId: m.id, deliverySequence: sequence });
    return { message: messageDto(m), replayed: false };
  });
}
export async function history(userId: number, conversationId: number, limit: number, after?: number, before?: number) {
  return prisma.$transaction(async (tx) => {
    const c = await member(tx, conversationId, userId);
    if (after !== undefined && after > c.version) fail(400, "INVALID_CURSOR", "Cursor is ahead of this conversation.");
    const rows = await tx.chatMessage.findMany({ where: { conversationId, ...visible(userId), ...(after !== undefined ? { updatedSequence: { gt: after } } : before !== undefined ? { sequence: { lt: before } } : {}) }, orderBy: after !== undefined ? { updatedSequence: "asc" } : { sequence: "desc" }, take: limit+1 });
    const more = rows.length > limit; const items = rows.slice(0,limit);
    const own = c.participants.find((p) => p.userId === userId)!, other = c.participants.find((p) => p.userId !== userId)!;
    const unreadCount = await tx.chatMessage.count({ where: { conversationId, senderId: { not: userId }, status: { in: ["ALLOWED", "FLAGGED"] }, deliverySequence: { gt: own.lastReadSequence } } });
    const blocks = await tx.userBlock.findMany({ where: { OR: [{ blockerId: c.ownerId, blockedId: c.borrowerId }, { blockerId: c.borrowerId, blockedId: c.ownerId }] }, select: { blockerId: true } });
    return { conversation: { id: c.id, lastActivityAt: c.lastActivityAt.toISOString(), listing: c.listing, owner: { id: c.ownerId, name: c.owner.name }, borrower: { id: c.borrowerId, name: c.borrower.name }, lastReadSequence: own.lastReadSequence, otherReadSequence: other.lastReadSequence, unreadCount, blockedByMe: blocks.some((b) => b.blockerId === userId), contactRestricted: blocks.length > 0 || c.owner.accountStatus !== "ACTIVE" || c.borrower.accountStatus !== "ACTIVE" }, messages: (after === undefined ? items.reverse() : items).map(messageDto), cursor: after !== undefined && more ? items[items.length-1].updatedSequence : c.version, nextBefore: after === undefined && more ? Math.min(...items.map((m) => m.sequence)) : null, hasMore: more };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function inbox(userId: number, limit: number, before?: string) {
  let boundary: {lastActivityAt: Date; id: number} | undefined;
  if (before !== undefined) {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_(\d+)$/.exec(before);
    if (!match || !Number.isFinite(Date.parse(match[1]))) fail(400,"INVALID_CURSOR","Invalid inbox activity cursor.");
    boundary = {lastActivityAt: new Date(match[1]), id: integer(match[2])};
  }
  const rows = await prisma.conversation.findMany({ where: { OR: [{ ownerId: userId }, { borrowerId: userId }], ...(boundary ? { AND: [{ OR: [{lastActivityAt: {lt: boundary.lastActivityAt}}, {lastActivityAt: boundary.lastActivityAt, id: {lt: boundary.id}}] }] } : {}) }, orderBy: [{ lastActivityAt: "desc" }, {id: "desc"}], take: limit+1, select: { id: true, lastActivityAt: true } });
  const conversations = await Promise.all(rows.slice(0,limit).map(async ({ id }) => { const h = await history(userId,id,1); return { ...h.conversation, latestMessage: h.messages[0] ?? null }; }));
  const notices = await prisma.chatWarning.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 10, select: { id: true, reason: true, createdAt: true, moderationCase: { select: { id: true, appeal: { select: { decision: true } } } } } });
  const cases = await prisma.chatModerationCase.findMany({ where: { OR: [{ targetUserId: userId }, { reporterId: userId }] }, orderBy: { id: "desc" }, take: 20, select: { id: true, conversationId: true, status: true, decision: true, decisionReason: true, kind: true, parentId: true } });
  return { conversations, notices: notices.map((n) => ({ id: n.id, caseId: n.moderationCase.id, reason: n.reason, corrected: n.moderationCase.appeal?.decision === "CORRECT", createdAt: n.createdAt })), cases, nextBefore: rows.length > limit ? `${rows[limit-1].lastActivityAt.toISOString()}_${rows[limit-1].id}` : null, retention: retentionSettings() };
}
export async function markRead(userId: number, id: number, body: Record<string, unknown>) {
  fields(body,["throughMessageId"]); const messageId = integer(body.throughMessageId);
  return prisma.$transaction(async (tx) => {
    await locked(tx,id,userId); await member(tx,id,userId);
    const m = await tx.chatMessage.findFirst({ where: { id: messageId, conversationId: id, status: { in: ["ALLOWED", "FLAGGED"] } } });
    if (!m?.deliverySequence) fail(400, "INVALID_CURSOR", "Read cursor must reference a delivered message in this conversation.");
    await tx.conversationParticipant.updateMany({ where: { conversationId: id, userId, lastReadSequence: { lt: m.deliverySequence } }, data: { lastReadSequence: m.deliverySequence } });
    return { saved: true };
  });
}
export async function blockContact(userId: number, id: number, body: Record<string, unknown>) {
  fields(body,["blocked"]); if (typeof body.blocked !== "boolean") fail(400,"INVALID_INPUT","blocked must be a boolean.");
  return prisma.$transaction(async (tx) => {
    const c = await locked(tx,id,userId); await member(tx,id,userId); const other = userId === c.ownerId ? c.borrowerId : c.ownerId;
    if (body.blocked) await tx.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: other } }, create: { blockerId: userId, blockedId: other }, update: {} });
    else await tx.userBlock.deleteMany({ where: { blockerId: userId, blockedId: other } });
    return { blocked: body.blocked, bookingStateChanged: false, supportUrl: "/customer-service" };
  });
}
export async function reportContact(userId: number, id: number, body: Record<string, unknown>) {
  fields(body,["messageId","reason"]); const reason = explanation(body.reason,1000), messageId = body.messageId === undefined ? null : integer(body.messageId);
  return prisma.$transaction(async (tx) => {
    const c = await locked(tx,id,userId); await member(tx,id,userId);
    if (messageId) { const m = await tx.chatMessage.findFirst({ where: { id: messageId, conversationId: id, senderId: { not: userId }, status: { in: ["ALLOWED","FLAGGED"] } } }); if (!m) fail(404,"NOT_FOUND","Reportable message not found."); }
    const dedupKey = `report:${userId}:${id}:${messageId ?? `conversation:${Math.floor(Date.now()/86400000)}`}`;
    const old = await tx.messageReport.findUnique({ where: { dedupKey } }); if (old) return { caseId: old.caseId, replayed: true };
    await rate(tx,userId,"report",5,86400);
    const record = await tx.chatModerationCase.create({ data: { conversationId: id, messageId, targetUserId: userId === c.ownerId ? c.borrowerId : c.ownerId, reporterId: userId, kind: "REPORT", category: "USER_REPORT", reportReason: reason, evidence: await evidence(tx,id,messageId ?? undefined) } });
    await tx.messageReport.create({ data: { conversationId: id, messageId, reporterId: userId, caseId: record.id, dedupKey } });
    return { caseId: record.id, replayed: false };
  });
}
export async function coordination(userId: number, id: number, body: Record<string, unknown>) {
  fields(body,["bookingId"]); const bookingId = integer(body.bookingId);
  return prisma.$transaction(async (tx) => {
    const c = await locked(tx,id,userId); await member(tx,id,userId); const b = await bookingReference(tx,c,bookingId);
    if (!["CONFIRMED","HANDOFF_PENDING","IN_USE","RETURN_PENDING","INSPECTION","DISPUTED"].includes(b.status)) fail(409,"NO_ACTIVE_OBLIGATION","No active rental obligation for this booking.");
    const dedupKey = `coordination:${bookingId}:${userId}:${Math.floor(Date.now()/86400000)}`;
    let record = await tx.chatModerationCase.findUnique({ where: { dedupKey } });
    if (!record) {
      await rate(tx,userId,"coordination",3,86400);
      record = await tx.chatModerationCase.create({ data: { conversationId: id, targetUserId: userId, reporterId: userId, kind: "COORDINATION", category: "RENTAL_SUPPORT", evidence: { bookingId, messages: [] }, dedupKey } });
      await event(tx,"COORDINATION_REQUEST",dedupKey,{ caseId: record.id, bookingId });
    }
    return { caseId: record.id, bookingUrl: `/bookings/${bookingId}`, supportUrl: "/customer-service", message: "Coordination request recorded for review. Existing return, inspection and dispute controls remain available. No booking state changed." };
  });
}
export async function appeal(userId: number, caseId: number, body: Record<string, unknown>) {
  fields(body,["reason"]); const reason = explanation(body.reason,1000);
  return prisma.$transaction(async (tx) => {
    const original = await tx.chatModerationCase.findUnique({ where: { id: caseId } });
    if (!original || ![original.targetUserId,original.reporterId].includes(userId)) fail(404,"NOT_FOUND","Case not found.");
    await locked(tx,original.conversationId,userId);
    if (original.status !== "DECIDED" || original.kind === "APPEAL") fail(409,"APPEAL_UNAVAILABLE","Only a decided original case can receive an appeal.");
    const old = await tx.chatModerationCase.findUnique({ where: { parentId: caseId } }); if (old) return { caseId: old.id, replayed: true };
    await rate(tx,userId,"appeal",5,86400);
    const record = await tx.chatModerationCase.create({ data: { conversationId: original.conversationId, messageId: original.messageId, targetUserId: original.targetUserId, reporterId: userId, kind: "APPEAL", category: original.category, reportReason: reason, evidence: original.evidence as Prisma.InputJsonValue, parentId: caseId } });
    return { caseId: record.id, replayed: false };
  });
}
export { locked, evidence, permitted, event, hash, messageDto };
export async function ownCases(userId:number,limit:number,before?:number) {
  const rows=await prisma.chatModerationCase.findMany({where:{OR:[{targetUserId:userId},{reporterId:userId}],...(before?{id:{lt:before}}:{})},orderBy:{id:"desc"},take:limit+1,select:{id:true,conversationId:true,kind:true,status:true,decision:true,decisionReason:true,parentId:true}});
  return {cases:rows.slice(0,limit),nextBefore:rows.length>limit?rows[limit-1].id:null};
}
