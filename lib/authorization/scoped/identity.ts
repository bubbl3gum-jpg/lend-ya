import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { POLICY_VERSION } from "../registry";

/** Inspection only. Never emits an authorization context. Tokens come from the
 * existing server session transport; browser role/identity claims are ignored. */
export async function inspectPersistedStaffIdentity(
  tx: Prisma.TransactionClient,
  token: string | null,
  now = new Date(),
): Promise<Readonly<{ mode: "INACTIVE"; authorized: false; reason: string }>> {
  const deny = (reason: string) => ({
    mode: "INACTIVE" as const,
    authorized: false as const,
    reason,
  });
  if (!token || token.length > 256 || !Number.isFinite(now.getTime()))
    return deny("INVALID_SESSION");
  const session = await tx.authSession.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    select: {
      expiresAt: true,
      user: {
        select: {
          accountStatus: true,
          staffAssociation: {
            select: {
              state: true,
              verifiedAt: true,
              person: {
                select: {
                  verification: true,
                  authorization: {
                    select: { version: true, policyVersion: true },
                  },
                  memberships: {
                    where: {
                      state: "ACTIVE",
                      validFrom: { lte: now },
                      expiresAt: { gt: now },
                    },
                    select: { id: true, policyVersion: true },
                    take: 2,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= now ||
    session.user.accountStatus !== "ACTIVE"
  )
    return deny("INVALID_SESSION");
  const link = session.user.staffAssociation;
  if (
    !link ||
    link.state !== "VERIFIED" ||
    !link.verifiedAt ||
    link.person.verification !== "VERIFIED"
  )
    return deny("UNVERIFIED_HUMAN_LINK");
  const epoch = link.person.authorization;
  if (
    !epoch ||
    epoch.version < BigInt(1) ||
    epoch.policyVersion !== POLICY_VERSION
  )
    return deny("INVALID_AUTHORIZATION_VERSION");
  if (
    link.person.memberships.length !== 1 ||
    link.person.memberships[0].policyVersion !== POLICY_VERSION
  )
    return deny("NO_ACTIVE_MEMBERSHIP");
  // Even a database with incorrectly relaxed constraints cannot bootstrap access.
  // StaffSessionBinding, step-up, scoped assignments and audit provenance are absent.
  return deny("STAFF_SESSION_ATTESTATION_NOT_IMPLEMENTED");
}
