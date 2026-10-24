# Independent approval foundation — Batch 4A review

24 October 2026 (Asia/Taipei). Reviewed starting branch `feature/trusted-staff-sessions-audit-batch-3c`, exact clean HEAD **9998e5be836b79530cabf32bb75981e4daf6223e**. Isolated branch: `feature/independent-approval-foundation-batch-4a`. The accompanying closeout supplies the exact final commit; this report is committed with that implementation.

## Outcome and boundaries

Implemented immutable reference-manifest revisions, append-only independent decision/transition records, candidate eligibility inspection, stable idempotency and real PostgreSQL concurrency tests. Every real approval policy remains denied. The service and positive candidate inspector require an actual owned disposable database and refuse production mode. Database constraints forbid APPROVED, EXECUTED and APPROVE. There is no executor, execution receipt writer, live MFA issuer, staff activation, production endpoint or Admin UI integration.

See the [models, lifecycle diagrams and eligibility matrix](INDEPENDENT_APPROVAL_ARCHITECTURE_BATCH_4A.md), and [complete legacy high-risk transition inventory / Batch 4B gates](LEGACY_HIGH_RISK_APPROVAL_TRANSITION_BATCH_4A.md). A hypothetical decision is never a production permit; existing direct legacy sanctions/dispute resolutions remain outside approval enforcement. This is not an operational approval engine.

## Baseline review and migration

Reviewed Batch 3C pending trust-chain source, security-event schema/triggers, row-lock tests, architecture/readiness reports and the entire legacy Admin inventory. Existing ACTIVE-membership/grant and COMMITTED-event prohibitions remain. Canonical identity uniqueness, person-based aliases, immutable evidence, sessions, UserRole, ChatReviewer and old AdminAuditLog behavior remain unchanged. Pending step-up markers are not validated MFA and cannot supply live approval authority.

Added only `prisma/migrations/20261024160000_independent_approval_foundation/migration.sql`, inside BEGIN/COMMIT. All **21 historical SQL migrations** and the lock file remain byte-identical. The four new tables seed zero records. Existing StaffSessionBinding gains inverse Prisma relations, not new database columns. The Batch 3C module exposes attribution-only pending actor/ownership helpers and optional all-grant shared locking for this foundation; existing calls retain their original default locking and authority behavior.

[Checksums](../security/batch4a/migration-checksums.json) identify every historical file and the new migration. No application database was migrated, reset, seeded or modified. All changing tests used newly created owned disposable databases through the unchanged effective-target/ownership harness. A read-only maintenance-catalog check confirmed zero remaining Batch 4A databases. Tested PostgreSQL: 17.11; no pgcrypto extension, SECURITY DEFINER function, new DB credential, role grant or infrastructure change was introduced. Native SHA-256 and canonical JSON behavior must be verified before future supported-server upgrades.

The populated [upgrade evidence](../security/batch4a/upgrade-preservation.json) compares **42 old tables and 39 triggers**, historical migration rows/checksums, users, sessions, bookings, evidence bytes, reviewer grants, chat/moderation/audit history, pending staff identity/grants/epochs and pending step-up/session/security-event records. The test injects failure just before COMMIT, verifies all new DDL rolls back, explicitly resolves only that failed new attempt in the owned fixture, restores the exact SQL, applies and replays it as a no-op. The exact Batch 3C generated Prisma Client still reads legacy users, ADMIN, reviewer, sessions, completed booking, private evidence and pending staff identities/membership; it has no new request model. Old session-binding/security-event rows are compared byte-for-byte via SQL snapshots. This is representative compatibility evidence, not production backup/restore certification.

Earlier staff migration tests now omit this later migration from their copied historical fixture directories. No historical SQL or actual migration history was edited. Application-code rollback should retain additive proposal/history tables; there is no destructive down migration.

## Actual verification

| Final command | Result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 57 passed |
| `npm run test:approval` | 18 passed |
| `npm run test:approval-migration` | 4 passed |
| `npm run test:authorization` | 8 passed |
| `npm run test:staff-schema` | 8 passed |
| `npm run test:staff-migration` | 4 passed |
| `npm run test:staff-session` | 13 passed |
| `npm run test:staff-session-migration` | 4 passed |
| `npm run test:scoped-reads` | 10 passed |
| `npm run test:admin` | 7 passed |
| `npm run test:moderation` | 10 passed |
| `npm run test:chat` | 14 passed |
| `npm run test:rental-api` | 13 passed |
| `npm run test:stability` | 8 passed |
| `npm run test:meetup` | 9 passed, including two mobile browser sessions and synthetic-camera QR |
| `npm run build:verify` | Actual production Next build passed on owned disposable fixture |

**187 reported tests passed**, including Node parent tests; no final failures/skips/cancellations. [Machine verification](../security/batch4a/verification.json) records final commands, UTC timestamps, exit codes, artifact IDs, cleanup and development retries. Meetup passed one complete run without weakening GPS, camera, QR, consent, evidence or custody rules. This is not a claim that historical camera flakiness is eliminated.

[Approval tests](../../tests/approval.test.ts) demonstrate:

