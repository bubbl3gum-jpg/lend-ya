# Setup and repeatability checkpoint

This reconstructs setup on the recovery candidate; it does not recover the
missing original patches. Starting checkpoint:
`a8b0bbb26fca6deb7e602518ef61b1835cc33889`, branch
`recovery/candidate-validation-20261103`. Local/remote identity and a clean
working tree were verified before editing. The original checkout is untouched.

## Development contract

Use Node **24.19.0** from `.node-version` and npm **11.x** (tested with 11.9.0).
`package.json` declares Node 24.x/npm 11.x, with matching lockfile root metadata;
CI reads `.node-version`. No dependency versions were changed.

```sh
npm ci
# Start a local PostgreSQL 17 service and configure your private .env first.
npm run db:setup
# Optional, explicitly requested local demonstration data only:
npm run db:seed
npm run typecheck
npm run dev
```

Copy the credential-free `.env.example` and fill in your own `DATABASE_URL`.
Rental meetup runtime additionally needs a private random `MEETUP_CODE_SECRET`
of at least 32 characters and explicit `MEETUP_CONFIRMATION_TTL_SECONDS`
(60–1800 seconds). Keep secrets server-only; do not commit `.env`. The example
also documents optional verification windows, disposable test designation and
browser paths. It does not activate any provisional feature or production gate.
The checked-in Compose defaults are local-demo credentials, not production
configuration; no environment values were copied into this reconstruction.

| Command | Behavior |
| --- | --- |
| `npm run db:generate` | `prisma generate --config prisma7.config.ts` |
| `npm run db:migrate` | `prisma migrate deploy --config prisma7.config.ts` |
| `npm run mrt:import` | Existing `tsx scripts/import-mrt.ts`, using the shared transactional importer |
| `npm run db:setup` | Generation → migration deployment → MRT import, joined with `&&`; first failure stops setup and exits nonzero |
| `npm run db:seed` | Explicit `prisma db seed --config prisma7.config.ts`; never part of setup |
| `npm run typecheck` | `next typegen && tsc --noEmit` against the full project; generate Prisma Client first |
| `npm run test:baseline` | Existing isolated runner with new baseline mode |
| `npm run build:verify` | Existing isolated runner deploys migrations into a fresh owned database, then runs the full production build |

Setup never resets/truncates, invokes `db push`, or creates demo users/bookings.
It applies existing forward migrations without editing historical files. MRT
import preserves existing IDs and noncanonical/custom rows and reconciles
official metadata with the current checked-in network. Schema drift and unknown
existing-database provenance require inspection/preflight, not a destructive fix.
Setup is not one cross-command transaction: successfully deployed migrations
remain if later import fails; the importer itself is transactional. Repair the
reported cause and rerun setup. No database-independent build promise is made:
`build:verify` intentionally supplies a prepared disposable database. No rendering
boundaries or booking/product rules were changed.

The local-only, non-production seed still fills missing demo records without
overwriting existing users/listings/rentals. Its target guards now run inside the
managed main operation. Prisma disconnect is awaited on both success and failure;
failure uses `process.exitCode = 1` rather than terminating before cleanup, and a
disconnect failure also retains nonzero status. No restrictions were relaxed.

## Baseline safety and acceptance

Supply a **nonexisting** local `hustlen_test_*` URL via
`MRT_TEST_DATABASE_URL`, distinct from `DATABASE_URL`, with create/drop permission.
Do not precreate or reset that database. The existing runner validates the
driver's effective target, creates the database exclusively, assigns a random
ownership marker, checks it before subprocesses and cleanup, and removes only
that database and its recorded listing files. Existing keep-on-failure behavior
is preserved. Diagnostics under `.test-artifacts/` are intentionally retained
and ignored by Git; they are not uploaded application files.

`tests/baseline.ts` performs these real operations:

1. Run actual `db:setup` against an empty runner-owned DB. Compare applied
   migration names to all current migration directories (33 at this checkpoint),
   assert 120 stations and zero demo users/bookings.
2. Explicitly seed once; assert the two seeded bookings exist. Add two custom
   participants, a custom station, inactive listing/station link, cancellation
   booking with Decimal quotation/idempotency fields and a recorded upload.
3. Snapshot **every public table**, including full station rows, migration
   ledger/checksums, users, bookings, references and meetup/history rows. Compare
   exact PostgreSQL row JSON text rather than driver-parsed dates or JS numbers.
   Run setup again and require equality. Repeat the explicit seed and require
   equality again. All 76 public tables were compared at this checkpoint.
