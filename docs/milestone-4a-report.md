> Milestone 4B update: the formerly read-only foundation now supports moderation, case resolution, protected administrative evidence and durable audit logs. See [Milestone 4B](milestone-4b-report.md) for the current routes, policies and newly executed regression results. This document preserves the original 4A verification record.

# Milestone 4A — verified Admin Desktop foundation

2026-10-13. The application now has a real, protected, read-only Admin Desktop connected to the same Prisma/PostgreSQL database as the marketplace. API, authorization and two-role browser tests pass. No Milestone 4B enforcement or mutation controls were implemented.

## Implementation summary

A reusable server authorization helper verifies the database-backed current session and ADMIN role. The layout and each page's server component verify authorization; each API independently uses the helper. Anonymous pages redirect to login, ordinary users receive a data-free 404, anonymous APIs receive 401, and ordinary users receive 403. Expired/forged sessions and client role claims cannot grant access. Admin responses use explicit select objects, private/no-store caching and Cookie variation; Next's additional RSC Vary headers are retained. The admin layout is dynamic. Logout removes the actual session and fully navigates to login, discarding the authenticated client router cache.

Login uses the original endpoint and redirects from its database-derived role: USER to `/dashboard`, ADMIN to `/admin`. Registration remains USER-only; account settings cannot change roles. Existing session expiration, password hashing and credentials are preserved.

The desktop shell has a persistent sidebar, identity/logout header, breadcrumbs, mobile navigation and only four working navigation sections. Tables have server search/filtering, bounded pagination, deterministic creation-date/ID ordering, linked details, empty states and loading/error boundaries. Table overflow stays inside its scroll region. Valid long titles are handled on narrow screens.

Overview statistics use Prisma COUNT/GROUP BY in a repeatable-read snapshot with only bounded recent-record reads. Users: total, administrators and registrations in 30 elapsed days. Listings: total/active/inactive and distinct listings with OPEN reports. Bookings: all actual enum states; active rentals mean HANDOFF_PENDING, IN_USE, RETURN_PENDING or INSPECTION, with disputes counted separately. Recent registrations/listings/requests are labelled recent records, not an audit trail.

User details include safe account/verification fields, existing trust information, listing/owner/borrower/review counts and the latest ten bookings/reviews. Listing details include inactive records, owner, description/category/condition/prices, public listing media, stations, timestamps, related-booking count/history and report counts/statuses. Booking details show agreement snapshots, participants, station, lifecycle/inspection times, dispute presence and cancellation metadata. They deliberately omit condition notes/checklists/photo identifiers/bytes; ordinary participant/evidence permissions remain unchanged.

### Narrow prerequisite repairs

- Seed reruns previously forced demo administrators back to USER and replaced passwords, listings and fixed-ID booking records. They now preserve existing users/passwords/roles/listings/rentals and only create missing demo records. The seed remains local/nonproduction-only. Administrator provisioning reuses the existing local-only promotion script, which never sets a password.
- The public listing-detail API previously returned inactive listings to everyone even though the page denied them. GET now follows the page's owner-only inactive visibility rule. Privileged inspection happens through admin routes rather than weakening public access.
- Shared navigation wraps on mobile, adds an ADMIN-only desktop entry, and shared logout clears the client router cache after successful server logout.

No schema migration or separate administration database was needed for Milestone 4A. The isolated `_admin_test` database is strictly a test database; both marketplace and admin runtime routes use the existing single `DATABASE_URL` and `prisma` client.

## Routes and APIs

| Page | Read-only API |
|---|---|
| `/admin` | GET `/api/admin/overview` |
| `/admin/users` | GET `/api/admin/users` |
| `/admin/users/[id]` | GET `/api/admin/users/[id]` |
| `/admin/listings` | GET `/api/admin/listings` |
| `/admin/listings/[id]` | GET `/api/admin/listings/[id]` |
| `/admin/bookings` | GET `/api/admin/bookings` |
| `/admin/bookings/[id]` | GET `/api/admin/bookings/[id]` |

