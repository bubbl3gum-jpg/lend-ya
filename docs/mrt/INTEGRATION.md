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
npm run test:migration
npm run build
# Keep Next.js dev server running on port 3000 in another terminal:
npm run test:integration
```

The migration test creates and drops its own uniquely named local test database and requires local PostgreSQL database-creation permission. It applies the old migration chain, installs historical listing and booking fixtures, then applies the new forward migration. It also validates an empty station database, repeated imports, and an empty Prisma schema diff.

The integration test uses local app/database URLs only, creates uniquely named test users/listings/bookings through the API and browser, records a real WebM video in Chromium, and uploads it alongside a PNG. These development records and uploaded files are retained for inspection. It rewrites the screenshots and validation report only when relevant steps pass. It uses `/usr/bin/chromium` by default; override `MRT_BROWSER_PATH` if necessary, or install a supported Chromium. `MRT_TEST_URL` can override the local app address.

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

Booking creation retains the existing integer `meetingStationId`, Serializable transaction, overlap predicate, pricing, participants, status and lifecycle. It locks the listing row before reading listing state and station approval. Availability edits take the same lock and update that row in their transaction, giving concurrent operations a shared serialization point. The booking transaction rechecks the listing, owner, reports/disputes, official station eligibility, listing membership, and optional canonical/integer identity consistency. Serialization conflicts and stale station choices return 409; the borrower UI clears the choice and refreshes availability. A booking committed before a later edit keeps its agreed station. A booking waiting behind a removal cannot persist a stale approval.

Owner and borrower booking detail/confirmation show both names and all line codes. The handoff section repeats that agreed location. The station is a meeting area, not a specific exit; participants are reminded to agree on an exact point. Return, dispute, evidence, agreement and authorization workflows remain in the existing booking system.

## Evidence and limits

- `validation.json`: executed database/API/browser workflow and checks.
- `migration-validation.json`: fresh and historical migration checks and schema diff.
- `screenshots/desktop-owner.png`, `desktop-borrower.png`, `mobile-borrower.png`, `booking-confirmation.png`.
- Six unit tests cover inventory, explicit legacy mappings, walking/interchange identities, strict input validation, bilingual search, and serialization error wrappers.
- Browser/database tests cover owner create/edit, media persistence, unauthorized access, explicit borrower choice, manipulated station input, correct booking FK, bilingual details for both roles, preserved historical location after removal, an actually blocked concurrent booking, mobile touch navigation, and the original completed and disputed lifecycle paths with authentication/evidence.

The dataset is a dated October 2026 snapshot, not live service status. Schematic label layout and the Y-line evidence qualifications from the standalone source report remain. No exits, GPS, route navigation, separate return station, global owner preferences, or production object storage were added. Media remains on the existing local disk storage. Chromium is the tested browser; Safari/Firefox and physical mobile devices have not been validated. Integration tests add regression coverage because this checkout had no pre-existing executable booking test suite. The tests exercise existing lifecycle/evidence APIs; they do not claim exhaustive coverage of every unrelated marketplace/admin screen.

Final current-instance results: clean `npm ci`, Prisma generation/validation, migration deploy/status, lint, TypeScript checking, all six unit tests, historical/fresh migration validation, production build, and the database-backed Chromium workflow passed. The current database reports all eight migrations applied. This is local development validation; no remote deployment, merge, or environment publication was performed.
