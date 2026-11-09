# Hustlen' account recovery — milestone 1

Historical source-branch audit. The canonical integration supersedes its administrator-recovery scope: only ordinary accounts without staff associations or reviewer records are eligible. See [integration audit](ACCOUNT_RECOVERY_INTEGRATION.md) for current behavior and validation.

This is the milestone 1 snapshot. For the subsequent email implementation and current setup requirements, see [milestone 2](ACCOUNT_RECOVERY_MILESTONE_2.md).

## Implemented

- Email-only recovery preparation, using the existing User record for both users and administrators.
- Random 256-bit credentials with only SHA-256 hashes stored in PostgreSQL; credentials expire after 30 minutes and each new issuance replaces the previous one.
- Persistent rolling limits: 60-second email cooldown, 5 accepted requests per email per hour, 20 per IP per hour. Email addresses are normalized; equivalent IPv6 and IPv4-mapped addresses share quotas. Unknown accounts consume the same quotas.
- PostgreSQL advisory locks prevent simultaneous requests across application instances from bypassing limits. Old request records are pruned during subsequent requests; no raw email/IP is stored in the request table.
- `POST /api/auth/reset-password` accepts `{ token, password, confirmPassword }`. Invalid, expired, superseded and consumed links share one error. GET does not consume a token.
- Password update, token consumption and revocation of all account sessions happen in one transaction. Account-row locks coordinate resets with issuing new credentials and login session creation. A login that verified an old password before a reset cannot create a valid session after that reset.
- Registration and reset require 8–128 characters, an ASCII digit and an ASCII uppercase letter. Lowercase letters remain optional. Existing passwords still work at login, which does not enforce the new creation policy.
- The current dialog now accepts email only and registration hints reflect the new policy. Dedicated pages remain milestone 3.

## Deliberately not enabled yet

The public recovery-request endpoint returns HTTP 503 for every valid email while delivery is unconfigured. It does not issue tokens or claim an email was sent. `preparePasswordRecovery` is an internal server function for the milestone 2 delivery adapter; its returned raw credential must never appear in an API response, database, logs or analytics.

Email delivery, delivery-failure handling, password-change notifications and dedicated recovery/reset screens remain to be implemented. There is no lost-email support flow. No sending account, domain or API key has been created.

When email is connected, the request handler must use the same generic confirmation for unknown accounts and rate-limited requests. Establish a trusted client IP from the deployed server/proxy configuration before connecting the limiter; never trust user-supplied forwarding headers by default. Email links must use a configured trusted application origin, not the incoming Host header. Keep token-bearing URLs out of access logs and referrers when implementing the reset page.

## Migration and verification

`20261109090000_password_recovery` adds only the PasswordRecovery and PasswordRecoveryRequest tables, their indexes and a foreign key. Existing marketplace tables and data are not rewritten.

The isolated recovery suite covers fresh migration deployment, a populated forward upgrade, schema agreement, policy validation, hashed credential storage, expiry, single use, replacement, limits across database clients, parallel quota enforcement, administrator and ordinary-user resets, rollback on an injected database failure, a deterministic login/reset race, session revocation and preservation of profile/listing/booking/handoff/return/review records.

Run with a new, explicitly designated local database (the runner refuses to adopt an existing database and removes the database it creates):

```sh
MRT_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:55433/hustlen_test_recovery_unique' npm run test:recovery
```

If using an installed Chromium executable, also set `MRT_BROWSER_PATH=/usr/bin/chromium`; otherwise install the matching Playwright Chromium first. Reports are written to `.test-artifacts/<run-id>/recovery-validation.json`.

The development/shared database has not been migrated. Before enabling recovery outside isolated tests, follow the existing migration/baseline guidance in README.md, deploy the new forward migration, and generate Prisma Client. Do not reset or reseed existing user data.

Verification completed on November 9, 2026:

- TypeScript type check, ESLint and unit tests passed.
- Recovery integration and populated migration tests passed; report: `.test-artifacts/a63f53ee3e7ebd37051fe710/recovery-validation.json`.
- Existing marketplace browser regression suite passed with no browser errors; report: `.test-artifacts/9bffe8e867bf347ac4ed1d66/validation.json`.
- Both successful test runs removed their owned databases. Failed setup attempts also removed their owned databases; the first attempt needed the installed Chromium path, and migration/review fixtures were corrected before the successful runs.

## Next milestone

Connect recovery and password-change emails, test provider failures and safe retry behavior, then build the dedicated Hustlen' pages. Resend can be used in restricted test mode without a domain; general recipient delivery requires a verified sending domain or another usable sender configuration.
