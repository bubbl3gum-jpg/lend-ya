# Hustlen’ MRT integration audit

Audit date: **2026-10-17, Asia/Taipei**. Diagnosis only; no application code, dependencies, schema, migrations, commits, branches, or environment configuration were changed. The sole tracked deliverable is this report.

## 1. Executive Summary

**The reported Mac homepage failure and the confirmed integration defect are different issues.**

The supplied Mac stack shows `app/page.tsx:8` calling `listing.findMany` with `adminRestricted: false`. Neither that field nor that query exists in the audited commit. In this cloud checkout, executing that query produces `PrismaClientValidationError: Unknown argument adminRestricted`. This confirms a source/client compatibility problem **if that query is run with this client**, but the supplied stack omits the underlying Prisma error. A stale client, a pending database migration in a newer local branch, and connection problems cannot be distinguished from the call-site stack alone. Do not reset the database or add fields speculatively.

The current cloud instance starts, serves the homepage, builds, passes TypeScript/lint and six unit tests, and supports the ordinary owner/listing/borrower/booking flow. These passes do **not** establish overall correctness: **a real station-only availability PATCH can race with a waiting booking and authorize a removed station**. A deterministic reproduction returned availability PATCH **200**, followed by booking **201** for a station absent from the committed availability. The prior concurrency test masks this case by explicitly updating the listing row, unlike the real station-only API path.

No confirmed critical startup defect was reproduced in the audited branch. One HIGH functional defect was reproduced. Additional test-isolation, portability, and development-origin issues are documented below. The exact Mac startup root cause remains unresolved pending the full final Prisma message and local Git revision.

| ID | Severity | Status | Finding | Integration attribution |
| --- | --- | --- | --- | --- |
| LOCAL-1 | HIGH impact if homepage remains unavailable | Local/cloud divergence confirmed; exact local cause unresolved | Local `adminRestricted` query is absent from this branch/schema/client | Not attributable to this integration commit from supplied evidence |
| MRT-1 | HIGH | Reproduced twice | Station-only availability removal can permit a stale concurrent booking | Introduced by the new availability-edit path; previous architecture also checked availability outside the transaction |
| TEST-1 | MEDIUM | Code-confirmed and contradicted by real endpoint reproduction | Concurrency test changes listing timestamp and misses actual PATCH behavior | Introduced |
| TEST-2 | MEDIUM | Code-confirmed side effects; existing script deliberately not executed | Integration test updates shared station data and retains fixtures rather than isolating its target | Introduced |
| DEV-1 | LOW | Reproduced | Test default `127.0.0.1` conflicts with default dev origin `localhost`, breaking HMR connection | Default Next.js protection pre-exists; new integration test uses the mismatching address |
| TEST-3 | LOW | Hardcoded path confirmed; Mac execution not available | Browser test defaults to Linux-only `/usr/bin/chromium` | Introduced; affects testing, not normal application startup |

## 2. Environment

| Item | Observed |
| --- | --- |
| Checkout | `/workspace/lend-ya` |
| Branch | `feature/official-mrt-booking` |
| Commit | `a02293d` |
| Comparison baseline | `45dd525` (direct parent, previous marketplace version) |
| Origin HEAD and main (read-only remote check) | `45dd525689f296a38409b83412e68132ba6ebe1b` |
| Integration diff | 41 files; 6,777 added / 212 removed lines, including data and reports |
| Node / npm | `v24.19.0` / `11.9.0` |
| Next.js / React | `16.3.8` / `19.2.8` |
| Prisma CLI / generated client | `7.10.0` / `7.10.0` |
| PostgreSQL | `17.11`, existing Compose service on port 55433 |
| Browser | Existing system Chromium via existing Playwright `1.64.1` |
| Configuration | Local ignored `.env` exists; DATABASE_URL is loaded by supported tooling, not exported in the parent shell. No credential values were printed. |
| User environment evidence | macOS-style path `/Users/yuiii/p2p-marketplace`; local revision, Node/npm versions, and full Prisma error not supplied |

The integration adds Playwright as a development dependency, its locked core package, and missing optional `@emnapi` lock entries. The other dependency-version pins were not changed by this commit; the lock diff also changes peer metadata. No packages were installed or upgraded during this audit.

