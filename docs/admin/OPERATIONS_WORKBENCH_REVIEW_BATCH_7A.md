# Operations Workbench — Batch 7A independent review

24 October 2026 (Asia/Taipei). Baseline: clean **feature/admin-own-session-security-overview-batch-6c**, exact final SHA **ca2d374b07b0346241318002bf786ef7ce6a0b91**, parent **d9bac9c0d6f5d867ba2a365874b9e3ea64246e62**. Isolated branch: **feature/admin-operations-workbench-batch-7a**. The main closeout report supplies this batch's exact final commit SHA; this supporting report and its evidence are part of that commit.

## Before: existing features and the specific gap

| Existing source | Verified existing behavior | Missing before Batch 7A |
| --- | --- | --- |
| `app/admin/page.tsx`, `lib/admin/data.ts:getAdminOverview` | Four documented Overview metrics, open report/dispute counts, distinct affected Listing/Booking counts, bounded activity and recent records. Pending owner requests are not Admin tasks. | No consolidated, record-level exception workspace or end-passed/custody-record review predicates. Overview already worked; its queries/metrics are unchanged. |
| `components/admin/directory.tsx`, `app/admin/bookings/page.tsx`, `app/admin/listings/page.tsx` | Existing paginated directories, search/status filters and authorized record detail links. Listing restrictions and booking lifecycle fields already persisted. | No typed cross-domain queue contract combining persisted cases and review signals; users had to visit separate directories. |
| `components/admin/cases.tsx`, `lib/admin/cases.ts`, Reports/Disputes pages | Existing OPEN/REVIEWED/DISMISSED and OPEN/RESOLVED directories/details, guarded resolution forms and protected evidence. | No distinction in a unified workspace between case counts, affected resources, physical-return records and administrative closure. Those detail/review actions are reused rather than duplicated. |
| `app/admin/chat/page.tsx`, `components/chat/reviewer.tsx` | Separate moderation/reviewer queue and private case workflows with their own authorization. | No safe basis to mix private chat/support narratives into an operational listing/booking queue. Chat stays separate. |
| `components/admin/navigation.tsx`, `components/admin/ui.tsx`, `lib/admin/auth.ts` | Grouped responsive navigation, active markers, skip link, panels, tables, badges, date formatting and ACTIVE legacy-Admin guards. | One new Operations navigation entry and a read-only page, not a replacement shell or new staff framework. |
| `prisma/schema.prisma`, `lib/rental-lifecycle.ts`, `lib/meetup/service.ts`, `lib/admin/mutations.ts` | Authoritative states, bilateral handoff, submitted return, QR physical receipt, accepted inspection and explicit dispute closure are distinct. | Review signals had to be defined from these actual fields; no existing priority/SLA model or universal “overdue” status could honestly be reused. |

## Delivered

**Operations → Workbench**, `/admin/workbench`, is a production-safe read-only workspace for existing ACTIVE legacy Admins. Booking attention, listing review and open-case sections show six real query counts and select a queue. Each row/card has its actual record ID, persisted status, explicit fixed reasons, recorded date, agreement end when applicable, and a server-built existing detail route. Exact queue-ID filtering, bounded stable pagination, useful empty states, loading and generic error/retry are included. Operational audit metadata sits below the queue.

The three booking categories distinguish open/disputed cases, past agreed rental end with return unconfirmed, and suspected incomplete custody records. A normal pending request/handoff is not an Admin task; ordinary IN_USE, valid completed returns and normal submitted-return inspection do not appear merely because of their state or age. A resolved dispute or ADMIN_CLOSED state does not imply physical return. No deadline, urgency, breach or legal-custody finding is invented.

See the complete [queue contracts](OPERATIONS_WORKBENCH_QUEUE_CONTRACTS_BATCH_7A.md) for exact tables/fields, H/S/R/I receipt predicates, inclusion/exclusion rules, count semantics, sorting and DTO. Counts are **category memberships** and are explicitly not summed into unique tasks. Two reports on one Listing produce two report rows and one listing-review row. A booking may appear in more than one booking category.

