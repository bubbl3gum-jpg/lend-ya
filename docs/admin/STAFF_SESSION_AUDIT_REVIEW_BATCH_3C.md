# Trusted staff sessions and audit foundation — Batch 3C review

24 October 2026 (Asia/Taipei). Starting branch `feature/scoped-staff-data-access-batch-3b`, exact clean HEAD **208e297a4ea2bfe337e029d2b5ca88a6436ad2bb**. Isolated implementation: `feature/trusted-staff-sessions-audit-batch-3c`. The accompanying closeout supplies the exact final implementation commit; this report is committed with that implementation.

## Outcome

Added pending-only staff session/step-up persistence, durable attributable append-only security events, private persisted-chain resolution, isolated shadow audit/read transactions, SQL row-lock/final-check tests and fresh/populated migration evidence. There is no live staff-session issuer, production MFA verifier, operational staff permission, approval engine, staff onboarding or production route wiring. Pending records independently authorize nothing; inspection always returns false. The isolated callback refuses production mode and requires the existing owned disposable database marker.

The [architecture and trust-chain diagrams](STAFF_SESSION_AUDIT_ARCHITECTURE_BATCH_3C.md) describe models, SQL constraints, derived actor attribution, exact grants, outcomes, data minimization and integration boundaries. The [revocation analysis and Batch 4 readiness checklist](STAFF_REVOCATION_BATCH_4_READINESS.md) distinguish tested relational safety from remaining production blockers, runtime privileges, retention and later approval-engine design.

## Baseline review and preservation

Reviewed the entire [legacy Admin inventory](LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md), Batch 3B identity/read source and tests, visibility matrix, session/audit/cutover documents, Batch 3A SQL and current migration inventory. All 20 historical migration SQL files and the migration lock remain byte-identical. Existing ACTIVE-membership/grant prohibitions, one-open-membership index, canonical identity uniqueness, immutable grant/history/catalog protections, UserRole, marketplace sessions, ChatReviewer, booking/evidence and AdminAuditLog behavior remain intact. No legacy ADMIN converts to Super Admin; no lower role receives ADMIN.

One new forward-only transactional migration is added: `20261024140000_staff_session_audit_foundation`. It seeds **zero** staff, sessions, step-up records, bindings or events. All new records are PENDING/inspection only. New session references have no AuthSession FK and bind session birth timestamps, preserving logout/deletion while preventing reused integer session IDs inheriting attribution. Pending records are immutable except terminal timestamped revocation. Session-specific revocation does not automatically bump the whole person's epoch: persisted binding/step-up state is checked and locked each read; global identity/member/grant changes retain the existing epoch triggers.

No existing database was reset, migrated, seeded or modified. Every changing test used the existing effective-target and fresh-ownership harness. The cleanup read against the PostgreSQL maintenance catalog confirmed **zero remaining Batch 3C disposable databases**, including the intentionally aborted development trial. No application database was used for that cleanup check.

[Historical checksums](../security/batch3c/migration-checksums.json) include the reviewed baseline and new SQL hash. The [populated upgrade evidence](../security/batch3c/upgrade-preservation.json) compares every prior table and historical migration row/checksum, preserving sessions, reviewer grants, bookings, private evidence, chat/moderation/audit rows **and** representative existing pending staff identities, membership, grant, epochs and history. Only aggregate fixture counts and preservation flags are published.

## Migration and regression verification

The new upgrade test applies all 20 baseline migrations on a fresh owned database, populates representative historical data, snapshots every existing table and trigger, then injects failure before the new COMMIT. It verifies new DDL rolled back and historical rows/triggers remain exact. It resolves only that failed new attempt in the owned fixture, restores the exact SQL, deploys, and verifies replay is a no-op. It generates the exact Batch 3B Prisma Client and reads the upgraded fixture's old users, ADMIN, reviewer, sessions, completed booking, evidence bytes and pending staff records. The old client has no StaffSessionBinding model. No destructive down migration is supplied; rollback means old application code with additive tables retained.

The existing Batch 3A migration test now excludes this later migration from its temporary historical fixture before replaying the older Batch 3A migration. Its old SQL is unchanged; its test isolation now matches its stated historical baseline. No migration history is edited. The new fixture separately exercises the Batch 3C upgrade.

| Final command | Actual result |
| --- | --- |
| `npx prisma validate` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 57 passed |
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
| `npm run build:verify` | Passed, actual production Next build on owned disposable fixture |

Final total: **165 reported tests passed**, including Node parent tests; no final failures/skips/cancellations. [Machine evidence](../security/batch3c/verification.json) records commands, exit codes, timestamps, cleanup and development failures/retries. The fresh/upgrade/old-client tests passed after each substantive new SQL change; the final build passed after the session-birth constraint was added. Existing UI/domain regression suites exercise unchanged application code. Meetup passed one complete run without weakening camera, GPS, QR, consent, checklists, receipts or evidence. This does not establish elimination of historical camera flakiness.

Reproduce with the pinned lockfile, generated Prisma Client, a newly named `MRT_TEST_DATABASE_URL=hustlen_test_*` PostgreSQL target and the existing authorized local disposable provisioner. Browser runs used `/usr/bin/chromium` through MRT_BROWSER_PATH/CHROMIUM_PATH. Staff migration compatibility needs baseline git objects `1204aea00865643d1ef0723ca60111ffc3216fa4` and `208e297a4ea2bfe337e029d2b5ca88a6436ad2bb`. Never reproduce on an application database. The isolated runner validates effective connection options/target and fresh ownership, applies migrations only to that new database, and drops it/uploads afterward.

