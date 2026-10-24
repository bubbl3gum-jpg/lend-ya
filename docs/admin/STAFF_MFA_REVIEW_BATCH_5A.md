# Real staff authentication and MFA foundation — Batch 5A review

24 October 2026 (Asia/Taipei). Started from clean `feature/approval-execution-safety-batch-4b`, exact HEAD **c017ca878da65d44059988067ef6263448bd9875**. Its ancestry includes reviewed 4A → 3C → 3B → 3A. Isolated branch: **feature/staff-authentication-mfa-foundation-batch-5a**. This report belongs to the implementation commit; the closeout supplies its exact SHA. No push, merge, deployment, real-staff provisioning or existing-database migration was performed.

## Result and implementation inventory

Implemented actual WebAuthn enrollment and signed-assertion verification, following the product owner's approval of **passkeys primary, no TOTP fallback**. Real cryptographic assurance remains separate from staff authorization. All new staff memberships/approval execution remain blocked, all legacy guards remain unchanged, and no production route imports this service. Production RP/domain, recovery and enforcement prerequisites remain unresolved, so only independently useful server infrastructure and owned-fixture acceptance were implemented.

| Source | Change |
| --- | --- |
| `lib/authorization/mfa/config.ts` | Explicit pinned exact-host RP/origin validation and protocol configuration hash; no production default. |
| `lib/authorization/mfa/service.ts` | Real standards-library verification, current password enrollment checks, hash-only challenges, session-incarnation/person/epoch binding, rate limits, atomic nonce/counter/audit/assurance, revocation, controlled additional-key enrollment, blocked recovery and always-denied staff issuance. |
| `prisma/schema.prisma` | Six additive MFA models/enums and inverse association relations. |
| `prisma/migrations/20261024180000_staff_webauthn_foundation/migration.sql` | Transactional forward migration with bounded lifetimes/attempts/counters, immutable key/binding history, append-only proof/events, FKs and populated-truncate protection. Seeds zero identities/keys. |
| `package.json`, `package-lock.json` | Pin `@simplewebauthn/server@14.0.3`; two isolated test scripts. Existing framework/Prisma versions unchanged. |
| `tests/mfa.test.ts` | Actual signed success/failure, replay/concurrency, correct UV/origin/RP/challenge, session swaps/reuse/logout, alias/epoch/account conflicts, revocation, second-key management, expired assurance, immutable history, persisted budgets, injected audit failure and browser acceptance. |
| `tests/support/webauthn-authenticator.ts` | Real ephemeral P-256 keys, COSE registration and ECDSA signed assertions; no verification mocks. |
| `tests/support/mfa-fixtures.ts` | Owned disposable synthetic identities/password sessions, including same-human aliases and DRAFT memberships. No production provisioning. |
| `tests/support/mfa-browser.ts` | Loopback-only acceptance server with exact origin/body checks, native navigator.credentials and CDP virtual authenticator. No application route. |
| `tests/mfa-migration.test.ts` | Fresh owned upgrade fixture, DDL failure rollback/recovery/replay, all historical rows/triggers and Batch 4B client compatibility. |
| `tests/run-isolated.ts` | Route new suites through existing effective-target/ownership safety harness. |
| `tests/staff-migration.test.ts`, `tests/staff-session-migration.test.ts`, `tests/approval-migration.test.ts` | Exclude the new migration from copied historical baseline fixtures, preserving the purpose of those tests; historical SQL untouched. |
| `docs/admin/STAFF_MFA_ARCHITECTURE_BATCH_5A.md` | Mechanism comparison, reviewed legacy authentication, schema, cryptographic/session chain and limitations. |
| `docs/admin/STAFF_MFA_ROLLOUT_READINESS_BATCH_5A.md` | Recovery, deployment, legacy Admin and four-role cutover gates; local reproduction/cleanup. |
| `docs/security/batch5a/*` | Exact changed-file inventory, final test metadata plus first chat failure, migration/source preservation, lockfile audit, cleanup and inspected native acceptance screenshot. |

The exhaustive inventory is [changed-files.txt](../security/batch5a/changed-files.txt). The [architecture](STAFF_MFA_ARCHITECTURE_BATCH_5A.md) explains enrollment, recovery and the blocked staff-session bridge; the [rollout plan](STAFF_MFA_ROLLOUT_READINESS_BATCH_5A.md) identifies remaining decisions.

## Verification

Final selected runs report **225 passing tests**: the existing 205 plus 16 MFA and four MFA-migration tests. Node's counts include parent tests; they are not 225 distinct user journeys. TypeScript, ESLint, Prisma validation and the production build pass. All data-changing checks used newly created owned disposable databases through the hardened runner. No test used a real application database.

| Command | Reported tests | Final result |
| --- | ---: | --- |
| `npx tsc --noEmit` | — | Pass |
| `npm run lint` | — | Pass |
| `npx prisma validate --config prisma7.config.ts` | — | Pass |
| `npm run test:unit` | 57 | Pass |
| `npm run test:mfa` | 16 | Pass; owned database removed |
| `npm run test:mfa-migration` | 4 | Pass; owned database removed |
| `npm run test:authorization` | 8 | Pass; owned database removed |
| `npm run test:staff-schema` | 8 | Pass; owned database removed |
| `npm run test:staff-migration` | 4 | Pass; owned database removed |
| `npm run test:staff-session` | 13 | Pass; owned database removed |
| `npm run test:staff-session-migration` | 4 | Pass; owned database removed |
| `npm run test:scoped-reads` | 10 | Pass; owned database removed |
| `npm run test:approval` | 18 | Pass; owned database removed |
| `npm run test:approval-migration` | 4 | Pass; owned database removed |
| `npm run test:execution-rehearsal` | 18 | Pass; owned database removed |
| `npm run test:admin` | 7 | Pass; owned database removed |
| `npm run test:moderation` | 10 | Pass; owned database removed |
| `npm run test:chat` | 14 | Pass; owned database removed |
| `npm run test:rental-api` | 13 | Pass; owned database removed |
| `npm run test:stability` | 8 | Pass; owned database removed |
| `npm run test:meetup` | 9 | Pass; owned database removed |
| `npm run build:verify` | Build | Pass; owned database removed |

