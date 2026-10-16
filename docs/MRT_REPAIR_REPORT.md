# Targeted post-integration repairs

Date: 2026-10-17 (Asia/Taipei). Branch: `fix/mrt-post-integration-repairs`, based on `a02293d`. No merge or deployment performed.

## MRT-1: root cause and exact repair

A station-only PATCH left the scalar listing update empty. Prisma skipped the parent update, so a Serializable booking already waiting on that row lock could keep a snapshot of the removed station relationship. Row locking alone did not enforce the intended availability-removal ordering.

`app/api/listings/[id]/route.ts` now sends `data: stationIds ? { ...data, updatedAt: new Date() } : data` to the existing listing update **inside the same transaction**. This makes every availability replacement write the shared parent tuple, including a station-only body. A waiting Serializable booking encountering that changed tuple is rejected using the existing serialization-conflict handler and `STATION_UNAVAILABLE` 409 response. The borrower must reselect; there is no automatic booking retry. Full-form edits use the same rule. No schema change was necessary, and authorization, row locks, operational eligibility, overlap checks and historical station foreign keys remain intact.

## Authentic regression: before and after

The old test manually edited relationships and wrote updatedAt. That accidentally supplied the missing behavior and hid the endpoint defect.

The replacement uses a fixture-scoped transaction to lock only its ListingStation row, then starts the **real owner PATCH**. It discovers that actual PATCH backend blocked on the fixture row via `pg_blocking_pids`. Next it starts the real borrower POST and verifies that backend is waiting on the PATCH backend's Listing row lock. Releasing the fixture lock lets the owner removal commit. The test never writes the listing timestamp itself.

| Endpoint case | Before repair | After repair |
| --- | --- | --- |
| Station-only owner removal | PATCH 200; waiting booking **201**, timestamp unchanged; regression exits 1 | PATCH 200; waiting booking **409**, timestamp changed, no stale booking row |
| Full-form owner removal | Not separately run before repair | PATCH 200; waiting booking **409**, no stale booking row |
| Booking committed before later station removal | Preserved in original behavior | Still retains its agreed station |
| Two concurrent overlapping requests | Existing Serializable protection retained | Exactly one 201 and one 409; exactly one booking persisted |

The failing regression was executed on unmodified MRT-1 application logic, with the new isolated runner, before applying the parent-row repair. A runner-readiness bug during initial harness setup was corrected before counting that regression result. The genuine failing run is distinct from setup failures.

Evidence: `/tmp/mrt-repairs-red.log` records `editStatus:200, bookingStatus:201, listingUpdatedAtChanged:false, blockedOnActualPatch:true`. `/tmp/mrt-repairs-green.log` records both repaired endpoint cases returning 409. Run logs/artifacts are retained under `.test-artifacts/`; they contain test fixture data only and no saved connection strings.

## Test database and application safety

- `npm run test:integration` and `npm run test:migration` require explicit `MRT_TEST_DATABASE_URL`; there is no fallback to the development binding. Targets must be local and named `hustlen_test_*`, differ from the development database, and **not already exist**.
- The runner creates the fresh database, records a random ownership marker, and passes that exact URL/run identifier to both app and test process. The inner tests verify current_database and the marker before queries.
- Before mutating API requests, the browser test writes an unpredictable session/user canary directly into its owned database and verifies the application reads that same session/user through the existing auth endpoint. A mismatched app fails before registration/listing writes. The canary is scoped and removed in a finalizer. No test-only production API was added.
- Migrations run only on the newly created test database. The browser regression does not run the station importer. Metadata snapshots must remain unchanged throughout it. The historical migration/import checks run separately on their fresh owned database.
- Test users identify their unique run. The app process is stopped before cleanup. Teardown verifies ownership again, deletes only exact UUID upload filenames recorded in that owned database, and drops only that newly created database. An existing database is never reset, adopted or dropped. The same rules apply after failed tests.
- `MRT_TEST_KEEP_ON_FAILURE=1` retains a failed run's owned database/uploads for diagnosis; successful runs still clean up. Artifacts always remain under ignored `.test-artifacts/<run-id>/`. The keep-on-failure path was exercised using an intentionally missing browser executable, verified to preserve its owned database, then that preservation-check database alone was explicitly removed by the validation harness.
- A separate negative check created an existing designated test database, invoked the runner, verified refusal/exit 1 and that the database was still present, then removed only that validation-owned empty database.
- Unit guards cover absent/shared/remote/unsafe target names, wrong ownership/database markers, wrong application database identity, and browser option selection. No tests require production credentials.

Default dev origin is localhost. The temporary test server also uses localhost and a free port. A development-only Next.js distDir/tsconfig override separates its generated build files from normal `.next`; production settings/security checks are unchanged. Generated test outputs are excluded from Git, TypeScript source discovery and ESLint source checks.

