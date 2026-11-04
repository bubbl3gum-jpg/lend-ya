# Original Prompt 1 acceptance recheck

Date: **2026-11-04**. The opening review rechecks Prompt 1 only; its later
Prompt 2 and Recovery R3/R4 follow-ups are appended below. Reports were inspected against
current source and fresh checks, not accepted as proof of correctness.

## Identity and provenance

- Checkout: `/workspace/lend-ya-recovery`; branch
  `recovery/candidate-validation-20261103`.
- **Source actually tested:** `be75415d1e5c56490abbacfe80cb4193e20ad381`.
  Initial working tree/index were clean. Local and remote HEAD matched.
- Known checkpoint `1e88e9e6b2d0e68f3773ce5917035e2dda8be43a` is an ancestor;
  later R2 documentation was retained. No reset, replacement checkout or merge.
- Fetch/push origin: `https://github.com/bubbl3gum-jpg/lend-ya.git`.
- Read root `AGENTS.md`, recovery/completion context, `RECOVERY_PLAN.md`,
  `RECOVERY_LINT_CHECKPOINT.md`, `SETUP_REPEATABILITY.md`, current setup docs,
  package/CI/configuration, seed/import and actual isolated/baseline assertions.
  All operational/feature gates remain unchanged.

**Recovered versus reconstructed:** the missing original uncommitted patches
were not recovered. `a0ded79` preserves an audit, not those implementations.
The broader candidate `cf61149442229fc60d2879752e8574a5df5c493e` supplied inherited
working system-font, Prisma, MRT, lifecycle and owned-test infrastructure;
equivalent functionality is not proof of identical original files. Setup scripts,
runtime/template alignment, seed finalization and baseline regression were
reconstructed in `8104170b0aaabcec9413abef93811ee708305cff`, inherited through
the R1 checkpoint. The earlier lint correction and later R2 documentation remain
preserved. This recheck changes documentation only; executable source tested is
unchanged by the report commit. No historical migration or booking data changed.

## Requirement matrix

| Requirement | Actual implementation | Executed evidence | Pass/Fail/Blocked/Intentional difference |
| --- | --- | --- | --- |
| No mandatory Google/network font fetching | `app/layout.tsx` imports CSS, no font loader. CSS uses Arial/Helvetica, Georgia/Times and system monospace; app/components/lib/public scan found no Google-font loader/host/import. | Fresh clean install, generation and full build results below; source scan. Network policy was not changed to manufacture an offline test. | **Pass** for font independence; not a claim that dependency installation/generation is offline. |
| Production build with initialized isolated database | `build:verify` creates/marks a fresh DB, deploys complete migrations, then invokes the same `next build` used by normal build. | Fresh dedicated initialized-DB build exits 0 through route/static generation and final route report. | **Pass**; a complete production build, not compilation alone. |
| Build without accessible application tables | Marketplace discovery queries Prisma before appearance/locale cookie access; no request-time-boundary change was introduced by R1. | Separate normal `npm run build` against a new DB with verified zero public tables, recorded below. | **Intentional difference**: database-independent rendering was explicitly deferred in R1; do not equate this with the prepared-DB build. |
| Explicit Prisma config and alignment | `db:generate`, `db:migrate`, `db:seed` select `prisma7.config.ts`; schema/migration paths and seed are defined there. CLI/Client/adapter all 7.10.1 in manifest, lock and installed metadata. | Fresh generation passes; metadata matches; baseline executes actual configured migrations/seed/import commands. | **Pass**. |
| Safe combined setup | `db:setup` chains generation → migration deployment → existing MRT importer with `&&`. No reset/truncate/db push/implicit seed. | Initial setup in empty owned DB creates zero users/bookings; deliberate importer failure returns exit 1 and leaves table snapshots unchanged. Earlier-step short-circuit is explicit in script, not a separately injected generation/migration failure. | **Pass** for tested setup contract. |
| Fresh migrations and MRT import | All current migration directories deployed; transactional importer validates official network, preserves legacy IDs and upserts canonical metadata. | Baseline requires all 33 migration names, 120 initial stations and no implicit demo records. | **Pass**. |
| Repeatable full rows, identities and relationships | Baseline snapshots exact PostgreSQL JSON text of every public table, avoiding JS numeric/date reinterpretation. Custom station, listing link, cancelled booking with quotation/idempotency/reference fields and seeded meetup rows are included. | Fresh baseline compares all 76 public tables unchanged after setup rerun and explicit seed rerun, including complete migration ledger/checksums. | **Pass** for synthetic fixtures, not production-data provenance. |
| Demo seed cleanup and restrictions | Local-only/non-production guards inside main; existing fill-missing behavior retained. Catch sets nonzero exitCode; finally awaits Prisma disconnect; disconnect errors also fail. | Two demo bookings created only by explicit seed; rerun unchanged. Deliberately conflicting import causes seed exit 1 without hanging, followed by successful cleanup checks. | **Pass**. |
| Owned cleanup on success and failure | Existing strict local target/driver checks, CREATE refusal for existing DB, random ownership marker and verification before subprocesses/drop preserved. Recorded UUID listing uploads only are removed; diagnostics retained. | Baseline's separate failed child DB/upload disappears while parent's marker/rows/upload survive. Independent final maintenance check below verifies all recheck targets absent. | **Pass**, subject to final cleanup evidence below. |
| Runtime / CI / manifest / lock agree | `.node-version` 24.19.0; engines Node 24.x/npm 11.x in manifest and lock root. CI reads the version file and uses generation/typecheck/baseline scripts. | Actual Node 24.19.0/npm 11.9.0; fresh locked install passes; metadata equality checked. Hosted CI not executed. | **Pass** locally; hosted CI remains unverified. |
| Credential-free environment/setup docs | `.env.example` contains empty private URL/secret slots, explicit bounded confirmation window and optional test/browser settings; no gate activation. README documents setup, separate seed and typecheck. | Current template/readme/config inspected against executed scripts. No `.env` or credential copying. | **Pass** for local sequence. |
| Generation, full typing, lint, units | Actual supported npm scripts; no fake generated exports, TLS/checksum bypass or weakened lint rules. | Fresh generation/typegen/full tsc/lint exit 0; 202 unit tests pass with no skips. | **Pass**. |

