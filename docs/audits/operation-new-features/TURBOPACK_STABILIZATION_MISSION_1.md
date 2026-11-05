# Turbopack stabilization - Mission 1

Date: 2026-11-05 (Asia/Taipei). Scope: Windows rental-browser test restart stability, not feature development or full baseline certification. **Recommendation: CONDITIONAL.** The isolated fixture is repeatable in the recorded runs, but the underlying intermittent HMR trigger is not conclusively identified; broader baseline acceptance remains blocked. Exact ending commits and final results follow below.

## Repository, environment and preservation

- Verified fetch/push remote: `https://github.com/bubbl3gum-jpg/lend-ya.git`.
- Branch: `stabilization/operation-new-features-baseline`.
- Worktree: `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization`, separate from original main/partner worktrees.
- Ending implementation commit: **`21ad506580c1d61b84773458784391cf7e84883b`**. This audit is a documentation-only follow-up; its exact commit is returned in the handoff and recoverable with `git log -1 --format=%H`.
- Starting reference and actual initial HEAD: **`a073fe9acd6dd50ba1a850a631079383cc3f4309`**; initial `git status --porcelain=v1` empty; `git merge-base --is-ancestor a073fe9acd6dd50ba1a850a631079383cc3f4309 HEAD` exit 0 before edits.
- Read AGENTS/CLAUDE instructions, `FINAL_BASELINE_ACCEPTANCE.md`, relevant `BASELINE_STABILIZATION_REPORT.md` and `BROWSER_ACCEPTANCE_CLOSURE.md` sections, source fixtures and installed Next 16.4.3 CLI/Turbopack/filesystem-cache guides. Earlier reports remain historical, unchanged evidence.
- Windows 11 Home 10.0.26100, PowerShell 5.1, Node **24.19.0**, Next **16.4.3**, Prisma **7.10.1**, Playwright **1.64.0**, managed Chromium revision **1248**. Locked existing dependencies/media tools reused; no package/lockfile/installed-source upgrade.
- Reused only the preserved mission-owned PostgreSQL **17.5** cluster at `.test-artifacts/mission01/pgdata`, verified unused loopback port **56480** and absent PID file before startup. No shared/production database, credential change or destructive migration.

Raw commands/logs/CSVs are retained under ignored **`.test-artifacts/turbopack-mission1/`**. Per-run marked DB manifests, screenshots, HTML, server output and NDJSON are in `.test-artifacts/<24-hex-run-id>/`. PowerShell redirects are UTF-16 (`Get-Content`); NDJSON is UTF-8. All failures and passing attempts remain separate. No push, merge, deployment, public exposure, feature agents or unrelated product work.

## Reproduction, including intermittence

The first full run at the exact unchanged starting source **PASSed 7/7**, exit 0 (`reproduce.log`, run `5ac9296844c423bc33a5c213`, Node test duration 188.3 s). This is recorded explicitly: the old failure is intermittent, not proof that every Turbopack run is broken or that an unmodified rerun resolves it.

Inspection found a diagnostic defect: `tests/support/browser-diagnostics.ts` only observed the older `webpack-hmr` WebSocket path. Installed Next uses **`/_next/hmr`**. Extended passive recording to that actual endpoint and to client full-reload reasons; application code and assertions were unchanged. Passive instrumentation can affect timing, so it is not a byte-for-byte timing replay of the first attempt.

Replayed the earlier sequence with frozen source: `npm run test:integration` then `npm run test:rental-browser`, explicit Turbopack, fresh marked database per suite. Integration **PASS, exit 0, 65 s**. Rental **FAIL, exit 1, 192 s: 1/7 passed, 6 failures including parent**, zero skipped/cancelled (`traced-sequence.csv`, `trace-test_rental_browser.log`, run **`2dc465cdd68482dfde367cc0`**). The initial full lifecycle passes; restart/persistence, disputed return, rejection/cancellation navigation, loading/error recovery and historical rendering fail during reloads.

Errors include hidden/missing COMPLETED content, station-dialog selection timing out during repeated same-URL navigation, mutation-response waits timing out and navigation interrupted/aborted. Browser snapshots, `rental-browser.ndjson` and `lend-ya-browser-server.log` retain complete messages/stacks. No assertions or test names were removed. Targeted restart/dispute/history cases must run inside the complete suite because their booking, retry-key and cookie fixtures depend on the first lifecycle case; a child-only filter would invalidate that setup. All final runs are unfiltered.

## Confirmed failure mechanism; underlying root cause remains unresolved

