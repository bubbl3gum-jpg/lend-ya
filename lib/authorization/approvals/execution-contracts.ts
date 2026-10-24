import "server-only";
import { createHash } from "node:crypto";

export const EXECUTION_CONTRACT_VERSION =
  "hustlen-execution-contracts-inactive-v1";
type ReferenceIntent = Readonly<{
  resourceId: string;
  changeRef: string;
  changeHash: string;
  reasonRef: string;
}>;
export type FutureExecutionIntent = ReferenceIntent &
  (
    | Readonly<{ kind: "SERIOUS_SANCTION"; transition: "RESTRICT_ACCOUNT" }>
    | Readonly<{
        kind: "SANCTION_REINSTATEMENT";
        transition: "RESTORE_ACCOUNT";
      }>
    | Readonly<{
        kind: "STATION_RESTORATION";
        transition: "SUSPENDED_TO_OPERATIONAL";
      }>
    | Readonly<{
        kind: "GEOFENCE_POLICY";
        transition: "REPLACE_REVIEWED_POLICY";
      }>
    | Readonly<{
        kind: "HIGH_IMPACT_NOTICE";
        transition: "PUBLISH_REVIEWED_NOTICE";
      }>
    | Readonly<{
        kind: "STAFF_PERMISSIONS";
        transition: "REPLACE_BOUNDED_GRANTS";
      }>
    | Readonly<{
        kind: "DISPUTE_RESOLUTION";
        transition: "CONTINUE_RETURN" | "RESUME_INSPECTION" | "CLOSE_RETURNED";
      }>
    | Readonly<{
        kind: "CUSTODY_RESOLUTION";
        transition: "REVIEW_INCIDENT_ONLY";
      }>
  );
type Contract = Readonly<{
  requestCapability: string;
  approvalCapability: string;
  proposedExecutionCapability: string;
  domain:
    | "ACCOUNT"
    | "LOCATION"
    | "GEOFENCE"
    | "ANNOUNCEMENT"
    | "STAFF"
    | "DISPUTE"
    | "CUSTODY";
  kind: FutureExecutionIntent["kind"];
  transitions: readonly string[];
  availability: "BLOCKED_NO_PRODUCTION_HANDLER";
  payloadSchemaVersion: string;
  legalState: string;
  lockOrder: readonly string[];
  requirements: readonly string[];
}>;
const requirements = Object.freeze([
  "PRODUCT_APPROVED_POLICY",
  "VERIFIED_HUMAN_REQUESTER_AND_INDEPENDENT_APPROVER",
  "CURRENT_EXACT_EXECUTION_SCOPE",
  "REAL_RECENT_MFA_NOT_PENDING_OR_SHADOW",
  "NO_PARTICIPANT_TARGET_INVESTIGATOR_RECOMMENDER_PRIOR_REVIEWER_CONFLICT",
  "EXACT_REVISION_PAYLOAD_HASH_AUDIENCE",
  "CURRENT_RESOURCE_EVIDENCE_POLICY_AND_AUTHORIZATION_VERSIONS",
  "ATOMIC_DOMAIN_EFFECT_RECEIPT_AND_DURABLE_AUDIT",
  "UNIQUE_SUCCESS_PER_APPROVED_REVISION",
  "STALE_REQUIRES_NEW_AUTHORIZATION",
  "FAIL_CLOSED_NO_AUTOMATIC_RETRY",
]);
const lockOrder = Object.freeze([
  "POLICY",
  "REQUEST_REVISION_DECISION",
  "CANONICAL_HUMANS_SORTED",
  "SESSIONS_GRANTS_ASSURANCE_SORTED",
  "DOMAIN_RESOURCE_AND_EVIDENCE",
  "AUDIT_AND_RECEIPT",
]);
function contract(
  prefix: string,
  domain: Contract["domain"],
  kind: Contract["kind"],
  transitions: readonly string[],
  legalState: string,
): Contract {
  return Object.freeze({
    requestCapability: prefix + ".request",
    approvalCapability: prefix + ".approve",
    proposedExecutionCapability: prefix + ".execute",
    domain,
    kind,
    transitions: Object.freeze([...transitions]),
    availability: "BLOCKED_NO_PRODUCTION_HANDLER",
    payloadSchemaVersion: EXECUTION_CONTRACT_VERSION,
    legalState,
    lockOrder,
    requirements,
  });
}
const contracts = [
  contract(
    "users.serious_sanction",
    "ACCOUNT",
    "SERIOUS_SANCTION",
    ["RESTRICT_ACCOUNT"],
    "Current target eligibility and approved sanction taxonomy; preserve rental/return/support obligations",
  ),
  contract(
    "users.serious_sanction_restore",
    "ACCOUNT",
    "SANCTION_REINSTATEMENT",
    ["RESTORE_ACCOUNT"],
    "Exact active sanction/version and independently approved restoration grounds",
  ),
  contract(
    "locations.restore",
    "LOCATION",
    "STATION_RESTORATION",
    ["SUSPENDED_TO_OPERATIONAL"],
    "Exact suspended station and current safety evidence",
  ),
  contract(
    "geofence_policy.change",
    "GEOFENCE",
    "GEOFENCE_POLICY",
    ["REPLACE_REVIEWED_POLICY"],
    "Reviewed immutable catalogue/policy reference; no raw GPS or production simulation",
  ),
  contract(
    "announcements.high_impact",
    "ANNOUNCEMENT",
    "HIGH_IMPACT_NOTICE",
    ["PUBLISH_REVIEWED_NOTICE"],
    "Exact draft, audience, impact classification and content digest",
  ),
  contract(
    "security.staff_grant_revoke",
    "STAFF",
    "STAFF_PERMISSIONS",
    ["REPLACE_BOUNDED_GRANTS"],
    "Verified human, current single membership and bounded grants; no self-escalation",
  ),
  contract(
    "disputes.resolution",
    "DISPUTE",
    "DISPUTE_RESOLUTION",
    ["CONTINUE_RETURN", "RESUME_INSPECTION", "CLOSE_RETURNED"],
    "Open dispute with all original handoff/return/inspection/receipt guards",
  ),
  contract(
    "custody_incidents.resolution",
    "CUSTODY",
    "CUSTODY_RESOLUTION",
    ["REVIEW_INCIDENT_ONLY"],
    "Unresolved physical custody; no fabricated return or general status editor",
  ),
] as const;
const byAction = new Map<string, Contract>(
  contracts.map((c) => [c.requestCapability, c]),
);
export function futureExecutionContract(
  storedAction: unknown,
): Contract | null {
  return typeof storedAction === "string"
    ? (byAction.get(storedAction) ?? null)
    : null;
}
export function executionReadiness(storedAction: unknown) {
  return Object.freeze({
    authorized: false as const,
    readyForProduction: false as const,
    reason: futureExecutionContract(storedAction)
      ? "NO_APPROVED_POLICY_OR_PRODUCTION_HANDLER"
      : "UNKNOWN_ACTION",
  });
}
const uuid = (x: unknown): x is string =>
  typeof x === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