### Targeted negative and concurrency evidence

Source: [session tests](../../tests/staff-session.test.ts) and [new upgrade test](../../tests/staff-session-migration.test.ts).

- Forged caller actor/version/outcome fields are ignored. SQL insertion with a mismatched person is rejected; COMMITTED outcomes are forbidden. Session tokens, raw unknown actions, bodies, coordinates and arbitrary metadata are absent from stored events.
- Pending rows alone, production mode, forged ownership marker, missing or wrong grants/resources/case assignment, stale epoch, revoked membership/grant/binding/step-up, suspended account, expired/deleted/reused session and invalid identity bindings deny.
- Still-authenticated denied accounts remain attributed after membership revocation; this never becomes authorization. Expired/deleted or mismatched session incarnations remain unattributed.
- Append-only events reject UPDATE, DELETE and populated TRUNCATE. Exact rental photo references are recorded without bytes. Shadow success is not production success.
- A second PostgreSQL connection actually waits on an in-flight read's shared membership lock. The locked read commits first; revocation then commits; the next read denies. This is tested database ordering, not a boolean mock.
- A real epoch change or synthetic persisted case reassignment inside a read causes the final check to fail: no data/result release, shadow-success audit rollback, separate DENIED attempt. Actual wall-clock grant expiry during retrieval also denies.
- Injected audit insertion failure prevents sensitive retrieval. A failed read records FAILED outside the rolled-back data transaction. Complete audit outage remains fail-closed and produces bounded operational diagnostics.
- The real evidence/dispute/booking rows and synthetic assignment table exist only in owned fixtures. Production assignment/alias/subject/investigator adapters and complete global lock ordering remain unimplemented.

### Development failures and retries

The first session run failed on a new PL/pgSQL variable named `session_user`, which PostgreSQL resolved as its built-in identity type. Renaming it fixed fixture insertion; the new unapplied SQL was corrected, not historical SQL. An intermediate edit left a case-scope helper undefined; that trial failed and stalled at its test pause, was terminated, and its owned database was removed by the runner. Timeouts and failure-aware pause handling were added. A later expiry test failed because raw `SELECT pg_sleep(...)` returns PostgreSQL void, which Prisma cannot deserialize; selecting a constant from pg_sleep fixed the test. Type checking also caught direct mutation of Next's read-only NODE_ENV declaration in the production-refusal fixture; the test now uses Reflect and restores its environment.

Final retries passed after these corrections and after further attribution/session-birth/ownership safeguards. An intermediate overlapping log filename mixed a terminated trial's output with a later run; its reported aggregate counts are not trusted or used as final evidence. Final suite logs/metadata and the cleanup catalog check are separate and consistent. The pg adapter emitted a concurrent-client-query deprecation warning during fixture operations; it did not fail verification and is a future driver-compatibility item, not a confirmed security vulnerability. No dependency or lockfile changes were made.

## Remaining vulnerabilities and readiness limits

No new confirmed production authorization regression was found. Confirmed unresolved design/security boundaries are: no verified MFA/issuer connector or live staff-session lifecycle; no general persisted domain assignments/private-channel/evidence-purpose adapters; no production attributable audit writer with independently protected provenance; runtime/migration/audit DB privilege separation not deployed; DB-owner/superuser trigger bypass and matching-insert forgery; retention/account-correction decisions; global lock/deletion/offboarding/cache/transport and deadlock/load review. A pending MFA marker is not human proof. The owned shadow protocol is not a production authority cutover and cannot protect unrelated legacy broad helpers. These blockers must be resolved before any staff activation.

No new endpoint, page, staff provisioning tool, global private-data access, independent approval record/execution, serious sanction, AI identity, payment movement or geofencing administration is implemented. Existing broad Admin helpers remain guarded by existing callers and are not reused for lower roles. The complete legacy inventory and eight-domain integration boundaries remain explicit in the architecture and Batch 4 checklist.

## Changed files

Fifteen files:

- `prisma/schema.prisma`
- `prisma/migrations/20261024140000_staff_session_audit_foundation/migration.sql`
- `lib/authorization/scoped/session-audit.ts`
- `lib/authorization/scoped/identity.ts` (comment describing pending-only persistence; behavior unchanged)
- `package.json`
- `tests/run-isolated.ts`
- `tests/staff-migration.test.ts`
- `tests/staff-session.test.ts`
- `tests/staff-session-migration.test.ts`
- `docs/admin/STAFF_SESSION_AUDIT_REVIEW_BATCH_3C.md`
- `docs/admin/STAFF_SESSION_AUDIT_ARCHITECTURE_BATCH_3C.md`
- `docs/admin/STAFF_REVOCATION_BATCH_4_READINESS.md`
- `docs/security/batch3c/migration-checksums.json`
- `docs/security/batch3c/upgrade-preservation.json`
- `docs/security/batch3c/verification.json`

No merge, push, release-branch update, deployment or actual staff provisioning was performed. Stop at the isolated review commit. Batch 4 and controlled activation require independent review and separate authorization.
