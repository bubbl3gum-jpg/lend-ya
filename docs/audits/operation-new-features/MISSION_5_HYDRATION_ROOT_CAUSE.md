# Mission 5 - Hydration root-cause isolation and targeted acceptance repair

Executed 2026-11-05 UTC / 2026-11-05-06 Asia/Taipei. **Recommendation: BLOCKED.** The framework/runtime trigger has a matching standalone causal reproduction and the acceptance reporting gap is repaired; the rendering failure itself is not repaired.

## 1. Repository verification and commits

- Fetch/push origin: `https://github.com/bubbl3gum-jpg/lend-ya.git`.
- Required/actual branch: `stabilization/operation-new-features-baseline`.
- Worktree: `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization`, separate from main and partner worktrees.
- Starting HEAD: **`7feef314991ea488db625c61c4fb143596e842d3`**. Initial porcelain status empty, exact branch/remote/HEAD matched before writes.
- Ending tested repair commit: **fc4bf60338d82bc54b88505b3c0dbf03857317bc**. Post-repair verification hashes match their frozen cohort; earlier experiments are labelled separately. This report is the subsequent documentation-only commit; its exact ending SHA is returned in the handoff and recoverable with `git log -1 --format=%H -- docs/audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md`.
- Reviewed Mission 1-4 audit findings, relevant regression/acceptance documentation, applicable AGENTS/CLAUDE instructions and installed Next CLI, server/client and metadata-streaming guides. Earlier reports, including detached Mission 0 evidence, remain unchanged. Historical runs are not counted as new passes. `git merge-base --is-ancestor 7feef314991ea488db625c61c4fb143596e842d3 HEAD` verifies preserved ancestry.

## 2. Executive finding and scope

**Confirmed and repaired test-harness defect:** captured hydration failures could coexist with a successful canonical rental-browser command. The helper previously only wrote diagnostics. The rental workflow now explicitly rejects known hydration-failure signatures before success, retaining original functional assertions, raw diagnostics and finally-based cleanup. Both post-repair Webpack commands fail visibly; this is stronger reporting, not a rendering repair.

**Confirmed tested trigger: development RSC invalidation after router-state initialization but before initial client-page hydration.** A matching standalone Next-only counterfactual reproduces the same hidden metadata-wrapper mismatch in 2/2 invalidated trials and 0/2 paired negatives. The application captures and natural-message deferral controls are consistent with that mechanism. No Hustlen application code is required to reproduce it. This establishes a framework/runtime failure under the tested ordering, not that every historical failure has the same cause or that a framework correction has been validated. The precise Next/React internal repair remains open.

An earlier, separate counterfactual dispatches before router initialization and raises a different framework error. The final control verifies a unique, initialized router-state singleton before injecting invalidation, avoiding that earlier failure and reproducing the original mismatch instead. No application layout, metadata, preference, authentication, rental, QR, geofence, database model or dependency was changed.

## 3. Environment and exact reproduction

Windows 11 Home 10.0.26100, PowerShell 5.1, pinned Node 24.19.0, npm 11.5.1, Next/native SWC 16.4.3, Prisma 7.10.1, TypeScript 5.9.3, @playwright/test 1.64.0, managed Chromium revision 1248; existing verified FFmpeg/ffprobe. Installed dependencies were reused; no installation or upgrade is claimed.

Root React package is **19.2.8**. The installed Next-bundled React and React DOM client/server development builds all identify themselves as **`19.3.0-canary-278794d7-20261002`** (`next/dist/compiled/react*/cjs/*development.js`). These are distinct version facts: the root package alone does not identify the App Router runtime. Matching bundled versions do not prove a version defect or full binary integrity.

Only the preserved owned PostgreSQL 17.5 cluster at `.test-artifacts/mission01/pgdata`, `127.0.0.1:56480`, synthetic role `mission01`, was used. Fresh `hustlen_test_m5_<label>` databases were exclusively created/migrated/marked/removed by the unchanged isolated runner. No shared database was adopted/reset and no production data was accessed. Browser/build jobs were sequential; no parallel Next jobs in this worktree.

Canonical reproduction from this worktree, with the owned cluster already safely started:

```powershell
$node=(Resolve-Path .test-artifacts/mission01/node24/node.exe).Path
$npm='C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'
$media=(Get-ChildItem .test-artifacts/mission01/media-github -Recurse -Filter ffmpeg.exe | Select-Object -First 1).DirectoryName
$env:Path=(Split-Path $node)+';'+$media+';'+$env:Path
$env:NEXT_TELEMETRY_DISABLED='1'
$env:DATABASE_URL='postgresql://mission01@127.0.0.1:56480/postgres'
$env:MRT_TEST_DATABASE_URL='postgresql://mission01@127.0.0.1:56480/hustlen_test_m5_reproduce_new'
$env:MRT_BROWSER_PATH=(& $node -e "console.log(require('@playwright/test').chromium.executablePath())")
$env:CHROMIUM_PATH=$env:MRT_BROWSER_PATH
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
$env:MRT_TEST_BUNDLER='webpack' # independent comparison: turbopack
& $node $npm run test:rental-browser
```

