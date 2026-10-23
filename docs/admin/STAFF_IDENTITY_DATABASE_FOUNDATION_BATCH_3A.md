# Staff identity database foundation — Batch 3A

24 October 2026 (Asia/Taipei). Review baseline: `feature/admin-authorization-foundation-batch-2b`, `1204aea00865643d1ef0723ca60111ffc3216fa4`, initially clean. Isolated implementation: `feature/staff-identity-database-foundation-batch-3a`. The final implementation SHA is the commit containing this report (`git rev-parse HEAD` on that branch); see the accompanying closeout for the exact SHA.

## Scope and reviewed baseline

Reviewed the complete [migration readiness plan](STAFF_MIGRATION_READINESS_BATCH_2B.md), [legacy authorization inventory](LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md), machine route inventory, capability registry, shadow policy, Batch 2B tests, schema and historical migrations. Batch 2B left the broad legacy ADMIN paths and helper-boundary gaps documented in that inventory; this batch does not resolve them or expose them to new roles. No intervening application changes are included. No confirmed authorization regression was found in the reviewed baseline diff; passing regression tests are bounded evidence, not proof of every possible flaw.

This batch adds database structure and test fixtures, not operational staff access. `app/`, `lib/`, `proxy.ts`, existing provisioning helpers, dependency versions, historical migrations and existing authorization functions remain unchanged. There is no runtime staff loader, role activation setting, staff UI, provisioning endpoint, approval engine, service credential or automatic ADMIN conversion. No real staff or application database was provisioned, migrated or modified. All database writes during verification used newly created, owned disposable databases through the existing isolation harness; each was removed.

## Schema and relationships

Source: [Prisma models](../../prisma/schema.prisma), section “Batch 3A foundation only”; [forward migration](../../prisma/migrations/20261024090000_staff_identity_foundation/migration.sql).

| Record | Relationship and default | Enforced boundary |
| --- | --- | --- |
| StaffPerson | Human UUID; UNVERIFIED by default | Verified identity requires a unique canonical 64-character subject digest, opaque verification reference and timestamp. Verified/revoked identity cannot be rebound. No credentials or identity documents stored here. |
| StaffAccountAssociation | Many account aliases → one person; unique User ID forever; PENDING by default | VERIFIED requires a verified person and timestamp. Revoked links cannot be reassigned or deleted. Aliases resolve to the same human, not independent approvers. |
| StaffMembership | Person → fixed role; independent verified proposer; DRAFT default | Four enum roles; immutable role/person/provenance; validity required, at most 365 days. One open DRAFT/ACTIVE/SUSPENDED membership per human; separate partial unique ACTIVE index. No implicit role union. |
| StaffAuthorizationVersion | One persisted monotonically increasing bigint epoch per person | Created and incremented by history triggers only, atomically with identity/link/membership/grant changes, including revocations. Concurrent alias changes serialize on the person and epoch. |
| StaffCapabilityContract | Composite action/policy-version key | Frozen snapshot of 74 Batch 2B shadow contracts. Metadata only, no authority. Catalog writes blocked after migration. Proposed role allocations remain proposed; policy-blocked actions remain ungrantable. |
| StaffCapabilityGrant | Membership + canonical contract + exact resource, optional required case/channel audience | DRAFT default, no wildcard, required purpose and independent verified issuer; membership-compatible dates, at most 30 days, matching role/resource/scope/policy. Unknown, blocked, forbidden and deferred actions rejected. Private channels require one OWNER or BORROWER audience and a case; evidence purpose is constrained. |
| StaffAuthorizationEvent | Person + unique authorization epoch → immutable event | Trigger-maintained append-only state/role/action summary, entity reference, opaque provenance, DB actor and timestamp. No case bodies, tokens, raw coordinates, verification digests or proof documents copied into history. |

The only addition to the existing User model is a Prisma inverse relation; there is no new User column or role value. New FKs use RESTRICT. The account association would prevent deletion of a *future linked* account, including after revocation; reconciliation and privacy-retention policy must address this before onboarding. Existing users have no links and retain current behavior.

StaffPerson means human. A future ServicePrincipal must use separate discriminated identity, grants and audit provenance, not a fake StaffPerson, human role, session or approval vote. No service identity table/credential is needed or created now.

## Integrity and deny-by-default controls

