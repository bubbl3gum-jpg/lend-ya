# Remaining acceptance execution plan

Date: 2026-11-05. Source baseline: `2c8e835a4ae95285621b89f08b764bc934b83f41`. Recommendation: **CONDITIONAL**. All execution below is proposed and **NOT RUN in this planning mission**, except explicitly identified read-only checks/probe. No workflow dispatch, push, deployment, service startup, migration or device connection was performed. Companion [readiness](PARALLEL_DEVELOPMENT_READINESS.md) and [matrix](FEATURE_DEPENDENCY_MATRIX.md) define ownership and integration gates.

## Execution register and blocker classification

| ID | Owner / environment | Verified state now | Required completion evidence |
|---|---|---|---|
| E1 | Acceptance integrator: CI harness | Confirmed database-name mismatch in prepared closure workflow; infrastructure defect | Forward repair on separately authorized acceptance branch, pure URL-policy validation for every generated label, source review, then actual runs. No guard relaxation. |
| E2 | Acceptance integrator: Ubuntu 24.04, Node 24.19.0, PostgreSQL 17 | Linux suites NOT RUN. WSL currently lists no distro; Docker Linux engine unavailable | Canonical `.github/workflows/verify.yml` PASS plus `.github/workflows/browser-acceptance.yml` Webpack/Turbopack matrix PASS at exact reviewed SHA with complete artifacts. |
| E3 | Windows acceptance owner: Turbopack development | Final repaired profile NOT RUN; previous symptoms not automatically current product defects | Full sequential final-source run, repeat complete rental and meetup suites twice with different fresh DBs; exact bundler/server command, response and hydration evidence. Owner must explicitly exclude unsupported profile if it remains broken. |
| E4 | Device QA + owner | Physical cameras, Safari/Firefox and visual acceptance NOT RUN | Approved device/browser matrix, secure-origin/fixture preflight, manual scenario evidence and consent/cleanup. Synthetic camera is separate. |
| E5 | Data/security owner | Runtime UTC repair has historical regression evidence; real-data provenance UNKNOWN | Read-only historical-data audit plan approved before any real-data access/cutover; classify naive timestamp provenance. No blanket eight-hour rewrite. |
| E6 | Tooling/security owner | Closure report historical 8 moderate dev advisory entries, zero production; not refreshed here | Fresh full/prod npm audit evidence, reachability/compatibility disposition, separately authorized dependency repair with lockfile and regression review. No force-fix/major framework downgrade. |
| E7 | Product owner | Environment/feature contracts and visual scope not accepted by this mission | Signed supported-environment and workstream decision; no feature launch/main merge implied. |

Known application/harness fixes with prior PASS evidence: review SSR hydration, bounded QR sampling, stale previous-document RSC observer state, UTC session assumptions, unsafe linked-file rejection and fixture cleanup. No newly reproduced application defect in this mission. Platform execution may uncover one; classify with logs before proposing a fix. The remaining CI name bug is a newly confirmed infrastructure defect.

## E1: repair prerequisite before Linux dispatch

`.github/workflows/browser-acceptance.yml` currently uses `label="${suite//:/_}"`. Thus `test:rental-browser` becomes `test_rental-browser`, yielding a rejected database name. `lib/disposable-database-url.ts` requires `^hustlen_test_[a-z0-9_]+$`, maximum PostgreSQL identifier length, local host and no connection overrides. Local pure validation with the preserved Node 24.19.0 executable returned:

```text
test_login-readiness: REJECT
test_rental-api: REJECT
test_rental-browser: REJECT
test_rental_browser: ACCEPT
```

This actually executed the imported URL validator with an empty explicit environment, without connecting to PostgreSQL. Native Node emitted a module-format warning; it is not a reason to change package type. Full workflow execution remains NOT RUN. The previous closure report's description of the prepared workflow is superseded by this newly checked defect.

Proposed future repair: normalize both colons and hyphens, validate all generated labels through the existing policy, retain strict guard/ownership semantics, and add a focused label-generation check. Review adding explicit `test:camera-reader` execution to the closure matrix; it is absent there today. Preserve the separate production-camera step. Improve canonical verification artifact collection as needed: `verify.yml` still lists `/tmp/lend-ya-*.log` while actual owned logs/NDJSON/HTML may be under `.test-artifacts/`. Require the real logs, not merely screenshots/JSON. These are planned acceptance repairs, **not applied in this docs-only commit**.

