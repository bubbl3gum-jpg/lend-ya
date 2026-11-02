# Hustlen’ Functional Acceptance Audit

Audit run: 2 November 2026. This is an audit-only report; no application code,
feature gate, migration, existing application database, stash, commit, push,
merge, or deployment was changed. All database-backed reruns used new,
runner-owned `hustlen_test_audit_*` databases, which were removed by the runner.

## Executive result

**Overall: PARTIAL — not ready for comprehensive owner acceptance.** The current
owner checkout passes meaningful marketplace, rental API, Admin, moderation,
chat, migration, lint, type, and production-build checks. Its browser rental
journey also completed the normal request → handoff → receipt → return →
inspection → reviews path. However:

1. The owner checkout does not automatically require QR/GPS verification for
   ordinary new bookings. That behavior exists on the separate
   `87459cbc` mandatory-meetup candidate, not on the owner checkout.
2. The owner checkout’s restart/idempotency browser assertion reproducibly gets
   `409` rather than the expected idempotent `201` in two runs.
3. Optional video and virtual-camera acceptance could not complete because
   `ffprobe` and `ffmpeg` are not installed. These are test/environment
   blockers, not evidence that the validators accepted invalid media.
4. No physical-phone, onsite GPS, or deployed-production acceptance was
   performed.

This report distinguishes working code, tests executed now, historical evidence,
branch integration, and actual product/physical acceptance. A passing API test
does not establish the entire browser journey; a historical passing run does
not replace a current rerun.

## 1. Repository and worktree truth

### Remote revision map

| Ref | Exact revision | Relationship and state |
|---|---|---|
| `origin/main` | `f856dc360b332007dd79725ddee0d28102411521` | Remote main; the local `main` ref is stale and was not used as the current main baseline. |
| `origin/integration/hustlen-product-consolidation-20261102` | `0d88f4cd1f1aadb44792da24496888174115668d` | Consolidation plus audit/evidence documentation. `c136dc9a355138ea306faa41dd95514524d0fc87` is the reviewed application baseline before later documentation-only commits. |
| `origin/fix/mandatory-rental-meetup-integration` | `87459cbc169bc47b3fba2ef1e51577c4ef6968c9` | Mandatory bilateral GPS/QR integration candidate, based on the consolidated history. Not deployed; no Actions run was found for this ref. |
| `origin/fix/qr-meetup-acceptance-hardening` | `88af673e46603854006affee8e3dd783d5e14584` | Exact owner checkout revision, “Separate QR redemption and physical confirmation deadlines.” It is one commit ahead and nine behind `origin/main`, and is not an ancestor of `87459cbc`. |
| `origin/feature/temporary-local-meetup-testing` | `cf215e0bdda92d7874329f16102c2a9ebd20a1be` | Remote branch only; no local worktree was present. Its local uncommitted contents could not be inspected. |

The owner checkout at `/Users/yuiii/p2p-marketplace` was clean before this
report. The only other local worktrees were:

| Worktree | Branch / revision | Status |
|---|---|---|
| `/Users/yuiii/hustlen-qr-phone` | `fix/mandatory-rental-meetup-integration`, `87459cbc` | Clean; candidate tested separately. |
| `/Users/yuiii/hustlen-mrt-contrast` | `fix/ui-mrt-dark-dialog-contrast`, `87459cbc` | Deliberately left untouched; contains the separate, uncommitted MRT selector/CSS/browser-test changes from the earlier authorized task. It is not part of either clean candidate or the owner checkout. |

No separate local owner-handoff/QR-camera/temporary-location worktree was found.
The existing `stash@{0}` (“Save local package-lock before MRT preview”) remained
untouched. The owner checkout’s latest commit is committed QR timing work, not
the requested uncommitted package described in the prompt.

The current checkout is not a deployed-runtime attestation: the inspected local
owner checkout is `88af673`, but no evidence identifies what another Mac or a
production service is currently running.

### Integration and historical CI

- The mandatory automatic-enrollment implementation is present in `87459cbc`
  (`lib/meetup/enrollment.ts` and the booking creation route), absent from
  `88af673`, and has not been merged into the owner checkout.
- The candidate is 155 commits ahead of the owner checkout’s branch tip; these
  are branch divergence, not work performed today.
- The existing integration audit reports the latest successful GitHub workflow
  on `c136dc9` and a successful documentation/evidence revision at `0d88f4`.
  Those historical checks do not certify `87459cbc` or `88af673`. No current
  Actions run was found for either candidate.
