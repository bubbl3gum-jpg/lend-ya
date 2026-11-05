# Mission 4 - Startup and hydration root-cause isolation

Date: 2026-11-05, Asia/Taipei. **Recommendation: BLOCKED.** This is an investigation report, not feature-development or release approval.

## Verified source and scope

- Origin: `https://github.com/bubbl3gum-jpg/lend-ya.git`.
- Authorized branch: `stabilization/operation-new-features-baseline`.
- Isolated worktree: `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization`.
- Starting and tested executable-source commit: `711810a84228de3a4f95a4ace8934e4a8f3acfa8`. Initial `git status --porcelain=v1` was empty. Exact starting reference matched before any writes.
- Ending executable-source commit remains the same: no application, test, configuration, dependency or schema repair was justified or committed. The ending documentation commit is returned in the handoff and can be recovered exactly with `git log -1 --format=%H -- docs/audits/operation-new-features/MISSION_4_STARTUP_HYDRATION.md`. A report cannot embed its own resulting Git hash; this distinction is intentional.
- Read Mission 1, Mission 2, Mission 3 and relevant acceptance/regression documentation, applicable AGENTS/CLAUDE instructions, and installed Next CLI/server-client guides. Earlier audits and the detached Mission 0 reports remain unchanged; their results are historical evidence, not new passes.
- Tracked change: **this new report only**. Diagnostic scripts, copied fixtures and raw evidence are retained separately under ignored `.test-artifacts/mission4/`. No feature agents, push, merge, deploy, public exposure or shared/production database operation.

## Executive finding

The pre-parse timeout did not reproduce in the recorded Mission 4 cohort. Bootstrap and module hooks demonstrated where a future stalled attempt could be localized, but successful traces cannot identify the cause of Mission 3's missing-marker timeout. The 3,000-ms process timeout, 64-MB V8 old-space limit and original security assertions were preserved.

The Webpack hydration mismatch **did reproduce**, both with passive additional HTML/DOM capture and in an ordinary rental-browser run. Functional TAP results and the hydration gate must be assessed separately. The ordinary Webpack suite passed 7/7 while emitting an unexpected hydration page error. No warning suppression, prewarming acceptance workaround, dependency patch or speculative application change was made.

## Environment and reproduction

Windows 11 Home 10.0.26100, PowerShell 5.1; pinned Node 24.19.0, npm 11.5.1, Next/native SWC 16.4.3, React 19.2.8, Prisma 7.10.1, TypeScript 5.9.3, @playwright/test 1.64.0, managed Chromium revision 1248. Existing pinned packages and verified FFmpeg/ffprobe were reused; no reinstall or upgrade is claimed.

The only database server used was the preserved mission-owned PostgreSQL 17.5 cluster, `.test-artifacts/mission01/pgdata`, bound to `127.0.0.1:56480`, synthetic role `mission01`. Every database job used a fresh `hustlen_test_m4_<label>` target, created and removed by the unchanged ownership/URL guards in `tests/run-isolated.ts`. No database was reset or adopted. PostgreSQL was stopped for the quiet full-unit cohorts. Browser/build jobs ran sequentially; no parallel Next jobs in this worktree.

Representative PowerShell preparation (from this worktree):

```powershell
$node=(Resolve-Path .test-artifacts/mission01/node24/node.exe).Path
$npm='C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'
$media=(Get-ChildItem .test-artifacts/mission01/media-github -Recurse -Filter ffmpeg.exe | Select-Object -First 1).DirectoryName
$env:Path=(Split-Path $node)+';'+$media+';'+$env:Path
$env:NEXT_TELEMETRY_DISABLED='1'
$env:DATABASE_URL='postgresql://mission01@127.0.0.1:56480/postgres'
$env:MRT_TEST_DATABASE_URL='postgresql://mission01@127.0.0.1:56480/hustlen_test_m4_reproduce_new'
$env:MRT_BROWSER_PATH=(& $node -e "console.log(require('@playwright/test').chromium.executablePath())")
$env:CHROMIUM_PATH=$env:MRT_BROWSER_PATH
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
$env:MRT_TEST_BUNDLER='webpack' # separate invocation: turbopack
& $node $npm run test:rental-browser
```

