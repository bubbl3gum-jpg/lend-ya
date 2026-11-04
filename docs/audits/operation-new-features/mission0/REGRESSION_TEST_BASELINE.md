# Mission 0 — Regression test baseline

Date: 2026-11-05 (Asia/Taipei). Tested commit: `6b477c4194de0f618c7aa38a658a474d72e31fcb` in the detached validation worktree. These are fresh executions, not copied historical results.

## Result vocabulary and reproduction

PASS means the actual command exited 0 with its stated assertions completed. FAIL means the command ran and exited nonzero. BLOCKED means prerequisites prevented meaningful acceptance coverage. NOT RUN means it was not executed. A suite that fails before browser work is FAIL as a command and BLOCKED as acceptance coverage; both facts are recorded.

Raw logs are retained in ignored `.test-artifacts/mission0/`; suite manifests, server logs and generated evidence are under `.test-artifacts/<24-hex-run-id>/`. `suites.csv` records exact scripted exit codes and elapsed seconds. PowerShell redirection produced UTF-16 logs/JSON: use `Get-Content -Raw | ConvertFrom-Json` rather than assuming UTF-8. Logs are local synthetic-test artifacts, not public release attachments.

Runtime: Windows PowerShell, Node 24.7.0, npm 11.5.1, new PostgreSQL 17 cluster at loopback port 56479. This is not an exact Node 24.19.0 or Linux CI run.

For each database suite, set a different fresh `MRT_TEST_DATABASE_URL` naming `hustlen_test_mission0_<suite>` on this mission-owned server, then run the exact npm command. Do not precreate its database. `tests/run-isolated.ts` exclusively creates it, writes a random ownership marker, revalidates driver target and marker, generates a test-only secret and removes only its database and recorded uploads. Use candidate-generated Playwright Chromium for `MRT_BROWSER_PATH` and `CHROMIUM_PATH`.

No existing environment file, credential, database or service was adopted. Suites ran sequentially in the same worktree to avoid concurrent Next output. The independent QR pixel-reader test does not start Next or use PostgreSQL.

## Fresh command results

