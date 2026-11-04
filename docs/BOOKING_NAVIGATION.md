# R7 participant booking navigation

2026-11-04. Checkout `/workspace/lend-ya-recovery`, branch
`recovery/candidate-validation-20261103`; initial clean local and independently
queried remote HEAD `f8c602c7ad3771b2c757cb5b4c2e276712fc23da`. Origin verified as
`https://github.com/bubbl3gum-jpg/lend-ya.git`, ancestry retained without resets.
Tested source is this revision plus the reviewed R7 changes committed with this
report. Read repository instructions, recovery/recheck reports, design contracts,
Next loading guidance, schema, actual dashboard/detail/actions, API and browser
assertions first. No original missing patch is claimed recovered.

## Already present versus changed

The candidate already queried **all** bookings where the signed-in user is the
owner or renter, independently of listing visibility. Both role sections and
direct `/bookings/:id` links existed; confirmed requests did not disappear.
Detail pages redirect unauthenticated callers and use participant checks;
nonparticipants see not-found, while booking API reads return 403. Detail actions
already depend on role/state and refresh after successful writes. The candidate
also has explicit handoff/receipt/return/inspection, separate evidence, disputes,
reviews, private bytes, durable replay and provisional workflows. These were
preserved, not replaced with an older simplified lifecycle.

R7 adds a small shared server-rendered `ParticipantBookings` component, with
visible active/history sections and counts under **My borrowings** and
**Bookings as owner**. Existing latest-created ordering is retained inside each
group. History is expanded, not hidden behind a filter or collapsed panel.
Each semantic booking article names its booking ID/status and links directly to
detail. Separate accessible group headings, group-specific empty messages and
the existing `#borrowings` anchor are retained/provided; `#lending` and role/group
anchors make the longer page navigable without changing the design system.
Cards retain the existing operational English body, USD serialization/display,
Taipei formatter and shared localized header. No broader heritage/theme rollout
or new translation claim follows.

Pending ordinary owner requests keep existing accept/reject/cancel controls.
Other lifecycle actions are reached through detail, where the full handoff,
return, dispute and inspection context is already available. This avoids
embedding evidence forms in every owner card with incomplete detail props.
Documentation-bound pending requests explicitly direct the owner to their
existing acknowledged ledger in detail before responding, rather than expose
a context-free inline approval that lacks the existing agreement header/context.
No acknowledgement, gate, API permission or transition rule was relaxed.

### Exhaustive state-to-group contract

`lib/booking-navigation.ts` uses a typed exhaustive `Record<BookingStatus,...>`;
the unit regression also compares it with the generated schema enum. Grouping
depends on persisted lifecycle state, not whether a date has passed.

| Actual schema state | Group for both roles | Existing workflow reached from detail |
| --- | --- | --- |
| PENDING | Active rentals | Owner accepts/rejects; participants can cancel. Documented requests retain exact ledger/review context. |
| CONFIRMED | Active rentals | Upcoming reservation; owner handoff, participant cancellation under existing rules. |
| HANDOFF_PENDING | Active rentals | Owner record saved; borrower receipt confirmation/verification remains separate. |
| IN_USE | Active rentals | Borrower return evidence; eligible participant dispute, existing meetup rules. |
| RETURN_PENDING | Active rentals | Return submission does not prove owner physical receipt; verified receipt precedes inspection. |
| INSPECTION | Active rentals | Owner inspection decision; concern prevents completion and permits dispute. |
| DISPUTED | Active rentals | Unresolved administrative review/custody obligations remain discoverable. |
| COMPLETED | Rental history | Preserved evidence and eligible verified reviews. |
| CANCELLED | Rental history | Includes rejection: there is **no separate REJECTED enum**. Detail retains cancellation actor/time/reason. |
| ADMIN_CLOSED | Rental history | Administrative returned closure/evidence retained, not normal completion/payment settlement or review eligibility. |

There are no separate ACCEPTED, ONGOING or RETURNED enum states. Their actual
representations are CONFIRMED and the custody/return/inspection states above.
Inactive/restricted listings do not remove authorized participant history.
Server authorization remains authoritative; UI grouping grants no permissions.

## Loading/error and mutation behavior