Do not precreate the test database. `regressions.cjs` records exact labels, commands, bundlers, UTC starts/ends, seconds and child exits in `regressions.ndjson`. Raw test output uses file descriptors and explicit child exit handling, rather than treating PowerShell's handling of benign native stderr as a suite failure.

## A. Pre-parse startup investigation

Mission 3's actual failed witness remains `.test-artifacts/mission3/unit_after_1.log`: Zod child wall 3,012.4512 ms, ETIMEDOUT/SIGTERM, stderr phases empty. It establishes failure before the synchronous pre-parse marker, **not** whether OS process creation, module resolution/loading, module initialization, scheduling or another pre-marker activity consumed the budget.

Mission 4 used a predefined maximum of 12 full-suite executions: three plain and three instrumented before browser work, then the same pattern after the browser/build workload and owned-resource shutdown. Full-unit command: `npm run test:unit` (existing `--test-concurrency=1`). No mission browser, database or other Node job ran concurrently with these cohorts; the desktop host was not globally dedicated.

For the labelled instrumented runs only, `parent-preload.cjs` intercepts the exact Zod `spawnSync` call, records parent launch/return UTC, and adds `--require child-preload.cjs` inside the original child budget. `child-preload.cjs` synchronously records preload-entry/ready UTC and `performance.now()`, Node bootstrap timing, and call-through `module.registerHooks` resolve/load boundaries. Hooks return the original resolver/loader results; no cache policy, import entry point, parser work, assertion or limit changes. Existing imports-complete, parse-complete and assertions-complete markers remain in the original script. Instrumentation changes timing and is not an identical replay of an ordinary run.

The first three instrumented samples recorded 95 Zod load completions each, preload entry at 42-61 ms and pre-parse at 144-235 ms. Measured parse intervals were approximately 2-7 ms. `bootstrapComplete: -1` at the preload is expected before bootstrap completes, not evidence of a fault. Time between the last load hook and the first script-body marker includes unseparated linking/evaluation and scheduling; it must not be labelled exclusively Zod initialization or event-loop blockage.

| Sample (`npm run test:unit`) | Instrumentation | Result | Seconds | Zod child wall ms | Exit |
|---|---|---|---:|---:|---:|
| plain_1 | None added | 222/222 PASS | 25.440 | 246.674 | 0 |
| plain_2 | None added | 222/222 PASS | 23.736 | 206.548 | 0 |
| plain_3 | None added | 222/222 PASS | 23.613 | 197.214 | 0 |
| instrumented_1 | Scoped preload/hooks | 222/222 PASS | 26.109 | 238.649 | 0 |
| instrumented_2 | Scoped preload/hooks | 222/222 PASS | 24.046 | 185.905 | 0 |
| instrumented_3 | Scoped preload/hooks | 222/222 PASS | 26.602 | 293.078 | 0 |
| post_plain_1 | None added | 222/222 PASS | 30.074 | 1361.350 | 0 |
| post_plain_2 | None added | 222/222 PASS | 24.799 | 201.072 | 0 |
| post_plain_3 | None added | 222/222 PASS | 24.868 | 217.697 | 0 |
| post_instrumented_1 | Scoped preload/hooks | 222/222 PASS | 26.119 | 218.814 | 0 |
| post_instrumented_2 | Scoped preload/hooks | 222/222 PASS | 23.997 | 185.819 | 0 |
| post_instrumented_3 | Scoped preload/hooks | 222/222 PASS | 24.952 | 179.444 | 0 |

**Before workload:** ordinary 3/3 and instrumented 3/3 suites passed. **After workload/cleanup:** ordinary 3/3 and instrumented 3/3 passed. Each suite ran 222 tests with zero skip/cancel. Thus six ordinary and six instrumented full suites passed; this is not twelve identical independent trials or an estimated fleet failure rate. There is no after-repair cohort because no repair was made. Historical Mission 3 was 4/5 full-suite passes and remains separate.

A successful post-workload ordinary child (`post_plain_1`) took **1,361.3504 ms**, reaching imports-complete at 1,316.2943 ms and parse-complete at 1,320.9177 ms. That is a real pre-parse latency outlier, with only about 4.6 ms in the measured parse interval. It had no bootstrap hook, so it cannot distinguish loading, initialization or scheduling. Full instrumented parent launch/return UTC and each synchronous hook record are preserved in the matching logs and summary.json.