## Fresh execution ledger

All commands run from the recovery checkout on the source revision above.
New disposable `postgres:17` container `lend-ya-prompt1-recheck-20261104`, no
persistent volume or copied data, loopback port 32770. Credentials are omitted.
Supply a private URL naming the indicated **nonexisting** local database via
`MRT_TEST_DATABASE_URL`; never use a developer/production target. Database/build
experiments run sequentially, each with a distinct new owned target.

| Command/check | Actual outcome |
| --- | --- |
| `npm ci` | **Pass**, exit 0; 573 packages; existing ESLint 9 support warning. Package metadata/lock unchanged. |
| `npm run db:generate` | **Pass**, exit 0; generated Client 7.10.1 after clean install. No current reproduction of the former download blocker. |
| `npm run typecheck` | **Pass**, exit 0; `next typegen` then full-project `tsc --noEmit`. |
| `npm run lint` | **Pass**, exit 0, no diagnostics. |
| `npm run test:unit` | **Pass**, exit 0; 202 passed, zero failed/skipped. |
| `npm run test:baseline` | **Pass**, exit 0; 33 migrations, all 76 public-table snapshots unchanged, intentional failure/cleanup assertions passed. |
| Normal `npm run build` against empty schema | **Fail**, exit 1 while prerendering `/`: `TableDoesNotExist` at `lib/marketplace/discovery.ts:11` (`prisma.listing.findMany`), called by `components/marketplace/home.tsx:15`. Temporary harness exits 0 only after recording the actual failure and performing guarded cleanup. This is not a successful full build. |
| `npm run build:verify` | **Pass**, exit 0; all 33 migrations applied to its new database, complete production build/typing/static generation/final route report. |

Baseline target: `hustlen_test_p1_baseline_20261104`, with separate random child
`hustlen_test_baseline_failure_<run-id>` for deliberate failure. Empty build
target: `hustlen_test_p1_empty_build_20261104`; initialized build target:
`hustlen_test_p1_build_20261104`.

The empty-schema experiment uses a session-only harness
`/tmp/lend-recheck-empty-build.ts`. It reuses `testDatabaseUrl`,
`connectTestDatabaseTarget`, `testRunId` and `assertOwnedDatabase`, creates a
nonexisting marked DB, verifies zero public tables, runs normal build, then
checks ownership before dropping only that DB. It does not skip migrations in
the production setup or alter the established build runner. Diagnostics:
`/tmp/lend-recheck-{install,generate,typecheck,lint,unit,baseline,empty-build,empty-harness,build}.log`
and ignored `.test-artifacts/` manifests. These are session-local evidence, not
committed generated artifacts or durable backups.

