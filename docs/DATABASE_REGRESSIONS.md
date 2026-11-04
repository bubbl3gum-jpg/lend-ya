# R5 database and concurrency regression evidence

Date: **2026-11-04**. Source baseline:
`3def2e5fca40d732f0c9661155a836798d2defc3`, plus the test/documentation changes
committed with this report. Checkout `/workspace/lend-ya-recovery`, branch
`recovery/candidate-validation-20261103`; initial local/remote HEAD matched and
working tree was clean. Applicable instructions and recovery, setup, booking,
API/lifecycle, stability, browser and MRT assertions were inspected first.
No original missing patch is claimed recovered; these are focused reconstructed
regressions on the preserved broader candidate.

## Policy and coverage map

The interval reservation rule is half-open: `existing.start < requested.end`
and `existing.end > requested.start`. Overlapping **PENDING requests are allowed**.
CONFIRMED overlaps prevent acceptance/new requests; custody/dispute statuses
retain the existing broader availability restrictions. Nothing here changes
those rules, strict new API instants, elapsed-day Decimal billing, 90-day/2000
UTF-16-unit defaults, feature gates, evidence or historical rows.

| Guarantee | Existing coverage reused | Added/strengthened R5 assertions |
| --- | --- | --- |
| Strict inputs, ordering/past start, policy and authoritative exact quotation | `bookings.integration.test.ts` rejects invalid inputs, tests policy/price boundaries and server snapshots despite client price/actor/status tampering; `booking-time.test.ts` covers calendar/offset/rounding boundaries. | Existing assertions retained and executed. No competing time/price implementation. |
| Taipei input/storage/display across host zones | Existing API asserts Z storage; `rental-browser.test.ts` runs UTC server/Los Angeles borrower/Honolulu owner, plus synthetic historical snapshots from R4. | Browser suite rerun unchanged; no historical correction. |
| Pending requests vs reservations | Existing API permits two overlapping PENDING requests; its old acceptance race uses `Promise.all` and final reservation count. | New `support/reservation-regressions.ts` creates four otherwise eligible requests (including overlapping pairs) through the API, then asserts all PENDING with one session/event each. |
| Exact adjacency/1ms overlap/equivalent offsets | Prior nonoverlap coverage had large gaps between dates. | API acceptance confirms adjacent intervals with equal persisted boundary instants. Equivalent Z/+08/-05 pairs differing by 1ms overlap identically; both lose acceptance with 409 and remain PENDING. Full lifecycle snapshots stay unchanged after denial. A new overlapping request after confirmation also leaves snapshots unchanged. |
| Conflicting/nonconflicting concurrent acceptance | Old `Promise.all` race alone did not establish intended contention. | A separate owned connection holds the actual Listing row. Both API requests must be observed in `pg_stat_activity`/`pg_blocking_pids` before release (including queued soft blockers). Conflicting outcomes are 200/409, persisted CONFIRMED/PENDING; adjacent outcomes are 200/200, both CONFIRMED. Complete terms except intentional status/updatedAt changes, exact booking sets, and one enrollment/session per booking are asserted. Business-conflict retry remains 409. |
| Real serialization/MVCC failure and explicit retry | MRT's existing `removalRace` observes a booking blocked behind the real station-edit handler; R3 covers post-lock start expiry. | A SERIALIZABLE new booking waits on Listing, observed before the blocker commits a **real updated row version**. No raised/mock SQLSTATE: PostgreSQL aborts with 40001, API returns controlled 409 `STATION_UNAVAILABLE`, and seven-table snapshots show no operation/binding/enrollment/evidence. Same-key explicit retry succeeds using the new authoritative 13.37 price. |
| Durable replay/isolation/restart | Existing API/stability cover same-key/altered-payload/actor scope; existing browser drops a committed response then restarts the app and replays under changed/malformed policy. | New retry is accepted, then equivalent-offset replay returns that same CONFIRMED booking; altered payload and unrelated actor fail without any snapshot changes/duplicates. Assertions require exactly the expected booking IDs and one session/NEW_BOOKING_VERIFICATION event. |
| Atomic enrollment and documentation | Existing documentation test failed immediately after Booking insert, before enrollment; original status/custody/evidence/inspection tests remain. | A fixture-only AFTER INSERT MeetupEvent failure occurs after Booking and MeetupSession writes. Full rows of Booking, MeetupSession, MeetupEvent, DevDocReviewContext, Handoff, Return and BookingEvidencePhoto must equal the pre-operation snapshot. The existing documented-request test now fails at that later point too, including its actual acknowledged context/binding; same-key retry reuses the context successfully with one session/event. These synthetic persistence failures are not presented as real MVCC failures. |
| Inactive listing history/authorization | Existing participant-only detail/evidence tests and R4 inactive synthetic browser history. | After deactivation, owner and renter can GET detail and find the booking in their histories. Outsider detail is 403; public/borrower/outsider listing GET is 404; owner listing GET is 200. New creation/acceptance are 409; full lifecycle rows remain unchanged. |
| Owned cleanup on success/failure | `run-isolated.ts`, `support/test-database.ts`, `baseline.ts` verify effective target, CREATE-only adoption refusal, ownership marker and recorded uploads. | Unmodified baseline failure child rerun to exercise cleanup against a preserved parent database/upload sentinel; independent post-run database/upload/manifest checks recorded below. |

### Synchronization and limits of evidence

