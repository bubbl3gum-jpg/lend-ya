# Actual verification and scope

Implementation `fa5b3e3dc81b4727c063aad6fe50ba601b0734fd`; separate normal-build font correction `4a723a95d7fe712ea0c648307f3fe14983aa7f05`.

**16/16 selected final isolated command groups pass, 130/130 unit tests pass.** TypeScript, lint (no warnings), Prisma validation and the **normal production build** pass without the prior font substitution. The coordinator explicitly deleted NEXT_FONT_GOOGLE_MOCKED_RESPONSES before child launch. No new schema or migration required. Exact UTC timings, run IDs, exit counts, target ownership and cleanup markers: `regression-ledger.json`.

| Command (`npm run …`) | Actual final result |
| --- | --- |
| `test:unit` | 130 pass, 0 fail; five new window/notification/preview/vision/eKYC/read-only checks |
| `test:meetup` | 12 pass, original genuine virtual-camera pickup/return decoding and negative camera/GPS/QR/consent/receipt checks intact; one added inspection participant/browser scenario |
| `test:meetup-session` | 6 pass |
| `test:integration` | Exit 0, original MRT/logout/login and strict browser collection |
| `test:login-readiness` | 1 pass, original deadlines; historical overlap intermittence not closed |
| `test:authorization` | 8 pass |
| `test:staff-session` | 13 pass |
| `test:mfa` | 16 pass |
| `test:admin` | 7 pass |
| `test:rental-api` | 13 pass |
| `test:rental-browser` | 4 pass, actual browser and restart |
| `test:account-security-ux` | 1 pass |
| `test:chat` | 14 pass |
| `test:support-channels` | 9 pass |
| `test:support-staff` | 15 pass, includes actual 13A companion customer/native-passkey assigned-channel/privacy/browser workflows |
| `test:support-staff-production` | 1 pass, normal compile/start; new inspection page/API and old Support candidates 404 despite configured flags |
| `build:verify` | Normal production build exit 0, no remote font/test substitution |

## Required scenario coverage

1. Real owner login/own returned rental: actual new HTTP/browser path after existing geofence/QR/explicit receipt API.
2. 24h deadline: exact UTC duration asserted from returned source; half-open boundary, future/missing proof and after-window cases in pure function used by server.
3. Repeated GET preserves identical deadline; no browser clock/start override accepted.
4. Claim before physical receipt returns 409; even verified QR scan alone leaves return timestamp null until explicit receipt.
5. Late/exact-boundary window closes in unit arithmetic; server claim eligibility directly uses that function and rechecks before release. No 24-hour sleep, forged aged receipt or in-place historical timestamp edit. An aged real-server booking fixture was not created; do not claim that distinct integration trial.
6–7. Foreign account GET 404/byte evidence 403; actual borrower gets only own booking evidence/allegation and opposing OPEN-dispute response preview. Wrong participant claim/response mode denied.
8–10. Checked-in explicit synthetic delivered/queued/failed fixtures test 48h arithmetic, missing/failed event absence, unenforceability and no automatic liability. Actual case responseDeadline null; no real delivery proof, so no enforceable deadline activated.
11. Test explicitly invokes existing legacy owner dispute API separately (not from preview). Status becomes DISPUTED, original return receipt/time and custody remain acknowledged in new read model.
12–13. Original stored evidence IDs/stages/uploader/timestamps/byte digests unchanged across preview/dispute sequence; byte reader independently denies outsider and allows actual participant. New route has no upload/replacement path.
14. Fresh real login, successful protected read, actual logout and denied subsequent read; invalid token denied. Suspended borrower still reads/prepares existing-obligation response without receiving new marketplace authority.
15–16. Financial state NOT_IMPLEMENTED; preview submitted=false, financialAction=false; no mutation/inference calls in feature source; vision/eKYC executors always throw. No valuation, deduction or provider.
17. Existing scoped Support/13A, assignment/audit/native MFA/private channel suites pass unchanged.
18. Synthetic VERIFIED/verified=true cannot satisfy identityAuthorizationUnavailable; no real identity processing/gate introduced.

Real browser owner/borrower draft preparation, server validation, desktop/tablet/mobile, keyboard focus and no overflow. Positive new-page console/page/HTTP errors remain failing; no blanket suppression or deadline increase. New client timeout is a bounded failure limit for the new read/preview request, not a test-deadline change. Six actual captures in SCREENSHOTS.md. Core inspection operational text is English; no full Chinese UX or physical-device/screen-reader certification claimed.

## Initial outcomes and preservation

No initial automated failures in this batch. First normal font build and initial full meetup passed. Full meetup rerun adds real logout/suspended/provenance/error assertions; all 12 pass. Final normal build/type/lint include the later protected original-booking-record link and allowlisted client error copy. Screenshot captures precede only that additional navigation link; main inspection state/forms/provenance are unchanged. Historical 13A font failures are not attributed to this batch. `initial-outcomes.json` preserves initial successful run separately; no successful rerun disguises a failure.

Final guarded read-only cleanup: zero owned 13B DBs and zero marked test principals (`cleanup.json`). Each changing run created a distinct new owned disposable target and removed its own DB/uploads, including normal build checks. No existing application DB modified or migrated. Original migrations replayed only there. `source-preservation.json` checks 128 unchanged core/historical files, unchanged legacy proxy/harness policy after additive gates/flags, and byte-identical original full meetup assertions/deadlines after removing the added scenario/config. Schema, migration history, dependency lockfile, auth/QR/GPS/camera/custody, evidence byte route, dispute writer, Support/13A and original AI/review packet preserved. Only Stage 10 roadmap references changed; original 14 objectives/order and Stage 6–9 sections intact.

Selected ledger is not every repository suite or independent security/device/visual acceptance. Actual structured submissions, notifications, supplemental uploads, global production deadline enforcement, eKYC/Vision, full recovery and all financial capabilities remain blocked. No push, merge or deployment.