Directories accept `q`, `page`, `pageSize` (1–100, default 20). Users additionally accept role; listings accept status/category/ownerId; bookings accept status/ownerId/renterId. Unknown/repeated parameters, invalid enums, invalid integer IDs, oversized search and excessive page size return 400. Missing records return 404. Unsupported writes return 405; no mutation handlers exist. Searches cover user names/emails, item titles, and booking ID/item/participant names/emails.

## Secure local administrator provisioning

1. Configure the documented local database and migrations. Register your own account at `/register`, choosing your own password through the existing form. Do not promote a public demo-password account for real administrative use.
2. In the local checkout, run `npm run admin:create -- your-email@example.test`, or run `npm run admin:create` in an interactive terminal and enter the account email.
3. Sign in at `/login` using that account's existing credentials. The app redirects to `/admin`.

The script only promotes an existing account. It refuses NODE_ENV=production and non-loopback database hosts, preserves passwords and other users, and is idempotent. It is not an HTTP promotion endpoint. No permanent admin account, default administrator password or actual administrator credentials were added to this repository. Test admin passwords were random ephemeral values; their isolated fixtures were removed.

## Exact Milestone 4A files

Created:

- `lib/admin/auth.ts`, `lib/admin/query.ts`, `lib/admin/data.ts`.
- `components/admin/navigation.tsx`, `ui.tsx`, `directory.tsx`, `details.tsx`.
- `app/admin/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`.
- `app/admin/users/page.tsx`, `app/admin/users/[id]/page.tsx`.
- `app/admin/listings/page.tsx`, `app/admin/listings/[id]/page.tsx`.
- `app/admin/bookings/page.tsx`, `app/admin/bookings/[id]/page.tsx`.
- `app/api/admin/overview/route.ts`.
- `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`.
- `app/api/admin/listings/route.ts`, `app/api/admin/listings/[id]/route.ts`.
- `app/api/admin/bookings/route.ts`, `app/api/admin/bookings/[id]/route.ts`.
- `tests/admin.integration.test.ts`, this report.

Modified: `components/auth-form.tsx`, `components/logout-button.tsx`, `components/site-header.tsx`, `app/api/listings/[id]/route.ts`, `prisma/seed.ts`, `package.json`, `README.md`. The existing `scripts/create-admin.ts` was reviewed/tested and reused unchanged. Earlier Milestones 2/3 changes remain in the same working tree and are listed in their reports.

## Acceptance table

