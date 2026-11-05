# Mission 3 — Deterministic test stability

Date: 2026-11-05 (Asia/Taipei). **FINAL VERDICT: BLOCKED**. **SAFE TO BEGIN PARALLEL DEVELOPMENT: NO** for general baseline acceptance. See the limited, unmerged-work recommendation below.

## Verified starting state and scope

Verified exact fetch/push remote `https://github.com/bubbl3gum-jpg/lend-ya.git`, branch `stabilization/operation-new-features-baseline`, HEAD **`97d53fdf619ff09a9af4b44df6d3c8f7ed0d19a2`**, and empty initial `git status --porcelain=v1` in `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization`. Reviewed Mission 1/Mission 2 reports, applicable AGENTS/CLAUDE instructions, installed Next 16.4.3 CLI documentation, actual test sources and preserved failure evidence. No product code was modified before this investigation.

Historical Mission 2 failures were: bounded Zod timeout in 2/5 full-unit samples, cold listing navigation beyond 30 seconds, one development-server startup/readiness failure, and full meetup failure with captured HMR mismatch instructions. Prior shared-output controls passed; no cache-reuse cause is assumed. Historical results are labelled historical, not counted as new execution.

This mission used a fixed investigation: two unchanged full-unit runs; four focused security samples; two deliberately failing diagnostic controls; one initial full rental run per bundler; one complete meetup run; the listed API/security/QR/static/build checks; three post-build full-unit runs; and, after a newly witnessed navigation race, exactly one post-repair full rental run per bundler. No retry-until-green, disabled assertion, timeout increase, new product feature, provider activation or parallel feature agent.

## Reproduction and classification

| Finding | Classification supported by evidence | Remaining uncertainty |
|---|---|---|
| Real bounded Zod timeout reproduced after build | Test-infrastructure/runtime acceptance failure **before the synchronous pre-parse marker**; the oversized-array assertion body did not reach parsing in this witness | Cannot separate process startup, module resolution/loading/initialization or descheduling before that marker. Not a demonstrated Zod oversized-array algorithm hang. |
| New Webpack rental failure | Confirmed document-replacement/readiness race in the test's stateful station interaction, with downstream missing-fixture failures | Why the dev document was replaced is not causally established; zero captured `reloadPage` frames does not exclude all framework/client reload paths. |
| Mission 2 cold `goto` and startup failures | Historical framework/runtime timing symptoms, not reproduced as the same failure in this bounded sample | Next's logged processing time is not proof all time was compilation. No demonstrated repair of the original cold/runtime cause. |
| Turbopack mismatch loop | Historical server-instructed version-mismatch behavior; normal-client trigger remains unproven | Successful shared controls and new green samples cannot establish compiler reuse or corruption as cause, or prove future stability. |
| Unexpected post-fix listing hydration mismatch | Confirmed Webpack development UI/runtime error; not an expected negative fixture error | Application versus framework/streaming cause and production reach remain unresolved; console-clean acceptance fails. |
| Missing phase/socket/navigation evidence | Confirmed diagnostic gaps, repaired and exercised | Observer effects and host variability remain; socket identity is per page within a run, not a server PID proof. |
| Product-critical defect | **None confirmed by these timing witnesses** | This is not proof of absence or production certification; Linux and real-device evidence remain open. |

### Bounded Zod evidence

The child retains the original **3000-ms timeout, 64-MB heap, 100000-element sparse input**, root `zod` import, all invalid-input assertions and valid-input assertion. Startup/imports remain inside that same bounded child. Added synchronous `writeSync(2, ...)` markers immediately before schema construction/parsing, after parsing and after all assertions; the parent records actual wall time, status, signal, error and stderr. This is diagnostic instrumentation, **not a timing repair or a security-budget exemption**.

The two unchanged full suites passed 222/222. Four focused three-test security suites passed. Known controls retained the same 3-second/64-MB bounds: an imported module deliberately awaiting four seconds timed out with no body marker (3.021 s); an intentional body loop emitted `imports-complete` and then timed out (3.028 s). Both controls passed their diagnostic expectations. They are **not passing Zod security executions** and do not retrospectively classify Mission 2 failures.

