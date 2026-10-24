import "server-only";
import type { Prisma } from "@prisma/client";
import { assertOwnedFoundationFixture } from "../scoped/session-audit";
import { capability, POLICY_VERSION, type StaffRole } from "../registry";
export const APPROVAL_POLICY_VERSION = "hustlen-approval-foundation-v1";
/** Every real allocation remains unapproved. Existing proposed SA arrays and
 * SHADOW MATCH results never supply product approval or live authority. */
export function productionApprovalReadiness(action: unknown) {
  const contract = capability(action);
  return Object.freeze({
    authorized: false as const,
    readyForActivation: false as const,
    reason: contract?.approvalFor
      ? "PRODUCT_APPROVAL_POLICY_UNAPPROVED"
      : "UNSUPPORTED_APPROVAL_ACTION",
  });
}
export type CandidateActor = Readonly<{
  personId: string;
  userId: number;
  role: StaffRole;
  bindingId: string;
  authorizationVersion: bigint;
  policyVersion: string;
  expiresAt: number;
  grants: readonly {
    action: string;
    scope: string;
    state: string;
    resourceId: string;
    resourceKind: string;
    caseId: string | null;
    policyVersion: string;
    validFrom: Date;
    expiresAt: Date;
  }[];
}>;
export type FixtureAssurance = Readonly<{
  kind: "VERIFIED_FIXTURE" | "PENDING";
  personId: string;
  userId: number;
  bindingId: string;
  authorizationVersion: bigint;
  policyVersion: string;
  verifiedAt: number;
  expiresAt: number;
}>;
export type ProposalBinding = Readonly<{
  requestId: string;
  payloadRef: string;
  payloadDigest: string;
  requesterPersonId: string;
  action: string;
  approvalAction: string;
  resourceKind: string;
  resourceId: string;
  resourceVersion: bigint;
  evidenceVersion: bigint;
  policyVersion: string;
  approvalPolicyVersion: string;
  payloadHash: string;
  expiresAt: Date;
}>;
export type FixtureReviewFacts = Readonly<{
  payloadDigest: string;
  fixturePolicyVersion: string;
  fixturePolicyRoles: readonly StaffRole[];
  resourceKind: string;
  resourceId: string;
  resourceVersion: bigint;
  evidenceVersion: bigint;
  policyVersion: string;
  caseId: string | null;
  assignedPersonIds: readonly string[];
  participantPersonIds: readonly string[];
  participantUserIds: readonly number[];
  subjectPersonIds: readonly string[];
  investigatorPersonIds: readonly string[];
  recommenderPersonIds: readonly string[];
  priorReviewerPersonIds: readonly string[];
  requesterStillEligible: boolean;
  assurance: FixtureAssurance;
}>;
/** Kernel is called only after the server service verifies actual owned-fixture
 * identity. It is not exported as an authorization decision or fixture endpoint. */
export async function inspectHypotheticalCandidate(
  actor: CandidateActor,
  proposal: ProposalBinding,
  facts: FixtureReviewFacts,
  now: number,
  tx: Prisma.TransactionClient,
) {
  await assertOwnedFoundationFixture(tx);
  const result = (reason: string, match = false) =>
    Object.freeze({
      authorized: false as const,
      readyForActivation: false as const,
      mode: "ISOLATED_HYPOTHESIS" as const,
      hypotheticalMatch: match,
      reason,
    });
  const contract = capability(proposal.approvalAction);
  if (
    !contract?.approvalFor ||
    contract.approvalFor !== proposal.action ||
    contract.blockedPolicy ||
    contract.risk !== "HIGH"
  )
    return result("UNSUPPORTED_ACTION");
  if (
    !Number.isFinite(now) ||
    actor.expiresAt <= now ||
    actor.policyVersion !== POLICY_VERSION ||
    actor.authorizationVersion < BigInt(1)
  )
    return result("INVALID_ACTOR");
  if (proposal.requesterPersonId === actor.personId)
    return result("SAME_HUMAN_REQUESTER");
  if (
    !facts.fixturePolicyRoles.includes(actor.role) ||
    facts.fixturePolicyVersion !== APPROVAL_POLICY_VERSION ||
    !contract.roles.includes(actor.role)
  )
    return result("FIXTURE_POLICY_REQUIRED_NOT_PRODUCT_APPROVAL");
  if (
    proposal.expiresAt.getTime() <= now ||
    !/^[a-f0-9]{64}$/.test(proposal.payloadDigest) ||
    proposal.payloadDigest !== facts.payloadDigest ||
    proposal.resourceKind !== facts.resourceKind ||
    proposal.resourceId !== facts.resourceId ||
    proposal.resourceVersion !== facts.resourceVersion ||
    proposal.evidenceVersion !== facts.evidenceVersion ||
    proposal.policyVersion !== facts.policyVersion ||
    proposal.policyVersion !== POLICY_VERSION ||
    proposal.approvalPolicyVersion !== APPROVAL_POLICY_VERSION ||
    !facts.requesterStillEligible ||
    !/^[a-f0-9]{64}$/.test(proposal.payloadHash)
  )
    return result("STALE_PROPOSAL");
  const assurance = facts.assurance;
  if (
    assurance.kind !== "VERIFIED_FIXTURE" ||
    assurance.personId !== actor.personId ||
    assurance.userId !== actor.userId ||
    assurance.bindingId !== actor.bindingId ||
    assurance.authorizationVersion !== actor.authorizationVersion ||
    assurance.policyVersion !== actor.policyVersion ||
    !Number.isFinite(assurance.verifiedAt) ||
    assurance.verifiedAt > now ||
    now - assurance.verifiedAt > 300000 ||
    !Number.isFinite(assurance.expiresAt) ||
    assurance.expiresAt <= now
  )
    return result("VERIFIED_RECENT_FIXTURE_ASSURANCE_REQUIRED");
  if (
    [
      facts.participantPersonIds,
      facts.subjectPersonIds,
      facts.investigatorPersonIds,
      facts.recommenderPersonIds,
      facts.priorReviewerPersonIds,
    ].some((ids) => ids.includes(actor.personId)) ||
    facts.participantUserIds.includes(actor.userId)
  )
    return result("HUMAN_CONFLICT");
  if (!facts.assignedPersonIds.includes(actor.personId))
    return result("ASSIGNMENT_REQUIRED");
  if (
    !actor.grants.some(
      (g) =>
        g.state === "DRAFT" &&
        g.scope === contract.scope &&
        g.action === proposal.approvalAction &&
        g.policyVersion === actor.policyVersion &&
        g.resourceKind === proposal.resourceKind &&
        g.resourceId === proposal.resourceId &&
        g.validFrom.getTime() <= now &&
        g.expiresAt.getTime() > now &&
        (contract.scope !== "ASSIGNED_CASE" ||
          (!!facts.caseId && g.caseId === facts.caseId)),
    )
  )
    return result("EXACT_APPROVAL_GRANT_REQUIRED");
  return result("HYPOTHETICAL_ELIGIBILITY_NEVER_AUTHORIZATION", true);
}