Added code comprises the controlled map/modal selector, scoped CSS, retained JSON and identity data, station metadata/import, one forward migration, unit/migration/browser tests and reports. Existing create/edit forms and listing/booking APIs were modified. `app/page.tsx`, `lib/prisma.ts`, `prisma7.config.ts`, authentication APIs, and existing handoff/return/dispute endpoints were not modified by the integration. The original MRT repository remains unchanged.

## 3. Reproduction Results

Commands ran from `/workspace/lend-ya` unless noted. Logs and temporary audit harnesses are under `/tmp`; no repository tests or application sources were edited.

| Command / check | Exit / observed result |
| --- | --- |
| `git status --short`, branch/log/diff inspection | Initially clean; branch/commit as above |
| `node --version`, `npm --version` | 0; versions above |
| `npm run build` | 0; optimized build, TypeScript and page generation completed |
| `npx tsc --noEmit` | 0 |
| `npm test` | 0; **6 executed, 6 passed**, none skipped |
| `npm run lint` | 0 |
| `npx prisma migrate status --config prisma7.config.ts` | 0; eight migrations, database up to date |
| `npx prisma validate --config prisma7.config.ts` | 0; valid schema |
| `npx prisma migrate status` | 0 in this installed version/environment; no claim that config-less status is broken |
| `docker compose ps` | 0; existing PostgreSQL running; no service/database recreated |
| `npm run dev` | Freshly restarted the server previously launched in this same session; `Ready in 287ms`, port 3000, no startup exception. Process intentionally remains running. |
| Local GET homepage | HTTP 200; database-backed page renders |
| Read-only SQL inventory/mapping/orphan checks | 0; 120 distinct canonical rows, 136 codes, all metadata matches JSON, no station-reference orphans |
| Generated client schema comparison | Equal after whitespace normalization; the initial byte comparison differed only because Prisma formats schema text |
| Read-only reproduction of `listing.findMany({where:{status:'ACTIVE',adminRestricted:false},take:1})` | Caught `PrismaClientValidationError`, final line `Unknown argument adminRestricted. Available options are marked with ?.`; wrapper exits 0 after recording the expected error |
| `npm run admin:create -- --help` | 0; usage only, no user promoted |
| `node /tmp/mrt-audit.cjs` | 0 on completed runs; real API/browser flow and forced race; results in `/tmp/mrt-audit-browser.json` |
| `node /tmp/mrt-audit-ui.cjs` | 0; `zoom:true, pan:true, reset:true, pageErrors:[]` |
| `git diff --check` | 0 |
| `npm run test:integration` | **Not run**: imports shared station data twice, retains users/listings/bookings/uploads, and rewrites tracked artifacts |
| `npm run test:migration` | **Not run**: creates/drops a database and applies migration SQL; audit explicitly disallows applying migrations without approval |
| `npm ci`, `npm install`, Prisma generation/deploy/seed/reset | **Not run**; dependencies/client were inspected as found |

Two audit-harness issues were separated from application findings: an early immediate DOM count ran before the modal became visible, so the harness was corrected to wait for visibility; and the first browser attempt at `127.0.0.1` recorded a blocked HMR WebSocket. The successful workflow run used the address printed by `npm run dev`, `localhost`, with no application workaround or configuration change. A diagnostic attempt to `require` schema text as JavaScript produced a harness SyntaxError; the corrected text comparison confirmed matching schemas. None of these were interpreted as application compilation failures.

Temporary fixtures were necessary for the end-to-end/race test. Each run registered new `audit-*` accounts, created its own listing/photo/bookings, and used row locks only on that listing and its availability rows. Cleanup was scoped to the exact newly returned user/listing IDs and their generated upload filename. It removed only audit-created records/files, including their dependent sessions, handoff and return records. Final queries confirmed **zero remaining fixture users and listings**. No official station records, pre-existing user data or migrations were modified. Insert sequences naturally advanced. This is scoped fixture cleanup, not a database reset or general cleanup.

## 4. Critical and High-Priority Issues

### LOCAL-1 — Local homepage query differs from the audited source/client

**Observed impact:** The user reports a homepage exception at `app/page.tsx:8`, with `where: { status: 'ACTIVE', adminRestricted: false, ... }`.

**Evidence:** Audited `app/page.tsx:8–10` filters only `status`. `prisma/schema.prisma:105–124` defines Listing without `adminRestricted`; the generated client and PostgreSQL Listing table also lack it. A whole-project source search found no `adminRestricted`. Origin main still points to the pre-integration baseline. The supplied local excerpt is therefore from additional/different local source, not this audited homepage. The integration diff does not touch `app/page.tsx`.

