# Stabilization 02 — booking replay and test isolation

Candidate: `stabilization/baseline-20261102`, base `87459cbc169bc47b3fba2ef1e51577c4ef6968c9`, worktree `/workspace/lend-ya-stabilization`. Read `01_BASELINE_ENVIRONMENT.md` before work. Changes are uncommitted. All database runs used new runner-owned databases in the isolated Task 1 PostgreSQL container; the runner removed each database and its recorded uploads. No historical migration, live database, production setting, or authorization gate was changed.

## Root causes and reproduction

### Restart replay 409 — test fixture defect, not the reported server replay defect

The baseline browser suite on UTC returned 4/4 passing. On the unmodified candidate, `TZ=Asia/Taipei ... npm run test:rental-browser` reproduced the audit's exact `409 !== 201` at the post-restart replay assertion: exit 1, 2 passed, 2 failed (the parent counts as a failure); the UI lifecycle and dispute subtests passed. The browser submitted start `2035-01-01T10:00` and end `2035-01-02T10:01` as Taipei wall time; the server normalized them to `2035-01-01T02:00:00.000Z` and `2035-01-02T02:01:00.000Z`. The test retrieved PostgreSQL `TIMESTAMP WITHOUT TIME ZONE` values through node-postgres, which interprets them using the test process timezone, then rebuilt the retry from those parsed values. Under Asia/Taipei it sent `2034-12-31T18:00:00.000Z` and `2035-01-01T18:01:00.000Z`, eight hours earlier. A live fixture query confirmed the reconstructed hash differed from the stored hash. The idempotency key remained the persisted key, the station was `taipei-main`, and empty notes normalized to null; the dates explain this reproduction. The historical Mac audit did not record its exact payload or timezone, so this establishes the candidate's reproducible cause, not the unobserved original Mac payload.

The server hashes the listing, UTC-normalized dates, numeric and canonical station, trimmed notes, and applicable documentation acknowledgement; it scopes the key to the renter and stores the hash with the booking. Identical normalized terms return HTTP 201 with the existing booking, including its current lifecycle state and persisted price snapshots, even after restart or a listing price change. A different hashed term returns 409. Concurrent creation is protected by database uniqueness and transaction handling. The response is the existing current booking representation, not a byte-for-byte replay of the original response.

### Conflicting quote — separate application defect

The original hash deliberately excludes `expectedQuote`; replay previously returned before checking it. An additional API test submitted the same key and terms with `expectedQuote: "stale"` and reproduced **201 instead of 409** (exit 1; the new subtest and parent failed). A quote is a price precondition, not the current listing price. The route now checks any supplied replay quote against the original booking's persisted daily price, total and deposit and rejects a conflicting value with 409. Existing hashes and matching retries remain valid without a migration; listing price changes do not invalidate a matching original quote. When no quote is supplied, the existing API permits it, since historical hashes do not record whether a quote was present; unknown request fields also remain outside the normalized identity. Thus the contract is equality of accepted booking terms and any supplied quote, not byte-for-byte JSON identity. This compatibility boundary cannot establish whether optional fields were originally present.

### Preview 403 — test isolation defect triggered by an environment failure

The camera subtest restarted its shared dev server with no preview allowlist for the mandatory-new-booking flow. Missing FFmpeg caused an exception before it restored `ids`; node:test continued to subsequent subtests, whose legacy `prepare()` enrollment requests received 403. These were correct authorization responses to leaked test configuration, not evidence of a production authorization defect. Reproduced before the change with a task-local fake `ffmpeg` exiting 71: the camera setup failed, both following legacy cases failed `403 !== 200`, and camera-only mode additionally dereferenced an unavailable QR payload. No application privileges were enabled.

After the change, the same injected failure still causes exit 1 for the two actual encoder-dependent cases, but the manual-code recovery subtest passes and the camera-negative case gets past preview enrollment to its own encoder failure. The parent remains failed, as required. This verifies early-failure isolation; it does not claim all possible process termination or machine failures are recoverable.

## Changes

