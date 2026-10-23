import {
  capability,
  POLICY_VERSION,
  type StaffRole,
} from "../../lib/authorization/registry";
import type {
  PolicySnapshot,
  ResourceSnapshot,
  ScopeGrant,
} from "../../lib/authorization/policy";
export const NOW = 1_800_000_000_000;
export function fixture(
  action = "overview.read",
  role: StaffRole = "SUPER_ADMIN",
): PolicySnapshot {
  const entry = capability(action)!;
  const resource: ResourceSnapshot = {
    kind: entry.resource,
    id: "resource-1",
    version: 4,
    evidenceVersion: 2,
    caseId: "case-1",
    channelAudience: "OWNER",
    assignedPersonIds: ["person-1"],
    participantPersonIds: ["person-owner"],
    participantUserIds: [99],
    subjectPersonIds: ["person-subject"],
    investigatorPersonIds: ["person-investigator"],
    recommenderPersonIds: ["person-recommender"],
    originalReviewerPersonIds: ["person-original"],
    serverRisk: entry.risk === "HIGH" ? "HIGH" : "LOW",
    domainPolicyVersion: "fixture-policy-only",
    lifecycleValid: true,
    evidenceIntact: true,
    accessAuditAvailable: true,
    accessPurpose: "CASE_INVESTIGATION",
    labEligible: true,
    payloadHash: "a".repeat(64),
    protectedInvariant: false,
  };
  const mode: ScopeGrant["mode"] =
    entry.scope === "LAB"
      ? "LAB"
      : entry.scope === "PRIVATE_CHANNEL"
        ? "CHANNEL"
        : "CASE";
  return {
    session: {
      userId: 1,
      kind: "HUMAN",
      accountStatus: "ACTIVE",
      expiresAt: NOW + 60000,
      authorizationVersion: 7,
      policyVersion: POLICY_VERSION,
      stepUpAt: NOW - 1000,
    },
    membership: {
      userId: 1,
      personId: "person-1",
      personVerified: true,
      role,
      status: "ACTIVE",
      validFrom: NOW - 1000,
      expiresAt: NOW + 60000,
      authorizationVersion: 7,
      policyVersion: POLICY_VERSION,
      grants: [
        {
          action,
          status: "ACTIVE",
          validFrom: NOW - 1000,
          resourceKind: resource.kind,
          resourceId: resource.id,
          mode,
          caseId: resource.caseId,
          channelAudience: "OWNER",
          expiresAt: NOW + 60000,
          authorizationVersion: 7,
          policyVersion: POLICY_VERSION,
        },
      ],
    },
    resource,
    proposal: entry.approvalFor
      ? {
          requestAction: entry.approvalFor,
          requesterPersonId: "person-requester",
          requesterKind: "HUMAN",
          requesterEligible: true,
          status: "PENDING",
          resourceKind: resource.kind,
          resourceId: resource.id,
          resourceVersion: resource.version,
          evidenceVersion: resource.evidenceVersion,
          policyVersion: POLICY_VERSION,
          payloadHash: resource.payloadHash,
          expiresAt: NOW + 60000,
        }
      : null,
  };
}
