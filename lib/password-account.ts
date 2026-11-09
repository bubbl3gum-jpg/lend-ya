import type { Prisma } from "@prisma/client";

/** Shared lock order: credential advisory lock, account row, sessions/outbox.
 * Login, authenticated password changes and recovery use this same namespace.
 */
export async function lockPasswordAccount(tx: Prisma.TransactionClient, userId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(1105001,${userId})`;
}

/** Email recovery never grants access to administrators, staff or reviewers. */
export async function recoveryAccountEligible(tx: Prisma.TransactionClient, userId: number) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true, staffAssociation: { select: { id: true } }, chatReviewer: { select: { userId: true } } },
  });
  return !!user && user.role === "USER" && !user.staffAssociation && !user.chatReviewer;
}
