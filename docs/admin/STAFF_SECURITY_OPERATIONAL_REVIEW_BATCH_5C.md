# Staff security and operational readiness — Batch 5C review

24 October 2026 (Asia/Taipei). Reviewed clean `feature/admin-passkey-integration-pilot-batch-5b` at **da630045d7a535c2e7201ad449f87aa0b21ea7ec**. Isolated branch: **security/staff-operational-readiness-batch-5c**. This report belongs to the implementation commit; the closeout supplies its exact final SHA. No push, merge, deployment, existing-database migration or real-staff provisioning occurred.

## Outcome and exact implementation scope

Fixed a demonstrated pre-hydration login submission defect, added bounded login diagnostics and reproducibility coverage, and tested five actual PostgreSQL component principals with restricted credentials in newly owned disposable databases. Produced concrete onboarding, recovery, deployment and first-read cutover plans. **The candidate DB profile is not installed in the existing application**: its common configured connection remains a production architecture blocker. New staff roles, mandatory MFA, live recovery, approvals/serious sanctions and AI credentials remain absent/inactive.

| Source | Change / result |
| --- | --- |
| `components/auth-form.tsx` | SSR/login/register inputs and submit stay disabled until client hydration attaches handlers; aria-busy/readiness marker. Password checks, API calls, cookies and navigation behavior unchanged. Readiness is a UI property, never authorization. |
| `tests/support/login-diagnostics.ts` | At most 60 allowlisted navigation/auth-response events, browser readiness/input-validity booleans, cookie presence/HttpOnly flags and bounded database-session/lock-wait counts. No credentials, query strings, bodies, response contents or cookie values saved. |
| `tests/auth-login-readiness.integration.test.ts` | Controlled held-JavaScript baseline reproduction; fixed disabled-until-hydrated behavior and seven successful browser logins including six fresh-context repeats. |
| `tests/chat.integration.test.ts` | Attach diagnostics to each existing browser login; original login assertion and 5000 ms deadline unchanged. No added retries or weakened expectations. |
| `tests/support/database-principals.ts` | Owned-only ephemeral role/grant/ownership/RLS/lock-guard experiment. Separate actual login connections, private random credentials, final cleanup; no production installer. |
| `tests/database-principals.test.ts` | Seven reported tests; 40 SQL denials; real verifier cryptography under MFA role and actual Next runtime registration/login/catalog/logout under ordinary runtime role. Existing activation/history restrictions hold. |
| `tests/run-isolated.ts`, `package.json` | New `test:login-readiness` and `test:database-principals` run through the existing target/ownership harness. |
| `docs/admin/DATABASE_PRIVILEGE_SEPARATION_BATCH_5C.md` | Tested grants, row-lock discovery, credential/process and audit-transaction architecture, limits and deployment requirements. |
| `docs/admin/STAFF_ONBOARDING_READINESS_BATCH_5C.md` | Canonical human/alias verification, sponsorship/approval, initial keys, expiring memberships/grants, sessions, offboarding and decision owners. |
| `docs/admin/ASSISTED_PASSKEY_RECOVERY_REVIEW_BATCH_5C.md` | Explicit separation of investigation, proofing, approval and mechanical execution; feasible small-team models and unresolved policy. |
| `docs/admin/PRODUCTION_WEBAUTHN_READINESS_BATCH_5C.md` | Exact RP/origin configuration requirements, TLS/ingress/cookies/CSRF, lifetimes, secrets, recovery, retention, observability, devices and rollback gates. No guessed domain. |
| `docs/admin/FIRST_STAFF_READ_CUTOVER_PLAN_BATCH_5C.md` | Proposed exact listings.read metadata pilot, real trust chain, durable-audit gap and incremental implementation/negative-test gates. No endpoint activated. |
| `docs/security/batch5c/*` | Complete inventory/checksums, baseline/fixed/repeat login diagnostics, principal SQL evidence, migration preservation, verification and cleanup. |

Exhaustive files: [changed-files.txt](../security/batch5c/changed-files.txt).

## Chat-login diagnosis: demonstrated cause and uncertainty

Before changing the Batch 5B form, an owned real Next/browser test held its client JavaScript. The SSR form remained enabled, accepted input and submitted natively back to **GET /login**, without any POST /api/auth/login or session cookie. The form had no usable native login action; without attached React handlers, its native submission could never authenticate. This reproduces the visible symptom deterministically, rather than treating another successful retry as a fix. See [baseline reproduction](../security/batch5c/login-baseline-reproduction.json).

`useSyncExternalStore` supplies a server-false/client-true hydration snapshot. Inputs/submit become interactive only after hydration, so rapid users/browser automation cannot fill and submit an inert SSR form. The control does not trust a client flag for authentication and does not change server permission checks. The fixed held-JavaScript test asserts the disabled state, releases scripts, then completes real login; six further fresh browser contexts also pass. The application already required JavaScript; this does not remove a working non-JavaScript login path.

