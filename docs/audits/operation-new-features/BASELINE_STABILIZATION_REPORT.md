# Mission 0.1 — Baseline stabilization

Date: 2026-11-05 (Asia/Taipei).

**Readiness: BLOCKED.** The UTC/session, review-file, migration/path and media-fixture repairs have passing regression evidence. The actual production-build camera lifecycle also passes. Repeated Windows development-browser failures prevent accepting a reliable parallel-development baseline. No feature agents, feature branches, main merge, push or deployment are part of this mission.

## Repository, source and preservation

- Verified fetch/push remote: `https://github.com/bubbl3gum-jpg/lend-ya.git`.
- Starting commit: `6b477c4194de0f618c7aa38a658a474d72e31fcb`.
- Repair branch: `stabilization/operation-new-features-baseline`.
- Separate worktree: `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization`.
- Ending implementation commit: `f4f0bddfbc106f4359dfdb47f28e9f3d284a75e0`. The final audit is a documentation-only child commit; its exact SHA is returned with this report. Both are on the stabilization branch; neither is pushed or merged.
- Original main and forgot-password worktrees started clean at `f856dc360b332007dd79725ddee0d28102411521`; neither was edited.
- The detached Mission 0 validation checkout was retained in place, including its raw ignored evidence.

Executed preservation/verification commands: `git remote -v`, `git worktree list --porcelain`, per-worktree `git status --short --branch`, `git rev-parse <candidate>`, and `git worktree add -b stabilization/operation-new-features-baseline <separate-path> <candidate>`. The four original reports were copied byte-for-byte into `mission0/` before repair work. SHA-256 source/copy pairs matched:

| Preserved report | SHA-256 |
|---|---|
| `mission0/BASELINE_ACCEPTANCE_REPORT.md` | `e34929ec1086106f87580fef4444a482af02cd3569a535cd16a419a39999749a` |
| `mission0/MULTI_AGENT_EXECUTION_PLAN.md` | `a168cf27c59ea123b5e8060dac322fb29ffa2981c579bfb726e71a686d90cfaa` |
| `mission0/FEATURE_DEPENDENCY_MATRIX.md` | `8ba981ca09f178511a5fc0a06b276c821db1f3d619440d79e5ad3b46149aebae` |
| `mission0/REGRESSION_TEST_BASELINE.md` | `7965a7e9c1dda190b7adab3282dd8c9c2b7cbfef3232b9c8dae42b24832a722f` |

Read candidate `AGENTS.md`, `CLAUDE.md`, setup/booking-time documentation and the installed version's Next CLI guide. Used the version-matched Prisma CLI and driver-adapter skill guidance. No installed package source was patched or upgraded.

## Root causes and targeted repairs

