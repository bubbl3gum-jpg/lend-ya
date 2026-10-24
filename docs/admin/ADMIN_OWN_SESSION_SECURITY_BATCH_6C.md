# Admin own-session security overview — Batch 6C

24 October 2026 (Asia/Taipei). Baseline: clean `fix/login-navigation-staff-rollout-readiness-batch-6b`, **d9bac9c0d6f5d867ba2a365874b9e3ea64246e62**, whose parent is the reviewed Batch 6A **ff7b2b6fc9e859e7d34851fb4a5c03aac67b01a9**. Isolated branch: **feature/admin-own-session-security-overview-batch-6c**. The final commit SHA is supplied in closeout; this report belongs to that commit.

## Delivered interface

Existing authorized ACTIVE legacy Admins can open **System → Security overview**, `/admin/account-security`. It shows the current authentication snapshot, persisted creation/expiration time in explicitly labelled UTC, and a read-only reload link. It distinguishes legacy Admin sign-in, optional passkey verification and future staff authorization. No device identity, location, verified-human assertion, credential count or MFA success is invented.

Passkey status is **UNAVAILABLE**, not “unenrolled” or “unverified”: this production-safe projection does not query the pilot's credential/assurance records. It cannot establish either positive or negative factor state. This remains accurate even if a factor exists elsewhere. There are no enrollment/assertion/revocation/recovery controls or mandatory-MFA policy here. The development-only `/admin/security` navigation entry is labelled **Passkey pilot**, and keeps its independent availability check. Its page/API/proxy production refusal is unchanged.

[Desktop screenshot](../security/batch6c/own-session-desktop.png) · [Tablet screenshot](../security/batch6c/own-session-tablet.png) · [Mobile screenshot](../security/batch6c/own-session-mobile.png). These are actual Chromium application captures with disposable fixture identities. Tablet/mobile navigation is expanded to show the active route. Native details/summary, skip-to-main focus, semantic headings/description lists and `<time dateTime>` are preserved; tests verify keyboard focus and no horizontal document overflow.

## Trusted read and exact projection

`lib/admin/own-session.ts` is server-only and accepts **no arguments**. It reads the current HttpOnly session cookie with Next's request-context `cookies()`, hashes it server-side and looks up only that AuthSession. Prisma SELECT includes only `createdAt`, `expiresAt` and the owning User's `role`/`accountStatus`. A missing/deleted/expired session denies 401; anything other than ACTIVE legacy ADMIN denies 403. No client role, user/session ID, assurance, credential, staff membership or capability is trusted. There is no staff-role fallback or policy activation.

`GET /api/admin/account-security` returns exactly:

```json
{
  "status": "AUTHENTICATED",
  "createdAt": "<persisted ISO-8601 creation time>",
  "expiresAt": "<persisted ISO-8601 expiration time>",
  "passkeyStatus": "UNAVAILABLE"
}
```

No identifiers, token/hash, email, credentials, assurance proof or foreign-session records appear in this DTO. Query selectors are rejected with 400 after authentication; the page never uses query parameters to choose a subject. Switching between two independently authenticated Admins returns their own timestamps without shared state/cache reuse. The page retains `requireAdminPage()` and independently uses the same current-session projection. Layout's existing legacy guard and logout are preserved.

The new service performs no write, renewal, session deletion or audit/provisioning action. It validates at request time; the UI explicitly says the status is a snapshot and does not extend the session. Existing shared `getCurrentUser()` may clean up an expired row when the existing page/layout guard runs; that pre-existing behavior is unchanged. AuthSession has no suspension field: the suspended-session test suspends the owning User and checks denial.

API success/denials/errors explicitly use `Cache-Control: private, no-store` and `Vary: Cookie`. The new page is dynamic and included in proxy's no-store matcher. Actual production HTML is checked for `private` and `no-store`. Next owns HTML cache/Vary headers: installed `base-server.js` replaces development HTML Cache-Control with `no-store` and supplies RSC variation keys instead of Cookie. Tests distinguish that documented framework behavior from API headers and production HTML; no-store prohibits retaining the response regardless. No application cache or client security-state store is introduced. Unsupported POST is 405; existing cross-origin mutation protection remains 403. Database failures retain generic responses and existing bounded operational logging.

## Product decision captured, runtime unchanged

Product explicitly approved **Operations `listings.read` for exactly granted listing IDs**, restricted to **id, status, category, adminRestricted**, under **authenticated and audited access**. The approval is recorded in `ADMIN_PERMISSION_MATRIX.md`, an explicit current-decision overlay in `ADMIN_CAPABILITY_MATRIX_BATCH_2B.md` and the first-Operations onboarding register. It does not approve universal listings access, other roles, grant provisioning or runtime activation. The historical shadow capability contract is unchanged; its old “proposed” metadata is not silently converted into a runtime grant.

