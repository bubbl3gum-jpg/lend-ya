# Batch 11E — Authenticated Password Change & Account Security UX

27 October 2026, Asia/Taipei. Stage 9 implemented **owned-development candidate**, not production release/security-policy approval.

## Exact revisions

- Branch: `feature/authenticated-password-change-batch-11e`.
- Clean 11D documentation baseline: `e9636b7c2150f17ed3952c41600fd6217eacd5d2`.
- Verified ancestors: 11D implementation `1866016dc5891cd90c9472e4ff8895024d275ea9`, closeout `d2fd4ce6ed85b4b6a6e1d68b2fba9820283365f7`.
- **Tested implementation: `b5bd093d5956175540525415609ca6d9a3484968`.**
- **Evidence closeout: `768b891166e2b65b14f8546c93035810eb029512`.**
- This final review/index commit changes documentation only and names the two preceding exact revisions.

## Functional result and candidate boundary

Account Settings has a real bilingual password form and `POST /api/account/password`. It requires a current persisted session, trusted eligible user, existing-password verification, established 8–128-character new-password validation, matching confirmation and a different new password. Existing salted scrypt/timing-safe verification is reused; passwords are neither trimmed nor translated. Unsupported payload fields and URL selectors are rejected. The existing bounded streaming JSON reader is reused, with exact JSON content type, mandatory configured Origin/request origin/custom header and cross-site refusal. No browser actor, role, staff identity or assurance is trusted.

The operation works only in explicitly configured development, on a verified newly owned disposable database with matching harness identity, exact localhost origin and trusted-user allowlist. Production POST remains **404 even with the flag configured**, and the form is absent. The candidate permits ordinary USER accounts in ACTIVE or SUSPENDED state; Admin, staff-associated and ChatReviewer accounts are excluded pending privileged-account/MFA policy. It does not restore suspended authority or alter rental/return/Support obligations. This is a reviewable candidate policy, not production approval.

A persisted per-account limit allows five authenticated attempts per 15 minutes, with an atomic capped counter, database expiry, no forwarded-IP trust and no unrelated global cleanup. Missing/invalid counter storage fails closed. Existing login/register limits are unchanged. Production ingress/abuse and password-strength policy still need review.

## Credential and session protocol

The audit found a real baseline race: login verified a password before separately minting its session. A pending old-password login could otherwise issue a fresh session after password-change revocation. Both ordinary login and the owned Support worker now compare the exact **server-verified credential snapshot** under the same transaction advisory lock used by password change. Login-first is subsequently revoked; password-first makes a stale verified login fail. Registration remains its existing atomic unique-user/session creation. No alternate authentication system or broader staff permission is introduced.

After existing-password verification and scrypt derivation, the password service locks the user/current session, rechecks database-clock expiry **after lock acquisition**, eligibility and exact verified hash, then performs a credential CAS update, all-session deletion and immutable security-event insert in one transaction. A remaining-session check prevents silent partial revocation. Credential, revocation or event failure rolls back the mutation; the independent attempt counter remains counted. All prior sessions—including current and other device—are invalidated. Old password fails, new password works through the real login endpoint. A fresh session does not inherit old MFA assurance.

The new additive migration `20261027090000_account_password_security_event` creates only AccountSecurityEvent: server UUID, trusted actor FK, fixed PASSWORD_CHANGED action, positive revoked-session count and database timestamp. UPDATE/DELETE/TRUNCATE triggers reject changes. No passwords, hashes, cookies, bodies or arbitrary request JSON enter events. A database owner can alter schema; production principal/audit-retention and erasure responsibilities remain release gates. Existing histories and schema blocks remain unchanged except the additive User relation.

This prevents stale session issuance and denies subsequent protected authentication. It does **not** retroactively cancel every request already authorized before commit; broader mid-request authorization cutover is a separate review. Existing corrected meetup polling/session-loss protections remain unchanged and rerun.

## Account experience

The form has labeled current/new/confirmation password fields, native masking/autocomplete, localized validation and real server errors, loading/disabled states and duplicate-submit protection. It adds no discovery particles/audio to credentials. Language/theme changes preserve entered drafts; every real attempt clears password fields afterward. Success is shown only after confirmed server commit. Ambiguous failures advise genuine sign-in rather than falsely claiming the old password still works.

After revocation, stale email/status is hidden and display-name Save is disabled. The unrelated name draft stays **read-only, keyboard-focusable/selectable**, so users can copy it before choosing the full-document sign-in link. The ordinary display-name form retains its old behavior outside this state. The browser test performs real fresh sign-in with the new password, then verifies a real expired mounted password form returns 401 and clears credentials.

There are 18 new English/Traditional Chinese pairs (221 total), retaining exact en/zh-TW preferences and fallback, Light/Dark/System, default-OFF sound, independent effects and the provisional agricultural material/typography system. Password values are never localization identifiers. No show/hide control, password recovery, email link, notification, identity reassociation or mandatory MFA is activated. The UI explicitly states no notification was sent.

## Review package