| Check / actual command | Result | Evidence and scope |
|---|---|---|
| `npm ci --no-audit` | PASS, exit 0 | `npm-ci.log`; 668 packages; ESLint support warning; lockfile unchanged |
| `npm ls --depth=0` | PASS, exit 0 | `dependencies.log`; all direct dependencies resolved |
| `npm audit --json` | FAIL, exit 1 | `audit.json`; 16 moderate affected package entries; no high/critical |
| `npm audit --omit=dev --json` | PASS, exit 0 | `audit-production.json`; zero findings; not a complete application-security audit |
| `npm run db:generate` | PASS, exit 0 | `generate.log`; Prisma Client 7.10.1 generated from candidate schema |
| `node_modules/.bin/prisma.cmd validate --config prisma7.config.ts` | PASS, exit 0 | `prisma-validate.log`; schema valid |
| `npm run typecheck` | PASS, exit 0 | `typecheck.log`; Next route type generation and full `tsc --noEmit` |
| `npm run lint` | PASS, exit 0 | `lint.log`; no diagnostics |
| `npm run test:unit` | FAIL, exit 1 | `unit.log`; 215 tests: 213 pass, 2 fail, 0 skipped |
| `npm run test:baseline` | FAIL, exit 1 | `baseline.log`; setup repeatability passed 33 migrations/76 tables; child artifact path parsing failed afterward |
| `npm run build:verify` | PASS, exit 0 | `build.log`; all migrations on owned DB, full optimized Next production build, typing, static generation and route inventory; owned DB removed |
| `prisma migrate status --config prisma7.config.ts` on empty mission DB | PASS as pending-state diagnostic, command exit 1 | `migration-status-before.log`; all 33 migrations pending, expected for an empty database |
| `prisma migrate deploy --config prisma7.config.ts` on initially mis-marked mission DB | FAIL, exit 1; expected safety refusal | `migration-deploy.log`; disposable-only private-channel guard refused incorrect marker; database removed |
| `prisma migrate deploy --config prisma7.config.ts` on new correctly marked mission DB | PASS, exit 0 | `migration-deploy-verified.log`; 33 migrations deployed; no guard changed |
| `prisma migrate status --config prisma7.config.ts` on that prepared DB | PASS, exit 0 | `migration-status-verified.log`; up to date; database removed afterward |
| `npm run test:migration` | PASS, exit 0 | `test-migration.log`; populated Admin-to-combined upgrade, migration checksum preservation and empty schema diff; generated `migration-validation.json` |
| `npm run test:admin-migration` | FAIL, exit 1; coverage BLOCKED | `test-admin-migration.log`; 1 failed test, `/tmp/lend-ya-migration-XXXXXX` missing before fixture setup |
| `npm run test:authorization` | FAIL, exit 1 | `test-authorization.log`; 8 reported tests: 5 pass, 3 fail including failed parent; route inventory path bug and expired-session assertion |
| `npm run test:login-readiness` | PASS, exit 0 | `test-login-readiness.log`; 1 test passed |
| `npm run test:stability` | PASS, exit 0 | `test-stability.log`; 8 tests passed, including auth isolation, cross-origin login and audited evidence access |
| `npm run test:rental-api` | PASS, exit 0 | `test-rental-api.log`; 20 tests passed: validation/privacy, quotation/idempotency, acceptance races, immutable history/evidence, full lifecycle, disputes and inspection races |
| `npm run test:integration` | FAIL, exit 1 | `test-integration.log`; real Chromium run timed out at listing-publication navigation; server log shows POST `/api/listings` 400 |
| `npm run test:rental-browser` | FAIL, exit 1; coverage BLOCKED | `test-rental-browser.log`; 1 failed test before browser workflow, missing `C:/tmp/lend-ya-browser-server.log` |
| `npm run test:camera-reader` | PASS, exit 0 | `camera-reader.log`; 1 real Chromium pixel-decoding test passed; public synthetic QR corpus, no physical camera claim |
| `npm run test:meetup` | FAIL, exit 1; camera acceptance BLOCKED | `test-meetup.log`; 16 reported tests: 13 pass, 3 fail including parent; protocol/receipt/expiry tests pass, two camera cases fail generating fixtures with unusable ffmpeg |
| `npm run test:meetup-camera` | FAIL, exit 1; camera acceptance BLOCKED | `test-meetup-camera.log`; 8 reported tests: 5 pass, 3 fail including parent; focused camera cases hit same media prerequisite |
| `npm run test:admin` | FAIL, exit 1; acceptance coverage BLOCKED | `test-admin.log`; 1 failed test before browser workflow, missing `C:/tmp/lend-ya-admin-server.log` |
| `npm run test:moderation` | FAIL, exit 1; acceptance coverage BLOCKED | `test-moderation.log`; 1 failed test before browser workflow, missing `C:/tmp/lend-ya-moderation-server.log` |

## Failure evidence and practical meaning

### Unit tests

1. `tests/authorization-policy.test.ts:370`: discovered paths use Windows backslashes while checked-in route inventory uses `/`; `deepStrictEqual` fails. It does not establish a missing route guard; it prevents successful inventory verification.
2. `tests/ai-review.test.ts:61`: symlink validation subprocess returns 0 where 1 is required. `scripts/offline-ai-review.ts` opens with `constants.O_NOFOLLOW`; do not assume that protection works on Windows. No source fix was made.

### Baseline repeatability

