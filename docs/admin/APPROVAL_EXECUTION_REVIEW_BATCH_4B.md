# Approval execution safety foundation — Batch 4B review

24 October 2026 (Asia/Taipei). Reviewed starting branch `feature/independent-approval-foundation-batch-4a`, exact clean HEAD **ce9ad9d1dd7d3b894d4904374421272050629424**. Isolated branch: `feature/approval-execution-safety-batch-4b`. The accompanying closeout supplies the exact final commit; this report belongs to that implementation commit.

## Outcome

Added a descriptive, server-owned registry of blocked future execution contracts and one deliberately synthetic execution rehearsal. The registry validates and hashes closed reference intents; it contains no production handlers. The rehearsal exists only in a verified owned disposable PostgreSQL database and can change only its own counter. It has separate synthetic identities, scopes and TEST_VERIFIED attestations, never real staff memberships, pending step-up or shadow MATCH credentials.

The [architecture and transaction/lock diagram](APPROVAL_EXECUTION_SAFETY_ARCHITECTURE_BATCH_4B.md) explains immutable proposal/decision/hash binding, exact scope, final revalidation, one-effect receipts, atomic audit and failure behavior. The [integration matrix and readiness checklist](APPROVAL_EXECUTION_INTEGRATION_READINESS_BATCH_4B.md) covers each requested high-risk family and unresolved production prerequisites. Existing direct legacy Admin actions remain **outside** this foundation's protection.

## Baseline and database preservation

Reviewed Batch 4A's architecture, migration, constraints, tests and complete legacy high-risk transition inventory. No application Prisma model, schema or migration is added/changed. All **22 historical migrations** and migration lock are byte-identical. Existing ACTIVE-membership/grant, APPROVED/EXECUTED, APPROVE and unsupported COMMITTED-event constraints remain. There is no real staff provisioning, production session/approval/receipt writer, executor endpoint, activation switch or operational callback.

The new SQL file is `tests/fixtures/approval-execution.sql`, not a Prisma migration. Its installer is test-only and checks actual ownership/target before DDL. All new tables/functions live in `approval_rehearsal`; every application/legacy schema stays unchanged. The code does not write public Users, Bookings, Disputes, StaffMemberships, MRT stations, payments or evidence. Existing Admin, moderation, chat, rental, QR, camera, GPS, consent and custody source files are unchanged.

[Baseline checksums](../security/batch4b/baseline-checksums.json) identify all historical files and the fixture SQL. [Application preservation evidence](../security/batch4b/application-preservation.json) compares **47 public tables including migration history**, every preexisting row value and **53 existing triggers** before/after the entire rehearsal, confirming no application-record or migration change. Only aggregate counts/flags and bounded SQLSTATE values are published, not row contents, tokens, private evidence or coordinates. Existing fresh/populated staff and approval upgrade suites were also rerun and passed; they exercise their original rollback/replay/old-client preservation fixtures. There is no Batch 4B application migration to apply to an existing database.

Every changing test used the existing effective-target and fresh owned-database harness. PostgreSQL was 17.11. A read-only maintenance-catalog check confirmed zero remaining `hustlen_test_b4b_*` databases. No real application database was migrated, reset, seeded or modified. No production credentials, DB principals or infrastructure were changed.

## Synthetic execution evidence

[tests/execution-rehearsal.test.ts](../../tests/execution-rehearsal.test.ts) ran real PostgreSQL transactions, with multiple connections and actual locks:

| Property | Actual evidence |
| --- | --- |
| Exactly one effect | Three concurrent calls create one counter change and receipt; two calls return historical replay, not another effect. Repeat retains value=1/version=2/CONSUMED. |
| Exact immutable approval | Payload/revision/decision FKs bind exact hashes; payload/history edits fail. A new revision has no decision and cannot reuse the old one. |
| Forged approval | A wrong hash fails the FK; a deliberately forged persisted approver-human/requester-session pairing fails execution-time identity revalidation. No effect or receipt. |
| Distinct humans/aliases | Requester and same-person alias cannot approve. Fixture also requires executor to be a third distinct human; this is not an approved production allocation. |
| Current scope and assurance | Forged tokens, wrong-resource scope, revoked human/session/grant, stale epoch, PENDING or expired attestations deny. Actual proposal and decision expiry are tested. |
| Current versions/conflicts | Resource/evidence/policy drift and canonical requester/approver/executor conflict-set entries deny; no automatic retry or revised authority is inferred. |
| Atomic audit | A real audit-insert trigger failure rolls back the already provisional counter effect; no receipt. Domain-update failure leaves neither success audit nor receipt. |
| Final authoritative checks | In-transaction epoch, evidence-version or assurance-expiry changes cause final failure and roll back all provisional changes. Wall-clock assurance expiry during a locked run also denies. |
| Revocation before locks | A separate committed epoch change during a controlled pause is observed after locking; no effect/receipt. |
| Revocation during locks | PostgreSQL reports the revoker waiting on a real lock; the authorized synthetic transaction commits before revocation, then later access/replay denies. |
| Lock timeout | A peer holds the resource; observed SQLSTATE **55P03**, denied execution, zero receipt/effect, no internal retry. |
| Deadlock | Deliberately reversed peer resource/proposal lock order causes observed SQLSTATE **40P01**; transaction abort leaves zero effect/receipt. |
| Production refusal | NODE_ENV=production and a wrong ownership marker refuse before effect. Failed attempt audit may itself be unavailable under a failed guard; bounded diagnostics are emitted, never success. |
| Existing safeguards | All public rows/history/triggers compare exactly and each existing activation-blocking CHECK remains installed. |