The first genuine post-build full-unit sample failed **221/222**. Its Zod result was `wallMs=3012.4512`, `status=null`, `signal=SIGTERM`, `ETIMEDOUT`, **`phases=""`**. The pre-parse write precedes schema construction, so the array parse was not reached before timeout. This localizes the failure boundary; it does not identify which startup/import/initialization/scheduling operation consumed the budget. Subsequent samples passed: the next child's first marker was at 528.6418 ms, parse complete 535.5805 ms; the third was 141.448 ms and 143.8868 ms respectively. Successful fast bodies cannot convert the failed security gate into PASS.

All post-build unit samples ran after verification of zero pinned mission Node processes, zero managed Chromium processes, zero test databases, and stopped owned PostgreSQL; no monitor or competing mission Node job was launched during them. The Windows host was not certified as globally idle/dedicated.

### Webpack station-dialog race and targeted repair

Pre-repair Webpack rental run: **FAIL 1/7, exit 1, 202.805 s**, artifact **`5c475f521d9f9cd1868b723c`**. The first lifecycle case timed out clicking the Taipei Main SVG station after Playwright reached “scrolling into view.” The saved screenshot `rental-0-1.png` shows the listing with the station dialog gone; the checkpoint reports document readyState `complete`. Zero page errors and zero captured `reloadPage` frames; no SVG product defect or Turbopack-only cause is inferred.

New lifecycle evidence proves a second document load occurred during the action: first load **12:31:08.302 UTC**, replacement navigation starts **12:31:08.724 UTC** (422 ms later), completes **12:31:09.141 UTC**, and replacement load fires **12:31:10.238 UTC**. The native dialog's state is not preserved across document replacement. The fixture opened it before enforcing the existing document/RSC transition contract. `completedId` remained zero; persistence/history assertions, the `/api/bookings/0` 400-versus-403 check and the detail-error check against booking 0 then failed as dependent fixtures. The dispute case passed; these are not five independent confirmed business defects.

Applied **one existing `await navigation.settle(borrower)`** immediately after the listing `goto`, before opening the stateful dialog. The existing helper observes navigation/RSC requests, document state and rebuild activity; its 500-ms quiet window would include the witnessed replacement request at +422 ms. This is the same readiness contract already used elsewhere in the suite. No helper logic/budget, 30-second `goto`/click deadline, retry, force-click, selector, station validation, quotation or persisted-state assertion changed. The original cold `goto` deadline still applies before this added readiness phase. It does not claim to eliminate arbitrary later HMR or repair framework invalidation.

The repair was applied during the database-only baseline check after verifying no Next process was active, avoiding source edits during live browser acceptance. `webpack-navigation-race-corrected.json` uses UTC DateTimeOffset subtraction; it explicitly supersedes an earlier diagnostic calculation that mixed local DateTime with UTC. That arithmetic error was in this audit helper, not database/application timestamp behavior.

Post-repair full suites: **Webpack 7/7, exit 0, 338.013 s** (`aa19a81a08f4743867f5cc4c`); **Turbopack 7/7, exit 0, 216.198 s** (`8470243ac450986dea658260`). Both retain all original UI station-selection, lifecycle, restart, privacy and negative assertions. This supports the narrow readiness repair, not an absolute reliability guarantee. No further product-suite repetitions were attempted.

**Unexpected runtime finding despite 7/7:** post-repair Webpack emitted one `Hydration failed because the server rendered HTML didn't match the client` page error at **12:56:24.064 UTC**, on borrower `/listings/2` during the disputed-return case. The diff contrasts a hidden server/Suspense container with `HeritageSurfaceContents` attributes/markup. It precedes the deliberately broken-table/error-recovery case; it is not classified as an expected negative fixture error. The functional suite passed, but the console/hydration gate is **FAIL**. Source `components/heritage/experience.tsx` was inspected, not changed. Application versus framework/streaming/HMR origin, production reach and repeatability are unresolved. No theme/timestamp/cache cause is inferred from the generic React message.