- No merge, push, deployment, or owner acceptance is claimed.

## 2. Tests run during this audit

### Owner checkout — `88af673`

| Command | Result | Evidence / qualification |
|---|---|---|
| `npm test` | **PASS — 36/36** | Unit/contract suite on the exact owner checkout. |
| `npm run test:rental-api` | **PASS — 13/13** | Booking and rental API lifecycle, permissions, snapshots, evidence, completion, disputes, and reviews. |
| `npm run test:rental-browser` | **FAIL — reproduced twice** | Managed Chromium was supplied after the suite’s default `/usr/bin/chromium` path failed on macOS. In both runs the actual UI lifecycle and dispute subtests passed, but the post-restart idempotency replay at [`rental-browser.test.ts`](../../../tests/rental-browser.test.ts#L285) returned `409`, expected `201`. The handler’s replay path returns `409` when the saved request hash differs; the precise differing input was not captured. |
| `npm run test:meetup` | **PARTIAL** | Six meetup API/expiry/custody subtests passed. The virtual-camera browser subtest stopped before camera initialization with `spawnSync ffmpeg ENOENT`; it is not a current camera pass. |
| `npm run test:integration` | **PARTIAL** | First run could not start because this checkout lacked generated ignored Prisma Client files; after `npx prisma generate --config prisma7.config.ts`, the rerun reached listing creation but got `POST /api/listings 400` and timed out waiting for navigation at [`mrt-integration.ts`](../../../tests/mrt-integration.ts#L156). The test submits a video; `ffprobe` is absent, and [`listing-media.ts`](../../../lib/listing-media.ts#L87) requires it for MP4/WebM validation. Map selection/zoom and form interactions before submission did execute. |
| `npm run test:admin` | **PASS — 7/7 on rerun** | The first attempt used the Linux-only default Chromium path; rerun with Playwright-managed macOS Chromium passed API, authorization, navigation, responsive browser, and logout checks. |
| `npm run test:moderation` | **PASS — 10/10** | Reports, listing restrictions, disputes, immutable audit behavior, and desktop/mobile Admin controls. |
| `npm run test:mvp` | **PARTIAL — 8 passed, 2 subtests failed, parent failed** | The production build and TypeScript phase completed. The media fixture failed with `spawn ffmpeg ENOENT`; a following edit test then received `400` because the earlier failed fixture had not created its listing. The actual marketplace browser journey at mobile/tablet/desktop passed. |
| `npm run test:chat` | **PASS — 14/14** | Gated chat, moderation, privacy, restart, and two-user browser coverage under the test configuration. |
| `npm run test:stability` | **PASS — 8/8** | Retry, authentication isolation, evidence audit, transport-boundary, and conflict cases. |
| `npm run test:migration` | **PASS** | Current owner branch’s isolated historical/forward migration assertions completed successfully. |
| `npm run test:meetup-migration` | **PASS — 1/1** | Populated legacy records and historical bookings preserved; old bookings remain unenrolled. |
| `npm run lint` | **PASS** | ESLint on the owner checkout. |
| `npx tsc --noEmit` | **PASS** | TypeScript on the owner checkout. |
| Production build in `npm run test:mvp` | **PASS** | Next.js build and its TypeScript phase completed before the media test failures. |

The renter/owner browser subtest did reach the normal UI lifecycle and explicit
condition/receipt actions. The failed restart replay means that the entire
restart-and-recovery acceptance scenario is **not** a pass. The failure was
reproducible, not classified as intermittent.

### Mandatory-meetup candidate — `87459cbc`

| Command | Result | Evidence / qualification |
|---|---|---|
| `npm test` | **PASS — 202/202** | Unit, configuration, and contract checks; includes feature-gate and local test-location safeguards. |
| `npm run test:rental-api` | **PASS — 13/13** | Actual booking/rental API lifecycle on a fresh isolated database. |
| `npm run test:admin` | **PASS — 7/7** | Admin API and responsive browser checks with managed Chromium. |
| `npm run test:authorization` | **PASS — 8/8** | Shadow role checks and all tested legacy Admin API boundaries. |
| `npm run test:locations` | **PASS — 7/7** | Normal station checks plus explicit temporary-centre consent, privacy, expiry/revocation, and desktop/tablet/mobile browser behavior. |
| `npm run test:locations-production` | **PASS — 1/1** | Production-mode temporary-location refusal. |
| `npm run test:meetup` | **PARTIAL — 9 test records passed; 3 subtests failed and parent failed** | Virtual camera setup failed at `spawnSync ffmpeg ENOENT`. The two later preview-enrollment cases returned `403`: the camera subtest first starts a no-preview server, then the missing encoder aborts before its code restores the preview allowlist. These are cascading test-state failures; they do not establish that production participants were rejected. |
| `npm run build:verify` | **PASS** | Production build and TypeScript phase on the candidate, using a fresh runner-owned database. |
| `npm run lint` | **PASS** | ESLint on the candidate. |
| `npx tsc --noEmit` | **PASS** | TypeScript on the candidate. |

The candidate test rerun used the exact clean commit and a fresh disposable
database with all 33 migrations applied. Its earlier
[verification record](https://github.com/bubbl3gum-jpg/lend-ya/blob/87459cbc169bc47b3fba2ef1e51577c4ef6968c9/docs/meetup/mandatory-journey-20261102/VERIFICATION.md)
reports historical PASS results, including camera tests. Those historical
results are not substituted for this run, whose camera setup was blocked.

### Test environment and scope limits

- `ffprobe` and `ffmpeg` were not on the executable path. No packages or OS
  tools were installed during this audit.
- Browser suites that hardcode `/usr/bin/chromium` needed the already-installed
  Playwright-managed Chromium executable via the supported path override.
- All app/server browser runs use `next dev`; the production build passed, but a
  stable production-server browser comparison was not run. Existing
  `rental-browser.test.ts` and `meetup.integration.test.ts` launch their own dev
  server; no harness or application change was made to substitute `next start`.
- Current virtual-camera QR decoding therefore remains unverified. A virtual
  camera, even when working, is not physical-phone acceptance.
- Browser-emulated location is not onsite station calibration or proof of
  device-to-device distance. No real iOS/Android phone, station meetup,
  production database, or production service was used.

## 3. Functional status matrix

“Owner” means the current local `88af673` checkout. “Candidate” means the
separately tested `87459cbc` worktree.

| Feature | Implementation locations | Test performed / result | Remaining issue or boundary |
|---|---|---|---|
| Registration, login, logout, session persistence/expiry | Owner: `app/register/page.tsx`, `app/login/page.tsx`, `app/api/auth/{register,login,logout,me}/route.ts`, `lib/auth.ts` | Owner `test:mvp` authentication/session subtests and browser login/logout passed; `test:admin` verifies anonymous, ordinary, expired, and forged sessions. **PASS for tested flows.** | Not a complete acceptance of every browser/session-expiration timing edge. No production service checked. |
| Account/profile settings and password recovery | Owner: `app/account/page.tsx`, `app/api/account/route.ts`, `app/api/auth/forgot-password/route.ts`, `components/auth-form.tsx` | Account/profile and auth-related MVP subtests passed. The recovery endpoint returns a message that delivery is not configured. **PARTIAL.** | No password recovery delivery or authenticated password-change workflow exists in this owner revision. Candidate password-change work is a separate gated branch feature. |
| Listings, photo upload, edit, publish, browse/filter/detail/report | Owner: `app/listings/*`, `components/create-listing-form.tsx`, `components/edit-listing-form.tsx`, `app/api/listings/*`, `lib/listing-media.ts` | Owner MVP browser case passed real listing create/edit, browse filters, reporting, keyboard navigation, and responsive layouts. Rental browser fixtures also created photo listings. **PASS for tested photo path; video PARTIAL.** | The optional video validator requires absent `ffprobe`; full MRT integration stopped at listing publication. Invalid/valid video behavior needs rerun with the required media tool available. |
| MRT station search/map/availability | Owner: `components/mrt/MRTStationSelector.tsx`, `components/mrt/MRTMap.tsx`, `lib/mrt/*`, listing/booking routes | MRT unit tests passed; the current integration reached station selection, map zoom/reset, and listing form, but not completed publication. **PARTIAL.** | Full owner-revision browser selection-to-booking run is blocked by the video fixture failure. Eleven Circular Line coordinates remain intentionally unavailable and fail closed in the documented QR implementation. |
| Booking request, quotation, acceptance/rejection, cancellation, conflicts, history, price snapshots | Owner: `components/booking-form.tsx`, `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts`, `app/dashboard/page.tsx` | Owner `test:rental-api` 13/13 and browser lifecycle/dispute subtests passed. **PASS for these exercised paths.** | Durable same-key retry after server restart fails as recorded above; no evidence of duplicate booking was observed. |
| Owner/borrower evidence and pickup custody | Owner: `components/rental-evidence-form.tsx`, `app/api/bookings/[id]/handoff/route.ts`, `lib/meetup/service.ts` | API and browser lifecycle tests exercised owner evidence, borrower acknowledgement, permission/state checks, and evidence persistence. Owner preview meetup suite passed its non-camera custody tests. **PARTIAL.** | On `88af673`, ordinary new bookings do not automatically create a MeetupSession. Meetup enforcement only applies to explicitly enrolled preview bookings. |
| Mandatory pickup/return QR and location | Owner: `lib/meetup/service.ts`, `components/meetup-verification.tsx`; candidate automatic enrollment: [`lib/meetup/enrollment.ts`](https://github.com/bubbl3gum-jpg/lend-ya/blob/87459cbc169bc47b3fba2ef1e51577c4ef6968c9/lib/meetup/enrollment.ts), candidate booking route | Owner QR tests prove the preview protocol, not mandatory new-booking enforcement. Candidate API/rental and location tests pass; current candidate full meetup rerun is partial because camera setup was blocked and later test state cascaded. | Mandatory enrollment is not integrated into the owner checkout. Current camera decode is unverified. Candidate requires separate review and owner/device acceptance; it is not deployed. |
| Test-location mode and production gate | Candidate: `lib/meetup/test-location.ts`, candidate `tests/meetup-test-location.test.ts` | Candidate `test:locations` 7/7 and `test:locations-production` 1/1 passed. **PASS for the tested guard and simulated flow.** | Candidate-only; guarded simulation is not an MRT arrival or direct participant-distance measurement. No real device or production database tested. |
| Return, physical receipt, inspection, disputes, reviews, immutable history | Owner: `app/api/bookings/[id]/{return,inspection,dispute,reviews}/route.ts`, `components/rental-evidence-form.tsx`, Admin dispute routes | Owner rental API and browser subtests exercised return, separate owner inspection, dispute, completion, and bilateral reviews. Moderation suite passed 10/10. **PASS for the tested legacy lifecycle.** | For QR-enrolled candidate bookings, scan remains separate from physical receipt and inspection; candidate full browser QR run could not be rerun through camera acceptance. |
| Admin dashboard, users, listings, bookings, reports, disputes, audit | Owner: `app/admin/*`, `app/api/admin/*` | Owner Admin 7/7 and moderation 10/10 passed; responsive UI, navigation, authorization, reports, restrictions, disputes, and audit cases were exercised. **PASS for tested capabilities.** | No live administrator account/service or production authorization configuration tested. |
| Messaging/chat moderation | Owner: `app/messages/*`, `lib/chat/*`, `components/chat/*` | Owner `test:chat` 14/14 passed, including two-user browser, privacy, moderation, restart, and default-off gate tests. **GATED; tested under explicit test configuration.** | Passing tests do not mean general-user chat/reviewer access is enabled in production. Preserve the existing gates. |
| Customer Service / Support | Owner has the guidance page `app/customer-service/page.tsx`; candidate adds gated ticket/channel/staff candidates | Owner static guidance exists. Candidate Support code and unit contracts exist in the separate branch; no production support workflow was accepted. **PARTIAL / GATED.** | No evidence of staffed production coverage, real ticket delivery/escalation, or production access. |
| Identity, staff, passkeys/MFA, announcements/settings | Candidate-only foundations under `lib/identity/*`, `lib/authorization/*`, `lib/staff-read-pilot/*`, and candidate Admin routes | Candidate’s 202 unit checks and authorization 8/8 cover contracts/gates; Admin authorization checks passed. **GATED / prototype.** | No staff authority or passkey/MFA rollout is established. Do not treat route/component presence as enabled production capability. |
| Local Qwen/AI assistance, Vision, translation | Candidate prototype modules under `lib/local-inference/*`, `lib/assistant/*`, `lib/vision-prototype/*`, `lib/translation-sidecar/*` | Candidate unit/contract suite passed; tests use mocks/synthetic data and gate checks. **GATED / prototype.** | No live Qwen model, external Vision/translation provider, model quality/latency, or production integration was run or accepted. |
| Theme, visual consistency, responsive/accessibility | Existing evidence: [`FULL_UI_UX_AUDIT.md`](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/FULL_UI_UX_AUDIT.md), [`PAGE_CONSISTENCY_MATRIX.md`](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/PAGE_CONSISTENCY_MATRIX.md) | The existing audit records 798 successful screenshots across 804 observations, at 390/820/1440 CSS pixels and light/dark preferences, on the `c136dc9` baseline. It identified a dark MRT dialog contrast defect and shell/theme inconsistencies. **Historical visual evidence; not rerun as a new 798-shot audit.** | That defect is not fixed in `88af673`. The earlier uncommitted MRT fix is isolated in `/Users/yuiii/hustlen-mrt-contrast`, not integrated. Full current-branch screen-reader/WCAG/owner visual acceptance remains untested. |
| Migrations and data integrity | Owner `prisma/migrations/*`; candidate has 33 migrations | Owner migration and meetup historical-compatibility suites passed. Candidate fresh isolated DB tests applied all 33 migrations; the historical exact-main 8→33 preservation run is documented at `0d88f4`, not repeated here. **PASS for executed checks; historical upgrade evidence retained separately.** | No existing app database was opened, migrated, reset, or seeded. A fresh exact-main production-data clone and deployment-sequencing review remain outside this audit. |

### Existing design findings retained, not re-audited

The full UI audit and remediation plan already contain the page inventory,
screenshots, and acceptance details. They identify:

- Confirmed dark-mode MRT dialog title/help/results contrast (the audit labels
  this P0); the map’s light surface and official line colors are intentional.
- Inconsistent page-wide theme inheritance, including a dark header over light
  operational content and theme-insensitive loading/error states.
- Login/registration branding and wayfinding discontinuity.
- Listing create/edit presentation mismatch.
- Dense dashboard/booking stages and unclear owner/borrower next-action hierarchy.
- Admin’s useful grouped navigation but separate slate/emerald visual system.
- Loading, error, empty, disabled, and unavailable states that need consistent
  shell, locale, focus, and retry behavior.

The previous audit measured no document-level horizontal overflow in its
successful captures. It explicitly did not certify every zoom level, every
state, WCAG conformance, or product-owner visual acceptance.

## 4. Reproducible failures and security/data-integrity assessment

### Confirmed current-run failures

1. **Owner browser restart replay — reproducible 2/2.** After a successful UI
   rental lifecycle and server restart, replaying the stored booking request key
   returns `409` instead of `201`. The route compares a stored request hash
   before returning the original booking. The exact differing request field is
   not established; no booking duplication was observed. Evidence:
   [`app/api/bookings/route.ts`](../../../app/api/bookings/route.ts#L84) and
   [`tests/rental-browser.test.ts`](../../../tests/rental-browser.test.ts#L285).

2. **Owner video/MRT integration — environment-blocked.** The browser publishes
   a valid photo and synthetic video, but the API responds `400`; the host lacks
   `ffprobe`, which the code requires for video container inspection. The test
   consequently times out waiting for the listing detail navigation. This is
   not evidence of a station-selection defect.

3. **Camera test setup — environment-blocked, with candidate test-state
   cascade.** Both current branches stop virtual-camera acceptance at missing
   `ffmpeg`. On the candidate, the camera subtest has already restarted the app
   without preview allowlisting; its early exception prevents restoration, so
   later legacy-preview test cases return `403`. This is a test isolation and
   cleanup weakness following the missing tool, not proof that ordinary
   production users are incorrectly denied.

### Safety and integrity observations

- The owner branch’s QR engine is an opt-in preview. The review candidate
  explicitly documents that ordinary booking creation previously did not create
  a MeetupSession; `87459cbc` adds automatic enrollment and fail-closed
  configuration for new bookings. This is a **branch integration gap**, not a
  claim that the preview validator accepted an invalid QR.
- The candidate’s ordinary new-booking code forbids manual-code downgrade;
  QR verification alone does not change custody, and physical receipt and
  independent inspection remain separate. Those protections were not weakened.
- The location design documents that browser coordinates can be fabricated;
  GPS is supporting evidence, not spoof-resistant proof. Eleven station points
  remain unavailable and are not fabricated; unavailable readings fail closed
  or use only the separately authorized bilateral reduced-assurance policy.
- Executed Admin/auth tests did not reproduce unauthorized access. This is not
  a penetration test or a claim that every route/configuration is secure.
- No existing database or historical migration was modified. Migration tests
  and current test runs used only fresh, owned, disposable databases.

## 5. Severity classification and remaining dependencies

No implementation order is proposed. Severity describes impact in the
inspected state, not a release schedule.

| Severity | Finding | Evidence / dependency |
|---|---|---|
| **P0** | Ordinary new bookings in the owner checkout are not automatically gated by bilateral QR/GPS verification. | `88af673` only supports explicit preview enrollment; `87459cbc` contains the separate automatic-enrollment implementation. Dependency: integrate/review the correct candidate before claiming mandatory QR on the owner runtime. No automatic migration or retrofit of old bookings is implied. |
| **P0 (prior UI-audit rating)** | Dark MRT dialog title/help/result contrast is difficult to read in the audited dark mobile screenshot. | Confirmed by the existing `c136dc9` visual audit; current owner branch has no integrated correction. Separate uncommitted MRT fix remains isolated. |
| **P1** | Same-key booking replay after a server restart reproducibly returns `409`. | Two fresh managed-Chromium runs; `tests/rental-browser.test.ts` assertion at line 285. Exact payload/hash mismatch is still unproven. |
| **P1** | Shared theme/page-shell inconsistencies affect authentication, authoring, dashboard/booking, Admin, and loading/error states. | Confirmed on the existing audited `c136dc9` baseline; owner visual acceptance is still outstanding. Preserve Balanced Agricultural Luxury and functional map/QR contrast exceptions. |
| **P2** | Video and virtual-camera workflows cannot be fully verified in this environment. | `ffprobe`/`ffmpeg` absent; current integration/MVP/meetup failures and candidate follow-on test-state cascade recorded above. |
| **P2** | Full location coverage is unavailable for 11 Circular Line stations. | Existing coordinate audit reports 109/120 documented points; missing points fail closed. Requires official source reconciliation and onsite radius/exit calibration before claiming full station acceptance. |
| **P2** | Password recovery is not deliverable in the owner runtime. | The endpoint explicitly reports delivery is not configured; no authenticated password-change route was found in the owner checkout. |
| **P2** | The local owner checkout and candidate do not establish physical-device or deployed production acceptance. | No real iOS/Android devices, onsite GPS/camera, production server/browser run, deployment, or owner sign-off was performed. |
| **P3 / gated, not a defect** | Support, staff/identity/passkeys, AI/Qwen, Vision, and translation are prototypes or intentionally gated on the candidate. | Unit/contract checks validate selected boundaries; no activation, live provider, production staffing, or authority rollout is claimed. Preserve all gates. |

## 6. Screenshot and source evidence

- Existing audit index and its screenshots:
  [UI/UX screenshot index at `0d88f4`](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/ui-ux-audit-20261102/INDEX.md).
- Confirmed dark MRT screenshot from that audit:
  [borrower station dialog, dark, 390 px](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/ui-ux-audit-20261102/supplement/screenshots/borrower-station-dialog--dark--390.jpg).
- Current owner test’s actual rendered listing form/map capture (before
  submission; the suite later failed at video validation):
  [desktop-owner.png](../../../.test-artifacts/43775556c6991a82503ac3cb/screenshots/desktop-owner.png).
- Current integration server log:
  [server.log](../../../.test-artifacts/43775556c6991a82503ac3cb/server.log).
- Existing QR timing/device limits:
  [`MILESTONE3_1_QR_ACCEPTANCE.md`](../../MILESTONE3_1_QR_ACCEPTANCE.md),
  [`PHYSICAL_DEVICE_TESTING.md`](../../qr/PHYSICAL_DEVICE_TESTING.md), and
  [`verification.json`](../../qr/verification.json).
- Existing design system and remediation proposal:
  [DESIGN_SYSTEM_PROPOSAL.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/DESIGN_SYSTEM_PROPOSAL.md),
  [UX_REMEDIATION_PLAN.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/UX_REMEDIATION_PLAN.md),
  [UX_CONSOLIDATION_REPORT.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/product/UX_CONSOLIDATION_REPORT.md),
  [MERGE_READINESS.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/0d88f4cd1f1aadb44792da24496888174115668d/docs/design/ui-ux-audit-20261102/MERGE_READINESS.md).
- Mandatory meetup review and historical verification:
  [REVIEW.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/87459cbc169bc47b3fba2ef1e51577c4ef6968c9/docs/meetup/mandatory-journey-20261102/REVIEW.md),
  [VERIFICATION.md](https://github.com/bubbl3gum-jpg/lend-ya/blob/87459cbc169bc47b3fba2ef1e51577c4ef6968c9/docs/meetup/mandatory-journey-20261102/VERIFICATION.md).