4. Start a second isolated runner with its own fresh name and ownership marker.
   Induce an actual MRT mapping conflict only in that child's fixtures. Verify
   seed fails without hanging, setup exits 1, the importer rolls back without
   changing snapshot rows, and the child runner reports failure.
5. Independently verify the child's failed manifest, database absence and removal
   of its recorded upload, while the parent's marker, complete rows and distinct
   upload remain intact. The outer runner then cleans its own database/upload.

The intentional child's exit 1 is expected evidence; the outer baseline must
exit 0 only after all failure-propagation and isolation assertions pass. No
developer/production database, user upload or applied migration was modified.

## Executed validation — 2026-11-03

Fresh local `postgres:17` container `lend-ya-setup-validation-20261103`, no
persistent volume or copied database, loopback port 32769. Connection values are
omitted; supply your own disposable local connection to reproduce. Database
suites ran sequentially; non-database checks were independent.

| Command | Actual result |
| --- | --- |
| `npm ci` | PASS, 573 packages, exit 0; existing ESLint support warning |
| `npm run db:generate` | PASS, Prisma Client 7.10.1 generated, exit 0 |
| `npm run typecheck` | PASS, route type generation and complete project typing, exit 0 |
| `npm run lint` | PASS, no diagnostics, exit 0 |
| `npm run test:unit` | PASS, 202 passed, 0 failed/skipped |
| `npm run test:baseline` | PASS, exit 0; setup/seed reruns unchanged across all 76 public tables, 33 migrations; intentional child exit 1 and isolated cleanup verified |
| `npm run build:verify` | PASS, exit 0; 33 fresh migrations and full production build including typing/static generation/routes, not compilation alone |

Baseline target: `hustlen_test_setup_baseline_20261103`; its intentional failure
child is independently generated as `hustlen_test_baseline_failure_<run-id>`.
Build target: `hustlen_test_setup_build_20261103`. No browser or lifecycle suite
was repeated because this task changes setup commands and runner dispatch only;
baseline and full build cover the affected paths. Hosted CI and other platforms
were not executed. Logs are session-local `/tmp/lend-setup-*.log`; baseline
subprocess logs/manifests are in ignored `.test-artifacts/` directories.

Independent cleanup verification passed: a maintenance query inside the new
disposable container found zero remaining setup/baseline-failure databases;
all three runner manifests record `preserved: false` (outer baseline and build
passed; intentional child failed as expected). No listing upload files remain.
The disposable container was then stopped/auto-removed. No pre-existing service
or database was stopped, reset or queried. No database suite or required check
was blocked; the intentional failure is part of the passing baseline test.

This document and the relevant scripts/tests/runtime/template/CI changes form
the setup checkpoint. Only those reviewed files are committed. A normal push
of this recovery branch is authorized; the final handover reports the actual
post-push remote SHA independently queried from origin. No force push, main
merge, deployment or environment publication is part of this task.

The initial remote preflight matched the starting checkpoint. A later pre-commit
remote query failed with `could not read Username for 'https://github.com': No
such device or address`. This is an authentication-access failure, not evidence
of divergence. Retain the local checkpoint if normal Git access remains blocked;
do not claim remote preservation without a successful post-push SHA query.
The subsequent authorized normal push (`git -c push.followTags=false push origin
HEAD:refs/heads/recovery/candidate-validation-20261103`) and independent
`git ls-remote --exit-code --heads origin
refs/heads/recovery/candidate-validation-20261103` both exited 128 with that same
authentication error. No new remote backup is verified. Restore the supported
GitHub repository authentication in the environment, recheck remote ancestry,
then retry the normal push and exact-SHA query; do not extract/copy credentials,
force-push or assume the old remote checkpoint is still current.

## Handover: dependency disposition

Next, refresh advisories from this unchanged dependency lock and assess supported
lint-tool remediation. The preceding audit's 16 moderate development findings
and zero production findings are historical until refreshed; no security count
is newly claimed here. Update stale README disposition and a dedicated security
report; do not force incompatible overrides or suppress findings. Validate locked
installation, generation, typing, lint, units and the isolated build after any
dependency changes. Preserve setup repeatability and database ownership guards.

Separate remaining gaps from `RECOVERY_PLAN.md`: strict API instants/configurable
booking policy (30 versus fixed 90 days requires a decision), consistent activity
display, database boundary/concurrency coverage, historical-risk assessment and
focused dashboard history navigation. This task changes none of those rules or
the existing exact pricing, durable idempotency, evidence or feature gates.
