# Controlled Admin passkey pilot — Batch 5B architecture and operation

24 October 2026 (Asia/Taipei). Baseline: clean `feature/staff-authentication-mfa-foundation-batch-5a`, **f35a33b1d9530429b1870011da0a608c11e2afe8**. Isolated branch: `feature/admin-passkey-integration-pilot-batch-5b`.

## Pilot surface

`app/admin/security/page.tsx` adds Security → Passkeys using existing Admin cards, typography, responsive sidebar and focus treatment. `components/admin/passkeys.tsx` supports listing this account's enrolled/revoked keys, password-confirmed enrollment, fresh factor verification, additional-key enrollment requiring existing assurance, revocation, browser-prompt cancellation and clear errors/recovery warnings. Dates and assurance expiry are shown in Asia/Taipei. Additional-key/revocation assurance is held only in component memory and cleared on expiry, failure or key change; reload requires a fresh assertion. Password inputs are cleared after an operation. They are never persisted in browser storage or logged.

`lib/webauthn-browser.ts` converts JSON options to native ArrayBuffers and serializes native registration/assertion responses; it does not simulate success. User presence and user verification are enforced by the real Batch 5A server verifier. Browser results have no authority on their own. Backup/device metadata is reported as authenticator metadata, not hardware certification or a guarantee of recoverability. The final-key checkbox is a user warning; password plus valid real assurance remain the server authorization controls.

The Security link appears only when the owned pilot guard succeeds. Other Admin navigation, legacy ADMIN/ChatReviewer checks and routes remain unchanged. The pilot neither mandates MFA nor changes access to existing operational pages. No identity provisioning, membership grant, recovery operation or approval execution is exposed.

## Server-owned development gate

`lib/passkey-pilot-config.ts` accepts only all of:

* `NODE_ENV=development` and `HUSTLEN_PASSKEY_PILOT=owned-development-only`;
* explicit `HUSTLEN_PASSKEY_PILOT_ORIGIN=http://localhost:<port>`, canonical exact origin, no path/credentials or production hostname;
* matching `DATABASE_URL`, `TEST_DATABASE_URL` and `MRT_TEST_DATABASE_URL`;
* local `hustlen_test_*` database name and a 24-hex `MRT_TEST_RUN_ID`;
* the existing strict disposable connection policy, rejecting alternate hosts/databases/query options/PG driver overrides.

`lib/passkey-pilot.ts` inspects pg's configured target and queries the application's **actual database identity and ownership comment** before pilot data access. The name must match the configured target and marker must exactly equal `hustlen-mrt-test:<run id>`. The app's guarded Prisma binding uses the same validated connection URL. Checks run on each request/navigation; no cached ownership approval or browser-selected realm is accepted. These are ordinary owner-controlled safeguards, not protection against a malicious database owner who can alter code/markers/triggers.

`proxy.ts` refuses both pilot paths before rendering or pilot database access when development mode/explicit pilot flag is absent. This ensures production returns 404 even with an accidentally enabled flag, including the page that could otherwise stream not-found UI with HTTP 200. The server guard independently rejects production and invalid ownership/config. No production RP configuration exists. Flag-off development and flagged production are tested through actual Next servers, not only a predicate.

## Actual route and request contract

The factor-management endpoint is **`/api/auth/admin-passkeys`**. It lives with authentication routes because it manages the current account's factors, rather than domain administration. It still requires the unchanged `adminApi` legacy ACTIVE ADMIN check. Inside the cryptographic transaction, the server-selected `legacyAdminOnly` boundary rechecks and locks the current ACTIVE ADMIN user; a previously checked role cannot be trusted after demotion/suspension. The existing VERIFIED canonical StaffPerson/account association, current session incarnation, policy/authorization epoch and MFA version requirements remain in effect. No route creates those associations or accepts them from a body.

| Method/action | Accepted caller data | Server behavior |
| --- | --- | --- |
| GET | No query parameters/body parameters | Only own key UUID, enrollment/revocation time and device/backup metadata; no credential ID, public key, nonce or session/token hash. Reports DEVELOPMENT_PILOT, staffAuthorized=false, recoveryAvailable=false. |
| POST enrollment.begin | Current password, optional persisted assurance lookup ID | First enrollment password reauthentication; any historical key additionally requires real current assurance. |
| POST enrollment.finish | Challenge UUID, password, native registration response, optional assurance lookup ID | Real RP/origin/challenge/UV verification, immutable context and atomic key/version/audit write. |
| POST authentication.begin | Action only | Server-generated bound fresh challenge. |
| POST authentication.finish | Challenge UUID and native assertion | Real signature/UV/counter/replay checks; returns short-lived assurance lookup ID/expiry and staffAuthorized=false. |
| POST challenge.cancel | Own challenge UUID | Cancels only own exact-session pending challenge; cannot authorize anything. |
| POST credential.revoke | Own key UUID, current password and real assurance lookup ID | Revokes key, increments factor epoch and invalidates previous assurance; no password-only re-enrollment. |