Exact run timestamps, exit codes, run artifacts and cleanup are in [verification.json](../security/batch5a/verification.json). [Native WebAuthn screenshot](../security/batch5a/mfa-native-webauthn.png) shows signed-factor success while staff access stays blocked. It is a simple test harness, not a new product Admin screen.

Initial implementation findings were fixed before final verification: PostgreSQL rejected a credential-ID regex repetition upper bound of 1400 when inserting a key; independent length and character constraints retain the intended bound and work with PostgreSQL. A test-helper prefer-const lint error was corrected. These failures are recorded rather than omitted.

**Intermittent regression:** first chat run reported 12/14 pass because browser login remained on `/login` beyond its existing five-second assertion deadline (child plus parent failed). A fresh isolated retry passed all 14, including browser interaction and restart persistence. Root cause is not confirmed; timing/hydration/contention is a hypothesis, not a diagnosed cause or proof of resolution. The test, timeout and app login code were not changed. Keep this reliability issue open for dedicated diagnosis.

**Meetup:** current run passed 9/9, including actual synthetic-camera QR browser pickup/return, temporary TEST_LOCATION consent/expiry/revocation, confirmation-window timing and restart. Previous failures remain historical; this result does not establish that camera tests are universally stable. No camera/GPS/QR/evidence requirement was weakened.

## Migration and preservation evidence

The MFA suite applies all 23 migrations on a fresh owned database; its initial check confirms all six new tables are empty. A separate fixture applies the exact 22-migration Batch 4B history with representative users, ADMIN, ChatReviewer, sessions, bookings, handoffs, return/evidence, disputes, private chat, audits and pending staff foundations. It injects a failing forward migration, verifies transactional DDL rollback and unchanged historical rows, resolves only that owned test failure, reapplies the exact SQL, verifies replay is a no-op and uses a generated **old Batch 4B client** successfully after upgrade.

[upgrade-preservation.json](../security/batch5a/upgrade-preservation.json) records all 46 compared legacy tables and 53 preserved triggers, exact historical migration names, failure rollback, successful recovery/replay and old-client compatibility. Its synthetic pre-existing DRAFT/PENDING identities are unchanged and no staff are added by migration. Existing role/activation/session/audit protections remain installed; real sessions are not rebound or upgraded.

[baseline-preservation.json](../security/batch5a/baseline-preservation.json) records SHA-256 checksums proving **all 22 historical SQL migrations unchanged**, and byte-for-byte preservation of **147 baseline app/lib/proxy source files**. Only new MFA modules are added to application source. Booking custody, QR/GPS, MRT catalogue, evidence and participant confirmations remain as before. Existing Admin, moderation, chat and evidence tests pass in final runs. No live staff cookie, ACTIVE membership/grant, COMMITTED security event, approval or execution handler is created.

Every isolated run reports its owned database removed. A read-only maintenance-catalog query confirms **zero remaining `hustlen_test_b5a_*` databases**, recorded in [cleanup.json](../security/batch5a/cleanup.json). Retained artifacts are local ignored fixture directories; committed evidence excludes raw secrets and authentication proof bodies.

## Dependency assessment and unresolved risks

`npm audit --omit=dev --json` exits 1 with six moderate affected package nodes, **zero high/critical**. This is an advisory report, not a failed cryptographic test or a vulnerability-free claim. The [raw audit](../security/batch5a/dependency-audit.json) attributes the chain to baseline `fast-uri@3.1.8` through ajv → @prisma/streams-local → @prisma/dev → prisma → @prisma/client. Those versions, Next 16.4.3 and Prisma 7.10.1 are unchanged. The registry reports no advisory for the new WebAuthn package at this check.

| Advisory | Reported severity | Conditions and assessment |
| --- | --- | --- |
| GHSA-w74x-v6f9-j3xg | Moderate | Percent-encoded URI scheme spoofing; requires attacker-controlled URI interpretation by an affected consumer. |
| GHSA-xhq7-xmqj-769h | Low | Incorrect relative-reference/path equivalence normalization; consumer must use affected normalization for security-sensitive decisions. |
| GHSA-wjr9-j795-jxcr | Moderate | Host canonicalization confusion; requires the vulnerable parser result to affect trust/security checks. |
| GHSA-333x-w4r6-6crp | Low | Scheme injection using a suffix-reference first-segment colon; depends on security-sensitive URI resolution. |

Ranges exclude 3.1.9. npm reports no automatic compatible fix for this installed dependency chain; no broad upgrade/override was applied in this authentication batch. Installed affected versions are confirmed; exploitability in Hustlen's Prisma tooling/runtime is **not demonstrated**. The MFA realm uses native URL validation and does not call fast-uri. A focused follow-up should validate a compatible upstream Prisma/fast-uri patch and consumer behavior, not declare resolution solely from a version change.

Confirmed remaining constraints: legacy ADMIN is not MFA-enforced; recovery is blocked; no production RP or provisioning policy is configured; no live staff-session issuer exists; trusted database writers/owners could forge/bypass ledger protection; production retention/privilege/lock-order policy is not approved. MFA proof is authentication, not a unique-human identity certificate or permission grant. These conditions and explicit staged gates are in the rollout document. They prevent production activation; this isolated foundation is ready for independent code/security review.