The corrected trace records **122** `reloadPage` frames with **`data: "HMR hash mismatch"`**, repeatedly restarting the same chunk-list resource `static/chunks/_1anvha4rlo79g._.js`. Example sequence: Turbopack connection at HMR version 1, chunk-list `restart` at version 2, then hash-mismatch reloads; later reconnects retain one server session ID while the HMR version keeps increasing. This is browser reload instructed by one running server, not evidence of an endlessly respawned server, lost bookings or an expired-session redirect.

Installed `node_modules/next/dist/server/dev/hot-reloader-turbopack.js` around line 1334 sends that exact reload reason when the client's subscription version differs from the current server HMR version. The corresponding client/runtime and `hot-reloader-app.js` explain the reload behavior. These package files were **read only, never patched**. API responses and actual persisted-data checks distinguish this protocol failure from authorization/financial/booking logic.

The fixture restarted distinct development-server processes (including changed booking-policy settings) against **one compiler output/cache directory** while intentionally preserving its business database and browser contexts. This is a fixture resource-lifetime choice; hardening that boundary is not proof that the choice caused the observed failure. The investigation tests that cross-incarnation artifact reuse separately from business/browser persistence. A generic upstream Turbopack defect or corrupt cache file is not assumed.

The isolated-output runs below did not reproduce the mismatch while preserving database, browser cookies/storage, endpoints, HMR and assertions. However, the reverse control also PASSed with shared output and zero hash mismatches. Thus artifact reuse alone is NOT proven to cause the failure, and the namespace change is defensive fixture hardening, NOT a conclusively established root-cause fix. The observed protocol failure is confirmed; its low-level compiler/cache/timing trigger remains unresolved. No corrupt cache file or general Turbopack defect is claimed.

## Targeted fixture hardening and diagnostic repair

| File | Targeted change |
|---|---|
| `next.config.ts` | Adds pure `ownedTestOutput(env)`. Existing development + 24-lowercase-hex run-ID guard still applies. Without an instance, old single-server test layout stays unchanged. With a valid bounded numeric instance, output becomes `.test-artifacts/<run>/next/server-<instance>`. Normal dev/production use their original output; invalid owned instance values fail closed. |
| `tests/rental-browser.test.ts` | Monotonically numbers intentional server starts and passes `MRT_TEST_SERVER_INSTANCE` only to that child. No change to database URL, browser contexts/cookies/storage, lifecycle settings/assertions, shutdown behavior, readiness budgets or timeouts. |
| `tests/support/browser-diagnostics.ts` | Captures Next's real HMR endpoint, retained legacy endpoint and bounded client reload details. Pure observation, no interception/retry/ignore-error behavior. The final collector excludes binary React-debug payloads and includes a regression for that exclusion. |
| `tests/test-safety.test.ts` | Registered regression checks unique incarnation paths, existing single-server compatibility, production/ordinary dev exclusion, invalid run IDs and unsafe/zero/leading-zero/oversized/path-traversal instances. |
| `docs/audits/operation-new-features/TURBOPACK_STABILIZATION_MISSION_1.md` | New audit, no existing report overwritten. |

This separates compiler lifetime from persistent booking/session lifetime. The same test database survives every restart and the original persistence/idempotency/private-photo/history assertions still execute. Browser storage is not cleared, HMR is not disabled, no stale file is deleted, compiler caches remain enabled **within each incarnation**, and no arbitrary sleep/retry/security limit is introduced. Old outputs remain available for forensics. The strict database target/marker/cleanup guards, production behavior, auth/Origin/roles, QR/geofencing, custody and financial snapshot semantics are unchanged.

The initial safety file passes **9/9**, exit 0 (`output-isolation-tests.log`). After restricting the observer to text controls, the final safety file passes **10/10**, exit 0 (`final-observer-guards.log`), including real/legacy endpoint observation and rejection of binary React-debug fixture payloads. These tests verify path/production boundaries and passive-observer behavior independently of browser timing; all are registered through the existing unit script.

## Three complete isolated-output Turbopack runs

No source edits during this initial three-run batch. The later observer-only binary filtering was subsequently verified by two additional complete runs, recorded below. Compiler-output selection and rental assertions were unchanged throughout all five. Each full suite includes the previously failing cases and all existing positive/negative/restart/history checks.

| Run | Result | Exit | Seconds including setup | Artifact run ID | Captured HMR frames | Hash mismatches |
|---|---|---|---|---|---|---|
| `turbo-1` | PASS, 7/7 | 0 | 202 | `1fae1082435da26359f6538e` | 2440 | 0 |
| `turbo-2` | PASS, 7/7 | 0 | 203 | `8a638ffb8c6b979d27188b2f` | 2415 | 0 |
| `turbo-3` | PASS, 7/7 | 0 | 202 | `83bedd0f56f4c6d7f9d6c2fe` | 2408 | 0 |

