# Legacy Admin authorization entrypoint inventory — Batch 2B

24 October 2026 (Asia/Taipei). Baseline `9b58969351fa091a969f7bca094f7a47c639fe5c`. No entry below is converted to the new policy. [Machine inventory with baseline route checksums](LEGACY_ADMIN_ENTRYPOINTS_BATCH_2B.json) supports complete-route review.

## HTTP API surface

Every exported method below is exercised with anonymous requests and ordinary USER fixtures labelled with each future role. Forged role/risk headers/body never confer authority. Existing integration suites additionally exercise authorized operations, actor changes, populated evidence and reviewer conflicts.

| Source | Methods | Current enforcement |
| --- | --- | --- |
| `app/api/admin/audit-logs/route.ts` | GET | adminApi |
| `app/api/admin/bookings/[id]/route.ts` | GET | adminApi |
| `app/api/admin/bookings/route.ts` | GET | adminApi |
| `app/api/admin/chat/cases/[id]/claim/route.ts` | POST | chatApi(..., true) + transactional reviewer/case checks |
| `app/api/admin/chat/cases/[id]/decision/route.ts` | POST | chatApi(..., true) + transactional reviewer/case checks |
| `app/api/admin/chat/cases/[id]/route.ts` | GET | chatApi(..., true) + transactional reviewer/case checks |
| `app/api/admin/chat/cases/route.ts` | GET | chatApi(..., true) + transactional reviewer/case checks |
| `app/api/admin/disputes/[id]/evidence/[photoId]/route.ts` | GET | inline active ADMIN + readDisputeEvidence |
| `app/api/admin/disputes/[id]/resolve/route.ts` | POST | adminMutation + transactional actor |
| `app/api/admin/disputes/[id]/route.ts` | GET | adminApi |
| `app/api/admin/disputes/route.ts` | GET | adminApi |
| `app/api/admin/listings/[id]/moderation/route.ts` | PATCH | adminMutation + transactional actor |
| `app/api/admin/listings/[id]/route.ts` | GET | adminApi |
| `app/api/admin/listings/route.ts` | GET | adminApi |
| `app/api/admin/overview/route.ts` | GET | adminApi |
| `app/api/admin/reports/[id]/resolve/route.ts` | POST | adminMutation + transactional actor |
| `app/api/admin/reports/[id]/route.ts` | GET | adminApi |
| `app/api/admin/reports/route.ts` | GET | adminApi |
| `app/api/admin/users/[id]/route.ts` | GET | adminApi |
| `app/api/admin/users/[id]/status/route.ts` | PATCH | adminMutation + transactional actor |
| `app/api/admin/users/route.ts` | GET | adminApi |

### Other HTTP and transport boundaries

- `app/api/listing-media/[filename]/route.ts::GET`: active ADMIN is one route to inactive listing media, alongside the legitimate owner path. This exception must migrate to a bounded listing/media capability while preserving marketplace ownership. It is **outside** `/api/admin` and cannot be missed during cutover. Existing media/moderation suites exercise privacy; the new all-Admin-route scan does not pretend to cover this as an Admin-prefix route.
- `proxy.ts`: origin/Fetch Metadata checks for mutations and legacy `/uploads/listings/*` rewriting to the protected media route; no staff identity authority. Preserve it.
- `app/api/auth/register/route.ts`: hardcodes USER; role spoofing cannot provision staff. `app/api/auth/login/route.ts`, `lib/auth.ts::{getCurrentUser,persistSession,deleteCurrentSession}`: current persisted account/session binding, not a signed staff-role claim. Existing sessions carry no new staff authority.
- `app/api/bookings/**`, `app/api/conversations/**` and `app/api/chat/**`: participant services remain participant-only. Being future staff must not bypass `lib/chat/service.ts::{member,locked,permitted}`, rental participant checks, checklists, receipt gates, review eligibility or geolocation/QR rules. See existing booking/chat/meetup suites.

## Admin pages and server components

All Admin pages inherit `app/admin/layout.tsx::AdminLayout` → `requireAdminPage` (current ADMIN + ACTIVE; anonymous redirect; unauthorized not-found). Additional guards remain in the Overview, reusable directory/detail/case components and chat pages. Server-only imports are bundler boundaries, not substitutes for actor checks.

