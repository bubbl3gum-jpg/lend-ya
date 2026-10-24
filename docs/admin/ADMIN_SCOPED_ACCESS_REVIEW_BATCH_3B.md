# Scoped staff data access implementation review — Batch 3B

24 October 2026 (Asia/Taipei). Baseline `feature/staff-identity-database-foundation-batch-3a`, exact HEAD **c51812bfd0bde62ab2cf30baef08bd73302fba39**, clean working tree. New isolated branch: `feature/scoped-staff-data-access-batch-3b`. Final SHA is supplied in the accompanying closeout; this report belongs to that implementation commit.

## Outcome and scope

Implemented a server-only persisted-identity inspection adapter that always denies staff activation, plus parallel, transaction-scoped shadow read services with exact resource scopes, fixed minimal projections, bounded selection counts/pagination, transactional evidence-access auditing and a required fresh release fence. Synthetic future-role snapshots are composed only in owned disposable tests. There is no production authorization context issuer, staff endpoint, staff provisioning, approval execution, operational power or route wiring.

See the [architecture, flow diagram and visibility matrix](SCOPED_DATA_ACCESS_ARCHITECTURE_BATCH_3B.md) and [session/identity/audit design and cutover prerequisites](STAFF_SESSION_AUDIT_CUTOVER_READINESS_BATCH_3B.md). Production readiness remains deliberately blocked, not implied by a passing shadow evaluation. Global overview statistics, protected listing bytes, full case bodies and staff access to private support channels remain unavailable through the new services. Minimal detail DTOs are a privacy ceiling, not a complete replacement Admin interface.

## Independent baseline review

Re-inspected `prisma/schema.prisma`, all 20 migration files, Batch 3A trigger SQL, its verification/preservation reports and bootstrap plan, and the complete Batch 2B legacy inventory. Important findings:

- The two named inactive-only CHECK constraints prohibit every ACTIVE membership and grant; the partial ACTIVE membership unique index and stricter single-open-membership index remain intact.
- Canonical verified subject digests are unique, explicit NOT NULL predicates prevent SQL CHECK unknown-value bypasses, permanent account associations prevent simple alias relinking, and person-based self-proposal/grant checks remain. Human proofing itself is external and unimplemented; two caller-selected hashes do not prove distinct humans.
- Source changes atomically advance persisted epochs and append bounded history. Event/version/catalog direct writes and populated truncation are blocked. Triggers execute without SECURITY DEFINER. Current DB actor attribution and trigger-depth checks are not protection against a privileged database owner or authenticated human attribution; these limitations remain blockers.
- No existing UserRole, AuthSession, ChatReviewer, booking, evidence or AdminAuditLog records are converted. The forward migration seeds only 74 frozen shadow contracts. Its transactional failure/replay and old-client compatibility tests passed again in this batch.
- No new confirmed regression was found in the reviewed Batch 3A schema/trigger behavior. Existing unguarded legacy read-helper contracts, missing human/session/assignment/audit adapters, DB-owner bypass risk and cutover races are confirmed design gaps, not claims of newly exploitable production staff access.

All **existing** app, lib, Admin component, script, Prisma and proxy files are byte-identical to Batch 3A. [Baseline/entrypoint checksums](../security/batch3b/baseline-and-entrypoints.json) record all 20 historical migrations plus the lock file and all 21 Admin API route guards/hashes. No migration is added or edited. No existing database was migrated, reset, seeded or modified. Every database-changing suite used a newly created owned disposable fixture and verified cleanup.

## Legacy entry-point coverage and remaining cutover work

The [complete inherited inventory](LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md) remains valid, including all individual page/API/service/helper/CLI entries; no surface is silently removed or activated. The machine report records each of the 21 Admin API routes separately.