**Independent cleanup passed:** maintenance query in the new disposable
container found zero `hustlen_test_*` databases after all runs. Baseline and
initialized-build manifests report `passed: true, preserved: false`; the
intentional failure child reports `passed: false, preserved: false`, as required.
The empty-schema harness separately verified ownership before dropping its DB.
No listing upload files remain. The task's container was stopped/auto-removed;
no pre-existing container or database was stopped, reset, adopted or queried.
Diagnostic artifacts remain intentionally available, ignored by Git.

## Scope, limits and handover

No original missing implementation files were found or recreated in this
recheck. No application, schema, migration, dependency, booking policy, pricing,
idempotency, reservation, evidence or feature-gate change was needed for the
passing setup contract. No production/developer data, hosted CI or physical
devices were used. This is not execution of the broader API/browser lifecycle
suites, other prompts or an application security audit.

The accepted build contract remains **font-independent, with an initialized
database available during build**. A prepared database requirement is a real
operational prerequisite, not proof of database-independent rendering. If the
desired acceptance criterion includes builds without application tables, that
criterion remains a separate intentional difference to resolve explicitly;
this report does not silently mark it passed. Setup commands are sequential, not
one atomic cross-command transaction: committed migrations remain if a later
transactional MRT import fails, and rerunning after fixing the cause is required.

Stop here after Prompt 1. Handover for **Prompt 2 / R2**: preserve the existing
R2 disposition at `be75415`; revalidate advisories at that stage rather than
resetting or blindly repeating upgrades. Prior residual minimatch counts are
dated dependency evidence in `DEPENDENCY_SECURITY.md`, not a new audit executed
in this Prompt 1 review. R3–R7 behavior and product decisions remain untouched.

## Prompt 2 acceptance follow-up / Recovery R2

**2026-11-04, Asia/Taipei.** Starting local and independently queried remote:
`b532e0348c219fd78a8f04dfa95bfc3eaad569c9`, on the same recovery branch and
verified GitHub origin. Working tree/index were clean; checkpoint ancestry and
the existing R2 commit `be75415` were verified. Nothing was reset or recreated.
Manifest, lock, overrides and lint configuration are unchanged from R2, and the
executable source is unchanged from the recent Prompt 1 checks above.

| Requirement | Actual implementation/disposition | Newly executed evidence | Acceptance |
| --- | --- | --- | --- |
| Fresh full audit, findings versus failures | 16 moderate affected-package entries, 0 high/critical; **one distinct advisory**, GHSA-g3hv-75wg-m249 | `npm audit --json`: valid result, exit 1 because findings exist; no retrieval/authentication failure | **Pass**, residual finding explicitly retained |
| Production-installed audit | Zero findings; not a claim of complete application security | `npm audit --omit=dev --json`: valid result, exit 0 | **Pass** |
| Versions, paths and exposure | minimatch 3.1.5 through ESLint 9.39.5/config-array/eslintrc and import/a11y/React plugins; 10.2.6 through TypeScript ESLint 8.71.0. Every reported node is marked dev in lock. Lint and CI execute these packages; no marketplace API path was found. | Targeted `npm ls`, full installed graph exit 0, current source/config inspection, all 16 findings mapped to lock versions/dev flags | **Pass**, development/CI DoS exposure remains relevant |
| Compatible supported remediation | Fixed range starts 11.0.1, current latest 11.0.4. Published 3.x/10.x lines remain 3.1.5/10.2.6. Current consumers still require those affected majors. | Fresh `npm view` versions/dependencies/peers/engines: ESLint 10.14.0 still needs minimatch 10; plugins still exclude ESLint 10 peers; config-next 16.4.5 and typescript-estree 8.72.1 retain affected families | **Pass** for disposition; no compatible advisory-removing update established, no forced override/downgrade/suppression |
| Existing fixes/override retained | Scoped Prisma mysql2 3.24.6 retained; Prisma 7.10.1 publishes exact 3.24.4, latest mysql2 remains 3.24.6. Locked deepmerge-ts 8.0.2/fast-uri 3.1.9/zod 4.6.7 retained. | Installed dependency paths and fresh Prisma/mysql2 registry metadata; manifest/lock unchanged | **Pass**, PostgreSQL-only application usage; no MySQL protocol testing claimed |
| Accurate dated documentation | Existing R2 counts/path inventory still match. README's November 4 counts and linked disposition remain accurate without another README edit. | Fresh audits compared with existing R2 report; this appendix and security-report addendum record recheck evidence | **Pass** |
| Appropriate functional validation | Documentation-only changes; dependency/config/source unchanged | Reuse, **not rerun**, recent Prompt 1 clean install, generation, full typing, lint, 202 units, 33-migration/76-table baseline with failure cleanup, and initialized full build | **Pass** for unchanged executable source |