| Original failure | Classification and evidence | Repair / security implication |
|---|---|---|
| Authorization-policy unit path inventory | Test portability bug: recursive `path.join` yields backslashes on Windows, but protected inventory records `/`. | Normalize only discovered path separators before comparing route names. Guard source bytes and recorded SHA-256 expectations remain unchanged. |
| Guard source hashes, revealed after fixing route inventory | Checkout portability: `core.autocrlf=true` produced CRLF working files, while immutable inventories describe Git's LF blobs. | `.gitattributes` enforces LF for the protected trees/files. Verified those paths were clean before converting checkout line endings. No guard code or expected digest changed; exact byte hashing stays active. |
| Review CLI symlink rejection | Product/security bug: `O_NOFOLLOW` is not implemented as an effective rejection mechanism on Windows; the CLI accepted the linked file. | New bounded review reader rejects symlinks/junction ancestors, hard-linked/nonregular files, NUL/UNC/device/alternate-stream paths on Windows and unavailable file identities. Retains native no-follow where available, validates opened handle identity and rechecks path identities and file metadata. Regression exercises real file links and junctions; no bypass or skipped validation. |
| Expired-session assertions | Test bug: `NOW()-interval` assigned into a naive UTC-convention column uses the database session's local wall time. In Asia/Taipei, the supposed expired row was approximately eight hours in the future when read as UTC. | Expiry fixtures in authorization, Admin, moderation and MVP tests now parameterize explicit JS UTC instants. The expected 401/session denial remains unchanged. |
| Eight-hour pg/Prisma discrepancy | Runtime adapter/session assumption: locked adapter `normalize_timestamp` labels naive values UTC; `normalize_timestamptz` replaces the returned offset with `+00:00` rather than converting the wall clock. With non-UTC session output, this shifts represented instants. | Pin the ordinary application adapter connection to UTC, after original test-target validation. Preserve connection target and other options; do not modify server timezone, schema, history or transaction protocol. |
| Baseline suite child evidence | Test portability bug: child artifact regex accepted only `.test-artifacts/`, while Windows emits a backslash. | Accept either separator in the path token, retaining strict 24-hex run ID and all ownership, snapshot, failure propagation and cleanup assertions. |
| Legacy browser/Admin/migration setup | Test/environment bug: literal `/tmp` became nonexistent `C:/tmp`; generated TS config imported a Windows drive path instead of a module file URL. | Logs/screenshots/video fixtures use the current owned artifact directory; migration scratch directories use `os.tmpdir()` and generated imports use `pathToFileURL`. Historical migration SQL is untouched. |
| FFmpeg / ffprobe | Environment: the LINE-bundled executable returned `Ticket File Not Exist`; ffprobe was absent from the original test environment. The application correctly refuses an unvalidated video. | Installed isolated, checksum-verified media binaries and prepended them only to test-process PATH. No media validation was disabled. The restored validator exposed a second, independent fixture defect (next row); the tool installation alone was not counted as acceptance. |
| MRT listing video HTTP 400 after restoring tools | Test fixture bug: the detached canvas recorder produced a 110-byte WebM; the captured file failed ffprobe with invalid EBML/end-of-file. | Generate a deterministic, one-second libvpx WebM with isolated FFmpeg, upload it through the real browser and require HTTP 201. The production media validator is unchanged; the repaired complete MRT publication/map/race/mobile/lifecycle test passed. |
| Login-readiness timeout after restored environment | Test scheduling/compilation: server log records 3.9 seconds compiling the login API, then compilation of `/dashboard`; a 5-second negative-URL assertion stopped the test during real navigation. | Require the exact authorized `/dashboard` destination with a bounded 30-second dev-navigation budget. Cookie/API-response assertions remain; no auth wait or expiry protection was relaxed. |
| New bounded dependency child timeout under full parallel unit run | Environment/resource scheduling: one pinned-Node child hit its unchanged 3-second process limit during unbounded file-level concurrency. | Bound unit file concurrency to four; preserve the child's timeout, memory cap and security assertions. The full final unit run passes 219 tests, including the new regressions, with zero skipped. |
| Legacy moderation lifecycle setup exposed after path fix | Test drift: setup attempted borrower handoff without mandatory bilateral check-ins and QR receipt. Current API correctly returned 409. | Reuse the existing test-only authenticated HTTP meetup helper for arrival, scan and receipt. Preserve negative permission checks and dispute/evidence expectations; no direct DB custody bypass or feature-gate relaxation. |
| Preview browser failure leaked Chromium / held the test process | Test cleanup bug: the 13B subtest's local browser was closed only on its success path. | Add `try/finally` closure. The failed old worker tree was identified by exact mission worktree/test command before termination; its parent runner then cleaned its owned database. Initial failures remain in logs. |
| Windows restarted-dev browser reload loops | Environment/harness issue: repeated same-run Turbopack restarts left forms unhydrated and controls absent during repeated navigations. Camera telemetry recorded zero media starts in the failed negative case, so this was not evidence of QR decoding failure. | Add an explicit test bundler selector, using Next's documented Webpack dev mode for Windows acceptance; production build/start unchanged. Webpack is the supported local acceptance profile; the underlying Turbopack behavior is not claimed repaired. Linux CI and a complete Windows Turbopack rerun remain unexecuted. |