**Controlled reproduction:** Construct the existing PrismaPg client using the existing binding, then issue this read-only call:

```ts
await prisma.listing.findMany({
  where: { status: "ACTIVE", adminRestricted: false },
  take: 1,
});
```

On the audited client: `PrismaClientValidationError: Unknown argument adminRestricted. Available options are marked with ?.` No rows are written.

**Root-cause status:** The local/cloud mismatch is confirmed. The actual Mac error class is not: the received stack stops before Prisma's final explanation. If it is `Unknown argument`, the query and generated client disagree. If it is a missing-column/P2022 error, the local generated client and database disagree. A connection/P1001-style error instead requires database/network diagnosis. These are alternatives, not established facts about the Mac.

**Proposed fix sequence, not executed:**

1. Capture the complete error and `git rev-parse --short HEAD`, `git status --short`, `node --version`, `npm --version` in `/Users/yuiii/p2p-marketplace`.
2. Locate `adminRestricted` in local application source, `prisma/schema.prisma`, generated client metadata and migration files. Run local read-only migration status against the intended database. Check binding presence and database availability without sharing secret values.
3. Agree which branch/schema is authoritative, preserving local work. Do not blindly switch/reset branches or remove the field.
4. For a confirmed stale generated client, regenerate from the correct existing schema, then restart Next.js. Generation changes local generated artifacts and is deferred for user authorization.
5. For a confirmed missing column, review the specific moderation/admin migration that adds it. Apply only after explicit approval and normal backup/deployment review. **The MRT migration does not add `adminRestricted` and cannot fix that column.** Do not create a speculative column, use `db push`, or reset the database.
6. Verify the actual homepage query, local type check/build and authenticated listing pages.

**Risk:** Regeneration is relatively low risk after schema alignment. Applying the wrong schema/migration or discarding local changes is high risk. No exact local migration name can be responsibly supplied from this checkout.

### MRT-1 — Station-only PATCH does not serialize stale booking snapshots as intended

**Affected sources:** `app/api/listings/[id]/route.ts:116–123,154–184`; `app/api/bookings/route.ts:111–166`; `prisma/schema.prisma:117`.

**Reproduction using isolated fixtures:**

1. Create an owner, borrower and listing approved for Taipei Main Station (integer 1 in this database).
2. Open an independent database transaction and row-lock **only this fixture's ListingStation row**. This temporarily blocks its deletion, without changing its content.
3. Start the real authenticated owner request: `PATCH /api/listings/<fixture>` with **only** `{ "stationIds": [5] }` (Ximen). The API acquires the Listing lock, then waits to delete the locked ListingStation row.
4. Start the real borrower POST for the soon-to-be-removed Taipei Main Station, using a future non-overlapping date range. Confirm in `pg_stat_activity` that the two requests are actually waiting on locks.
5. Release the fixture availability-row lock. Wait for the API requests and query the committed listing/booking.

**Observed twice:**

```json
{
  "patchStatus": 200,
  "bookingStatus": 201,
  "requestedStation": 1,
  "currentApproved": [5],
  "listingUpdatedAtChanged": false,
  "actualBlockedWaiters": 2
}
```

The 201 response's Booking persisted `meetingStationId: 1`, even though the owner removal committed before the waiting request finished. A previously committed legitimate booking correctly retained its historical station; that preservation is expected and is not the defect.

**Root cause:** A station-only body leaves the scalar listing `data` object empty. The transaction deletes/recreates ListingStation rows, then calls `listing.update({ data: {} })`. Prisma does not perform the scalar row update or advance `@updatedAt` for this empty update; the unchanged timestamp was measured. Both paths take a listing row lock, but a waiting Serializable transaction can retain its earlier snapshot when the locked listing tuple itself was never updated. Serializable isolation can order these overlapping operations as booking-before-edit; it does not by itself implement the promised “removal wins before a blocked booking” behavior.

**Attribution:** The station-only edit path and its claimed lock protection were added by this integration. The baseline already had weaker, pre-transaction station checking; this audit does not assert that the older version was race-free.