`tests/baseline.ts:141` expects child artifacts matching `artifacts: (\.test-artifacts\/[a-f0-9]{24})`; Windows output uses `\`. The repeatability assertion passed before this failure. Parent manifest `0bc9e273ddc9b17336b4dc54/run.json` and intentional child `21f594366846e4eb1860d529/run.json` both record `passed: false`, `preserved: false`; the intentional child failure is part of the design, but the parent failure is not a PASS.

### Authorization

`tests/authorization.integration.test.ts:389` generates a backslash-bearing route request and receives 404 instead of 401. Separately, line 505 sets a real session expiry to `NOW()-INTERVAL '1 second'`, then expects `INVALID_HUMAN_SESSION`; actual shadow reason is `CANDIDATE_CONTRACT_MATCH_NOT_AUTHORIZATION`. The expired-session failure is unresolved and must be reproduced and understood. This is an inactive shadow-policy test; no live authorization bypass is claimed.

A follow-up read-only diagnostic (`node .test-artifacts/mission0/timezone-diagnostic.cjs`, exit 0; `timezone-diagnostic.log`) compared the locked `pg` and Prisma adapter against only this mission's maintenance database. SQL: `SELECT current_setting('TimeZone') AS zone, NOW() AS db_now, (NOW()-INTERVAL '1 second')::timestamp AS expiry`. PostgreSQL timezone was Asia/Taipei. At Node time `2026-11-04T16:31:24Z`, pg returned expiry `2026-11-04T16:31:23Z`; Prisma returned expiry `2026-11-05T00:31:24Z`, approximately eight hours ahead. Prisma also rendered `db_now` eight hours ahead in this raw-query comparison. This demonstrates a timestamp interpretation difference in this environment and supports investigating timezone/adapter/fixture semantics. It does not by itself prove the exact authorization failure's root cause or establish a safe workaround. No timezone, application source or fixture was changed. An initial inline diagnostic attempt failed JavaScript parsing (exit 1); the ignored script avoids PowerShell argument quoting and is the successful diagnostic, not a rerun of the failed test.

### Browser and media

`tests/mrt-integration.ts:162` times out awaiting `/listings/<id>` after Publish listing. The owned server's request returned 400. No assumption is made that this is only a browser or media issue. Legacy suites require `/tmp`; creating a global directory to suppress those failures was not part of this audit. A discovered LINE ffmpeg binary was unusable; install a supported executable in an isolated environment before claiming virtual-camera/media acceptance. Physical-device acceptance remains separate even if synthetic camera tests pass.

## Not executed / not established

Within the failing aggregate unit command, individual gate tests did pass: identity synthetic states never grant real participation, forged identity/provider authority is rejected, identity candidate source has no real mutation/upload/provider transport, synthetic AI production configuration is denied, and Vision observations cannot assert financial/identity authority. These individual passes do not make the aggregate unit command PASS or establish full production browser gate acceptance. No real provider call was made.

- Shared or production database migration status, deployment, real provider calls, real eKYC, email delivery, payment/refund execution: NOT RUN and outside scope.
- Linux hosted CI and exact pinned Node 24.19.0 validation: NOT RUN.
- Physical mobile devices/cameras, Safari/Firefox and owner visual acceptance: NOT RUN.
- Every other npm script not explicitly listed as executed in this report: NOT RUN. Presence of a test file or old evidence is not a passing result.
- No automatic repair, test weakening, feature-gate relaxation or source-code change was performed to turn failures green.

## Recommendations and regression obligations

Resolve baseline failures in a separately authorized change. Preserve these initial logs and compare fresh results on the supported OS/runtime. Feature A must add token expiry/replay/abuse/session-race tests; B must add precision/idempotency/immutable-ledger and booking-snapshot tests; C must exercise responsive auth/booking/MRT layouts, keyboard access, both themes and approved locales. The integrator reruns this required baseline after shared-file changes. See `MULTI_AGENT_EXECUTION_PLAN.md` and `FEATURE_DEPENDENCY_MATRIX.md` for ownership and integration order.

## Final cleanup and repository verification

All commands and suite processes finished; no test result is pending. `manifest-summary.json` contains 15 runner manifests, all `preserved: false` (including the intentional baseline-failure child). Each test runner reported removal of its owned database and recorded uploads. A final maintenance query on only this mission's server, `SELECT count(*) FROM pg_database WHERE datname LIKE 'hustlen_test_%'`, returned **0** (`remaining-databases.log`); `storage/listings` contained **0** files.

After resolving and verifying the exact mission-owned data directory, `pg_ctl -D <validation-worktree>/.test-artifacts/mission0/pgdata -m fast -w stop` exited 0 and reported `server stopped` (`postgres-stop.log`). No existing PostgreSQL or Docker service was stopped. The inactive cluster, dependencies, build outputs and ignored evidence remain local for review; no recursive deletion was performed.

Final `git diff --exit-code` passed: no tracked application, test, migration, lockfile or instruction changes. `git status --short` lists exactly the four new Markdown reports. Original main and `forgotpassword/my-branch` worktrees remain clean at `f856dc3`; validation HEAD remains detached at `6b477c4194de0f618c7aa38a658a474d72e31fcb`. No commit, feature branch, merge or push was made. Owner must decide repair scope and exact-SHA acceptance before feature agents start.