Three consecutive complete chat suites then passed **14/14 each**, each with a fresh owned DB. Their four actual browser logins per run all have expected navigation/auth statuses and persisted HttpOnly session cookies: **12 successful chat browser logins**, plus the seven targeted readiness logins. No chat login timeout was increased, no login retry was added and no assertion removed. Full API/moderation/read-state/reconnect/restart checks still pass. [Repeat diagnostics](../security/batch5c/chat-repeat-diagnostics.json) retains each run separately; [targeted fixed diagnostics](../security/batch5c/login-fixed-repeats.json) records the seven target flows.

**Remaining uncertainty:** this proves a concrete defect and successful bounded post-fix stability, not forensic attribution of every Batch 5A/5B failure. Historical runs did not capture per-browser network/hydration state. Their aggregate server logs include other test activity and cannot resolve all failed-browser causality. The saved DB lock counts are end-of-login samples, not a continuous trace proving absence of transient contention. Readiness is also covered by the harness's server-ready probe and actual 200 login/navigation responses. If a timeout recurs, inspect these bounded diagnostics and add targeted temporal evidence for the remaining hypothesis rather than extending deadlines or claiming zero flakiness.

## Database-principal security findings

Actual connections represent ordinary runtime, controlled migration owner, MFA verification/persistence, protected authorization/audit writing and read-only inspection. Restricted principals have distinct session_user/current_user, no superuser/CREATEROLE/CREATEDB/BYPASSRLS and no privileged memberships. This avoids the false confidence of SET ROLE on a superuser session. Roles exist only for a run; all explicit object grants/data operations are within the owned DB. PostgreSQL roles themselves are cluster-scoped; no existing role is altered, and read-only final catalog checks confirm all ephemeral roles were removed.

The ordinary runtime cannot create schema/table/temp/helper functions, disable triggers, set replication bypass, truncate/rewrite audits, promote or insert ADMIN accounts, access staff/approval/MFA persistence, increment authorization epochs or become another component role. MRT catalogue is SELECT-only. The candidate still runs real Prisma session persistence and actual Next registration/login/current-user/catalog/logout, including denial of registration-role spoofing. Broader legacy flows under the candidate profile remain a separate deployment gate; ordinary marketplace access is not a lower-staff resource-scope policy.

The MFA connection performs actual registration and signed assertion verification through the existing verifier, returns staffAuthorized=false and supports authenticated revocation. It cannot change roles/provision staff/rewrite assurance history. The protected writer gets SQLSTATE **23514** for ACTIVE membership and COMMITTED security attempts, and **P0001** for direct trigger-maintained epoch/internal-history writes. Non-owner runtime DDL/forgery paths get **42501**. The inspector reads only a fixed aggregate view; migration principal alone performs the DDL probe and owns enum types for future controlled migrations. [40 denial outcomes](../security/batch5c/principal-evidence.json) are recorded without raw SQL values/credentials.

Initial candidate findings: SELECT-only identity grants were insufficient for real verifier row locks; User RLS visibility also needed explicit component policies. The tested profile now grants UPDATE only on guarded immutable id columns, with actual MFA writes rejected and User WITH CHECK(false). The first zero-row RLS UPDATE denial assertion was corrected to exercise an explicit guarded write; a constraint-name lookup was corrected. No production grants or historical constraints were changed to make the experiment pass.

**Production gaps remain:** current Next/pilot still has its configured shared connection. Verifier/writer credentials in the same compromised process would not create isolation. The MFA credential itself is a trusted issuer and can fabricate ledger rows if stolen. Legacy AdminAuditLog INSERT remains available to the candidate runtime to preserve existing operations; compromised-runtime attribution forgery is not solved by append-only history. Secure audit insertion requires a reviewed typed actor/session/scope-validating transaction boundary, not audit(JSON), a caller-set session variable, runtime writer membership or an uncoordinated second audit connection. Existing COMMITTED staff results remain blocked. See the [privilege design](DATABASE_PRIVILEGE_SEPARATION_BATCH_5C.md).

## Onboarding, recovery and first-read findings

Onboarding must first approve actual canonical-human proofing authority, alias reconciliation, independent sponsorship/approval, first enrollment assurance, role/capability allocations, lifetimes and offboarding/recovery policy. A verified database flag or passkey alone does not prove an independently verified unique human. No provider or automatic ADMIN conversion is invented. Existing current ADMIN/ChatReviewer behavior and custody/support obligations remain.

Recovery remains unimplemented. The refined design distinguishes support investigation, trusted re-verification, independent human approval, a mechanical constrained executor, atomic credential/session invalidation, replacement enrollment and durable notification/audit delivery. It explicitly allows a proposed two-qualified-human model with an executor that is not another human approver, subject to policy/conflict review. If qualified independent coverage is absent, recovery waits; no password/email/hidden account/emergency bypass is introduced.

