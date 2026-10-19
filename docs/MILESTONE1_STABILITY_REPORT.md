# Hustlen’ — Milestone 1 core verification and stabilization

Date: 19 October 2026 (Asia/Taipei). Repository: `bubbl3gum-jpg/lend-ya`.
Base: `integration/hustlen-mrt-complete`, commit `b702a44d83b37679e08955f4b897273d24b11071`.
Review feature branch: `fix/milestone1-core-stability`. Prepared for commit and publication of this feature branch for review. Neither base branch is a merge target in this task; no deployment or existing-database migration is authorized.

## Decision

The selected local rental MVP and the implemented stabilization fixes passed all final checks listed below. There are no remaining environment blockers in this run. Public/private-messaging readiness remains conditional on the explicit policy and privacy decisions below.

This milestone repairs reproducible reliability/security gaps. It does not implement chat, QR, payments, AI moderation, mobile applications or visual redesign. Handoff/no-show and report-enforcement policies were deliberately left unchanged. The test environment and development instances support executable checks; production scale, native clients, the user's Mac database and cloud snapshot restoration are not certified by these tests.

## 1. Environment, isolation and baseline

The former blocker was a proxy denial of Prisma's verified engine/checksum download and Google Fonts. Those destinations are now reachable under the existing allowlist. The exact Prisma checksum URL returned HTTP 200; the Google Fonts host accepted the connection (its bare root returns HTTP 404, not a proxy denial). `npx prisma generate --config prisma7.config.ts` succeeded with Prisma Client 7.10.0. No network restriction, TLS verification, checksum check or environment security setting was bypassed or changed during this milestone.

Runtime: Node 24.19.0, npm 11.9.0, PostgreSQL 17 via existing Docker Compose, system Chromium 154 through Playwright, installed ffprobe. Dependencies were already installed from the selected branch lockfile in the preceding audit. No dependency versions or lockfiles changed here.

Every database-changing test used the repository's `tests/run-isolated.ts`, a new non-existing local `hustlen_test_m1_*` database, the run ownership marker and the explicit `MRT_TEST_DATABASE_URL`. The runner substitutes the same owned database into application/test variables, and verifies ownership before teardown. All fault-injection triggers and fixture writes were confined to those databases. No command migrated, seeded, reset, truncated or otherwise mutated `p2p_marketplace`; no Mac or live database was accessed. No migration checksum or historical migration file was changed.

All original baseline suites passed once prerequisites were supplied. One initial `test:mvp` invocation had **9 passing results and 2 failed runner results** (the production-cookie subtest plus parent): it attempted `next start` without a production build. Server log confirms “Could not find a production build.” An isolated `build:verify` succeeded, then the unchanged MVP suite passed **11/11**. The runner now builds against its owned database before the MVP suite, so it no longer relies on a hidden prior build. This initial failure is retained in the evidence, not counted as an application security regression.

Baseline evidence: baseline results (onboarding workspace evidence), MVP rerun after build (onboarding workspace evidence), initial MVP server log (onboarding workspace evidence).

## 2. Full updated functionality matrix

The evidence column names executed suites, not merely existing test files. Suite outcome/counts are in section 3. “Partial” distinguishes intentionally absent capabilities from a failing implemented path.