Choose an unused guarded database name; do not precreate it. Exact collectors, labels, UTC start/end, durations and child exits are retained under ignored **`.test-artifacts/mission5/`**. Per-run manifests/server logs/HTML/screenshots/NDJSON remain in `.test-artifacts/<24-hex-run-id>/`. No cookies, headers, credentials or request bodies were added to the diagnostic collection. Full HTML evidence contains only owned synthetic fixtures and is not published.

Recorded collector commands (exclusive log creation; use new paths/labels for another run):

```powershell
& $node .test-artifacts/mission5/run-hydration-controls.cjs
& $node node_modules/tsx/dist/cli.mjs .test-artifacts/mission5/minimal-controls.ts
& $node .test-artifacts/mission5/run-timing.cjs         # invalid diagnostic, preserved
& $node .test-artifacts/mission5/run-timing-fixed.cjs   # corrected plain-JS instrumentation
& $node node_modules/tsx/dist/cli.mjs .test-artifacts/mission5/stimulus.cjs
& $node node_modules/tsx/dist/cli.mjs .test-artifacts/mission5/stimulus-mounted.cjs
& $node node_modules/tsx/dist/cli.mjs --test tests/test-safety.test.ts
& $node .test-artifacts/mission5/regressions.cjs
& $node .test-artifacts/mission5/final-controls.cjs
# After verified owned database/process cleanup and PostgreSQL shutdown:
& $node .test-artifacts/mission5/units.cjs
```

The diagnostic redirects replace only the owned runner's child test, after normal database guard/provisioning; they are not canonical rental-suite passes. Driver exit codes are kept separate from child results and blocked experimental prerequisites. Generated fixture sources and all failed attempts remain local/ignored; the canonical tracked test above independently reproduces the application symptom.

## 4. Original mismatch: route, component and rendering evidence

Affected route family: **`/listings/[id]`**. Route-only fixtures use `/listings/1`; canonical workflow errors identify `/listings/2`. Stack: `ListingDetailPage` -> `HeritageSurface` -> `LocaleProvider` -> `HeritageSurfaceContents`.

Expected client root: `div.catalogue.heritage`, en/system/on attributes, followed by the discovery `main`. Encountered node: classless **`<div hidden="">`** containing a Suspense boundary. Saved SSR response bodies already contain that hidden div before the correctly attributed catalogue root. The node is generated by installed `node_modules/next/dist/lib/metadata/metadata.js:93-114` (`MetadataWrapper`, `Suspense name="Next.Metadata"`). Its presence identifies the mismatched node, not why the hydration cursor/update is incorrect.

Relevant application sources: `app/layout.tsx` (static title/description and html/body), **`app/listings/layout.tsx`** (pass-through `return children`, no fallback/markup/authentication), `app/listings/[id]/page.tsx`, `components/heritage/experience.tsx`, `components/i18n/locale.tsx`, `lib/heritage/appearance.ts`, `lib/i18n/server.ts`. Admin/account layouts are not ancestors of this public route. The initial small fixture omitted the listing layout boundary; later exact-state controls include it. No conclusion about its causal role follows merely from its presence.

Initial en/system values agree between response markup and the expected-client error diff. Preference/locale hooks supply server fallbacks. No evidence justifies changing theme/localStorage, timezone, metadata values, markup or SSR behavior. Root-level response/DOM observations do not prove page-wide markup validity. Browser observations use clean managed contexts; standalone controls explicitly disable extensions. Passive observers do not remove/rewrite metadata DOM. The saved server response proves this hidden node is not an extension-inserted node; it does not establish Windows-only behavior.

Unchanged Mission 4 eight-cell control, before the tracked guard repair: **6/8 cells emit the matching hydration error**, collector exit 1, 337.418 s, one diagnostic TAP test FAIL. No navigation/visibility exception in those cells. Artifact `c002bdfb87fdbc38e74c257e`. Counterbalanced orders are A-B-C-D, then D-C-B-A.

| Condition | First pass: errors / seconds | Reverse pass: errors / seconds |
|---|---|---|
| reused_cold | 1 / 26.942 | 1 / 26.835 |
| fresh_cold | 1 / 27.756 | 1 / 27.703 |
| reused_warm | 1 / 12.013 | 1 / 12.224 |
| fresh_warm | 0 / 12.555 | 0 / 12.622 |

`cold` has no earlier SSR GET in that server incarnation; `warm` issues one successful authenticated API-context SSR GET first. It is not a guarantee that every client asset/OS cache is warm. Fresh contexts copy only synthetic storage state; reused contexts retain their existing state after about:blank. Both fresh-cold trials fail, so context reuse is not required. Both reused-warm trials fail, so that pre-request is not a repair.

## 5. Independent experiments and causal limits

### Natural invalidation timing in the application

A six-cell sequence uses observe/defer/defer/observe/observe/defer, fresh contexts with the same synthetic storage state/timezone/viewport, cold routes and separate owned server output. Both arms install the same WebSocket observation. Only the defer arm holds real `serverComponentChanges` received before `aside.heritage-preferences[aria-busy="false"]`; a MutationObserver releases every original payload when that existing React readiness signal changes. No fixed delay, warning filter, DOM readiness override or message discard.