| Temporary location available in one route but rejected at handoff | Product development-mode bug: Webpack may instantiate the module once per route bundle, so private module maps disagreed in the same worker. | Share the in-memory map only within the current process and a hash of the exact database/run/environment/allowlists. Module-reload regression verifies shared generation/revocation and clearing when bindings change. TTL, production rejection, database ownership and restart loss remain enforced. |
| Admin native form GET and missing action after refresh | Product hydration bug: enabled SSR controls submitted before React attached handlers; logs showed reason text in a native GET query. | Admin ActionForm now uses POST and disables a fieldset until hydrated/busy. Delayed-JS regression confirms SSR controls are disabled, then verifies actual successful actions and no reason/adminNotes navigation parameters. Full moderation suite passes. |
| Booking Accept and Chat with Owner lost clicks | Product hydration bug: SSR buttons were enabled before their client handlers attached; failed browser run recorded no intended API request. | Gate these client actions until hydrated, retaining all existing busy/role/state checks. Delayed-JS browser regressions require disabled SSR and enabled hydrated controls, then assert real successful API responses. The complete production-build QR flow passes, with 11 scripts held and booking readiness changing to true. Windows dev readiness remains unreliable; this is not claimed fully fixed. |
| Chat queue job unavailable at a JS clock boundary | Test timing bug: fixtures used SQL NOW() microseconds while worker comparison uses JS millisecond Date; the supposedly immediately due row could be later than the worker instant. | Parameterize explicitly past UTC fixture instants, keep lease fencing/three-attempt failure assertions and leave worker code unchanged. The job subtests pass after repair. |
| Chat browser case transition | Windows dev browser test: claim returned 200 but the short evidence assertion observed the queue while the case route compiled. | Explicitly compile the authenticated dev page without claiming/reading protected evidence, then require the actual claim response, exact case URL and protected evidence with bounded dev budgets. The final full chat suite passes 14/14; this is recorded from browser and restart execution, not inferred from API success. |

## UTC verification contract

The new `test:postgres-utc` suite runs only through the ownership-checked disposable runner. It deliberately sets its raw pg client session to `Asia/Taipei` while verifying the independent application-style adapter reports `UTC`. It checks:

1. `TIMESTAMPTZ '2035-01-01 10:00:00+08'` and UTC naive `2035-01-01 02:00:00` both yield JavaScript `2035-01-01T02:00:00.000Z` through the pinned adapter; raw pg's aware result agrees.
2. A JS Date written to `AuthSession.expiresAt` retains the exact epoch in PostgreSQL using `AT TIME ZONE 'UTC'`, and round-trips unchanged through Prisma.
3. A genuinely past instant stays expired; explicit-UTC raw fixtures agree with Prisma.
4. A `NOW()` default written through the application pool stores a current UTC-convention instant despite the server's non-UTC default.
5. Raw session timezone remains independent; the helper does not alter the server/database or caller's session.

This repairs future binding behavior, not historical timestamps. No historical data was shifted or guessed, no column types were migrated, and no session-validity assertion was changed to accept a valid session. The existing booking conversion/timezone, reservation, history and Decimal tests remain required.

## Validation environment and evidence

Fresh PostgreSQL 17 cluster: `.test-artifacts/mission01/pgdata`, bound only to `127.0.0.1:56480`, new local role `mission01`. No shared database or service was adopted. Every runner URL names a new `hustlen_test_m01_*` database; marker/target validation and cleanup are unchanged. No destructive migration command, `db push`, shared reset, production credentials or provider call was used.

Initial install: Node 24.7.0/npm 11.5.1, `npm ci --no-audit`, 668 packages, locked versions unchanged. Acceptance runtime: repository-pinned Node **24.19.0**, downloaded under ignored artifacts and verified against Node's published `SHASUMS256.txt`; npm was invoked through that executable with its directory prepended to PATH for acceptance workers. Initial installation/generation and nested npm.cmd CLI dispatch may use the installed Node 24.7.0; neither installed dependencies nor the lockfile were changed by a runtime upgrade.

Media: BtbN archive `ffmpeg-master-latest-win64-gpl.zip`, version `N-128406-g1fe6854fd9-20261104`; SHA-256 `469c9e1291c91d76d3cb9604835e9684ce76f0129b68081087c053d1771b47eb`, matched published release checksums. The slower/unavailable Gyan download attempts were superseded and stopped; they were not installed into the system. Playwright uses its previously installed managed Chromium. No binary, database, dependency tree or raw private test artifact is committed.

