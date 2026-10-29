# Batch 13F selected verification

29 October 2026, Asia/Taipei. Source implementation `b20f638cbaaa6e538a296d43f4d981a5ba0a0769`.

**34/34 distinct selected command groups finally passed. 152/152 unit tests.** This does not include a genuine Ollama run and does not establish model quality or complete Batch13F acceptance. `test:local-ai-real` and `ai:local:evaluate` were implemented but NOT run: no attached Mac/runtime. No9b/4b performance comparison.

## Exact selected commands

Final timestamps/exit codes/artifact IDs are preserved in [final-results.json](final-results.json). Raw local logs are under `/tmp/hustlen-13f`; artifact directories are local and not all committed. Portable browser/camera/preservation evidence is included alongside this ledger. Browser suites ran sequentially; some static checks overlapped browser work. No deliberately overlapping browser workload was added, and historical overlapping-login intermittence is not claimed resolved.

| Command | Final result | UTC start | Owned DB cleanup |
|---|---|---|---|
| `npm run build:verify` | PASS | 2026-10-29T07:43:36.612Z | True |
| `npm run lint` | PASS | 2026-10-29T07:48:30.599Z | not applicable |
| `node_modules/.bin/prisma validate --config prisma7.config.ts` | PASS | 2026-10-29T07:48:30.602Z | not applicable |
| `npm run test:account-security-ux` | PASS | 2026-10-29T07:49:29.559Z | True |
| `npm run test:admin` | PASS | 2026-10-29T07:41:31.419Z | True |
| `npm run test:ai-case-brief-disabled` | PASS | 2026-10-29T07:45:11.700Z | True |
| `npm run test:ai-case-brief-production` | PASS | 2026-10-29T07:44:57.137Z | True |
| `npm run test:ai-case-brief` | PASS | 2026-10-29T07:44:33.104Z | True |
| `npm run test:announcements` | PASS | 2026-10-29T07:42:22.930Z | True |
| `npm run test:authorization` | PASS | 2026-10-29T07:41:00.973Z | True |
| `npm run test:chat` | PASS | 2026-10-29T07:46:17.096Z | True |
| `npm run test:condition-claims` | PASS | 2026-10-29T07:40:35.420Z | True |
| `npm run test:database-principals` | PASS | 2026-10-29T07:48:08.211Z | True |
| `npm run test:identity` | PASS | 2026-10-29T07:39:13.175Z | True |
| `npm run test:integration` | PASS | 2026-10-29T07:31:20.851Z | True |
| `npm run test:item-documentation` | PASS | 2026-10-29T07:39:35.102Z | True |
| `npm run test:local-ai` | PASS | 2026-10-29T07:44:17.263Z | True |
| `npm run test:locations` | PASS | 2026-10-29T07:43:06.635Z | True |
| `npm run test:login-readiness` | PASS | 2026-10-29T07:32:49.721Z | True |
| `npm run test:meetup-session` | PASS | 2026-10-29T07:31:57.808Z | True |
| `npm run test:meetup` | PASS | 2026-10-29T07:34:46.296Z | True |
| `npm run test:mfa` | PASS | 2026-10-29T07:42:14.684Z | True |
| `npm run test:migration` | PASS | 2026-10-29T07:43:30.746Z | True |
| `npm run test:moderation` | PASS | 2026-10-29T07:48:15.149Z | True |
| `npm run test:platform-settings` | PASS | 2026-10-29T07:42:47.397Z | True |
| `npm run test:recovery-room` | PASS | 2026-10-29T07:34:17.383Z | True |
| `npm run test:rental-api` | PASS | 2026-10-29T07:33:10.591Z | True |
| `npm run test:rental-browser` | PASS | 2026-10-29T07:45:24.493Z | True |
| `npm run test:rental-documentation` | PASS | 2026-10-29T07:39:56.631Z | True |
| `npm run test:support-channels` | PASS | 2026-10-29T07:47:35.876Z | True |
| `npm run test:support-staff-production` | PASS | 2026-10-29T07:44:00.746Z | True |
| `npm run test:support-staff` | PASS | 2026-10-29T07:33:41.759Z | True |
| `node_modules/.bin/tsc --noEmit` | PASS | 2026-10-29T07:48:30.597Z | not applicable |
| `npm run test:unit` | PASS | 2026-10-29T07:48:30.600Z | not applicable |

## Software acceptance versus model acceptance

- New gateway unit tests cover32 preserved +2 separate recovery contexts, strict fields/references/source-kind checks, no browser prompt/URL/model substitution, production/endpoint/model refusal, disabled thinking, omission of raw thinking fields, malformed outputs, failure, one-in-flight limit, cancellation and virtual-clock timeout. Mocked functions are test-only seams, never a web flag or authorization-success substitute.
- New real-application test uses actual persistence, restricted runtime/private login worker, native browser login and an explicitly mocked numerical-loopback HTTP daemon. Seven mock requests cover valid output, malformed output, overload, redirect refusal, response-byte bound and English/Chinese UI generation. Invalid selectors/forged prompt fields/Origin/header/session fail before inference; suspended/deleted sessions denied. Original Booking/Listing/Dispute/SupportTicket/SupportMessage/claim/recovery-event snapshots remain equal. Browser edits never leave the page. No unexpected page/console/external-origin errors. Desktop1440, tablet820, mobile390 with no horizontal overflow and keyboard focus/action checks. This is NOT Qwen accuracy, latency, translation or injection evidence.
- Normal production build passes with inherited system-font correction and without test font substitution. Production test sets the local flag and still observes404 for GET/POST inference; existing Support tables/grants remain empty.
- Existing AI notebook enabled/disabled/production, integration/login, rental, QR/camera/meetup, identity/documentation/claims/recovery, Support/chat/moderation, account, Admin/MFA/authorization/principal, Locations, announcements/settings and migration suites retain meaningful checks. Genuine full camera decoding at pickup and return is recorded separately. No deadline, evidence/consent/GPS condition, authorization guard or browser collector was loosened.

## Initial failures and corrections

[initial-failures.json](initial-failures.json) retains five new browser-test failure runs (wrong login labels; missing private worker/incorrect destination; ambiguous draft/scenario labels), two TypeScript fixture-typing failures and one prefer-const lint failure. Controls now have explicit accessible labels; the fixture uses the actual login worker/redirect. These were not Qwen failures or evidence of a new legacy authentication regression. Initial failing databases were cleaned by the owned harness. All subsequent selected final groups passed; no broad error suppression or timeout increase.

The inherited no-model page-wide notice was narrowed when the optional panel is enabled, preserving original flag-off text. Final screenshots verify that distinction. Source was then frozen at the implementation SHA. Final local browser, build/production and static checks were executed on that commit; older selected groups used the same protected legacy code plus the candidate source before commit. Source hash manifest verifies no post-commit code change.

## Preservation and cleanup

No models/migrations or dependency versions changed. [preservation.json](preservation.json) records33 unchanged historical migration SQL files,399 protected old files, unchanged Prisma schema/lockfile and the entire prior roadmap as a retained prefix. All14 stage names/order/objectives and previous blockers remain. [cleanup.json](cleanup.json) records a verified read-only maintenance check for zero owned13F databases/principals. All changing groups used new unique guarded disposable targets, never reset/adopted an existing application DB. No push, merge or deploy.

Actual physical-device/screen-reader acceptance and real Mac/model evaluation remain unavailable. Process-local concurrency is not certification of daemon/GPU cancellation; see architecture/runtime assumptions.