Startup controls (`node .test-artifacts/mission4/startup-controls.cjs`, collector exit 0):

| Control | Child observation | Duration ms | Expected-control verdict |
|---|---|---:|---|
| control_real | exit 0; pre-parse marker present | 235 | PASS |
| control_import_block | ETIMEDOUT; pre-parse marker absent; SIGTERM | 3014 | PASS |
| control_body_block | ETIMEDOUT; pre-parse marker present; SIGTERM | 3015 | PASS |

`control_import_block` deliberately adds a four-second CPU-bound static dependency; the three-second budget kills it before the pre-parse marker. `control_body_block` deliberately loops after that marker and is killed with the marker retained. These are synthetic positive controls for diagnostic boundaries and enforcement, **not failed genuine Zod samples being waived and not parser acceptance passes**. The real-script negative control completes its original assertions.

**Confidence/disposition:** high confidence that instrumentation distinguishes the observed boundaries in its controls; no causal closure for the historical timeout. No genuine Mission 4 Zod timeout was captured with a bootstrap/load witness; the deliberate timeout controls are separate. CPU contention, OS scheduling, filesystem delay and module initialization remain hypotheses. Do not attribute the failure to antivirus, cache reuse or Zod parsing without a failing trace.

## B. Independent Webpack hydration investigation

Two full workflow executions captured the same unexpected listing error:

| Invocation | Artifact ID | Functional TAP / exit | Hydration gate |
|---|---|---|---|
| Extra passive SSR/DOM probe | `a72344de018a4681ad195c5a` | 5/7, exit 1 | FAIL, one unexpected hydration page error |
| Ordinary Webpack comparison | `6992248506b8fdc25d31e324` | 7/7, exit 0 | FAIL, one unexpected hydration page error |

Affected route: **`/listings/2`**. Stack: `ListingDetailPage` -> `HeritageSurface` -> `LocaleProvider` -> `HeritageSurfaceContents`. The client's expected root has `className="catalogue heritage"`, `lang="en"`, `data-locale="en"`, `data-theme="system"`, `data-effects="on"`; React instead encounters a classless `<div hidden="">` containing a Suspense boundary. It regenerates the tree on the client.

Raw probe evidence: `hydration-errors.ndjson`, `hydration-responses.ndjson`, `hydration-dom.ndjson`, `ssr-1-3-35.html`, `error-36.html`, `error-36.png` under `.test-artifacts/mission4/`; screenshot inspected. Ordinary browser NDJSON and server logs are preserved in the run-ID directory. No Playwright trace ZIP is claimed.

The unmodified response body starts inside `<body>` with `<div hidden=""><!--$--><!--/$--></div>` immediately followed by the correctly attributed catalogue root. Its provenance is the installed **`node_modules/next/dist/lib/metadata/metadata.js:93-114`**: `MetadataWrapper` deliberately renders a hidden div and `Suspense name="Next.Metadata"`. `components/heritage/experience.tsx` does not conditionally emit this hidden root. This identifies the mismatched DOM node, **not the routine responsible for incorrectly hydrating it**.

Probe timeline (UTC):

- 14:22:36.521: document navigation to `/listings/2`.
- 14:22:36.553: earliest captured catalogue root is already en/system/on, document still loading; response body captured at 14:22:36.595.
- 14:22:44.819: Webpack `serverComponentChanges` frame.
- 14:22:44.821: unexpected React state-update-before-mount warning.
- 14:22:45.437: hydration page error; load completes at 14:22:45.963.
- Ordinary comparison independently records the same mismatch at 14:29:28.427.

The error's expected-render diff and early DOM are the available initial-client evidence; there is no direct full React-fiber state dump. Initial root attributes agree, so a simple theme/locale attribute mismatch is not supported. Snapshot implementations use server fallbacks (`useSyncExternalStore`), and the structural mismatch precedes any reported date/text difference. Host/browser timezone differences remain covered separately by the UTC regression; no timezone or preference workaround was applied. Root markup in the response and early DOM agrees; complete page-wide markup validity is not proven by these snapshots.