## Shared prerequisites and resource isolation

- Use a fresh acceptance worktree at the approved full SHA, following the readiness plan. Record OS/version, `git rev-parse HEAD`, `git status`, `node --version` (must match `.node-version`, currently 24.19.0), npm version, lockfile SHA, Prisma/Next/Playwright versions and actual Chromium executable/revision.
- `npm ci`, `npm run db:generate`; Prisma validation with `node node_modules/prisma/build/index.js validate --config prisma7.config.ts`. Capture exit statuses. No major upgrade or installed-source patch. Each worktree has its own dependency tree/client/output/cache.
- Designated local PostgreSQL 17 only, service health checked, unique unused lowercase underscore-only `hustlen_test_*` name per suite/run. Set `DATABASE_URL` to the test service's maintenance `postgres` DB and `MRT_TEST_DATABASE_URL` to the new per-run DB; never pass shared application credentials. Runner creates, marks, validates and cleans its own DB. Do not precreate/adopt fixture DBs or reset anything. Existing PG override/connection-target checks remain authoritative.
- FFmpeg and ffprobe must actually execute successfully; record binary paths/versions. Do not accidentally select an unrelated bundled executable. Install Playwright-managed Chromium/prerequisites and set both `CHROMIUM_PATH` and `MRT_BROWSER_PATH` from `chromium.executablePath()`.
- Explicit bundler: `MRT_TEST_BUNDLER=webpack` or `turbopack`. Record actual server command; a production build is not a dev profile. Preserve all development-only gates and one server worker for process-local temporary location. Never share run IDs/allowlists across test DBs.
- One Next/browser/build runner per worktree; serialize heavy checks per host. Per-run output directories do not isolate root `next-env.d.ts`. Keep unit-file concurrency 1 and original Zod 3-second/64-MB/input caps. Do not change QR/session/inspection expiry or assertions for a slow host.
- Every result records command, exit code, full SHA, start/end time, bundler, DB/run ID, logs/screenshots/NDJSON, counts/skips/cancellations and cleanup outcome. Failed attempts remain FAIL; infrastructure-preflight failures are BLOCKED, and unexecuted remainder is NOT RUN. Expected negative fixture errors are classified separately from unexpected console/page errors.

## E2: Linux execution (after explicit authorization)

Preferred supported target: existing Ubuntu 24.04 CI runners with fresh PostgreSQL 17 service, pinned Node and managed Chromium. No WSL distribution is assumed. Run both corrected closure matrix jobs and the broad canonical workflow; the narrower matrix alone does not cover all Admin/migration/MVP tests. Record hosted run URL, job IDs, exact checkout SHA, artifact references and job exit states. Do not infer success from dispatch or YAML parsing. Any publication/dispatch requires later authorization; none here.

For an approved equivalent isolated local Linux host, use the same prerequisites and commands. Example **NOT EXECUTED**:

```bash
# On a designated disposable-test host only; Node already pinned and postgres ready.
export DATABASE_URL='postgresql://postgres@127.0.0.1:55433/postgres'
npm ci
npm run db:generate
node node_modules/prisma/build/index.js validate --config prisma7.config.ts
# Provision ffmpeg/ffprobe and browser system prerequisites first.
npx playwright install --with-deps chromium
export MRT_BROWSER_PATH="$(node -e 'console.log(require("@playwright/test").chromium.executablePath())')"
export CHROMIUM_PATH="$MRT_BROWSER_PATH"
export DATABASE_URL='postgresql://postgres@127.0.0.1:55433/postgres'
export MRT_TEST_BUNDLER=turbopack  # Separate full pass also uses webpack.
export NEXT_TELEMETRY_DISABLED=1
nonce=$(date -u +%Y%m%d%H%M%S)
mkdir -p ".test-artifacts/acceptance/$nonce/$MRT_TEST_BUNDLER"
# Use every suite in the ordered register below, not a filtered subset.
for suite in test:unit test:authorization test:login-readiness test:rental-api test:rental-browser test:meetup test:chat; do
  label="${suite//:/_}"; label="${label//-/_}"
  export MRT_TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:55433/hustlen_test_${nonce}_${label}"
  log=".test-artifacts/acceptance/$nonce/$MRT_TEST_BUNDLER/$label.log"
  if npm run "$suite" >"$log" 2>&1; then
    printf '%s PASS\n' "$suite"
  else
    code=$?; printf '%s FAIL exit=%s\n' "$suite" "$code"; exit "$code"
  fi
 done
```

