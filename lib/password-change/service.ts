import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
  lockPasswordAccount,
} from "../auth";
import { passwordChangeConfig } from "./config";
import { passwordChangeInput } from "./input";
export class PasswordChangeError extends Error {
  constructor(
    public code:
      | "UNAVAILABLE"
      | "SESSION"
      | "DENIED"
      | "CURRENT"
      | "CONFLICT"
      | "LIMIT"
      | "INPUT"
      | "ORIGIN",
    public status: number,
  ) {
    super(code);
  }
}
async function environment() {
  let config;
  try {
    config = passwordChangeConfig();
  } catch {
    throw new PasswordChangeError("UNAVAILABLE", 404);
  }
  const rows = await prisma.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== config.database.pathname.slice(1) ||
    rows[0]?.marker !== `hustlen-mrt-test:${config.runId}`
  )
    throw new PasswordChangeError("UNAVAILABLE", 404);
  return config;
}
async function eligible(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      accountStatus: true,
      staffAssociation: { select: { id: true } },
      chatReviewer: { select: { userId: true } },
    },
  });
  return (
    !!user &&
    user.role === "USER" &&
    ["ACTIVE", "SUSPENDED"].includes(user.accountStatus) &&
    !user.staffAssociation &&
    !user.chatReviewer
  );
}
export async function passwordChangeActor() {
  const config = await environment(),
    user = await getCurrentUser();
  if (!user) throw new PasswordChangeError("SESSION", 401);
  if (!config.adminIds.includes(user.id) || !(await eligible(user.id)))
    throw new PasswordChangeError("DENIED", 403);
  return { config, user };
}
export async function passwordChangeAvailable() {
  try {
    await passwordChangeActor();
    return true;
  } catch (e) {
    if (e instanceof PasswordChangeError) return false;
    throw e;
  }
}
export async function passwordChangeLimit(userId: number) {
  const key = createHash("sha256")
    .update(`password-change:${userId}`)
    .digest("hex");
  const rows = await prisma.$queryRaw<
    { attempts: number }[]
  >`INSERT INTO "AuthRateLimit" (key,attempts,"expiresAt") VALUES (${key},1,clock_timestamp()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN "AuthRateLimit"."expiresAt"<=clock_timestamp() THEN 1 ELSE LEAST("AuthRateLimit".attempts+1,6) END,"expiresAt"=CASE WHEN "AuthRateLimit"."expiresAt"<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE "AuthRateLimit"."expiresAt" END RETURNING attempts`;
  if (
    rows.length !== 1 ||
    !Number.isInteger(rows[0]?.attempts) ||
    rows[0].attempts < 1
  )
    throw new Error("Password attempt limit unavailable");
  if (rows[0].attempts > 5) throw new PasswordChangeError("LIMIT", 429);
}
export async function changePassword(raw: unknown) {
  const { user, config } = await passwordChangeActor();
  const requestHeaders = await headers();
  if (
    requestHeaders.get("origin") !== config.origin ||
    requestHeaders.get("x-hustlen-password-change") !== "1" ||
    requestHeaders.get("sec-fetch-site") === "cross-site"
  )
    throw new PasswordChangeError("ORIGIN", 403);
  await passwordChangeLimit(user.id);
  const input = passwordChangeInput(
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null,
  );
  if (!input) throw new PasswordChangeError("INPUT", 400);
  const token = (await cookies()).get("p2p_session")?.value;
  if (!token) throw new PasswordChangeError("SESSION", 401);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const snapshot = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: { userId: true, user: { select: { passwordHash: true } } },
  });
  if (snapshot?.userId !== user.id)
    throw new PasswordChangeError("SESSION", 401);
  if (
    !(await verifyPassword(input.currentPassword, snapshot.user.passwordHash))
  )
    throw new PasswordChangeError("CURRENT", 400);
  // Different JS strings can encode to identical UTF-8 password bytes (for
  // example, distinct lone surrogates). Reject effective credential reuse.
  if (await verifyPassword(input.newPassword, snapshot.user.passwordHash))
    throw new PasswordChangeError("INPUT", 400);
  const nextHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await lockPasswordAccount(tx, user.id);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
    const rows = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "AuthSession" WHERE "tokenHash"=${tokenHash} AND "userId"=${user.id} AND "expiresAt">clock_timestamp() FOR UPDATE`;
    if (!rows.length) throw new PasswordChangeError("SESSION", 401);
    // Evaluate the database clock again after acquiring the row lock: waiting
    // on an unchanged row must not preserve a pre-lock freshness observation.
    const fresh = await tx.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "AuthSession" WHERE "tokenHash"=${tokenHash} AND "userId"=${user.id} AND "expiresAt">clock_timestamp()`;
    if (!fresh.length) throw new PasswordChangeError("SESSION", 401);
    const current = await tx.user.findUnique({
      where: { id: user.id },
      select: {
        passwordHash: true,
        role: true,
        accountStatus: true,
        staffAssociation: { select: { id: true } },
        chatReviewer: { select: { userId: true } },
      },
    });
    if (
      !current ||
      current.role !== "USER" ||
      !["ACTIVE", "SUSPENDED"].includes(current.accountStatus) ||
      current.staffAssociation ||
      current.chatReviewer
    )
      throw new PasswordChangeError("DENIED", 403);
    if (current.passwordHash !== snapshot.user.passwordHash)
      throw new PasswordChangeError("CONFLICT", 409);
    const changed = await tx.user.updateMany({
      where: { id: user.id, passwordHash: snapshot.user.passwordHash },
      data: { passwordHash: nextHash },
    });
    if (changed.count !== 1) throw new PasswordChangeError("CONFLICT", 409);
    const persisted = await tx.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (persisted?.passwordHash !== nextHash)
      throw new Error("Required credential write unavailable");
    const revoked = await tx.authSession.deleteMany({
      where: { userId: user.id },
    });
    if ((await tx.authSession.count({ where: { userId: user.id } })) !== 0)
      throw new Error("Session revocation incomplete");
    const eventId = randomUUID();
    await tx.accountSecurityEvent.create({
      data: {
        id: eventId,
        actorId: user.id,
        action: "PASSWORD_CHANGED",
        revokedSessions: revoked.count,
      },
    });
    const event = await tx.accountSecurityEvent.findUnique({
      where: { id: eventId },
      select: { actorId: true, action: true, revokedSessions: true },
    });
    if (
      !event ||
      event.actorId !== user.id ||
      event.action !== "PASSWORD_CHANGED" ||
      event.revokedSessions !== revoked.count
    )
      throw new Error("Required security event unavailable");
  });
  (await cookies()).delete("p2p_session");
}