The historical 21-route authorization inventory and hashes remain untouched. `ADMIN_ENTRYPOINTS_BATCH_6C.json` adds the new GET with its precise server guard and reviewed source hash. The inventory test includes this supplement while continuing to verify every historical hash and forbid shadow-policy imports into application Admin code.

## Actual browser and security results

Three distinct fresh, owned disposable databases completed the new suite **6/6 each**, including parent test counts. Each run performs actual native-browser Admin login, exact `/admin` redirect, navigation to the overview, reload, minimal API check, logout and denied overview access in three fresh contexts: desktop 1440×1000, tablet 834×1112 and mobile 390×844. This is **nine browser sign-ins across three databases**, not physical-device certification. Batch 6B's separate 7-test navigation suite covers normal users, legacy Admins, logout/new session, registration, wrong-password correction and six additional fresh contexts. The existing chat browser flow is also run.

The new suite verifies exact persisted timestamps/four-key DTO; other-Admin cache separation and foreign canaries absent; forged selector rejection; anonymous/ordinary/expired/deleted/suspended denial; no changes to current session dates/count from valid reads; no staff/MFA/approval records created; method/CSRF/pilot refusal; active navigation, keyboard focus and responsive layout. Bounded login metadata captures paths/status/timing and cookie presence/HttpOnly flags only; no raw token/hash, passwords, email, headers or response body is retained in evidence.

The original five-second login URL assertions and Batch 6B document-navigation fix are unchanged. Existing bounded anonymous route readiness probes precede measured browser logins, keeping Next development compilation outside the login deadline. A finite set of passes proves these measured conditions only, not all production cold-start/device/network behavior.

## Initial failures and remaining test reliability

All initial outcomes are retained separately in [verification.json](../security/batch6c/verification.json) and [bounded diagnoses](../security/batch6c/initial-failure-diagnoses.json):

- Two early overview runs failed HTML header assumptions (3/6 each); browser checks passed. Installed Next development HTML uses no-store and framework RSC Vary, unlike the API's explicit private/no-store and Cookie variation. The harness now asserts the correct environment-specific headers, with private/no-store independently required on the actual production server. No production cache requirement or test deadline was relaxed.
- Initial unit inventory and Admin navigation checks rejected the new endpoint/link. Their allowlists were extended explicitly; all original route hashes, links and checks remain.
- The unchanged execution-rehearsal deadlock test reported 16/18 because PostgreSQL chose the peer transaction as the deadlock victim (40P01). One fresh owned recheck passed 18/18. This fixture intermittence remains; no approval executor or deadlock assertion was changed to make it pass.
- A subsequent Admin run timed out at its existing 12-second initial `page.goto(/login)` before credentials, under concurrent suite load. This does not demonstrate a successful-login/session failure. The timeout was not increased. A fresh serial recheck passed 7/7.
- The concurrent rental-browser run observed a detached DOM element during post-restart image inspection, followed by its existing 120-second parent timeout/cancellations. Rental/evidence implementation and that suite were left unchanged. A fresh serial recheck passed 4/4; the initial failure remains recorded.

## Verification ledger

| Command | Reported tests | Selected final result |
| --- | ---: | --- |
| `npx tsc --noEmit` | — | Pass, exit 0 |
| `npm run lint` | — | Pass, exit 0 |
| `npm run test:unit` | 60 | Pass, exit 0 |
| `npx prisma validate --config prisma7.config.ts` | — | Pass, exit 0 |
| `npm run build:verify` | — | Pass; owned DB removed |
| `npm run test:admin-migration` | 1 | Pass; owned DB removed |
| `npm run test:admin-own-session` | 6 | Pass; owned DB removed |
| `npm run test:admin` | 7 | Pass; owned DB removed |
| `npm run test:approval-migration` | 4 | Pass; owned DB removed |
| `npm run test:approval` | 18 | Pass; owned DB removed |
| `npm run test:authorization` | 8 | Pass; owned DB removed |
| `npm run test:chat` | 14 | Pass; owned DB removed |
| `npm run test:database-principals` | 7 | Pass; owned DB removed |
| `npm run test:execution-rehearsal` | 18 | Pass; owned DB removed |
| `npm run test:login-navigation` | 7 | Pass; owned DB removed |
| `npm run test:login-readiness` | 1 | Pass; owned DB removed |
| `npm run test:meetup-migration` | 1 | Pass; owned DB removed |
| `npm run test:meetup` | 9 | Pass; owned DB removed |
| `npm run test:mfa-migration` | 4 | Pass; owned DB removed |
| `npm run test:mfa-pilot-disabled` | 1 | Pass; owned DB removed |
| `npm run test:mfa-pilot-production` | 1 | Pass; owned DB removed |
| `npm run test:mfa-pilot` | 13 | Pass; owned DB removed |
| `npm run test:mfa` | 16 | Pass; owned DB removed |
| `npm run test:migration` | — | Pass; owned DB removed |
| `npm run test:moderation` | 10 | Pass; owned DB removed |
| `npm run test:rental-api` | 13 | Pass; owned DB removed |
| `npm run test:rental-browser` | 4 | Pass; owned DB removed |
| `npm run test:scoped-reads` | 10 | Pass; owned DB removed |
| `npm run test:stability` | 8 | Pass; owned DB removed |
| `npm run test:staff-migration` | 4 | Pass; owned DB removed |
| `npm run test:staff-read-pilot` | 14 | Pass; owned DB removed |
| `npm run test:staff-schema` | 8 | Pass; owned DB removed |
| `npm run test:staff-session-migration` | 4 | Pass; owned DB removed |
| `npm run test:staff-session` | 13 | Pass; owned DB removed |