- Named CHECK constraints reject **every ACTIVE membership and grant**, even direct SQL. ACTIVE enum values are reserved only. A separately reviewed forward migration plus completed scoped DAL is required to remove this barrier. There is no activation flag.
- Fixed role alone gives no authority. Explicit drafts are bounded and cannot broaden the frozen contract. Runtime authorization still uses the existing ADMIN/ChatReviewer rules exclusively.
- Self-proposal and self/alias grants are rejected by person ID, not account ID. No role edits or resource/scope/provenance rewrites; revoked/expired rows are terminal. Membership changes require new reviewed records rather than rewriting history.
- Trigger-generated epochs and ledger rows commit or roll back with the source change. Direct epoch/history writes, history edits/deletes and deletion of identity/grant records are rejected. Populated staff tables cannot be truncated. Empty-table truncation is harmless and supports existing disposable-test cleanup.
- No SECURITY DEFINER function, DB role, legacy table update/backfill, legacy trigger replacement or old migration edit is introduced. PUBLIC write rights to catalog/version/history are explicitly revoked; normal history writes execute through source-table triggers.
- Canonical identity uniqueness is a structural prerequisite, not proof that a person is real. Trusted proofing and deduplication must precede future provisioning. An arbitrary external hash or UUID cannot be accepted as human attestation.

The 365-day membership and 30-day grant bounds are engineering ceilings for inert authorization records. They are **not** the approved 48-hour/72-hour temporary account restriction limits. No restriction power is activated or implemented.

## Verification and preservation evidence

Reproduction: install the pinned lockfile, generate Prisma Client, then run `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`. For database suites, provide the existing harness a new `MRT_TEST_DATABASE_URL` using a `hustlen_test_*` name and an authorized development PostgreSQL provisioner; never use an application database. The guard inspects connection overrides, acquires fresh ownership and creates/drops only its owned database. Run commands listed in [verification evidence](../security/batch3a/verification.json). Browser testing used `/usr/bin/chromium` via `MRT_BROWSER_PATH`/`CHROMIUM_PATH`. The upgrade compatibility test needs the baseline git object `1204aea00865643d1ef0723ca60111ffc3216fa4` available locally to generate its exact old Prisma client. Do not apply this migration to an existing database to reproduce these results.

[Fresh-schema tests](../../tests/staff-schema.test.ts) verify zero provisioning, catalog parity, mandatory identity proof fields, alias uniqueness, immutable bindings, role/scope limits, activation denial, bounded grants, private-channel audience isolation, concurrent epochs, audit-failure rollback and append-only history. [HTTP/service authorization tests](../../tests/authorization.integration.test.ts) retain the Batch 2B negative boundary coverage and add a persisted VERIFIED association + DRAFT OPERATIONS membership on an ordinary USER: legacy Overview remains 403, shadow policy denies, UserRole remains USER and no active membership exists. No lower-privilege actor receives legacy ADMIN to make a test pass.

[Upgrade tests](../../tests/staff-migration.test.ts) apply all 19 original migrations to a fresh owned fixture, populate representative users, completed/disputed bookings, private evidence, reviewer grant, sessions, chat cases and audit records, then:

1. Snapshot every old table and its row values, all historical migration rows/checksums and 13 existing triggers.
2. Inject a failure immediately before the new transaction's COMMIT; verify DDL rolled back and legacy snapshots match.
3. Resolve only that deliberately failed attempt in the disposable fixture, restore the exact SQL, deploy and replay it as a no-op.
4. Compare every legacy snapshot byte-for-byte, including evidence bytes and session token hashes; assert all six new identity/grant/version/history data tables empty and only 74 contract metadata rows seeded.
5. Generate and run the exact Batch 2B Prisma Client against the upgraded fixture: legacy ADMIN, reviewer, session lookup, completed booking and private evidence remain readable without new schema knowledge.

Committed aggregate [preservation evidence](../security/batch3a/staff-preservation.json) lists 32 legacy tables, fixture counts and successful replay/rollback flags; [historical file checksums](../security/batch3a/historical-migration-checksums.json) include all original SQL files and migration lock file. No fixture private contents or connection URLs are published. Synthetic fixtures cannot establish production backup quality or performance.

Initial test-development failures were corrected: the raw PostgreSQL custom-enum array decoder needed an explicit text-array cast in a catalog assertion; the old Prisma client's Uint8Array needed Buffer conversion for byte comparison. Review also found nullable CHECK expressions needed explicit NOT NULL predicates for verified hashes/private-channel audiences; these were corrected in the new, unapplied migration and covered by negative tests. These were new-batch defects, not evidence of a legacy regression. No historical SQL was edited.

## Risks and remaining gates