All zero skipped/cancelled. Each run has four distinct `server-*` output directories and four actual `dev/cache/turbopack` directories. Thus this is not 'zero mismatch' caused by missing HMR tracing or disabled caching. `protocol-summary.json` was checked against actual frames, successful owned manifests and directory inventory, not just UI assertions. The pre-registered verification loop stops at the first failing Turbopack repetition; none failed. This is three planned full executions, not retry-until-green.

The listing integration preceding the first repaired run also **PASSed**, exit 0, 65 s. Webpack comparison, regression/static results and reverse-control results are recorded below.

## Exact reproduction/verification command configuration

PowerShell setup used in the verified stabilization worktree:

```powershell
$root = (Get-Location).Path
$media = (Get-ChildItem .test-artifacts/mission01/media-github -Recurse -Filter ffmpeg.exe | Select-Object -First 1).DirectoryName
$env:Path = (Join-Path $root '.test-artifacts/mission01/node24') + ';' + $media + ';' + $env:Path
$env:DATABASE_URL = 'postgresql://mission01@127.0.0.1:56480/postgres'
$env:MRT_BROWSER_PATH = node -e "console.log(require('@playwright/test').chromium.executablePath())"
$env:CHROMIUM_PATH = $env:MRT_BROWSER_PATH
$env:MRT_TEST_BUNDLER = 'turbopack' # Explicitly 'webpack' for the separate control.
$env:NEXT_TELEMETRY_DISABLED = '1'
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
# A fresh unused lowercase/underscore-only name for every suite/invocation.
$env:MRT_TEST_DATABASE_URL = 'postgresql://mission01@127.0.0.1:56480/hustlen_test_tpm1_<unique_label>'
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run test:rental-browser
$code = $LASTEXITCODE
```

Runners choose free localhost ports, own/create/migrate/mark/check their DB before writes and clean their own resources. Child server command remains `next dev --hostname localhost --port <owned-port>`; selector adds `--webpack` only for the comparison. Actual server banners identify the requested bundler. The normal test supplies the incarnation; operators do not supply unsafe path values. Logs/CSVs record exact exit codes; a successful production build cannot substitute for this development evidence.

## Remaining risks and scope limits

- Compiled output grows with the number of incarnations. Artifacts are ignored and deliberately preserved for audit; retention/cleanup must remain scoped to verified owned runs. No shared caches/directories are erased here.
- This mission records successful **isolated rental test fixture** runs, not conclusive root-cause closure or arbitrary warm-cache development-server restart behavior on every OS. The low-level invalidation mechanism and normal non-owned dev warm-cache behavior are not claimed repaired. No dependency upgrade or package patch hides that limitation. The successful reverse control explicitly limits causality; further targeted HMR investigation is needed before claiming the intermittent failure fully resolved.
- Full global unit acceptance, especially the previously failed bounded Zod child, is not established by focused guards. No memory/input/timeout relaxation or unrelated dependency work belongs to this mission. Linux canonical/matrix and physical-device acceptance remain separate pending gates; no prior PASS is counted as new execution.
- Identity/Vision/AI/location simulation remain development-only, no provider or production eligibility/custody/money authority activated. No feature agents, feature branches, main merge, push or deployment.

Completed control results, exact implementation/audit commits, preservation/cleanup and recommendation follow below. The broader baseline must not be called READY solely because this rental fixture passes.
## Final observer runs and reverse-control result

The final collector drops binary React-debug frames while retaining text HMR protocol controls. Two additional complete normal-mode suites verified that final observer version. Source hashes of all four changed files were captured during the control phase and rechecked unchanged afterward (`frozen-source.json`).

| Invocation | Output policy | Result | Exit | Seconds | Artifact / HMR evidence |
|---|---|---|---|---|---|
| Reverse preceding integration | Existing single-server output | PASS | 0 | 69 | `reverse-integration.log` |
| Reverse rental control | Shared output restored | **PASS, 7/7** | 0 | 196 | `b54bfc470ef26e1de62e617d`; 1813 text frames, **0 mismatches**, no server namespaces, actual `next/dev` present |
| Final Turbopack 4 | Separate server outputs | PASS, 7/7 | 0 | 204 | `8fac61b880bb48e13b4151e6`; 1825 text frames, 0 mismatches, four namespaces |
| Final Turbopack 5 | Separate server outputs | PASS, 7/7 | 0 | 201 | `39104583fc3e39e7fd0ca706`; 1842 text frames, 0 mismatches, four namespaces |