New races use bounded database observation (three-second deadline, 20ms polling),
not a sleep/`Promise.all` assumption. Poll delays only schedule observations;
the lock is released only after the required waiters are seen. Blockers always
roll back/release and outstanding requests settle before connections close.
Fixture trigger functions are removed in `finally`; the existing owned runner
alone removes fixture databases and recorded uploads. Snapshots exclude sequence
counters: PostgreSQL sequence allocation is intentionally not transactional.
They compare complete persisted rows, including request hashes/bindings.

The stability case named “a database deadlock” **injects SQLSTATE 40P01** via a
trigger. It proves error translation/rollback, not PostgreSQL deadlock detection.
Earlier R3 report wording calling that a real deadlock is corrected. R5's new
real MVCC case fills the genuine transaction-failure gap. It does not claim a
new real booking deadlock-cycle or stress/load test. No automatic retry policy
was introduced: new uncommitted serialization failures return the existing
controlled 409; explicit retry can succeed, while an already committed matching
operation can replay through the existing recovery path.

## Execution

All database suites use separate fresh owned names on a new temporary PostgreSQL
17 instance. No credentials, database dumps or real environments are required
in source. For an approved local disposable service, set `MRT_TEST_DATABASE_URL`
to a **new** local `hustlen_test_*` target per command and set
`MRT_BROWSER_PATH=/usr/bin/chromium` where applicable. Existing runner ownership
requirements must be retained; never reuse a developer/production target.
Chromium executable existence/version was checked before browser execution.

| Command | Result / isolated database |
| --- | --- |
| `TZ=UTC npm run test:rental-api` | **Pass**, 20 tests, zero failures/skips, both initial `hustlen_test_r5_api_20261104` and final stronger complete-terms/exact-booking-set run `hustlen_test_r5_api_final_20261104`. |
| `TZ=UTC npm run test:stability` | **Pass**, 8 tests, zero failures/skips; `hustlen_test_r5_stability_20261104`. |
| `TZ=UTC npm run test:rental-documentation` | **Pass**, 1 test, zero failures/skips, initial `hustlen_test_r5_documentation_20261104` and final `hustlen_test_r5_documentation_final_20261104`. Initial run exposed a pg deprecation warning from parallel snapshot queries on one Client; sequential reads removed it, verified in the final passing run. |
| `TZ=UTC npm run test:rental-browser` | **Pass**, 5 tests, zero failures/skips; `hustlen_test_r5_browser_20261104`, including lost-response retry, restart/changed policy, permissions and unchanged synthetic historical rows. |
| `TZ=UTC npm run test:integration` | **Pass**, exit 0, 10 recorded check groups and zero browser errors; `hustlen_test_r5_mrt_20261104`. Real station-only and full-form races each observed blocked booking behind actual edit; edit 200, booking 409. Includes 120 mappings/legacy IDs/FKs, map/mobile/browser and completed lifecycle checks. |
| `TZ=UTC npm run test:baseline` | **Pass**, exit 0; `hustlen_test_r5_baseline_20261104`. Repeated setup preserves all 76 public tables across 33 migrations. Deliberately failing owned child exits 1 as expected; its database/upload removed while parent rows/ownership/upload remain intact. |
| `npm run typecheck` | **Pass**, full Next type generation and project tsc, including final test-only assertion/read changes. |
| `npm run lint` | **Pass**, final source, no diagnostics. |
| `TZ=UTC npm run test:unit` | **Pass**, 209 tests, zero failures/skips. |

PostgreSQL's local verbose error log independently recorded
`40001: could not serialize access due to concurrent update` during the new
observed MVCC case. It also recorded read/write-dependency serialization errors
from existing same-key contention, correctly handled by the existing replay
path. The later fixture error `P0001: R5 synthetic post-enrollment failure` is
recorded separately and is not evidence of a real serialization failure.

No application, dependency/lockfile, migration/schema, runner, configuration or
policy change was needed. Clean installation/full build were not repeated in R5:
R4's full initialized-isolated-database build at the unchanged application source
remains dated evidence, not a newly run R5 build. Baseline itself exercises
generation/migration/setup. No separate migration/API feature-gate activation or
unrelated browser suites are implied. The **empty-schema build failure remains
open and unchanged**, independently of successful prepared-database builds.

## Cleanup, acceptance and R6 handover

**R5 acceptance: Pass.** No application defect was demonstrated; only focused
tests and evidence documentation changed. All executed suites passed; there
were no unexpected failing attempts. The initial documentation warning and
its corrected rerun are reported above. The deliberate baseline child failure
is an asserted failure/cleanup test, not an unreported broken acceptance check.

Independent maintenance query on the newly created PostgreSQL instance returned
zero `hustlen_test_*` databases after all suites. Eight R5 parent manifests have
`passed: true, preserved: false`; the intentional child
`hustlen_test_baseline_failure_345a174996ba64bcdf055992` has
`passed: false, preserved: false`. The baseline itself asserts its child's
database/upload are absent while its parent sentinel rows, marker and upload
remain unchanged; the parent subsequently cleans itself normally.
`storage/listings` contains zero files. The new temporary PostgreSQL container
was stopped and removal independently verified. No existing developer/production
database was used, reset or cleaned. Ignored `.test-artifacts/` diagnostics and
session-local `/tmp/lend-r5-*.log` remain for review; no credentials, generated
artifacts or uploads belong in this commit.

Next is **R6: historical timestamp risk assessment** using authorized provenance
and synthetic fixtures only. R5 demonstrates current behavior and preserves
existing rows; it cannot establish which old real bookings were affected or
justify a blanket shift. No production access/correction was performed.