Fresh logs and CSV are under ignored `.test-artifacts/mission01/`; per-run ownership manifests, screenshots and server/QR telemetry are under `.test-artifacts/<run-id>/`. PowerShell logs are UTF-16; use `Get-Content` to read them. Initial and repaired outcomes are retained separately; no historical Mission 0 PASS is counted as a fresh result.

## Results and exact changed-file inventory

Results below are from fresh execution in this repair worktree. A later failing rerun supersedes an earlier PASS; failures and diagnostic attempts remain in the ignored evidence. No assertion expectation was changed to turn a denial into success.

| Command (npm scripts invoked with pinned Node) | Result | Evidence / scope |
|---|---|---|
| `npm ci --no-audit` | PASS | 668 locked packages; no lockfile change; initial installed runtime as documented above. |
| `npm run db:generate` | PASS | Prisma generation succeeded. |
| `node node_modules/prisma/build/index.js validate --config prisma7.config.ts` | PASS | `prisma-validate.log`. |
| `npm run test:unit` | PASS | `unit-serial-acceptance.log`: 219/219, zero skipped/cancelled, exit 0 on committed code. Exact source hashes, real symlink/junction/hardlink rejection, UTC URL and module isolation regressions included. |
| `npm run typecheck` | PASS | `review-typecheck.log`: exit 0 after all source/test edits; production camera build also typechecked the committed tree. |
| `npm run lint` | PASS | `review-lint.log`: exit 0 after all source/test edits. |
| `npm run test:postgres-utc` | PASS | `test-postgres-utc.log`: session timezone/epoch/default/JS Date/expired session checks. |
| `npm run test:baseline` | PASS | `test-baseline.log`: 33 migrations, 76 public tables unchanged on repeat setup; deliberate child failure propagates and cleans owned DB. |
| `npm run test:authorization` | PASS | `test-authorization.log`: 8/8, real expired session and scoped boundary denial. |
| `npm run test:stability` | PASS | `test-stability.log`: 8/8, ownership/CSRF/audit failure gates. |
| `npm run test:login-readiness` | PASS | `recheck-test-login-readiness.log`: delayed hydration, successful real login/cookie checks. |
| `npm run test:migration` | PASS | `test-migration.log`: original-to-combined migration/checksum comparison. |
| `npm run test:admin-migration` | PASS | `test-admin-migration.log`: 1/1. |
| `npm run test:meetup-migration` | PASS | `recheck-test-meetup-migration.log`: 1/1 after native temp/module URL fix. |
| `npm run test:rental-api` | PASS | `test-rental-api.log`: 20/20 booking lifecycle, reservations, evidence and review authority. |
| `npm run test:integration` | PASS | `final-test-integration.log`: actual listing photo/video publication, MRT picker/map, stale response races, mobile, API, logout/login; browserErrors empty. |
| `npm run test:admin` | PASS | `recheck-test-admin.log`: 7/7, participant denial, admin actions, browser/mobile. |
| `npm run test:moderation` | PASS | `final-test-moderation.log`: 10/10 with real mandatory meetup setup and delayed Admin hydration/privacy regression. |
| `npm run test:camera-reader` | PASS | `test-camera-reader.log`: genuine QR pixels decoded. This alone does not establish the full camera workflow. |
| `npm run test:mvp` | PASS | `test-mvp.log`: 12/12, MVP security/mobile and isolated production-start cookie/filter checks. |
| `npm run test:meetup` | FAIL | `accept-test-meetup.log`: 14 passing individual subtests; positive mobile camera lifecycle fails before camera at booking readiness; parent also fails. Manual recovery, camera negative stream cleanup and custody/expiry/replay denial cases pass. |
| `npm run test:rental-browser` | FAIL | `accept-test-rental-browser.log`: later rerun fails station confirmation, navigation/reload and dependent lifecycle checks; previous 7/7 PASS does not supersede the fresh failure. |
| `npm run test:chat` | PASS | `review-chat.log`, `review.csv`: exit 0, 199 s, 14/14 including browser messaging/report/block controls, reviewer claim/evidence/decision, scoped privacy, lease fencing and real server restarts. Earlier browser transition failures remain in `accept-test-chat.log`. |
| `npm run build:verify` | PASS | `accept-build-verify.log`, `accepted.csv`: exit 0, 72 s; real optimized Turbopack production build plus typecheck, disposable migrations and cleanup. |
| `npm audit --json` | FAIL | `audit.json`: 16 moderate development dependency entries, zero high/critical. No automatic dependency upgrade performed. |
| `npm audit --omit=dev --json` | PASS | Production dependency findings: zero. |
| Hosted Linux CI / complete Windows Turbopack rerun | NOT RUN | Local environment cannot execute hosted CI; no Docker engine. Webpack profile is an alternative under investigation, not proven universal. |
| `npm run test:meetup-camera -- --camera-production` | PASS | `review-camera-production.log`, `review.csv`: exit 0, 72 s including optimized build; both parent and actual mobile camera lifecycle pass. Uses true QR pixels, browser camera media, GPS consent, actual handoff/return, draft persistence/restart and screenshots. Run `0d60d1d8216ab66d7e5087a2`. No expectation or QR gate bypass. |
| `npm run test:meetup-camera` | FAIL | `camera-focused.log`: Windows dev navigation to `/listings/new` aborted before camera startup; 6 subtests pass, positive flow and parent fail. One build overlapped part of this diagnostic; it is not accepted as isolated browser evidence or used to override earlier sequential failures. |
| Real hardware camera, Safari/Firefox | NOT RUN | Synthetic Chromium camera frames are separate from physical-device acceptance. |
| Other feature/candidate-specific optional suites | NOT RUN | Staff pilots, real local AI/provider quality, identity/Vision/device acceptance and other candidate module suites were not independently rerun in this targeted mission. No PASS inferred. |