The first probe's DOM observer selected only hidden containers with IDs, so it did not record Next's classless, ID-less metadata wrapper as a hidden-container event. The preserved raw response contains it. The later independent controls widen observation to all hidden divs and record body siblings; original evidence is not rewritten.

**Additional genuine failure:** the passive full probe failed its rejected-return subtest while `navigation.settle` retained an unfinished non-document RSC request to `/bookings/2` (`startTime: 0`, document complete). It reached the unchanged 30-second deadline at `tests/rental-browser.test.ts:605`. TAP reports five passes and two failures because the enclosing test also fails. The terminal-request lifecycle cause is unresolved; do not assert hydration caused it or discard it as instrumentation noise. The normal comparison passed this functional case.

### Route-only controlled reproduction

Run `node .test-artifacts/mission4/run-hydration-controls.cjs`: outer command `npm run test:rental-browser` with a scoped diagnostic child redirect to `hydration-controls.test.ts`; **not a canonical rental-suite execution**. The copied fixture retains registration, listing creation, start/stop ownership, original deadlines, database guards and cleanup, replacing the rental body with route-only comparisons. No booking/custody/dispute action is needed to reproduce the mismatch.

Two fixed passes use opposite orders (A-B-C-D, then D-C-B-A). Each cell gets a new compiler incarnation. `cold` means no prior SSR GET of the listing in that incarnation; `warm` means a successful authenticated API-context GET of that same URL before browser navigation. It does not guarantee every client asset or OS cache is warm. `fresh` creates a new browser context with the same synthetic storage state and viewport/timezone; `reused` retains the existing context after about:blank. The factors are controlled diagnostic conditions, not proposed workarounds.

| Condition | Pass 1: seconds / hydration errors | Pass 2: seconds / hydration errors |
|---|---|---|
| reused_cold | 30.096 / 1 | 26.625 / 0 |
| fresh_cold | 26.701 / 1 | 28.014 / 1 |
| reused_warm | 10.662 / 1 | 10.168 / 0 |
| fresh_warm | 10.572 / 0 | 11.251 / 0 |

**Observed result: 4/8 cells emit the same hydration mismatch; diagnostic test FAIL 0/1, exit 1, outer duration 338.084 s.** Artifact `68d00f31153140b88eb2ea47`. No cell has a navigation/visibility exception; four captured page errors correctly make the final assertion fail. Cold cells fail 3/4; pre-requested cells fail 1/4. Reuse is not necessary (fresh-cold fails twice); an SSR pre-request is not sufficient (reused-warm fails once). Fresh-warm passes twice, but small, sequenced, non-randomized samples do not establish a universal fix or isolate which compiler/HMR/cache operation is responsible. Four corresponding pre-mount React console warnings are retained.

A limited root-file watcher observed **18 next-env.d.ts change notifications**, covering nine owned dev-server incarnations. It observed no notifications for the other four watched paths (tsconfig.json, AGENTS.md, app/globals.css, next.config.ts). Events may coalesce/duplicate and this is not a complete filesystem trace. Generated-type writes are an observation, not a proven trigger. No source edit was used to induce invalidation.

### Limited production-mode comparison

`node .test-artifacts/mission4/run-production-listing.cjs` redirects the diagnostic child to `production-listing.test.ts`; artifact `e7af84b48dec7640eafb73b7`. Fixture creation occurs on an owned dev server/database, then that server stops. `next start` serves the already verified build only on the same loopback test origin with that guarded test database; no production resource is contacted. Existing production gates stay active.

- retained_production: 1.849 s, 0 page errors.
- fresh_production: 1.540 s, 0 page errors.

Both route probes PASS; one diagnostic TAP test 1/1, exit 0, outer duration 60.360 s. Captured production-stage listing navigation has zero page errors and zero console errors. This supports a development-runtime-specific investigation in these samples; two synthetic public-listing loads do not prove production-wide absence of a defect. No physical device is involved.

**Confidence/disposition:** high confidence in repeated runtime mismatch, metadata-wrapper provenance, and absence of a probe-only explanation. Temporal proximity supports investigating initial hydration versus development invalidation; it does not yet establish that HMR, retained browser state, filesystem cache or application preferences cause the mismatch. No Next internals or application rendering was patched. Cold-path acceptance was not replaced with prewarming.

