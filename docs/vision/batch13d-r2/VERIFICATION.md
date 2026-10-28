# Selected verification ledger

29 October 2026, Asia/Taipei. Implementation `847a947a5a0b1ab1fff546f2df4e673a7f2af920`. Tests are selected relevant groups, not every repository command. Original browser collector, assertions and deadlines unchanged. No concurrent browser groups; four static checks ran concurrently while browsers were stopped.

**Final outcomes: 30/30 selected command groups passed; unit tests144/144.** Every changing test used a freshly created, guarded owned disposable database. All latest owned runs report cleanup; separate read-only maintenance verification reports zero residual R2 databases or owned test principals.

| Command | Exit | Actual test summary / result | Artifact |
|---|---|---|---|
| `npm run build:verify` | 0 | Passed | `.test-artifacts/49e4a527fa16ce4f391abd1e` |
| `npm run lint` | 0 | Passed | `/tmp/hustlen-13dr2/lint.log` |
| `npx prisma validate --config prisma7.config.ts` | 0 | Passed | `/tmp/hustlen-13dr2/prisma-validation.log` |
| `npm run test:account-security-ux` | 0 | ℹ pass 1 | `.test-artifacts/7541a56ccbfc73239712a25c` |
| `npm run test:admin` | 0 | ℹ pass 7 | `.test-artifacts/2c6aa6830bebab458135b174` |
| `npm run test:announcements` | 0 | ℹ pass 9 | `.test-artifacts/5fde3b9ea3e8fe1778a6a6c2` |
| `npm run test:authorization` | 0 | ℹ pass 8 | `.test-artifacts/d10325371bcb4e5485ed504d` |
| `npm run test:chat` | 0 | ℹ pass 14 | `.test-artifacts/ff0fa7f0a14e9f80fb452043` |
| `npm run test:database-principals` | 0 | ℹ pass 7 | `.test-artifacts/1adf6064b90aea5e8bba4f8c` |
| `npm run test:identity` | 0 | ℹ pass 1 | `.test-artifacts/c7e31f639e25fe62cc24e44b` |
| `npm run test:integration` | 0 | Passed | `.test-artifacts/bcd4ac24676cd3d7584ff45b` |
| `npm run test:item-documentation` | 0 | ℹ pass 1 | `.test-artifacts/e6237806d56a42f41d46aa7b` |
| `npm run test:item-studio` | 0 | ℹ pass 1 | `.test-artifacts/ac3fc14744090940b5de8184` |
| `npm run test:locations` | 0 | ℹ pass 7 | `.test-artifacts/d9e03f92eb60332c93e06339` |
| `npm run test:login-readiness` | 0 | ℹ pass 1 | `.test-artifacts/6d6942d88986ca8e6d77832f` |
| `npm run test:meetup` | 0 | ℹ pass 12 | `.test-artifacts/128e5cc77d62ed85198077c7` |
| `npm run test:meetup-session` | 0 | ℹ pass 6 | `.test-artifacts/7d77fc9549cd70c6b57c2ce7` |
| `npm run test:mfa` | 0 | ℹ pass 16 | `.test-artifacts/b61e14babccfc3c5e4e7945a` |
| `npm run test:migration` | 0 | Passed | `.test-artifacts/a83d0efa426cac4d9c788a1c` |
| `npm run test:moderation` | 0 | ℹ pass 10 | `.test-artifacts/772fbdc565c0318c791f6c33` |
| `npm run test:platform-settings` | 0 | ℹ pass 8 | `.test-artifacts/0d0d828167464dcee0ffa3d2` |
| `npm run test:rental-api` | 0 | ℹ pass 13 | `.test-artifacts/4c60018246f9341b14009546` |
| `npm run test:rental-browser` | 0 | ℹ pass 4 | `.test-artifacts/a596269ed95fd8948b98ed77` |
| `npm run test:rental-documentation` | 0 | ℹ pass 1 | `.test-artifacts/2685e6912e64b7da773389c1` |
| `npm run test:rental-documentation-migration` | 0 | ℹ pass 1 | `.test-artifacts/464554b517dbe7994ee5fe67` |
| `npm run test:rental-documentation-production` | 0 | ℹ pass 1 | `.test-artifacts/79ac24b3443c373194c047d1` |
| `npm run test:support-channels` | 0 | ℹ pass 9 | `.test-artifacts/ff6a5baccbd9bbe40021bde3` |
| `npm run test:support-staff` | 0 | ℹ pass 15 | `.test-artifacts/60b00107da7e37c9dda390cd` |
| `npx tsc --noEmit` | 0 | Passed | `/tmp/hustlen-13dr2/typecheck.log` |
| `npm run test:unit` | 0 | 144 passed | `/tmp/hustlen-13dr2/unit.log` |