The first implementation failed because tsx-generated `__name` references escaped into the serialized browser function. All six invalid cells and the collector exit 1 are preserved (`hmr_timing.log`, 293.416 s) and excluded from causal comparisons. Corrected instrumentation injects syntax-checked plain JavaScript (`gate-init.js`) under a new label, rather than adding a global shim or suppressing errors.

| Trial | Mode | Natural changes before readiness | Held / delivered | Hydration errors |
|---|---|---:|---|---:|
| 0 | observe | 0 | 0 / 0 | 0 |
| 1 | defer | 1 | 1 / 1 | 0 |
| 2 | defer | 1 | 1 / 1 | 0 |
| 3 | observe | 0 | 0 / 0 | 0 |
| 4 | observe | 1 | 0 / 0 | 1 |
| 5 | defer | 1 | 1 / 1 | 0 |

All three deferred cells actually hold and release one pre-ready invalidation, pending count 0, and emit no page error. The only observation cell exposed to such an invalidation emits the original mismatch; two other observation cells receive no such message and are clean. **Not three exposed observation failures.** Diagnostic collector exits 1, 259.262 s; one of six cells defective, TAP 0/1. Artifact `2c0e108fa53ea6592d24bbda`; raw `hmr_timing_fixed.log`, `timing-fixed/` and Node binding records preserve the exact receive/hold/release offsets.

These are intervention-only diagnostics. No deferral/interception is installed in the application or canonical acceptance suite. Natural event arrival is not fixed across trials, so the one exposed observation failure versus three deferred passes is not complete causal closure. Readiness counters are verified both in-page and against Node binding records across document lifetimes; a new document cannot silently erase an undelivered-message count.

### Standalone Next rendering controls

`minimal/` is an independent project with literal synthetic content, root metadata, an async params/cookies route, a simple client `useSyncExternalStore` wrapper and readiness marker. It imports no Hustlen auth/database/booking/station/style/preference code. Each cell uses its own compiler output; two fixed passes reverse order.

| Standalone condition | Pass 1: page / console errors | Pass 2: page / console errors |
|---|---|---|
| webpack_base | 0 / 1 | 0 / 0 |
| server_only | 0 / 0 | 0 / 0 |
| empty_metadata | 0 / 0 | 0 / 0 |
| blocking_metadata | 0 / 0 | 0 / 0 |
| client_navigation | 0 / 0 | 0 / 0 |
| turbopack_base | 0 / 0 | 0 / 0 |

**0/12 observed hydration errors**, no navigation exceptions. Collector still exits **1**, because the first Webpack baseline logs a missing `/favicon.ico` 404; it is not reported as an entirely clean run. Other eleven cells have no console error. The saved baseline SSR includes the metadata wrapper despite no hydration mismatch, disproving wrapper presence alone as a sufficient cause. No other negative control, lacking a matching positive in this cohort, establishes an application cure or rules out a component interaction. Client-navigation controls assert no new document response after the hydrated Link click; direct controls load the route as a document. The minimal project has no extensions, data formatting, preferences, random render values or application-auth redirects.

The initial fixture's parent readiness marker is not represented as a universal page-hydration contract. Its sources are preserved in `minimal-source-initial/`. Subsequent stimulus controls add a page-specific post-mount marker and a byte-identical copy of the existing public favicon resource, common to both arms. The final route-boundary controls also add the same pass-through listing layout. Do not compare those fixture stages as a single-variable experiment; comparisons are within each cohort.

### Explicit early-invalidation counterfactual

The Next-only network control holds the same page-client chunk after fetching it, waits for HMR sync, and varies **one synthetic `serverComponentChanges` message**. Other real invalidations, if any, are preserved and delivered. Negative/positive/positive/negative order; no arbitrary sleeps. Before release, both layout/page readiness markers are false.

| Early control | Page errors | Observed error | Seconds |
|---|---:|---|---:|
| negative_1 | 0 | None | 12.812 |
| invalidate_2 | 1 | Router action dispatched before initialization | 11.912 |
| invalidate_3 | 1 | Router action dispatched before initialization | 12.492 |
| negative_4 | 0 | None | 11.757 |

Collector exits 1. All four snapshots show layout/page not hydrated; natural invalidations received = 0, queued messages = 0. Thus the synthetic message, rather than an uncontrolled real update, is the changed input. This control establishes the pre-initialization behavior only. It does not independently prove the natural server sent a message at this earliest state or explain the metadata mismatch.

Installed `client/dev/hot-reloader/app/hot-reloader-app.js` handles the message by calling `publicAppRouterInstance.hmrRefresh()`. `client/components/sequential-router-queue.js:66-70` throws the observed router-initialization error when `getCurrentAppRouterState()` is null. This confirms an unsafe framework/runtime timing case under the explicit stimulus, **not the root cause of the distinct metadata mismatch**.

A follow-up attempted to wait for the parent-layout effect before releasing the withheld chunk. That prerequisite was unreachable: all four controls hit the original navigation budget, with no synthetic invalidation delivered. Collector FAIL/exit 1, experimental conclusion **BLOCKED**, not four clean negative application trials. That follow-up reused the preceding per-cell output; no cache inference is drawn from its blocked results.

### Matching causal reproduction after router initialization