## C. Regression acceptance

| Gate / exact command | Windows result | Seconds | Exit | Evidence |
|---|---|---:|---:|---|
| `npm run test:rental-browser` (`webpack`) | 7/7 PASS; **hydration FAIL** | 339.904 | 0 | `rental_webpack.log` |
| `npm run test:rental-browser` (`turbopack`) | 7/7 PASS | 213.195 | 0 | `rental_turbo.log` |
| `npm run test:meetup` | 16/16 PASS | 483.949 | 0 | `meetup.log` |
| `npm run test:rental-api` | 20/20 PASS | 69.919 | 0 | `rental_api.log` |
| `npm run test:authorization` | 8/8 PASS | 70.409 | 0 | `authorization.log` |
| `npm run test:camera-reader` | 1/1 PASS | 8.841 | 0 | `qr_reader.log` |
| `npm run test:postgres-utc` | 1/1 PASS | 6.380 | 0 | `utc.log` |
| `npm run test:baseline` | PASS | 56.841 | 0 | `baseline.log` |
| `npm run typecheck` | PASS | 33.772 | 0 | `typecheck.log` |
| `npm run lint` | PASS | 167.361 | 0 | `lint.log` |
| `npm run build:verify` | PASS | 38.663 | 0 | `build.log` |
| `npm run test:meetup-camera -- --camera-production` | 2/2 PASS | 55.440 | 0 | `camera_production.log` |

The canonical collector exits 0; it records command results, not a new assertion that rejects every console/hydration error. This report separately fails that gate rather than misreporting Webpack acceptance. The passive full probe exits 1 (5/7); the route-only control exits 1 (4/8 cells defective, TAP 0/1). Those failed attempts remain preserved.

Baseline-specific output: `BASELINE_REPEATABILITY_PASS: 33 migrations; all 76 public tables unchanged` and `BASELINE_FAILURE_CLEANUP_PASS: failed child database/upload removed; parent database/upload preserved`. Fresh database suites apply migrations through the unchanged runner; no additional standalone Prisma validate/status command is claimed in Mission 4. TypeScript invokes the existing Next type generation plus `tsc --noEmit`; lint runs the existing ESLint command.

Browser diagnostics also retain expected fault-injection console messages: lost-response aborts, explicit 503 recovery and deliberately unavailable Booking-table queries. Ordinary Turbopack records six such console-error events, zero page errors; ordinary Webpack records nine console-error events, including the **unexpected pre-mount warning**, and one hydration page error. Those are not described as clean browser consoles. No errors were filtered from the raw evidence.

Executed collectors (fresh log targets use exclusive creation; do not overwrite/rerun over these evidence files):

```powershell
& $node .test-artifacts/mission4/units.cjs
& $node .test-artifacts/mission4/probe.cjs
& $node .test-artifacts/mission4/regressions.cjs
& $node .test-artifacts/mission4/run-hydration-controls.cjs
& $node .test-artifacts/mission4/run-production-listing.cjs
# After zero owned DBs/processes and verified PostgreSQL shutdown:
& $node .test-artifacts/mission4/post-units.cjs
& $node .test-artifacts/mission4/startup-controls.cjs
```

Normal unit invocations remove NODE_OPTIONS. Instrumented unit samples set it only to the scoped parent-preload path. Browser probes set it only to their diagnostic parent preload. The full SSR probe instruments the original rental test; route-only and production controls redirect to copied tests. None targets a deployed application. For a new reproduction use a new artifact base/labels and fresh guarded database name. Complete UTC start/end and child phase data are in units.ndjson, post-units.ndjson, regressions.ndjson and the diagnostic JSON/log files.

HMR: captured unexpected Turbopack hash-mismatch instructions: **0** across the recorded browser traces. Rental Turbopack artifact `2420887bb6d72486d805458e`; meetup artifact `259cbc9479188dd4c54a985c`. This finite sample does not close the original normal-client version-divergence cause. Webpack server-component invalidation preceding hydration is a different observation, not proof of the earlier Turbopack trigger. Compiler-output isolation remains enabled and unchanged. One bounded process snapshot during meetup showed one owned Next CLI/server pair plus compiler workers; it does not exclude brief overlap at other times.

