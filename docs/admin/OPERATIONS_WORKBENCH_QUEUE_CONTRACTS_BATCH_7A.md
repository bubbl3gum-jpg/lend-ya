# Operations Workbench queue contracts — Batch 7A

24 October 2026 (Asia/Taipei). This is a read-only legacy-Admin read model. It does not authorize future Operations Staff. Canonical implementation: `lib/admin/workbench.ts`; page `/admin/workbench`; GET `/api/admin/workbench`.

## Trust and snapshot

The page uses `requireAdminPage()`. The API uses existing `adminApi()`. The server-only service independently resolves the actual cookie-backed current User and requires ACTIVE legacy ADMIN before parsing filters or selecting queues. No caller supplies an actor, role, membership or permission. Missing/expired/deleted sessions deny; USER/suspended Admin deny. Existing guards and mutation endpoints are unchanged.

All queue counts, selected page and activity are read in one Repeatable Read transaction: three fixed queries independent of result size (two parameterized CTE reads and one projected audit read). Authentication queries are constant overhead, not per row. No loop issues a database query. The one server-derived `asOf` cutoff is bound as a UTC timestamp for rental-end comparison; clients cannot set the clock. Counts and page share the same database snapshot; returned links/state remain observations and may change before a subsequent detail visit.

## Authoritative predicates

The shared Booking flags join optional Handoff and Return rows by their unique `bookingId`. They never select notes, checklists, media, tokens or geolocation.

- **H (bilateral handoff record):** Handoff.performedBy = Booking.ownerId; confirmedBy = renterId; ownerConditionConfirmed and conditionConfirmed are true; confirmedAt exists. Missing rows or NULL checks yield false. Mirrors existing `lib/rental-lifecycle.ts` bilateral-handoff requirements; it is a persisted-record check, not a fresh physical verification.
- **S (submitted return):** Return.initiatedBy = renterId and returnConfirmed is true.
- **R (recorded physical return):** S plus Return.confirmedBy = ownerId and confirmedAt exists, **or** a persisted MeetupChallenge for this booking/purpose RETURN has verifierId = ownerId, consumedAt, completedAt and completionHash. The latter acknowledges the existing QR physical-receipt path independently of inspection acceptance. No challenge secret is returned. Mere scan/consumption, expiry or booking age does not establish a receipt.
- **I (accepted inspection record):** Return.inspectedBy = ownerId; inspectedAt exists; inspectionAccepted is true. This is separate from R. An administrative closure or resolved case is not a return receipt.

| Typed category | Source and exact inclusion | Exclusions / semantics | Count and route |
| --- | --- | --- | --- |
| `BOOKING_CASES` | Booking.status = DISPUTED **or** at least one related Dispute.status = OPEN | No age predicate. Includes a stale DISPUTED state even without an open case; reasons distinguish both. A resolved case alone does not qualify. | One per Booking, even with multiple case references. `/admin/bookings/{id}` |
| `RENTAL_END_PASSED` | Booking.status IN (IN_USE, RETURN_PENDING, DISPUTED, ADMIN_CLOSED), H true, R false, endAt strictly before server `asOf` | Pending, confirmed and pending-handoff requests do not qualify. INSPECTION, COMPLETED and CANCELLED are excluded. Not a finding of lateness, fault, fee liability or legally overdue custody. Owner-confirmed physical return excludes it even if a case remains open. | One per Booking. `/admin/bookings/{id}` |
| `CUSTODY_REVIEW` | Booking.status IN (IN_USE, RETURN_PENDING, INSPECTION, COMPLETED, ADMIN_CLOSED), and **any**: H false; COMPLETED with R false; INSPECTION with S false; COMPLETED with I false; ADMIN_CLOSED with R false | Flags suspected record inconsistencies or unresolved physical-return confirmation, never an automatic repair or finding. A normal legacy INSPECTION with valid submitted return is not flagged merely because acceptance is pending. Normal owner requests are excluded. | One per Booking with a deduplicated list of applicable reason codes. `/admin/bookings/{id}` |
| `LISTING_REVIEW` | Listing.adminRestricted true **or** at least one ListingReport.status = OPEN | Includes ACTIVE and INACTIVE listings when either predicate holds. Owner-deactivated/unrestricted listings with no open report are excluded. Restriction is persisted, not an invitation to restore it. | One per Listing, regardless of report count; both reasons may appear. `/admin/listings/{id}` |
| `OPEN_REPORTS` | ListingReport.status = OPEN | REVIEWED and DISMISSED excluded, independently of nullable resolution timestamps. Query does not project reason/description/reporter. | One per report, distinct from affected Listing count. `/admin/reports/{id}` |
| `OPEN_DISPUTES` | Dispute.status = OPEN | RESOLVED excluded regardless of booking/custody state. The existing unique-open-case constraint remains intact. | One per dispute, distinct from affected Booking count. `/admin/disputes/{id}` |