**Recommended fix:** Inside the existing edit transaction, always write the shared listing row when replacing availability, including station-only PATCHes—for example an explicit `updatedAt` write with the other fields, or a reviewed availability revision. Keep the Serializable booking transaction, row lock, eligibility/membership checks and conflict handling. Avoid an implementation that simply moves checks outside the transaction or blindly retries a stale user choice.

**Risk:** Moderate transaction/concurrency change; a timestamp-only solution needs no schema change but must be verified with actual endpoint requests. A revision-column approach requires separately reviewed schema/migration work.

**Verification:** Replace the synthetic edit in the existing test with real PATCH requests. Test station-only and full-form bodies, removal-before-waiting-booking (409/no new booking), booking-before-later-removal (historical location retained), overlapping booking requests, both roles, and explicit re-selection after 409.

## 5. Database and Migration Assessment

- Existing PostgreSQL is reachable. Eight migration directories are present and all have a finished application record.
- `20261016100000_official_mrt_stations` is **already applied here**. It would be required on another database that lacks the seven new station metadata columns. No migration was applied during this audit.
- History contains an earlier failed attempt at this migration marked **rolled back**, followed by a successful application. This is not an unresolved pending migration; do not delete history to make it look cleaner.
- Database inventory: **120 rows, 120 non-null/distinct canonical IDs, 136 line-code entries, 120 operational**. English name, Traditional Chinese name and code set for every row match retained JSON.
- Legacy mapping observed: TPE→1→`taipei-main`; JNT→3→`taipei-mrt:station:057`; ZSH→4→`zhongshan`; XIM→5→`ximen`; SSH→6→`taipei-mrt:station:111`. The migration updates these rows in place; it does not reassign primary keys. There is no live pre-integration database snapshot in this audit, so historical equality is supported by migration inspection rather than a newly rerun destructive migration test.
- Read-only left-join checks found **zero orphan Booking.meetingStationId references and zero orphan ListingStation.stationId references**.
- Canonical uniqueness is database-enforced. Shared interchange codes map to one row; BL07/Y16 Banqiao remains two distinct physical rows. Unit tests verify these distinctions.
- Existing generated Prisma schema matches source after whitespace normalization; DMMF exposes the required station fields. No client regeneration was needed to inspect the current instance.
- Import logic validates network structure, explicitly reconciles the five legacy codes, upserts by canonical ID, and fails on conflicting legacy identity. Unknown historical stations are retained but made ineligible for new official selections by default. No name/coordinate-based ID resolution was found.
- Source/client/database agreement **here** does not establish agreement with the user's local moderation/admin changes.

**TEST-2 (MEDIUM): test isolation is inadequate.** `tests/mrt-integration.ts:9–16` checks that URLs are loopback; it does not prove that the running web app uses the same database as the test's direct Prisma client. Lines 51–52 call `importMrt()` twice. `lib/mrt/import.ts:14–29` rewrites metadata and operational flags on all matched official rows. The test creates fixtures in that local database and only closes browser/client in its finalizer (`tests/mrt-integration.ts:577–579`). A localhost database is not necessarily disposable. Repeated execution can overwrite intentionally changed station metadata and leaves test records/uploads. The report explains retention, but this remains unsafe as a routine regression default.

Recommended correction: require an explicitly designated test database, verify application/database identity, avoid importing over shared development records, and scope teardown to test-owned fixtures/files. Provide an explicit retain-on-failure option if useful. Risk: test setup changes, with teardown itself requiring careful ownership checks. Verification: assert existing station metadata and unrelated record counts unchanged across repeated success/failure runs. Do not run the current importer merely to reproduce this risk on user data.

## 6. MRT Component Assessment

**Working in current browser checks:** Next.js rendering and hydration, 120 map markers, English/code search and focus, pointer selection, explicit confirmation, desktop zoom/pan/reset, and mobile tap selection/zoom with no horizontal page overflow. The monitored owner/borrower pages recorded no page exceptions; the owner-console collector recorded no errors. The mobile page did not have a separate console/network collector, so a complete mobile-console pass is not claimed. The audit exercised representative stations, not every pointer target on every viewport.

The network JSON hash matches the standalone prototype byte-for-byte:

`56c88d8cdda29a2a7ce209468d2a2ba61f1e4f4e1a0a76cc9963391d899691dd`.