These are fixed-domain relational tests, not proof of production MFA, authorization, all-domain safety or distributed exactly-once delivery. Owners can bypass ordinary triggers. Global real writer ordering, mutable external providers, cache/transport races and ambiguous commit handling remain unresolved. The fixture uses READ COMMITTED, locks and final checks; it does not claim all future transactions are deadlock-free.

## Complete actual verification

| Final command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run test:unit` | 57 passed |
| `npm run test:execution-rehearsal` | 18 passed |
| `npm run test:authorization` | 8 passed |
| `npm run test:approval` | 18 passed |
| `npm run test:approval-migration` | 4 passed |
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
| `npm run build:verify` | Actual production Next build passed on an owned disposable fixture |

**205 reported tests passed**, including Node parent tests; no final test failures/skips/cancellations. The initial rehearsal passed 16 cases, then 17 and 18 as SQLSTATE, expiry and forged-approval checks were added; all completed runs passed. Expected fault-injection operational errors are not test-suite failures. [Machine verification](../security/batch4b/verification.json) records final commands, UTC times, exit codes, cleanup and artifacts. Meetup passed one full run; historical camera flakiness is not claimed eliminated and no validation was weakened.

Reproduce using the pinned lockfile, the existing authorized local provisioner and a new strict `MRT_TEST_DATABASE_URL=hustlen_test_*` target through `tests/run-isolated.ts`. The guard verifies effective connection options and actual fresh ownership before applying the original migrations. The rehearsal installer checks again before its fixed test SQL and every execution verifies its installation marker. Browser testing used `/usr/bin/chromium` through MRT_BROWSER_PATH/CHROMIUM_PATH. Existing migration suites need their historical git objects to generate old clients. Never run changing tests against an application database. Every final fixture/database was removed.

## Remaining blockers and next batch

No new production authorization regression was found in unchanged legacy code by review/requested tests. The real registry deliberately cannot execute. Confirmed coverage gaps remain: no real MFA/identity-proofing issuer, live staff-session lifecycle, approved role/executor allocations, case/conflict lineage, protected audit writer/DB principal separation, immutable production payload/evidence providers, retention/privacy decisions or complete legacy authorization cutover. The rehearsal's merged conflict set and synthetic assertions are not those production implementations. A proposed reference validator does not validate actual domain evidence or business legality.

The recommended next batch is a separately authorized, non-activating one-domain integration design, with explicit product decisions and a no-effect plan before any real handler. All prerequisites and per-action dependencies are listed in the integration readiness document. Do not replace the counter UPDATE with a business-model mutation or assume the existing legacy routes are governed because a rehearsal receipt exists.

## Changed-file inventory

Twelve files:

- `lib/authorization/approvals/execution-contracts.ts`
- `tests/fixtures/approval-execution.sql`
- `tests/support/execution-rehearsal.ts`
- `tests/execution-rehearsal.test.ts`
- `tests/run-isolated.ts`
- `package.json`
- `docs/admin/APPROVAL_EXECUTION_REVIEW_BATCH_4B.md`
- `docs/admin/APPROVAL_EXECUTION_SAFETY_ARCHITECTURE_BATCH_4B.md`
- `docs/admin/APPROVAL_EXECUTION_INTEGRATION_READINESS_BATCH_4B.md`
- `docs/security/batch4b/baseline-checksums.json`
- `docs/security/batch4b/application-preservation.json`
- `docs/security/batch4b/verification.json`

No merge, push, deploy, real database migration, staff/approval activation, operational effect, support messaging, AI identity or payment movement was performed. Stop at the isolated review commit.