The original expired-session failures were reproduced and repaired without changing authentication validity rules. Prisma migrations were actually deployed only into disposable owned databases for the above checks; shared/production migration status is BLOCKED (not connected by design). No pending migration was introduced.

### Reproduction

Run one server/build/test runner at a time **within each worktree**: Next also generates a root `next-env.d.ts`, even with a per-run output directory. Different feature agents need different worktrees.

Windows acceptance prerequisites: Node 24.19.0, PostgreSQL 17 on an owned loopback service, valid `ffmpeg` and `ffprobe` on test PATH, and Playwright-managed Chromium. Set `MRT_BROWSER_PATH`/`CHROMIUM_PATH` to `require('@playwright/test').chromium.executablePath()`, `MRT_TEST_BUNDLER=webpack`, and an explicit unused `MRT_TEST_DATABASE_URL=postgresql://mission01@127.0.0.1:56480/hustlen_test_<unique_suite>`. Invoke each table command sequentially. Never point the runner at an existing database; do not copy development/production credentials. The runner refuses adoption and validates its random ownership marker before writes/cleanup.

Reproducible supported OS alternative, **not yet executed**: Ubuntu 24.04 with PostgreSQL 17 and Node from `.node-version`; `npm ci`; `sudo apt-get install -y ffmpeg`; `npx playwright install --with-deps chromium`; set both browser paths as above; use a new local `hustlen_test_*` name per runner and run the scripts in `.github/workflows/verify.yml` sequentially. The workflow retains the original checks and additionally includes UTC, authorization and login-readiness regressions. A production camera comparison is available as `npm run test:meetup-camera -- --camera-production`, using another unused owned test DB; it is a test build/start, never a deployment.

### Changed files

Implementation commit `f4f0bddfbc106f4359dfdb47f28e9f3d284a75e0` changes exactly the following 35 files (verified with `git diff-tree --no-commit-id --name-only -r <sha>`). The only subsequent change is this audit report. No schema, migration SQL, lockfile, protected Admin/geofencing source, credentials or original worktree content changed.

