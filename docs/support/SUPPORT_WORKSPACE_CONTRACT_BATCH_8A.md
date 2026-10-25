# Customer Service foundation: current workspace contract

Baseline: clean Batch 7D `fec839b7b62711733b94210aba55fdcb6d599f29`, descended from corrected Batch 7C `93d3c646abc44e8298f2acd9bc3d57507f0691fe`. Isolated branch: `feature/customer-service-foundation-batch-8a`. This page is a production-safe, read-only **legacy ACTIVE ADMIN** case index. No Support Agent membership, assignment, ticket, reply, SLA or priority is created or implied.

## Existing implementation audit

| Implementation | Existing behavior | Reuse / missing boundary |
| --- | --- | --- |
| `app/customer-service/page.tsx` | Public help text links conceptually to listing reports and booking disputes; explicitly no live/email support. | Preserved. Not a ticket intake or message service; no general Customer Service model exists. |
| `components/admin/navigation.tsx` | Grouped Admin sidebar; Community previously Users and Chat moderation only. | Adds implemented Support link to Community. Other links/permissions stay unchanged. |
| `prisma/schema.prisma:ListingReport`, `app/api/listings/[id]/report/route.ts` | Reporter, listing, reason/description, OPEN/REVIEWED/DISMISSED, creation/latest decision fields; authenticated report creation prevents self-reporting and duplicate listing/reporter submissions. | Workspace reads only ID/type/current status/timestamps/persisted parent ID. These are existing allegations, not generic Support Tickets. Fixtures do not set future ticket-creation policy. |
| `prisma/schema.prisma:Dispute`, `app/api/bookings/[id]/dispute/route.ts` | Booking-participant dispute creation in permitted rental states; existing transaction changes booking to DISPUTED, with one open case per booking. | Workspace does not call this write action or copy its narratives. Multiple historical disputes remain distinct cases for one booking. |
| `lib/admin/cases.ts`, `components/admin/cases.tsx`, report/dispute Admin pages/APIs | Guarded full details, attributed private narratives and existing accountable resolution actions. | Existing detail links remain independently guarded. Support has no inline resolution, sanction or booking status controls. |
| `lib/admin/case-history.ts`, `components/admin/case-history.tsx`, existing history and case-audit pages | Separate persisted case timestamps and minimal audit metadata, exact-target chronology and bounded pagination. No CaseHistory model. | Links use this unchanged 7D contract. Current status is never presented as complete historical transitions. Case closure is not physical receipt or accepted inspection. |
| `lib/admin/workbench.ts`, `workbench-sql.ts`, `investigation.ts`, navigation helpers | Six current exception queues, shared current custody predicates and validated Workbench return context. | Query predicates/DTOs remain unchanged. Support is a unified case directory spanning open/history, not another copy of the six exception queues. Existing closed local link helpers carry only the original Workbench envelope. |
| `AdminAuditLog`, `app/api/admin/audit-logs/route.ts`, `lib/admin/cases.ts:logSelect` | Legacy broad Admin audit directory includes actor name/ID, reason and unrestricted before/after JSON; immutable writers record existing administrative decisions. | **Not a safe DTO for future Support Agents.** Do not reuse the endpoint by adding `ADMIN OR SUPPORT_AGENT`. New Support lists do not call this directory; history links use 7D's minimal audit metadata. |
| `lib/admin/evidence.ts`, protected dispute evidence routes | Scoped disputed-booking evidence reads under existing Admin guard and transactional EVIDENCE_VIEWED audit; participant routes have separate ownership/phase checks. | Preserved. Metadata listing grants no new evidence permission, copies no photos and issues no new evidence selectors. |
| `Conversation`, `ConversationParticipant`, `ChatMessage`, `lib/chat/*`, conversation APIs | Marketplace owner/borrower chat is shared between those participants; message sequence, idempotency, moderation and outbox infrastructure exist. | Do **not** add Support staff as a third participant: that changes the audience and leaks the required separate channels. Reuse patterns such as validation/idempotency only after review, not the shared authorization model or transcripts. |
| `ChatReviewer`, `lib/chat/moderation.ts` | Existing moderation requires ACTIVE legacy ADMIN **and** enabled reviewer, case assignment/conflict checks and audited evidence access. | Not a Support assignment system. No reviewer grant is provisioned and no chat message/report is listed in Support. |
| `lib/authorization/registry.ts`, staff sessions/scoped-read/audit services | Future support capability contracts and persisted identity/session foundations exist, inactive/shadow boundaries remain. | Proposed allocations do not authorize runtime roles. Staff cutover requires exact case/channel scope, trusted versions/sessions, independent review and an evidence-safe DAL. |

## Implemented routes and DTO

`/admin/support` and GET `/api/admin/support` call `lib/admin/support.ts:getSupportWorkspace`. Both have existing page/API guards; the service independently resolves the actual session and enforces ACTIVE legacy ADMIN before parsing or reading. No browser actor/role/assurance/assignment is trusted. Future Support Agents, even with their role name, gain no access.

DTO:

- `asOf`: actual SQL statement snapshot timestamp, UTC ISO.
- `query`: normalized `caseType`, `caseState`, `caseId`, `page`, `pageSize` only.
- `counts`: `openReports`, `openDisputes`, `historicalReports`, `historicalDisputes`.
- `totalMatching`, `totalPages`; bounded `items[]`.
- Each item: `kind` REPORT/DISPUTE, integer `id`, actual `status`, persisted `createdAt`, nullable persisted `resolvedAt`, `related:{kind:LISTING|BOOKING,id}`.

No title, name, email, phone, account status, case reason/description/notes, actor ID, transcript, credential, evidence bytes, QR contents, coordinates, assignment, priority or fabricated ticket state enters this DTO. Parent IDs come from the case's actual database relationships, not a browser selector. Lists contain no unrestricted state JSON. UTC timestamp serialization matches the 7D history contract; UI formats Asia/Taipei using existing `adminDate`.

## Exact filters and counts

Closed list filters: `caseType=ALL|REPORT|DISPUTE` (default ALL); `caseState=OPEN|RESOLVED|ALL` (default OPEN); optional exact positive `caseId` only when a single type is selected; `page` 1–10000; `pageSize` 1–50 (default 20). Empty form case ID means no exact filter. Unknown/repeated list keys, arbitrary return URLs, user/staff/actor/evidence/booking/listing/ticket selectors and free-text search are rejected. Report #1 and Dispute #1 have separate identities; selecting ID alone without a type is rejected.

OPEN means actual status OPEN. Historical/resolved reports are REVIEWED or DISMISSED; resolved disputes are RESOLVED. A resolved record with null resolvedAt is shown as **Not recorded**, not filled from an audit event or current time. Counts describe all persisted cases before filters, in the same statement snapshot as the page. Matching count describes the selected type/state/ID. Each report/dispute appears once, even when several cases share a listing/booking. The four count buckets are disjoint case counts; they are not unique incidents, unique rentals, customer-service tickets, authorized tasks, priorities or an SLA.

A single parameter-bound SQL statement unions fixed report/dispute metadata, computes counts/matching count and returns the page. No per-row enrichment or N+1. Sort `(createdAt ASC, kind rank REPORT=1/DISPUTE=2 ASC, id ASC)` is repeated explicitly inside JSON aggregation. Identical timestamps and overlapping numeric IDs are deterministic. Offset pages are stable for a fixed dataset, not a persistent cross-request snapshot under concurrent case creation/decisions. Exact counts scan existing case records; no unmeasured production-scale/index claim is made. The owned 28-case fixture verifies three bounded pages, source preservation and shared-parent/timestamp collisions. No migration or index is added.

## Navigation, UX and privacy

Community → Support is active only on the implemented route. Existing Admin title/panel/status/date design is reused. Responsive cards avoid wide-table overflow; filters are labelled native controls, links have focus targets and pagination has an accessible label. Empty views explain recorded-case limits; query errors are separate from database unavailable states. Unavailability shows no fake zero metrics and uses bounded operational error references.

`supportWorkbenchParams` removes only the five known Support filters before calling existing closed Workbench helpers. All original `wbCategory`, `wbRecordId`, `wbPage`, `wbPageSize` validation remains; invalid/repeated navigation context is discarded as a whole, safely falling back to `/admin/workbench`. It never selects the Support case, parent or audit. Case/history/related links accept only existing validated local paths; Support filters are not forwarded to detail routes. Valid Workbench context survives Support filtering, Reset, pagination, case history and audit navigation. Reset clears Support filters but preserves a validated original Workbench envelope; invalid context is not copied.

Support's own filters are restored by normal browser Back history; no new arbitrary return URL or Support-return envelope is added. Existing detail/history pages still return explicitly to Workbench, not a fabricated Support navigation stack. Related routes apply their own authorization. Case history never mixes current checkpoints into historical events. Closure, submission, physical receipt and inspection acceptance remain distinct.

Dynamic pages/API use private no-store responses and Cookie variation. The proxy logic/CSRF checks are unchanged; only `/admin/support/:path*` is added to its matcher. API exposes GET only. No operational write capability is added.

## Access auditing boundary

Successful service reads emit one bounded structured **operational** `admin_support_read` log with server-resolved administrator ID, actual snapshot time, normalized type/state, page/pageSize and returned count. No raw query, case IDs, parent IDs, participant identity, narrative, evidence, cookies or credentials are logged. Unknown fields cannot be forwarded. Failures use existing safe error logging; unauthenticated/unauthorized reads cannot emit a successful access record. Logging is not silently suppressed if the console transport throws.

These operational records are **not an immutable persisted case audit** and are not displayed as historical case events. Deployment log retention/collection remains an operational dependency; this is not a new generic audit framework. No `AdminAuditLog` write is fabricated merely for listing rows. Existing guarded evidence reads retain their durable EVIDENCE_VIEWED audit. Before future staff/private-thread access, approved fail-closed durable access auditing through the existing staff security audit boundary, exact assignment/channel checks and production session readiness are mandatory. No lower-privilege access is activated here.