The original SVG geometry, route edges, transfer distinctions, label placement utility, view transform and pointer-coordinate conversion are retained. Stateful/browser API access is inside the client boundary, effects or event handlers. `DOMPoint` is invoked in pointer handling, not during SSR. No missing module/import or hydration mismatch was reproduced. CSS map element selectors are scoped under `.mrt-selector`; dialog/workspace rules use dedicated MRT classes rather than application-wide element resets.

The integration intentionally removes prototype playground controls, sample/reset-app data and localStorage authority. It also omits line-wide bulk-selection shortcuts from the normal owner selector; that convenience is absent, but individual/multiple selection remains functional. It replaces Lucide map-tool icons with text symbols. These differences do not explain the homepage Prisma exception. Both repositories remain independently runnable; the audit did not start a second Vite server.

**DEV-1 (LOW): HMR origin mismatch.** `tests/mrt-integration.ts:9` defaults to `http://127.0.0.1:3000`, whereas plain `npm run dev` printed `http://localhost:3000`. At 127.0.0.1, browser console recorded a failed WebSocket handshake (`net::ERR_INVALID_HTTP_RESPONSE`), and Next logged `Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1"`. `next.config.ts:3–5` has no allowedDevOrigins setting. Normal localhost page interactions worked; this is not a database error or proof that all page JS is blocked. Prefer consistent documented/test origins, or review a narrowly scoped dev-origin setting if both names are deliberately supported. Do not weaken production origin checks. Verify HMR on the chosen address after restart. The existing test listens for only owner page exceptions, not all contexts' console/network errors, so this warning can escape its success report.

**TEST-3 (LOW): browser test default is not portable.** `tests/mrt-integration.ts:18–20` always chooses `/usr/bin/chromium` unless MRT_BROWSER_PATH is supplied. Unlike the prototype's fallback, it never uses Playwright's managed browser automatically. This works on the cloud Linux image; a standard Mac cannot be assumed to have that Linux path. No Mac browser run was possible here. Recommended change: explicitly support a configured system executable or Playwright-managed Chromium, with actionable prerequisite instructions. This concerns the test launcher, not `npm run dev` or the homepage. Risk is low; verify on Linux and macOS without installing packages during the audit.

## 7. Booking Workflow Assessment

The temporary audit harness exercised **actual application requests and browser form submission**, not mocked handlers:

1. New scoped owner/borrower accounts registered, logged out, rejected a bad password (401), then logged in successfully (200).
2. Owner opened listing creation, selected Taipei Main on the map, explicitly confirmed, uploaded a PNG and published through the existing multipart API.
3. PostgreSQL persisted the listing station and media. Borrower opened the listing, searched BL12, located/reset the map, selected/confirmed Taipei Main, entered dates, submitted, and reached booking detail.
4. Owner and borrower booking details showed the agreed bilingual station. Integer station ID was stored correctly.
5. Borrower PATCHing owner availability returned 403. Mismatched canonical/integer booking input returned 409.
6. Actual station-only owner PATCH succeeded; the forced concurrent stale-booking case **failed the intended business rule** as MRT-1 describes.
7. The earlier legitimate booking retained its agreed station after availability removal.
8. The original accept → first handoff → counterparty confirmation → return → inspection → completion sequence passed with checklist evidence.
9. A mobile viewport (390×844) could open the full-screen modal, tap an approved Ximen station and use zoom; confirmation enabled and no horizontal page overflow was observed.

Listing edit transactions validate owner and station eligibility, replace relations atomically and preserve omitted scalar fields. Ordinary station removal rejects a later request that starts after the edit is fully committed. That sequential case is insufficient to test the stale-snapshot race.

There is no canonical-string/integer-key mismatch in the tested ordinary flow. The booking transaction checks optional canonical identity against the selected integer row and retains the original Booking model. Historical stations are not derived again from a listing's current availability. No parallel booking system or separate return station was introduced.

## 8. Regression Test Results