```text
.gitattributes
.github/workflows/verify.yml
components/admin/action-form.tsx
components/booking-actions.tsx
components/chat/participant.tsx
docs/audits/operation-new-features/mission0/BASELINE_ACCEPTANCE_REPORT.md
docs/audits/operation-new-features/mission0/FEATURE_DEPENDENCY_MATRIX.md
docs/audits/operation-new-features/mission0/MULTI_AGENT_EXECUTION_PLAN.md
docs/audits/operation-new-features/mission0/REGRESSION_TEST_BASELINE.md
lib/ai-case-brief/review-file.ts
lib/meetup/test-location.ts
lib/postgres-utc.ts
lib/prisma.ts
package.json
scripts/offline-ai-review.ts
tests/admin.integration.test.ts
tests/ai-review.test.ts
tests/auth-login-readiness.integration.test.ts
tests/authorization-policy.test.ts
tests/authorization.integration.test.ts
tests/baseline.ts
tests/chat.integration.test.ts
tests/meetup-migration.test.ts
tests/meetup-test-location.test.ts
tests/meetup.integration.test.ts
tests/moderation-migration.test.ts
tests/moderation.integration.test.ts
tests/mrt-integration.ts
tests/mvp-security.test.ts
tests/postgres-utc.integration.test.ts
tests/postgres-utc.test.ts
tests/rental-browser.test.ts
tests/run-isolated.ts
tests/support/next-bundler.ts
tests/test-safety.test.ts
```


### Final verification and cleanup

- On implementation commit `f4f0bddfbc106f4359dfdb47f28e9f3d284a75e0`: full isolated production camera comparison PASS (2/2), full chat PASS (14/14), full unit script PASS (219/219, 7.99 seconds), final typecheck PASS and lint PASS. No source edits followed these checks.
- A diagnostic unit run overlapped a heavy production/browser job and the existing Zod child hit its unchanged three-second wall-clock cap (`review-test-unit.log`). The subsequent run **alone**, with the same four-file concurrency, memory limit, inputs and assertions, passes. This is a resource scheduling limitation, not a relaxed expectation; serialize heavy checks and provision test resources for future agents. Both results are retained.
- `psql -h 127.0.0.1 -p 56480 -U mission01 -d postgres -Atc "SELECT count(*) FROM pg_database WHERE datname LIKE 'hustlen_test_%'"` returned **0** after all runners finished. **39** runner manifests remain (21 pass, 18 failed attempts), all `preserved:false`; raw failed attempts are evidence, not hidden or counted as success. Listing upload files remaining: **0**.
- No mission Node test/server process remained. After verifying `postmaster.pid`, absolute cluster path inside this worktree and port **56480**, `pg_ctl -D <owned cluster> -m fast -w stop` succeeded. The inactive cluster, binaries and logs are retained under ignored artifacts; no pre-existing PostgreSQL service was stopped.
- Original `main` and `forgotpassword/my-branch` worktrees rechecked clean at `f856dc360b332007dd79725ddee0d28102411521`. Detached validation remains at the candidate with its same four untracked reports. All four source/copy SHA-256 pairs were rechecked identical.
- `git diff <starting-sha> <implementation-sha> -- prisma package-lock.json app/api/admin lib/geofencing-lab lib/admin/locations.ts` produced no paths; protected code/schema/history/lockfile remain byte-identical Git content. `git diff --check` passed.
- This audit is the only documentation-only follow-up file: `docs/audits/operation-new-features/BASELINE_STABILIZATION_REPORT.md`. Total changed files across repair and audit: **36**. Final audit commit identity is reported to the owner after commit; use `git log -2 --format='%H %s'` in this branch to recover both exact SHAs.

### Evidence-to-code index