Reviewed all **21 current legacy Admin API routes**, **15 Admin pages**, their services/components/CLI and private participant/media boundaries, plus the separate actual passkey endpoint. [Current entry-point inventory](../security/batch5c/admin-entrypoints.json) supplements the complete historical Markdown inventory; all current guard/service hashes are preserved.

Propose one exact listing's `{id,status,category,adminRestricted}` via listings.read for a separately approved Operations cohort. Role allocation for this read is still proposed, not approved. Do not reuse unrestricted Admin DTOs or add ADMIN OR staffRole. **The shadow adapter currently audits only evidence-classified reads, not listings.read metadata.** A real staff pilot therefore needs unconditional durable read audit plus an authoritative session/human/member/real-assurance/grant/resource/version chain, reviewed lock/revocation semantics and separate policy/schema cutover. No read capability or route is activated here.

## Actual verification

**250 reported passing tests** in the selected final runs, including parent test counts, plus **28 additional passing full-chat repeat tests**. Baseline defect reproduction is recorded separately and is not counted as a production security pass. Unit count remains 59. TypeScript, ESLint, Prisma validation, production build and current production-dependency audit pass. Audit reports zero current advisories; lockfile is unchanged from reviewed Batch 5B.

| Command | Reported tests | Actual result |
| --- | ---: | --- |
| `npm run test:unit` | 59 | Pass |
| `npx tsc --noEmit` | — | Pass |
| `npm run lint` | — | Pass |
| `npx prisma validate --config prisma7.config.ts` | — | Pass |
| `npm audit --omit=dev --json` | — | Exit 0; zero reported advisories |
| `npm run test:login-readiness` | 1 | Pass; owned database removed |
| `npm run test:database-principals` | 7 | Pass; owned database removed |
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
| `npm run test:mfa-migration` | 4 | Pass; owned database removed |
| `npm run test:mfa` | 16 | Pass; owned database removed |
| `npm run test:mfa-pilot` | 13 | Pass; owned database removed |
| `npm run test:mfa-pilot-disabled` | 1 | Pass; owned database removed |
| `npm run test:mfa-pilot-production` | 1 | Pass; owned database removed |
| `npm run build:verify` | — | Pass; owned database removed |

The [verification ledger](../security/batch5c/verification.json) records exact timestamps, exit codes, run artifacts, initial profile findings and all three chat runs. All data-changing tests used the fresh effective-target/ownership harness. No ordinary application database was used.

MFA, actual pilot browser flow, disabled development and flagged production refusal, staff identities/sessions, scoped reads, authorization, approvals/execution rehearsal, Admin/moderation, rentals/stability and migration suites pass. Meetup passes **9/9 including synthetic-camera QR browser acceptance**, temporary TEST_LOCATION consent/expiry/revocation, confirmation windows and restart. No booking, custody, GPS, QR, camera or evidence rule was changed; finite success is not a claim that camera intermittence can never recur.

## Preservation, cleanup and blockers

No new schema/migration or dependency change. All **23 historical SQL migrations**, Prisma schema and lockfile are byte-for-byte preserved. **58 current authentication/authorization/pilot source files** compare to baseline unchanged. Only the shared authentication form's hydration readiness changes application behavior; authentication/permission semantics, guards and all staff/approval activation restrictions remain intact. See [baseline preservation](../security/batch5c/baseline-preservation.json).

Fresh tests apply the unchanged migration history. Populated upgrade tests retain all 46 compared historical tables and 53 baseline triggers, rollback/recovery/replay and old-client compatibility; [upgrade evidence](../security/batch5c/upgrade-preservation.json). The separate principal experiment preserves all 23 migration-row names/checksums while testing owner/grant changes exclusively in its disposable database.

Every owned test DB is removed. A read-only maintenance catalog check confirms **zero Batch 5C test databases and zero owned ephemeral PostgreSQL principals** remain; [cleanup evidence](../security/batch5c/cleanup.json). Local ignored test artifacts remain for review; committed logs contain only selected bounded metadata. No production credential, deployment infrastructure or existing application record was modified.

Before production: approve identity/recovery/staffing decisions and exact domains; implement/review isolated verification and typed durable-audit boundaries, least-privileged final runtime grants/defaults and lifetime/retention/notification/rollback policy; test physical devices; independently review a real scoped first-read issuer and additive cutover. Mandatory MFA, staff activation and live high-risk execution remain blocked. The [deployment specification](PRODUCTION_WEBAUTHN_READINESS_BATCH_5C.md), [onboarding decisions](STAFF_ONBOARDING_READINESS_BATCH_5C.md), [recovery refinement](ASSISTED_PASSKEY_RECOVERY_REVIEW_BATCH_5C.md) and [first-read plan](FIRST_STAFF_READ_CUTOVER_PLAN_BATCH_5C.md) make those gates explicit.