The example core loop is not the complete acceptance register. Finish the broader register below and retain the exit/status ledger, including NOT RUN entries after any failure. Use new nonces/names when repeating. Trust authentication in a fresh isolated CI Postgres service is a test fixture, not a production configuration recommendation.

## E3: Windows Turbopack execution

Use a separate clean Windows acceptance worktree, pinned Node, approved owned PostgreSQL service, actual FFmpeg/ffprobe and managed Chromium. `wsl --list --quiet` and `docker info` checks in this mission confirm no immediately available Linux execution; do not make Windows validation contingent on installing WSL.

PowerShell preparation **NOT EXECUTED** (replace the maintenance role/port only with the approved local test service; no production credentials):

```powershell
# Prepend the verified Node 24.19.0 and media directories to this process PATH.
$env:DATABASE_URL = 'postgresql://postgres@127.0.0.1:55433/postgres'
node --version
npm ci
npm run db:generate
$env:MRT_BROWSER_PATH = node -e "console.log(require('@playwright/test').chromium.executablePath())"
$env:CHROMIUM_PATH = $env:MRT_BROWSER_PATH
$env:DATABASE_URL = 'postgresql://postgres@127.0.0.1:55433/postgres'
$env:MRT_TEST_BUNDLER = 'turbopack'
$env:NEXT_TELEMETRY_DISABLED = '1'
$nonce = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss')
$suite = 'test:rental-browser' # Repeat for every registered suite; distinct DB each time.
$label = $suite.Replace(':','_').Replace('-','_').ToLowerInvariant()
$env:MRT_TEST_DATABASE_URL = "postgresql://postgres@127.0.0.1:55433/hustlen_test_${nonce}_${label}"
npm run $suite
if ($LASTEXITCODE -ne 0) { throw "Acceptance failed: $suite" }
```

Capture stdout/stderr to the owned log directory, retain `$LASTEXITCODE` immediately, and record it before any other native command. Ensure NODE_OPTIONS contains no test filter and no suite silently skips cases. Do not edit assertions between the two repeatability invocations. A failure stops acceptance; isolate whether compile/readiness, abandoned RSC, fixture contamination, session/redirect, decoder pixels or actual application state caused it. Keep screenshots and browser console/pageerror/request traces. Repaired assertions must test actual UI/API/DB behavior, not direct DB status substitution or navigation retries.

## Ordered suite register and success gate

Run sequentially on each approved target; any omission is NOT RUN. Use a different fresh owned DB for each runner even when an earlier runner normally cleans it. Compare required registration/counts with the accepted source; new feature tests may increase counts but unexplained skipped/cancelled cases cannot count as PASS.

1. Clean install/generation, Prisma validate, `typecheck`, `lint`, `test:unit`.
2. `test:postgres-utc`, `test:baseline`, `test:migration`, `test:admin-migration`, `test:meetup-migration` (empty schema/history/idempotency/owned cleanup checks).
3. `test:authorization`, `test:stability`, `test:login-readiness` (actual expiry, roles, Origin, session/hydration).
4. `test:rental-api`, `test:integration`, `test:rental-browser` (quote/idempotency/reservation, listing media/mobile, custody/return/inspection/reviews, privacy, restart/history/error recovery).
5. `test:camera-reader`, `test:meetup`, `test:chat` (real QR pixels, bilateral consent/geofence/receipt, expiry/replay, camera negatives/cleanup, reviewer/privacy and restart).
6. `test:admin`, `test:moderation`, `test:mvp` (critical control-center/security regressions affected by auth/shared UI).
7. `npm run test:meetup-camera -- --camera-production` with its own new DB: distinct optimized test build/start comparison, never a deployment and never a replacement for step 5.
8. `build:verify`, final `typecheck` and `lint` on the exact tested tip. No simultaneous build/dev run. Repeat complete rental-browser and meetup twice after any navigation/harness repair (fresh DBs, same code); retain all previous failures.
9. Record cleanup: runner manifests/ownership flags, zero owned test DBs/uploads left, no leaked mission servers; stop only services started/owned by that run after verifying absolute path/port. Keep tools/logs/failed artifacts. No broad kill, reset or filesystem cleanup commands.