Each category uses `recordedAt = source.createdAt ASC, source.id ASC`. Ties are stable. This is oldest-record order, not assigned urgency or a deadline. `endAt` is the persisted agreement end, not an invented response SLA. Queue reasons are fixed code-to-label mappings, not user-submitted narratives.

`queues[].count` is an **unfiltered per-category** count in the current snapshot. A filtered category's `totalMatching` includes the optional exact record-ID filter. Do not sum counts into “tasks” or “affected records”: one booking can be in cases/end-passed/custody queues, and a listing can have several reports. The UI explicitly explains this overlap. Active rentals are not counted by these queues: ordinary IN_USE records are absent unless a predicate matches. Closed support/chat cases are not a source and do not imply custody completion.

## Filtering and pagination

Only `category`, `recordId`, `page`, `pageSize` are allowed, at most once each. Category is an own key of the fixed six-category registry; inherited/unknown names deny. `recordId` is an optional positive integer through 2147483647, referring to the **queue record's** ID (report ID for reports, dispute ID for disputes), not a private text search. Page defaults 1, bounded 1–10000. Page size defaults 10, bounded 1–50. Empty optional form values use documented defaults. Non-decimal/injected/negative/duplicate/unknown filters produce 400 at the API and an accessible filter error/reset link on the page.

Every bound request value is a Prisma.sql parameter. No user string becomes SQL syntax, column/Prisma include, sort direction or authorization. The SQL text is fixed. Maximum offset is 499950. `totalPages = max(1, ceil(totalMatching/pageSize))` is the true mathematical count; navigation does not generate page 10001. Very large queues require exact-ID filtering beyond this intentional browsing cap. An out-of-range valid requested page returns an empty list while retaining true counts; no fabricated/clamped record selection. A future measured keyset/index change should address large datasets, not a migration added speculatively here.

## Minimal DTO

Response allowlist: `asOf`, normalized `query`, six `queues` counts, `totalMatching`, `totalPages`, bounded `items`, bounded `activity`. Each item has exactly:

`category, id, kind, status, recordedAt, endAt, relatedId, reasons, href`.

`kind` is BOOKING/LISTING/REPORT/DISPUTE. Report relatedId is listingId; dispute relatedId is bookingId; otherwise NULL. Status is persisted source status. All dates serialize to ISO strings. `href` is server-built from a fixed kind-to-existing-route map and integer ID. No title, owner/renter/reporter identity/contact, case narrative, free-text reason, private chat, identity record, credential or evidence data is included. Detail pages independently apply their existing guards and evidence controls. Required resource relations are enforced by existing FKs; they are not disabled to fabricate orphans. Optional missing Handoff/Return data is tested and yields explicit review reasons rather than a crash or claimed successful transition.

Operational activity selects the latest eight AdminAuditLog rows with targetType LISTING, BOOKING, REPORT or DISPUTE, sorted createdAt DESC/id DESC. The source code was checked: report resolution events use REPORT. Only `id,targetType,targetId,createdAt` are returned; action text, reason, actors and snapshots are omitted. Links open the existing filtered audit directory, which remains meaningful even when a historical target is no longer available. This is an audit metadata feed, not proof of present custody or a count of unresolved tasks.

## UX, privacy and failure handling

Desktop/tablet reuse AdminTable with a labelled, keyboard-scrollable table region. Phone layouts show the same DTO as stacked cards with full reason text. Empty states are explicit. Category selection and exact-ID forms use native controls and reset pagination; pagination preserves filters. Existing grouped navigation, active indicators, skip link and focus styling remain. Loading shows generic text without protected data. Unexpected failures show a bounded generic error/retry surface; no raw exception or database details are sent to the component. A real owned-table-unavailability drill tests API failure, visible error and subsequent retry recovery.

API responses use private/no-store and Cookie variation through existing adminApi. The dynamic page is included in proxy's no-store matcher; production verifies private/no-store. Next owns development HTML cache/RSC Vary headers (dev uses no-store). Loading can stream before denial, so negative browser/page tests check actual redirect/not-found markers and absence of queue data, rather than treating an HTTP 200 streaming envelope as authorization. No POST/mutation handler is provided; existing Origin/CSRF protections stay intact.

## Limitations and approved future policy

These are evidence-bounded review signals, not an exhaustive custody anomaly detector, overdue enforcement system, new staff assignment queue or invitation to mutate a record. No private support/chat case queue, arbitrary search, fabricated deadline or priority, automated correction, notification or enforcement is added. Existing protected detail/evidence routes remain the investigation path.

Operations Staff `listings.read` remains approved **only** for exactly granted listing IDs, fields `id`, `status`, `category`, `adminRestricted`, authenticated access and mandatory audit. This broader legacy-Admin Workbench is not that future scoped DTO. No ACTIVE membership/grant, staff-session issuance, legacy ADMIN promotion, approval execution or policy cutover is enabled.
