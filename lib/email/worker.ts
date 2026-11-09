import { randomUUID } from "node:crypto";
import type { PrismaClient, EmailOutbox } from "@prisma/client";
import type { EmailConfig } from "./config";
import { decryptEmail } from "./crypto";
import { sendWithResend, type DeliveryResult } from "./resend";
import type { EmailMessage } from "./templates";

const retryDelays = [30_000, 120_000, 300_000, 900_000, 1_800_000, 3_600_000, 10_800_000];
type Sender = (apiKey: string, id: string, message: EmailMessage) => Promise<DeliveryResult>;

export async function emailWorkerHeartbeat(database: PrismaClient): Promise<void> {
  await database.$executeRaw`
    INSERT INTO "EmailDeliveryHealth" (id, "heartbeatAt") VALUES ('resend', clock_timestamp())
    ON CONFLICT (id) DO UPDATE SET "heartbeatAt" = clock_timestamp()
  `;
}

export async function purgeExpiredEmails(database: PrismaClient): Promise<void> {
  await database.$executeRaw`
    UPDATE "EmailOutbox" SET status = 'CANCELLED', "encryptedPayload" = NULL, "leaseToken" = NULL, "leaseUntil" = NULL
    WHERE status IN ('PENDING', 'PROCESSING') AND "expiresAt" <= clock_timestamp()
  `;
}

/** Process at most one email; leases and provider idempotency make restarts safe. */
export async function processNextEmail(database: PrismaClient, config: EmailConfig, sender: Sender = sendWithResend): Promise<string> {
  await emailWorkerHeartbeat(database);
  // Payload cleanup also runs while the provider is paused. Backups need the same retention policy.
  await purgeExpiredEmails(database);
  const [health] = await database.$queryRaw<{ paused: boolean }[]>`
    SELECT COALESCE("pausedUntil" > clock_timestamp(), false) AS paused FROM "EmailDeliveryHealth" WHERE id = 'resend'
  `;
  if (health?.paused) return "paused";
  const job = await database.$transaction(async (transaction) => {
    const [candidate] = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM "EmailOutbox"
      WHERE "expiresAt" > clock_timestamp() AND "nextAttemptAt" <= clock_timestamp()
      AND (status = 'PENDING' OR (status = 'PROCESSING' AND "leaseUntil" <= clock_timestamp()))
      ORDER BY "nextAttemptAt", id FOR UPDATE SKIP LOCKED LIMIT 1
    `;
    if (!candidate) return null;
    const [clock] = await transaction.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    return transaction.emailOutbox.update({ where: { id: candidate.id }, data: {
      status: "PROCESSING", leaseToken: randomUUID(),
      leaseUntil: new Date(clock.now.getTime() + 60_000), attempts: { increment: 1 },
    } });
  });
  if (!job) return "idle";
  const ownership = { id: job.id, status: "PROCESSING" as const, leaseToken: job.leaseToken };
  const clearLease = { leaseToken: null, leaseUntil: null };
  async function finish(status: "CANCELLED" | "FAILED", code?: string) {
    await database.emailOutbox.updateMany({ where: ownership, data: {
      status, encryptedPayload: null, ...clearLease, lastErrorCode: code ?? null,
    } });
    return status.toLowerCase();
  }
  const ready = await database.$transaction(async (transaction) => {
    // Same lock order as issuance/reset: account first, then outbox. Never hold locks over the network.
    await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${job.userId} FOR UPDATE`;
    const currentJob = await transaction.emailOutbox.findFirst({ where: ownership });
    const [clock] = await transaction.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    if (!currentJob?.encryptedPayload || currentJob.expiresAt <= clock.now) return false;
    if (job.kind === "RECOVERY") {
      const recovery = await transaction.passwordRecovery.findUnique({ where: { userId: job.userId } });
      if (!recovery || recovery.tokenHash !== job.recoveryTokenHash || recovery.expiresAt <= clock.now) return false;
    }
    return true;
  });
  if (!ready) return finish("CANCELLED");
  if (job.attempts > 8) return finish("FAILED", "RETRY_EXHAUSTED");

  let message: EmailMessage;
  try { message = decryptEmail(job.encryptedPayload!, config.encryptionKey, job.id); }
  catch { return finish("FAILED", "INVALID_PAYLOAD"); }
  // Never redirect a real user's recovery message to a developer's inbox.
  if (config.mode === "resend-test" && message.to[0] !== config.testRecipient) return finish("CANCELLED", "TEST_RECIPIENT_BLOCKED");

  let result: DeliveryResult;
  try { result = await sender(config.apiKey, job.id, message); }
  catch { result = { outcome: "unavailable", code: "PROVIDER_NETWORK", retryAfterMs: 30_000 }; }
  if (result.outcome === "accepted") {
    await database.emailOutbox.updateMany({ where: ownership, data: {
      status: "ACCEPTED", providerId: result.providerId, encryptedPayload: null, lastErrorCode: null, ...clearLease,
    } });
    // A concurrent worker's outage observation must not be erased by this success.
    return "accepted";
  }
  if (result.outcome === "permanent") return finish("FAILED", result.code);
  if (result.outcome === "unavailable") {
    const pause = Math.max(result.retryAfterMs ?? 30_000, 30_000);
    await database.$executeRaw`
      UPDATE "EmailDeliveryHealth" SET
        "pausedUntil" = GREATEST(COALESCE("pausedUntil", clock_timestamp()), clock_timestamp() + (${pause} * interval '1 millisecond')),
        "lastErrorCode" = ${result.code} WHERE id = 'resend'
    `;
  }
  if (job.attempts >= 8) return finish("FAILED", "RETRY_EXHAUSTED");
  const delay = Math.max(retryDelays[Math.min(job.attempts - 1, retryDelays.length - 1)], result.retryAfterMs ?? 0);
  const [clock] = await database.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const nextAttemptAt = new Date(clock.now.getTime() + delay);
  if (nextAttemptAt >= job.expiresAt) return finish("CANCELLED", "RETRY_DEADLINE");
  await database.emailOutbox.updateMany({ where: ownership, data: {
    status: "PENDING", ...clearLease, nextAttemptAt, lastErrorCode: result.code,
  } });
  return "retry";
}

/** Safe operational metadata: no recipient, body, key or recovery link. */
export function emailJobSummary(job: Pick<EmailOutbox, "status" | "kind" | "attempts" | "lastErrorCode">) {
  return { status: job.status, kind: job.kind, attempts: job.attempts, lastErrorCode: job.lastErrorCode };
}