**Final four-cell control: negative, invalidate, invalidate, negative.** Source `stimulus-router-checked.cjs`, raw `stimulus-router-checked-results.ndjson`, screenshots/SSR/DOM/HMR logs under `stimulus-router-checked/`. The independent fixture includes the real route family's pass-through layout, literal metadata/content, a client boundary with valid server/client snapshots, and the public favicon. It imports no Hustlen application logic.

After HMR sync and fetching the held page chunk, a zero-module Webpack runtime callback obtains the already loaded framework state getter. The control asserts **exactly one** `getCurrentAppRouterState` module and waits for a non-null state. It serializes only readiness booleans, not router data. Both arms use the identical inspection and HTTP/WebSocket routing. Only the positive arm sends one `serverComponentChanges` message and waits for this pinned client's reload acknowledgement before releasing the page chunk. Actual server notifications would be drained after page mount; none arrive in this cohort.

| Trial | Router initialized / module count | Page and layout mounted before release | Added invalidation | Matching hydration page errors / console errors | Seconds |
|---|---|---|---:|---|---:|
| negative_1 | true / 1 | false / false | 0 | 0 / 0 | 17.602 |
| invalidate_2 | true / 1 | false / false | 1 | 1 / 1 | 12.319 |
| invalidate_3 | true / 1 | false / false | 1 | 1 / 1 | 13.469 |
| negative_4 | true / 1 | false / false | 0 | 0 / 0 | 12.211 |

**2/2 positives reproduce the same classless hidden div/Suspense versus client Surface/main mismatch and the same pre-mount state-update warning. Both paired negatives are clean.** Every cell intercepts one page chunk, reaches all readiness/visibility assertions, has no navigation exception, receives zero natural invalidations and leaves zero queued messages. Collector exits **1**, wall **56.970 s**; positive failures are preserved, not relabelled as product acceptance passes.

This identifies a tested framework/runtime hydration race: an RSC refresh is dispatched while initial client-page hydration is incomplete, despite router state already existing. It is consistent with the application's natural pre-mount update and error, and reproduces the matching node diff without application code. It does not identify the exact internal cursor/scheduling correction, prove every original failure shares the trigger, or establish Linux behavior. The wrapper is the node encountered, not a demonstrated malformed application root.

Screenshot `stimulus-router-checked/invalidate_2/stimulus-0-0.png` was inspected: literal content is visible after recovery while Next reports two issues. Visibility after React recovery is precisely why it must not count as clean hydration. Initial body snapshots and unmodified SSR contain the valid hidden-wrapper/catalogue siblings.

Fresh `.next-router-checked-<n>` output is used per cell. HTTP interception also affects cache/timing equally in both arms; these are constructed ordering controls, not fleet failure-rate estimates. The private module getter/ACK synchronization is version-specific diagnostic observation. A future fix that queues the complete message may delay ACK: adapt the observer to confirm independent receipt and eventual drain rather than turning an ACK timeout into a product-failure claim.

### Findings by classification

- **Application defect:** no specific application rendering defect demonstrated or repaired; the application-facing hydration symptom remains blocking.
- **Framework/runtime:** explicit pre-initialization dispatch error reproduced without Hustlen code. Matching metadata-hydration ownership remains confirmed for the tested early-invalidation ordering in a matching framework-only reproduction; the exact internal correction and applicability to every natural failure remain unresolved.
- **Test harness:** confirmed missing hydration acceptance assertion, repaired below. The independent serialization mistake was corrected only in ignored diagnostic code; it is not an application fix.
- **Environment:** Windows reproduction confirmed; Linux/physical-device evidence unavailable. No evidence establishes that the defect is Windows-exclusive.
- **Unresolved:** the internal framework correction and applicability to every natural occurrence, the stranded RSC request, historical Turbopack version divergence and the newly reproduced pre-marker Zod timeout.

Rejected overclaims: metadata-wrapper presence alone is sufficient; retained browser contexts are necessary; a successful SSR pre-request is a reliable cure; removing metadata or suppressing hydration warnings is justified; all HMR failures have one cache cause. No such repair was made.

## 6. Targeted repair and regression coverage