The ledger counts each selected final command once, including Node parent tests. Extra overview repetitions and every recorded initial failure are listed separately, not blended into a misleading aggregate. The existing MRT migration program and build have no Node test count. Commands use the verified effective-target and ownership harness with new `hustlen_test_b6c_*` databases. The wrapper's exit is not treated as the child result: actual child exit, artifact ID and cleanup were checked.

To reproduce, provide a **new unused** validated `MRT_TEST_DATABASE_URL` distinct from the real application's URL and run `npm run test:admin-own-session`. Use another new target for each repeat and for every table command. The harness creates/verifies a run marker before changes, applies forward migrations and removes the owned DB/uploads/principals. Browser paths can be supplied through `MRT_BROWSER_PATH` / `CHROMIUM_PATH`. No application database is reset, migrated, seeded or modified. Ignored `.test-artifacts/<runid>` retain local diagnostics; selected bounded evidence is committed here.

## Preservation and remaining activation prerequisites

[Baseline hashes](../security/batch6c/baseline-preservation.json) verify the 23 historical migration SQL files, Prisma schema, lockfile, legacy Admin pages/APIs/guards, legacy authorization inventory, staff policy/MFA/read implementations, existing login document-navigation fix and logout behavior. The only proxy change adds the new page to no-store matching; pilot refusal logic is byte-for-byte unchanged. No new migration, production secret, staff identity, membership or grant is introduced. Fresh/populated migration suites preserve historical users, sessions, reviewers, audit and booking/evidence records; current bounded upgrade results are retained alongside the test ledger. [Cleanup](../security/batch6c/cleanup.json) records a read-only catalog check after tests.

The narrow Operations listing-read policy is now approved. Real activation still requires:

1. Product-approved canonical human proofing, independent sponsor/reviewer and alias/conflict policy, actual cohort/resources/purpose, bounded membership/grant/proof/session lifetimes, assisted recovery, retention and exact production RP/origins/environment. No small-team/self-approval exception is selected here.
2. Genuine web/worker process, UID, filesystem/secret, authenticated transport and restricted DB principal isolation, with rotation that terminates existing pools/sessions. Shared-user development credentials are insufficient; follow [deployment requirements](STAFF_DEPLOYMENT_BOUNDARY_BATCH_6B.md).
3. A separately reviewed trusted **real** session issuer/scoped access layer: valid current AuthSession incarnation → verified human/association → eligible bounded membership → real fresh WebAuthn → exact grant → current Listing → atomic immutable audit before response. No DRAFT/PENDING/shadow/test fallback or legacy ADMIN promotion.
4. A separately approved **exact forward activation migration**, recorded path/git SHA/SQL hash and policy version, fresh/populated replay and negative/race tests. None exists in Batch 6C. Do not remove ACTIVE/grant/binding/audit-success constraints or enable APPROVE/APPROVED/EXECUTED as a side effect.
5. Independent review of physical-device coverage, offboarding/version invalidation, outage/audit failure, legacy-route separation and rollback retaining immutable history; execute the [controlled rollout checklist](CONTROLLED_STAFF_READ_ROLLOUT_BATCH_6B.md) only after separate approval.

Exact changed-file inventory: [changed-files.txt](../security/batch6c/changed-files.txt). No mandatory MFA, recovery implementation, real staff provisioning, operational mutation, approval execution, custody/evidence change, AI administration, merge, push or deployment occurred. Stop at the isolated review commit.