`lib/admin/workbench.ts` is server-only; its independently authenticated service uses one Repeatable Read transaction with exactly three data queries. Fixed parameterized SQL creates the six projections without N+1 selection. It intentionally does not reuse the broad legacy directory DTOs, which include participant/contact and other fields inappropriate for this screen. No narrative, private chat, identity document, evidence bytes, token/hash, contact detail or private investigation note is selected or returned. Activity exposes only audit ID/target metadata/timestamp, not free-form reasons, action text, actors or snapshots.

## Interface and browser evidence

[Desktop](../security/batch7a/workbench-desktop.png) · [Tablet](../security/batch7a/workbench-tablet.png) · [Mobile](../security/batch7a/workbench-mobile.png).

Actual Chromium application acceptance covers 1440×1000, 834×1112 and 390×844 viewports using fresh browser contexts and native login. It follows the new navigation entry, selects a real queue and exact ID, opens the guarded report detail route, reloads the custody review queue, verifies actual rows before capturing screenshots, uses the skip link/keyboard focus, checks document overflow and signs out. Desktop/tablet reuse AdminTable; phones use stacked cards so complete reasons remain visible without horizontal scrolling. Loading and error content contains no protected data. A real owned-table-unavailability drill confirms API 500 without sensitive details, visible error UI, and successful retry after the test fault is removed.

The final Workbench suite passes **6/6**, including its parent test. Earlier successful intermediate runs also exercised browser/denial/recovery paths; they are retained separately, not presented as final-layout repetitions. Real screenshots were visually inspected. Browser evidence certifies virtual Chromium at these dimensions, not physical-device or universal cold-start reliability.

## Authorization and preservation

- Page: existing `requireAdminPage()` and existing guarded Admin layout. API: `adminApi()`. Service: actual current cookie-backed session and ACTIVE legacy ADMIN checked independently before queue queries. There is no client actor selector or staff-role fallback. New API is GET-only.
- Strict allowlist accepts only category, exact recordId, page and pageSize. Unknown/inherited/forged categories, repeated selectors, SQL-shaped IDs, arbitrary includes/orderBy, private free-text search and caller roles fail closed. Limits and sorting are server-defined. API responses are private/no-store with Cookie variation; dynamic page is in proxy's no-store matcher. Actual production verifies private/no-store for API and page. Streaming loading envelopes are not mistaken for authorization: page-negative tests check redirect/not-found markers and absence of queue data.
- Anonymous/USER/suspended Admin denials are tested at API and page boundaries. Existing session expiry/deletion behavior is preserved and covered by own-session/authentication suites. Legacy `getCurrentUser()` may clean up an expired session under its pre-existing behavior; Workbench adds no lifecycle/provisioning write.
- All legacy Admin mutation/evidence routes and their source hashes remain unchanged. Historical authorization inventories are preserved; `ADMIN_ENTRYPOINTS_BATCH_7A.json` adds only this GET, and the inventory test still verifies every earlier hash.
- The approved future Operations policy remains exactly granted Listing IDs, only `id,status,category,adminRestricted`, authenticated access and mandatory audit. Its three current decision documents compare unchanged. This Workbench's legacy DTO is not a permission extension to future Operations accounts. ACTIVE membership/grant, pending staff binding, approval execution and audit-history constraints remain unchanged.

## Fixture integrity and initial results

All changing tests use new owned `hustlen_test_b7a_*` PostgreSQL databases with effective-target validation and run-specific ownership markers. Positive handoff/return/completed fixtures go through existing real participant APIs with required checklists/photos/consents and the normal existing preview-disabled flow; no QR/GPS/camera/evidence requirement is weakened. Agreement dates are backdated only in an owned time-boundary fixture. Explicit malformed legacy status fixtures are separately flagged as unverified records; their labels are never treated as proof of successful physical transitions.

Coverage includes PENDING, CONFIRMED, HANDOFF_PENDING, real IN_USE, real submitted-return INSPECTION, real COMPLETED, open/resolved disputes, OPEN/REVIEWED/DISMISSED reports, restricted/unrestricted/inactive listings, absent optional Handoff/Return, overlapping categories, same-time sorting ties, page boundaries, exact-ID empty results and privacy canaries. Existing one-open-dispute-per-booking and required-link foreign keys are not disabled. Genuine existing Admin moderation/report-resolution endpoints establish the fixture's audit events; the Workbench cannot perform those writes. Read-only checks compare booking/handoff/return digests and record/evidence/audit counts before and after viewing/filtering/recovery.