Existing route loading boundaries keep `role=status` / “Loading bookings…”.
Existing error messages/alerts remain. A real recovery defect was demonstrated:
boundary `reset()` alone, and a tested `router.refresh()` plus reset attempt,
could retain the failed server payload after database service was restored.
Dashboard/detail **Try again** now reloads the current URL, issuing a fresh GET.
It does not retry a POST or weaken error handling; a failed subtree's unsaved
input is not promised to survive this reload.

Successful inline approval/rejection still uses `BookingActions`' existing
`router.refresh()`. Detail mutations keep their existing refresh behavior.
Browser assertions require changed status/group and a unique correct booking
link, not only a successful HTTP status. A controlled 503 leaves a pending card
and visible error/retry controls; the subsequent real rejection moves it to
history. No lifecycle writer, reservation rule or idempotency logic changed.

## Executed acceptance

All database commands use distinct **fresh owned** `hustlen_test_*` targets on
a newly created local PostgreSQL 17 instance, via the unchanged isolated runner.
System `/usr/bin/chromium` existence/version was verified before browser runs.
No existing developer/production data, credentials or upload directories were
copied. New fixtures use actual participant APIs where practical:

- Existing two-party browser flow now reopens the unique booking from **both
  dashboards** at PENDING, CONFIRMED, HANDOFF_PENDING, IN_USE, RETURN_PENDING,
  INSPECTION and COMPLETED. The first full journey runs at 390px mobile width;
  detail/dashboard overflow and Taipei labels are asserted. Approval is made
  inline on the dashboard, then both detail links are followed.
- Existing real handoff, receipt, return, inspection and dispute assertions are
  retained. A distinct newly registered test actor is promoted to ADMIN **only
  inside the owned fixture database** to call the existing dispute resolution
  API. Actual DISPUTED → ADMIN_CLOSED records are reopened by both participants;
  no arbitrary state assignment fakes that path.
- New real rejection and borrower cancellation tests require CANCELLED history,
  post-mutation group refresh, correct links, inactive listing history, retained
  zh-TW cookie/shared header and Taipei formatting. Unrelated users cannot see
  dashboard links, read booking JSON, or see private detail/listing data.
- Next's streamed `notFound()` may have HTTP 200 (unstreamed 404): the test
  requires the actual 404 heading and absence of listing details, while API 403
  remains exact. This framework status behavior is not an authorization grant.
- Loading is exercised by an observed real SELECT lock wait. Load errors use a
  temporary table rename **only within the owned synthetic database**, restored
  in `finally`, without row changes or constraint disabling. Dashboard and detail
  recover through their actual retry buttons after restoration. No such fault
  injection or test hook is added to application code.
- The existing agreement browser suite additionally checks a documentation-bound
  pending owner card leads to its ledger, approval remains explicit on detail,
  and the confirmed booking stays in the active group. Existing desktop/zh-TW/
  mobile agreement assertions remain. Existing R4 synthetic 1979 full-row
  immutability/display and R3 lost-response/restart/replay tests remain intact.

| Check | Actual result / target |
| --- | --- |
| `TZ=UTC npm run test:unit` | Pass, 215 tests, zero failures/skips (214 prior + exhaustive navigation classification). |
| `npm run typecheck` | Pass, full Next type generation and project tsc, final application/test source. |
| `npm run lint` | Pass, no diagnostics, final application/test source. |
| `TZ=UTC npm run test:rental-browser` | Pass, 7 tests, zero failures/skips; final unchanged-application-source `hustlen_test_r7_browser_acceptance_20261104`. All ten actual states, both participant paths, mobile/locale/privacy, real approval/rejection/cancellation/closure, load recovery and original replay/history assertions execute. |
| `TZ=UTC npm run test:rental-api` | Pass, 20 tests, zero failures/skips; `hustlen_test_r7_api_20261104`. Includes actual lifecycle, pricing/time/replay, privacy and R5 concurrency/atomicity checks. |
| `TZ=UTC npm run test:rental-documentation` | Pass, 1 test, zero failures/skips; `hustlen_test_r7_documentation_20261104`. Includes new mobile owner ledger navigation/explicit approval and persistent confirmed card. |
| `TZ=UTC npm run build:verify` | Pass, exit 0; `hustlen_test_r7_build_20261104`. All 33 migrations applied, full production compilation, typing, static generation and final route report completed. This is not compilation-only or an empty-schema build. |

Earlier runs are not hidden:

1. `hustlen_test_r7_browser_20261104` failed: the new broad link selector matched
   both booking and existing Customer Service links, causing dependent completion
   assertions to fail; real dashboard retry also failed. The selector now targets
   the booking href explicitly; all existing lifecycle assertions remain.
2. `hustlen_test_r7_browser_retry_20261104` failed after all-state journey passed:
   the new private-page HTTP-404 assumption was wrong for streamed not-found,
   and refresh/reset still did not recover the read error. Semantic privacy and
   exact API denial assertions were added/retained; fresh GET retry fixes tested.
3. `hustlen_test_r7_browser_final_20261104` was **not valid final-source evidence**:
   an application edit during the running suite briefly selected the existing
   Booking documentation field on Listing, then corrected it. The resulting
   dashboard error/cached response broke two subtests. The mistake is corrected;
   the seven-state journey, error recovery and historical checks passed in that
   attempt, but the overall run failed. Stable-source rerun uses a new database.
4. `hustlen_test_r7_browser_stable_20261104` failed only the new locale assertion:
   `header` matched the shared masthead and two existing sheet headers. The test
   now selects `header.catalogue-masthead` explicitly and still requires the
   Chinese Browse label. All lifecycle, dispute/closure, load recovery and
   historical subtests passed; overall failure remains recorded. A final fresh
   run must pass the entire suite, including this corrected locale/privacy path.

The browser parent deadline is now 240s instead of 120s because this suite adds
both-dashboard navigation for every state, real moderation/cancellation paths
and two fault-recovery journeys. Individual Playwright assertion deadlines and
all original assertions remain. This is bounded added workload, not a suppression
of failing checks. No physical phone/on-site GPS or production activation is
claimed; existing synthetic verification/location helpers remain test-only.

## Cleanup, limits and handover

**R7 / original Prompt 4 acceptance: Pass** for the scoped participant navigation.
Final acceptance browser 7/7, rental API 20/20, agreement browser 1/1 and units
215/215 passed with no skips, plus full typing, lint and full prepared-DB build.
The four earlier failed browser attempts are retained above; none is relabelled
as passing. No API/lifecycle/pricing/time/idempotency/gate or history migration
change was needed. The actual defect fixed beyond grouping was GET-error retry;
no separate lifecycle defect blocked the final journey.

Independent maintenance query returned zero `hustlen_test_*` databases on the
new temporary PostgreSQL instance. All **eight** R7 runner manifests record
`preserved: false`: four failures documented above and four successful final
browser/API/agreement/build runs. `storage/listings` contains zero files.
The new temporary PostgreSQL container was stopped and removal independently
verified. Cleanup used the unmodified target/ownership/recorded-upload guards;
no existing developer/production database or unrelated upload was reset/removed.
Diagnostics/screenshots remain ignored under `.test-artifacts/` and `/tmp`;
application code contains no fault-injection paths. Separate baseline/migration,
dependency audits and unrelated provisional suites are not repeated: schema,
setup, dependency metadata and feature gates are unchanged. Prior evidence is
attributed in `STABILIZATION_RECHECK.md` rather than presented as fresh.
The inherited all-history query remains unpaginated; large-volume performance
and wider visual acceptance were not established by these synthetic journeys.
Pending ordinary cards retain their existing meetup guidance panel, which can
make a long request list tall; compacting/reworking that evidence UI was not
part of this navigation fix.

Known differences stay open: builds need initialized application tables;
empty-schema build fails; the dated R2 review retains one minimatch advisory
(16 propagated moderate dev-tool package entries, zero production audit findings
at that review); default duration is configurable **90 days**, not the earlier
30-day proposal; overlapping pending requests are permitted and acceptance
reserves; historical correction remains unjustified without provenance. These
do not establish production readiness or complete application security.

Next is **assessment of original Prompt 5**, not its implementation. Compare the
candidate's actual separate owner handoff, borrower physical receipt, borrower
return, verified owner return receipt, inspection/condition evidence, photos,
timers and acknowledgements against that prompt before proposing changes.
Preserve current immutable evidence, claims/moderation boundaries, replay,
participant privacy and all feature gates. Navigation acceptance does not prove
real-world device/GPS performance, operational delivery or visual approval, and
does not authorize redesigning custody/evidence or enabling provisional features.
