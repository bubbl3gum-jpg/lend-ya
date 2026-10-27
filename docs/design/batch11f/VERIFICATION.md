# Final selected verification ledger

Tested implementation: `14430fa7af28d4e573de9339bf14e0c8658ecb9c`. **34/34 selected isolated command groups passed**, plus unit **97/97**, TypeScript, ESLint and Prisma validation (all exit 0). This is not every repository suite or independent production certification. Actual child exits and ownership/cleanup markers were checked; coordinator exit alone was not used.

| Command (`npm run …`) | Result | Node tests, when emitted |
| --- | --- | --- |
| `test:integration` | PASS (exit 0) | not emitted |
| `test:meetup-session` | PASS (exit 0) | 6 |
| `test:meetup` | PASS (exit 0) | 11 |
| `test:admin` | PASS (exit 0) | 7 |
| `test:rental-api` | PASS (exit 0) | 13 |
| `test:rental-browser` | PASS (exit 0) | 4 |
| `test:chat` | PASS (exit 0) | 14 |
| `test:support-channels` | PASS (exit 0) | 9 |
| `test:support-staff` | PASS (exit 0) | 14 |
| `test:authorization` | PASS (exit 0) | 8 |
| `test:staff-session` | PASS (exit 0) | 13 |
| `test:mfa` | PASS (exit 0) | 16 |
| `test:announcements` | PASS (exit 0) | 9 |
| `test:platform-settings` | PASS (exit 0) | 8 |
| `test:locations` | PASS (exit 0) | 7 |
| `test:workbench` | PASS (exit 0) | 7 |
| `test:moderation` | PASS (exit 0) | 10 |
| `test:login-navigation` | PASS (exit 0) | 7 |
| `test:database-principals` | PASS (exit 0) | 7 |
| `test:approval` | PASS (exit 0) | 18 |
| `test:account-password-review` | PASS (exit 0) | 3 |
| `test:password-change` | PASS (exit 0) | 1 |
| `test:password-change-production` | PASS (exit 0) | 1 |
| `test:password-change-migration` | PASS (exit 0) | 1 |
| `test:account-design` | PASS (exit 0) | 1 |
| `test:localization` | PASS (exit 0) | 1 |
| `test:homepage` | PASS (exit 0) | 1 |
| `test:heritage-ui` | PASS (exit 0) | 1 |
| `test:discovery-localization` | PASS (exit 0) | 2 |
| `build:verify` | PASS (exit 0) | not emitted |
| `test:mvp` | PASS (exit 0) | 11 |
| `test:account-security-ux` | PASS (exit 0) | 1 |
| `test:login-readiness` | PASS (exit 0) | 1 |
| `test:login-contention` | PASS (exit 0) | 1 |

Original MRT integration passed; meetup-session 6/6; full meetup 11/11. Both camera JSONs show actual decoded frame, verification 200, verifiedBooking true and stopped tracks at pickup and return. No camera/GPS/consent/evidence/custody assertion was weakened. Password candidate production test returns 404/form absent with flag configured; old session/event state preserved. Existing migration replay verifies 28→29 forward installation, representative historical rows unchanged, atomic partial failure and replay; no 11F migration.

Final account UX and login entries are the already-passing overlap-B runs, not new quiet retries. Both overlap trials and their original readiness tests remain in login-timing/. Parser-only timing extraction correction was subsequently type/lint checked; the production build passed with the same application runtime source; retained server logs were postprocessed without rerunning the trials. Application runtime source stayed unchanged through final selected verification. Broader serial/core suites overlapped other separately owned build/targeted suites after the controlled timing trials ended; timestamps in JSON make conditions inspectable.

Initial deliberate baseline security failures and the new-test Playwright type/build failure are documented separately in INITIAL_FAILURES.md. There were no failing groups in the final selected ledger. Historical R1 five-second intermittence remains unresolved despite these overlap passes. Physical devices/Safari, screen readers, native zoom, exhaustive contrast and low-end performance remain unverified.

Cleanup: final read-only maintenance query reports **0 owned 11F databases and 0 marked test principals remaining**. All fixture schema/data changes occurred only in newly ownership-verified test databases; no existing application database was modified. Only generated completed-run Next caches were pruned, with diagnostics/screenshots preserved. See cleanup.json and cache-maintenance.json. Production, visual and policy acceptance remain pending.