All zero skipped/cancelled. `final-controls.csv` and `final-protocol-summary.json` retain actual results. **The reverse control did not fail.** It prevents a claim that shared compiler output alone is the proven root cause. Five isolated-output full suites passed, but a completely unchanged initial run and the shared-output control also passed; do not omit them or reinterpret the control as a reproduced failure. No additional control was retried merely to obtain a desired failure.

The diagnostic reverse control used an ignored preload, not an application patch. Its only behavioral edit relative to the final tracked source was omitting the incarnation setting when the test launches its owned Next dev child; it did not alter the database URL/marker, auth, browser state, HMR or assertions. Actual stdout records omissions for incarnations 1 through 4, and directory inspection verifies shared output. The preload/process instrumentation is not a perfect recreation of every original timing/cache condition.

Reproducible diagnostic preload (`.test-artifacts/turbopack-mission1/reuse-output-control.cjs`), **not used by normal acceptance or production**:

```js
const cp = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const original = cp.spawn;
cp.spawn = function(file, args, options) {
  if (args?.[0] === 'node_modules/next/dist/bin/next' && args[1] === 'dev' &&
      /^[a-f0-9]{24}$/.test(options?.env?.MRT_TEST_RUN_ID ?? '')) {
    const env = {...options.env};
    delete env.MRT_TEST_SERVER_INSTANCE;
    return original.call(this, file, args, {...options, env});
  }
  return original.call(this, file, args, options);
};
syncBuiltinESMExports();
```

Set `NODE_OPTIONS=--require=<absolute-owned-preload-path>` only for that fresh owned rental-control invocation. Remove NODE_OPTIONS before normal repeats. The preserved actual preload also prints the omitted incarnation. Normal runs retain the internal counter and have no preload. This is a forensic control, not a database-validation bypass or an operator escape hatch added to the product.

## Regression and production verification

Each row below is a fresh executed Windows check; no Linux or historical result is substituted. Main batch: `verification.csv`. Final batch: `final-controls.csv` and individually named logs.

| Command | Result / scope | Exit | Evidence |
|---|---|---|---|
| `npm run test:integration` before first isolated suite | PASS, actual homepage/listing/MRT/lifecycle flow | 0 | `isolated-integration.log`, 65 s |
| `npm run test:rental-browser`, Webpack | PASS, 7/7, no skipped/cancelled | 0 | `webpack-control.log`, 316 s; same hardening, separate bundler control |
| `npm run test:rental-api` | PASS, 20/20 | 0 | `rental-api.log`, 70 s; actual lifecycle, reservations, quotes, privacy and evidence |
| `npm run test:authorization` | PASS, 8/8 | 0 | `authorization.log`, 71 s; roles, expired sessions, direct/HTTP boundaries |
| `npm run test:postgres-utc` | PASS | 0 | `utc.log`, 6 s; UTC/session/Date assumptions preserved |
| `npm run test:camera-reader` | PASS | 0 | `camera-reader.log`, 9 s; real QR pixels and existing bounded detector regression |
| `npm run typecheck` | PASS | 0 | `typecheck.log`, 17 s; final `final-typecheck.log`, 6 s |
| `npm run lint` | PASS | 0 | `lint.log`, 119 s |
| `node node_modules/eslint/bin/eslint.js next.config.ts tests/rental-browser.test.ts tests/support/browser-diagnostics.ts tests/test-safety.test.ts` | PASS on final files | 0 | `final-targeted-lint.log` |
| `npm run build:verify` | PASS, production build with original production output selection | 0 | `build.log`, 34 s; repeated on exact implementation commit in `committed-build.log`, exit 0 |
| Focused security/meetup/timezone units, command below | PASS, **53/53**, no skipped/cancelled | 0 | `final-security-units.log` |
| Full global `npm run test:unit` | NOT RUN in this mission | N/A | Previous bounded Zod failure is not closed; focused units are not global acceptance |
| Full meetup camera suite / Linux canonical and matrix / physical devices | NOT RUN in this mission | N/A | No prior result claimed fresh. No physical-camera claim from virtual pixel tests. |

Focused unit command, pinned Node and no parallel server/build load:

```text
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/test-safety.test.ts tests/authorization-policy.test.ts tests/meetup-activation.test.ts tests/meetup-test-location.test.ts tests/meetup-location.test.ts tests/mrt.test.ts tests/booking-time.test.ts
```

This includes actual protected-source digest/permission checks and the new production/path/diagnostic contracts. No recorded digest, memory/input/time cap or deny expectation changed. No failed row is converted to PASS: the traced pre-hardening rental failure remains **FAIL, exit 1, 1/7**, even though all later isolated suites and the reverse control pass.

