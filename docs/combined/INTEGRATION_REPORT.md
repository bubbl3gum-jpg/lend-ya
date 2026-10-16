# Combined Admin/MVP + MRT integration

Branch: `integration/hustlen-mrt-complete`. Base: Admin/MVP `18529a30bb7da3c3db08baca614ef1fe2764eb10`. Merge source: MRT repairs `7a4dc6058dfbff7316ae53bd893337ebd651d674`. Main is not merged or modified by this delivery.

## Conflict resolution

Resolved 14 conflict paths: `.gitignore`, `README.md`, `next.config.ts`, package manifest/lock, booking collection/detail APIs, listing collection/detail APIs, booking detail page, listing detail/edit pages, and booking/edit forms. Admin validation, moderation, authentication, quote review, private storage and lifecycle rules form the base; canonical MRT selection and concurrency protection are integrated into those paths. Dependencies retain sharp and Admin Playwright coverage alongside MRT tools. Generated lockfile reflects both dependency sets. Next configuration retains private upload limits and Admin image behavior while isolating test development output.

Admin pages, authorization, cancellation, private evidence, dispute history, security proxy and rental lifecycle modules are preserved. Owner create/edit forms and Borrower booking use controlled interactive station selectors; quote confirmation remains required. Listings reject restricted owners/items as before. A station conflict invalidates the quote and requires a new selection. Booking creation and listing station replacement share row-lock/Serializable protection; only acceptance reserves rental dates, preserving competing pending requests. Station-only edits update listing timestamps. Raw adapter serialization failures receive the same safe conflict response.

## Migration compatibility

All 13 migration SQL files and migration lock are byte-identical to their source branches; SHA256/source manifest: [migration-checksums.json](migration-checksums.json). Seven shared migrations end at `20261012150000_trust_profiles`. Admin then adds booking cancellation, private rental evidence, admin moderation, dispute history and MVP security (five unchanged files). Official MRT follows at `20261016100000_official_mrt_stations`. No additional schema migration is required.

The Admin migrations own Admin fields/tables/constraints/triggers, including Listing.adminRestricted. MRT adds seven distinct station metadata columns and a nullable canonical-ID unique index. It assigns canonical metadata to known legacy codes and inserts the remaining official locations, preserving existing primary keys and foreign keys. Unknown historical stations remain available for historical relationships but are excluded from new operational choices. No duplicate column or ordering conflict exists in these source histories. Existing earlier migrations contain their original historical transforms and constraints; none were rewritten or replayed against existing Admin records.

The isolated upgrade fixture deploys the unchanged 12 Admin migrations, inserts representative populated history, then deploys only MRT. It compares every old row in 14 application tables, original station identity/name/timestamps and historical migration checksums before and after deployment and two imports. Coverage includes restricted listings, cancellations, bilateral handoff, returns, open/resolved dispute history, private evidence bytes, reports, verified reviews, audit events and rate counters. Booking and listing station foreign keys stay identical. All 120 official physical locations and 136 line/station codes reconcile; final Prisma schema diff is empty. Read-only preflight passes on both sides of this upgrade. A separate older pre-moderation historical upgrade fixture also validates forward replay and data retention.

Fresh migration replay and Admin-state upgrade are separate checks. Neither checks the user's physical Mac database. The existing cloud development database was left unchanged; an ordinary build against its old MRT-only schema fails at the missing Admin field, as expected. Production build validation uses an independently created combined-schema database instead. Align the Mac using [MAC_UPGRADE.md](MAC_UPGRADE.md), never reset it.

## Validation

All database-changing suites run through the owned disposable-database runner, refusing pre-existing/shared databases and separating generated application output. Each test database is freshly created and removed after use. No migration deployment, truncation or fixture reset targets the shared development database.

Results and current-run evidence are recorded in [validation.json](validation.json). Coverage includes fresh replay, populated upgrade, Owner create/edit, Borrower quote/booking, bilingual persistence, desktop/mobile map search/selection/zoom/pan, stale station conflicts, station/full-form races, competing acceptance, admin dashboard/moderation, cancellation, private evidence, dispute/handoff/return/review lifecycle and server restart. CI runs the same isolated commands; its GitHub execution is distinct from local cloud verification.

## Limits

The exact Mac database and its uncommitted local code were not accessible. Local drift, unknown station data or additional migrations must be reviewed if preflight differs. Browser tests use Chromium; Safari and physical touch-device behavior are not certified. Historical MRT reports elsewhere in docs describe their original branches; this report and its current evidence describe the combined integration.