| Issue | Concrete implementation / regression files |
|---|---|
| UTC/session behavior | `lib/prisma.ts`, `lib/postgres-utc.ts`, `tests/postgres-utc.integration.test.ts`, `tests/postgres-utc.test.ts`; expiry fixtures in `tests/authorization.integration.test.ts`, `tests/admin.integration.test.ts`, `tests/moderation.integration.test.ts`, `tests/mvp-security.test.ts` |
| Symlink/unsafe review input | `lib/ai-case-brief/review-file.ts`, `scripts/offline-ai-review.ts`, `tests/ai-review.test.ts` |
| Immutable guards / unit scheduling | `.gitattributes`, `tests/authorization-policy.test.ts`, `package.json`; original `tests/dependency-security.test.ts` limits unchanged |
| Baseline / migration / Windows paths | `tests/baseline.ts`, `tests/meetup-migration.test.ts`, `tests/moderation-migration.test.ts`, `tests/admin.integration.test.ts`, `tests/rental-browser.test.ts`, `tests/mvp-security.test.ts` |
| Dev bundler / test infrastructure | `tests/support/next-bundler.ts`, `tests/test-safety.test.ts`, `tests/run-isolated.ts`, standalone suite imports, `.github/workflows/verify.yml` |
| MRT publication / route-local test state / cleanup | `tests/mrt-integration.ts`, `lib/meetup/test-location.ts`, `tests/meetup-test-location.test.ts`, `tests/meetup.integration.test.ts`; `lib/listing-media.ts` unchanged |
| SSR action readiness / Admin privacy | `components/admin/action-form.tsx`, `components/booking-actions.tsx`, `components/chat/participant.tsx`, `tests/moderation.integration.test.ts`, `tests/meetup.integration.test.ts`, `tests/chat.integration.test.ts` |
| Login dev navigation budget | `tests/auth-login-readiness.integration.test.ts` |
| Real mandatory lifecycle test setup / clock fixtures | `tests/moderation.integration.test.ts`, `tests/chat.integration.test.ts`; production authorization and job worker rules unchanged |

## Security boundaries preserved

- No expected guard hashes changed; no normalization was added to the hash assertions.
- No role, session, CSRF/Origin, ownership, private-evidence, custody, QR single-use, expiry, rate-limit or immutable-history gate was removed.
- Synthetic identity never grants membership/custody; AI/Vision/local-location/Support candidates retain their development-only restrictions. No model/provider or financial action was activated.
- No schema or historical migration modification and no historical timestamp rewrite.
- Review-file reads are bounded, nonregular/linked/unsafe paths fail closed, handles close on errors, and raw file contents are not logged by the CLI.
- Production build does not imply production acceptance or authorize deployment.

Automatic approval review rejected a proposed hash-normalization patch as weakening byte integrity; it was not applied. It also required proof before checkout overwrite; protected files were verified clean, and only checkout CRLF-to-LF formatting was converted. The final checks still compare the exact recorded bytes, not substituted expectations.

## Remaining acceptance requirements

1. Obtain a clean, sequential PASS for the full canonical regression workflow on Ubuntu 24.04/Node 24.19.0/PostgreSQL 17, including rental browser, chat browser and full meetup; keep logs/artifacts. Docker engine is unavailable locally; WSL reports version 2 but no installed distributions. No hosted run was triggered or inferred.
2. Diagnose the intermittent Windows dev navigation/reload/hydration failures, or explicitly choose Linux as the supported development/acceptance environment. Webpack reduces some failures but has not made repeated Windows runs reliable. The latest failing rental-browser run supersedes its earlier pass.
3. Require passing final acceptance of the booking lifecycle/history/error recovery, and reconfirm the now-passing reviewer browser transition in the canonical workflow; retain all security and privacy assertions. Production camera PASS does not waive these failures.
4. Review the UTC session change against any existing real data before a future cutover: prior non-UTC writes may already contain shifted naive timestamps. No correction or migration of existing data was attempted or authorized. Decide audit/correction policy using actual provenance; do not bulk-shift by eight hours.
5. Assess the 16 moderate development dependency findings and schedule a separate tested dependency remediation, especially where untrusted inputs can reach development tooling. Production dependency audit currently has zero findings; this does not waive dev risks.
6. Product owner must accept the stabilization report and supported environment before feature agents/feature branches start. Keep the existing Mission 0 ownership/dependency plans provisional until acceptance. No feature agents were launched.
7. Physical mobile camera/permission, Safari/Firefox and product-owner visual acceptance remain separate release checks. Identity/Vision/AI/local-location development restrictions must remain enabled; no synthetic success establishes production identity, custody, payment or model quality.
8. Production migration/cutover/deployment and any main merge need separate authorization. Password recovery delivery policy, deposit/currency/ledger/refund policy and the scope of mobile changes remain owner decisions for subsequent missions.

The unresolved Windows symptoms are supported by logs, but their underlying framework/runtime cause is **not conclusively identified**. No speculative framework upgrade, disabled integrity assertion, relaxed security expectation or retry-until-green acceptance was used. A passing single rerun cannot establish reliability after the observed failures.