| System | Implemented UI/API/database behavior | Executed verification | Remaining limitation |
|---|---|---|---|
| Registration/login | Forms → auth APIs → salted scrypt user credentials, hashed opaque session records, HttpOnly cookie; API forces USER | MVP, admin, rental API, browser suites | Email ownership/recovery/MFA absent; per-email throttle remains susceptible to targeted exhaustion |
| Sessions/logout/expiry | Current persisted user/expiry checked; per-session logout; Secure cookie in production | MVP production restart, expired/forged session tests | No native token protocol or device/session UI |
| Account settings/roles | Name editing; DB-derived role/status; Owner/Borrower derived from booking participants | MVP account/browser and authorization tests | Settings limited to name; verification badge workflow absent |
| Listing creation | Multipart physical-item category/details, valid photo, eligible MRT stations → Listing/Media/Station links | MRT, MVP desktop/tablet/mobile creation and API upload cases | Optional video requires ffprobe; no production object storage |
| Listing editing/deletion | Owner metadata, price/deposit/category/station/status edit; history/admin protections on delete | MVP editing, ownership, photo eligibility and visibility checks; rental history tests | Replacing existing media absent; successful delete leaves file cleanup work |
| Categories/media | Validated physical categories; sharp decoding/re-encoding/limits; ffprobe video container validation; private media endpoint and legacy rewrite | MVP image/video, malformed/oversized uploads, current visibility/legacy/orphan handling | Local disk backup/multi-instance durability needs design |
| Browsing/search/availability | Active eligible catalogue; client text/category/station/status filters; backend date conflict rejection | MVP browser filters/responsive layouts; booking API conflict tests | No paginated/date-window API; availability badge is not a calendar |
| MRT map/stations | 120 physical locations/136 codes, bilingual map/search, owner multi-select, borrower single confirmation | Unit inventory; MRT actual UI, mobile touch/zoom/reset, full-form/station-only races | Dataset is a dated snapshot, no exits/live operating service |
| Quotation/dates/prices | Taipei time, positive future interval ≤90 days, billable-day rounding, authoritative Decimal quote and stored price/deposit snapshot | Time unit, booking API validation, browser quote | No payment collection; accepted terms beyond price not fully snapshotted |
| Booking requests/retries | PENDING creation; actor-scoped durable Idempotency-Key support; web key retained across transient request failures | Stability concurrent initial/replay/mismatched-payload/cross-actor tests; browser replay after full restart | Calls without keys, a changed selection/new page instance or a deliberately different key can still create separate PENDING requests |
| Acceptance/rejection/cancellation | Owner accept/reject; participant cancel before handoff; persisted reason/status; reservation conflict prevention | Rental API, MRT/browser, moderation races | Handoff refusal/no-show policy unresolved; no automatic expiry invented |
| Concurrent bookings/state changes | Existing authoritative row locks, transactional guards and uniqueness; known serialization/deadlock failures return retryable conflicts in booking/lifecycle paths | Real concurrent acceptance, stale-station races, inspection/dispute races; injected deadlock state/photo rollback | No exhaustive stress/load/deadlock-order proof; future writers must reuse transition services |
| Owner handoff/borrower receipt | Separate participant checklists and explicit acknowledgements; immutable condition evidence and private photos | Rental API, real browser journey/reloads; duplicate/unauthorized/invalid consent tests | HANDOFF_PENDING refusal/no-show escape absent; policy observation reproduced |
| Return/inspection/completion | Borrower return → owner inspection → acceptable completion; concerns retained and completion blocked | Rental API/browser positive and disputed journeys; suspended-account obligations | DISPUTED return pauses pending admin resume; policy decision required |
| Reviews/trust profiles | Both participants review only verified completed rentals; duplicate/forged authors rejected; correct role profile aggregates | Rental API/browser reviews; MVP public profile/privacy tests | Identity/trust fields do not constitute an identity-verification service |
| Reports/disputes/customer service | Listing reports and rental dispute forms → persisted admin cases; support page links these | Moderation actual report uphold/dismiss/reopened disputes and browser flow | Single OPEN report suppresses bookings by policy; no general support inbox/live delivery |
| Admin dashboard/roles | Active ADMIN-only server pages and APIs, paginated directories/filter/details; USER/expired/forged denied | Admin, moderation, MVP desktop/tablet/mobile/browser checks | Broad active-admin role remains; no case assignment RBAC |
| Suspension/listing restrictions | Reasoned expected-state actions with persisted actor checks, row locks, transactional audits; obligations preserved | Moderation conflicting decisions, current-status enforcement and restoration tests | Account penalties/appeals/hold policy beyond existing tools require decisions |
| Admin evidence/audits | Existing case/booking-linked photo access now commits EVIDENCE_VIEWED before releasing bytes; filterable access event; no image/token content in logs | Stability authorized/unauthorized/missing/suspended actor and audit-failure injection; moderation immutability tests | Case text read logging, assignment, retention/purpose review and access-volume limits still need design |
| Security/data persistence | Bounded JSON/multipart, image sanitation, participant privacy, universal proxy origin checks, legacy rewrites, immutable audit triggers, DB constraints | Unit, MVP, admin/moderation; browser and production restarts | Production perimeter abuse controls, durable file operations and native API contract remain backlog |

## 3. Actual final test results and commands

