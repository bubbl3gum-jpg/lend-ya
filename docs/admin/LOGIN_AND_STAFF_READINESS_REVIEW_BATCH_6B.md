# Login reliability and first staff rollout readiness — Batch 6B review

24 October 2026 (Asia/Taipei). Clean Batch 6A starting branch: `feature/scoped-staff-listing-read-pilot-batch-6a`, exact final commit **ff7b2b6fc9e859e7d34851fb4a5c03aac67b01a9**. Baseline working tree was clean. Isolated implementation branch: **fix/login-navigation-staff-rollout-readiness-batch-6b**, directly descended from that commit. Final SHA is supplied in the commit closeout; this document is part of that commit.

## Outcome and bounded diagnosis

`components/auth-form.tsx` previously issued `router.push(target)` then `router.refresh()` without a navigation completion boundary, and re-enabled the form in `finally`. A controlled browser experiment on the original implementation held only destination RSC requests: login POST returned 200, actual HttpOnly session and `/api/auth/me` authentication succeeded, but the page remained `/login` beyond the unchanged five-second assertion. The diagnostic shows the destination request was RSC, with no committed document navigation. [Original controlled diagnostic](../security/batch6b/baseline-controlled.json).

The demonstrated cause is dependence on an uncompleted RSC transition at the authentication boundary. This does **not** prove that every historical timeout was caused by push/refresh cancellation, stale cookies or a database lock. The installed Next.js router documentation makes no promise that these calls await each other. End-of-attempt zero-lock samples also cannot exclude earlier contention.

The form now performs one `window.location.replace()` to the existing literal `/admin` or `/dashboard` destination after successful authentication. The next document renders against the newly established server session without relying on an old client RSC transition or an immediate refresh of the current route. Successful forms remain disabled until unload; error paths show their existing error and restore controls. Registration uses the same boundary. No automatic retry, configurable redirect, auth API, password, session/cookie policy or authorization guard was added or changed. The hydration readiness protection is retained.

Holding destination RSC transport now permits exact document navigation and authenticated server rendering; three independently owned runs passed. [Fixed controlled evidence](../security/batch6b/navigation-1-login-navigation-controlled.json). Both normal and legacy Admin targets, reload persistence, logout/session replacement, explicit correction after wrong password, registration and six fresh-context rapid submissions are exercised by `tests/login-navigation.integration.test.ts`. No broader staff authority follows from login or MFA.

## Failures retained separately from final passes

The first stricter fixed-navigation run reported **5/7 pass** (parent plus controlled case failed). The first full chat run reported **12/14 pass** (parent plus browser case failed). These are actual failures and remain in [verification.json](../security/batch6b/verification.json); they are not counted as positive passes or concealed by retries.

The chat diagnostic distinguishes this failure from the original RSC stall: login POST 200 at 8359ms, **document GET `/dashboard` at 8364ms**, but no destination response before the original assertion expired. The server was compiling the cold destination under concurrent suite load. Cookie was present/HttpOnly, while browser evaluation failed during pending navigation. [Cold-run diagnostic](../security/batch6b/chat-initial-cold.json). The observed delay is compatible with development compilation/load; this is not evidence of missing authentication or proof of a universal cause.

The browser harness now completes bounded anonymous `/login`, `/dashboard`, `/admin` readiness probes before timed navigation, records timings/statuses, and fails setup on unexpected status. Each has a 20-second setup bound; there are no credentials or login/navigation retries. Next development compiles destinations on demand. The five-second login assertion is unchanged. Explicit `click({noWaitAfter:true})` prevents Playwright's longer native-navigation auto-wait from hiding delay before the assertion starts. The delayed-JavaScript readiness regression also retains its original assertion and now measures this native boundary explicitly.

Consequently, the final passes demonstrate authentication navigation **after development route readiness**, not cold-start availability within five seconds or universal browser reliability. Production cold-start/device/network behavior still requires deployment-level testing. There is no new product timeout/retry mechanism masking the initial failures.

## Repeated real browser evidence

| Cohort | Distinct owned databases | Actual final outcome |
| --- | ---: | --- |
| New navigation suite | 3 | 7/7 each; exact normal/Admin redirects, authenticated reload, logout/new session, wrong-password recovery, registration, six fresh contexts each |
| Existing full chat suite | 3 | 14/14 each; normal/borrower/legacy Admin browser login plus real chat/review/report/block flows and restart persistence |
| Delayed hydration regression | 1 | 1/1, including fresh-context submissions |

Counters include Node parent tests. Each repeated navigation suite performs 12 successful authentication submissions, plus one deliberately rejected wrong-password attempt; six alternating USER/ADMIN contexts are independent. The three runs therefore demonstrate 36 successful auth submissions, not 36 independent databases or physical devices. No production account is used. Bounded metadata retains cookie presence/flags and safe path/status/timing only, never cookie values, credentials, message bodies or query strings. `verification.json` records exact times, IDs and cleanup. Readiness probes and representative normal/Admin/logout/chat diagnostics are committed beside it.

## Staff read review and preservation

