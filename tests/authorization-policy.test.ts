import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  CAPABILITIES,
  STAFF_ROLES,
  capability,
} from "../lib/authorization/registry";
import {
  evaluateShadow,
  type PolicySnapshot,
} from "../lib/authorization/policy";
import { fixture, NOW } from "./fixtures/authorization";
const evaluate = (action: unknown, snapshot: PolicySnapshot = fixture()) =>
  evaluateShadow(action, snapshot, NOW);
const deny = (action: unknown, snapshot: PolicySnapshot, reason?: string) => {
  const result = evaluate(action, snapshot);
  assert.equal(result.candidate, "DENY");
  if (reason) assert.equal(result.reason, reason);
};

test("every capability × proposed role is evaluated; no result grants current authority", () => {
  assert.ok(Object.keys(CAPABILITIES).length >= 70);
  for (const entry of Object.values(CAPABILITIES))
    for (const role of STAFF_ROLES) {
      const result = evaluate(entry.action, fixture(entry.action, role));
      const eligible =
        entry.roles.includes(role) &&
        !entry.blockedPolicy &&
        !["FORBIDDEN", "DEFERRED"].includes(entry.risk);
      assert.equal(
        result.candidate,
        eligible ? "MATCH" : "DENY",
        `${entry.action}/${role}`,
      );
      assert.equal(result.mode, "SHADOW_ONLY");
      assert.equal(result.readyForActivation, false);
      if (eligible)
        assert.equal(
          result.allocation,
          entry.confirmedRoles.includes(role)
            ? "CONFIRMED_AUTHORITY"
            : "PROPOSED",
        );
      assert.ok(Object.isFrozen(entry));
      assert.ok(Object.isFrozen(entry.roles));
    }
});
test("anonymous, marketplace and legacy ADMIN identities gain no future rights without membership", () => {
  for (const entry of Object.values(CAPABILITIES)) {
    deny(entry.action, { session: null, membership: null, resource: null });
    for (const legacyRole of ["USER", "ADMIN"]) {
      const context = {
        ...fixture(entry.action),
        legacyRole,
        membership: null,
      };
      deny(entry.action, context);
    }
  }
});
test("unknown, inherited, malformed and forged action identifiers deny without aliases", () => {
  for (const action of [
    null,
    {},
    [],
    1,
    "",
    "__proto__",
    "constructor",
    "toString",
    "overview.read ",
    "OVERVIEW.READ",
    "bookings.high_risk_change",
    "*.read",
    "security.superuser",
  ]) {
    assert.equal(capability(action), undefined);
    deny(action, fixture(), "UNKNOWN_CAPABILITY");
  }
});
test("revocation, suspension, expiry, invalid time, binding and stale authorization versions deny", () => {
  const context = fixture();
  for (const patch of [
    { status: "REVOKED" },
    { status: "SUSPENDED" },
    { expiresAt: NOW },
    { expiresAt: NaN },
    { validFrom: NOW + 1 },
    { authorizationVersion: 6 },
    { policyVersion: "old-policy" },
    { authorizationVersion: 0 },
    { policyVersion: "old-policy" },
    { personVerified: false },
    { personVerified: "true" },
    { personId: "" },
    { userId: 2 },
    { role: "ADMIN" },
  ])
    deny("overview.read", {
      ...context,
      membership: { ...context.membership!, ...patch },
    } as PolicySnapshot);
  for (const patch of [
    { kind: "SERVICE" },
    { accountStatus: "SUSPENDED" },
    { expiresAt: NOW },
    { expiresAt: NaN },
    { userId: 0 },
    { authorizationVersion: 0 },
    { policyVersion: "old-policy" },
  ])
    deny("overview.read", {
      ...context,
      session: { ...context.session!, ...patch },
    } as PolicySnapshot);
  assert.equal(evaluateShadow("overview.read", context, NaN).candidate, "DENY");
});
test("role names cannot bypass resource, assignment, scope grant or grant version boundaries", () => {
  for (const role of STAFF_ROLES) {
    const context = fixture("bookings.read", role);
    deny(
      "bookings.read",
      { ...context, membership: { ...context.membership!, grants: [] } },
      "SCOPE_GRANT_REQUIRED",
    );
    for (const patch of [
      { id: "another-booking" },
      { kind: "user" },
      { version: 0 },
    ])
      deny("bookings.read", {
        ...context,
        resource: { ...context.resource!, ...patch },
      } as PolicySnapshot);
    for (const patch of [
      { resourceId: "*" },
      { status: "REVOKED" },
      { validFrom: NOW + 1 },
      { resourceKind: "user" },
      { action: "overview.read" },
      { expiresAt: NOW },
      { authorizationVersion: 6 },
      { policyVersion: "old-policy" },
      { caseId: "case-other" },
    ])
      deny("bookings.read", {
        ...context,
        membership: {
          ...context.membership!,
          grants: [{ ...context.membership!.grants[0], ...patch }],
        },
      } as PolicySnapshot);
  }
  const context = fixture("disputes.investigate");
  deny(
    "disputes.investigate",
    {
      ...context,
      resource: { ...context.resource!, assignedPersonIds: ["other-person"] },
    },
    "ASSIGNMENT_REQUIRED",
  );
});
test("all eligible roles are excluded from their own booking, target account and aliased human cases", () => {
  for (const role of STAFF_ROLES)
    for (const action of [
      "bookings.read",
      "listings.read",
      "users.directory.read",
    ]) {
      const context = fixture(action, role);
      for (const patch of [
        { participantUserIds: [1] },
        { participantPersonIds: ["person-1"] },
        { subjectPersonIds: ["person-1"] },
      ])
        deny(
          action,
          { ...context, resource: { ...context.resource!, ...patch } },
          "PARTICIPANT_OR_SUBJECT_CONFLICT",
        );
    }
});
test("evidence needs assignment, integrity, bounded purpose and an available access-audit boundary", () => {
  for (const action of [
    "evidence.rental_case.read",
    "chat_cases.evidence.read",
    "support.channel.read",
  ]) {
    const context = fixture(action);
    for (const patch of [
      { evidenceIntact: false },
      { accessAuditAvailable: false },
      { accessPurpose: null },
    ])
      deny(
        action,
        { ...context, resource: { ...context.resource!, ...patch } },
        "EVIDENCE_OR_ACCESS_AUDIT_UNAVAILABLE",
      );
    deny(
      action,
      { ...context, resource: { ...context.resource!, assignedPersonIds: [] } },
      "ASSIGNMENT_REQUIRED",
    );
  }
});
test("Owner and Borrower support channels require separate exact grants", () => {
  const context = fixture("support.channel.read", "SUPPORT");
  deny(
    "support.channel.read",
    {
      ...context,
      resource: { ...context.resource!, channelAudience: "BORROWER" },
    },
    "SCOPE_GRANT_REQUIRED",
  );
  deny(
    "support.channel.read",
    { ...context, resource: { ...context.resource!, id: "opposite-channel" } },
    "SCOPE_GRANT_REQUIRED",
  );
});
test("chat claim and appeal require scoped ownership and independent reviewer identity", () => {
  const queue = fixture("chat_cases.queue_claim", "MODERATOR");
  assert.equal(
    evaluate("chat_cases.queue_claim", {
      ...queue,
      resource: { ...queue.resource!, assignedPersonIds: [] },
    }).candidate,
    "MATCH",
  );
  deny(
    "chat_cases.queue_claim",
    {
      ...queue,
      resource: { ...queue.resource!, assignedPersonIds: ["other-reviewer"] },
    },
    "CASE_ASSIGNED_ELSEWHERE",
  );
  const appeal = fixture("chat_cases.appeal_decision", "MODERATOR");
  deny(
    "chat_cases.appeal_decision",
    {
      ...appeal,
      resource: {
        ...appeal.resource!,
        originalReviewerPersonIds: ["person-1"],
      },
    },
    "ORIGINAL_REVIEWER_CONFLICT",
  );
});
test("server risk and domain invariants cannot be downgraded by a caller", () => {
  const action = "listings.restrict",
    context = fixture(action, "OPERATIONS");
  for (const patch of [
    { serverRisk: "HIGH" },
    { serverRisk: "UNKNOWN" },
    { lifecycleValid: false },
    { evidenceIntact: false },
    { domainPolicyVersion: null },
    { protectedInvariant: true },
  ])
    deny(action, {
      ...context,
      resource: { ...context.resource!, ...patch },
    } as PolicySnapshot);
  const lab = fixture("geofence_lab.use");
  deny(
    "geofence_lab.use",
    { ...lab, resource: { ...lab.resource!, labEligible: false } },
    "DISPOSABLE_LAB_REQUIRED",
  );
  for (const role of STAFF_ROLES)
    for (const action of [
      "users.temporary_safety_restrict",
      "users.temporary_safety_release",
    ])
      deny(action, fixture(action, role), "PRODUCT_POLICY_UNAPPROVED");
});
test("proposal and approval are separate and all independent-human/payload bindings are required", () => {
  for (const entry of Object.values(CAPABILITIES).filter(
    (entry) => entry.approvalFor && !entry.blockedPolicy,
  )) {
    const context = fixture(entry.action);
    for (const patch of [
      { requesterPersonId: "person-1" },
      { requesterPersonId: "" },
      { requesterKind: "SERVICE" },
      { requesterEligible: false },
      { status: "APPROVED" },
      { expiresAt: NOW },
      { requestAction: "forged.request" },
      { resourceKind: entry.resource === "user" ? "platform" : "user" },
      { resourceId: "different" },
      { resourceVersion: 3 },
      { evidenceVersion: 1 },
      { policyVersion: "old" },
      { payloadHash: "b".repeat(64) },
    ])
      deny(entry.action, {
        ...context,
        proposal: { ...context.proposal!, ...patch },
      } as PolicySnapshot);
    for (const patch of [
      { investigatorPersonIds: ["person-1"] },
      { recommenderPersonIds: ["person-1"] },
      { originalReviewerPersonIds: ["person-1"] },
    ])
      deny(
        entry.action,
        { ...context, resource: { ...context.resource!, ...patch } },
        "INVESTIGATOR_OR_RECOMMENDER_CONFLICT",
      );
    for (const stepUpAt of [null, NOW - 300001, NOW + 1, NaN])
      deny(
        entry.action,
        { ...context, session: { ...context.session!, stepUpAt } },
        "RECENT_HUMAN_STEP_UP_REQUIRED",
      );
    deny(
      entry.action,
      { ...context, proposal: null },
      "INVALID_OR_NONINDEPENDENT_PROPOSAL",
    );
    assert.notEqual(entry.action, entry.approvalFor);
    assert.equal(entry.risk, "HIGH");
  }
});
test("production source never imports shadow policy and all Admin API routes remain guarded", () => {
  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
      item.isDirectory()
        ? files(path.join(dir, item.name))
        : [path.join(dir, item.name)],
    );
  }
  for (const root of ["app", "components", "scripts", "lib/admin", "lib/chat"])
    for (const file of files(root).filter((file) => /\.tsx?$/.test(file)))
      assert.ok(
        !/from ["'][^"']*authorization\//.test(readFileSync(file, "utf8")),
        `Unexpected activation: ${file}`,
      );
  const inventory = JSON.parse(
    readFileSync("docs/admin/LEGACY_ADMIN_ENTRYPOINTS_BATCH_2B.json", "utf8"),
  ).adminApiRoutes.concat(
    JSON.parse(
      readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_6C.json", "utf8"),
    ).adminApiRoutes,
    JSON.parse(
      readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_7A.json", "utf8"),
    ).adminApiRoutes,
    JSON.parse(
      readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_7D.json", "utf8"),
    ).adminApiRoutes,
    JSON.parse(
      readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_8A.json", "utf8"),
    ).adminApiRoutes,
    JSON.parse(
      readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_9A.json", "utf8"),
    ).adminApiRoutes,
    JSON.parse(readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_10A.json", "utf8")).adminApiRoutes,
    JSON.parse(readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_10B.json", "utf8")).adminApiRoutes,
    JSON.parse(readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_12B.json", "utf8")).adminApiRoutes,
  ) as { file: string; sha256: string }[];
  assert.deepEqual(
    files("app/api/admin")
      .filter((file) => file.endsWith("route.ts"))
      .sort(),
    inventory.map((entry) => entry.file).sort(),
  );
  for (const entry of inventory)
    assert.equal(
      createHash("sha256").update(readFileSync(entry.file)).digest("hex"),
      entry.sha256,
      `Legacy guard changed: ${entry.file}`,
    );
  for (const file of files("app/api/admin").filter((file) =>
    file.endsWith("route.ts"),
  )) {
    if (file === "app/api/admin/locations/lab/[operation]/route.ts") {
      assert.match(readFileSync(file, "utf8"), /labApi/);
      const added = JSON.parse(
        readFileSync("docs/admin/ADMIN_ENTRYPOINTS_BATCH_9A.json", "utf8"),
      );
      for (const guard of added.labGuardFiles)
        assert.equal(
          createHash("sha256").update(readFileSync(guard.file)).digest("hex"),
          guard.sha256,
          guard.file,
        );
      assert.match(
        readFileSync("lib/geofencing-lab/service.ts", "utf8"),
        /await requireLocationsAdmin\(\)/,
      );
      assert.match(
        readFileSync("lib/admin/locations.ts", "utf8"),
        /user.role !== "ADMIN" \|\| user.accountStatus !== "ACTIVE"/,
      );
    } else if (file === "app/api/admin/ai-case-brief/route.ts") {
      const source=readFileSync(file,"utf8");
      assert.match(source,/if\(!syntheticBriefEnabled\(\)\)/);
      assert.match(source,/if\(!user\)return reply\(\{code:"SESSION"\},401\)/);
      assert.match(source,/user.role!=="ADMIN"\|\|user.accountStatus!=="ACTIVE"/);
      assert.ok((source.match(/await actor\(\)/g)??[]).length>=3);
    } else
      assert.match(
        readFileSync(file, "utf8"),
        /adminApi|adminMutation|chatApi|readDisputeEvidence|readOwnAdminSession/,
        file,
      );
  }
});