| Requested feature / requirements | Status | Verification |
|---|---|---|
| 1–2: existing application/database, no duplicate models, all seven routes and APIs | PASS | Production route manifest, real API/browser access; no admin schema changes. |
| 3: same login, USER/dashboard and ADMIN/admin redirects | PASS | Two separate real browser sessions. |
| 3: every page and API independently server-authorized | PASS | All seven pages tested with USER denial; all seven endpoints tested with valid ADMIN and denied anonymous/USER/expired/forged credentials. |
| 3: anonymous redirect, API 401/403, no role spoofing or public promotion | PASS | Registration role spoof remains USER; X-Role/role-filter claims denied; account PATCH cannot promote. |
| 3: exclude authentication secrets and prevent caching leaks | PASS | Recursive safe-field assertions, private/no-store APIs/Cookie Vary, dynamic page authorization, full-navigation logout. |
| 3: session expiration/logout preserved | PASS | Expired DB session denied; actual logout invalidates old session and browser/API access. |
| 4: secure local provisioning, own credentials, no hardcoded/admin password logs | PASS | Existing script tested for promotion, repeat, password preservation and production/remote-host refusal. |
| 4: preserve users/passwords, seed reruns do not demote admins | PASS | Custom-password ADMIN survives two seed runs; rental snapshot rows unchanged. |
| 5: persistent desktop sidebar, top header/identity/logout, breadcrumbs/mobile nav | PASS | Real desktop/mobile browser navigation and screenshots. |
| 5: cards, tables, badges, search/pagination/detail, loading/error/empty states | PASS | Real data views, empty marketplace, directory and input-error cases; production/type/lint checks. Loading/error boundaries are implemented; backend outage fault injection was not run. |
| 6: all required real statistics, explicit definitions, bounded recent activity, zero marketplace | PASS | Aggregates compared with PostgreSQL; all nine booking states exercised; empty listings/bookings are zero with one authenticated admin user. |
| 6: no hardcoded totals, no full-record reads for counts, no fake audit trail | PASS | SQL aggregate comparisons and source query/label review. |
| 7: required user columns, name/email search, role filter, server pagination/order/detail | PASS | Actual endpoints, deterministic repeated pages, UI search/detail/pagination. |
| 7: verification/trust, counts/rental links, empty activity, no account mutations | PASS | Safe detail selects and count checks; POST/PATCH/DELETE denied. |
| 8: platform-wide/inactive listings, columns, search/status/category/owner filters | PASS | All endpoint filters and actual inactive browser detail. |
| 8: listing fields/media/stations/timestamps/booking/report information | PASS | Detail endpoint/browser render and safe explicit selects. |
| 8: preserve public inactive visibility, no moderation actions | PASS | Anonymous/unrelated USER gets 404, owner gets 200, admin route gets 200; no forced-change routes/buttons. |
| 9: platform bookings, status/identifier/participant filtering, sort/pagination/details | PASS | Actual queries and browser status/detail flow; participant/station/pricing/state fields rendered. |
| 9: unrelated admin summary access without participant/evidence bypass | PASS | Admin monitoring 200; normal booking/private-photo endpoints still 403 for that same nonparticipant admin. |
| 9: no arbitrary editing, forced completion or dispute resolution | PASS | Admin methods beyond GET return 405; booking status/update/prices unchanged after reads. |
| 10.1–10.10: auth, safe selects, validated/capped inputs, ordering/missing/errors/privacy | PASS | Full authorization/filter/404/405/sensitive-field tests; existing generic DB error utility reused. |
| 11: preserve one application database and records, no reset/secrets/local-storage privilege | PASS | Read-only query implementations, before/after row equality, isolated fixture cleanup and no extra runtime datasource. |
| 12: actual authentication/authorization/stats/directories/privacy integration tests | PASS | Seven-test admin suite with PostgreSQL and Chromium; no mocked data sources. |
| 13.1–13.15: browser login, statistics, sidebar, all views, filters/paging, USER denial, layouts, logout | PASS | 1440px desktop and 390px mobile checks, including 200-character unbroken title. Screenshots captured. |
| 14: Milestones 0–3 registration/login/listings/bookings/rental/reviews regressions | PASS | Existing booking suite, lifecycle API suite and two-user browser workflow pass. |
| 15: out-of-scope boundary | PASS | No moderation/enforcement/audit/payment/AI functionality or misleading placeholder controls added. |
| Definition of Done 1–12 | PASS | Securely provisioned test ADMIN, real SQL counts, protected usable views and passing regression checks. |
| Milestone 4B actions and private admin evidence viewer | NOT STARTED | Intentionally reserved for the next authorized task. |

## Actual verification results

Commands run from `/workspace/lend-ya`. `TEST_DATABASE_URL` points to `lend_ya_booking_test` for rental checks or `lend_ya_admin_test` for admin checks. The admin suite requires an isolated `_admin_test` database without pre-existing users; it creates and removes its own fixtures.

