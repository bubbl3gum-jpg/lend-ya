# Reproducing R1 verification

Use the repository's existing fresh disposable database harness, never an existing application database. The target must be absent, owned by the test operator, named `hustlen_test_*`, and accepted by the effective-target/driver guard. Do not reset/migrate/seed an application database to view the design.

With a separately authorized local PostgreSQL test-creation role and unique absent database name, set `MRT_TEST_DATABASE_URL` in the environment; use your local browser executable via `MRT_BROWSER_PATH`. Do not commit credentials. The normal `.env` development URL is used only as the harness's forbidden-existing-target comparison; changing tests run against the new owned target.

Commands:

```
MRT_TEST_KEEP_ON_FAILURE=0 npm run test:account-design
MRT_TEST_KEEP_ON_FAILURE=0 npm run test:heritage-ui
MRT_TEST_KEEP_ON_FAILURE=0 npm run test:integration
MRT_TEST_KEEP_ON_FAILURE=0 npm run test:meetup-session
MRT_TEST_KEEP_ON_FAILURE=0 npm run test:meetup
```

Supply a new unique absent target for each invocation. Each wrapper verifies ownership, replays the existing historical migrations on that newly created database, starts the app against it, runs actual browser/server operations and drops its owned database/uploads at completion. Artifact paths are printed; screenshots and bounded JSON evidence can be inspected independently after the server closes. The default failure-retention behavior is overridden above for cleanup. The real header/account actions use real authenticated sessions. `test:heritage-ui` seeds explicitly synthetic listing fixtures only in its owned database. The `/catalogue` page itself reads ordinary eligible persisted records, never a hardcoded successful product mock.

The final selected ledger includes further existing Admin, rental, Support, staff/MFA, announcement/settings, Locations/Workbench and build commands; see `verification.json`. Preserve each group's initial outcome. Do not raise assertion timeouts or suppress browser errors if a rerun fails.

Static checks: `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, `npx prisma validate`. `build:verify` is the existing owned production-build harness. No new schema or migration is needed for R1.

The offline [review page](review.html), full PNG files, [fidelity checklist](VISUAL_REVIEW.md), [asset inventory](ASSETS.md) and optional sound sample require no running app or live database. The sound sample plays only when explicitly requested. These documents cannot establish product-owner approval or production readiness.