The runner intentionally requires local database-creation permission and refuses pre-provisioned test databases. An abrupt external process kill or database outage can leave only the marked test database/artifacts behind; it cannot cause the runner to adopt a development database. Inspect ownership before any later manual cleanup. Upload cleanup is limited to persisted media references; an abrupt crash between file creation and recording its database row could leave an unreferenced test upload, as with the existing storage implementation.

## Additional MRT navigation defect exposed by stronger monitoring

Capturing console errors from all browser contexts exposed an existing ported pan bug: `<g> attribute transform: Expected number, "translate(NaN NaN)..."`. `point()` returns DOMPoint, whose x/y properties are non-enumerable. Spreading it into the drag state copied neither coordinate. Browser verification showed `Object.keys(new DOMPoint(10,20))` and its object spread were both empty.

`components/mrt/MRTMap.tsx` now stores `x: p.x, y: p.y` explicitly. The regression asserts finite SVG coordinates after dragging, rather than merely checking that the transform string changed. The normal desktop/mobile map and lifecycle regression passes with no collected console, page, failed-request or HTTP error responses. Expected aborted navigation requests are excluded from failure collection.

## Local `adminRestricted` investigation — not fixed

Current source schema, migration files and application queries still contain no adminRestricted field. The accessible branch history remains the original integration plus this repair branch. The generated Prisma 7.10.0 client matches this source; adding `adminRestricted:false` to its Listing query produces `Unknown argument adminRestricted`. The user's supplied Mac excerpt contains additional/different application source, and no full final Prisma message or local revision has arrived.

No adminRestricted field was added, removed or migrated. No local Mac database connection is available, and the cloud database is not assumed to match it. This local startup issue is **unresolved and unverified**.

Required local diagnostics, with secret values omitted:

```sh
git rev-parse --short HEAD
git status --short
node --version
npm --version
rg -n 'adminRestricted' app prisma
npx prisma migrate status --config prisma7.config.ts
npx tsc --noEmit
```

Also retain the full Prisma error's final explanation/code. If it says “Unknown argument,” compare the intended source schema to generated Client metadata before regeneration. If it says “column does not exist”/P2022, identify the exact moderation/admin migration and intended database before applying anything. Connection errors need a separate availability/binding diagnosis. Do not reset, db-push, or invent a column. The MRT migration cannot add an absent admin field. Only verification against the actual local revision/error/database can close this issue.

## Files changed

Application behavior is limited to two files:

- `app/api/listings/[id]/route.ts`: explicit parent write for station availability replacements.
- `components/mrt/MRTMap.tsx`: explicit finite pointer-coordinate copy.

Test infrastructure and documentation:

- `tests/run-isolated.ts` and `tests/support/{test-database,application-database,concurrency,browser}.ts`: owned database/app lifecycle, identity challenge, real lock ordering and portable browser launch.
- `tests/mrt-integration.ts`: removes shared importer/fake edit; actual endpoint cases, overlap and finite pan checks; all-context browser monitoring; ignored per-run artifacts.
- `tests/mrt-migration.ts`: only operates through the ownership-checked runner; no implicit development binding and no independent unscoped database deletion.
- `tests/test-safety.test.ts`: four guard/portability tests, bringing unit count to ten.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`: isolate generated test artifacts, without changing production origins.
- `package.json`: integration/migration commands use the safe runner; no dependency/version changes.
- `README.md`, `docs/mrt/INTEGRATION.md`, this report, and the preserved audit report.

## Verification results and remaining limits

Executed on Node 24.19.0 / npm 11.9.0, Next 16.3.8, Prisma 7.10.0, PostgreSQL 17.11 and configured Linux Chromium:

- Lint passed after excluding generated test build output. An initial lint run inspected generated artifacts and was corrected in the lint configuration; no source rule was disabled.
- TypeScript checking and production build passed.
- **Ten unit tests passed**, none skipped.
- Before-fix real endpoint race failed as intended (201 instead of 409); after-fix station-only and full-form races passed, with observed backend lock waits.
- Fresh isolated browser run passed identity challenge, all 120 station mappings, owner create/edit, real photo/video upload, borrower filtering/search/zoom/pan, explicit station confirmation, correct booking persistence and bilingual detail, unauthorized and stale/mismatched station rejection, historical location preservation, concurrent overlap protection, mobile selection, completed lifecycle/evidence, dispute authorization, logout and login.
- Fresh owned migration run passed historical/fresh migration chains, legacy keys and booking references, 120 canonical rows, two imports and an empty Prisma schema diff. No development or production migration was applied/reset.
- Missing test designation and existing-database targets were refused. Wrong application identity is covered by the guard test and the actual positive identity challenge. Failure cleanup and optional failure preservation were exercised.
- The original standalone MRT repository is unchanged. No dependency installs, production deployment, merge, or automatic booking retry occurred.

Managed-Chromium default selection is unit-tested; actual browser execution used explicit `/usr/bin/chromium`. Physical macOS/Safari/Firefox/mobile hardware and the user's local startup error remain unverified. Database cancellation during hard external termination is not a transactional cleanup guarantee. Historical tracked screenshots/reports remain untouched; current screenshots and reports are per-run artifacts instead.