- `app/api/bookings/route.ts`: check supplied replay price precondition against the persisted snapshot; retain the existing request hash and key scope.
- `tests/rental-browser.test.ts`: capture the real submission and key, replay it after restart and listing-price change, check immutable price values, duplicate count and changed-term/price conflicts.
- `tests/bookings.integration.test.ts`: concurrent same-key creation, normalized date/notes replay, changed notes/date/price and anonymous negative checks; assert exactly one booking.
- `tests/meetup.integration.test.ts`: restore the test server's preview allowlist in a `finally` block after the normal-booking camera case, close the camera and manual browser resources after failures, track camera-negative browsers, and avoid dereferencing a nonexistent QR in camera-only failure mode. The existing ordinary-booking no-preview startup and its QR/GPS assertions are retained.
- This report. Task 1 report remains untracked from prior work.

## Verification

All commands used this candidate and fresh disposable `hustlen_test_task2_*` databases. Full logs are in `/workspace/scratch/task2-*.log` within this environment.

- Baseline UTC `npm run test:rental-browser`: PASS 4/4. Baseline `TZ=Asia/Taipei npm run test:rental-browser`: FAIL 2 passed, 2 failed (including parent), replay `409` versus `201`; database removed.
- Early revised `TZ=Asia/Taipei npm run test:rental-browser`, with TypeScript and lint running concurrently: replay returned 201 and five changed-term requests were intended for final coverage; at that point four returned 409. The existing image scroll check subsequently hit a detached element and its sibling was cancelled on the existing 120-second parent timeout; exit 1. No timeout or assertion was relaxed. Standalone rerun before the price-precondition route change: PASS 4/4.
- Injected fake-FFmpeg `npm run test:meetup-camera`, before and after: expected exit 1. Before: encoder failure, two `403` cascades and a parent QR-payload error. After: manual recovery passed, second preview case reached its own injected encoder failure; parent still failed. No skips or failure suppression.
- `npm run test:rental-api`, after all code changes: PASS 14/14, including same-key concurrency, single row, normalized date and notes, changed terms, stale quote and unauthenticated request.
- `npm run test:authorization`: PASS 8/8, including anonymous/ordinary-user and future-role denial, revocation, suspension and session checks.
- First `npm run test:meetup` without `MRT_BROWSER_PATH`: FAIL 11 passed, 2 failed including parent. The 13B inspection-preview case attempted an uninstalled Playwright-managed Chromium; all other subtests including virtual-camera and camera negatives passed. An explicit system Chromium path resolved that subtest on rerun.
- `npx tsc --noEmit`: initial test-edit run failed on two test typing errors; corrected and final exit 0.
- `npm run lint`: final exit 0. `git diff --check`: exit 0.
- Final `TZ=Asia/Taipei npm run test:rental-browser` after the quote fix: PASS 4/4, no skips; same actual request returned 201 and original booking after restart and price change, and five changed date/station/notes/quote variants returned 409. The suite also completed the UI rental and dispute paths.
- Final `MRT_BROWSER_PATH=/usr/bin/chromium npm run test:meetup`: PASS 13/13, no skips. This includes no-preview mandatory enrollment and non-downgrade negatives, GPS/QR, expiry and restart, virtual camera, manual-code recovery, invalid QR and camera cleanup. The initial missing-managed-browser failure is retained above.

## Remaining risks and assessment

**PASS for the scoped stabilization checks**, subject to owner review. Replays compare normalized business terms, not exact JSON bytes; optional `expectedQuote` presence itself cannot be reconstructed for historical requests, and a missing quote remains accepted when the stored terms match. A supplied quote is now checked against the stored snapshot. The intentionally injected setup-failure run is expected to fail and does not certify a functioning camera; the separate real-FFmpeg run passed. The earlier browser detached-element/timeout is an observed test instability; it did not recur in two standalone browser runs and its cause was not proven. macOS browser configuration, physical phones and onsite GPS were not tested. The worktree has not been committed, pushed, merged, or deployed. Stop for owner review.
