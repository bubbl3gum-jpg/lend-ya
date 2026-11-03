# Candidate preservation, validation and reconstruction plan

Recorded 2026-11-03. This is validation of a broader candidate, **not recovery of
the missing original stabilization patches**. No application fixes were made.

## Source and preservation

- Original checkout: `/workspace/lend-ya`, branch `work`, HEAD
  `f856dc360b332007dd79725ddee0d28102411521`. Its existing untracked
  `docs/RECOVERY_COMPLETION_AUDIT.md` remains in place. Neither its index nor its
  working files were changed. `a0ded79cb3510373fd6623a91483e1f1947720fe`
  preserves that audit, not the missing implementation.
- Independent checkout: `/workspace/lend-ya-recovery`.
- Dedicated local branch: `recovery/candidate-validation-20261103`.
- Validated candidate: `cf61149442229fc60d2879752e8574a5df5c493e`,
  “Stabilize rental verification and test workflows”, from
  `stabilization/baseline-20261102`.
- `/tmp/lend-ya-recovery-remote-audit.git` still contained the candidate. It was
  shallow; a normal Git `fetch --unshallow --no-tags` of the candidate branch
  completed its history before cloning with `--no-hardlinks --single-branch`.
  Both repositories are now non-shallow. `git fsck --connectivity-only` passed
  in the independent checkout. `git merge-base --is-ancestor` passed for the
  old baseline; the candidate contains 164 subsequent commits. Exact tree and
  commit objects are present. No existing destination was overwritten.
- Origin in the new clone is the normal GitHub repository URL. No credentials,
  `.env`, database, uploads, generated client or `node_modules` were copied.
  Dependencies were installed afresh. The candidate's tracked path inventory
  was checked before checkout for environment files, database files, uploads,
  node_modules and private-key filenames; none of those paths were found.
  This is not a forensic secret scan of all historical blobs.
- Only this report is intended for the new local report commit. Its parent is
  the candidate above. Obtain the report commit with `git log -1 --format=%H`
  on the recovery branch. No push, deployment or main merge is authorized here.

## Actual candidate against the recovery audit requirements

The original audit's conclusions apply to the old checkout, not automatically
to this candidate. Equivalent implementations count even when names differ.