1. Database owners/superusers can disable triggers or change constraints. Trigger depth prevents ordinary direct history writes; it is not a security boundary against a principal permitted to create arbitrary triggers/DDL. No claim of tamper resistance against a compromised DB owner is made. Future deployment requires dedicated least-privilege runtime/migration roles and review of indirect trigger entry points; none is provisioned here.
2. `databaseActor` is the PostgreSQL connection role, not authenticated human actor attribution. Immutable proposer/issuer/provenance references do not prove the current writer owns them. There is no staff-writing application API in this batch. A trusted, scoped DAL with step-up, actor attestation, permission checks, transactional issuer rechecks and independently protected audit provenance is a prerequisite to any activation. Verified issuer status alone is deliberately **not** a grant-management authority.
3. No session binding, assignment persistence, independent approval record, production authorization adapter, evidence access audit enforcement or runtime epoch invalidation is implemented. Existing AuthSession rows are untouched; future staff sessions must bind and recheck the persisted epoch, identity and policy on each request. Legacy authorization remains the previously reviewed legacy model.
4. Canonical proofing, alias reconciliation/correction, data retention and initial independent-human coverage require approved operating procedures. Do not loosen permanent bindings to resolve identity mistakes without a reviewed additive correction design.
5. Frozen shadow-v1 metadata includes unapproved allocations and blocked temporary-restriction entries. Do not infer product approval from a contract row or remove policy blocks. Apply the [approved future restriction policy](TEMPORARY_ACCOUNT_RESTRICTION_POLICY_BATCH_3A.md) in a separately reviewed policy version and enforcement batch.
6. Rollback means reverting application code while retaining additive data/history, not dropping tables or resetting migrations. The old-client test establishes schema compatibility for representative reads; no destructive down migration is supplied. Production lock duration, backup restoration and deployment sequencing require staging review before any release.

## Recommended Batch 3B preparation

Follow the [controlled bootstrap and reconciliation runbook](STAFF_BOOTSTRAP_RUNBOOK_BATCH_3A.md), without executing provisioning. Approve trusted proofing, two-human coverage, runtime DB privileges, staff session binding/step-up, immutable human actor provenance and version-aware scoped read adapters. Inventory every route/service/page/media/CLI path from Batch 2B, and prepare field-limited case/participant/evidence DTOs and transaction-level rechecks. Resolve remaining product allocations; design assignment/privacy and approval storage separately. Require negative tests for stale sessions, alias conflicts, revocation races and audit failure before reviewing any removal of the inactive-only constraints. Do not add `ADMIN OR staffRole` compatibility branches. Do not treat Batch 3B preparation as permission to implement approvals, operational powers or AI.

## Final verification results and changed-file inventory

| Command | Actual result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 57 passed |
| `npm run test:staff-schema` | 8 passed |
| `npm run test:staff-migration` | 4 passed |
| `npm run test:authorization` | 8 passed |
| `npm run test:admin` | 7 passed |
| `npm run test:moderation` | 10 passed |
| `npm run test:chat` | 14 passed |
| `npm run test:rental-api` | 13 passed |
| `npm run test:stability` | 8 passed |
| `npm run test:meetup` | 9 passed, including synthetic camera/two mobile browser sessions |
| `npm run build:verify` | Production Next build passed on owned disposable DB |

Counts are Node's reported totals, including parent tests. No skips or failures remain in these final runs. One complete meetup run passed; historical camera flakiness is not claimed eliminated. No validation requirement was weakened. Machine evidence includes timestamps, exit codes, test counts, cleanup confirmations and artifact identifiers. Only an optional formatting invocation failed because npm's default cache was unavailable; rerunning with a cache under `/tmp` succeeded, with no dependency or lockfile change.

Changed files (13):

- `prisma/schema.prisma`
- `prisma/migrations/20261024090000_staff_identity_foundation/migration.sql`
- `package.json`
- `tests/run-isolated.ts`
- `tests/authorization.integration.test.ts`
- `tests/staff-schema.test.ts`
- `tests/staff-migration.test.ts`
- `docs/admin/STAFF_IDENTITY_DATABASE_FOUNDATION_BATCH_3A.md`
- `docs/admin/STAFF_BOOTSTRAP_RUNBOOK_BATCH_3A.md`
- `docs/admin/TEMPORARY_ACCOUNT_RESTRICTION_POLICY_BATCH_3A.md`
- `docs/security/batch3a/verification.json`
- `docs/security/batch3a/staff-preservation.json`
- `docs/security/batch3a/historical-migration-checksums.json`

Exact source changes are reviewable with `git diff 1204aea00865643d1ef0723ca60111ffc3216fa4..HEAD` on the isolated branch. Resource/case identifiers in draft grants are structurally bounded, not proof that a referenced domain record or assignment exists. Future scoped DAL adapters must resolve and verify those records and their current privacy constraints; a grant row must never replace that check.