**Before/after:** no finding, version, dependency metadata, override or exposure
change since the preceding R2 assessment. The residual moderate advisory is
documented, not suppressed or declared fixed. Upstream must supply compatible
backports or supported consumer releases adopting fixed minimatch APIs/versions.
No new high/critical or production advisory regression is reported.

New evidence files are session-local `/tmp/lend-p2-recheck-{full,prod}.json`,
`/tmp/lend-p2-recheck-paths.txt`, `/tmp/lend-p2-recheck-installed.json`; registry
queries also returned successfully. No database/API/browser/build suite or clean
installation was newly executed in this Prompt 2 review. No database was created
or accessed, so no new database cleanup operation was required.

**Separate open difference retained:** the earlier normal empty-schema build
failed on homepage prerendering; the prepared isolated full build passed. No
rendering change was made and database-independent build acceptance is not met.

**Prompt 2/C acceptance: Pass with documented residual advisory.** Only the
recheck/security documentation changes are checkpointed. Normal push must target
only this recovery branch, followed by independent exact remote-SHA comparison;
no main merge, force push, deployment or environment publication.

Handover for **Prompt 3/D**: inspect current parser/form/API and documented
business rules, split Taipei wall-clock input conversion from strict explicit
API instants, validate real dates and policy configuration, and add appropriate
boundary tests. Resolve the fixed 90-day versus configurable 30-day default
before policy changes. Preserve authoritative exact Decimal arithmetic, durable
replays, acceptance reservation locks, evidence, R1 setup/ownership safeguards
and feature gates. Do not shift historical timestamps or fold the open build
difference into booking validation work.

## Recovery R3 — strict timestamps and configurable policy

2026-11-04, Asia/Taipei. Starting clean local/remote checkpoint:
`8d3adbb50e5c6a1a1a270d438f95d77116908b6e`, branch
`recovery/candidate-validation-20261103`, verified GitHub origin. Existing
checkpoint ancestry and later work were preserved; no reset. Root instructions,
recovery/recheck documents, applicable existing UI contracts, booking callers,
API/hash/transaction logic and tests were inspected. Tests below executed on
that source plus the reviewed R3 working-tree changes committed with this report;
subsequent documentation does not imply another source revision was tested.

### Implemented contract and acceptance

