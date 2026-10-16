> Milestone 5 update: listing media/upload, authentication throttling, marketplace CSRF/body limits, category/station editing and review-profile display were independently verified and hardened. See [Milestone 5](milestone-5-report.md) for the current release gate and test results. This document preserves the original 4B record.

# Milestone 4B — Administration, moderation and dispute management

Verification date: 2026-10-14, Asia/Taipei. Repository: `bubbl3gum-jpg/lend-ya`.

## A. Implementation summary

Implemented the moderation system in the existing Next.js application, PostgreSQL database and session provider. The seven Milestone 4A read APIs and protected directories remain available. Dedicated mutation endpoints now suspend/reactivate users, restrict/restore listings, dismiss/uphold reports and resolve supported rental disputes. All decisions require a reason, derive the administrator from the authenticated session, validate current state, and commit their audit records in the same transaction.

New Reports, Disputes and Audit Logs directories provide server-side search, filtering, deterministic pagination, case details and related-record links. User/listing directories also display and filter account status or administrative restrictions. Detail controls require explicit confirmation and show server errors and success feedback. Existing admin loading/error boundaries cover the new pages; empty directories and invalid filters have explicit states. Desktop and 390-pixel mobile flows were exercised in Chromium.

Private investigation evidence uses case-scoped authenticated image handlers, with the original participant handlers preserved. Investigation pages separate the owner's handoff/inspection statements from the borrower's receipt/return statements, including checklists, timestamps and sanitized photos. Original submissions and snapshots are never rewritten by a finding.

Suspension and listing moderation are enforced by ordinary marketplace APIs. Current persisted permissions are checked on every request and shared account locks serialize new activity against suspension. Listing and booking row locks coordinate eligibility, report decisions and lifecycle transitions. User-facing pages display account restrictions, owner-visible listing restrictions, pending/resolved report status and participant-visible dispute decisions, without exposing confidential administrative notes.

A narrowly scoped lifecycle correction retains every dispute case rather than overwriting a singleton: after a case resumes return/inspection obligations, a new concern can open a separate case. Earlier complaints and decisions remain intact. PostgreSQL permits only one OPEN case per booking.

## B. Exact files created and modified for 4B

Earlier Milestone 2–4A changes remain uncommitted in the same checkout. This list identifies 4B changes specifically; the earlier reports describe their own files. No dependencies were added for 4B.

### Created

- `lib/admin/mutations.ts`
- `lib/admin/cases.ts`
- `lib/marketplace-permissions.ts`
- `components/admin/action-form.tsx`
- `components/admin/cases.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/reports/[id]/page.tsx`
- `app/admin/disputes/page.tsx`
- `app/admin/disputes/[id]/page.tsx`
- `app/admin/audit-logs/page.tsx`
- `app/api/admin/users/[id]/status/route.ts`
- `app/api/admin/listings/[id]/moderation/route.ts`
- `app/api/admin/reports/route.ts`
- `app/api/admin/reports/[id]/route.ts`
- `app/api/admin/reports/[id]/resolve/route.ts`
- `app/api/admin/disputes/route.ts`
- `app/api/admin/disputes/[id]/route.ts`
- `app/api/admin/disputes/[id]/resolve/route.ts`
- `app/api/admin/disputes/[id]/evidence/[photoId]/route.ts`
- `app/api/admin/audit-logs/route.ts`
- `prisma/migrations/20261014010000_admin_moderation/migration.sql`
- `prisma/migrations/20261014020000_dispute_case_history/migration.sql`
- `tests/moderation.integration.test.ts`
- `tests/moderation-migration.test.ts`
- `docs/milestone-4b-report.md`

### Modified