Real application traces contain socket-open identities but **zero close callbacks**. Installed Playwright types confirm `on('close')` is the correct API. One separate real loopback WebSocket/browser diagnostic `node node_modules/tsx/dist/cli.mjs .test-artifacts/mission3/socket-lifecycle-control.ts` passed with one open and one close (exit 0; enclosing tool invocation 2.523 s). This validates the callback for a clean closure, not complete close-event coverage during application document/browser teardown. Absence of close records is **not evidence of leaked live sockets**; final process cleanup was checked independently.

## Exact changes and coverage

- `tests/dependency-security.test.ts`: bounded-child synchronous phases and failure evidence only. Strict original error/signal/status and security assertions remain.
- `tests/support/browser-diagnostics.ts`: per-page HMR socket identity and open/close records on every captured control/subscription/reload; actual navigation-body completion timing plus DOMContentLoaded/load events. Incoming bounds, outgoing resource/version bounds and privacy exclusions retained.
- `tests/test-safety.test.ts`: existing observer regression now checks both socket identities and their close records, ten expected records (four new open/close records), while retaining binary/query/cookie/version-bound assertions. Combined affected-file run passed **13/13**, exit 0.
- `tests/rental-browser.test.ts`: existing readiness contract before opening the station dialog, with explanatory comment. Full lifecycle cases remain unfiltered.
- `docs/audits/operation-new-features/MISSION_3_DETERMINISTIC_STABILITY.md`: new report only; earlier audits preserved.

No application/lib/components, financial/booking/auth semantics, QR/geofence rules, Prisma schema/migrations, dependencies/lockfile, production configuration or database safety implementation changed. No cache deletion/disable, shared DB reset, security-budget increase or relocation of risky work outside the child. Compiler incarnation isolation from Missions 1/2 remains intact.

## Environment, commands and complete fresh results

Windows 11 Home 10.0.26100, PowerShell 5.1.26100.7462, Node 24.19.0, npm 11.5.1, Next 16.4.3, Zod 4.6.7, Prisma 7.10.1, preserved PostgreSQL 17.5, managed Chromium 1248 / Playwright 1.64.0. Reused existing locked installation and verified media/browser prerequisites; no fresh installation or upgrade claimed.

All `npm` commands below actually use `.test-artifacts/mission01/node24/node.exe C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`; pinned Node is prepended to PATH. FFmpeg/ffprobe come from preserved `.test-artifacts/mission01/media-github/**/bin`. Browser path comes from `require('@playwright/test').chromium.executablePath()`. `NEXT_TELEMETRY_DISABLED=1`; normal jobs unset `NODE_OPTIONS`.

Each DB suite uses `DATABASE_URL=postgresql://mission01@127.0.0.1:56480/postgres` as runner admin input and a fresh `MRT_TEST_DATABASE_URL=postgresql://mission01@127.0.0.1:56480/hustlen_test_m3_<label>`. Existing runner creates/marks/verifies before child writes/drop and refuses adoption. `MRT_TEST_BUNDLER=turbopack` or `webpack` as labelled. One top-level suite was launched at a time; no concurrent Next suite jobs were started in the worktree. Intentional owner/borrower browsers remain part of each suite. Logs, commands, controls and frozen-source snapshots are under ignored **`.test-artifacts/mission3/`**; per-run NDJSON/HTML/screenshots/server logs/manifests remain in `.test-artifacts/<run-id>/`.

Actual collector entry commands through pinned Node: `unit-before.cjs`, `focused-controls.cjs`, `regressions.cjs`, `unit-after.cjs`, `postfix.cjs`, all under `.test-artifacts/mission3/`. Collectors preserve failed child exit codes and return failure if any child fails. Future reruns require new labels/evidence; existing logs are never erased.

