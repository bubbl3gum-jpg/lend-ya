# Controlled Admin passkey integration — Batch 5B review

24 October 2026 (Asia/Taipei). Reviewed clean starting branch `feature/staff-authentication-mfa-foundation-batch-5a`, exact final SHA **f35a33b1d9530429b1870011da0a608c11e2afe8**. Isolated branch: **feature/admin-passkey-integration-pilot-batch-5b**. This report belongs to the implementation commit; its exact final SHA is supplied in the closeout. No push, merge, deployment, existing-database migration or real-staff provisioning was performed.

## Outcome and source inventory

Existing ACTIVE ADMIN users with the required verified synthetic person/account association can use Security → Passkeys in the explicitly configured owned development pilot. Native WebAuthn enrollment, verification, additional-key enrollment, revocation and cancellation run through **actual application routes**, not a mock authorization endpoint. Factor verification always remains separate from staff authority. Production and flag-off pilot surfaces return 404, including before page streaming. No mandatory MFA, new active staff role/grant, recovery execution, approval executor or ADMIN OR staffRole fallback is introduced.

| Exact source | Result |
| --- | --- |
| `app/admin/security/page.tsx` | New legacy-Admin Security page, unavailable outside owned development pilot. |
| `components/admin/passkeys.tsx` | Accessible native passkey controls, own-key metadata/status, password field, short-lived assurance/expiry, errors/cancellation and final-key/recovery warnings. |
| `lib/webauthn-browser.ts` | Native navigator.credentials create/get and bounded JSON/ArrayBuffer conversion; no mocked MFA success. |
| `app/admin/layout.tsx`, `components/admin/navigation.tsx` | Conditional System → Security navigation using existing responsive Admin shell. All existing links remain. |
| `app/api/auth/admin-passkeys/route.ts` | Dynamic factor-management GET/POST entry point; delegates to guarded server controller. |
| `lib/passkey-pilot.ts` | Effective-target/ownership checks, unchanged legacy adminApi guard, exact Origin/Host/CSRF, closed bounded JSON/native response validation and safe failure mapping. |
| `lib/passkey-pilot-config.ts` | Trusted development-only localhost configuration; rejects production, unsafe database targets/overrides and mismatched bindings. |
| `proxy.ts` | Narrow early refusal for new pilot paths outside explicit development; existing mutation/Origin checks unchanged for other paths. |
| `lib/authorization/mfa/service.ts` | Server-selected legacy-Admin requirement checked inside the MFA transaction; safe own-key projection; real assurance expiry returned; atomic first-version initialization fixes observed concurrent empty-upsert race. Existing cryptographic controls preserved. |
| `tests/mfa-pilot.integration.test.ts` | 13 reported tests including real native app flow, keyboard activation, four-way first-read race, strict transport/validation, replay/concurrency, session/account controls, revocation and audit-failure recovery. |
| `tests/mfa-pilot-production.test.ts`, `tests/passkey-pilot-config.test.ts` | Actual production/flag-off refusal, empty MFA tables, and negative configuration/override checks. |
| `tests/dependency-security.test.ts` | Four focused URI advisory regressions, in addition to existing Prisma deepmerge coverage. |
| `tests/run-isolated.ts`, `package.json` | Owned application pilot/disabled/production test commands; new checks remain inside existing isolation harness. |
| `package-lock.json` | Only resolved package change: fast-uri 3.1.8 → 3.1.9, within existing range. No framework/Prisma/WebAuthn upgrade or forced override. |
| `docs/admin/ADMIN_PASSKEY_PILOT_BATCH_5B.md` | Gate, endpoint/contract, identity boundary, reproduction/cleanup and production prerequisites. |
| `docs/admin/ASSISTED_PASSKEY_RECOVERY_PROPOSAL_BATCH_5B.md` | Unimplemented independent identity/review/revocation/notification/emergency workflow proposal. |
| `docs/security/batch5b/*` | Inspected screenshots, exact inventory, actual test metadata/failures, dependency comparison/audits/tree, preservation and cleanup evidence. |

The exhaustive list is [changed-files.txt](../security/batch5b/changed-files.txt). [Architecture and operation](ADMIN_PASSKEY_PILOT_BATCH_5B.md) documents exact development configuration and all POST action contracts. [Recovery proposal](ASSISTED_PASSKEY_RECOVERY_PROPOSAL_BATCH_5B.md) explicitly separates investigation, independent identity review and high-risk authorization; allocations remain proposals.

## Browser evidence

[Desktop, 1440 px](../security/batch5b/passkeys-desktop.png) · [Tablet, 820 px](../security/batch5b/passkeys-tablet.png) · [Mobile, 390 px](../security/batch5b/passkeys-mobile.png).

