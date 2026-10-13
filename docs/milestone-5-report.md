# Milestone 5 — Final MVP verification and release readiness

Date: 2026-10-14 (Asia/Taipei). Repository: `bubbl3gum-jpg/lend-ya`. Release decision: **MVP CONDITIONALLY READY**.

## A. Executive summary

The supported Lend Ya MVP is functional in the prepared environment. Two separately authenticated participants completed booking, bilateral condition handoff, return, owner inspection, completion and reviews through real APIs and browser controls. Records, notes, reviews and protected photo bytes survived refresh and a full application-server restart against PostgreSQL. No booking state was manually assigned to simulate success.

The Admin Desktop functions against actual database records. Current ADMIN sessions can inspect directories/statistics, suspend/reactivate ordinary users, restrict/restore listings, review/dismiss/uphold reports, investigate protected evidence and resolve disputes using supported booking consequences. USER, anonymous, expired and forged sessions were denied. Competing booking/report/dispute decisions and audit-write failure were tested, with preserved evidence and coherent final states.

This milestone independently reran the prior suites after a clean dependency installation, reproduced and fixed upload/media defects, completed category/station editing and profile review display, hardened authentication/CSRF/body handling, and added API/browser regression tests. Final executed checks passed: **52 reported tests including Node parent tests**, TypeScript, ESLint, Prisma validation/generation/migrations, production build and production-cookie tests.

No unresolved P0/P1 defect was observed in supported current workflows. Ready for a controlled university demonstration using fresh evidence-bearing accounts/listings and the [demonstration guide](demo-guide.md). The gate remains conditional because npm reports residual tooling dependency advisories, hosted GitHub Actions execution is unverified, and fresh-host backup/media restoration is unverified. Legacy records with missing original evidence require reviewed remediation; they cannot be forced to completion. This is not a production-security certification or an exhaustive penetration test.

## B. Feature completion matrix