| Deliverable | Evidence |
| --- | --- |
| Complete changed-file inventory | [CHANGED_FILES.md](batch11e/CHANGED_FILES.md) |
| Existing architecture and explicit candidate policy | [SECURITY_ARCHITECTURE_AND_POLICY.md](batch11e/SECURITY_ARCHITECTURE_AND_POLICY.md) |
| Service / endpoint / UI | [service](../../lib/password-change/service.ts), [endpoint](../../app/api/account/password/route.ts), [form](../../components/password-change.tsx) |
| Atomic lifecycle, negative authorization and real browser proof | [password-browser.json](batch11e/password-browser.json), [test source](../../tests/password-change.integration.test.ts) |
| Production refusal | [production-refusal.json](batch11e/production-refusal.json) |
| Migration and populated-history preservation | [migration-preservation.json](batch11e/migration-preservation.json), [migration test](../../tests/password-change-migration.test.ts) |
| Translation additions | [TRANSLATION_ADDITIONS.md](batch11e/TRANSLATION_ADDITIONS.md) |
| 18 responsive and interactive screenshots | [SCREENSHOTS.md](batch11e/SCREENSHOTS.md) |
| Exact commands/results and initial outcomes | [SETUP_AND_TEST_SCOPE.md](batch11e/SETUP_AND_TEST_SCOPE.md), [regression-ledger.json](batch11e/regression-ledger.json), [INITIAL_FAILURES.md](batch11e/INITIAL_FAILURES.md), [initial-outcomes.json](batch11e/initial-outcomes.json) |
| Source/history preservation and cleanup | [source-preservation.json](batch11e/source-preservation.json), [cleanup.json](batch11e/cleanup.json) |
| Recovery proposal and Stage 9 assessment | [RECOVERY_AND_STAGE_9_ASSESSMENT.md](batch11e/RECOVERY_AND_STAGE_9_ASSESSMENT.md), [canonical roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) |

## Actual verification and limits

**31/31 selected command groups passed their final executions; 97/97 unit tests passed.** Final TypeScript, lint, Prisma validation and production build exited 0. Coverage includes account/localization/home/heritage/discovery; password candidate/production/migration; original integration; meetup-session; full camera meetup; login readiness/navigation; Admin/Workbench; rental API/browser; chat/moderation; Support channels/staff; authorization/staff sessions/MFA; approval/database principals; announcements/settings/Locations; MVP security and build. The ledger gives exact scripts, UTC timestamps, artifact IDs and cleanup results. This is selected verification, not every repository script or independent security sign-off.

Password tests cover successful change, wrong current password, invalid/mismatched/new-equals-current values, malformed/oversized/unknown payloads, forged body/query actors, missing/wrong Origin/custom header, unauthorized/expired sessions, real expiry while waiting for a lock, suspended behavior, privileged-role exclusion, persistent limits and missing counter storage, two independent sessions, stale verified login ordering, concurrent one-winner changes, credential/audit/delete failure and **one-of-two-session silent deletion failure** rollback, event immutability, unchanged unrelated account, bilingual errors/success, real pending controls/duplicate submit, real new-password browser login, retained copyable name draft and absence of credentials in application logs/event/browser storage. Password text necessarily exists in input/React memory while typing; no guaranteed memory-wipe or password-manager control is claimed.

Fresh migration replay passed. The populated 28→29 upgrade preserved historical users, sessions, bookings, listings/stations, reviewer grants and immutable Admin records; an injected obstruction rolled back its partial migration, and clean deployment/replay preserved checksums/rows. Historical migration bytes remain unchanged. No existing application database was reset, migrated, seeded or edited. Final read-only maintenance checks found **zero Batch 11E databases and zero owned test principals**.

Full `test:meetup` passed **11/11**, with genuine virtual-camera pickup and return decoding and real verified bookings ([pickup](batch11e/camera-pickup.json), [return](batch11e/camera-return.json)). No camera/GPS/QR/consent/evidence/custody requirement or existing assertion deadline was relaxed. Main browser errors must remain empty except narrowly asserted real wrong-current 400 and expired-session 401. Shared collection is unchanged.

Initial attempts were not all green: the new alert selector also matched the framework announcer; lint/type declarations needed correction; keyboard-copy acceptance found a disabled input; a lock-wait observer used cached PostgreSQL statistics, and one failed automated patch caused a repeat using the old observer. These are retained separately. Fresh corrected verification passes without deadline increases or clock mocks. The prior **R1 overlapping-workload login timing issue remains unresolved**; quiet readiness does not prove root-cause closure.

## Production blockers and stopping point

Production activation needs independent security/product approval of password/account/MFA policy, narrowly reviewed database principal privileges/advisory-lock execution, password-strength and ingress limits/outage behavior, audit access/retention/erasure and notification ownership/delivery. Admin/staff/reviewer changes remain unavailable. Recovery is a distinct approved-token/delivery workflow, still unimplemented; the existing forgot-password stub remains a stub. Physical devices, Safari, screen readers/zoom/full contrast review, production performance and owner language/visual acceptance also remain open.

Stage 9 remains **In Progress**, not Production Ready. Recommend independent security review and accessibility closure before further rollout or separate recovery implementation; do not begin Stage 10 AI. Original 14-stage order/objectives and Stage 6/7/8 blocker sections are preserved. No staff activation, Support production messaging, station/policy changes, custody overrides, financial controls, high-risk execution or AI was introduced. Nothing was merged, pushed or deployed.