Chromium logs in through the real application login form and receives the existing HttpOnly SameSite=Lax session cookie. Its virtual CTAP2 authenticator performs native enrollment with required user verification, native signed assertion, fresh-assurance additional-key enrollment using a second authenticator, password/assurance-authenticated key revocation, verification of the remaining key, cancellation with persisted challenge cancellation, and actual sign-out/session invalidation. The first enrollment uses keyboard Enter only after the loading-disabled button becomes enabled. Screenshots show a revoked first key, enrolled second key, current factor assurance and no staff authority. All three viewports have no horizontal page overflow.

These are native **virtual-authenticator** browser results. Physical authenticator, synchronized-device recovery and physical mobile-platform compatibility are not certified by resizing desktop Chromium. No real staff or production passkeys were enrolled.

## Security boundary evidence

| Boundary | Actual result |
| --- | --- |
| Production even with flag enabled | Production build/start against a new owned DB: page and both API methods return 404; no Security link; all six MFA tables stay empty. |
| Flag-off development | Real dev server: same refusal, hidden link and empty MFA tables. |
| Ownership | Changing only the owned test DB's marker causes actual GET/POST 404; marker restored in finally. Never targets an application DB. |
| Connection/config | Wrong NODE_ENV, flag, origin, run ID, database binding and PostgreSQL options/ambient driver overrides fail closed in configuration tests; existing isolation negative tests remain passing. |
| Authentication/legacy authority | Anonymous/expired sessions 401; ordinary, suspended, revoked-association or demoted Admin identities 403. No body/header role can elevate. Service rechecks legacy Admin inside its locked transaction. |
| CSRF/realm | Missing/null/wrong/scheme-mismatched Origin, wrong Host, cross-site fetch or non-JSON mutation rejects. Browser RP/origin/person/policy/version/MFA-state fields and query strings are rejected. |
| Cryptography | Real signed wrong-origin assertion rejects; correct native and Node-generated signed assertions succeed. Batch 5A's 16 actual verifier tests still pass. |
| Replay/concurrency | Consumed proof rejects; concurrent valid same-challenge assertions yield exactly one success. Four initial status reads yield one version row and no key disclosure. |
| Session/current account | Different session on same account cannot finish another challenge; account suspension/demotion and actual logout invalidate route access. Existing session-birth/alias/epoch tests pass. |
| Expiry/cancellation/revocation | Expired/cancelled challenges deny. Revocation requires password and persisted real fresh assurance; old assurance cannot re-enroll, and revoked last key cannot authenticate. No recovery action exists. |
| Failure integrity | A real audit-insert failure rolls back provisional verification; challenge remains pending. After removing only the owned fixture failure trigger, the same unconsumed response verifies. No forged success or weakened check is used. |
| Privacy/authorization | List returns only own bounded key metadata; no COSE public key, credential ID, nonce, token hash or private case contents. Factor success reports staffAuthorized=false; activation/approval/committed-security invariants remain intact. |

Pilot errors are generic, with bounded operational correlation/category logging for unexpected failures. No raw password, session token, private key or reusable assertion body is added to application logs/audit. Test identities and passwords are synthetic fixtures only; committed evidence excludes private traces/proof bodies. The existing database owner/trusted writer can still bypass or forge ledger state; production verifier-writer isolation remains a blocker before a real authorization consumer is permitted.

## Actual verification

Final selected runs report **242 passing tests**, including parent test counts: 59 unit, 16 MFA, 13 actual-route/browser pilot, one production refusal, one development-disabled refusal, four populated MFA-upgrade and the existing authorization/staff/scoped-read/approval/operational suites. This count uses the fresh successful chat retry and does not erase the failed first attempt. TypeScript, ESLint, Prisma validation, clean lockfile installation/client generation and the production build pass.

| Command | Reported tests | Final result |
| --- | ---: | --- |
| `npx tsc --noEmit` | — | Pass |
| `npm run lint` | — | Pass |
| `npx prisma validate --config prisma7.config.ts` | — | Pass |
| `npm run test:unit` | 59 | Pass |
| `npm run test:mfa-pilot` | 13 | Pass; owned database removed |
| `npm run test:mfa-pilot-production` | 1 | Pass; owned database removed |
| `npm run test:mfa-pilot-disabled` | 1 | Pass; owned database removed |
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
| `npm run build:verify` | — | Pass; owned database removed |

Exact timestamps, exit codes, artifacts, cleanup and retained failure metadata are in [verification.json](../security/batch5b/verification.json).

Implementation/test defects fixed before final verification: unawaited service promises escaped the intended route denial catch; explicit await now preserves 403 handling. Concurrent initial reads exposed Prisma empty-upsert P2002; atomic initialization plus a four-way regression fixes it. A cancellation test matched Next's route announcer as well as its intended alert; the selector is scoped. Header-fixture typing was corrected after an initial production build type error. Next streamed not-found UI with HTTP 200; early proxy refusal now produces actual production 404. A keyboard test tried Enter before a loading-disabled button became enabled; it now waits for readiness, without changing any authentication requirement.