| Feature | Status | Executed evidence | Remaining issues |
| --- | --- | --- | --- |
| Locked installation and runnable environment | PASS | Clean `npm ci` before and after scoped dependency repair; Next dev/start; PostgreSQL requests | Fresh published environment not restored/tested |
| Registration, USER-only assignment and invalid/duplicate inputs | PASS | Real APIs and browser registration; spoofed role/identity ignored; invalid input/duplicates rejected | Operational recovery/email delivery deferred |
| Password/session/cookie/logout/expiry handling | PASS | Salted hashes, token-hash persistence, refresh, targeted logout/reuse/other-session and expiry tests; production Secure cookie | HTTPS/ingress operation outside local demonstration |
| Authentication attempt limiting | PASS | Persisted concurrency counters, forged IP rejection and production restart continuity | Basic MVP limits; production calibration/abuse monitoring deferred |
| Account settings and protected fields | PASS | Real browser/API name change; other account unchanged; role/identity fields protected | Broader optional settings outside scope |
| Physical listing creation, photos and optional video | PASS | Browser publication; actual decoded PNG metadata/pixels, malformed/size/dimension/SVG cases, generated MP4 metadata validation | Video frame-by-frame and universal codec playback not verified |
| Listing text/category/details/station/price/deposit/status management | PASS | API and actual edit form; supported stations changed atomically; price below $1 published; bad category/stations rejected | No full media replacement editor added |
| Listing ownership/deletion/visibility | PASS | Nonowner denial, history-preserving deletion restriction, inactive owner/private rules, moderated listing bypass denial | Existing public bytes cannot be revoked from prior viewers |
| Public browsing/search/category/station filters | PASS | Real UI filtered to one matching listing; 390/768/1440 layouts | Large-scale server-side public search/pagination not required/implemented |
| Public identity privacy | PASS | Listing payloads omit owner email/account status and credentials | Display names/received reviews deliberately public |
| Quotation/dates/pricing/deposit/station snapshots | PASS | Taipei timezone tests, impossible/past/long dates, overflow, correct elapsed-day prices; immutable snapshots after edits | No real financial collection |
| Request accept/reject/cancel and overlap protection | PASS | Real two-user APIs; two simultaneous overlapping approvals yield one winner; history retained | No arbitrary lifecycle reopening |
| Bilateral handoff and condition evidence | PASS | Explicit acknowledgements/checklists, separately attributed notes/photos, owner/renter and duplicate-race tests | Legacy overwritten/missing statements cannot be reconstructed |
| Return/inspection/normal completion | PASS | Full API/browser flow plus failed inspection; valid completion only; earlier evidence unchanged | Inconsistent legacy actor/flag remediation deferred |
| Eligible reviews and correct received-review profiles | PASS | Bilateral API reviews; premature/duplicate denial; persisted comments appear on correct profile only | Weighted trust scoring/KYC deferred |
| Rental history and restart persistence | PASS | Both dashboards/detail pages, private images decoded after full server restart | Disaster recovery/storage-volume restoration unverified |
| Listing reports/status and admin decisions | PASS | Real reports, UI report submission, multiple blockers, dismiss/uphold, concurrent case decision and audit | No support chat/appeal service |
| Admin roles/provisioning/statistics/directories | PASS | Existing guarded provisioning script; SQL aggregates; all API paths/pages; searches/filter/pagination and missing IDs | Hosted deployment and super-admin workflows not added |
| Suspension/reactivation with retained physical duties | PASS | Existing-session restrictions, real return/inspection despite suspension, restoration and audit history | No permanent deletion/automatic obligation cancellation |
| Listing moderation/restoration | PASS | Separate admin flag; owner cannot bypass; other reports/inactivity/suspension/missing media still enforced | Production media infrastructure deferred |
| Disputes/evidence/valid consequences | PASS | Legitimate contested return, case evidence, supported findings and all three consequences; unreturned item remains owed | Missing legacy evidence blocks unsafe resolution |
| Transactional immutable audit logging | PASS | Correct actors/reasons/time/state; failed write rolls back; update/delete denied; conflicting decisions rejected | DB-superuser operational controls remain necessary |
| Responsive UI and basic keyboard behavior | PASS | Marketplace/accounts/profiles/booking and owner forms at 390/768/1440; admin tablet plus existing desktop/mobile suites | Full WCAG/screen-reader/all-browser audit not claimed |
| Security boundaries tested | PASS | Real IDOR/role/CSRF/cache/media/limits/session/concurrency checks | Focused assessment, not exhaustive penetration/fuzz testing |
| Dependency vulnerability remediation | PARTIAL | Scoped compatible-major mysql2 override fixed its advisories; final audit captured | Nine high package entries across two tooling advisory roots remain |
| CI configuration | PARTIAL | Workflow YAML/required steps validated locally; corresponding commands executed locally | Hosted Actions run has not occurred |
| Legacy import and fresh-host disaster recovery | PARTIAL | Original data preserved; same-instance restart verified | Secure import/manual legacy remediation and restored-volume test deferred |
| Payments, AI decisions, government verification, messaging | NOT STARTED | Deliberately outside agreed MVP | No claim of implementation |

## C. Actual test execution report

Commands were executed in `/workspace/lend-ya`. Connection values were supplied privately via environment/ignored configuration and are not included. Destructive fixtures used only separate `_test` databases. There were no mocks replacing application APIs.

