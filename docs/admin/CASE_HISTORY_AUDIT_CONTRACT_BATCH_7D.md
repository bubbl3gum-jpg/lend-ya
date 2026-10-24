# Case history and audit navigation contract — Batch 7D

Baseline: clean Batch 7C `93d3c646abc44e8298f2acd9bc3d57507f0691fe`, directly descended from Batch 7B `e58f09412321672be2ab7c42c57c277bcac487e3`. Branch: `feature/case-history-audit-navigation-batch-7d`. This is an additive legacy-Admin read feature. It does not activate staff roles or change the six [Workbench queue contracts](OPERATIONS_WORKBENCH_QUEUE_CONTRACTS_BATCH_7A.md), [investigation contract](OPERATIONS_INVESTIGATION_CONTRACT_BATCH_7B.md), or corrected camera scanner.

## Existing implementation inventory

| Source | Recorded data and existing consumers | Meaning and limitations |
| --- | --- | --- |
| `prisma/schema.prisma:ListingReport` | `createdAt`, current `status`, latest `resolvedAt`, `resolvedBy`, `decisionReason`; listing/reporter relationships. `lib/admin/cases.ts:reportSelect`, `caseDirectory`, `caseDetail`; report directory/detail and resolve API. | Case fields are a current snapshot, not a transition ledger. Creation and latest resolution have persisted timestamps. Current OPEN/REVIEWED/DISMISSED alone cannot reconstruct past transitions. |
| `prisma/schema.prisma:Dispute` | `createdAt`, latest resolution fields, current status/finding/booking outcome, description, notes and relationships. `lib/admin/cases.ts:disputeSelect`, `caseDetail`; dispute detail/evidence/resolve APIs. | Resolution is an administrative decision. It is separate from handoff, borrower return, physical receipt and accepted inspection. Private notes/participant statements remain in existing independently guarded full details. |
| `prisma/schema.prisma:AdminAuditLog` | Exact action/target/time, administrator ID, reason and before/after JSON. `lib/admin/mutations.ts:audit`, `resolveReport`, `resolveDispute`; `lib/admin/evidence.ts`, chat moderation; `lib/admin/cases.ts:logSelect`, `caseQuery`, `caseDirectory`. | Existing append-only database protections preserve recorded decisions and evidence access. Log timestamps and IDs support deterministic chronology. Absence is not proof an event never occurred. Target IDs are historical references, not universal foreign keys. |
| `components/admin/cases.tsx:CaseHistory` (before this batch) | A link to the filtered `/admin/audit-logs?targetType=…&targetId=…` directory, also reused by User/Listing detail pages. | There is **no CaseHistory database model**. The old name described a link, not another persisted history framework. User/Listing audit links remain intact. |
| `app/admin/audit-logs/page.tsx`, `components/admin/cases.tsx:AdminCaseDirectory` | Existing bounded directory with fixed action/target/admin/search filters, timestamp/ID descending sorting, and existing full reason/state display. | This broader authorized legacy surface is preserved; its unrestricted JSON and reason fields are **not reused as the new history DTO**. Its existing target-routing limitations (e.g. unsupported chat targets) are not silently fixed in this focused batch. |
| `lib/admin/investigation.ts`, `components/admin/investigation-context.tsx` | Current queue matches and custody checkpoints from shared predicates; related guarded Listing/Booking link and Workbench return envelope. | Explicitly a current observation, not historical transition evidence. New history links back to these existing checkpoints. |
| `lib/admin/workbench-navigation.ts` | Closed local detail paths plus validated `wbCategory`, `wbRecordId`, `wbPage`, `wbPageSize`. | Navigation metadata never selects a case or grants authority. This batch narrowly extends accepted paths to report/dispute history and case-audit metadata. |

No new model, migration, generic audit framework or write action is introduced. Existing report/dispute actions continue recording their audit rows transactionally; historical rows are not backfilled.

## Exact read DTO and ordering

`lib/admin/case-history.ts:getCaseHistory(kind, rawId, params)` independently resolves the current authenticated session and requires ACTIVE legacy ADMIN. API `adminApi` and page `requireAdminPage` are additional independent boundaries. Future Operations `listings.read` does not satisfy this requirement.

Fixed `CaseHistoryDto`:

- `kind`: REPORT or DISPUTE; `id`: positive route integer only.
- `related`: persisted parent kind LISTING/BOOKING and ID, selected from the actual case, never supplied by the browser.
- `page`: integer 1–10000; `pageSize`: fixed 20; `total`: exact recorded-entry count.
- `events[]`: only `source`, `event`, `timestamp`, `auditId` (nullable).