| Source | Current page/component guard |
| --- | --- |
| `app/admin/audit-logs/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/bookings/[id]/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/bookings/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/chat/[id]/page.tsx` | requireAdminPage; actual queue/evidence API additionally requires ChatReviewer and case scope |
| `app/admin/chat/page.tsx` | requireAdminPage; actual queue/evidence API additionally requires ChatReviewer and case scope |
| `app/admin/disputes/[id]/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/disputes/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/error.tsx` | Presentation/error/loading under guarded layout; no independent privileged service |
| `app/admin/layout.tsx` | requireAdminPage directly |
| `app/admin/listings/[id]/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/listings/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/loading.tsx` | Presentation/error/loading under guarded layout; no independent privileged service |
| `app/admin/page.tsx` | requireAdminPage directly |
| `app/admin/reports/[id]/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/reports/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/users/[id]/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |
| `app/admin/users/page.tsx` | Guarded reusable Admin directory/detail/case component + layout |

- `components/admin/directory.tsx::AdminDirectory`, `details.tsx::{recordId,AdminUserDetail,AdminListingDetail,AdminBookingDetail}`, `cases.tsx::{AdminCaseDirectory,AdminCaseDetail,CaseHistory}`: page guards before reads. `components/admin/navigation.tsx`, `action-form.tsx`, `ui.tsx` provide UI, not permission checks; hidden links/disabled forms do not authorize anything.

## Server services and gaps

| Source / entry | Enforcement and migration obligation |
| --- | --- |
| `lib/admin/auth.ts::{requireAdminPage,adminApi}` | Active current ADMIN; preserve until atomic reviewed cutover. API cache isolation remains private/no-store. |
| `lib/admin/mutations.ts::adminMutation` | Active ADMIN, same-origin/Fetch Metadata, JSON/body/input constraints; callback gets server-derived actor ID. |
| `lib/admin/mutations.ts::{moderateUser,moderateListing,resolveReport,resolveDispute}` / private `actor` | Transactionally rechecks current ADMIN + ACTIVE, validates expected state and writes atomic audit. New direct-service negative tests exercise each. Current broad sanction/dispute authority is legacy behavior, not approval for future roles. |
| `lib/admin/evidence.ts::readDisputeEvidence` | Rechecks active ADMIN in transaction, exact dispute→booking→photo scope, commits access audit before bytes; directly negative tested. Future case assignment must be added before limited-role activation. |
| `lib/chat/http.ts::chatApi(...,true)` | Active ADMIN wrapper; does not by itself confer reviewer eligibility. |
| `lib/chat/moderation.ts::{queue,claim,readCase,decide}` / private `reviewer,caseRecord,audit` | Active ADMIN AND enabled ChatReviewer, row locks/current grant, conversation-participant exclusion, assignment, distinct original appeal reviewer, immutable snapshots and audited access. Direct-service negatives cover claim/read/decide; existing suite covers positive scope/audit behavior. |
| `lib/admin/data.ts::{getAdminOverview,getAdminDirectory,getAdminUser,getAdminListing,getAdminBooking}` | **Server-only data helpers have no actor parameter/check.** Today their callers guard access. They are not safe future lower-privilege DAL APIs; mandatory scoped wrappers/projections/count filters are a cutover blocker. No new policy is wired into them now. |
| `lib/admin/cases.ts::{caseDirectory,caseDetail}` | **Server-only data helpers rely on guarded callers**, and current ADMIN audit/report/dispute scope is broad. Replace with actor-scoped DAL reads before onboarding limited staff; never call directly from a lower-privilege endpoint. |
| `lib/admin/query.ts::{parseAdminQuery,adminRecordId,toSearchParams}`; `cases.ts::caseQuery` | Input validation only, not authorization. Selectors/status filters cannot establish role, risk or evidence grant. |
| `lib/chat/analysis/jobs.ts::{claimAnalysis,finishAnalysis,processAnalysis}` | Existing isolated advisory analysis workflow, not an Admin principal or new autonomous power. Preserve grant-scoped recommendation display in readCase. |

## CLI / database-credential surfaces

- `scripts/create-admin.ts`: local/nonproduction legacy role promotion helper; database/operator credentials authorize it, not a staff capability. **Do not use it to provision future roles**. New tests only create the usual legacy ADMIN fixture inside an owned disposable database.
- `scripts/chat-reviewer.ts`: owned-test-database guard, existing active administrator only; writes existing ChatReviewer + immutable audit. No future role migration implied.
- `scripts/chat-demo.ts`, `scripts/local-meetup-demo.ts`, `scripts/chat-demo-acceptance.ts`: owned disposable demo lifecycle; explicit fixture-only roles/preview allowlists. Future real staff provisioning must not reuse these.
- `scripts/chat-analysis-worker.ts`: owned disposable guard and mock-shadow analysis; no production AI identity. `scripts/analyze-synthetic.ts`, `scripts/evaluate-moderation.ts`: checked-in synthetic inputs, no new admin authority.
- `scripts/import-mrt.ts` / `lib/mrt/import.ts`, `prisma/seed.ts`: out-of-band database-credential tooling. They are not HTTP staff permissions and must not become dashboard mutation APIs. Their current operational credential/runbook restrictions require separate review before any production admin integration. No import/seed is run against existing records here.
- `scripts/db-preflight.ts`: read-only migration history inspection with explicit intended binding; not an authorization or migration executor. `tests/run-isolated.ts` and `tests/support/test-database.ts`: fresh creation/target/ownership gate, not staff provisioning.

## Safe cutover rule

No `ADMIN OR staffRole` fallback and no automatic ADMIN→Super Admin or ChatReviewer→Moderator mapping. Every surface above, including private media, server components, direct services and unguarded data helpers, must have an explicit replacement decision. Keep new identities unable to access legacy endpoints until the inventory, scoped DTOs, assignment and revocation gates pass. Existing broad ADMIN rights are unchanged in this batch, not endorsed as future policy.
