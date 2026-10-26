import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { AdminInputError } from "../admin/auth";
import { announcementConfig } from "./config";
import { parseCommand, uuid, displayState } from "./input";
export async function announcementAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission required.", 403);
  return user;
}
export async function announcementCandidate() {
  let c;
  try {
    c = announcementConfig();
  } catch {
    throw new AdminInputError("Announcement candidate unavailable.", 404);
  }
  const user = await announcementAdmin();
  if (!c.adminIds.includes(user.id))
    throw new AdminInputError("Candidate tester unavailable.", 403);
  const rows = await prisma.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== c.database.pathname.slice(1) ||
    rows[0]?.marker !== `hustlen-mrt-test:${c.runId}`
  )
    throw new AdminInputError("Owned candidate unavailable.", 404);
  return { user, config: c };
}
export async function candidateAvailable() {
  try {
    await announcementCandidate();
    return true;
  } catch (e) {
    if (e instanceof AdminInputError) return false;
    throw e;
  }
}
const projection = {
  id: true,
  title: true,
  body: true,
  state: true,
  audience: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  startsAt: true,
  expiresAt: true,
} as const;
export async function announcementDirectory() {
  await announcementAdmin();
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    select: projection,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
  });
  return rows.map((row) => ({ ...row, displayState: displayState(row, now) }));
}
export async function announcementHistory(id: string) {
  await announcementAdmin();
  if (!uuid(id)) throw new AdminInputError("Invalid announcement selector.");
  return prisma.announcementEvent.findMany({
    where: { announcementId: id },
    select: {
      id: true,
      announcementId: true,
      actorId: true,
      action: true,
      previousVersion: true,
      resultingVersion: true,
      createdAt: true,
    },
    orderBy: { resultingVersion: "asc" },
    take: 500,
  });
}
export async function visibleCandidateNotices() {
  await announcementCandidate();
  // Database server clock; no browser-controlled audience or time selectors.
  return prisma.$queryRaw<
    {
      id: string;
      title: string;
      body: string;
      startsAt: Date;
      expiresAt: Date;
    }[]
  >`SELECT id,title,body,"startsAt","expiresAt" FROM "Announcement" WHERE state='PUBLISHED' AND audience='OWNED_TEST_ADMIN' AND "startsAt"<=statement_timestamp() AND "expiresAt">statement_timestamp() ORDER BY "startsAt" DESC,id LIMIT 100`;
}
export async function mutateAnnouncement(input: Record<string, unknown>) {
  const { user } = await announcementCandidate();
  let cmd;
  try {
    cmd = parseCommand(input);
  } catch (e) {
    throw new AdminInputError((e as Error).message);
  }
  const token = (await cookies()).get("p2p_session")?.value;
  const tokenHash = createHash("sha256")
    .update(token ?? "")
    .digest("hex");
  const requestHash = createHash("sha256")
    .update(JSON.stringify(cmd))
    .digest("hex");
  return prisma.$transaction(async (tx) => {
    // Serializes same-key retries, including concurrent CREATEs, without application locks.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${cmd.requestId},0))`;
    // Recheck persisted account/session at the service entry; role/risk never accepted in input.
    const actor = await tx.user.findUnique({
      where: { id: user.id },
      select: { role: true, accountStatus: true },
    });
    const session = await tx.authSession.findUnique({
      where: { tokenHash },
      select: { userId: true, expiresAt: true },
    });
    if (
      !session ||
      session.userId !== user.id ||
      session.expiresAt <= new Date()
    )
      throw new AdminInputError("Authentication required.", 401);
    if (actor?.role !== "ADMIN" || actor.accountStatus !== "ACTIVE")
      throw new AdminInputError("Administrator permission required.", 403);
    const prior = await tx.announcementEvent.findUnique({
      where: { requestId: cmd.requestId },
    });
    if (prior) {
      if (prior.actorId !== user.id || prior.requestHash !== requestHash)
        throw new AdminInputError("Idempotency key conflict.", 409);
      return {
        id: prior.announcementId,
        version: prior.resultingVersion,
        replayed: true,
      };
    }
    let row;
    if (cmd.action === "CREATE") {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(1001001)`;
      if ((await tx.announcement.count()) >= 100)
        throw new AdminInputError(
          "Owned candidate limit reached (100 notices).",
          409,
        );
      row = await tx.announcement.create({
        data: {
          title: cmd.title!.trim(),
          body: cmd.body!.trim(),
          creatorId: user.id,
        },
      });
    } else {
      // Lock before comparing the version; no lost edits or publication/withdrawal races.
      await tx.$queryRaw`SELECT id FROM "Announcement" WHERE id=${cmd.id}::uuid FOR UPDATE`;
      const old = await tx.announcement.findUnique({ where: { id: cmd.id } });
      if (!old) throw new AdminInputError("Announcement unavailable.", 404);
      // Reserve the final bounded history slot for withdrawal/archive.
      if (
        old.version >= 499 &&
        (cmd.action === "EDIT" || cmd.action === "PUBLISH")
      )
        throw new AdminInputError("Candidate revision limit reached.", 409);
      if (old.version !== cmd.version)
        throw new AdminInputError(
          "Announcement changed; reload before retrying.",
          409,
        );
      const valid =
        cmd.action === "EDIT"
          ? old.state === "DRAFT"
          : cmd.action === "PUBLISH"
            ? old.state === "DRAFT"
            : cmd.action === "WITHDRAW"
              ? old.state === "PUBLISHED"
              : old.state === "DRAFT";
      if (!valid) throw new AdminInputError("Transition unavailable.", 409);
      row = await tx.announcement.update({
        where: { id: old.id },
        data: {
          version: { increment: 1 },
          ...(cmd.action === "EDIT"
            ? { title: cmd.title!.trim(), body: cmd.body!.trim() }
            : cmd.action === "PUBLISH"
              ? {
                  state: "PUBLISHED",
                  startsAt: new Date(cmd.startsAt!),
                  expiresAt: new Date(cmd.expiresAt!),
                }
              : { state: "ARCHIVED" }),
        },
      });
    }
    await tx.announcementEvent.create({
      data: {
        announcementId: row.id,
        actorId: user.id,
        action: cmd.action,
        previousVersion: row.version - 1,
        resultingVersion: row.version,
        requestId: cmd.requestId,
        requestHash,
      },
    });
    return { id: row.id, version: row.version, replayed: false };
  });
}