| Requirement | Implementation / actual evidence | R3 disposition |
| --- | --- | --- |
| Taipei local input to explicit API instants | Single maintained creation form uses calendar-checked `taipeiInputInstant`; sends ISO Z before quotation and creation. Browser contexts Los Angeles/Honolulu versus UTC server assert actual payload and PostgreSQL stored time. | **Pass**; no device-zone interpretation. |
| Strict new API requests | `parseBookingInstant` requires explicit Z/numeric offset; rejects impossible dates, unknown -00:00 offset, malformed syntax and >3 fractional digits. Supported range/precision documented in `BOOKING_TIME.md`. | **Pass**; new naive requests/quotes return 400. |
| Preserve old operation identities | Canonical field order/hash normalization, caller-scoped key and stored quote checks remain unchanged. Legacy parsing can only return a matching authenticated stored operation; a miss cannot create or quote. | **Pass**; synthetic old now-past 60-day operation replays under configured 30, wrong actor/unknown key/altered terms fail, restart tests replay both explicit/legacy forms. No historical hash/row rewrite. |
| Configurable bounded policy | Server-only env resolution uses `BOOKING_MAX_DURATION_DAYS` 1–365, default **90**; `BOOKING_MAX_NOTES_UNITS` 1–10000, default **2000 raw UTF-16 units**. Missing only uses defaults; malformed/empty/fractional/unsafe settings fail. Resolved numbers feed the form and read-only Admin duration inventory. | **Pass**; earlier proposed 30-day default deliberately **not adopted**. Configured 30 is exercised, not made the default. |
| Replays precede current policy | Matching committed request returns before current limits/config/future validation. Form preserves an in-memory same-key failed-response retry. | **Pass**; browser restart with lower duration/notes settings and then malformed duration preserves retries while new quote returns 503. |
| Raw notes and whitespace | Compare raw `.length` before trimming; spaces count, surrogate-pair emoji consume two units. Storage/hash still trim and normalize empty to null. Form maxlength/help and alert use the same resolved policy. | **Pass**; exact UTF-16/whitespace boundaries and invalid settings tested. |
| Post-lock new-write expiry | Check start after existing listing lock and immediately before insertion after documentation binding; throw controlled 400 inside transaction for rollback. Same-operation conflict recovery may still replay a committed row. | **Pass**; real PostgreSQL blocked-request observation, wait until its start boundary, release lock, verify 400 and no partial Booking/Meetup rows. |
| Exact pricing unchanged | Authoritative listing Decimal × ceil(elapsed 24h periods), existing DECIMAL(12,2) guard/snapshots/serialization. | **Pass**; quotation tests at 9999999999.99 and 9999999999.98, overflow rejection, +1ms billing, equivalent offsets and ignored client price/total tampering; existing stored-price tests/lifecycle remain passing. |
| Reservations/auth/evidence/idempotency | Existing Serializable transaction/listing lock, overlapping PENDING and conflicting acceptance behavior preserved; no lifecycle/gate changes. | **Pass** for focused API/lifecycle/stability and owned documentation-agreement regressions, not a claim R5 is complete. |

API/form rollout and replay details, defaults/bounds and notes behavior are in
`docs/BOOKING_TIME.md` and `.env.example`; README now links the contract. A narrow
inventory compatibility update replaces the removed fixed-duration constant
with the resolved value behind the same Admin read authorization. No Admin edit
capability or gate was added. Other features that intentionally accept local
wall time keep the old parser; it was not globally made strict.

Maintained API test fixtures in rental/stability and adjacent chat, meetup,
documentation, moderation, location, workbench, security and recovery helpers
were coordinated by adding explicit +08:00 to booking request literals. Their
intended instants remain the same. HTML datetime-local entries, synthetic SQL
history and the new deliberate legacy-replay probes remain appropriately local.
No assertions were deleted, and this does not claim every adjacent suite ran.

### Executed checks and cleanup

Fresh local `postgres:17` container `lend-ya-r3-validation-20261104`, no existing
volume/database or copied credentials, loopback port 32771. Each suite ran
sequentially on a distinct new owned target, using existing creation/marker/
actual-driver guards and cleanup. Credentials omitted; use your own local
connection via `MRT_TEST_DATABASE_URL` to reproduce these commands.

| Command | Actual result | Fresh owned database |
| --- | --- | --- |
| `npm run db:generate` | **Pass**, exit 0, Client 7.10.1 | No DB work |
| `npm run typecheck` | **Pass**, full route generation/tsc, including final changed files | No DB work |
| `npm run lint` | **Pass**, no diagnostics, including final changed files | No DB work |
| `TZ=UTC npm run test:unit` | **Pass**, 206 passed, 0 failed/skipped | No DB work |
| `TZ=America/Los_Angeles npm run test:unit` | **Pass**, 206 passed, 0 failed/skipped | No DB work |
| `TZ=UTC npm run test:rental-api` | **Pass**, 15 passed, 0 failed/skipped; default 90/2000 | `hustlen_test_r3_api_default_20261104` |
| `TZ=UTC BOOKING_MAX_DURATION_DAYS=30 npm run test:rental-api` | **Pass**, 15 passed, 0 failed/skipped | `hustlen_test_r3_api_30_20261104` |
| `TZ=UTC BOOKING_MAX_DURATION_DAYS=30 npm run test:rental-browser` with verified Chromium paths | **Pass**, 4 passed, 0 failed/skipped; actual form uses configured 30, explicit storage, restarted lower/malformed policy and lifecycle | `hustlen_test_r3_browser_20261104` |
| `TZ=UTC npm run test:stability` | **Pass**, 8 passed, 0 failed/skipped, including controlled real deadlock/idempotency/permissions | `hustlen_test_r3_stability_20261104` |
| `TZ=UTC npm run test:rental-documentation` with Chromium paths | **Pass**, 1 passed, 0 failed/skipped; existing scoped agreement/acknowledgement and acceptance gates | `hustlen_test_r3_documentation_20261104` |
| `TZ=UTC npm run build:verify` | **Pass**, complete initialized production build, exit 0; final form-retry source also rebuilt successfully below | `hustlen_test_r3_build_20261104` |

