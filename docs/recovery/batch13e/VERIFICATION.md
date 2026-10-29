# Batch 13E verification ledger

29 October 2026, Asia/Taipei. Selected verification, not a claim that every repository command was run.

Implementation: `b9297ff86f09482ddfef2937a5dd9daff10ba440`.

35/35 distinct selected command groups passed finally; unit suite: 148/148. Seven commands were rerun after the implementation commit: recovery-room, recovery-room-production, recovery-room-migration, condition-claims-migration, rental-documentation-migration, migration and build:verify. Other selected checks ran on the same final source before commit. Exact timestamps and local artifact identifiers are in [final-results.json](final-results.json). Raw local logs remain under `/tmp/hustlen-13e`; portable focused evidence is committed here.

## Initial failure and correction

The initial condition-claims migration test failed because its old fixture included every migration except its target. The new dependent Room migration therefore ran before the missing claim tables. This was fixture ordering, not an application/authentication failure. Two historical fixture runners now stage only migrations preceding the target; all row/checksum/replay/rollback checks remain, with an added assertion that target and successors apply. Both corrected migration suites pass. No historical SQL was edited. See [initial-outcomes.json](initial-outcomes.json) and [migration-fixture-diagnosis.json](migration-fixture-diagnosis.json). Final reruns do not erase that initial failure.

No security timeouts, browser collectors, camera requirements or meaningful assertions were relaxed. Browser workloads were sequential; this batch does not resolve or reproduce the previously tracked overlapping-workload login intermittence.

## Actual results

| Command | Final | Test count where reported | UTC start | Owned cleanup |
|---|---|---:|---|---|
| `npm run build:verify` | PASS | — | 2026-10-29T06:04:51.227Z | True |
| `npm run lint` | PASS | — | 2026-10-29T05:59:21.955Z | not applicable |
| `npm run prisma-validation` | PASS | — | 2026-10-29T05:59:21.957Z | not applicable |
| `npm run test:account-security-ux` | PASS | ['ℹ tests 1'] | 2026-10-29T05:46:50.330Z | True |
| `npm run test:admin` | PASS | ['ℹ tests 7'] | 2026-10-29T05:44:46.162Z | True |
| `npm run test:announcements` | PASS | ['ℹ tests 9'] | 2026-10-29T05:54:27.994Z | True |
| `npm run test:authorization` | PASS | ['ℹ tests 8'] | 2026-10-29T05:44:06.319Z | True |
| `npm run test:chat` | PASS | ['ℹ tests 14'] | 2026-10-29T05:47:09.428Z | True |
| `npm run test:condition-claims-migration` | PASS | ['ℹ tests 1'] | 2026-10-29T06:04:38.451Z | True |
| `npm run test:condition-claims-production` | PASS | ['ℹ tests 1'] | 2026-10-29T05:40:40.356Z | True |
| `npm run test:condition-claims` | PASS | ['ℹ tests 1'] | 2026-10-29T05:40:13.566Z | True |
| `npm run test:database-principals` | PASS | ['ℹ tests 7'] | 2026-10-29T05:56:08.231Z | True |
| `npm run test:identity` | PASS | ['ℹ tests 1'] | 2026-10-29T05:42:08.501Z | True |
| `npm run test:integration` | PASS | — | 2026-10-29T05:42:30.282Z | True |
| `npm run test:item-documentation` | PASS | ['ℹ tests 1'] | 2026-10-29T05:41:47.498Z | True |
| `npm run test:item-studio` | PASS | ['ℹ tests 1'] | 2026-10-29T05:41:22.402Z | True |
| `npm run test:locations` | PASS | ['ℹ tests 7'] | 2026-10-29T05:54:02.327Z | True |
| `npm run test:login-readiness` | PASS | ['ℹ tests 1'] | 2026-10-29T05:43:46.519Z | True |
| `npm run test:meetup-session` | PASS | ['ℹ tests 6'] | 2026-10-29T05:43:05.478Z | True |
| `npm run test:meetup` | PASS | ['ℹ tests 12'] | 2026-10-29T05:49:26.322Z | True |
| `npm run test:mfa` | PASS | ['ℹ tests 16'] | 2026-10-29T05:44:37.741Z | True |
| `npm run test:migration` | PASS | — | 2026-10-29T06:04:45.797Z | True |
| `npm run test:moderation` | PASS | ['ℹ tests 10'] | 2026-10-29T05:55:11.578Z | True |
| `npm run test:platform-settings` | PASS | ['ℹ tests 8'] | 2026-10-29T05:54:52.503Z | True |
| `npm run test:recovery-room-migration` | PASS | ['ℹ tests 1'] | 2026-10-29T06:04:34.425Z | True |
| `npm run test:recovery-room-production` | PASS | ['ℹ tests 1'] | 2026-10-29T06:04:19.428Z | True |
| `npm run test:recovery-room` | PASS | ['ℹ tests 1'] | 2026-10-29T06:03:51.617Z | True |
| `npm run test:rental-api` | PASS | ['ℹ tests 13'] | 2026-10-29T05:45:27.272Z | True |
| `npm run test:rental-browser` | PASS | ['ℹ tests 4'] | 2026-10-29T05:45:57.918Z | True |
| `npm run test:rental-documentation-migration` | PASS | ['ℹ tests 1'] | 2026-10-29T06:04:42.100Z | True |
| `npm run test:rental-documentation` | PASS | ['ℹ tests 1'] | 2026-10-29T05:40:56.825Z | True |
| `npm run test:support-channels` | PASS | ['ℹ tests 9'] | 2026-10-29T05:48:25.418Z | True |
| `npm run test:support-staff` | PASS | ['ℹ tests 15'] | 2026-10-29T05:48:55.916Z | True |
| `npm run typecheck` | PASS | — | 2026-10-29T05:59:21.953Z | not applicable |
| `npm run unit` | PASS | — | 2026-10-29T05:59:21.951Z | not applicable |

## Evidence limits and preservation

[Browser evidence](browser-evidence.json): two actual authenticated browser sessions, persisted borrower proposal and owner acceptance, immutable terms, logout/login reopen, empty unexpected-error and external-origin collectors, widths 1440/820/390 and en/zh-TW. Original case remains OPEN; no completion, money or delivered notice.

Focused cases use explicitly synthetic physical-return records. Separately, unchanged full `test:meetup` performs genuine virtual-camera QR decoding at pickup and return: [pickup](camera-pickup.json), [return](camera-return.json). No real-world field-test claim.

[Migration evidence](migration-evidence.json) covers fresh/populated fixtures, transactional failure/replay and historical preservation. [Preservation](preservation.json) records 32 unchanged historical migrations, 390 protected files, unchanged old scalar/auth schema and fourteen-stage order/objectives. Only additive room tables/relations are introduced. [Cleanup](cleanup.json) records zero remaining owned Batch 13E databases/principals after a read-only maintenance identity check. No existing application database was migrated, reset or seeded. Normal production build passed without test-only font substitution; production room routes refuse access even with candidate flags.