All POSTs require exact configured Origin, exact Host, non-cross-site fetch context and `application/json`; missing/null/wrong origins fail. GET also rejects conflicting Origin/cross-site/Host and all query strings. Forwarded headers cannot set the RP. Existing proxy CSRF checks remain. Mutations use the existing 32 KiB streaming JSON bound and closed per-action keys, bounded UUID/password/base64 proof fields and allowlisted native response fields/extensions. Only benign `credProps.rk` is accepted; no arbitrary extension object is trusted. Client RP IDs, role/person mappings, risk/policy/version values, MFA booleans and assurance-state claims fail validation. An assurance UUID is only a server lookup, never proof by itself.

Current sessions come only from the existing HttpOnly SameSite=Lax cookie (Secure in production, where this pilot is blocked). No pilot token/cookie is issued. Batch 5A challenge expiry, persisted per-person budgets, counter/nonce atomicity, revocation, audit-failure rollback and logout/session-birth checks remain authoritative. Error responses contain generic bounded text; unexpected failures retain existing structured diagnostics without raw proofs/passwords/tokens. Cancellation failure is communicated; abandoned challenges expire within five minutes.

A first status read initializes the non-authorizing MFA version row. It does not enroll a key, create staff authority or grant anything. Initialization now uses atomic INSERT ON CONFLICT DO NOTHING: concurrent first reads previously exposed Prisma's empty-upsert create race. A dedicated four-way route test confirms a single version and four successful empty status reads.

## Reproduction, identity and cleanup

Use the existing isolated harness via `npm run test:mfa-pilot`, with a newly chosen local `MRT_TEST_DATABASE_URL` named `hustlen_test_*` that differs from the application database, and installed Chromium (`CHROMIUM_PATH`/`MRT_BROWSER_PATH`). Do not print connection URLs. The harness refuses an existing name, creates/marks its new database, applies migrations there, launches the actual Next development app with exact server-owned pilot configuration, and runs real login/native WebAuthn and HTTP security cases. It creates **synthetic fixtures only in that owned database**, not actual staff or Super Admins. Existing ADMIN alone does not satisfy the required verified association. Do not manufacture a verified human association in a real database to try the page.

`npm run test:mfa-pilot-disabled` proves development flag-off refusal. `npm run test:mfa-pilot-production` builds the actual app and starts it in production with the pilot flag enabled against its own disposable database; the routes/page stay 404, navigation omits Security and all six MFA tables remain empty. These runs drop only their own verified database/uploads. No migration/schema change is introduced by Batch 5B; all 23 existing migration files remain unchanged.

The automated pilot exits after evidence capture. There is no persistent production enrollment or staff-provisioning launcher in this batch. Manual hardware/browser trials must use a separately owned harness session with the same trusted bindings and disposable synthetic identities, never a real application database. Committed screenshots show virtual-authenticator acceptance; they do not certify physical hardware or mobile authenticator support.

Ignored `.test-artifacts/<run>` retain local server logs/screenshots/old clients for diagnosis. Avoid sharing raw traces, cookies or proof payloads; the committed evidence contains selected screenshots and bounded metadata. Retain immutable credential/proof/event rows for the life of the test and drop the owned database at cleanup; do not disable history triggers or delete existing application records. Production retention remains a separate blocker.

## Production prerequisites

Approve deployment RP/origins and HTTPS/ingress policy; canonical-human onboarding/assisted first enrollment; recovery and reviewer capacity; writer privilege isolation and append-only retention; compromised-factor/session and emergency handling; anti-CSRF/session renewal; native device/browser coverage; optional existing-Admin enrollment pilot and recovery drills. Only then separately approve enforcement across every legacy privileged entry point. Review a real scoped staff-session issuer and role cutover independently; do not replace current constraints or use ADMIN OR staffRole. Batch 4 approvals/execution stay disconnected. See the [recovery proposal](ASSISTED_PASSKEY_RECOVERY_PROPOSAL_BATCH_5B.md) and Batch 5A rollout gates.