The initial browser and initialized build passed before final review found the
form's existing quotation-reset behavior would interfere with a lost-response
retry. The final fix retains the reviewed request after transport/5xx failures.
Its new real-browser probe commits a write, drops only the response, and requires
the same key/payload plus one stored booking on retry. The first probe run in
`hustlen_test_r3_browser_retry_20261104` failed because its asynchronous test
assertion observed an unrelated/unscoped alert before the response callback set
the status (undefined versus 201); subsequent subtests cascaded. No production
failure was hidden or assertion removed. The test now polls the actual committed
response status and scopes the alert to the booking form. That failed runner
still removed its owned database/uploads. Final probe and final build results
are recorded below after execution.

**Final-source checks passed:** the corrected lost-response probe and complete
browser suite passed **4/4**, zero skips, on
`hustlen_test_r3_browser_final_20261104`. The real server commit was observed
before dropping its response; retry used an identical key/body and left exactly
one booking. Full typing and lint passed again after this last form change.
Both complete unit runs were repeated on the final source: **206/206 under UTC**
and **206/206 under America/Los_Angeles**, zero skips. Final `build:verify` passed
all migration, compilation, typing, static-generation and route-report stages
on `hustlen_test_r3_build_final_20261104`; this is not compilation-only success.
Logs include `/tmp/lend-r3-browser-final2.log`, `types-last`, `lint-last`,
`unit-utc-final`, `unit-la-final` and `build-final` under `/tmp/lend-r3-*.log`.

**Cleanup independently verified:** a maintenance query against only the new
task container found zero `hustlen_test_*` databases. All **nine** R3 runner
manifests record `preserved: false`; eight successful runs passed and the one
asynchronous probe failure is explicitly recorded as failed. No listing upload
files remain. The task container was then stopped/auto-removed. Existing
developer/production databases, uploads and containers were not accessed or
reset; diagnostic artifacts remain ignored for review.

**R3 acceptance: Pass**, with retained 90-day default and documented external
client rollout requirements. There is no remaining R3 validation blocker. These
results do not imply R4/R5 acceptance or a database-independent build.

`/usr/bin/chromium` was checked executable before browser suites (version
154.0.8037.57). `MRT_BROWSER_PATH` and `CHROMIUM_PATH` used that executable.
Logs are session-local `/tmp/lend-r3-*.log`; existing runner manifests are ignored
under `.test-artifacts/`. Source fixture-only changes in other specialized suites
were type-checked, not all executed individually. Clean installation/dependency
audit and baseline were not repeated: no dependency/setup/runner/seed/migration
metadata changed, and recent Prompt 1 evidence remains labelled as such above.

### Remaining differences / R4–R5 handover

The task's explicit policy is retained **90**, configurable; it intentionally
differs from the earlier proposed default 30. Currency, elapsed-day rounding,
stored timestamps and historical idempotency rows are unchanged. Older/external
clients need explicit instants for new requests; only matching stored legacy
operations have compatibility access. This is a coordinated client/API rollout,
not a migration that can infer historical intent.

R4: make all booking/activity displays consistently communicate Taipei time;
the existing UTC activity display and broader formatter input expectations are
not fixed here. R5: extend exact adjacency, deterministic nonconflicting/MVCC
retry/concurrency coverage beyond the focused lock-expiry and preserved existing
races. The separate empty-schema build failure remains open; no request-time
rendering change was introduced. No production activation, provider call, main
merge, force push or deployment is part of this task.

## Recovery R4 — consistent Taipei display

2026-11-04, Asia/Taipei. Starting clean local/remote checkpoint:
`de79da976007660167d2f4ac60edb7f69ed26212`, on the existing recovery branch and
verified GitHub origin. Ancestry checked; no reset or older checkout recreation.
Root instructions, booking/recheck reports, existing date/currency/localization
helpers, relevant UI/gated workflow contracts and tests were inspected. Executed
checks apply to that base plus the reviewed R4 changes in this checkpoint.