- **`tests/support/browser-diagnostics.ts`:** retain known hydration errors from existing pageerror/console hooks (development mismatch, attribute-only hydration warning, React #418); preserve raw diagnostics; expose sticky `assertNoHydrationErrors()`. Capture remains bounded and synthetic-only. This is a hydration-specific guard, not a replacement for every runtime-error gate.
- **`tests/rental-browser.test.ts`:** call the guard after the existing workflow assertions and before finally-based cleanup. No retries, sleeps, assertions, auth gates, booking behavior, QR validation or deadlines were removed/relaxed. A recovered UI tree can no longer make the command silently pass after a recorded mismatch.
- **`tests/test-safety.test.ts`:** regression covers the real failure signatures, expected synthetic recovery diagnostics remaining visible, repeated/sticky rejection, and retained raw error evidence. Focused suite **11/11 PASS**, exit 0, Node duration 2.055 s. The new unit case changes full-unit inventory from 222 to 223.
- **This audit:** new report only; prior reports unchanged. No application/configuration/schema/dependency file changed.

**Before/after reporting:** Mission 4's unchanged canonical Webpack command returned exit 0 with 7/7 tests despite a hydration page error. Mission 5's unchanged route-only reproduction had 6/8 defective cells. After the new guard, two canonical Webpack commands return exit 1 and retain the mismatch. This is an acceptance-reporting improvement, not improved rendering stability or a lower defect-rate claim.

First post-repair Webpack: **6/7**, six child workflows pass, parent fails the new guard. Second: **4/7**, first workflow hits the unchanged 30-second unfinished `/bookings/1` RSC deadline at `tests/rental-browser.test.ts:379`; the following review loop was never reached, explaining the next case's expected-two/actual-zero review assertion. The parent also rejects hydration. Do not label that cascade a new review persistence defect or attribute it to the final guard. RSC terminal-event behavior remains unresolved and its failure is not waived.

## 7. Complete verification matrix

| Command / sample | Result | Wall seconds | Exit | Evidence |
|---|---|---:|---:|---|
| `npm run test:rental-browser` (Webpack 1) | FAIL 6/7 | 339.489 | 1 | `rental_webpack_1.log` |
| `npm run test:rental-browser` (Webpack 2) | FAIL 4/7 | 328.233 | 1 | `rental_webpack_2.log` |
| `npm run test:rental-browser` (Turbopack) | PASS 7/7 | 222.219 | 0 | `rental_turbo.log` |
| `npm run test:meetup` | PASS 16/16 | 483.080 | 0 | `meetup.log` |
| `npm run test:rental-api` | PASS 20/20 | 72.009 | 0 | `rental_api.log` |
| `npm run test:authorization` | PASS 8/8 | 67.462 | 0 | `authorization.log` |
| `npm run test:camera-reader` | PASS 1/1 | 7.550 | 0 | `qr_reader.log` |
| `npm run test:postgres-utc` | PASS 1/1 | 4.806 | 0 | `utc.log` |
| `npm run test:baseline` | PASS | 47.572 | 0 | `baseline.log` |
| `npm run typecheck` | PASS | 33.354 | 0 | `typecheck.log` |
| `npm run lint` | PASS | 192.608 | 0 | `lint.log` |
| `npm run build:verify` | PASS | 40.514 | 0 | `build.log` |
| `npm run test:meetup-camera -- --camera-production` | PASS 2/2 | 57.170 | 0 | `camera_production.log` |

The main matrix collector exits 1, retaining both Webpack failures while completing every scheduled job. All TAP samples have zero skip/cancel. Database baseline output:

- `BASELINE_REPEATABILITY_PASS: 33 migrations; all 76 public tables unchanged.`
- `BASELINE_FAILURE_CLEANUP_PASS: failed child database/upload removed; parent database/upload preserved.`

Production-mode public-listing comparison, artifact `a714b5fa2e7bee5a08a59a10`: copied fixture creates synthetic actors/listing on its own dev server/database, stops it, then `next start` serves the existing verified production build on the same loopback test origin with all production guards intact. No production resource is used.

- retained_production: 1.889 s, 0 page errors
- fresh_production: 1.491 s, 0 page errors

Both probes PASS, diagnostic TAP 1/1, exit 0, outer 60.677 s. Captured production listing trace has 0 page errors and 0 console error/warning events. This is finite comparison evidence, not production-wide or real-device certification.

Quiet full-unit verification (`npm run test:unit`), after owned DBs/runtimes were verified absent and PostgreSQL stopped. DATABASE_URL remains an owned loopback target so dotenv cannot select a shared database; no database is available or needed for these unit tests. No extra preloads or mission process samplers.

| Sample | Result | Seconds | Exit |
|---|---|---:|---:|
| unit_after_1 | FAIL 222/223 | 35.107 | 1 |
| unit_after_2 | PASS 223/223 | 26.305 | 0 |
| unit_after_3 | PASS 223/223 | 23.221 | 0 |

**2/3 full suites PASS; one FAIL remains.** The failing case is the unchanged Zod guard: wall **3,011.6881 ms**, ETIMEDOUT/SIGTERM, phases **empty**, `tests/dependency-security.test.ts:64`. This reproduces the pre-marker startup issue anew; it is not merely historical. The marker precedes schema/parse work, so the evidence does not establish a slow parser or locate the startup/module/scheduling cause. No 3-second/64-MB limit or assertion changed. The new hydration-gate unit case passes, including in that otherwise failing full suite. Later passes do not erase the failed security gate.

All emitted failures, including intermittent functional failures and invalid diagnostic attempts, remain preserved. No standalone Prisma validate/status invocation is claimed; existing isolated runs exercise migration provisioning, UTC and repeatability/cleanup checks. No dependency advisory or major-upgrade closure is claimed.

Recorded ordinary Turbopack rental/meetup traces contain 0 hash-mismatch instructions. This does not close the historical Turbopack version-divergence trigger. The confirmed Webpack early-invalidation/hydration ordering is not automatically the same failure. Expected synthetic abort/503/temporarily unavailable Booking-table console diagnostics are retained; the new gate does not suppress any console output. Ordinary Turbopack has zero page errors and seven console error/warning events from these fault injections. Meetup has zero page errors and one connection-reset console event: `tests/meetup.integration.test.ts:2032` deliberately aborts the fetched verify response for the manual-code response-loss recovery case. Neither passing suite is described as having an entirely empty console.

**BLOCKED / NOT EXECUTED:** Linux canonical/matrix workflows. Fresh `wsl --list --quiet` exits 0 with no distro; `docker info --format '{{.OSType}}'` exits 1, Linux-engine pipe unavailable. No hosted workflow dispatched. **BLOCKED / NOT EXECUTED:** physical-camera, mobile Safari and secure-device acceptance. Headless mobile viewports and synthetic prerecorded-camera checks are not physical-device evidence. No firewall change, public exposure, tunnel or deployment.

## 8. Preservation, security and final state

No change to rental/custody/financial policy, eligibility/session/authorization semantics, QR/challenge/geofence/consent, development-only identity/AI/Vision restrictions, database URL/marker safety or production behavior. The existing Zod 3,000-ms process deadline and 64-MB V8 old-space limit remain unchanged. Security test results are finite executed samples, not universal proof.

All **17** frozen source/configuration inputs match the tested post-repair cohort (`frozen.json`, `summary.json`). The reviewed Git diff changes only the three test files above plus this new report; app/lib/schema/dependency/configuration paths and prior reports remain unchanged. Controlled fixture source versions and failed scripts/logs remain under ignored mission artifacts; no runtime interception is committed.

- All **14** owned-run manifests have `preserved: false`: 9 PASS commands, 5 FAIL commands. Standalone Next-only controls do not provision databases.
- SQL returned **0** databases matching `hustlen_test_%` on the owned cluster before shutdown. Recorded-upload files: **0**.
- Verified postmaster PID **63556**, exact owned data path, port **56480**, listen address **127.0.0.1** before `pg_ctl -D <verified-owned-data> -m fast -w stop`; exit 0, PID file absent. No shared service stopped.
- After tests, **0 pinned mission Node / managed Chromium processes**; original main and partner worktrees remain clean at `f856dc360b332007dd79725ddee0d28102411521`. No reset/clean, push, merge, deployment, branch deletion or feature agent.
- Repair commit contains only the reviewed three-file change; this report is a documentation-only follow-up. Final exact audit SHA and clean status are returned in the handoff; no post-commit test execution is implied.

## 9. Remaining blockers and Mission 6 / closure recommendation

1. **High / blocking:** canonical Webpack hydration remains reproducible; the guard now exposes it correctly. No production rendering workaround is justified by these samples. The matching standalone reproduction below now exists; use it to validate a narrowly scoped framework dispatch/hydration-ordering correction before any rendering workaround.
2. **Medium / blocking test-runtime uncertainty:** unfinished RSC request prevents navigation settling and causes dependent review assertions. Capture request ownership/terminal events; do not ignore pending streams, broadly retry, or replace the readiness contract with a sleep.
3. **Open infrastructure:** Turbopack HMR divergence is not causally closed, and the pre-marker Zod timeout recurred in this mission. Retain compiler ownership/cleanup and the existing security budget; successful samples do not erase historical failures.
4. **Mandatory evidence:** Linux canonical/matrix workflow and physical-device/mobile Safari/secure-camera acceptance remain open. No complete stabilization or parallel-feature approval follows.

Safe disposition: keep the stronger gate and isolation protections; retain Webpack failures. Use passing Turbopack/production-mode checks only as comparisons, not substitutes for failed/missing gates. Do not remove metadata, turn off SSR/HMR, discard messages, install an app-level interception shim or suppress warnings. Consider a narrowly scoped framework patch/release candidate only after matching evidence and full regression review; no dependency change is approved as a proven fix by this report.

Proposed **Mission 6**: review the tested framework-only reproduction, locate the earliest safe hydration/commit boundary for RSC refresh, and validate a candidate correction that preserves and eventually delivers every notification. Cover both pre-initialization and initialized-but-unmounted states: a null-queue check alone is insufficient for the matching case. Confirm real content updates after mount so an apparent fix cannot simply disable HMR. Do not apply the diagnostic WebSocket interception as an app fix. Compare candidate and baseline with the same controlled ordering and canonical cold Webpack runs; retain all failures and rerun rental/auth/QR/camera/build gates. Separately capture the newly reproduced startup timeout before its first marker under the unchanged security budget, and trace stranded RSC request terminal events. Run Linux acceptance at the reviewed repair SHA on an available supported runner with isolated databases, then owner-approved real-device HTTPS/camera/mobile Safari tests through the existing acceptance plan. Do not expose a server or deploy a tunnel without separate authorization. Any repair affecting shared authentication, financial or rental semantics requires owner review before implementation.

## Appendix - portable, database-free matching reproduction

The following is the final fixture setup and **verbatim executed driver**, so a Git-only reviewer can recreate the experiment without private artifacts or application data. Prerequisites: repository locked dependencies, supported Node and Playwright Chromium installed. No install or platform acceptance is implied by these instructions. Use a fresh ignored evidence base; exclusive creation intentionally refuses to overwrite existing evidence. The fixture reuses only the public favicon bytes. The driver reuses passive repository test observation/navigation helpers; no Hustlen application module is loaded by the fixture.

Create the ignored `.test-artifacts/mission5/` directory first. Save the setup block as `.test-artifacts/mission5/setup-final.cjs`, run `node .test-artifacts/mission5/setup-final.cjs` once with Node 24.19.0 in a fresh reproduction workspace, then save the driver block as `.test-artifacts/mission5/stimulus-router-checked.cjs`. Do not execute setup over this mission's preserved files. Both arms share the held client chunk and runtime inspection; positives add exactly one dev invalidation. The known failing version returns exit 1 with two matching positive failures, not a green acceptance result.

```js
// Run from the repository root with existing pinned dependencies.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve('.test-artifacts/mission5/minimal');
const files={
  "package.json": "{\"private\":true,\"dependencies\":{\"next\":\"16.4.3\",\"react\":\"19.2.8\",\"react-dom\":\"19.2.8\"}}",
  ".gitignore": ".next-*/\nnode_modules/\n",
  "next.config.js": "const path=require('node:path');module.exports={distDir:process.env.PROBE_DIST||'.next-base',turbopack:{root:path.resolve(__dirname,'../../..')},...(process.env.PROBE_BLOCK_METADATA==='1'?{htmlLimitedBots:/.*/}:{})};\n",
  "app/layout.jsx": "import Ready from './ready';export const metadata=process.env.PROBE_METADATA==='empty'?{}:{title:'Synthetic metadata probe',description:'No customer data'};export default function Root({children}){return <html lang=\"en\"><body>{children}<Ready/></body></html>;}\n",
  "app/ready.jsx": "'use client';import{useEffect}from'react';export default function Ready(){useEffect(()=>{window.__m5Hydrated=true;},[]);return null;}\n",
  "app/surface.jsx": "'use client';import{useEffect,useSyncExternalStore}from'react';const subscribe=()=>()=>{};export default function Surface({children}){useEffect(()=>{window.__m5SurfaceHydrated=true;},[]);const ready=useSyncExternalStore(subscribe,()=>true,()=>false);return <div className=\"catalogue heritage\" lang=\"en\" data-theme=\"system\" data-ready={ready}>{children}</div>;}\n",
  "app/page.jsx": "import Link from'next/link';export default function Home(){return <main><h1>Synthetic home</h1><Link prefetch={false} href=\"/listings/1\">Open fixture</Link></main>;}\n",
  "app/health/route.js": "export function GET(){return Response.json({ok:true});}\n",
  "app/listings/layout.jsx": "export default function ListingsLayout({children}){return children;}\n",
  "app/listings/[id]/page.jsx": "import{cookies}from'next/headers';import Surface from'../../surface';export default async function Page({params}){const{id}=await params;await cookies();const content=<main><h1>Fixture {id}</h1><p>Stable literal</p></main>;return process.env.PROBE_SERVER_ONLY==='1'?<div className=\"catalogue heritage\" lang=\"en\" data-theme=\"system\">{content}</div>:<Surface>{content}</Surface>;}\n"
};
for(const[file,contents]of Object.entries(files)){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents,{flag:'wx'});}
fs.copyFileSync('app/favicon.ico',path.join(root,'app/favicon.ico'),fs.constants.COPYFILE_EXCL);
```

```js
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{once}=require('node:events'),{chromium,expect}=require('@playwright/test'),{developmentNavigation}=require('../../tests/support/dev-navigation.ts'),{browserDiagnostics}=require('../../tests/support/browser-diagnostics.ts');
const root=process.cwd(),base=path.resolve('.test-artifacts/mission5'),project=path.join(base,'minimal');const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
async function main(){const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));const origin='http://127.0.0.1:'+port,browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-extensions']});let serial=0;const results=[];try{for(const mode of ['negative','invalidate','invalidate','negative']){const label=mode+'_'+(++serial),artifact=path.join(base,'stimulus-router-checked',label);fs.mkdirSync(artifact,{recursive:true});const record=event=>fs.appendFileSync(path.join(artifact,'events.ndjson'),JSON.stringify({utc:new Date().toISOString(),...event})+'\n');const fd=fs.openSync(path.join(artifact,'server.log'),'wx'),env={...process.env,PROBE_DIST:'.next-router-checked-'+serial,PROBE_SERVER_ONLY:'0',PROBE_METADATA:'static',PROBE_BLOCK_METADATA:'0'};delete env.NODE_OPTIONS;delete env.DATABASE_URL;delete env.TEST_DATABASE_URL;delete env.MRT_TEST_DATABASE_URL;const startedUtc=new Date().toISOString(),start=Date.now(),server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:project,env,stdio:['ignore',fd,fd],windowsHide:true}),context=await browser.newContext({timezoneId:'America/Los_Angeles',viewport:{width:390,height:844}});const nav=developmentNavigation(),diag=browserDiagnostics(artifact,'stimulus');nav.observeContext(context);diag.observeContext(context);let clientSocket,hydrated=false,queued=[],naturalReceived=0,naturalReleased=0;const sync=deferred(),chunk=deferred(),release=deferred(),ack=deferred();let intercepted=0;
await context.routeWebSocket(url=>url.pathname.includes('/_next/hmr'),ws=>{clientSocket=ws;const upstream=ws.connectToServer();ws.onMessage(message=>{let m;try{m=JSON.parse(String(message));}catch{}if(m?.event==='server-component-reload-page'){record({kind:'reload-ack'});ack.resolve();}upstream.send(message);});upstream.onMessage(message=>{let m;try{m=JSON.parse(String(message));}catch{}if(m?.type==='serverComponentChanges'){naturalReceived++;if(!hydrated){queued.push(message);record({kind:'natural-invalidation-held'});return;}naturalReleased++;}ws.send(message);if(m?.type==='sync'){record({kind:'sync'});sync.resolve();}});});
await context.route(url=>url.pathname.includes('/chunks/app/listings/')&&url.pathname.endsWith('/page.js'),async route=>{intercepted++;try{const response=await route.fetch();record({kind:'page-chunk-fetched',status:response.status()});chunk.resolve();await release.promise;await route.fulfill({response});record({kind:'page-chunk-delivered'});}catch(error){record({kind:'chunk-error',error:String(error)});}});
const page=await context.newPage(),errors=[],consoleErrors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});const bodies=[];page.on('response',response=>{if(response.request().isNavigationRequest())bodies.push(response.body().then(body=>fs.writeFileSync(path.join(artifact,'ssr.html'),body)).catch(error=>record({kind:'body-error',error:String(error)})));});let failure,snapshot;
try{await expect.poll(async()=>{if(server.exitCode!==null)throw Error('Owned server exited');try{return(await fetch(origin+'/health',{signal:AbortSignal.timeout(2000)})).status;}catch{return 0;}},{timeout:30000}).toBe(200);const signal=AbortSignal.timeout(30000),wait=promise=>Promise.race([promise,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Control event unavailable within original navigation budget')),{once:true}))]);const navigating=page.goto(origin+'/listings/1');navigating.catch(()=>{});await wait(Promise.all([sync.promise,chunk.promise]));await page.evaluate("window.webpackChunk_N_E.push([['m5_state_probe'],{},function(r){var hits=Object.values(r.c||{}).filter(function(m){return m.exports&&typeof m.exports.getCurrentAppRouterState==='function';});var found=hits[0];window.__m5RouterModuleCount=hits.length;window.__m5RouterInitialized=function(){return !!found&&found.exports.getCurrentAppRouterState()!==null;};}]);");assert.equal(await page.evaluate('window.__m5RouterModuleCount'),1,'Observe exactly one router-state singleton');await wait(page.waitForFunction('window.__m5RouterInitialized()'));if(mode==='invalidate'){record({kind:'synthetic-invalidation-sent'});clientSocket.send(JSON.stringify({type:'serverComponentChanges'}));await wait(ack.promise);}snapshot=await page.evaluate(()=>({routerInitialized:window.__m5RouterInitialized(),routerModuleCount:window.__m5RouterModuleCount,surfaceHydrated:window.__m5SurfaceHydrated===true,rootReady:window.__m5Hydrated===true,body:[...document.body.children].slice(0,3).map(e=>e.outerHTML.slice(0,900))}));record({kind:'before-chunk-release',...snapshot});assert.equal(snapshot.surfaceHydrated,false,'The page component must still be unhydrated');release.resolve();await navigating;await page.waitForFunction(()=>window.__m5SurfaceHydrated===true);hydrated=true;for(const message of queued){clientSocket.send(message);naturalReleased++;}queued=[];await nav.settle(page);await expect(page.locator('.catalogue.heritage')).toBeVisible();await diag.checkpoint();assert.equal(naturalReleased,naturalReceived,'Every real invalidation must be delivered');}catch(e){failure=String(e);release.resolve();await diag.checkpoint();}finally{await Promise.allSettled(bodies);await context.close();if(server.exitCode===null&&server.signalCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}fs.closeSync(fd);}const result={label,mode,startedUtc,endedUtc:new Date().toISOString(),seconds:(Date.now()-start)/1000,intercepted,naturalReceived,naturalReleased,pending:queued.length,errors,consoleErrors,failure,snapshot};results.push(result);fs.appendFileSync(path.join(base,'stimulus-router-checked-results.ndjson'),JSON.stringify(result)+'\n');console.log(JSON.stringify({label,seconds:result.seconds,intercepted,errors:errors.length,consoleErrors:consoleErrors.length,failure}));}}finally{await browser.close();}if(results.some(r=>r.failure||r.errors.length||r.consoleErrors.length))process.exitCode=1;}
main().catch(error=>{console.error(error);process.exitCode=1;});
```

Example invocation after creating those files (choose the documented Node executable on your platform):

```powershell
$env:CHROMIUM_PATH=(& $node -e "console.log(require('@playwright/test').chromium.executablePath())")
$env:NEXT_TELEMETRY_DISABLED='1'
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
& $node node_modules/tsx/dist/cli.mjs .test-artifacts/mission5/stimulus-router-checked.cjs
```

This driver uses a free loopback port, no database, fresh per-cell compiler output, full error retention and finally-based owned-browser/server cleanup. It is a version-specific causal diagnostic, not production certification or a replacement for the canonical rental suite.

**FINAL VERDICT: BLOCKED**

**SAFE TO BEGIN PARALLEL DEVELOPMENT: NO**
