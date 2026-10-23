# Temporary local meetup testing

Branch base: `fix/qr-meetup-acceptance-hardening`. This is an opt-in disposable demo, separate from real MRT geofencing. No station coordinates, booking station, Prisma schema, or migration history change. Never deploy this mode or enable it on a user database.

## Prepare and start

Use Node 24, `npm ci`, `npx prisma generate --config prisma7.config.ts`, and the local PostgreSQL 17 service (`docker compose up -d`). Use a new, non-existing database name, never the development database:

```sh
MRT_TEST_DATABASE_URL='postgresql://p2p_user:p2p_password@localhost:55433/hustlen_test_home_demo' npm run demo:meetup:local
```

The credentials above are the repository's local disposable Docker defaults. Do not use production credentials. The command refuses existing/non-local/non-test databases, creates an ownership-marked database, applies existing migrations only to that new database, seeds demo fixtures, and starts one localhost development server. It sets both allowlists to only Alice and Bob, a random server secret, and an explicit 900-second receipt confirmation period. It never saves credentials or coordinates in setup files. It does not alter `.env` or the shared development database. Port 3000 must be free.

Log in as `alice@example.test` and `bob@example.test` in separate browser profiles, using the README's local demo password. Create/accept a booking if needed, then have the owner enable the isolated meetup preview. In the meetup panel:

1. One participant checks the simulation acknowledgement and selects **Use my current location as a temporary test meetup**. This requests an actual fresh browser/device position; it does not invent or substitute a position on the client.
2. The other participant explicitly acknowledges the same simulated meetup. Neither acknowledgement asserts arrival at the real station.
3. Both select **I've Arrived**, granting location permission independently. Both devices must actually be near the temporary centre and pass the original distance, accuracy and freshness rules. The app shows `TEST_LOCATION`, never verified arrival at the MRT station.
4. Continue the original checklists, role-specific QR issuance/redemption, and separate physical receipt confirmation. A QR scan alone never moves custody. Return inspection and dispute protections remain in force.

A phone needs a secure browser context with geolocation support. Localhost works on the machine running the browser. For another device, provide a trusted HTTPS forwarding arrangement to this local development server; do not deploy the app/database to production. Existing origin/CSRF checks still apply, so configure the trusted development origin consistently. Permission denial, stale fixes, low accuracy and being outside the area do not count as test arrival. Browser geolocation remains spoofable; this mode is not evidence of real station presence.

## Safety and retention

Every operation checks development mode, the explicit feature flag, an exact DATABASE_URL/MRT_TEST_DATABASE_URL match, a local `hustlen_test_*` name, the actual connected database name and its exact `hustlen-mrt-test:<run-id>` ownership marker, and both explicit preview and test participant allowlists. A feature flag alone cannot enable this on a production database. Do not manufacture an ownership marker on an existing database.

The temporary centre and acknowledgements live only in one server process's memory. No raw centre is returned in status, written to the database, logged, or saved to Git. Multiple workers/restarts intentionally fail closed; this is a single-server development tool. Each generation is tied to one booking, lasts at most one hour, and cannot be refreshed by acknowledging. Replace only after revocation, with fresh bilateral consent and new check-ins. The original agreed MRT station and catalogue remain untouched.

The historical database CHECK constraint is unchanged: a successful test sample is stored as `outcome=UNAVAILABLE`, `reason=TEST_LOCATION` and a random generation in `policyVersion`. Public check-in/status DTOs and QR assurance explicitly show `TEST_LOCATION`. It is never stored as `VERIFIED`. Only accuracy/distance bands and an existing keyed sample fingerprint are retained, not raw coordinates. All test-mode challenges must reference fresh checks for the same currently acknowledged generation. Expiry/revocation/restart prevents issuance and redemption; it also invalidates pending receipt confirmation for that simulated location. Normal receipt windows remain unchanged for real-station checks.

## Cleanup

Either participant can select **Revoke temporary test location and erase centre**. The centre is also erased automatically after one hour and on successful physical receipt completion. Stop the demo with Ctrl-C: the server exits and the command checks ownership before dropping only its own disposable database. The ignored `.test-artifacts/<run-id>` directory contains generated Next build files, not raw GPS samples, and may be removed after the server stops. The command also removes recorded UUID listing uploads from this owned database; private booking evidence is removed with the database. Avoid personal media and use synthetic fixtures only.

If forcibly killed (SIGKILL or machine loss), the in-memory centre is gone but the disposable database can remain. The command prints its database name and run ID on startup. Before any manual removal, query and verify the exact ownership comment and local database identity against that run; then drop only that owned test database. Never reset, adopt or drop an existing user/development database to retry. A new run needs a new unused database name. Do not capture location request bodies in browser traces, proxy logs, screenshots, analytics or bug reports.

## Automated checks

```sh
npm test
npm run lint
npx tsc --noEmit
MRT_TEST_DATABASE_URL='postgresql://p2p_user:p2p_password@localhost:55433/hustlen_test_meetup_checks' MRT_BROWSER_PATH=/usr/bin/chromium npm run test:meetup
```

Unit tests exercise production/remote/shared configuration refusal, allowlist parsing, one-hour expiration, revocation, booking isolation, and the unchanged distance/accuracy/freshness policy. The existing owned-database QR suite adds flag-off, outsider, consent, stale-sample, generation, TEST_LOCATION, checklist, QR revocation and restart checks; its other tests continue covering QR authorization, receipts, transitions and disputes. Test coordinates are synthetic fixtures; never replace them with a developer's actual home location. The runner creates and cleans its own new database. Review current execution results rather than assuming historical reports validate this branch.