### Display inventory and contract

| Path / requirement | Actual finding and change | Evidence / status |
| --- | --- | --- |
| Booking detail, owner/renter dashboards | Already use `formatRentalTime` with date and minute, not date-only. Inherit safe explicit parsing and actual-offset label. | Historical +09 range and modern +08 dates checked on real pages in both participant roles; **Pass**. |
| Account activity | Had explicit `toISOString` UTC-only output. Replaced with the shared Taipei helper. | Requested/handoff/return/inspection events from the synthetic 1979 fixture checked; **Pass**. |
| Handoff/return/inspection evidence and verified history | Evidence/reviews/trust already use shared helper. No lifecycle or authorization changes. | All four historical evidence sections checked; existing completion/review/restart/dispute flow retained; **Pass**. |
| Meetup temporary-location/check-in/QR/receipt deadlines | Found **five** `toLocaleTimeString` calls that depended on browser timezone and omitted the date. Replaced only these display calls with shared Taipei formatting, retaining seconds. | Unit helper precision/zone checks plus existing meetup regressions below. Countdown, verification, physical receipt and expiry arithmetic unchanged. |
| Localized rental documentation, inspection, claims and coordination history | Used generic localized formatter or a separate direct Intl formatter. Routed rental-only calls through shared helper, passing existing en-GB/zh-TW locale and preserving inspection seconds/absence labels. | Full typing and targeted scoped integration/browser checks below; no global `lib/i18n/core.formatTime` change or gate activation. |
| Invalid/ambiguous inputs | Old helper called `new Date(value)` and could normalize naive dates or throw on invalid data. New private display parser validates calendar/explicit offset before formatting, independent of R3 policy. | Unit cases return clear unavailable text for malformed values instead of plausible dates/crashes; **Pass**. |
| Historical timezone offsets / immutability | Offset derived for the actual instant via Asia/Taipei Intl longOffset; no fixed historical +08 assumption. Date objects are cloned; strings must be zoned. | 1979 July +09, 1979 winter/modern +08, historical +08:06 and early-year units; complete synthetic row snapshots unchanged; **Pass**. |
| Currency / localization | Existing USD price helpers and `formatMoney` left unchanged because no tested boundary defect was demonstrated. | Zero/fractional/MAX values in en-US/zh-TW units; real detail zero Decimal deposit/MAX total and fractional existing rental display; **Pass**. |
| Preserved contracts | R3 API/parser/policy/hash/transactions unchanged; unrelated date-only and other-feature formatters retained. Read-only Admin clock text now describes per-instant offsets. | Source diff inspection and existing R3 browser replay/lifecycle checks; **Pass**. |

The exact accepted display grammar, safe placeholders, localization, precision
and historical rule examples are documented in `BOOKING_TIME.md`. A valid stored
Date is displayed as its actual instant, not “corrected” to a guessed intended
wall clock. No existing historical row, amount or relationship was modified.
New synthetic history was inserted only into the marked owned regression DB.

### Actual validation

New disposable `postgres:17` container `lend-ya-r4-validation-20261104`, no copied
or existing data, loopback port 32772. Credentials omitted; database commands use
private `MRT_TEST_DATABASE_URL` bindings naming nonexisting local `hustlen_test_*`
targets. Existing ownership/local-driver/create/drop/upload safeguards remain.
Browser paths were checked executable (`/usr/bin/chromium`, version
154.0.8037.57); FFmpeg/ffprobe are installed for existing virtual-camera tests.
Database suites run sequentially with distinct fresh owned databases.