`source=CASE_TIMESTAMP` exposes `CASE_CREATED` and, only when `resolvedAt` exists, `LATEST_RESOLUTION`. These are explicitly persisted case fields, not immutable historical transitions. `source=ADMIN_AUDIT` exposes existing exact-target log metadata. Recognized action labels are REPORT_RESOLVED, DISPUTE_RESOLVED and EVIDENCE_VIEWED; all other actions become ADMIN_ACTION_RECORDED without forwarding arbitrary strings. The preview reads the same fixed projection and displays only the first three oldest entries plus a full-history link.

Timestamps are the actual persisted PostgreSQL timestamps, serialized explicitly as millisecond UTC ISO strings, consistent with existing Prisma UTC semantics. Sort is `(timestamp ASC, sourceRank ASC, auditId ASC)`: creation rank 1, latest-resolution field rank 2, audit rows rank 3 with unique numeric ID ties. SQL `json_agg` has the same explicit order. A single parameter-bound SQL statement reads the case, exact-target audits, count and page within one statement snapshot. There is no row-by-row enrichment or N+1. Only the two fixed table/related-column fragments are selected by validated server-side kind.

Two GET APIs: `/api/admin/reports/[id]/history` and `/api/admin/disputes/[id]/history`. `Cache-Control: private, no-store` and `Vary: Cookie` remain (Next may append RSC variation tokens). No POST/mutation handler exists. New pages are dynamic and covered by the existing private/no-store proxy; the only proxy change is adding `/admin/case-audit/:path*` to its matcher.

`getCaseAudit(rawId)` independently checks the same session/role boundary and selects only ID, fixed/normalized event, timestamp and case reference from the audit record. Only REPORT/DISPUTE targets are supported. The dedicated `/admin/case-audit/[id]` page contains minimal audit metadata and guarded links, not reasons, before/after JSON, administrator identity or evidence. Orphan historical target links may legitimately reach a guarded 404; no record is invented.

Current case timestamps and audit entries may refer to the same decision and are **not deduplicated into a fabricated unique transition**. Multiple disputes for one booking and reports for one listing stay separate exact-target histories. The related current-record link is separate and maintains its own authorization.

## Navigation and privacy

`lib/admin/case-history-navigation.ts` separates `historyPage` from the Batch 7B envelope. Page size cannot be browser-increased. Unknown history API keys are rejected; malformed history pagination displays a safe input error. Invalid/unknown/repeated Workbench context is discarded as a whole. Detail access still works directly with a fixed Workbench fallback; no arbitrary return URL is used. Every sender validates even a context-free output path against the fixed path grammar.

Flow: Workbench → existing case detail/compact preview → `/admin/{reports|disputes}/[id]/history` → `/admin/case-audit/[id]` → constructed original Workbench category/record/page/page-size. Pagination preserves that envelope, and audit detail links back to case history and original Workbench. Audit navigation resets history pagination to its first page; it preserves the Workbench return view, not an arbitrary navigation stack. Source pages may have changed queue membership since the earlier snapshot; this does not suppress access or misrepresent the original view.

New DTOs never expose narrative, description, reason, before/after JSON, chat, identity/contact fields, actor ID/name, evidence bytes or selectors, coordinates, session/token hashes, passkey credentials or QR contents. Existing full case/evidence links retain their independent guards and scope. All explanations use fixed event labels. Empty/out-of-range history pages explicitly warn that no listed entry is not proof nothing occurred; database failures show unavailable, not a fabricated empty history, with bounded operational error references and recovery via reload.

## Custody semantics

Report review/dismissal is a listing moderation decision. Dispute resolution is an administrative case decision and may have a separately recorded booking consequence under existing guarded actions; history never infers that consequence from its label. Booking lifecycle, borrower return submission, owner/QR receipt and owner inspection acceptance remain separate. History explicitly links to current Batch 7B checkpoints and states closure does not prove physical return or acceptance. No current checkpoint observation is merged into the chronological event list.

## Pagination and performance limits

Fixed 20-row offset pages, maximum page 10000. One SQL history statement plus the existing authenticated-session lookup(s); auth checks are not included in the one-history-query count. Read previews across one detail do not fan out per event. Counts require reading the exact target's matched entries; high offsets and very large histories can still cost work. Offset pages are stable for a fixed dataset, **not** a frozen multi-request snapshot: concurrent historical insertion can shift subsequent pages. This is documented rather than claiming gap-free browsing under concurrent writes.

Existing `AdminAuditLog(targetType,targetId,createdAt)` and `(createdAt,id)` indexes remain. The new union may sort matched target rows; the owned fixture benchmark records 503 entries/26 pages and actual HTTP latencies, including runtime/compilation effects. It is not a production-scale benchmark or reason to add an index. If real volumes justify it, separately measure EXPLAIN ANALYZE/BUFFERS with safe synthetic cardinalities and consider keyset pagination before proposing an index migration. No schema changes are justified or performed here.