| Requirement | Candidate evidence and executed validation | Disposition / bounded gap |
| --- | --- | --- |
| A: Remove mandatory remote font fetching | `app/layout.tsx`, `app/globals.css` use system stacks (Arial/Georgia/monospace); no Google font loader. Full build passes. | Present; preserve the broader design system. |
| A: Explicit Prisma config / version alignment | `prisma7.config.ts` supplies schema, migrations, seed and datasource. CLI, Client and adapter all 7.10.1; generation passes. | Present through explicit CLI commands; standardized `db:generate`, `db:migrate`, `db:setup` scripts absent. Do not rename/remove working config without reason. |
| A/E: Repeatable fresh setup and MRT identities/history | `lib/mrt/import.ts` transactionally preserves legacy primary keys and upserts canonical stations. Migration suite passes two imports, prior rows, station FKs and migration checksums. | Substantially present. Complete setup reruns plus existing seeded/custom booking snapshots are not covered by a `test:baseline` equivalent. Seed itself was not executed in this validation. |
| A: Seed safety | `prisma/seed.ts` refuses non-local/production use, uses empty account updates, skips existing listings/rentals, and logs that it only fills missing records. Its `listingStation.deleteMany` is reached only for a newly created listing. | Better than old baseline; no blanket reset found. Error path still calls `process.exit(1)` and lacks a disconnect finalizer. Full-row rerun assertions remain needed. Never seed a developer or production database to validate this. |
| A: Runtime/env/docs | README documents explicit Prisma commands, local setup, isolated runner, Chromium/media prerequisites. CI pins Node major 24; observed Node 24.19.0/npm 11.9.0 satisfy Prisma/Next engines. | Partial: no project engines/runtime file or `.env.example`; no standard typecheck/setup scripts. README security counts are stale. Reconcile rather than copy old instructions. |
| A: Request-time discovery/build | New marketplace components/discovery replace old homepage. Production build succeeds using an isolated migrated DB. | Executed DB-backed build, not evidence of DB-independent builds. Discovery queries run before locale/appearance cookies in `components/marketplace/home.tsx`; inspect Next request-time boundaries before promising absent-schema builds. |
| B: Supported dependency updates / reproducibility | Locked install succeeds; Next/ESLint config 16.4.3, aligned Prisma 7.10.1, mysql2 override 3.24.6; installed deepmerge-ts 8.0.2, fast-uri 3.1.9, zod 4.6.7. | Much remediation present and reproducible from metadata/lock. Fresh remaining advisory disposition below; do not insist on historical version numbers. |
| C: Taipei and real calendar dates | `lib/booking-time.ts` validates calendar/clock fields, converts naive input explicitly as +08:00, supports offsets and equivalent instants; tests run UTC/American clocks. API suite asserts Taipei 10:00 persists as 02:00Z. | Present wall-clock semantics, **conflicts with explicit-instant API requirement**: `components/booking-form.tsx` sends naive strings and API parser accepts them. Separate local-input conversion from strict API parsing. |
| C: Future start / ordering | API rejects past starts and end <= start. Replay returns the authorized original booking before future-start check. | Present pre-transaction validation; no second future check after acquiring the listing lock. Preserve historical/idempotent replay semantics when adding that check. |
| C: Duration/notes | Fixed `MAX_RENTAL_DAYS = 90`; notes capped at 2,000 source-string characters. API errors and README state 90 days. | Product conflict: requested configurable default 30 days / 2,000 characters versus candidate's fixed 90/2,000. No environment-policy parser or invalid-config boundaries. Decide prospective rule first; never rewrite historical bookings. |
| C: Exact pricing / billing | API calculates authoritative listing Decimal × ceil(elapsed 24h periods), bounds total at 9999999999.99 for DECIMAL(12,2), snapshots strings. API price/overflow/immutable snapshot tests pass. | Equivalent exact calculation already present; preserve it. Detail/dashboard convert Decimal to Number for display only; add maximum-value rendering tests before claiming all display boundaries. Do not replace server arithmetic with floats or silently alter rounding. |
| C/E: Transactions, overlap and retries | Serializable transaction and listing `FOR UPDATE`; API accepts overlapping pending requests but conflicting acceptance cannot both reserve. Idempotency keys, canonical request hashes and replay after changes/restart exist. | Core behavior executed successfully. Add exact adjacency, deterministic nonconflicting race and forced serialization/retry/no-duplicate coverage; Promise.all alone is not deterministic synchronization. |
| D: Consistent Taipei display | Booking detail, dashboards, evidence and trust review dates use `formatRentalTime`. | Mostly present. `app/account/activity/page.tsx:102` still prints UTC. Shared formatter accepts arbitrary Date/string inputs; define strict input expectations and test malformed strings rather than asserting current formatter rejects them. |
| D/E: Listing privacy / participant history | Listing GET restricts inactive/restricted/suspended-owner listings to owner. Booking GET/page use participant IDs independently of listing visibility. API history/privacy and browser private evidence tests pass. | Present; retain these permissions. Broader inactive-history dashboard/HTML assertions still needed. |
| E: Database regressions | Real API suite covers invalid/past inputs, notes, price overflow/quotation, reservation conflict, nonoverlap, idempotency, evidence, return and disputes. MRT integration proves actual blocked station-edit races. | Much expanded coverage present; original audit's missing-test verdict cannot be reused wholesale. Exact policy/time boundaries, strict API offsets, adjacency, post-lock expiry and complete setup snapshots remain missing. |
| F: Historical timestamp assessment | Old baseline parser is `new Date(value)`. Candidate has timezone-aware parsing; prior candidate audit documents a test-driver TIMESTAMP WITHOUT TIME ZONE/replay bug and its fix. | No evidence establishing production usage, deployment timezone or affected real records. The test bug is not proof real rows need correction. Dedicated risk assessment/synthetic fixtures remain needed; no blanket eight-hour shift. |
| G: Owner/renter discoverability | Dashboard queries all participant bookings without status filter, with “My borrowings” / “Bookings as owner” sections and direct `/bookings/id` links. Loading/error boundaries and mutation refresh exist. Browser suite verifies both completed dashboard links. | Original pending-only/no-link defect is absent. No active/history grouping; no dashboard reopening at every intermediate/cancel/dispute state. Preserve current layout and broader workflows. |
| G: Actual states and evidence | Booking enum: PENDING, CONFIRMED, HANDOFF_PENDING, IN_USE, RETURN_PENDING, INSPECTION, COMPLETED, DISPUTED, CANCELLED, ADMIN_CLOSED. Browser/API suites exercise explicit bilateral handoff, return/inspection, disputes, reviews and private evidence. | Do not introduce ACCEPTED/ONGOING/RETURNED/REJECTED enum states; owner rejection uses supported transitions. Extend navigation tests, not lifecycle rules or evidence architecture. |