| Area | Audit result |
| --- | --- |
| Unit tests | **6/6 passed**; inventory, legacy mappings, walking/interchange identity, input validation, search and wrapped serialization errors |
| Build / type / lint | Passed |
| Dev startup + database-backed homepage | Passed in cloud instance |
| Registration, logout, bad-password rejection, valid login/session use | Passed with temporary scoped accounts |
| Listing creation / photo storage / station persistence | Passed using real browser/form/API/database |
| Availability owner authorization / station-only edit | 403 for borrower, 200 for owner; race defect separately confirmed |
| Borrower booking, bilingual detail for both roles | Passed |
| Canonical mismatch rejection | Passed (409) |
| Existing agreed location after availability change | Preserved |
| Concurrent availability removal | **FAILED business rule**: stale booking 201, not expected 409 |
| Existing handoff/return/completion/checklist workflow | Passed against temporary audit booking |
| Desktop zoom/pan/reset / search | Browser verified |
| Mobile selection/zoom/overflow | Browser verified on emulated viewport, not physical device |
| Existing `test:integration` script | Not executed as-is; source reviewed, audit harness used instead |
| Existing `test:migration` script | Not executed; would apply migrations/drop its temporary database, outside this audit's permission |
| Dispute creation / reviews / reports | Code/diff reviewed; **not rerun during this audit** |
| Admin role promotion | Usage/help only; **no promotion executed** |
| Admin UI/moderation including `adminRestricted` | **Not verifiable**: no such implementation in audited branch; CLI is the only admin role tool here |
| Safari / Firefox / macOS / physical mobile | Not executed |
| Fresh installation / fresh migration replay / missing DB startup | Not executed; no install, generation, migration or service disruption allowed merely to manufacture failures |

**TEST-1 (MEDIUM): the concurrency regression is not the real endpoint.** `tests/mrt-integration.ts:343–352` constructs its own database edit and explicitly writes `updatedAt`. The real station-only PATCH leaves scalar `data` empty and does not perform this write. Thus the test can pass and its report can say “no stale booking persisted” while the production endpoint fails exactly that case. Recommended fix: use real authenticated PATCH requests and a fixture-scoped blocker to establish actual waiting, preserving the station-only request body. Verify the test fails on this commit before implementing the fix, then passes after it. Risk is low-to-moderate test coordination complexity. The earlier saved integration success report is historical evidence of what that harness ran, not proof against MRT-1.

## 9. Recommended Fix Order

No steps below were implemented in this audit.

1. **Triage the user's homepage first:** obtain the complete local Prisma message and local revision; align the actual app/schema/client/database around `adminRestricted`. Choose regeneration versus a specific reviewed migration only from that evidence. Do not apply the MRT migration as an assumed fix for an admin column.
2. **Add an honest failing regression for MRT-1/TEST-1:** exercise the real station-only PATCH under an actual row-lock wait and assert stale booking rejection. Retain both commit orderings and the historical-station case.
3. **Fix the shared serialization point:** make every station-set edit actually write the Listing row within the existing transaction; preserve Serializable isolation and conflict-to-409 behavior. Re-run the endpoint race and overlap tests.
4. **Isolate TEST-2:** dedicated test DB/app identity, no shared import side effects, ownership-scoped teardown and explicit artifact retention policy.
5. **Improve developer/test portability:** use a consistent dev origin; support the configured or Playwright-managed Chromium path. Capture page errors, console errors and failed requests across owner, borrower and mobile contexts.
6. Re-run build/type/lint/unit, true endpoint concurrency, authenticated complete lifecycle, media and migration compatibility tests once separately authorized. Validate the user's actual Mac checkout before claiming its crash fixed.

The first local diagnostic commands are read-only:

```sh
git rev-parse --short HEAD
git status --short
node --version
npm --version
rg -n 'adminRestricted' app prisma
npx prisma migrate status --config prisma7.config.ts
npx tsc --noEmit
```

Keep the complete Prisma error's terminal explanation and code. Do not paste `.env`, database passwords, session cookies or tokens.

## 10. Uncertainties

- The local query differs from audited source, and its final Prisma error is still missing. The precise local startup root cause and required local migration cannot be named yet.
- This is a configured Linux cloud instance. Build/startup passes do not establish reproducibility on a clean Mac, another Node version, an ungenerated client or a different database.
- Current metadata and foreign keys are healthy, but this audit did not rerun forward migrations. Historical migration tests in the repository were inspected rather than executed.
- The retained dataset is dated October 16, 2026, not live service status. No new official network fetch/topology reconciliation was performed; the ported JSON matches its original source exactly.
- The full original standalone browser suite was not rerun; port comparison was source/data inspection plus direct integrated navigation tests.
- No production deploy, merge, package installation, schema fix or application modification occurred. Previous generated reports/screenshots were not overwritten. Only this report is added to the checkout.