| Check | Actual result |
| --- | --- |
| `TZ=UTC npm run test:unit` | **Pass**, 209 passed, 0 failed/skipped. |
| `TZ=America/Los_Angeles npm run test:unit` | **Pass**, 209 passed, 0 failed/skipped. |
| `npm run typecheck` | **Pass**, full route generation/project tsc, including final helper/screens/fixture types. |
| `npm run lint` | **Pass**, no diagnostics. |
| `TZ=UTC npm run test:rental-browser` | Initial new-selector attempt failed; corrected final run **Pass**, 5 passed, 0 failed/skipped on `hustlen_test_r4_browser_final_20261104`. |
| `TZ=UTC npm run test:meetup` | **Pass**, 16 passed, 0 failed/skipped; `hustlen_test_r4_meetup_20261104`, including virtual-camera/mobile, separate scan/receipt clocks, retries and permission guards. |
| `TZ=UTC npm run test:rental-documentation` | **Pass**, 1 passed, 0 failed/skipped; `hustlen_test_r4_agreement_20261104`. |
| `TZ=UTC npm run test:condition-claims` | Initial fixture failed; corrected final run **Pass**, 1 passed, 0 failed/skipped; `hustlen_test_r4_claims_final_20261104`. |
| `TZ=UTC npm run test:recovery-room` | **Pass**, 1 passed, 0 failed/skipped; `hustlen_test_r4_recovery_20261104`, including two-party history/privacy/revocation. |
| `TZ=UTC npm run build:verify` | **Pass**, exit 0; all 33 migrations and full production compilation, typing, static-generation and route report on `hustlen_test_r4_build_20261104`. Not compilation-only success. |

Initial browser failure: new assertions incorrectly expected separate start/end
elements, while the actual existing Dates component renders one complete range.
Selectors were corrected to require both dates/offsets in that range and the
existing evidence headings. No display assertion was removed. The failed
`hustlen_test_r4_browser_20261104` run cleaned its owned database/uploads; the
fresh final run passed every original and new subtest, including unchanged
complete historical rows and maximum-value rendering.

The additional condition-case run initially failed with PostgreSQL 23505 on
`MeetupSession_pkey` before its localized UI assertions: its unchanged fixture
unconditionally inserted a session even for an API-created booking, which R3's
existing automatic enrollment had already populated. Source inspection confirms
both that insertion and automatic API enrollment predate R4; no baseline checkout
was reset/run to manufacture this conclusion. The same setup pattern exists in
the recovery-room fixture. These two **test-only** repairs now assert the
existing session's exact owner and single `NEW_BOOKING_VERIFICATION` event for
API-created fixtures, preserving those original rows; direct-SQL legacy fixtures
still create their synthetic session as before. No ON CONFLICT suppression,
deletion, authorization bypass or ownership-guard relaxation was introduced.
All existing assertions remain, with stronger enrollment preconditions. The
first failed condition-case DB (`hustlen_test_r4_claims_20261104`) was cleaned;
its fresh corrected run passed. This was needed to execute changed-screen tests,
not a product lifecycle rewrite or new R5 concurrency architecture.

A read-only nested Git diagnostic hit sandbox EPERM; direct supported Git read
plus a file comparison succeeded without changing security configuration. It
verified the R3 local/API parsing and elapsed-day billing prefix in
`lib/booking-time.ts` is byte-identical. API, policy, schema, migration, dependency
and isolated-runner files are unchanged.

Logs are session-local `/tmp/lend-r4-*.log`, with ignored runner manifests and
screenshots in `.test-artifacts/`. Unit and browser checks above are new R4
executions, not reused counts. Clean installation, generation, baseline and API
suites were not repeated: dependency/schema/setup/runner/API metadata and R3
policy/replay logic are unchanged; prior evidence remains explicitly dated in
the earlier sections. No production data, real physical device or hosted CI
was used. Existing tests use synthetic local media/locations and scoped gates,
not production activation or proof of real-world GPS/camera performance.

### Cleanup and acceptance

**R4 acceptance: Pass.** Final unit reruns under UTC and America/Los_Angeles
both passed all 209 tests after the last early-year assertion changes.
Independent inspection of the isolated PostgreSQL instance found zero remaining
`hustlen_test_*` databases. All eight runner manifests recorded
`preserved: false` (six successful runs and the two documented failed attempts);
no uploaded files remained in the test storage. The newly created temporary
PostgreSQL container was stopped and its removal independently verified.
No existing developer or production database was used or cleaned.

### R5 handover / scope limits

Next is R5: remaining deterministic database/concurrency regressions, including
exact adjacency/nonconflicting requests and MVCC/retry outcomes beyond existing
coverage. R4 does not change reservation semantics or claim that work complete.
R3 retains the 90-day/2000-unit defaults and strict new-write/replay contract.
The separate empty-schema build failure stays open; no request-time rendering
or database-independent build fix was attempted. Historical correction remains
a separate evidence/migration decision; display fixes do not justify shifting
any stored times or rewriting booking history.