## Evidence and reproducibility

[Machine-readable latest results](final-results.json) retain exact UTC start/end times, run artifact IDs, exit status and cleanup outcome. Coordinator creates unique fresh `hustlen_test_13dr2_*` targets through the existing verified harness; never reset/reuse an existing target. Use the contract setup commands with a fresh target for each changing suite. Environment credentials were read without printing/storing them in reports. No test-only Google Fonts substitution was set for the normal build.

The final focused agreement, populated R1 upgrade, historical migration, rental browser and production build ran after the implementation commit. Earlier selected groups exercised the same relevant unchanged boundaries; final static checks cover the frozen source. No implementation changes in evidence commits.

Full `test:meetup`:12/12, including actual native virtual-camera decoding at pickup and return (one native-decoded/decoded/verify-request event each), consent/GPS/freshness, expiry, manual recovery as a separate test, original inspection and restart. `test:integration` reports an empty browser-error list. `test:meetup-session`:6/6; login-readiness:1/1. Support-staff:15/15 includes actual13A restricted companion; full meetup includes13B physical-return/inspection; identity:1/1 retains13C inert simulation; R1 studio:1/1 and documentation:1/1 retain private persistence/comparison.

Populated R1 upgrade:30 previous migrations, one new migration; legacy users, Booking, sessions, reviewer, immutable audit and original private evidence bytes unchanged. No backfill. Injected partial SQL failure rolls back; normal deploy/replay succeeds. Historical migration suite:31 total, every prior row across14 history/security tables preserved, official MRT data/FKs/checksums preserved, final schema diff empty.

## Initial failures, corrections and retries

- Synthetic fixture uniqueness error: switched to reading the existing seeded eligible official station. No catalogue modification.
- CSS compile failure after erroneous patch: exact baseline CSS restored plus scoped new ledger rules. The affected browser assertion timed out; no timeout increase.
- First broad pass exhausted workspace disk. Authorization received500 instead of401; retained Turbopack trace explicitly identifies ENOSPC. Following groups failed during migration. Removed only generated test compilation caches, retaining screenshots/logs/records, then reran affected groups on new databases.
- Rental-browser attempt missed the second owner handoff heading while source edits caused HMR; trace has no second acceptance PATCH and a pre-mount warning. Source-frozen final rerun passed4/4 without test changes. This does not establish the historical general login intermittence is resolved.
- Historical migration schema diff detected equivalent default expressions in different canonical forms. Updated only the new Prisma default representation; ten-minute expiry and SQL unchanged. Final focused upgrade plus original migration suite passed.

[Initial outcomes](initial-outcomes.json), [CSS failure](initial-css-failure.json), [rental observation](initial-rental-browser-observation.json), [schema drift](initial-schema-drift.json) and [bounded trace excerpts](failure-trace-excerpts.json) are retained separately. Latest green outcomes do not erase initial failures.

Physical-device/screen-reader/production acceptance, overlapping-workload login root cause, production retention/cutover and13B-R1 claim/response/delivery remain open. No live AI/eKYC, payment or autonomous actions were tested or authorized.