/** Read-only validation contract, never dispatch. Action must later be resolved
 * from an immutable server-side proposal, not an HTTP-selected handler. */
export function validateFutureExecutionIntent(
  storedAction: unknown,
  value: unknown,
): FutureExecutionIntent | null {
  const c = futureExecutionContract(storedAction);
  if (!c || !value || typeof value !== "object" || Array.isArray(value))
    return null;
  const o = value as Record<string, unknown>;
  if (
    Object.keys(o).sort().join(",") !==
    [
      "changeHash",
      "changeRef",
      "kind",
      "reasonRef",
      "resourceId",
      "transition",
    ].join(",")
  )
    return null;
  if (
    o.kind !== c.kind ||
    typeof o.transition !== "string" ||
    !c.transitions.includes(o.transition) ||
    typeof o.resourceId !== "string" ||
    !(
      uuid(o.resourceId) ||
      (/^[1-9][0-9]{0,9}$/.test(o.resourceId) &&
        Number(o.resourceId) <= 2147483647)
    ) ||
    !uuid(o.changeRef) ||
    !uuid(o.reasonRef) ||
    typeof o.changeHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(o.changeHash)
  )
    return null;
  return Object.freeze({ ...o }) as FutureExecutionIntent;
}
export function executionIntentDigest(intent: FutureExecutionIntent): string {
  const contract = contracts.find((c) => c.kind === intent.kind);
  if (
    !contract ||
    !validateFutureExecutionIntent(contract.requestCapability, intent)
  )
    throw new Error("Invalid inactive execution intent");
  const canonical = JSON.stringify(
    Object.fromEntries(
      Object.entries(intent).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
  return createHash("sha256")
    .update(
      EXECUTION_CONTRACT_VERSION +
        "\n" +
        contract.requestCapability +
        "\n" +
        canonical,
    )
    .digest("hex");
}