- Distinct-person identity, same-person alias and self exclusions; forged role/risk/actor/state fields do not authorize. Missing/stale credentials, revoked roles/grants and pending/expired/mismatched fixture assurance deny.
- All four fixed roles still need exact approval capability, assignment, scope and current versions. A missing fixture policy denies. Every real product policy denies even if the hypothetical fixture matches.
- Participant/subject/investigator/recommender/prior-reviewer exclusions, including earlier request-revision reviewers; wrong resources and resource/evidence/policy/payload-content drift deny.
- Concurrent same-person/alias duplicate creates return one request using advisory lock + unique index. Same-key/different-content creates deny; different humans have separate key namespaces.
- Concurrent reviewers serialize on the request row and cannot create conflicting decisions. Concurrent revisions accept only one expected revision. Old decisions cannot authorize a revised payload/target/audience/hash.
- Expiry, cancellation, rejection and idempotent historical rejection replay preserve exact lifecycle semantics. Historical replay is not fresh eligibility.
- SQL rejects active states, approval rulings, forged manifest hashes, mutable revision/decision history, direct transition insertion and populated truncation.
- Audit failure rolls back decisions, revisions, head changes and transitions. Real data drift inside the audit transaction causes the final recheck to fail and rolls back the hypothetical decision.
- No executor exists; no ACTIVE membership/grant, real approval state or legacy ADMIN account is created by these fixtures. Existing authorized legacy behavior remains covered by its original suites.

Reproduce with the pinned lockfile, generated Prisma Client, the existing verified provisioner and a new `MRT_TEST_DATABASE_URL` named `hustlen_test_*`. Never reproduce changing tests on an application database. Browser tests used `/usr/bin/chromium` through MRT_BROWSER_PATH/CHROMIUM_PATH. Migration tests require baseline git objects for Batch 2B, 3B and 3C to generate exact old clients. Ownership/target checks run before migration/data changes; all final databases/uploads were removed.

### Failures and retries during implementation

The first proposal and migration runs passed, then tests were expanded from 15 to 18 reported cases. Adding content-digest coverage exposed a fixture DDL issue: PostgreSQL rejected its generated expression as non-immutable. The **test-only** payload store now computes its digest on insert, verifies it with a CHECK, and prevents subsequent mutation. The production forward migration itself continued passing. A build after the digest addition also failed because the boundary's TypeScript interface lacked payloadDigest; the interface was corrected and final TypeScript/build passed. Targeted approval/migration/build runs repeated after these changes, prior-reviewer checks and final eligibility rechecks. No existing production permission was changed to make a test pass. The driver emitted the existing concurrent-query deprecation warning; it remains a future driver-compatibility item, not evidence of a new authorization flaw. No dependency/lockfile upgrade was made.

## Remaining findings and Batch 4B prerequisites

No new production authorization regression was found by review or the requested suites. Confirmed remaining coverage gaps are deliberate blockers: all product-approved per-action policies/role allocations are absent; no live MFA issuer or independently protected human audit writer; no production domain assignments/conflict lineage or secure immutable payload/reason/evidence providers; no globally reviewed lock/revocation/cache/external-store protocol; retention/account-correction decisions and independent human coverage remain unresolved. Database owners can disable triggers/constraints or forge structurally matching metadata. Current transitions identify the DB actor, not cryptographically verified human action. Runtime/migration/audit privileges were reviewed as requirements, not deployed.

The fixture policy is conservative: one decision per revision and no earlier-revision reviewer reuse. Quorums, exact prior-reviewer taxonomy, emergency notices, binding refresh, submission/cancellation authority, TTLs and action-specific payload/receipt semantics require explicit product decisions. These constraints do not silently approve historical role allocations. The [transition plan](LEGACY_HIGH_RISK_APPROVAL_TRANSITION_BATCH_4A.md) identifies each legacy direct action and the prerequisites for a later reviewed cutover; an approval table alone protects none of them.

## Changed-file inventory

Eighteen files:

- `prisma/schema.prisma`
- `prisma/migrations/20261024160000_independent_approval_foundation/migration.sql`
- `lib/authorization/approvals/candidate.ts`
- `lib/authorization/approvals/service.ts`
- `lib/authorization/scoped/session-audit.ts`
- `package.json`
- `tests/run-isolated.ts`
- `tests/staff-migration.test.ts`
- `tests/staff-session-migration.test.ts`
- `tests/approval.test.ts`
- `tests/approval-migration.test.ts`
- `tests/support/approval-fixtures.ts`
- `docs/admin/INDEPENDENT_APPROVAL_REVIEW_BATCH_4A.md`
- `docs/admin/INDEPENDENT_APPROVAL_ARCHITECTURE_BATCH_4A.md`
- `docs/admin/LEGACY_HIGH_RISK_APPROVAL_TRANSITION_BATCH_4A.md`
- `docs/security/batch4a/migration-checksums.json`
- `docs/security/batch4a/upgrade-preservation.json`
- `docs/security/batch4a/verification.json`

No merge, push, deploy, actual staff onboarding, live session issuance, operational approval/execution, support messaging, AI, payment movement or production GPS administration was performed. Stop at the isolated review commit.
