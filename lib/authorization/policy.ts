import {
  capability,
  POLICY_VERSION,
  type ResourceKind,
  type StaffRole,
} from "./registry";

export type SessionSnapshot = Readonly<{
  userId: number;
  kind: "HUMAN" | "SERVICE";
  accountStatus: "ACTIVE" | "SUSPENDED";
  expiresAt: number;
  authorizationVersion: number;
  policyVersion: string;
  stepUpAt: number | null;
}>;
export type ScopeGrant = Readonly<{
  action: string;
  status: "ACTIVE" | "REVOKED";
  validFrom: number;
  resourceKind: ResourceKind;
  resourceId: string;
  mode: "RESOURCE" | "CASE" | "CHANNEL" | "LAB";
  caseId?: string;
  channelAudience?: "OWNER" | "BORROWER";
  expiresAt: number;
  authorizationVersion: number;
  policyVersion: string;
}>;
export type MembershipSnapshot = Readonly<{
  userId: number;
  personId: string;
  personVerified: boolean;
  role: StaffRole;
  status: "ACTIVE" | "REVOKED" | "SUSPENDED";
  validFrom: number;
  expiresAt: number;
  authorizationVersion: number;
  policyVersion: string;
  grants: readonly ScopeGrant[];
}>;
export type ResourceSnapshot = Readonly<{
  kind: ResourceKind;
  id: string;
  version: number;
  evidenceVersion: number;
  caseId?: string;
  channelAudience?: "OWNER" | "BORROWER";
  assignedPersonIds: readonly string[];
  participantPersonIds: readonly string[];
  participantUserIds: readonly number[];
  subjectPersonIds: readonly string[];
  investigatorPersonIds: readonly string[];
  recommenderPersonIds: readonly string[];
  originalReviewerPersonIds: readonly string[];
  serverRisk: "LOW" | "HIGH" | "UNKNOWN";
  domainPolicyVersion: string | null;
  lifecycleValid: boolean;
  evidenceIntact: boolean;
  accessAuditAvailable: boolean;
  accessPurpose: "CASE_INVESTIGATION" | "INDEPENDENT_REVIEW" | null;
  labEligible: boolean;
  payloadHash: string;
  protectedInvariant: boolean;
}>;
export type ProposalSnapshot = Readonly<{
  requestAction: string;
  requesterPersonId: string;
  requesterKind: "HUMAN" | "SERVICE";
  requesterEligible: boolean;
  status: "PENDING" | "APPROVED" | "EXPIRED";
  resourceKind: ResourceKind;
  resourceId: string;
  resourceVersion: number;
  evidenceVersion: number;
  policyVersion: string;
  payloadHash: string;
  expiresAt: number;
}>;
export type PolicySnapshot = Readonly<{
  session: SessionSnapshot | null;
  membership: MembershipSnapshot | null;
  resource: ResourceSnapshot | null;
  proposal?: ProposalSnapshot | null;
}>;
export type ShadowDecision = Readonly<{
  mode: "SHADOW_ONLY";
  readyForActivation: false;
  candidate: "MATCH" | "DENY";
  reason: string;
  policyVersion: string;
  action: string | null;
  risk: string;
  allocation: "CONFIRMED_AUTHORITY" | "PROPOSED" | "NONE";
}>;

/** Pure candidate evaluator. Input must be assembled by trusted server loaders.
 * MATCH never grants access, approves a proposal or executes an operation.
 */
