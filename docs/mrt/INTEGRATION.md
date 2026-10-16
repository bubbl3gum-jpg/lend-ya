# Official MRT booking integration

Feature branch: `feature/official-mrt-booking`. The standalone `mrt-map` checkout is unchanged. The map runs within Next.js; no Vite service or iframe is needed by the marketplace.

## Run and validate

Use Node 24, Docker Compose, and PostgreSQL 17 as in the repository README:

```sh
npm ci
# Set .env DATABASE_URL to the documented local database connection.
docker compose up -d
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npm run mrt:import
# Optional on a local demo database only; updates demo fixtures:
npx prisma db seed --config prisma7.config.ts
npm run dev
```

`prisma7.config.ts` requires an explicit `--config` argument. The import is safe to repeat; seeding is for development fixtures only. Do not reset a database or rebaseline existing history to deploy this feature. Take the normal database backup before deploying a schema migration.

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The integration and migration runners **refuse the shared development DATABASE_URL**. Explicitly designate a *new, non-existing*, local PostgreSQL database named `hustlen_test_*` using `MRT_TEST_DATABASE_URL`, for example (substitute your local test credentials securely):

```sh
export MRT_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:55433/hustlen_test_mrt'
npm run test:integration
npm run test:migration
```

Both commands create and mark their own database; they never adopt or reset an existing one. The PostgreSQL role must have CREATE DATABASE permission on the designated local test instance. The integration runner deploys migrations only into that new database, starts its own temporary Next.js server on `http://localhost:<free-port>`, and verifies a random session written directly by the test client is recognized by the app before any mutating API tests. No debug endpoint is exposed. The normal development server and database are not test targets. Development URLs consistently use **localhost**, without changing production origin checks.

The migration runner applies historical/fresh migration fixtures and checks repeat imports only inside its owned test database. The ordinary browser regression does **not** call the station importer. Both runners verify the database ownership marker before teardown, stop their app process, remove recorded test upload files by exact generated filename, then drop only the database they created. Test users include a unique run identifier. Existing databases are refused, including an already-existing `hustlen_test_*` database. `MRT_TEST_KEEP_ON_FAILURE=1` preserves only a failed run's owned database/uploads for diagnosis; choose another new name on the next run. Logs, screenshots, run status and validation JSON always go to ignored `.test-artifacts/<run-id>/`, not the tracked historical reports.

Chromium defaults to Playwright-managed Chromium on Linux/macOS (`npx playwright install chromium` if needed). To use an existing system installation, set `MRT_BROWSER_PATH` to its actual executable; on this cloud image `/usr/bin/chromium` was used explicitly. No browser or dependencies are installed automatically by the runner. The application itself does not need Chromium. See [targeted repair report](../MRT_REPAIR_REPORT.md) for the before/after real-endpoint concurrency evidence and the still-unresolved local Prisma diagnosis.

## Identity and migration

The official network and `physical-identities.json` are copied from `mrt-map` revision `0326cabc1533e9deb1a97a198b8296a60b7f59e3`. The network JSON is byte-identical:

`SHA-256 56c88d8cdda29a2a7ce209468d2a2ba61f1e4f4e1a0a76cc9963391d899691dd`

The network retains dated source URLs and evidence references. Full source reconciliation, raw snapshot checksums, route import tools, and limitations remain in the standalone repository's `SOURCE_REPORT.md`, `STATION_INVENTORY.md`, and `data-sources/`. Integration does not fetch or reinterpret official topology. The standalone zoom controls were browser-verified at 100% → 130% → reset to 100% before porting; integrated tests additionally exercise search centering, zoom, pan, reset and mobile touch selection.

`MrtStation.id` remains the internal integer foreign key. `canonicalId` is the unique stable prototype physical identity (including the 26 retained human-readable IDs). Neither display names nor map coordinates establish identity. All 120 records have English/Traditional Chinese names, line code arrays, operator/system IDs, and operational status from the October 16, 2026 snapshot.