The complete app → private worker → real WebAuthn → scoped Listing → atomic audit chain was reviewed against the Batch 6A architecture and tests. Its **14/14 regression** passed; `staff-read-evidence.json` confirms exactly `id`, `status`, `category`, `adminRestricted`, real signed WebAuthn, synthetic identities only, four committed fixture read events and retained activation constraints. Scope/owner-alias checks precede selection; grant/identity/session/proof/version checks, locks, final expiry checks and immutable audit share a transaction. COMMIT precedes returned buffered data. Audit fault, revoked/expired grant or proof, privilege forgery, lock timeout and worker outage deny without an unauthorized response. Actual production and disabled servers return 404 for pilot page/API. No confirmed defect required staff-read code changes.

The fixture's DRAFT public references do not authorize real reads; only the expressly synthetic owned-fixture chain works. Real PENDING bindings remain non-authorizing. No broad legacy Admin helper is used to satisfy exact listing scope. [Deployment review](STAFF_DEPLOYMENT_BOUNDARY_BATCH_6B.md) gives source references and the actual production blockers.

All **23 historical migration SQL files**, Prisma schema, lockfile, authorization library, staff-read implementation, Admin pages/APIs, development APIs and proxy compare byte-for-byte against the baseline in [preservation evidence](../security/batch6b/baseline-preservation.json). No migration was added. Actual fresh/populated migration suites, existing Admin/moderation/session/approval suites and runtime principal tests passed. No ACTIVE member/grant, approval execution, real staff or mandatory MFA was enabled. Temporary GPS/QR/camera/evidence rules, station data and custody logic are unchanged. Meetup's synthetic-camera acceptance passed 9/9 in its complete suite; finite success does not eliminate previously observed intermittence.

## Verification

All changing tests ran through the existing effective-target/ownership harness, using newly created `hustlen_test_b6b_*` databases distinct from the application's database, with matching run markers before changing operations. Only a read-only maintenance catalog check follows cleanup. Local production build/start and migration tests used those fresh fixtures. The wrapper's own exit is not the test result: every child exit and cleanup was inspected. No existing application database was reset, migrated, seeded or modified.

| Command | Reported tests | Selected final result |
| --- | ---: | --- |
| `npx tsc --noEmit` | — | Pass (exit 0) |
| `npm run lint` | — | Pass (exit 0) |
| `npm run test:unit` | 60 | Pass (exit 0) |
| `npx prisma validate --config prisma7.config.ts` | — | Pass (exit 0) |
| `npm run build:verify` | — | Pass; owned DB removed |
| `npm run test:admin-migration` | 1 | Pass; owned DB removed |
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

`test:migration` is the existing MRT migration program and reports no Node test count; it exited 0. `build:verify` likewise exited 0, including the production compilation. Selected final ledger counts each command once; extra browser repetitions and initial failures are recorded separately, not added to a misleading aggregate. [Cleanup](../security/batch6b/cleanup.json) confirms zero remaining Batch 6B databases and zero owned Batch 5C/6A fixture principals.

Reproduce with `npm run test:login-navigation`, `npm run test:chat` and the table's commands, providing a **new**, validated, unused `MRT_TEST_DATABASE_URL` under the existing ownership harness for each changing run; never reuse an application URL or point the pilot at production. The isolated runner creates ownership markers, applies the fixture's forward migrations and removes the database/uploads/principals. Use `CHROMIUM_PATH` / `MRT_BROWSER_PATH` for an installed supported Chromium when needed. Repeat three separate runs and retain all outcomes, not just the last success. Tests produce ignored `.test-artifacts/<runid>`; this commit includes only selected bounded metadata.

## Changed files and operational readiness

Exact inventory: [changed-files.txt](../security/batch6b/changed-files.txt). Application change is limited to the auth form. Test changes add explicit document-navigation timing, safe diagnostics, anonymous route readiness and isolated launcher support. There are no dependency updates, new permissions, screens or database changes.

Future production requirements and decisions are concrete review artifacts:

- [Worker/database deployment boundary](STAFF_DEPLOYMENT_BOUNDARY_BATCH_6B.md): separate OS/runtime identities, filesystem/secrets, authenticated IPC, narrowly restricted DB principals, audit integrity, pool/session-aware rotation and fail-closed monitoring/recovery. The current same-UID/operator-file situation is not genuine isolation.
- [First Operations onboarding register](FIRST_OPERATIONS_ONBOARDING_BATCH_6B.md): identity authority, independent sponsor/reviewer, exact role/resource scope, passkeys/recovery, lifetimes, retention and production origins are all explicitly pending product approval. No defaults were chosen.
- [Controlled real read rollout checklist](CONTROLLED_STAFF_READ_ROLLOUT_BATCH_6B.md): real issuer, independent onboarding, scope/transaction/revocation tests, legacy separation and rollback preserving history. **The exact reviewed activation migration does not exist yet.** Its path/git SHA/SQL hash and independent approval are required gates; this batch cannot honestly name an approved artifact or silently remove activation constraints.

Recommended next user-visible Admin feature: an **own-session security summary for existing Admins**, showing the current session's issue/expiry time and accurate non-enforcing passkey status through existing guards. Keep token hashes, other users' sessions, role controls and fabricated device identity out of the DTO. Obtain product approval for scope before implementing it. This can improve visible security understanding while real Operations activation remains blocked by policy, issuer, migration and infrastructure work.

No merge, push, deployment, real staff provisioning or production configuration occurred. This branch is committed for independent review only.