Historical reference counts from Mission 0.2: unit 219, authorization 8, login readiness 1, rental API 20, rental browser 7, meetup 16, production-camera 2. Counts alone are not proof the scenarios ran. Full unfiltered final command exit and security/lifecycle postconditions are required.

## E4: physical mobile-camera and browser plan

Device QA proposes at least one actual iPhone/Safari and Android/Chrome, plus agreed desktop Firefox/Safari coverage where available; owner approves supported versions/devices and captures exact hardware/OS/browser versions. No hardware availability is assumed. Use two distinct ordinary synthetic participant accounts/devices and an outsider, local synthetic fixtures and private authored images only. No real identity, provider, payments or production data.

Preflight is a blocking step: prove a browser-supported secure device origin, camera/geolocation availability and permission behavior, correct session cookies/Origin policy, same owned test DB/server and approved device access. `scripts/local-meetup-demo.ts` currently binds `localhost` and enables explicitly gated temporary location for allowlisted synthetic Alice/Bob. It is **not** a ready LAN/HTTPS or real-GPS acceptance harness. Android device-local USB forwarding or a reviewed private trusted-TLS lab ingress are possibilities, not validated setups; iOS access/certificate/host/origin compatibility must be established separately. No public tunnel, deploy, host-policy bypass, disabled browser security or relaxed production rejection is authorized. If secure access cannot be established with existing protections, mark BLOCKED and request a separate narrowly scoped harness authorization.

Split results: (a) physical camera optics/permission with explicitly labelled permitted development location simulation; (b) actual GPS/geofence consent at an authorized test location with no simulation; (c) synthetic production-build camera comparison. A PASS in one does not pass the others. Do not use existing simulated-centre receipts as evidence of actual location or real custody.

| Scenario | Required observation / invariant |
|---|---|
| Real cold navigation/login and SSR | Disabled until hydrated, successful real login/session, expected route, no native GET form leak, no unexpected hydration/console errors |
| Camera allow/deny/revoke/cancel | Correct prompt and denial UI; no verify on denial; stop media tracks on cancel, tab/navigation/background interruption; safe recovery without auto-authority |
| Front/rear camera, rotation, low light/glare/distance | Record device/conditions, actual screen-to-camera QR pixels, bounded retry behavior; no pasted token or manual-code substitute counted as camera PASS |
| Both participant pickup and return | Correct booking/station/participant, consent/check-in, QR issue/scan, actual verify HTTP/result, persisted immutable receipt, expected custody/state after refresh/restart |
| Negatives | Wrong actor/booking, invalid QR, expired/replayed challenge, outside geofence/stale check-in and session expiration denied; original time windows unchanged |
| Complete rental lifecycle | Return submission alone does not prove physical return; actual receipt/inspection/review eligibility remains; private evidence decodes and outsider access is denied |
| Mobile UI/accessibility | Approved widths/orientation, keyboard/focus, text zoom, theme/locale, busy/error/long text states, drafts retained; no horizontal overflow or hidden essential actions |

Record screenshots/screen video only for synthetic data, server timestamps, relevant HTTP statuses, browser console/remote inspection where available and sanitized receipt state. Do not publish raw session cookies, active QR secrets or precise personal location. Mark unavailable console capture as unavailable, not 'no errors'. Owner signs the visual/device checklist. Production-camera or physical-camera acceptance does not authorize deployment/production-provider behavior.

## Final decision rules

- GO for independent approved work only after owner accepts scope and environment disposition in the readiness plan. Workstream contracts and exclusive leases are still required.
- CONDITIONAL while documented platform/hardware/data/advisory decisions remain; specify which work is allowed and which integration is blocked. No implicit Linux/Windows portability from one passing target.
- NO-GO for combined integration if any required auth/privacy/custody/QR/financial assertion fails, CI naming prerequisite is unresolved, required workflow jobs did not run or evidence is incomplete. No skipped/disabled assertion or green rerun erases the failure; diagnose, repair and execute final frozen-source acceptance.
- Do not claim production readiness from these development tests. Main merge, hosted execution/publication, device-network exposure, historical-data corrections and deployment require separate authorization. This planning mission ends after committing the three documents.