| Invocation / log basename | Exact command | Observed result | Seconds | Exit |
|---|---|---|---|---|
| `unit_before_1` | `npm run test:unit` | PASS 222/222 | 25.809 | 0 |
| `unit_before_2` | `npm run test:unit` | PASS 222/222 | 24.009 | 0 |
| `security_focused_1` | `node node_modules/tsx/dist/cli.mjs --test tests/dependency-security.test.ts` | PASS 3/3 | 1.036 | 0 |
| `security_focused_2` | `node node_modules/tsx/dist/cli.mjs --test tests/dependency-security.test.ts` | PASS 3/3 | 0.944 | 0 |
| `security_focused_3` | `node node_modules/tsx/dist/cli.mjs --test tests/dependency-security.test.ts` | PASS 3/3 | 1.13 | 0 |
| `security_focused_4` | `node node_modules/tsx/dist/cli.mjs --test tests/dependency-security.test.ts` | PASS 3/3 | 1.248 | 0 |
| `rental_turbo` | `npm run test:rental-browser` | PASS 7/7 | 216.49 | 0 |
| `rental_webpack` | `npm run test:rental-browser` | FAIL 1/7 | 202.805 | 1 |
| `meetup` | `npm run test:meetup` | PASS 16/16 | 489.859 | 0 |
| `rental_api` | `npm run test:rental-api` | PASS 20/20 | 69.835 | 0 |
| `authorization` | `npm run test:authorization` | PASS 8/8 | 70.11 | 0 |
| `qr_reader` | `npm run test:camera-reader` | PASS 1/1 | 8.732 | 0 |
| `utc` | `npm run test:postgres-utc` | PASS 1/1 | 6.198 | 0 |
| `baseline` | `npm run test:baseline` | PASS | 51.915 | 0 |
| `typecheck` | `npm run typecheck` | PASS | 17.793 | 0 |
| `lint` | `npm run lint` | PASS | 102.572 | 0 |
| `build` | `npm run build:verify` | PASS | 38.33 | 0 |
| `camera_production` | `npm run test:meetup-camera -- --camera-production` | PASS 2/2 | 54.54 | 0 |
| `unit_after_1` | `npm run test:unit` | FAIL 221/222 | 32.117 | 1 |
| `unit_after_2` | `npm run test:unit` | PASS 222/222 | 24.536 | 0 |
| `unit_after_3` | `npm run test:unit` | PASS 222/222 | 23.147 | 0 |
| `postfix_webpack` | `npm run test:rental-browser` | PASS 7/7 | 338.013 | 0 |
| `postfix_turbopack` | `npm run test:rental-browser` | PASS 7/7 | 216.198 | 0 |

All passing TAP samples have zero skipped/cancelled tests. The five full-unit suites comprise **four 222/222 passes and one 221/222 failure**. Four focused runs each pass 3/3. The separate combined affected-file command `node node_modules/tsx/dist/cli.mjs --test tests/test-safety.test.ts tests/dependency-security.test.ts` passed 13/13, exit 0, Node test duration 2.418 s (default file concurrency; not a quiet full-unit sample). The two synthetic timeout controls are separately recorded in `control_import_wait.json` and `control_body_loop.json`.

| Browser invocation | Artifact ID | Text HMR frames / unexpected mismatch messages | Navigation-body completions | Page-error events |
|---|---|---|---|---|
| `rental_turbo` | `191ab86755f93e96d283e076` | 1820 / 0 | 41 | 0 |
| `rental_webpack` | `5c475f521d9f9cd1868b723c` | 695 / 0 | 38 | 0 |
| `meetup` | `3db67ff38989c3bcd3e87c99` | 639 / 0 | 30 | 0 |
| `camera_production` | `ced2d8a8358a50fac69a0cd2` | 0 / 0 | 15 | 0 |
| `postfix_webpack` | `aa19a81a08f4743867f5cc4c` | 1063 / 0 | 64 | 1 |
| `postfix_turbopack` | `8470243ac450986dea658260` | 1843 / 0 | 41 | 0 |

The initial regression collector's exit 1 retains the pre-repair Webpack failure. Later PASS rows do not remove it. Expected diagnostic-control timeouts are labelled separately. Historical Mission 1/2 results and unexecuted checks are not counted as new PASS evidence.

## Remaining blockers, risk and owner decision

**Product-critical:** no authentication, authorization, funds or custody logic defect is confirmed; original security/rental/QR/Origin/geofence authority is unchanged. Unexecuted Linux and physical-device acceptance remain unknown, not approved. No production certification follows.