export function evaluateShadow(
  action: unknown,
  snapshot: PolicySnapshot,
  now: number,
): ShadowDecision {
  const entry = capability(action);
  let allocation: ShadowDecision["allocation"] = "NONE";
  const decide = (reason: string, match = false): ShadowDecision =>
    Object.freeze({
      mode: "SHADOW_ONLY",
      readyForActivation: false,
      candidate: match ? "MATCH" : "DENY",
      reason,
      policyVersion: POLICY_VERSION,
      action: entry?.action ?? null,
      risk: entry?.risk ?? "UNKNOWN",
      allocation,
    });
  if (!entry) return decide("UNKNOWN_CAPABILITY");
  if (["FORBIDDEN", "DEFERRED"].includes(entry.risk))
    return decide("INVARIANT_OR_DEFERRED");
  if (!snapshot || typeof snapshot !== "object")
    return decide("INVALID_CONTEXT");
  const { session, membership: member, resource } = snapshot;
  if (
    !session ||
    session.kind !== "HUMAN" ||
    session.policyVersion !== POLICY_VERSION ||
    !Number.isSafeInteger(session.userId) ||
    session.userId < 1 ||
    !Number.isFinite(now) ||
    session.accountStatus !== "ACTIVE" ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= now
  )
    return decide("INVALID_HUMAN_SESSION");
  if (
    !member ||
    member.userId !== session.userId ||
    member.policyVersion !== POLICY_VERSION ||
    member.personVerified !== true ||
    typeof member.personId !== "string" ||
    !member.personId ||
    !Array.isArray(member.grants) ||
    member.grants.some((grant) => !grant || typeof grant !== "object") ||
    member.status !== "ACTIVE" ||
    !Number.isFinite(member.validFrom) ||
    member.validFrom > now ||
    !Number.isFinite(member.expiresAt) ||
    member.expiresAt <= now ||
    !Number.isSafeInteger(member.authorizationVersion) ||
    member.authorizationVersion < 1 ||
    member.authorizationVersion !== session.authorizationVersion
  )
    return decide("INVALID_MEMBERSHIP");
  if (!entry.roles.includes(member.role)) return decide("ROLE_NOT_ELIGIBLE");
  allocation = entry.confirmedRoles.includes(member.role)
    ? "CONFIRMED_AUTHORITY"
    : "PROPOSED";
  if (entry.blockedPolicy) return decide("PRODUCT_POLICY_UNAPPROVED");
  if (
    !resource ||
    resource.kind !== entry.resource ||
    !resource.id ||
    resource.id.includes("*") ||
    !Number.isSafeInteger(resource.version) ||
    resource.version < 1 ||
    !Number.isSafeInteger(resource.evidenceVersion) ||
    resource.evidenceVersion < 1
  )
    return decide("RESOURCE_MISMATCH");
  if (
    ![
      resource.assignedPersonIds,
      resource.participantPersonIds,
      resource.participantUserIds,
      resource.subjectPersonIds,
      resource.investigatorPersonIds,
      resource.recommenderPersonIds,
      resource.originalReviewerPersonIds,
    ].every(Array.isArray)
  )
    return decide("INVALID_RESOURCE_CONTEXT");
  if (
    resource.participantUserIds.includes(session.userId) ||
    resource.participantPersonIds.includes(member.personId) ||
    resource.subjectPersonIds.includes(member.personId)
  )
    return decide("PARTICIPANT_OR_SUBJECT_CONFLICT");
  const grant = member.grants.find(
    (grant) =>
      grant.status === "ACTIVE" &&
      grant.policyVersion === POLICY_VERSION &&
      Number.isFinite(grant.validFrom) &&
      grant.validFrom <= now &&
      grant.action === entry.action &&
      grant.resourceKind === resource.kind &&
      grant.resourceId === resource.id &&
      grant.authorizationVersion === member.authorizationVersion &&
      Number.isFinite(grant.expiresAt) &&
      grant.expiresAt > now &&
      (entry.scope === "PRIVATE_CHANNEL"
        ? grant.mode === "CHANNEL" &&
          !!resource.caseId &&
          grant.caseId === resource.caseId &&
          !!resource.channelAudience &&
          grant.channelAudience === resource.channelAudience
        : entry.scope === "LAB"
          ? grant.mode === "LAB"
          : ["ASSIGNED_CASE", "CASE_QUEUE"].includes(entry.scope)
            ? grant.mode === "CASE" &&
              !!resource.caseId &&
              grant.caseId === resource.caseId
            : grant.mode === "RESOURCE" ||
              (grant.mode === "CASE" &&
                !!resource.caseId &&
                grant.caseId === resource.caseId)),
  );
  if (!grant) return decide("SCOPE_GRANT_REQUIRED");
  const additionalCaseScope =
    (entry.action === "bookings.read" && member.role !== "OPERATIONS") ||
    (entry.action === "listings.read" &&
      ["SUPPORT", "MODERATOR"].includes(member.role)) ||
    (entry.action.startsWith("listings.") && member.role === "MODERATOR") ||
    (["users.directory.read", "audit.read"].includes(entry.action) &&
      member.role !== "SUPER_ADMIN");
  if (
    (["ASSIGNED_CASE", "PRIVATE_CHANNEL"].includes(entry.scope) ||
      additionalCaseScope) &&
    (!resource.caseId ||
      grant.caseId !== resource.caseId ||
      !resource.assignedPersonIds.includes(member.personId))
  )
    return decide("ASSIGNMENT_REQUIRED");
  if (
    entry.scope === "CASE_QUEUE" &&
    resource.assignedPersonIds.length &&
    !resource.assignedPersonIds.includes(member.personId)
  )
    return decide("CASE_ASSIGNED_ELSEWHERE");
  if (
    entry.action === "chat_cases.appeal_decision" &&
    resource.originalReviewerPersonIds.includes(member.personId)
  )
    return decide("ORIGINAL_REVIEWER_CONFLICT");
  if (
    entry.evidence &&
    (resource.evidenceIntact !== true ||
      resource.accessAuditAvailable !== true ||
      !["CASE_INVESTIGATION", "INDEPENDENT_REVIEW"].includes(
        resource.accessPurpose ?? "",
      ))
  )
    return decide("EVIDENCE_OR_ACCESS_AUDIT_UNAVAILABLE");
  if (entry.scope === "LAB" && resource.labEligible !== true)
    return decide("DISPOSABLE_LAB_REQUIRED");
  if (
    ["LOW", "HIGH"].includes(entry.risk) &&
    resource.protectedInvariant !== false
  )
    return decide("IMMUTABLE_INVARIANT_TARGET");
  if (
    ["LOW", "HIGH"].includes(entry.risk) &&
    (!resource.domainPolicyVersion ||
      resource.lifecycleValid !== true ||
      resource.evidenceIntact !== true)
  )
    return decide("DOMAIN_INVARIANT_UNSATISFIED");
  if (
    ["LOW", "HIGH"].includes(entry.risk) &&
    !["LOW", "HIGH"].includes(resource.serverRisk)
  )
    return decide("RISK_CLASSIFICATION_UNAVAILABLE");
  if (entry.risk === "LOW" && resource.serverRisk !== "LOW")
    return decide("RISK_ESCALATION_REQUIRED");
  if (entry.approvalFor) {
    if (
      !Number.isFinite(session.stepUpAt) ||
      session.stepUpAt === null ||
      session.stepUpAt > now ||
      now - session.stepUpAt > 300000
    )
      return decide("RECENT_HUMAN_STEP_UP_REQUIRED");
    const proposal = snapshot.proposal;
    if (
      resource.investigatorPersonIds.includes(member.personId) ||
      resource.recommenderPersonIds.includes(member.personId) ||
      resource.originalReviewerPersonIds.includes(member.personId)
    )
      return decide("INVESTIGATOR_OR_RECOMMENDER_CONFLICT");
    if (
      !proposal ||
      proposal.requesterKind !== "HUMAN" ||
      proposal.requesterEligible !== true ||
      proposal.requesterPersonId === member.personId ||
      !proposal.requesterPersonId ||
      proposal.status !== "PENDING" ||
      !Number.isFinite(proposal.expiresAt) ||
      proposal.expiresAt <= now ||
      proposal.requestAction !== entry.approvalFor ||
      proposal.resourceKind !== resource.kind ||
      proposal.resourceId !== resource.id ||
      proposal.resourceVersion !== resource.version ||
      proposal.evidenceVersion !== resource.evidenceVersion ||
      proposal.policyVersion !== POLICY_VERSION ||
      !/^[a-f0-9]{64}$/.test(resource.payloadHash) ||
      proposal.payloadHash !== resource.payloadHash
    )
      return decide("INVALID_OR_NONINDEPENDENT_PROPOSAL");
  }
  return decide("CANDIDATE_CONTRACT_MATCH_NOT_AUTHORIZATION", true);
}