## Root-cause disposition and Mission 2

Classification supported by evidence:

- **Confirmed test-infrastructure defect:** obsolete WebSocket endpoint prevented HMR diagnosis. It is corrected and regression-tested; binary debug payloads are excluded in the final collector.
- **Confirmed immediate failure mechanism:** repeated server-instructed HMR hash/version mismatch and entry-chunk restart, not demonstrated lost database state or an expired-session redirect.
- **Validated defensive fixture change:** compiler outputs now have explicit server-incarnation ownership. All five complete isolated-output suites pass, plus focused security and production checks. No assertion or production semantics are weakened.
- **Unresolved underlying trigger:** artifact reuse, compiler cache invalidation, Windows lifecycle/filesystem behavior and timing have not been causally separated. Matching Next/native SWC package metadata (16.4.3) shows no observed version mismatch, not a complete binary-integrity proof. The successful shared-output reverse control rules out claiming reuse is sufficient to cause failure. Application defect or generic Turbopack defect is **not established**.

**Recommendation: CONDITIONAL.** Accept the isolated fixture only as tested hardening and improved observability, not proof the original intermittent runtime failure can never recur. Carry the remaining HMR-trigger investigation forward; reproduce with the captured protocol before any framework/package change. Ordinary non-owned warm-cache dev restarts and other OS profiles are not certified here.

**Mission 2 may safely begin only as another separately authorized baseline-stabilization mission after review**, carrying this conditional disposition and the previously failed full-unit gate forward. No feature development, parallel feature agents, main integration or deployment is approved. Overall repository baseline readiness remains **BLOCKED** by unresolved global-unit/platform/device acceptance; this mission is not a READY verdict.

One Next/browser/build job per worktree remains mandatory: separate compiler directories do not isolate root `next-env.d.ts` for concurrent jobs. Preserve per-worktree dependencies, fresh marked databases and all AI/identity/Vision/location restrictions.

## Preservation, cleanup and final handoff

- Reviewed the complete four-file source diff before implementation commit **`21ad506580c1d61b84773458784391cf7e84883b`**. Only this audit is added afterward. No business routes/lib/components, Prisma schema/history, package/lockfile, existing database runner, bounded dependency-security test or protected-source digest was modified.
- Prior acceptance/stabilization reports remain unchanged: `git diff a073fe9acd6dd50ba1a850a631079383cc3f4309 HEAD -- <prior-report-paths>` returned no paths. All original failing/passing artifact directories remain available; no audit is overwritten.
- Main and partner worktrees rechecked clean at **`f856dc360b332007dd79725ddee0d28102411521`**. No branch other than the authorized stabilization branch was changed; no extra worktree or feature agent was launched.
- All **17** `hustlen_test_tpm1_*` runner manifests: **16 passed, 1 failed, zero preserved**. These counts exclude non-DB units/static/protocol probes and include the actual reproduced rental failure. They are resource-run outcomes, not a blanket feature-readiness score.
- SQL `SELECT count(*) FROM pg_database WHERE datname LIKE 'hustlen_test_%'` returned **0** after all jobs. `storage/listings` and legacy public listing-upload file counts are **0**. Existing ownership-checked runner cleanup retained its original guarantees; no broad drop/reset/delete.
- Verified the resolved absolute cluster directory, postmaster record, port **56480** and loopback address before `pg_ctl -D <verified-owned-cluster> -m fast -w stop`; exit **0**. No shared PostgreSQL service stopped. Inactive cluster, media/browser tools, compiler caches and logs remain preserved under ignored artifacts.
- No mission Next process remains. The remaining Node executable is the system installation outside the pinned mission runtime and was not killed. Browser/server teardown stayed within each existing owned runner.
- Exact committed-source production build **PASS**, exit **0**, in `committed-build.log`; its disposable database was removed. Final source hashes match the frozen control/repetition record. Targeted final lint, TypeScript and 53 focused units pass; these do not replace unresolved full-unit/Linux/device gates.
- The audit is a documentation-only child commit on `stabilization/operation-new-features-baseline`; exact final audit SHA and final worktree status are returned in the handoff. No push, merge, deployment, feature work or production data changes.

**Final Mission 1 recommendation: CONDITIONAL.** Five full isolated-output rental suites pass and the recorded failure mechanism is now observable. The successful reverse control means the underlying trigger is not conclusively resolved; do not call the namespace change a proven complete root-cause fix. Mission 2 can proceed only as separately authorized further baseline stabilization after review. Parallel feature development remains unauthorized and the broader baseline remains BLOCKED.