| Command | Result |
|---|---|
| `npm ci --cache /tmp/lend-ya-npm-cache` | PASS — 519 packages; committed lockfile now supports clean install. |
| `npx prisma validate --config prisma7.config.ts` | PASS. |
| `npx prisma generate --config prisma7.config.ts` | PASS — Prisma 7.10.0. |
| `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy --config prisma7.config.ts` | PASS — full nine-migration history on isolated admin DB; rental DB rerun has no pending migrations. |
| `npx next typegen` | PASS — route types regenerated. |
| `npx tsc --noEmit` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS — all seven admin pages and APIs in production manifest. |
| `npm run test:unit` | PASS — 6 tests, zero failures/skips. |
| `TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration` | PASS — 13 booking/rental API tests, then 4 browser tests, zero failures/skips. |
| `TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:admin` | PASS — 7 tests, zero failures/skips. |
| `git diff --check` | PASS. |
| `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3004` with internal requests | PASS — compiled listing API returns a valid PostgreSQL collection; anonymous admin API returns 401 and admin page 307. Our smoke server was stopped afterward. |

Separate results: TypeScript PASS; ESLint PASS; production build PASS; authentication/authorization PASS; real admin database/API PASS; admin desktop/mobile browser PASS; rental/review/dispute regression PASS. Reported test totals include the Node runner's parent tests. Admin fixtures seed all statuses for read-only count verification; successful rental lifecycle verification uses only actual application APIs and forms.

Intermediate failures were corrected before the passing runs: Next appends RSC headers to Vary, so the cache test checks Cookie membership; TypeScript test environments now use ProcessEnv types. No assertions were removed or tests skipped. The rental browser checks also exposed and fixed the shared mobile header overflow. The final mobile admin test includes a valid 200-character title.

## Security assessment and remaining limitations

All privileged entry points deny access before data queries, even for invalid IDs or role-filter spoofing. Password/session fields and condition evidence are absent from admin selects/responses. Read endpoints have no write handlers. Normal participant rules remain independently enforced. Local promotion has no public route and does not alter password hashes. No production administrator was provisioned.

Pagination is offset-based and search uses database case-insensitive contains. At this MVP scale it is appropriate; very large datasets may require search indexes/keyset pagination. Counts/recent records are real snapshots, not analytics/audit guarantees. A backend outage was not fault-injected; error handling uses the repository's generic non-disclosing response helper and admin error boundary.

Readiness is verified in this running cloud machine. Saved environment instructions do not prove publication or restoration into a new cloud task. No credential values or admin passwords are saved in those instructions. Developers must register their own local account before promotion.

## Milestone 4B readiness

The foundation is ready for a separately authorized implementation of:

- User suspension/reactivation with a safe user-state migration, centralized enforcement and session invalidation rules.
- Listing moderation and report resolution with explicit validated actions and protected history.
- Dispute resolution coordinated with Booking state locks, preserving all participant evidence and preventing fabricated confirmations.
- A separate, explicitly authorized administrative evidence endpoint/viewer; participant APIs must remain unchanged.
- Durable administrative action logs recording actor, time, reason, target and before/after state, committed atomically with moderation actions.

Milestone 4B has not begun. No payment/deposit refund, AI, government-ID approval or messaging capabilities were added.

## Review artifacts and reusable setup

Actual isolated-test screenshots: [Desktop overview](screenshots/milestone-4a/admin-desktop.png), [User directory](screenshots/milestone-4a/admin-users.png), [Mobile administration](screenshots/milestone-4a/admin-mobile.png), [Completed rental on mobile](screenshots/milestone-4a/completed-rental-mobile.png). They contain temporary test records, not production totals. Admin screenshots omit the framework development indicator, without changing application content.

The environment draft's `install_script` and `start_skill` were updated to the tested frozen-lockfile installation, PostgreSQL/Prisma startup, normal/admin workflows and isolated test commands. Existing network policy, repositories and credential requirements were preserved. Saving is confirmed; review/save the draft in environment settings and publish to retain the prepared configuration/snapshot. This task did not publish or verify restoration in a new environment. Test servers were stopped; PostgreSQL remains available.