Linux: fresh `wsl --list --quiet` exited 0 with no distribution; `docker info --format '{{.OSType}}'` exited 1 because `dockerDesktopLinuxEngine` was unavailable. Linux canonical/matrix workflow acceptance **BLOCKED / NOT EXECUTED**. No workflow dispatched. Physical-camera, real mobile Safari and secure-device connectivity acceptance **BLOCKED / NOT EXECUTED**. Synthetic production camera uses authored/virtual input and does not close those gates. No tunnel, firewall alteration or deployment.

## Security, preservation and final state

No change to authentication, authorization, sessions, rental/booking lifecycle, financial policy, QR challenge authority, geofence, consent, database target/marker validation, development-only restrictions, schema or production rendering. Reported security passes are finite executed samples, not proof of universal security. No failed assertion was weakened, no timeout/heap increase, no broad retry, no hidden hydration warning.

All 11 frozen source/configuration inputs in `frozen.json` remain byte-identical. Diagnostic scripts modify only copied fixture execution in owned test resources. Evidence-helper quoting/ASCII issues were corrected separately and are not represented as product or test-suite fixes. A temporary automatic-review account limit prevented one log read; execution resumed after its advertised reset without bypassing approval.

- SQL on the identity-checked owned cluster returned **0** databases matching `hustlen_test_%` before shutdown. All **12** Mission 4 run manifests have `preserved: false`; 10 passed commands and two failed diagnostic commands. A manifest PASS is not a hydration-gate PASS. Upload file count is **0**.
- Verified postmaster PID **66652**, exact owned data directory, port **56480** and loopback address before `pg_ctl -D <verified-owned-data> -m fast -w stop`; exit 0. PID file remains absent.
- Final runtime check: **0 pinned mission Node / managed Chromium processes**. No shared PostgreSQL service was stopped. Logs, compiler caches, screenshots, copied fixtures and earlier reports remain preserved.
- Main and partner worktrees remain clean at `f856dc360b332007dd79725ddee0d28102411521`. The stabilization branch was clean before creating this report; `git merge-base --is-ancestor 711810a84228de3a4f95a4ace8934e4a8f3acfa8 HEAD` returned 0. Fetch and push remote URLs both match the requested repository.
- Only this report is staged/committed after complete diff review. Final audit commit SHA and clean worktree status are returned in the handoff. No testing after that documentation commit is implied.

## Remaining blockers and Mission 5 recommendation

1. **High, acceptance-blocking:** reproducible Webpack listing hydration mismatch, app-facing in development; exact trigger and production reach unresolved. Separate the known metadata wrapper node from the unknown incorrect hydration cursor/update cause. Preserve both failing captures.
2. **Medium, test-infrastructure acceptance blocker:** historical bounded-child pre-marker timeout remains unexplained despite the Mission 4 samples. Keep the 3-second/64-MB gate; gather a failing bootstrap/module witness on a controlled host or supported Linux runner.
3. **Medium, test/runtime uncertainty:** one probe's stranded RSC request plus historical cold-navigation/startup and Turbopack HMR divergences are not causally closed. Do not combine them into one proven cache defect.
4. **Mandatory evidence gaps:** Linux workflow acceptance and physical camera/mobile Safari/secure-device checks remain open. Build/headless/synthetic passes cannot replace them.

**Mission 5 should be another bounded stabilization investigation, not feature development.** Review this source/evidence before changes. Isolate a minimal Next metadata/hydration reproduction and control the arrival of development server-component invalidations relative to initial hydration, with positive and negative controls and unchanged canonical cold-browser acceptance. Investigate RSC terminal-event ownership separately. Run the canonical/matrix Linux workflows at the reviewed SHA on an available supported runner; provision no production resources. Capture a failing startup trace before blaming scheduling, storage or imports. Any proposed framework patch/version change needs a focused reproduction and the existing rental/security regressions; do not broaden into dependency upgrades. Obtain owner-run physical HTTPS/device evidence through the existing acceptance plan before closing those gates.

No evidence supports unconditional parallel-development approval or a production-readiness claim. No feature agent was launched.

**FINAL VERDICT: BLOCKED**

**SAFE TO BEGIN PARALLEL DEVELOPMENT: NO**