| Legacy surface | Current boundary preserved | Parallel coverage in Batch 3B / remaining gate |
| --- | --- | --- |
| `app/admin/**`, `components/admin/**`, `lib/admin/auth.ts` | requireAdminPage / active ADMIN; original navigation/forms unchanged | No staff imports; future pages require independently reviewed scoped adapters, no role-based navigation authority |
| `app/api/admin/bookings/**`, `listings/**`, `users/**`, overview and audit routes | Existing adminApi/adminMutation and actor checks | Minimal booking/listing/user/audit selection services and booking rollup tested; full platform Overview/field expansion deferred |
| `lib/admin/data.ts::{getAdminOverview,getAdminDirectory,getAdminUser,getAdminListing,getAdminBooking}` | Existing callers guard broad helpers; helpers still lack actor parameter | New seam never calls these helpers; mandatory replacement/wrapper review before limited-role endpoints |
| `app/api/admin/disputes/**`, `reports/**`, `lib/admin/cases.ts` | Existing ADMIN and mutation/expected-state/audit checks | Exact case-scoped metadata; no body or generic status editor; legacy broad helpers must not become limited-role APIs |
| `lib/admin/evidence.ts::readDisputeEvidence` and evidence API | Exact legacy ADMIN/dispute/booking/photo + access audit | Parallel explicit case grant, assignment, purpose, photo-binding and audit-before-release tests; no endpoint cutover |
| `app/api/listing-media/[filename]/route.ts`, `proxy.ts` uploads rewrite | Existing owner/ADMIN protected media transport | New service returns scoped metadata only, no transport token/path/bytes; byte capability and attribution still need design |
| Chat Admin APIs, `lib/chat/http.ts`, `lib/chat/moderation.ts` | Active ADMIN AND enabled ChatReviewer, current grant/case, participant exclusion, assignment and appeal protections | Parallel assigned-case minimal metadata only; no raw evidence JSON or decision execution; authorized legacy moderation suite retained |
| `lib/admin/mutations.ts`, booking/chat/meetup services | Existing origin/CSRF, actor, legal transitions, participant/checklist/receipt/evidence rules | No new mutations; direct-service/HTTP authorization and rental/chat/meetup suites retained |
| `lib/admin/query.ts`, `caseQuery` | Input validation is not authorization | New seam accepts no arbitrary Prisma filters/includes/sorts or caller-provided contexts |
| `scripts/create-admin.ts`, reviewer/demo/analysis/MRT/import/seed/preflight tooling | Existing DB/operator or owned-fixture boundaries | Unchanged; never used to provision future roles; no CLI becomes a staff action |
| `lib/chat/analysis/jobs.ts` and analysis workers | Existing advisory mock workflow only | Unchanged; no service identities, AI credentials or autonomous powers |

Authorization tests still exercise anonymous and ordinary USER fixtures across every existing Admin API method and service boundary. The new scoped services are tested directly on real disposable PostgreSQL rows because they deliberately have no HTTP endpoint. There are no lower-privilege accounts carrying ADMIN to bypass legacy checks. Test fixtures' ordinary legacy Admin remains the existing authorized-regression fixture only.

## Negative permission-test matrix

Exact sources: [new scoped tests](../../tests/scoped-reads.test.ts), [shadow policy unit tests](../../tests/authorization-policy.test.ts), [legacy HTTP/service tests](../../tests/authorization.integration.test.ts), [schema tests](../../tests/staff-schema.test.ts), [migration tests](../../tests/staff-migration.test.ts).

| Threat / boundary | Actual test evidence |
| --- | --- |
| All four roles and role-ineligible domains | New role × seven implemented-domain matrix; explicit role eligibility AND exact grants; all-role booking positives |
| Anonymous, marketplace USER, forged role/grant JSON | New direct reads deny before any domain SQL; inherited HTTP route/body/header negatives remain |
| Missing, expired, revoked, stale grants/memberships or policy/session mismatch | New patch matrix and inherited all-contract policy tests; no row/count release |
| Suspended accounts, expired sessions, unverified/mismatched identity | New shadow negatives plus real persisted session/link/DRAFT fixture; inactive inspection always denies |
| Account aliases and participant/subject conflicts | Canonical-person conflict patch tests; inherited alias/role policy tests and permanent-link schema negatives |
| Out-of-scope or nonexistent booking/listing/user; invalid IDs; empty selection | New generic-denial, SQL query-counter and exact-selection tests; empty selection denied even anonymously; unrelated rows not retrieved |
| Cross-case, missing assignment, incorrect role/scope | New case/grant mismatches, assignment removal and every-domain role matrix; inherited policy cases |
| Owner/Borrower private channels | Existing policy test `Owner and Borrower support channels require separate exact grants`; new read allowlist rejects support-channel actions entirely; no private conversation adapter |
| Rental evidence without assignment or wrong photo booking | New assignment removal and unrelated-photo lookup; matching case/purpose/role required |
| Listing-media privacy | Authorized listing metadata has no URL/path/bytes; unrelated listing denied; legacy transport regressions preserved |
| Metadata/count leakage | Minimal SELECT key assertions, sensitive synthetic marker checks, selection totals before pagination; invalid/mixed selection issues no domain query |
| Audit unavailable/failed; independent investigator conflict | New missing sink/outage/purpose negatives; audit executes before bytes and failures roll back |
| Concurrent authorization failure and expiry | Paused in-flight read + separately committed StaffPerson revocation/epoch increment on second connection; failed fence suppresses result and rolls back audit; clock advance also denies |
| Unexpectedly ACTIVE rows despite a relaxed database | Mocked persisted inspector still returns missing-attestation denial; real fixture keeps ACTIVE constraints intact |
| Legacy authorized behavior, sessions and history | Existing Admin/moderation/chat/rental suites; repeat fresh-schema/upgrade failure/replay and old-client compatibility tests |

