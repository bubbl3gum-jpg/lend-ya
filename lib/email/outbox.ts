import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmailConfig } from "./config";
import { encryptEmail } from "./crypto";
import { recoveryEmail, passwordChangedEmail } from "./templates";
import { preparePasswordRecovery, type PreparedRecovery } from "../password-recovery";

export async function cancelPendingRecoveryEmails(transaction: Prisma.TransactionClient, userId: number): Promise<void> {
  await transaction.emailOutbox.updateMany({
    where: { userId, kind: "RECOVERY", status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: "CANCELLED", encryptedPayload: null, leaseToken: null, leaseUntil: null },
  });
}

function recipientAllowed(config: EmailConfig, email: string): boolean {
  return config.mode === "resend-production" || config.testRecipient === email;
}

export async function enqueueRecoveryEmail(transaction: Prisma.TransactionClient, config: EmailConfig, credential: PreparedRecovery): Promise<void> {
  await cancelPendingRecoveryEmails(transaction, credential.userId);
  if (!recipientAllowed(config, credential.email)) return;
  const id = randomUUID();
  const message = recoveryEmail(config.from, credential.email, config.origin, credential.token, credential.expiresAt);
  await transaction.emailOutbox.create({ data: {
    id, userId: credential.userId, kind: "RECOVERY", recoveryTokenHash: credential.tokenHash,
    encryptedPayload: encryptEmail(message, config.encryptionKey, id),
    createdAt: credential.createdAt, expiresAt: credential.expiresAt, nextAttemptAt: credential.createdAt,
  } });
}

export async function queueRecoveryRequest(database: PrismaClient, config: EmailConfig, input: { email: string; ipAddress: string }): Promise<void> {
  // The credential never leaves the preparation/delivery layer.
  await preparePasswordRecovery(database, input, (transaction, credential) => enqueueRecoveryEmail(transaction, config, credential));
}

export async function enqueuePasswordChangedEmail(
  transaction: Prisma.TransactionClient, config: EmailConfig,
  change: { userId: number; email: string; changedAt: Date },
): Promise<void> {
  await cancelPendingRecoveryEmails(transaction, change.userId);
  if (!recipientAllowed(config, change.email)) return;
  const id = randomUUID();
  await transaction.emailOutbox.create({ data: {
    id, userId: change.userId, kind: "PASSWORD_CHANGED", createdAt: change.changedAt, nextAttemptAt: change.changedAt,
    // Stay inside Resend's 24-hour idempotency window even if an acknowledgement is lost.
    expiresAt: new Date(change.changedAt.getTime() + 23 * 60 * 60 * 1000),
    encryptedPayload: encryptEmail(passwordChangedEmail(config.from, change.email, config.origin, change.changedAt), config.encryptionKey, id),
  } });
}

export async function emailDeliveryAvailable(database: PrismaClient): Promise<boolean> {
  const [row] = await database.$queryRaw<{ available: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM "EmailDeliveryHealth" WHERE id = 'resend'
      AND "heartbeatAt" > clock_timestamp() - interval '30 seconds'
      AND ("pausedUntil" IS NULL OR "pausedUntil" <= clock_timestamp())
    ) AS available
  `;
  return row.available;
}