| Legacy code | Canonical identity | Official line codes |
| --- | --- | --- |
| TPE | taipei-main | R10 / BL12 |
| ZSH | zhongshan | R11 / G14 |
| XIM | ximen | G12 / BL11 |
| JNT | taipei-mrt:station:057 | R15 |
| SSH | taipei-mrt:station:111 | G19 |

`20261016100000_official_mrt_stations` adds metadata and upserts the complete snapshot in a transaction. It updates existing legacy rows in place, preserving their primary keys and every `ListingStation` and `Booking.meetingStationId` reference. Unknown historical stations remain retained and become ineligible for new selections until explicitly reconciled; no name-based guessing occurs. The two official locations named Banqiao remain distinct (BL07 vs Y16). Newly created compatibility `name` values include bilingual names and codes because the legacy column is unique. Display components use the new bilingual metadata. Shared in-station interchange codes belong to one canonical row.

The idempotent `mrt:import` validates the retained network before writing. It uses explicit legacy-code mappings or canonical identity and fails on conflicting legacy identities; it never deletes bookings or rewrites their locations. The development seed invokes the same importer before attaching its five demo stations.

## Listing and booking behavior

`MRTMap` ports the original SVG, layout, label collision utility, search and navigation. The controlled `MRTStationSelector` wraps it in a native modal dialog with keyboard focus containment, a searchable station-list alternative, bilingual selected-location summaries, and explicit confirmation. Owner mode supports multiple per-listing locations; borrower mode accepts exactly one approved location. Draft changes remain local until confirmed; no demo localStorage or global owner preferences are used. Styles are scoped under the MRT component classes.

Create listing keeps the existing multipart media API and `ListingStation` relation. Edit listing PATCH accepts an optional strictly validated `stationIds` array; it updates relationships atomically and preserves fields omitted from the request. Only the owner can edit. At least one official operational location is required.

Booking creation retains the existing integer `meetingStationId`, Serializable transaction, overlap predicate, pricing, participants, status and lifecycle. It locks the listing row before reading listing state and station approval. Availability edits take the same lock and explicitly update the parent row timestamp even for station-only request bodies, giving concurrent operations a shared serialization point. The booking transaction rechecks the listing, owner, reports/disputes, official station eligibility, listing membership, and optional canonical/integer identity consistency. Serialization conflicts and stale station choices return 409; the borrower UI clears the choice and refreshes availability. A booking committed before a later edit keeps its agreed station. A booking waiting behind a removal cannot persist a stale approval.

Owner and borrower booking detail/confirmation show both names and all line codes. The handoff section repeats that agreed location. The station is a meeting area, not a specific exit; participants are reminded to agree on an exact point. Return, dispute, evidence, agreement and authorization workflows remain in the existing booking system.

## Evidence and limits

- `validation.json`: executed database/API/browser workflow and checks.
- `migration-validation.json`: fresh and historical migration checks and schema diff.
- `screenshots/desktop-owner.png`, `desktop-borrower.png`, `mobile-borrower.png`, `booking-confirmation.png`.
- Ten unit tests cover inventory, mappings, input/search/error handling, explicit test-target/ownership safeguards, app/database mismatch refusal, and browser executable selection.
- Browser/database tests cover owner create/edit, media persistence, unauthorized access, explicit borrower choice, manipulated station input, correct booking FK, bilingual details for both roles, preserved historical location after removal, actual station-only and full-form PATCH requests blocking a concurrent booking, mobile touch navigation, and the original completed and disputed lifecycle paths with authentication/evidence.

The dataset is a dated October 2026 snapshot, not live service status. Schematic label layout and the Y-line evidence qualifications from the standalone source report remain. No exits, GPS, route navigation, separate return station, global owner preferences, or production object storage were added. Media remains on the existing local disk storage. Chromium is the tested browser; Safari/Firefox and physical mobile devices have not been validated. Integration tests add regression coverage because this checkout had no pre-existing executable booking test suite. The tests exercise existing lifecycle/evidence APIs; they do not claim exhaustive coverage of every unrelated marketplace/admin screen.

The original integration results in the tracked JSON/screenshots are historical evidence. The targeted repairs were separately validated with ten unit tests, build/lint/type checks and fresh owned test databases; see the repair report for current results. No remote deployment, merge, or environment publication was performed.