Coverage limits: synthetic authority is not a real staff login. No production case assignment, session attestation, durable access-event schema or fully race-safe production fence is proven. The fixture audit table exists only in the test-owned database; it is not a migration or a new production writer. Remaining blockers are explicitly recorded in the session/cutover design.

## Reproduction and final results

Use the pinned lockfile and generated Prisma client. Supply the existing test harness with a new `MRT_TEST_DATABASE_URL` named `hustlen_test_*` and an authorized disposable-development provisioner; never point it at an application database. The unchanged isolation guard validates effective connection targets, creates a fresh owned database, records ownership and removes it/uploads after testing. Browser tests use `/usr/bin/chromium` via MRT_BROWSER_PATH/CHROMIUM_PATH. The staff-migration old-client test requires the Batch 2B git object `1204aea00865643d1ef0723ca60111ffc3216fa4` locally. No schema-changing command should be reproduced on an existing database.

[Machine verification evidence](../security/batch3b/verification.json) contains exact final commands, exit status, timestamps, reported test counts, artifact IDs, cleanup and development failures/retries. Test counts include Node parent tests. No historical camera flakiness is claimed eliminated by a passing run. QR/camera, GPS, consent, evidence and booking requirements are unchanged.

| Final command | Actual result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 57 passed |
| `npm run test:scoped-reads` | 10 passed |
| `npm run test:authorization` | 8 passed |
| `npm run test:staff-schema` | 8 passed |
| `npm run test:staff-migration` | 4 passed |
| `npm run test:admin` | 7 passed |
| `npm run test:moderation` | 10 passed |
| `npm run test:chat` | 14 passed |
| `npm run test:rental-api` | 13 passed |
| `npm run test:stability` | 8 passed |
| `npm run test:meetup` | 9 passed, including synthetic camera/two mobile sessions |
| `npm run build:verify` | Passed; actual production Next build on owned fixture |

Final reported test total: **148 passed**, no failed/skipped/cancelled tests. Initial TypeScript checking found a bigint literal incompatible with the existing compiler target and a test role variable inferred too narrowly; these were corrected and checking passed. All runtime scoped-test attempts passed; reruns added role matrices, a separately committed epoch fence, precise evidence audit metadata, empty-selection rejection, actual user projections and a positive assertion that SQL tracing observes successful domain reads. Two production build runs passed; final evidence records the later run. No camera retry or requirement relaxation was needed in this batch.

The repeated [upgrade preservation fixture](../security/batch3b/upgrade-preservation.json) exercises the original Batch 3A forward migration over its historical Batch 2B data, including sessions, reviewer grants, bookings, evidence and audit rows. Its embedded baseline is therefore Batch 2B. Batch 3B adds no migration; all 20 files present at the actual Batch 3A starting point remain byte-identical.

## Changed-file inventory and review disposition

Eleven files:

- `lib/authorization/scoped/identity.ts`
- `lib/authorization/scoped/reads.ts`
- `tests/scoped-reads.test.ts`
- `tests/run-isolated.ts`
- `package.json`
- `docs/admin/ADMIN_SCOPED_ACCESS_REVIEW_BATCH_3B.md`
- `docs/admin/SCOPED_DATA_ACCESS_ARCHITECTURE_BATCH_3B.md`
- `docs/admin/STAFF_SESSION_AUDIT_CUTOVER_READINESS_BATCH_3B.md`
- `docs/security/batch3b/baseline-and-entrypoints.json`
- `docs/security/batch3b/verification.json`
- `docs/security/batch3b/upgrade-preservation.json`

No merge, push, deployment, actual staff onboarding, role activation, permission expansion, schema migration on existing databases, independent approval execution, AI, payments, Customer Service implementation or geofencing administration was performed. Existing temporary GPS testing remains isolated from real verification. Stop at this isolated review commit; the session/audit/cutover design records the remaining requirements and proposed subsequent approval-engine prerequisites, not authorization to implement them.