## Validation commands and results

Applicable root `AGENTS.md` was read. It requires preserving the many scoped
owned-development, security, evidence, AI and production gates. No feature work
or gate activation was performed. The effective running network policy includes
`binaries.prisma.sh`; no policy draft was changed and no environment republished.
Prisma downloads/generation no longer have the previous proxy blocker. TLS and
checksum verification were not disabled.

Checks ran in the independent checkout on the candidate source. Typing, lint
and unit checks were independent; database/build suites ran sequentially,
each with a distinct fresh owned database. A new `postgres:17` container,
`lend-ya-recovery-validation-20261103`, used no persistent volume or existing
data, exposing loopback port 32768. Its newly chosen test-only authentication
was not copied from either checkout. Connection credentials are deliberately
omitted here.

For reproducing the following database commands, supply a private local URL
through `MRT_TEST_DATABASE_URL` naming the indicated **nonexisting** database;
set `MRT_BROWSER_PATH=/usr/bin/chromium CHROMIUM_PATH=/usr/bin/chromium` for browser
suites. Do not precreate the database or point at an existing one. No `.env` was
created. `DATABASE_URL` was not bound to any existing application database.

| Command actually executed | Result | Database / evidence |
| --- | --- | --- |
| `npm ci` | PASS, 573 packages installed; ESLint 9.39.5 support warning | Lockfile unchanged. |
| `npx prisma generate --config prisma7.config.ts` | PASS, generated Client 7.10.1 | Verified installed dependencies; no substitute exports. |
| `npx next typegen` then `npx tsc --noEmit` | PASS, both exit 0 | Full project tsconfig, not the runner's narrowed app-only config. |
| `npm run lint` | FAIL, exit 1 | One `prefer-const` error: `tests/meetup.integration.test.ts:1622:11`, variable `id`. Not repaired in this validation-only task. |
| `npm run test:unit` | PASS, 202 passed, 0 failed/skipped | Includes booking-time and dependency-security tests. |
| `npm run build:verify` | PASS, exit 0 | `hustlen_test_recovery_build_20261103`; all 33 migrations, full Next production build including typing/static generation/routes; not compilation-only. |
| `npm run test:migration` | PASS, exit 0 | `hustlen_test_recovery_migration_20261103`; populated upgrade, 14 history/security tables, 120 physical stations/136 codes, two imports, unchanged checksums, schema diff empty. |
| `npm run test:rental-api` | PASS, 14 passed, 0 failed/skipped | `hustlen_test_recovery_api_20261103`; booking + rental lifecycle suites. |
| `test -x /usr/bin/chromium`, `chromium --version`, media executable checks | PASS | Chromium 154.0.8037.57; ffmpeg and ffprobe installed. |
| `npm run test:rental-browser` | PASS, 4 passed, 0 failed/skipped | `hustlen_test_recovery_browser_20261103`; UI lifecycle, restart, completed dashboard/mobile, failed inspection/dispute. |
| `npm run test:integration` | PASS, exit 0, all reported checks, browserErrors empty | `hustlen_test_recovery_mrt_20261103`; MRT create/edit/book/mobile/auth/lifecycle, both real station-edit races. |
| `npm run test:stability` | PASS, 8 passed, 0 failed/skipped | `hustlen_test_recovery_stability_20261103`; durable retries, real deadlock returning controlled conflict, auth isolation, transport boundaries, case-scoped evidence audit. |
| `npm audit --json` | Retrieved successfully; exit 1 because findings | 16 moderate affected-package entries; 0 high/critical. |
| `npm audit --omit=dev --json` | PASS, retrieved successfully, exit 0 | 0 production findings. This is not complete application security assurance. |

