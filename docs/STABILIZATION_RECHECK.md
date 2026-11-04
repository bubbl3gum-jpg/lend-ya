# Original Prompt 1 acceptance recheck

Date: **2026-11-04**. The opening review rechecks Prompt 1 only; its later
Prompt 2 acceptance follow-up is appended below. Reports were inspected against
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