**Recurring chat intermittence:** first chat run passed 12/14, with browser login still at `/login` after the existing 5000 ms assertion (child and parent failed). One fresh owned retry passed 14/14. This repeats Batch 5A's symptom; timing/hydration/contention remains a hypothesis, not a confirmed diagnosis or resolution. Neither chat test/timeouts nor app login behavior were changed. Treat it as a separate open reliability issue.

**Meetup/camera:** current run passed 9/9 including actual synthetic-camera QR browser acceptance, confirmation windows, temporary TEST_LOCATION consent/expiry/revocation, custody/return/inspection and restart. No camera failure occurred in this batch's run; prior intermittence is not claimed resolved. QR/GPS/evidence/participant checks were not weakened.

## Migration and history preservation

Batch 5B adds **no Prisma model/schema change and no migration**. All **23 historical migration SQL files** and the exact Batch 5A Prisma schema/lock metadata compare byte-for-byte to baseline, recorded with SHA-256 in [baseline-preservation.json](../security/batch5b/baseline-preservation.json). All 44 inventoried baseline legacy Admin/authentication/ChatReviewer/chat source files also remain byte-for-byte unchanged. The only legacy shell/middleware edits are the explicitly scoped navigation and pilot-path refusal; existing auth and operational guards remain intact.

Fresh owned tests apply the unchanged 23-migration chain. The populated upgrade suite independently rechecks transactional failure rollback, recovery/replay, old Batch 4B client compatibility, all 46 compared historical tables and 53 existing triggers. See [populated-upgrade-preservation.json](../security/batch5b/populated-upgrade-preservation.json). Pending staff records and legacy sessions/audits remain historical data, never proof of MFA or activated staff authority. Representative schema/grant/session/approval migration suites also pass.

All data-changing tests used the verified fresh ownership harness. Each isolated run reports its owned database removed. A separate read-only maintenance-catalog check confirms **zero remaining `hustlen_test_b5b_*` databases**, in [cleanup.json](../security/batch5b/cleanup.json). No existing application database was migrated, reset, seeded or modified.

## Dependency remediation and limits

A focused compatible lockfile refresh resolves **fast-uri 3.1.8 → 3.1.9**, permitted by the existing ajv dependency range. The resolved path is prisma → @prisma/dev → @prisma/streams-local → ajv → fast-uri; npm previously propagated the advisory to six affected package nodes, including @prisma/client metadata. No dependency other than fast-uri changes in the lockfile; Next 16.4.3, Prisma 7.10.1 and WebAuthn 14.0.3 remain fixed. `npm ci --ignore-scripts` followed by explicit Prisma generation and full regressions succeeded.

| Advisory | Severity | Demonstrated parser condition | Result on 3.1.8 / 3.1.9 |
| --- | --- | --- | --- |
| GHSA-w74x-v6f9-j3xg | Moderate | Encoded scheme must not become a live scheme | Unsafe / safe |
| GHSA-xhq7-xmqj-769h | Low | `../x` must not compare equal to `x` | Unsafe / safe |
| GHSA-wjr9-j795-jxcr | Moderate | Second @ must not silently select a different host | Unsafe / safe |
| GHSA-333x-w4r6-6crp | Low | Suffix serialization must not expose a first-segment scheme colon | Unsafe / safe |

The baseline npm archive was tested separately in `/tmp`, without replacing the application dependency. Focused vectors based on upstream 3.1.9 security regressions fail safely on the installed patch and reproduce unsafe parser behavior on 3.1.8. [dependency-vectors.json](../security/batch5b/dependency-vectors.json) records those comparisons; a committed unit test protects all four conditions. [Baseline audit](../security/batch5b/dependency-audit-baseline.json), [current audit](../security/batch5b/dependency-audit-after.json) and [resolved tree](../security/batch5b/dependency-tree.json) are retained. Current `npm audit --omit=dev` exits 0 with **zero reported advisories**.

This closes the identified resolved-package advisory instances with behavioral and regression evidence, rather than relying solely on a version number. It does not prove every upstream exploit variant or absence of unknown vulnerabilities. Application exploitation of the old Prisma tooling path was not demonstrated; the pilot uses native URL validation, not fast-uri, to select its trusted origin.

## Remaining rollout blockers

The [assisted recovery proposal](ASSISTED_PASSKEY_RECOVERY_PROPOSAL_BATCH_5B.md) is not executable policy. Approve canonical identity proofing, independent reviewer allocation/capacity, exact reset/invalidation scope, notifications, retention and emergency procedure before mandatory MFA. No password/email/self-approved reset or fallback TOTP exists. Last-factor loss remains blocked; legacy Admin MFA remains optional.

Production RP/domain/HTTPS configuration, physical-device/mobile/browser coverage, assisted initial enrollment, DB writer privilege isolation, immutable-ledger retention and session renewal/CSRF deployment review are still needed. A real staff-session issuer, bounded scopes, four-role cutover and independent-approval execution each require separate review; current activation constraints and disconnected execution paths remain. This batch is ready for independent code/security review as a disposable development pilot, not for production enforcement.