**Test-infrastructure/runtime blockers:** a genuine full-unit security guard still fails before reaching the measured parse body; lower startup/import/scheduling cause remains unresolved. HMR normal-client divergence and the historical cold/startup failures are not conclusively closed. The station-transition repair has the bounded verification above, not a universal stability guarantee. The unexpected listing hydration mismatch is an additional application-facing runtime symptom; it cannot safely be certified as infrastructure-only. Small sequenced samples and instrumentation do not establish a fleet failure rate.

**Linux:** fresh `wsl --list --quiet` exit 0 lists no distribution; `docker info --format '{{.OSType}}'` exits 1, no available Linux engine. Linux workflows **BLOCKED / not executed**. No hosted workflow dispatched. **Physical camera/mobile Safari:** **BLOCKED / not executed**; headless mobile viewports, authored pixels and synthetic production-camera tests are separate evidence. No tunnel, firewall/security alteration or public exposure.

Recommended next action: retain the diagnosed pre-body timeout as an infrastructure acceptance failure, profile startup/module initialization on a dedicated supported host or Linux runner while retaining the current security budget, and review the station-transition fix. Require Linux canonical/matrix jobs at the reviewed SHA and secure real-device acceptance before releasing/integrating affected behavior. Do not broaden this mission into repeated attempts to force green or speculative framework/package changes.

**General parallel-development GO: NO.** However, **narrow, isolated, non-authoritative presentational work could reasonably proceed without merging**, if the owner explicitly accepts the infrastructure hold and assigns exclusive file ownership. Exclude the affected listing/shared-shell/theme/MRT interactions, shared auth/password recovery, financial/deposit policy, booking/custody, QR/geofence and schema changes from that exception; they depend on reliable integration/security gates and product contracts. Keep separate worktrees, DBs, compiler outputs and one Next job per worktree. Preserve every red gate; no merge, deployment or feature-agent launch is authorized here. This recommendation distinguishes an unqualified baseline approval from a limited, reversible owner decision.

## Preservation and handoff

- All **11** `hustlen_test_m3_*` outer runner manifests: **10 passed, 1 failed, zero preserved**. The failed DB run is pre-repair Webpack. Unit failure is separate, not a DB run. No failed result is relabelled PASS by cleanup.
- Final SQL `SELECT count(*) FROM pg_database WHERE datname LIKE 'hustlen_test_%'` returned **0**, exit 0. Both `storage/listings` and `public/uploads/listings` contained **0 files**. Baseline repeatability/failure-cleanup probe passed without adopting/resetting parent data.
- Owned cluster data path `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization/.test-artifacts/mission01/pgdata`, port **56480**, loopback **127.0.0.1**, final PID **38720** verified before final `pg_ctl -D <verified-owned-data> -m fast -w stop`; exit **0**. Cluster was also verified empty/stopped before quiet units, then restarted only for the two planned post-fix checks. No shared service was stopped.
- Final PID file absent, **0 pinned mission Node and 0 managed Chromium processes**. Only recorded test resources were cleaned. Logs, screenshots, compiler caches, before-fix source snapshot and all earlier audits remain preserved.
- Main and partner worktrees rechecked clean at `f856dc360b332007dd79725ddee0d28102411521`. No reset/clean/rebase, branch deletion, main/partner edit, push, merge, deployment or feature agent.
- All 11 post-navigation frozen inputs match current source (`frozen-after-navigation.json`, `summary.json`). The deliberate difference from the initial frozen cohort is the recorded readiness call, applied at a server-free boundary before TypeScript/lint/build. Product/schema/dependency inputs remain unchanged.
- Commit contains only the four reviewed test/diagnostic files and this new audit on the authorized stabilization branch. Exact final commit and clean-worktree status are returned in the owner handoff; no additional testing is claimed after this report was written.

**FINAL VERDICT: BLOCKED**

**SAFE TO BEGIN PARALLEL DEVELOPMENT: NO** (general approval; limited unmerged-work recommendation above).