| Command | Exit | Executed outcome |
|---|---|---|
| `npm run lint` | 0 | Passed (onboarding workspace evidence) |
| `npx tsc --noEmit` | 0 | Passed (onboarding workspace evidence) |
| `npm run test:unit` | 0 | tests 22; pass 22; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:stability` | 0 | tests 8; pass 8; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:integration` | 0 | Assertion-based workflow completed (onboarding workspace evidence) |
| `npm run test:rental-api` | 0 | tests 13; pass 13; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:rental-browser` | 0 | tests 4; pass 4; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:admin` | 0 | tests 7; pass 7; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:moderation` | 0 | tests 10; pass 10; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:migration` | 0 | Assertion-based workflow completed (onboarding workspace evidence) |
| `npm run test:admin-migration` | 0 | tests 1; pass 1; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run test:mvp` | 0 | tests 11; pass 11; fail 0; skipped 0 (onboarding workspace evidence) |
| `npm run build:verify` | 0 | Passed (onboarding workspace evidence) |

`test:integration` and `test:migration` are assertion-based scripts without a Node test-count summary; a successful exit is supported by their fresh validation output, not a fabricated test count. The other counts include Node runner parent groups where emitted. The 8 stability results include two observations of **unchanged problematic policy**; passing those observations is not a claim that no-show/report design is complete.

One final-round Admin migration attempt initially failed because its original-row comparison did not allow the new nullable Booking fields. The fixture now explicitly verifies both are null for old bookings before comparing all original columns unchanged; its isolated rerun passed. The failed attempt remains in `final-test-admin-migration.log`, with the successful rerun in `migration_recheck-test-admin-migration.log`. No historical value assertion was removed.

Raw logs are retained in the onboarding workspace and excluded from Git. Workspace paths are not portable GitHub links. Fresh review-run results and a tested-source fingerprint are recorded in Section 11.

Previous full logs: `/workspace/milestone1-output/final-*.log`; machine-readable final results (onboarding workspace evidence). The harness captured each command's own exit status and stdout/stderr directly. Targeted results are in targeted-results.json (onboarding workspace evidence); pre-fix reproductions in reproduction_clean-test-stability.log (onboarding workspace evidence), policy observations (onboarding workspace evidence), and deadlock unit failure (onboarding workspace evidence).

Working directory for all commands: `/workspace/lend-ya`. For each database suite, the external harness provided a distinct new local `MRT_TEST_DATABASE_URL` named `hustlen_test_m1_<phase>_<index>_<timestamp>` and `MRT_BROWSER_PATH=/usr/bin/chromium`, then invoked the npm script. Credentials came from the README's isolated local Compose configuration; no real database binding was reused. The repository runner creates and owns the database; do not precreate or adopt one. `test:mvp` now includes its own production build prerequisite. `build:verify` builds only after migrating an owned test database.

Final cleanup evidence: A final read-only query of the postgres system catalog found **0 remaining hustlen_test_m1_* databases**. No Next test servers remained running. All 14 pre-existing migration files (including migration_lock.toml) are byte-identical to the base commit, and package-lock.json is unchanged. The existing p2p_marketplace database was not a test, migration or fixture target.

## 4. Reproduced defects, smallest fixes and regression evidence

### R1 / F03 — P1 retry duplication, with intentional PENDING requests preserved

Before: the server ignored Idempotency-Key. Replaying a POST returned a second Booking ID; the pre-fix assertion observed `2 !== 1`. Existing rental tests explicitly permit multiple overlapping PENDING requests, so simply banning equal dates or enforcing a single pending request would invent a new product policy.

Fix: nullable `Booking.requestKey`/`requestHash` and unique `(renterId, requestKey)` through a **new forward migration**. POST hashes normalized effective request terms and returns the original actor's persisted booking for the same key/payload, including after acceptance. Reusing a key with different terms returns 409. Known concurrent unique/serialization failures check for a committed matching replay. Quotes do not reserve keys. The web form reuses a key across retries while its selection/component remains the same. New/different keys and legacy callers retain intentional separate-request behavior.

Regression: concurrent first submissions and later concurrent retries return one ID/one row; mismatched payload rejected; another actor cannot fetch that booking by guessing the key; acceptance preserves replay; existing browser rental test now confirms the web-created key and replays the completed booking after full server restart without an extra row. Existing overlapping-PENDING acceptance tests remain intact.

Sources: [app/api/bookings/route.ts](../app/api/bookings/route.ts), [components/booking-form.tsx](../components/booking-form.tsx), [prisma/schema.prisma](../prisma/schema.prisma), [prisma/migrations/20261019090000_booking_request_idempotency/migration.sql](../prisma/migrations/20261019090000_booking_request_idempotency/migration.sql), [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts), [tests/rental-browser.test.ts](../tests/rental-browser.test.ts).

Limit: this is per-key idempotency, not automatic deduplication of all requests with similar dates. The component key does not survive closing/remounting the page; a caller must retain and reuse a key for durable retries. Payload hash intentionally excludes client-only quote expectations: a replay returns the already stored terms rather than re-pricing them. No existing record or evidence is rewritten.

### R2 / F04 — P1 unrelated-account authentication lockout

Before: a shared `login:global`/`register:global` bucket denied every account after 1,000 action attempts. The reproduction placed the exact exhausted persisted login bucket into the owned test fixture, then attempted a correct unrelated login: 429 instead of 200. It did not perform a public brute-force attack.

Fix: remove shared cross-account admission coupling; retain the existing persistent per-email 10-login / 5-registration attempt controls and expiration. No spoofable forwarded IP identity was introduced. Legacy global rows expire through the existing cleanup and no longer control login.

Regression: the exhausted unrelated global bucket no longer denies correct login; 11 concurrent attempts to one account still yield 10 authentication failures and one 429. The original MVP suite still verifies registration limits, spoofed IP resistance and persisted throttling across a full production restart.

Sources: [lib/auth-rate-limit.ts](../lib/auth-rate-limit.ts), [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts), [tests/mvp-security.test.ts](../tests/mvp-security.test.ts).

Remaining risk: targeted per-email exhaustion and distributed resource abuse need an agreed recovery/trusted-ingress strategy. Removing a caller-exhaustible global bucket is not a replacement for deployment-level capacity protection. No ingress/security configuration was changed.

### R3 / F05 — P1 before private chat: missing private-photo access audit

Before: an authorized admin received private dispute image bytes but zero access events were recorded (`0 !== 1` in the pre-fix test). Existing mutation audits were present and immutable; the gap was reading photo evidence.

Fix: a server-only case evidence reader rechecks persisted active ADMIN status under a shared user lock, verifies that the photo belongs to the dispute's booking, and commits EVIDENCE_VIEWED before returning bytes. Existing immutable AdminAuditLog stores actor, case, photo reference, booking reference and time; image content/session tokens are excluded. The action is available in API/UI audit filters. Missing/denied reads do not create false successful-view records. An audit failure returns 500 and releases no image bytes.

Regression: authorized image bytes equal original fixture; exact actor/photo/case audit verified; outsider/missing-photo/suspended-admin denied; filter accepted; injected audit INSERT failure withholds bytes. Original moderation suite continues checking case linkage, privacy, failed actions and immutable records.

Sources: [lib/admin/evidence.ts](../lib/admin/evidence.ts), [app/api/admin/disputes/[id]/evidence/[photoId]/route.ts](../app/api/admin/disputes/[id]/evidence/[photoId]/route.ts), [lib/admin/cases.ts](../lib/admin/cases.ts), [components/admin/cases.tsx](../components/admin/cases.tsx), [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts).

Scope deliberately unchanged: active admins can investigate existing disputes, including resolved ones. This adds auditable access, not assigned-case authorization or logging of every free-text case read. Those require staff privacy/retention decisions before private chat.

### R4 — P2 retryable Booking transaction errors returned 500

Before: SQLSTATE 40P01 was not recognized by the conflict helper; an isolated trigger injecting a deadlock into Booking UPDATE caused PATCH cancel to return 500. The original helper's nested-adapter deadlock unit assertion also failed.

Fix: recognize 40P01, including nested adapter errors, alongside 40001/P2034. Booking PATCH/dispute and rental-stage failure handling map known lock conflicts to 409. No automatic retry of evidence writes or unsafe state assignment was added. Existing row locks, participant checks, compare-and-set guards and evidence transactions are preserved.

Regression: injected cancellation conflict returns 409 with unchanged Booking state. Injected handoff update conflict returns 409 and rolls back both Handoff and private photo writes. Unit tests ensure unrelated FK errors remain unclassified. Existing real concurrent acceptance, stale-station and inspection/dispute suites verify ordinary races.

Sources: [lib/database-conflicts.ts](../lib/database-conflicts.ts), [lib/rental-route.ts](../lib/rental-route.ts), [app/api/bookings/[id]/route.ts](../app/api/bookings/[id]/route.ts), [app/api/bookings/[id]/dispute/route.ts](../app/api/bookings/[id]/dispute/route.ts), [tests/mrt.test.ts](../tests/mrt.test.ts), [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts).

### R5 / F11 — P2 JSON authentication contract hardening, not a CSRF bypass

Before: login accepted valid JSON sent as text/plain and issued a cookie (200 versus the regression's expected 415). Hostile-origin requests were already rejected by `proxy.ts`; the earlier audit's claim of absent universal origin checks was incomplete.

Fix: login/registration require application/json before parsing or throttling. Existing universal proxy origin protection remains authoritative and unchanged. Headerless programmatic requests still need the documented JSON content type; the website already sends it.

Regression: hostile-origin login remains 403 with no cookie; text/plain login is 415 with no cookie; ordinary login/registration/browser and production-cookie tests continue to work.

Sources: [lib/auth-request.ts](../lib/auth-request.ts), [app/api/auth/login/route.ts](../app/api/auth/login/route.ts), [app/api/auth/register/route.ts](../app/api/auth/register/route.ts), [proxy.ts](../proxy.ts), [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts).

### R6 — P2 reproducible security-suite prerequisite

Before: `test:mvp` tried a production restart without creating a production build in a clean environment. This initially failed despite its earlier dev/API/browser assertions passing.

Fix: the isolated runner builds before launching that suite. No live/development database is used; the build inherits the runner's owned database URL. The existing production-cookie/restart subtest is the regression check. Other suites do not need redundant builds.

Source: [tests/run-isolated.ts](../tests/run-isolated.ts).

## 5. Review of all prior findings F01–F14

| Finding | Classification after executable verification | Outcome / next action |
|---|---|---|
| F01 report intake/enforcement | Existing deliberate policy with abuse risk, not a newly broken endpoint | Reproduced OPEN report blocking booking and admin dismissal restoring eligibility. **P1 decision:** separate allegations from urgent holds? Reporter budgets/abuse safeguards? Existing behavior preserved |
| F02 handoff refusal/no-show | Missing requirement/state-machine path | Reproduced HANDOFF_PENDING cancellation/dispute 409, false acknowledgement 400, owner record retained. **P1 decision** needed before transitions change |
| F03 duplicate requests | Retry reliability defect distinct from permitted competing requests | Per-key idempotency repaired/tested; keys remain optional for compatibility |
| F04 authentication abuse | Shared global lockout defect; targeted abuse strategy remains incomplete | Cross-account coupling repaired/tested; keep per-account limits, decide trusted-ingress/recovery controls |
| F05 admin sensitive reads | Confirmed photo-read audit gap plus future least-privilege requirement | Photo access auditing repaired/tested; assignment, text access audit and retention still **P1 before private chat** |
| F06 disputed return pause | Existing admin-mediated policy, not irreversible data deadlock | Real moderation tests verify CONTINUE_RETURN/RESUME_INSPECTION without fabricated completion; concurrent custody/case policy unresolved |
| F07 recovery/identity/account breadth | Missing product features | Recovery endpoint transparently reports delivery unconfigured; identity verification and broader account settings remain P2 backlog |
| F08 media editing | Missing feature | Listing metadata/stations edit works; replace/add/remove media remains P2 backlog |
| F09 storage/cleanup | Operational improvement plus source-level orphan cleanup concern | Local storage/orphan cleanup still P2; file cleanup on successful DELETE was not independently reproduced here. **Correction:** legacy URLs are already rewritten through guarded API by proxy.ts; bypass concern not reproduced and existing security tests pass |
| F10 search/availability APIs | Future scale/mobile/UX improvement | Existing filters/backend conflict checks pass. Pagination/date-window availability/catalogue endpoints remain P2 |
| F11 origin security | Earlier audit incomplete; centralized protection exists | Universal hostile-origin tests pass. JSON media-type acceptance hardened; no demonstrated CSRF exploit claimed |
| F12 database invariants/history | Mixed future improvements; existing SQL safeguards stronger than initial report | **Correction:** immutable audit trigger, photo stage/MIME/size CHECKs, one-open-dispute partial unique index already exist and execute successfully. Broader item snapshots/FKs/least-privilege DB roles remain P2 |
| F13 native/API/outbox | Future architecture work | No new native auth/API/chat/notifications added; P2 planning backlog |
| F14 branding/localization | Future product polish | No visual/currency/localization policy changes; P3 backlog |

No P0 defect was established. Prior reports were treated as hypotheses, not authority overriding working code or executed tests. Key correction sources: [proxy.ts](../proxy.ts), [prisma/migrations/20261014010000_admin_moderation/migration.sql](../prisma/migrations/20261014010000_admin_moderation/migration.sql), [prisma/migrations/20261014020000_dispute_case_history/migration.sql](../prisma/migrations/20261014020000_dispute_case_history/migration.sql), [prisma/migrations/20261013100000_private_rental_evidence/migration.sql](../prisma/migrations/20261013100000_private_rental_evidence/migration.sql), [tests/mvp-security.test.ts](../tests/mvp-security.test.ts), [tests/moderation.integration.test.ts](../tests/moderation.integration.test.ts).

## 6. Actual journey and persistence evidence

The real browser workflow creates authenticated Owner/Borrower contexts, prepares a listing through the authenticated listing API, selects an MRT station in the UI, fills dates, reviews the displayed quotation and submits a booking. Owner accepts through the UI, records checklist/photos and acknowledgement; Borrower reloads, sees that record, acknowledges receipt with their own checklist/photos, returns the item; Owner reloads, begins inspection, records acceptable condition and completes it. Both users submit verified reviews and view four private evidence photos.

The suite checks stored COMPLETED status and original fee/deposit, stops the actual Next server, restarts it, then checks notes, both reviews, visible private photos and dashboard/API state for both users. The added regression also retrieves the web-created retry key and replays the completed request after restart, asserting the original ID and one Booking row. Separate MRT/MVP browser suites exercise owner creation/edit UI, station selection, mobile interaction and browsing. The test setup's API-created initial listing is not misrepresented as UI creation in the rental-browser suite.

Error evidence includes unauthorized actions, expired/forged sessions, bad input/photo types/size, stale stations, duplicate lifecycle submissions, concurrent acceptance, conflict-safe inspection/dispute outcomes, listing report uphold/dismiss, suspended accounts preserving return obligations, admin restoration and audit failure rollback. Full production restart checks confirm Secure/HttpOnly cookies and persistent per-account throttles. These are local Chromium/Next/PostgreSQL checks, not Android/iOS, Safari or deployed multi-instance tests.

Sources: [tests/rental-browser.test.ts](../tests/rental-browser.test.ts), [tests/mrt-integration.ts](../tests/mrt-integration.ts), [tests/bookings.integration.test.ts](../tests/bookings.integration.test.ts), [tests/rental-lifecycle.integration.test.ts](../tests/rental-lifecycle.integration.test.ts), [tests/admin.integration.test.ts](../tests/admin.integration.test.ts), [tests/moderation.integration.test.ts](../tests/moderation.integration.test.ts), [tests/mvp-security.test.ts](../tests/mvp-security.test.ts).

## 7. Database change and preservation

Only `20261019090000_booking_request_idempotency` is new. It adds two nullable columns and one composite unique index; PostgreSQL permits multiple null keys, preserving every old Booking. It does not transform status, participant IDs, price, stations, disputes or evidence. No automatic cleanup/expiry of request keys is introduced, so a retained booking retains its retry identity.

Final isolated migration/upgrade results are recorded in the test table. Their assertions compare existing populated records, prior recorded checksums, station identities, case/evidence history and schema diff. These checks apply to reconstructed disposable fixtures, not the Mac database.

The local Mac's reported checksum mismatch for `20261006150000_booking_lifecycle_backbone` is not cleared by these tests. No checksum manipulation, migrate resolve, reset or rewrite was performed. `db:preflight` intentionally rejects unknown pending changes; with the new stabilization migration, an existing installation needs a separately reviewed backup/migration plan rather than assuming the previous “only MRT pending” upgrade instructions apply. No live or development migration is authorized/executed by this report.

## 8. Exact changed files

- [app/api/admin/disputes/[id]/evidence/[photoId]/route.ts](../app/api/admin/disputes/[id]/evidence/[photoId]/route.ts)
- [app/api/auth/login/route.ts](../app/api/auth/login/route.ts)
- [app/api/auth/register/route.ts](../app/api/auth/register/route.ts)
- [app/api/bookings/[id]/dispute/route.ts](../app/api/bookings/[id]/dispute/route.ts)
- [app/api/bookings/[id]/route.ts](../app/api/bookings/[id]/route.ts)
- [app/api/bookings/route.ts](../app/api/bookings/route.ts)
- [components/admin/cases.tsx](../components/admin/cases.tsx)
- [components/booking-form.tsx](../components/booking-form.tsx)
- [lib/admin/cases.ts](../lib/admin/cases.ts)
- [lib/auth-rate-limit.ts](../lib/auth-rate-limit.ts)
- [lib/database-conflicts.ts](../lib/database-conflicts.ts)
- [lib/rental-route.ts](../lib/rental-route.ts)
- [package.json](../package.json)
- [prisma/schema.prisma](../prisma/schema.prisma)
- [tests/moderation-migration.test.ts](../tests/moderation-migration.test.ts)
- [tests/mrt.test.ts](../tests/mrt.test.ts)
- [tests/rental-browser.test.ts](../tests/rental-browser.test.ts)
- [tests/run-isolated.ts](../tests/run-isolated.ts)
- [docs/MILESTONE1_STABILITY_REPORT.md](./MILESTONE1_STABILITY_REPORT.md)
- [lib/admin/evidence.ts](../lib/admin/evidence.ts)
- [lib/auth-request.ts](../lib/auth-request.ts)
- [prisma/migrations/20261019090000_booking_request_idempotency/migration.sql](../prisma/migrations/20261019090000_booking_request_idempotency/migration.sql)
- [tests/core-stability.integration.test.ts](../tests/core-stability.integration.test.ts)

Historical migration files, lockfiles, dataset, existing case/evidence schemas and the Booking state machine were not rewritten. No service deployment, repository membership or environment network/security settings were changed. New migration/schema is required for this branch's Booking API before running it against any future approved database; only disposable test databases were upgraded here.

## 9. Outstanding product/security decisions

1. **P1 — Failed meetup/handoff refusal/no-show:** who may report it, when the handoff window begins/ends, counterparty response, evidence requirements, who may release inventory and how a disputed/refused handoff is resolved without falsely acknowledging receipt. Decide whether to add a refusal state, case type or timeout; no automatic forfeiture/cancellation invented here.
2. **P1 — Reports:** whether an unreviewed allegation alone should block bookings, what justifies an emergency hold, limits/eligibility without excluding legitimate safety reports from restricted users, appeal/release rules and human review deadlines. Existing automatic block remains in place until an approved replacement exists.
3. **P1 before private chat — Staff access:** assigned-case vs broader investigators, scope of case text/photo access, explicit purpose, retention/legal holds, staff access monitoring and appeals. Photo access is now logged, but this does not settle private-conversation policy.
4. **P2 — Disputed custody:** whether return evidence can progress independently while a dispute remains open. Current admin-mediated resume is verified and preserved; no fake completion or condition approval introduced.
5. **P2 — Authentication abuse:** trusted ingress capacity controls and per-account recovery against targeted lockout without trusting caller-supplied forwarded headers. Persistent existing per-account limits remain.

## 10. Remaining incremental backlog and chat readiness

| Priority | Next work | Acceptance gate |
|---|---|---|
| P1 | Resolve no-show/refusal and report intake/enforcement policies | Approved transition/hold matrix, two-party negative browser/API tests, preserved historical evidence |
| P1 for private messaging | Staff privacy/assignment, sensitive text access audit, retention/appeals | Least-privilege access tests, immutable access history, human review policy |
| P2 | Targeted authentication recovery/trusted ingress controls | Independent account availability plus persisted brute-force defense under realistic load |
| P2 | Media edit/cleanup/durable storage and historical item snapshots | File/DB reconciliation, approved retention, backup/restore and old-terms tests |
| P2 | Consistent deadlock strategy for remaining admin/other endpoints and load testing | Failure injection + realistic lock-order/concurrency evidence, no unsafe write retries |
| P2 | Versioned/shared API types, pagination, MRT/availability/profile APIs, native auth design | Contract/privacy/date/decimal tests before Expo clients |
| P2 after above decisions | Chat/messaging implementation plan with durable ordering/idempotency, reports/blocks and moderation case boundaries | Membership, replay, unread, held-message privacy and multilingual contextual review requirements |
| P3 | Branding, localization and confirmed currency policy | Product/accessibility/localization review |

**Chat/Moderation milestone verdict:** Core rental implementation and stabilization have executable verification evidence. This is not an unconditional go-ahead for private chat/moderation: settle P1 refusal/report and staff privacy boundaries first, then authorize a separately scoped milestone. No tests remain blocked in this local run.

No implementation of that milestone, deployment, production migration or merge is implied by passing these tests. Review the feature-branch diff and the decisions above before authorizing additional work.
## 11. Review publication and tested-tree provenance

The complete continuation begins at **R2/F04 in Section 4** and includes R3–R6, all F01–F14 classifications, executed journey/persistence evidence, database preservation, the exact changed-file list, unresolved policy decisions and the remaining backlog. No missing finding or policy decision has been omitted from this file.

Review branch: `fix/milestone1-core-stability` on `bubbl3gum-jpg/lend-ya`. This change set contains only the 23 source/schema/test/report files listed in Section 8. Environment files, database dumps, raw execution logs, screenshots from this run, dependencies, generated Prisma/Next outputs and temporary runner helpers are excluded. Prior tracked historical evidence remains unchanged.

A fresh full verification run completed against the code, tests and schema being committed. **All 13 commands exited 0; none were blocked.** Application/test/schema/migration files were unchanged throughout finalization; only this report was edited. Every database suite migrated a newly owned disposable database, including `20261019090000_booking_request_idempotency`. No milestone test databases or Next test servers remained after cleanup.

Tested-source fingerprint: `02bb34d12f08eba1d9afdbb3d6063d9806894270334251abb37e573ed531508b` (192 files). Compute each file SHA-256, then SHA-256 of the sorted concatenation `relative_path + NUL + file_sha256 + NUL`. Inputs are `git ls-files --cached --others --exclude-standard`, excluding `docs/` and dot-prefixed paths. Documentation edits do not affect this fingerprint; application code, test code, schema, all migration files and dependency lockfile are included. The fingerprint was rechecked before staging.

| Fresh command | Exit | Results |
|---|---|---|
| `npm run lint` | 0 | Passed |
| `npx tsc --noEmit` | 0 | Passed |
| `npm run test:unit` | 0 | pass 22; fail 0; skipped 0 |
| `npm run test:stability` | 0 | pass 8; fail 0; skipped 0 |
| `npm run test:integration` | 0 | Assertion-based functional checks completed |
| `npm run test:rental-api` | 0 | pass 13; fail 0; skipped 0 |
| `npm run test:rental-browser` | 0 | pass 4; fail 0; skipped 0 |
| `npm run test:admin` | 0 | pass 7; fail 0; skipped 0 |
| `npm run test:moderation` | 0 | pass 10; fail 0; skipped 0 |
| `npm run test:migration` | 0 | Assertion-based functional checks completed |
| `npm run test:admin-migration` | 0 | pass 1; fail 0; skipped 0 |
| `npm run test:mvp` | 0 | pass 11; fail 0; skipped 0 |
| `npm run build:verify` | 0 | Passed |

These counts include Node runner parent groups. The two policy-observation subtests confirm unchanged behavior; they do not resolve no-show/report policies. Raw fresh logs remain outside Git at `/workspace/milestone1-output/review-*.log`; the portable command/results table above is included for review. No generated artifacts or credentials are published.

### Exact new migration requirements (review instructions, not executed against an existing database)

The application requires `20261019090000_booking_request_idempotency` before serving this branch's Booking API against a persistent database. The new migration is exactly:

```sql
ALTER TABLE "Booking" ADD COLUMN "requestKey" VARCHAR(128), ADD COLUMN "requestHash" VARCHAR(64);
CREATE UNIQUE INDEX "Booking_renterId_requestKey_key" ON "Booking"("renterId", "requestKey");
```

Both columns are nullable, with no invented key/hash assigned to old bookings. The composite index permits multiple null keys and enforces actor-scoped uniqueness for supplied keys. No data backfill, seed, reset, history edit or lifecycle transition is required. No additional secret or dependency is introduced.

Migration file SHA-256: `2b025ecdf2aeae96c43fa8b498ed839be74b869e3e89faade5ce6c6546b751e0`.

A future, separately authorized persistent-database upgrade must first have a verified backup and matching immutable historical migration checksums. Confirm that this is the only pending migration; `migrate deploy` applies **all** pending migrations. The existing Mac checksum mismatch must be investigated independently and must not be hidden with `migrate resolve` or by editing historical files. The previous preflight permits only the MRT upgrade path and intentionally does not authorize this new migration.

For a separately approved target only, the repository's commands are `npx prisma migrate deploy --config prisma7.config.ts` and `npx prisma generate --config prisma7.config.ts`; generation can be performed without database writes, while deploy must complete before the updated API is started. This review task executes deploy only through the isolated test runner on fresh owned databases. It does not authorize or execute either a live migration or a migration of `p2p_marketplace`.

### Verification scope on GitHub

The results in this report are executions in the cloud development machine, not a claim of GitHub Actions success. The existing verification workflow runs for pull requests, pushes to the two base branches, or manual dispatch; this feature-branch push alone does not trigger it. That unchanged workflow does not yet invoke `test:stability`; its exact command and independently runnable runner are included in this report and repository. Adding it to CI remains a review follow-up. No workflow, deployment hook or security setting was changed during finalization.
