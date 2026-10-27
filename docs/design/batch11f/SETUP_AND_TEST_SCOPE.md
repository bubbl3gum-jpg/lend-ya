# Setup and verification scope

Use the existing isolation harness with a newly named `hustlen_test_*` PostgreSQL target and a local role permitted to create/drop only the new owned fixtures. Set `MRT_TEST_DATABASE_URL` through private local environment configuration; keep the real application URL unchanged for target-difference checks. Never point tests at an existing database, relabel an application database with a test marker, or commit connection strings. The harness verifies effective target, ownership marker/run ID and cleanup. Browser executable here: `/usr/bin/chromium` via `MRT_BROWSER_PATH`.

Run `npm run <group>` for each exact group in `regression-ledger.json`. New commands:

- `test:account-password-review`: real HTTP/persistence tests for effective credential reuse and silently skipped required writes.
- `test:account-security-ux`: actual bilingual/responsive account browser and failure handling, concurrent attempt cap, already-authorized profile versus new-request logout boundary.
- `test:login-contention`: three real cold/warm browser logins, original five-second post-submit assertion, bounded diagnostics. Run alongside a separately owned account/heritage workload; record its actual overlap rather than claim a quiet result exercises contention.

Only the existing isolated password harness enables the independent owned-development gate, exact localhost origin, database bindings and fixture allowlist for password tests. No new browser preference enables authorization. Original production-refusal test deliberately sets the flag in an isolated production build and proves 404/form absent/no mutation. No production deployment occurred.

Static verification: `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, `node node_modules/prisma/build/index.js validate`; production build: `npm run build:verify`. Ledger records actual child exits, timestamps, node test counts when emitted, owned run IDs and cleanup. Coordinator success alone is not evidence. This is selected verification, not every repository command or independent certification.

Migration verification replays the existing 28-to-29 migration transition in a fresh/populated owned fixture and tests partial-failure atomicity. All existing 29 SQL migrations plus lock file remain byte-identical; no 11F migration or schema change. See migration-preservation.json, historical-migration-hashes.json and source-preservation.json. Immutable-event and credential/session failure injections are fixture-only, removed in finally; the harness then drops the owned DB and recorded uploads. Read-only maintenance verifies final cleanup separately.

Only completed ownership-recorded generated Next caches were pruned for disk space; screenshots, diagnostics and source were retained. No package/lockfile upgrade, protected API permission change, deadline relaxation or shared browser-error suppression. Full meetup must retain actual virtual-camera pickup and return decoding; the separate camera JSONs record real decoder/verify/track cleanup, not mocked authorization success.

See INITIAL_FAILURES.md for baseline failures and corrections; LOGIN_TIMING_INVESTIGATION.md for original and new overlap results. Physical device/Safari/screen-reader/native-zoom and production security/visual acceptance remain separate.
