import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { Prisma, PrismaClient } from "@prisma/client";
import { parseEmail } from "./api-validation";
import { hashPassword, parseNewPassword } from "./password";

import { lockPasswordAccount, recoveryAccountEligible } from "./password-account";

const hourMs = 60 * 60 * 1000;
export const recoveryLifetimeMs = 30 * 60 * 1000;
export const recoveryConfirmation =
  "If an account matches that email, recovery instructions may arrive shortly. Check your inbox and spam folder. If nothing arrives, you can try again after a minute.";

export type PreparedRecovery = {
  userId: number; email: string; token: string; tokenHash: string; expiresAt: Date; createdAt: Date;
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Only accept an IP established by a trusted server/proxy, never arbitrary forwarding headers. */
export function normalizeRecoveryIp(value: string): string | null {
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6 || value.includes("%")) return null;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  // IPv4-mapped IPv6 must share its IPv4 limit.
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(normalized);
  if (mapped) {
    const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  return normalized;
}

export function isRecoveryToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) &&
    Buffer.from(value, "base64url").toString("base64url") === value;
}

async function databaseTime(transaction: Prisma.TransactionClient): Promise<Date> {
  const [row] = await transaction.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}

/**
 * Server-only preparation for the email adapter (milestone 2).
 * Never return this credential to an HTTP client, persist it raw, or log it.
 * Unknown accounts and throttled requests both yield null; callers use one confirmation.
 */
export async function preparePasswordRecovery(
  database: PrismaClient,
  input: { email: string; ipAddress: string },
  onPrepared?: (transaction: Prisma.TransactionClient, credential: PreparedRecovery) => Promise<void>,
): Promise<{ email: string; token: string; expiresAt: Date } | null> {
  const email = parseEmail(input.email), ip = normalizeRecoveryIp(input.ipAddress);
  if (!email || !ip) throw new Error("Recovery requires a valid email and trusted client IP.");
  const emailHash = digest(`email:${email}`), ipHash = digest(`ip:${ip}`);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = digest(token);

  return database.$transaction(async (transaction) => {
    // Stable ordering prevents deadlocks. Locks work across processes and unknown emails.
    for (const key of [`email:${emailHash}`, `ip:${ipHash}`].sort()) {
      await transaction.$queryRaw`
        SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))
      `;
    }
    const now = await databaseTime(transaction);
    const hourAgo = new Date(now.getTime() - hourMs);
    await transaction.passwordRecoveryRequest.deleteMany({ where: { createdAt: { lte: hourAgo } } });
    const [emailCount, ipCount, recent] = await Promise.all([
      transaction.passwordRecoveryRequest.count({ where: { emailHash, createdAt: { gt: hourAgo } } }),
      transaction.passwordRecoveryRequest.count({ where: { ipHash, createdAt: { gt: hourAgo } } }),
      transaction.passwordRecoveryRequest.findFirst({ where: { emailHash }, orderBy: { createdAt: "desc" } }),
    ]);
    if (emailCount >= 5 || ipCount >= 20 || (recent && now.getTime() - recent.createdAt.getTime() < 60_000)) {
      return null;
    }
    // Unknown emails consume exactly the same quota as known emails.
    await transaction.passwordRecoveryRequest.create({ data: { emailHash, ipHash, createdAt: now } });
    const candidate = await transaction.user.findUnique({ where: { email }, select: { id: true } });
    if (!candidate) return null;
    await lockPasswordAccount(transaction, candidate.id);
    const [lockedUser] = await transaction.$queryRaw<{ id: number; email: string }[]>`
      SELECT id, email FROM "User" WHERE id = ${candidate.id} FOR UPDATE
    `;
    // The lookup can wait behind a credential/account operation; never issue to a stale address.
    if (!lockedUser || lockedUser.email !== email) return null;
    if (!(await recoveryAccountEligible(transaction, candidate.id))) return null;
    const user = candidate;
    const issuedAt = await databaseTime(transaction);
    const expiresAt = new Date(issuedAt.getTime() + recoveryLifetimeMs);
    await transaction.passwordRecovery.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash, expiresAt, createdAt: issuedAt },
      update: { tokenHash, expiresAt, createdAt: issuedAt },
    });
    await onPrepared?.(transaction, { userId: user.id, email, token, tokenHash, expiresAt, createdAt: issuedAt });
    return { email, token, expiresAt };
  });
}

/** Consume only on password submission; reading/opening a link never changes state. */
export async function resetRecoveredPassword(
  database: PrismaClient,
  token: string,
  password: string,
  onReset?: (transaction: Prisma.TransactionClient, result: { userId: number; email: string; changedAt: Date }) => Promise<void>,
): Promise<{ userId: number; email: string } | null> {
  if (!isRecoveryToken(token)) return null;
  if (!parseNewPassword(password)) throw new Error("New password does not meet the password policy.");
  const tokenHash = digest(token);
  const candidate = await database.passwordRecovery.findUnique({ where: { tokenHash } });
  if (!candidate) return null;
  // Do expensive hashing outside the lock, then recheck the credential and expiry inside it.
  const passwordHash = await hashPassword(password);
  return database.$transaction(async (transaction) => {
    await lockPasswordAccount(transaction, candidate.userId);
    const [user] = await transaction.$queryRaw<{ id: number; email: string }[]>`
      SELECT id, email FROM "User" WHERE id = ${candidate.userId} FOR UPDATE
    `;
    if (!user || !(await recoveryAccountEligible(transaction, user.id))) return null;
    const now = await databaseTime(transaction);
    const consumed = await transaction.passwordRecovery.deleteMany({
      where: { userId: user.id, tokenHash, expiresAt: { gt: now } },
    });
    if (consumed.count !== 1) return null;
    await transaction.user.update({ where: { id: user.id }, data: { passwordHash } });
    await transaction.authSession.deleteMany({ where: { userId: user.id } });
    await onReset?.(transaction, { userId: user.id, email: user.email, changedAt: now });
    // Recipient is for a future notification adapter, never part of the API response.
    return { userId: user.id, email: user.email };
  });
}