Initial failed attempts are recorded in [verification.json](../security/batch7a/verification.json), separately from successful final checks:

1. Two setup attempts violated the pre-existing unique-open-dispute-per-booking constraint before queue assertions ran. Fixtures were corrected to use distinct bookings; the constraint was preserved.
2. An early six-test run passed 3/6: a strict DTO-key assertion had its expected alphabetical list out of order, and Playwright's exact `getByLabel` did not match a wrapped select label containing option text. The assertion now compares the correct exact field set, and the select is addressed by its exact accessible combobox name. No authorization/eligibility or deadline was relaxed.
3. During mobile-card work, one six-test run passed 4/6 because a table-only locator no longer matched the visible mobile presentation. It now requires exactly one visible entry after filtering and two real entries before custody screenshots. Visual review had also caught one earlier screenshot of the loading state; final captures wait for loaded rows and were reinspected.

These were implementation/test iterations, not successful reliability runs. Expected injected API failures during the outage drill are negative-test evidence, not unexpected failures. No existing test deadline was increased; Batch 6B's document-navigation fix and five-second URL assertions remain byte-for-byte unchanged. No unexpected login, camera or security-suite failure is attributed to this batch without evidence.

## Verification

| Command | Reported tests | Selected final result |
| --- | ---: | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | — | Pass, exit 0 |
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
| `npm run test:workbench` | 6 | Pass; owned DB removed |

Exact times, owned artifact IDs, actual child exits and cleanup are retained in [verification.json](../security/batch7a/verification.json). The wrapper's own zero exit is not used as a substitute for each test child result. Node totals include parent tests; migration/build programs may have no Node count. Selected final commands are counted once; intermediate attempts remain separate.

Fresh and populated upgrade suites exercise historical records, trigger constraints, failure rollback/replay and old-client compatibility. [Baseline hashes](../security/batch7a/baseline-preservation.json) confirm all 23 historical SQL migrations, Prisma schema, lockfile, existing Admin/authorization/staff/MFA/read code, auth/logout, official MRT catalogue and custody/location logic. Only the proxy matcher adds the new page; its existing production-refusal/CSRF function is unchanged. Bounded migration/read evidence is committed with the report. [Cleanup](../security/batch7a/cleanup.json) is a read-only maintenance catalog check after all tests.

Reproduce with `npm run test:workbench` using a new unused validated `MRT_TEST_DATABASE_URL` distinct from the application's database, and another new target for every changing regression command. The existing harness creates/verifies ownership, applies forward fixture migrations and removes databases/uploads/principals. Supply supported Chromium through `MRT_BROWSER_PATH` / `CHROMIUM_PATH` when needed. No real application DB was reset, migrated, seeded or modified. No new migration was added.

## Remaining gaps and recommended Batch 7B

No support-ticket model, queue assignment, urgency/deadline policy, search of private narratives, exhaustive anomaly detector or safe remediation workflow was invented. These signals identify records for investigation; they do not establish fault or let staff clear custody. Resolved cases and open physical obligations require separate treatment. Large queues need measured EXPLAIN/load testing and potentially an independently reviewed index/keyset change; the current global counts scan persisted sources and browsing is capped at page 10000. No speculative migration is included.

Recommend **read-only queue context on existing detail pages** for Batch 7B: carry the selected queue/filter/page through a safe return link and explain each persisted queue reason against the record's current checkpoints. `components/admin/details.tsx` already shows Handoff state, Return / inspection state and Dispute / cancellation; reuse those panels and existing protected evidence links rather than duplicate them. Distinguish a closed case from physical-return confirmation, and show when the reason has changed since selection. Agree on exact fields/evidence eligibility and test anomalous/legacy rows before implementation. Add no status editor, custody repair, new sanctions, listing action, staff role or approval executor as a side effect.

Real Operations activation still needs approved human proofing/sponsor/reviewer/cohort/lifetime/recovery/retention/origin decisions, genuine worker/process/secret isolation, a trusted real staff-session issuer/scoped access layer and an exact separately reviewed forward activation migration. Neither a Workbench link nor the approved four-field read policy supplies those prerequisites.

Changed-file inventory: [changed-files.txt](../security/batch7a/changed-files.txt). Stop at the isolated review commit. No new operational mutation power, staff provisioning, approval execution, AI administration, merge, push or deployment occurred.