Raw logs are session-local `/tmp/lend-recovery-{install,generate,typegen,typecheck,lint,unit,build,migration,api,browser,mrt,stability}.log`;
audit JSON/path evidence is `/tmp/lend-recovery-audit{,-production}.json` and
`/tmp/lend-recovery-dependency-paths.txt`. Runner manifests/screenshots are ignored
under `.test-artifacts/`. These transient files are not backups or committed
artifacts. An auxiliary package-version probe initially hit package.json export
protection on the adapter; direct read of installed metadata confirmed 7.10.1.
That diagnostic error was not an application/type/build failure.

Cleanup passed independently: all six runner manifests have `passed: true` and
`preserved: false`; each runner reported removing only its owned database.
A maintenance query against the newly created container found zero remaining
`hustlen_test_recovery_*` databases. No listing upload files remained in this
checkout. The disposable container was stopped and auto-removed after that
verification; the pre-existing `p2p-postgres` service was not stopped or queried.
No failed-database-suite cleanup path was deliberately injected in this run.
The safety review confirmed create-must-fail-if-existing behavior, strict local
target/driver validation, exact per-run database comment ownership checks before
subprocesses and cleanup, and no force-reset path. No safeguards were weakened.

Not executed: a nonexistent `db:setup`/`test:baseline`, standalone development
seed or repeated complete setup, absent-DB production build, reconstructed
strict-offset/configuration/adjacency tests, historical correction, macOS,
physical-device/GPS, production tests, hosted CI, and the candidate's many other
specialized admin/moderation/chat/meetup/staff/security/AI/product suites. The
selected rental/MRT suites do not certify those broader features. Existing
historical test reports are context, not current execution evidence.

## Fresh dependency findings

The current audit supersedes README's older deepmerge/braces/nine-entry account.
The one directly reported advisory is
**GHSA-g3hv-75wg-m249** (minimatch globparts amplification denial of service,
affected `<11.0.1`). It propagates to 16 package entries, not 16 independent
vulnerabilities. Installed affected paths include:

- `eslint@9.39.5 -> minimatch@3.1.5`;
- `eslint -> @eslint/config-array@0.21.2 -> minimatch@3.1.5`;
- `eslint -> @eslint/eslintrc@3.3.7 -> minimatch@3.1.5`;
- `eslint-config-next@16.4.3 -> eslint-plugin-{import,jsx-a11y,react} -> minimatch@3.1.5`;
- `eslint-config-next -> typescript-eslint@8.71.0 -> @typescript-eslint/typescript-estree@8.71.0 -> minimatch@10.2.6`.

Remaining affected entries are ESLint community utils, Next ESLint plugin,
TypeScript ESLint parser/plugin/type-utils/utils, and their parent configs.
All reported nodes are development lint tooling; production audit is empty.
Lint/CI still executes this tooling on checkout files and glob configuration,
so malicious untrusted patterns/workspaces can matter. No evidence shows a
public rental request reaching minimatch. Audit suggests incompatible major
downgrades (ESLint 4 / Next config 0.2.4); those are not validated remedies.
No override, suppression, forced fix, version update or architecture change was
applied here. A remediation task must check supported upstream patches and API
compatibility before considering any override, then rerun installation and all
relevant checks. Committed mysql2 override and locked patched transitive versions
already reproduce successfully.

## Smallest reconstruction sequence

1. **Make the candidate's current gate honest.** Fix only the confirmed lint
   declaration in its own small task; rerun lint and unit/type checks. Keep this
   preservation report separate from implementation. Acceptance: lint exit 0
   with no source behavior or security-gate changes.