- `prisma/schema.prisma`
- `lib/auth.ts`
- `lib/api-response.ts`
- `lib/admin/auth.ts`
- `lib/admin/data.ts`
- `lib/admin/query.ts`
- `lib/rental-lifecycle.ts`
- `lib/trust-profile.ts`
- `components/admin/navigation.tsx`
- `components/admin/details.tsx`
- `components/admin/directory.tsx`
- `components/admin/ui.tsx`
- `components/rental-evidence.tsx`
- `components/booking-actions.tsx`
- `components/site-header.tsx`
- `app/api/bookings/route.ts`
- `app/api/bookings/[id]/route.ts`
- `app/api/bookings/[id]/reviews/route.ts`
- `app/api/bookings/[id]/dispute/route.ts`
- `app/api/listings/route.ts`
- `app/api/listings/[id]/route.ts`
- `app/api/listings/[id]/report/route.ts`
- `app/page.tsx`
- `app/listings/page.tsx`
- `app/listings/[id]/page.tsx`
- `app/listings/[id]/edit/page.tsx`
- `app/listings/new/page.tsx`
- `app/dashboard/page.tsx`
- `app/bookings/[id]/page.tsx`
- `app/account/activity/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `tests/bookings.integration.test.ts`
- `tests/rental-lifecycle.integration.test.ts`
- `tests/rental-browser.test.ts`
- `tests/admin.integration.test.ts`
- `package.json`
- `README.md`
- `docs/milestone-4a-report.md`

Regression fixture cleanup now explicitly removes its own disputes/reports before deleting records protected by the new restrictive foreign keys. The booking eligibility fixture now includes a listing photo. These fixture changes do not substitute database status assignments for successful lifecycle APIs.

## C. Database changes and compatibility

`20261014010000_admin_moderation` adds:

- `AccountStatus` ACTIVE/SUSPENDED and `User.accountStatus`, default ACTIVE for existing accounts.
- Independent `Listing.adminRestricted`, default false. Owner ACTIVE/INACTIVE remains unchanged.
- Nullable report decision timestamp, administrator ID and reason; REVIEWED represents upheld, DISMISSED represents dismissed, OPEN remains blocking.
- Nullable dispute resolver, finding, participant-visible decision summary, confidential notes and booking outcome; existing complaints remain unchanged.
- Booking status `ADMIN_CLOSED`, distinct from verified normal COMPLETED.
- `AdminAuditLog`: administrator foreign key with restrictive deletion, action/target/reason, structured previous/new state, timestamp and indexes for pagination and target history. Reasons cannot be blank. An UPDATE/DELETE trigger rejects ordinary row rewrites. There is no editing/deletion API.
- Restrictive report relationships to preserve case history when associated data is managed.

`20261014020000_dispute_case_history` replaces the unique dispute booking ID with a booking/time index and a partial unique index for OPEN cases. The Booking relation becomes `disputes`; participant detail APIs retain a latest `dispute` field for compatibility and also return the safe case history. Original rows and IDs are preserved. Disputes restrict booking deletion.

All eleven migrations deployed successfully on the application database and isolated booking/admin/moderation databases. A separate upgrade test first deployed the nine pre-4B migrations, inserted historical account, completed/disputed booking, handoff, return, report, review and evidence fixtures, then deployed 4B. It compared every original field and evidence byte, checked old migration checksums, verified default ACTIVE/unrestricted values and absence of invented audit records, and verified a second deployment had no pending migrations. No application database reset or historical migration rewrite occurred. Prisma's datasource-to-schema diff was empty. Custom triggers and partial indexes are maintained by migrations; avoid `db push`.

## D. Administrative pages and APIs

The sidebar now contains Overview, Users, Listings, Bookings, Reports, Disputes and Audit Logs.

| New page | Protected API |
| --- | --- |
| `/admin/users/[id]` action panel | PATCH `/api/admin/users/[id]/status` |
| `/admin/listings/[id]` action panel | PATCH `/api/admin/listings/[id]/moderation` |
| `/admin/reports` | GET `/api/admin/reports` |
| `/admin/reports/[id]` | GET `/api/admin/reports/[id]`; POST `/api/admin/reports/[id]/resolve` |
| `/admin/disputes` | GET `/api/admin/disputes` |
| `/admin/disputes/[id]` | GET `/api/admin/disputes/[id]`; POST `/api/admin/disputes/[id]/resolve` |
| Case evidence photographs | GET `/api/admin/disputes/[id]/evidence/[photoId]` |
| `/admin/audit-logs` | GET `/api/admin/audit-logs` |

Existing `/admin`, user/listing/booking directories/details and their seven GET APIs are preserved. Booking details link to all related dispute cases. Histories link to audit logs filtered by target type/ID. Audit filters include action, target, administrator, search and bounded page size. Report/dispute filters include status/search; dispute search accepts a booking ID. Repeated/unknown parameters and invalid values return 400.

User moderation requires `status`, `expectedStatus`, `reason`; listing moderation requires `restricted`, `expectedRestricted`, `reason`. Report resolution accepts `decision` DISMISS/UPHOLD and `reason`. Dispute resolution accepts `finding`, `outcome`, participant-visible `reason`, and optional confidential `adminNotes`. Unsupported/impersonation fields are rejected. Reasons are 1–2000 characters; JSON mutation bodies are streamed with an 8 KB ceiling.

Every admin API verifies session, persisted ADMIN role and ACTIVE status independently. Anonymous/invalid/expired sessions receive 401; normal USER sessions receive 403. Private admin pages redirect anonymous users to login and return 404 for unauthorized accounts. Admin responses are private/no-store and vary on Cookie. Mutation protection combines existing SameSite=Lax cookies, JSON-only bodies, requested Host/Origin authority validation, cross-site Fetch Metadata rejection and no permissive CORS. The Host check handles Next's internal localhost request URL without trusting arbitrary forwarded-host headers. Acting administrator permissions are rechecked/locked within the transaction. Error responses do not expose database details.

## E. Moderation policies and transition table

### Suspension and obligations

Suspension prevents new listing creation, owner listing edits/deletion/publishing, booking requests/quotes, acceptance of new requests involving either suspended participant, initial owner handoff, and new reviews. Suspended-owner listings are hidden from public browsing. Existing sessions still permit only the allowed account/obligation actions because permission checks read the current database status.

Login, history, private participant evidence, account name settings, safety reports and dispute submission remain available. Participants can cancel eligible pre-handoff bookings or owners can reject requests. A borrower can acknowledge an already-submitted owner handoff, return an in-use item, and an owner can enter/submit return inspection. These narrow actions preserve existing physical obligations even when an account/listing is restricted. No rental is automatically cancelled and no evidence can be edited/deleted. Admins cannot suspend themselves or another ADMIN through standard USER moderation. Reactivation restores normal permissions without changing listings, completed bookings, cases, evidence or audit history.

### Listings and reports

Restriction hides the listing from public browsing and prevents new booking requests/acceptance and initial owner handoff. Owner edits cannot bypass or conceal a restricted listing. Existing rentals/evidence remain accessible to authorized actors.

Restoration removes only `adminRestricted`. It never activates an owner-inactive listing, reactivates its owner, dismisses remaining OPEN reports, supplies missing photos or bypasses reservation conflicts. Booking endpoints recheck all these conditions. Dismissing a report removes only its blocking effect; upholding resolves it as REVIEWED and restricts the listing in the same transaction. Both the report resolution and associated listing decision are logged. Original allegations/descriptions are preserved. A resolved report cannot be silently decided again. Restriction restoration and account reactivation are logged reversals with their own reasons and before/after state.

### Rental disputes

Participants can open cases only for IN_USE, RETURN_PENDING or INSPECTION bookings. The booking becomes DISPUTED, preventing normal lifecycle completion. Only an active authenticated administrator can resolve a case. The three findings are NO_ACTIONABLE_ISSUE, ISSUE_CONFIRMED and INSUFFICIENT_EVIDENCE. Findings are administrative observations; they do not automatically determine a booking consequence.

| Current case / booking | Explicit outcome | Required recorded evidence | Resulting case / booking | Actor |
| --- | --- | --- | --- | --- |
| OPEN / DISPUTED | CONTINUE_RETURN | Valid bilateral handoff; no Return row exists | RESOLVED / IN_USE; borrower still owes return | Active ADMIN |
| OPEN / DISPUTED | RESUME_INSPECTION | Valid bilateral handoff; borrower submitted acknowledged return; no owner inspection or return confirmation yet | RESOLVED / RETURN_PENDING; owner must inspect | Active ADMIN |
| OPEN / DISPUTED | CLOSE_RETURNED | Valid bilateral handoff; borrower acknowledged return; recorded owner inspection actor/time/decision/checklist | RESOLVED / ADMIN_CLOSED; returned item released from reservation blocking | Active ADMIN |
| Resolved case, stale booking or missing required evidence | Any resolution | Conditions not met | Rejected 409; no changes or success log | None |

Any supported finding can accompany an eligible explicit outcome. Resolution never creates a Return, fabricates condition acceptance, overwrites checklists/notes/photos, changes price/deposit snapshots, or enables verified reviews for ADMIN_CLOSED. Normal COMPLETED still requires the original participant confirmation process. Returned administrative closure may preserve a recorded negative inspection; closure records an investigation conclusion rather than claiming normal successful completion. No refunds, deposits, payments, fines, liability percentages, legal settlement or trust/identity field changes are applied.

If obligations resume and a new concern arises, participants can open a separate case. Existing resolved cases cannot be re-resolved; the original case, allegation and decision remain accessible. A booking lock plus PostgreSQL's one-OPEN-case constraint prevents competing open/resolution operations from producing contradictory state.

## F. Acceptance results

| Requirement | Result | Evidence |
| --- | --- | --- |
| Existing 4A authentication/directories/statistics preserved | PASS | Seven existing APIs, actual SQL aggregates and desktop/mobile regression suite |
| Independent admin mutation authorization and role-spoof rejection | PASS | All ten new API access paths; USER/anonymous/forged/expired denial; ordinary account/registration cannot promote |
| CSRF/input/caching safeguards | PASS | Cross-origin and cross-site writes denied; JSON/size/blank reason/actor injection validation; private cache headers |
| Durable transactional audit logs and reversals | PASS | Correct actor/reason/time/before-after records; direct UPDATE/DELETE rejected; injected audit-write failure rolls back moderation |
| User suspension/reactivation and retained obligations | PASS | Existing cookies immediately restricted; real return/inspection succeeds; reactivation permits acceptance/review again; protected ADMIN accounts |
| Independent listing moderation/restoration | PASS | Owner bypass/deletion and new bookings denied; existing bookings retained; inactivity, suspension, OPEN reports and missing-media eligibility preserved |
| Listing report review, dismiss/uphold and independent blockers | PASS | Multiple real reports, original descriptions, case decisions, booking effect and competing decisions |
| Private investigation evidence and actor attribution | PASS | Protected photos decoded in browser; outsiders/anonymous denied; mismatched case/photo rejected; original participant notes remain separate |
| Dispute findings and safe booking consequences | PASS | All three consequences through actual lifecycle APIs; no-return rental never becomes returned/completed; failed inspection preserved |
| Repeated/concurrent case decisions and follow-up history | PASS | One conflicting winner; repeated decision rejected; separate follow-up case preserves earlier resolved case |
| Functional admin controls, search/filter/pagination and responsive views | PASS | Actual browser suspension/reactivation, listing restriction/restoration, report uphold and dispute closure; 1440/390-pixel layouts |
| User-visible restriction/report/case status without confidential notes | PASS | Restricted dashboard banner and resolved participant decision; admin-only notes absent from participant API/page |
| Forward migration compatibility | PASS | Fresh deployments plus populated pre-4B upgrade fixture; original data/checksums/bytes compared; repeat deployment |
| Earlier marketplace/rental/browser regressions | PASS | Registration/login/logout, listings, bookings/overlap, handoff/return/inspection, reviews, restart persistence, admin reads |
| Remediation/import of inconsistent legacy evidence/cases | PARTIAL | Original data preserved; incomplete actor/acknowledgement evidence is rejected safely; secure external-photo import/manual remediation deferred |
| Payments, AI/legal adjudication, identity/trust scoring, email/support systems | NOT STARTED | Deliberately outside requested scope |
| Milestone 5 execution | NOT STARTED | Readiness assessed only; no automatic start |

No verification remains blocked for the implemented supported workflows. Initial regression teardown failed because the new retention foreign keys correctly prevented cascading case deletion; fixtures were repaired to explicitly remove their own protected cases and the suites subsequently passed. An initial browser mutation found Next's internal-URL/Origin mismatch; the authority validation was corrected and same-origin controls plus hostile-origin denials were verified. Neither failure was bypassed.

## G. Actual verification

Commands ran in `/workspace/lend-ya`. Database connection values were supplied through existing environment/ignored configuration and are omitted here. Integration suites ran sequentially against dedicated databases; no user workflow success was simulated by assigning booking states in SQL. SQL fixtures in the 4A statistics suite and historical migration/eligibility checks are explicitly test fixtures.

| Executed command / check | Actual result |
| --- | --- |
| `npx prisma validate --config prisma7.config.ts` | PASS |
| `npx prisma generate --config prisma7.config.ts` | PASS |
| `npx prisma migrate deploy --config prisma7.config.ts` with application/appropriate isolated DATABASE_URL | PASS; all eleven migrations; repeat has none pending |
| `npx prisma migrate diff --config prisma7.config.ts --from-config-datasource --to-schema prisma/schema.prisma --script` | PASS; empty migration |
| `npx next typegen` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS; new admin pages/API handlers included |
| `npm run test:unit` | PASS; 6 reported tests |
| `npm run test:integration` with `lend_ya_booking_test` | PASS; 13 API + 4 two-user browser/restart reported tests |
| `npm run test:admin` with empty `lend_ya_admin_test` | PASS; 7 reported tests, including 4A authorization/provisioning/seed and browser regressions |
| `npm run test:moderation` with empty `lend_ya_moderation_test` | PASS; 10 reported tests, including nine API/security/integrity/browser scenarios |
| `npm run test:migration` with empty `lend_ya_migration_test` | PASS; 1 historical upgrade test |
| Production `next start` on an owned smoke-test server | PASS; functional PostgreSQL listing JSON; new reports/disputes/audit APIs deny anonymous requests with 401; admin page redirects to login; server stopped |
| `git diff --check` | PASS |

Total: 41 reported tests including Node parent tests; zero failures/skips in the final runs. The moderation suite includes every step of the requested full administrative integration scenario: real account creation/local promotion/login, real statistics/directories, suspension restrictions/reactivation, report uphold/restoration and bypass denial, real rental handoff/return/negative inspection/dispute, private investigation and valid closure, persisted audit records and normal-user denial.

Rental/admin suites explicitly clean their own case/report fixtures. The moderation suite refuses a database with existing users and truncates only its dedicated test data on teardown because audit row deletion is intentionally prohibited. The upgrade suite refuses existing application tables and clears only its dedicated fixture schema after the preservation test. No permanent administrator, shared demo password, application reset, deployment, Git commit or PR was created by this milestone.

## H. Remaining risks and limits

- Legacy records lacking trustworthy bilateral acknowledgements, return actors or inspection evidence are preserved and cannot be automatically forced through a resolution. Remediation requires an explicitly reviewed policy; no evidence is fabricated. Legacy REVIEWED/RESOLVED cases with missing administrator metadata remain honestly unattributed.
- Historical external photo URLs remain preserved but are not fetched, imported or publicly rendered as condition evidence. Secure import is deferred. Overwritten historical statements cannot be recovered from absent data.
- Listing media remains local MVP storage. A fresh ephemeral host needs restored persistent media and PostgreSQL backups, including private evidence bytes. The rental server-restart test proves same-instance persistence, not disaster recovery or published fresh-environment restoration.
- Immutable audit controls protect application/API operations and ordinary database row writes. A privileged database operator can alter triggers or truncate tables; production database access/backup controls remain an operational responsibility.
- Audit UI shows current administrator names with durable IDs; renaming an account does not erase attribution. Target IDs/history remain even when eligible target data is later deactivated or removed.
- No general appeal/reversal endpoint changes resolved report/dispute decisions. Supported reversal is account reactivation/listing restoration, with a new audit record. A renewed rental concern opens a separate case instead of rewriting an old decision.
- Administrative findings are nonfinancial and do not imply payments, legal liability or verified normal completion. No automatic trust-score or identity-verification updates occur.
- Current prepared Node/npm/PostgreSQL/Chromium environment is verified. Saved cloud configuration publication and fresh-task restoration remain separate; no published deployment is claimed.

## I. Milestone 5 readiness

Ready for final MVP integration verification using the supported current workflows and prepared PostgreSQL environment. No critical blocker remains for demonstrating new-user listing/booking/rental and administrative moderation flows tested here. Use current evidence-bearing fixtures/accounts rather than inconsistent legacy cases; restore persistent listing media/database evidence before a fresh-host demonstration. Legacy remediation/import and production storage/disaster recovery remain explicitly unverified work.

Milestone 5 has not been started. The onboarding draft was saved successfully with updated 4B restart/testing policies and requires publication. Review/save/publish it in cloud environment settings; the draft save did not publish or validate restoration on a fresh task. Existing install script/network rules were preserved.

Review screenshots from the isolated browser scenario: [dispute investigation desktop](screenshots/milestone-4b/dispute-desktop.png), [audit directory mobile](screenshots/milestone-4b/audit-mobile.png). Image colors and notes are synthetic test evidence, not real allegations or user records.