| Command / operation | Result |
| --- | --- |
| `npm ci --cache /tmp/lend-ya-npm-cache` | PASS; original lock 519 packages; repaired final lock 517 packages |
| `npm install --cache /tmp/lend-ya-npm-cache` for scoped mysql2 override | PASS; one compatible-major transport dependency changed; no framework/Prisma major upgrade |
| `npx prisma validate --config prisma7.config.ts` | PASS |
| `npx prisma generate --config prisma7.config.ts` | PASS after clean install and dependency repair |
| `npx prisma migrate deploy --config prisma7.config.ts` with appropriate application/test DATABASE_URL | PASS; 12 forward migrations on application and test instances; no reset |
| `npx prisma migrate diff --config prisma7.config.ts --from-config-datasource --to-schema prisma/schema.prisma --script` | PASS; empty migration |
| `npx next typegen` / `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; production app and Proxy compiled |
| `npm run test:unit` | PASS; 6 tests |
| `npm run test:integration` (`lend_ya_booking_test`) | PASS; 13 real API tests plus 4 two-session browser/restart tests |
| `npm run test:admin` (`lend_ya_admin_test`) | PASS; 7 tests covering real statistics/provisioning/authorization/seed safety and desktop/mobile UI |
| `npm run test:moderation` (`lend_ya_moderation_test`) | PASS; 10 tests including suspension, report/dispute conflicts, private evidence, audit rollback and real controls |
| `npm run test:migration` (`lend_ya_migration_test`) | PASS; 1 populated pre-4B upgrade/preservation test, now applying 4B and 5 migrations |
| `npm run test:mvp` (`lend_ya_mvp_test`) | PASS; 11 tests including existing-data refusal, account/security/listing/media/profiles, 390/768/1440 UI and production cookies/restart |
| `npm audit --json` / `npm audit --omit=dev --json` | Completed with advisories, not PASS/clean; final total 9 high package entries, runtime-installed total 4 high entries |
| `npm audit fix --dry-run --json --cache /tmp/lend-ya-npm-cache` | Completed; no compatible automatic changes proposed; no forced major fix |
| GitHub workflow YAML/step validation | PASS locally; hosted execution unverified |
| Application before/after row count and full-row digest comparison | PASS across all 11 captured user/listing/rental/evidence/report/audit entity tables |
| `git diff --check` | PASS |

Final positive runs: **52 reported tests, zero failures/skips**. Node parent tests are included in that count; it is not a count of every assertion. The prior suites were executed both as a baseline and after functional/security/dependency changes. Subsequent targeted MVP reruns verified the new data-ownership guard, tablet/form coverage and below-$1 price input.

A guard regression initially appeared to succeed because a nested Node runner inherited `NODE_TEST_CONTEXT` and did not execute as an independent run. Removing that inherited context caused the child runner to actually refuse existing users; before/after records matched. This test-harness failure was corrected and rerun, not ignored. A metadata npm command initially used an unwritable default cache; it succeeded when rerun with the writable task cache. No remaining environment block prevented the supported local scenarios.

## D. Important fixes and regressions

| Problem / root cause | Changes and solution | Verification |
| --- | --- | --- |
| Forged image prefixes accepted; no full decoding | `lib/listing-media.ts`: bounded Sharp decode/re-encode, pixel/dimension/page/type limits, stripped metadata, private storage; ffprobe supported-video container/stream validation and pipe-only timeout | Original fake-PNG acceptance reproduced; malicious/malformed/oversized inputs rejected, real pixels and MP4 accepted |
| Media handler read arbitrary UUID file without checking current DB reference/visibility; legacy static/optimizer paths bypassed lifecycle visibility | Media handler now checks ListingMedia/listing/user/participant state; Proxy rewrites legacy paths; Next optimizer disabled; private no-store/nosniff/CSP headers | Original orphan 200 reproduced; deleted/orphan/inactive outsider 404, owner/admin allowed, legacy alias guarded, optimizer rejected |
| Listing edit had no category/station fields or transaction update | `lib/listing-input.ts`, listing PATCH, edit page/form: validated categories/details/1–50 station IDs; atomic station relation update | API plus real edit form changed category/station/price; invalid and nonowner requests rejected; old booking snapshots unchanged |
| Create price native minimum 1 disagreed with API's 0.01 minimum | Creation form minimum aligned to 0.01 | Browser successfully publishes a $0.50 item through the real API |
| Auth attempts unlimited and unknown email skipped password derivation | PostgreSQL AuthRateLimit forward migration/helper, login/register handlers, equal password-derivation work for missing account | Concurrent attempts/429/Retry-After and caller-IP spoof denial; counters survive production restart; valid sessions remain functional |
| Normal mutation CSRF and request-size boundaries incomplete | `proxy.ts`, bounded JSON parser and bounded listing form parser; private API cache headers | Hostile Origin/Fetch Metadata mutation matrix rejected; same-origin forms work; streamed bodies bounded without Content-Length |
| Public listing responses returned unnecessary owner email/account status | Public listing selects/response reduced; no participant/admin evidence privileges weakened | API/public profile assertions show no private email/credentials; private paths remain denied |
| Profiles omitted actual received review comments | Trust-profile data/view: bounded latest 50 eligible received reviews, public author display name/rating/comment/Taipei date; removed speculative weighted score category display | Bilateral real completion/reviews; each comment appears only on its intended subject profile |
| Destructive new fixture cleanup could run before empty-database ownership | New suite cleanup gated by successful empty-at-entry ownership; independent refusal probe with Node test context removed | Existing-user test invocation fails safely and preserves its records |
| MySQL transport advisories in Prisma's pinned dependency | Scoped `prisma -> mysql2 3.24.6` override in manifest/lock | Advisory removed; clean install/Prisma/PostgreSQL/build/application suites passed; no MySQL application use claimed |
| Customer-service page suggested nonexistent demo email/contact service | Support copy directs to working listing reports and booking disputes; delivery/live support explicitly unavailable | Customer-service navigation/layout checked in browser |

## E. Database integrity and data safety

The only new Milestone 5 schema object is `AuthRateLimit` (opaque key, positive attempt count, expiry and expiry index) in `20261014030000_mvp_security`. The application retains the authoritative Booking/Handoff/Return/Dispute/Review models and all earlier migration history. Prisma's actual datasource/schema diff is empty.

Before changes, counts and full-row digests were captured for User, Listing, Booking, Handoff, Return, Dispute, VerifiedReview, AdminAuditLog, ListingReport, BookingEvidencePhoto and ListingMedia without exporting records/credentials. Final comparison matched all eleven tables. No existing account password/ADMIN role, booking, complaint, evidence or audit entry changed. Test data lives in separate databases and was cleaned after runs; no permanent administrator or fixed demo credential was created.

Constraints and transaction behavior were checked through real requests: unique reviews, one handoff/return record per booking, only one OPEN dispute, foreign-key retention, immutable audit writes, conflicting overlapping approvals, duplicate stage submissions and concurrent report/dispute decisions. The migration fixture compares original values/bytes/checksums across a populated upgrade and a repeat deployment. Separate raw SQL fixtures in statistics/legacy tests are explicitly historical/eligibility fixtures; successful rental/admin workflows were demonstrated by APIs/UI.

## F. Security assessment

See [the focused security findings and dependency table](security-assessment.md) for severities, evidence, changes, reachability and limits. Confirmed protections include persisted session/role/status authorization, correct participant/owner actors, no public admin registration, protected evidence, bounded actual media validation, mutation Origin checks, current moderation enforcement, guarded state transitions, immutable transactional audits, token/password hashing, production cookie flags and attempt throttling.

Residual npm advisory roots are deepmerge-ts recursive graph merging in Prisma configuration tooling and braces glob parsing in ESLint tooling. The review identified no public marketplace request path into those vulnerable behaviors; this is a reachability assessment, not proof of harmlessness. Avoid breaking overrides without supported compatibility testing. No zero-vulnerability or general production-security claim is made.

## G. UI verification and evidence

Executed authentication/registration/settings, homepage/browse/search/filter, listing creation/edit/details, both rental dashboards and history, handoff/return/inspection/reviews, received-review profiles, reporting/support, admin navigation/statistics/directories/details/moderation/report/dispute/evidence/audit controls. Existing suites exercise two participants in separate contexts and full rental restart persistence; new suite expands marketplace/account/owner-form/booking layouts at **390, 768 and 1440 pixels**, and admin directory/details at 768 alongside existing 390/1440 runs.

No unexpected JavaScript page exceptions or HTTP 5xx occurred during the final new browser scenario. Invalid/unauthorized API tests and deliberate audit-write fault injection are expected negative responses, not silently successful UI actions. Basic Tab focus, real form validation/server feedback and explicit administrative confirmation were checked. No horizontal document overflow remained in the tested layouts. Full WCAG/screen-reader/codec/all-browser certification was not attempted.

Screenshots are captured from synthetic isolated fixtures, not real user complaints. Artifact links are appended below. They show functional pages backed by actual temporary PostgreSQL records; fixture counts are not hardcoded production logic.

## H. Demonstration readiness

The three requested demonstrations can run through the application without SQL lifecycle manipulation: normal rental and reviews/history; administrator/report management; contested return, investigation and explicit administrative closure. Follow [docs/demo-guide.md](demo-guide.md) for preparation, separate sessions, quote/date expectations, evidence/decision steps, a checklist and interruption recovery.

The demonstration requires working PostgreSQL and persistent listing/evidence storage, FFmpeg/ffprobe for optional video, and new evidence-bearing fixtures. Session/record continuity after application restart is verified on this instance; a published fresh environment or backup restore was not demonstrated. No real payments, AI findings or government verification are part of the MVP.

## I. Remaining backlog and release conditions

**Observed MVP blockers:** none in supported current workflows after repairs.

**Conditions / nonblocking MVP verification gaps:**

- Review/track the documented residual high dependency advisories and apply a supported compatible update before production exposure; CI does not pretend the audit is clean.
- Execute the configured GitHub Actions workflow on a hosted runner. YAML/commands passed local validation, but no hosted run was triggered or claimed.
- Before a fresh-host demonstration, restore/check PostgreSQL and `storage/listings` (plus preserved legacy media), including private evidence bytes. Same-instance restart is verified; disaster recovery is not.
- Use new current-workflow cases if legacy actor/acknowledgement/photo evidence is incomplete. Secure historical external-photo import and explicit legacy remediation remain deferred; no unsafe forced resolution.
- Expand exhaustive fuzzing/accessibility/codec/browser coverage and calibrate production ingress/rate limits, monitoring and storage infrastructure. Basic controls and specified browser widths are tested; exhaustive coverage is not claimed.

**Post-MVP features:** payments/refunds/deposit forfeiture, weighted trust scoring, government identity checks, AI condition/adjudication, support chat/email delivery, mobile apps and production analytics. None was automatically started.

**Mandatory gate: MVP CONDITIONALLY READY.** Core rental/admin/persistence/authorization scenarios pass with no observed remaining critical defect, but the advisory/hosted-CI/restore conditions prevent an unconditional MVP VERIFIED claim. Controlled local university demonstration is supported; production release readiness is not asserted.

## J. Files and commits

Milestone 5 created:

- `proxy.ts`
- `lib/auth-rate-limit.ts`
- `lib/listing-input.ts`
- `prisma/migrations/20261014030000_mvp_security/migration.sql`
- `tests/mvp-security.test.ts`
- `.github/workflows/verify.yml`
- `docs/milestone-5-report.md`
- `docs/security-assessment.md`
- `docs/demo-guide.md`

Milestone 5 modified:

- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `prisma/schema.prisma`
- `lib/api-response.ts`
- `lib/listing-media.ts`
- `lib/trust-profile.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/listings/route.ts`
- `app/api/listings/[id]/route.ts`
- `app/api/listing-media/[filename]/route.ts`
- `app/listings/[id]/page.tsx`
- `app/listings/[id]/edit/page.tsx`
- `app/customer-service/page.tsx`
- `components/create-listing-form.tsx`
- `components/edit-listing-form.tsx`
- `components/trust-profile.tsx`
- `tests/admin.integration.test.ts`
- `tests/rental-lifecycle.integration.test.ts`
- `tests/rental-browser.test.ts`
- `tests/moderation.integration.test.ts`
- `docs/milestone-4b-report.md`

Existing earlier milestone changes remain in the shared checkout; this list isolates the current task's changes. **At the end of Milestone 5 verification, zero commits had been created and nothing had been pushed, merged, deployed or published.** Subsequent GitHub publication is separately authorized by the user. The saved cloud setup draft is a separate review artifact; saving it does not prove fresh-environment restoration or publication.

## Captured review evidence

All images are synthetic isolated-test records from actually executed browser scenarios:

- [Completed rental on mobile](screenshots/milestone-5/completed-rental-mobile.png)
- [Admin Desktop on desktop](screenshots/milestone-5/admin-desktop.png)
- [Admin Desktop on tablet](screenshots/milestone-5/admin-tablet.png)
- [Dispute investigation](screenshots/milestone-5/dispute-desktop.png)
- [Marketplace on desktop](screenshots/milestone-5/marketplace-desktop.png)
- [Received reviews on tablet](screenshots/milestone-5/reviews-tablet.png)

The reusable cloud draft was saved with the ffprobe/private-storage prerequisites and current restart/testing policies. It requires publication through environment settings; saving the draft did not publish source/configuration or validate a fresh restored task.