2. **Setup/repeatability.** Reuse `prisma7.config.ts`, MRT importer, isolated
   runner and current non-destructive seed. Add aligned setup/typecheck scripts,
   an explicit runtime pin and credential-free environment example; separate
   opt-in demo seeding from setup and finalize disconnect on failures. Add a
   full baseline suite using a new owned DB. Acceptance: locked install,
   generation, fresh migrations/import, second setup preserves station IDs,
   complete migration history and custom/seeded booking rows; failed setup
   cleans only its owned DB; full build passes. Assess request-time discovery
   separately if builds must work without a database.
3. **Dependency disposition.** Refresh advisories again at implementation time;
   add/update `DEPENDENCY_SECURITY.md` and stale README text. Investigate
   supported lint-tool patches; do not force minimatch 11 into older consumers
   just for zero findings. Acceptance: reproducible npm ci, advisory paths and
   IDs explained, no production/high/critical regression, lint/unit/generation/
   full typing/build pass.
4. **Strict booking boundary and policy.** After the product decisions below,
   split Taipei wall-clock form conversion from explicit-offset API parsing;
   retain calendar checks and exact Decimal quotation/snapshot/idempotency.
   Add fail-closed finite/integer configuration and a post-lock future-start
   check for new writes. Acceptance under UTC and non-Taipei hosts: equivalent
   offsets, impossible dates, ambiguous API rejection, now/end/duration/notes
   exact boundaries, malformed env values, DECIMAL(12,2) maximum/overflow and
   no partial records. Replays of existing committed terms remain safe.
5. **Consistent display.** Reuse `formatRentalTime`; fix the activity UTC-only
   presentation, document accepted formatter inputs and maximum currency
   rendering. Acceptance: detail/dashboard/activity/evidence show the same
   Taipei instant independent of browser/server zone, without historical edits.
6. **Fill database regression gaps.** Extend existing booking/lifecycle tests,
   not replace them: exact adjacency, deterministic conflicting/nonconflicting
   races, actual lock-wait expiry, forced serialization conflict/retry without
   duplicates, strict-offset/policy/no-partial-write cases, and inactive-listing
   participant history. Acceptance: operations actually execute on a distinct
   new owned DB; existing rental, stability, migration and browser tests pass;
   verify cleanup after both success and deliberate failure.
7. **Historical risk, documentation/synthetic tests only.** Establish whether
   old parsing was deployed with persisted bookings, server TZ and original
   intended input using authorized deployment/log evidence. Available Git/test
   history alone cannot identify affected real rows. Acceptance: evidence and
   uncertainty documented; synthetic-only selection/correction tests if justified.
   Any future correction needs a separately approved dry-run plan with selected
   records, before/after examples, overlap effects, backup/rollback and audit log.
8. **Finish navigation narrowly.** Keep both current role sections and direct
   links; add sensible active/history grouping using actual schema states.
   Extend browser helpers to reopen both dashboards through confirmation,
   handoff, use, return, inspection and completion, plus cancellation/rejection/
   dispute/admin-closed cases where supported. Acceptance: unrelated users see
   no participant data, inactive history stays reachable, action refresh/error/
   empty/loading states work, mobile dashboard/detail fit. Do not replace the
   candidate's explicit evidence, inspection, retry or moderation workflows.

## Decisions before implementation

- Is this broader candidate the approved reconstruction base? Preservation
  readiness does not authorize all its provisional features or production gates.
- Should prospective maximum duration adopt configurable **30 days** by default
  or retain this candidate's documented **90 days**? Which environment variable
  names, permitted bounds and rollout apply? Notes currently use JS string length
  on the untrimmed input; clarify desired counting semantics before changing it.
- Confirm strict explicit-offset API input is intended despite candidate clients
  currently submitting Taipei wall time. Coordinate client/API rollout; preserve
  canonical idempotency terms and historical timestamps.
- Does build need an absent-database guarantee, or is the existing safe
  `build:verify` contract sufficient? No absent-schema guarantee was tested.
- No known production history is authorized for inspection here. Historical
  timezone provenance and deployment/use evidence must be supplied through an
  appropriately authorized process; no correction is currently justified.

This branch is suitable for a **source-only preservation backup** after the
report commit and cleanup verification, even though lint and reconstruction
gaps prevent a claim of completed stabilization. No remote backup was made.
Original Prompt 5 should build on the explicit evidence workflow already here,
after focused navigation acceptance, rather than reinstalling the older design.
