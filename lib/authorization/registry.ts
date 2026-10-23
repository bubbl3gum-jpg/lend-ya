/** Inactive policy contracts, not grants. No production caller may authorize from
 * this registry in Batch 2B. Allocation approval is distinct from implementation.
 */
export const POLICY_VERSION = "hustlen-admin-shadow-v1";
export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "OPERATIONS",
  "SUPPORT",
  "MODERATOR",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type ResourceKind =
  | "platform"
  | "booking"
  | "dispute"
  | "listing"
  | "report"
  | "location"
  | "user"
  | "ticket"
  | "support_channel"
  | "chat_case"
  | "announcement"
  | "setting"
  | "staff"
  | "audit"
  | "lab";
export type Risk = "READ" | "LOW" | "HIGH" | "FORBIDDEN" | "DEFERRED";
export type Scope =
  | "RESOURCE"
  | "ASSIGNED_CASE"
  | "CASE_QUEUE"
  | "PRIVATE_CHANNEL"
  | "LAB";
export type Contract = Readonly<{
  action: string;
  resource: ResourceKind;
  risk: Risk;
  scope: Scope;
  roles: readonly StaffRole[];
  confirmedRoles: readonly StaffRole[];
  blockedPolicy: boolean;
  evidence: boolean;
  approvalFor?: string;
  constraints: readonly string[];
}>;
const SA: StaffRole[] = ["SUPER_ADMIN"];
const OPS: StaffRole[] = ["SUPER_ADMIN", "OPERATIONS"];
const SUP: StaffRole[] = ["SUPER_ADMIN", "SUPPORT"];
const MOD: StaffRole[] = ["SUPER_ADMIN", "MODERATOR"];
const INVESTIGATORS: StaffRole[] = ["SUPER_ADMIN", "OPERATIONS", "SUPPORT"];
const ALL: StaffRole[] = [...STAFF_ROLES];
function contract(
  action: string,
  resource: ResourceKind,
  risk: Risk,
  roles: StaffRole[],
  scope: Scope = "RESOURCE",
  options: Partial<
    Pick<
      Contract,
      | "confirmedRoles"
      | "blockedPolicy"
      | "evidence"
      | "approvalFor"
      | "constraints"
    >
  > = {},
): Contract {
  return Object.freeze({
    action,
    resource,
    risk,
    roles: Object.freeze([...roles]),
    scope,
    confirmedRoles: Object.freeze([...(options.confirmedRoles ?? [])]),
    blockedPolicy: options.blockedPolicy ?? false,
    evidence: options.evidence ?? false,
    approvalFor: options.approvalFor,
    constraints: Object.freeze([
      "EXPLICIT_SCOPE_GRANT",
      "NO_LEGACY_ADMIN_FALLBACK",
      ...(risk === "LOW" || risk === "HIGH"
        ? [
            "DOMAIN_VALIDATION_AND_ATOMIC_AUDIT",
            "NO_GENERAL_STATUS_EDITOR",
            "PRESERVE_RECEIPTS_AND_EVIDENCE",
          ]
        : []),
      ...(options.constraints ?? []),
    ]),
  });
}
function pair(
  action: string,
  resource: ResourceKind,
  requesters: StaffRole[],
  scope: Scope = "RESOURCE",
  blockedPolicy = false,
): Contract[] {
  return [
    contract(`${action}.request`, resource, "HIGH", requesters, scope, {
      blockedPolicy,
    }),
    contract(`${action}.approve`, resource, "HIGH", SA, scope, {
      approvalFor: `${action}.request`,
      blockedPolicy,
      constraints: [
        "DISTINCT_AUTHORIZED_HUMAN",
        "RECENT_HUMAN_STEP_UP",
        "NO_INVESTIGATOR_OR_RECOMMENDER_APPROVAL",
        "NO_EXECUTION_RIGHT",
      ],
    }),
  ];
}
const entries: Contract[] = [
  contract("overview.read", "platform", "READ", ALL, "RESOURCE", {
    constraints: ["SCOPE_BEFORE_AGGREGATE", "NO_PRIVATE_CASE_CONTENTS"],
  }),
  contract("bookings.read", "booking", "READ", ALL, "RESOURCE", {
    constraints: [
      "OPERATIONAL_PROJECTION_ONLY",
      "CASE_GRANT_FOR_NON_OPERATIONS",
    ],
  }),
  ...["internal_tag.write", "followup.assign", "alert.acknowledge"].map(
    (action) =>
      contract(`bookings.${action}`, "booking", "LOW", OPS, "RESOURCE", {
        blockedPolicy: true,
        constraints: ["EXACT_LOW_RISK_ALLOWLIST_REQUIRES_PRODUCT_APPROVAL"],
      }),
  ),
  contract("bookings.status.write", "booking", "FORBIDDEN", []),
  contract(
    "disputes.investigate",
    "dispute",
    "READ",
    INVESTIGATORS,
    "ASSIGNED_CASE",
    { evidence: true },
  ),
  contract(
    "disputes.recommend",
    "dispute",
    "LOW",
    INVESTIGATORS,
    "ASSIGNED_CASE",
  ),
  ...pair("disputes.resolution", "dispute", SUP, "ASSIGNED_CASE"),
  contract(
    "custody_incidents.recommend",
    "booking",
    "LOW",
    INVESTIGATORS,
    "ASSIGNED_CASE",
    { blockedPolicy: true },
  ),
  ...pair(
    "custody_incidents.resolution",
    "booking",
    SUP,
    "ASSIGNED_CASE",
    true,
  ),
  contract("listings.read", "listing", "READ", ALL),
  contract(
    "listings.restrict",
    "listing",
    "LOW",
    [...OPS, "MODERATOR"],
    "RESOURCE",
    {
      confirmedRoles: ["OPERATIONS"],
      constraints: [
        "APPROVED_REPORT_OR_SAFETY_POLICY",
        "MODERATOR_ASSIGNED_CASE",
      ],
    },
  ),
  contract(
    "listings.restore",
    "listing",
    "LOW",
    [...OPS, "MODERATOR"],
    "RESOURCE",
    {
      confirmedRoles: ["OPERATIONS"],
      constraints: ["PRESERVE_OTHER_RESTRICTIONS", "MODERATOR_ASSIGNED_CASE"],
    },
  ),
  contract(
    "listings.restriction.request",
    "listing",
    "LOW",
    ["SUPPORT"],
    "ASSIGNED_CASE",
  ),
  contract(
    "listing_reports.review",
    "report",
    "READ",
    [...OPS, "MODERATOR"],
    "ASSIGNED_CASE",
    { evidence: true },
  ),
  contract("locations.read", "location", "READ", ALL, "RESOURCE", {
    constraints: ["CATALOGUE_METADATA_ONLY", "NO_PARTICIPANT_GPS"],
  }),
  contract("locations.suspend", "location", "LOW", OPS, "RESOURCE", {
    confirmedRoles: ["OPERATIONS"],
    constraints: ["DENY_ONLY_OVERLAY", "NO_AUTOMATIC_RESTORATION"],
  }),
  contract("locations.suspension.request", "location", "LOW", [
    "SUPPORT",
    "MODERATOR",
  ]),
  ...pair("locations.restore", "location", OPS),
  ...pair("geofence_policy.change", "location", OPS),
  contract("geofence_lab.use", "lab", "LOW", OPS, "LAB", {
    constraints: [
      "OWNED_DISPOSABLE_DATABASE",
      "BILATERAL_TEST_CONSENT",
      "TEST_LOCATION_ONLY",
      "UNCHANGED_REAL_MRT_CATALOGUE",
    ],
  }),
  contract("users.directory.read", "user", "READ", ALL, "RESOURCE", {
    constraints: ["BOUNDED_FIELDS_NO_EXPORT"],
  }),
  // Blueprint authorizes *authorized staff*, not all four roles. No allocation
  // or duration/cumulative policy has been approved: deny every role for now.
  ...["restrict", "release"].map((action) =>
    contract(
      `users.temporary_safety_${action}`,
      "user",
      "LOW",
      ALL,
      "ASSIGNED_CASE",
      {
        blockedPolicy: true,
        constraints: [
          "ROLE_ALLOCATION_AND_DURATION_LIMITS_UNAPPROVED",
          "PRESERVE_RETURN_OBLIGATIONS",
        ],
      },
    ),
  ),
  ...pair("users.serious_sanction", "user", ALL, "ASSIGNED_CASE"),
  ...pair("users.serious_sanction_restore", "user", ALL, "ASSIGNED_CASE"),
  contract("support.queue.read", "ticket", "READ", ALL, "RESOURCE", {
    constraints: ["QUEUE_METADATA_NO_BODIES"],
  }),
  contract("support.ticket.assign", "ticket", "LOW", SUP),
  contract(
    "support.channel.read",
    "support_channel",
    "READ",
    SUP,
    "PRIVATE_CHANNEL",
    { evidence: true, constraints: ["SEPARATE_OWNER_BORROWER_GRANTS"] },
  ),
  contract(
    "support.channel.write",
    "support_channel",
    "LOW",
    SUP,
    "PRIVATE_CHANNEL",
    { constraints: ["NO_OPPOSITE_CHANNEL_FORWARDING"] },
  ),
  contract(
    "support.internal_notes.write",
    "ticket",
    "LOW",
    SUP,
    "ASSIGNED_CASE",
  ),
  contract(
    "support.mediation.routine_share",
    "ticket",
    "LOW",
    SUP,
    "ASSIGNED_CASE",
    {
      blockedPolicy: true,
      constraints: ["DISCLOSURE_BASIS_AND_EXACT_AUDIENCE_REQUIRED"],
    },
  ),
  ...pair("support.mediation.sensitive_share", "ticket", SUP, "ASSIGNED_CASE"),
  contract("support.ticket.close", "ticket", "LOW", SUP, "ASSIGNED_CASE", {
    constraints: ["NO_RENTAL_OR_DISPUTE_CLOSURE"],
  }),
  contract("chat_cases.queue_claim", "chat_case", "LOW", MOD, "CASE_QUEUE"),
  contract(
    "chat_cases.evidence.read",
    "chat_case",
    "READ",
    MOD,
    "ASSIGNED_CASE",
    { evidence: true },
  ),
  contract(
    "chat_cases.routine_decision",
    "chat_case",
    "LOW",
    MOD,
    "ASSIGNED_CASE",
    { constraints: ["NO_BOOKING_OR_ACCOUNT_SANCTION"] },
  ),
  contract(
    "chat_cases.appeal_decision",
    "chat_case",
    "LOW",
    MOD,
    "ASSIGNED_CASE",
    { constraints: ["DIFFERENT_ORIGINAL_REVIEWER"] },
  ),
  contract("chat_cases.reassign", "chat_case", "LOW", SA, "RESOURCE", {
    constraints: ["ELIGIBLE_NONCONFLICTED_RECIPIENT"],
  }),
  contract(
    "evidence.rental_case.read",
    "dispute",
    "READ",
    INVESTIGATORS,
    "ASSIGNED_CASE",
    { evidence: true, constraints: ["COMMIT_ACCESS_AUDIT_BEFORE_BYTES"] },
  ),
  contract("evidence.export", "dispute", "FORBIDDEN", []),
  contract("evidence.modify", "dispute", "FORBIDDEN", []),
  contract("announcements.draft", "announcement", "LOW", ALL),
  contract(
    "announcements.routine.publish",
    "announcement",
    "LOW",
    INVESTIGATORS,
  ),
  ...pair("announcements.high_impact", "announcement", ALL),
  ...pair("announcements.emergency_high_impact", "announcement", INVESTIGATORS),
  contract(
    "settings.low_risk.write",
    "setting",
    "LOW",
    INVESTIGATORS,
    "RESOURCE",
    {
      blockedPolicy: true,
      constraints: ["PER_KEY_DOMAIN_ALLOWLIST_UNAPPROVED"],
    },
  ),
  ...pair("settings.high_risk.change", "setting", INVESTIGATORS),
  ...pair("security.staff_grant_revoke", "staff", SA),
  ...pair("security.policy_change", "platform", SA),
  contract("security.access_review", "staff", "READ", SA),
  contract("security.session_revoke", "user", "LOW", SA),
  contract("approvals.queue.read", "platform", "READ", ALL, "RESOURCE", {
    constraints: ["OWN_OR_ASSIGNED_DOMAIN_STATUS_ONLY"],
  }),
  contract("audit.read", "audit", "READ", ALL, "RESOURCE", {
    constraints: [
      "REDACTED_METADATA_ONLY",
      "ASSIGNED_OR_OWN_DOMAIN_FOR_NON_SUPER_ADMIN",
    ],
  }),
  contract("audit.update_delete", "audit", "FORBIDDEN", []),
  contract("security.disable_invariants", "platform", "FORBIDDEN", []),
  contract("payments.move_funds", "platform", "DEFERRED", []),
  ...[
    "assist.summarize",
    "assist.classify",
    "credentials.issue",
    "autonomous_admin",
  ].map((action) => contract(`ai.${action}`, "platform", "DEFERRED", [])),
];
if (new Set(entries.map((entry) => entry.action)).size !== entries.length)
  throw Error("Duplicate capability contract.");
export const CAPABILITIES: Readonly<Record<string, Contract>> = Object.freeze(
  Object.fromEntries(entries.map((entry) => [entry.action, entry])),
);
export function capability(action: unknown): Contract | undefined {
  return typeof action === "string" && Object.hasOwn(CAPABILITIES, action)
    ? CAPABILITIES[action]
    : undefined;
}
