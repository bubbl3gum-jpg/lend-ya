# R1 selected verification

30 October2026, Asia/Taipei. Source `8e097ddb33a15307cedae78a7a10390b46af7a4e`.

**15/15 distinct selected groups passed finally;154 unit tests.** Focused diagnostic-on/default-off, production refusal and normal build were rerun on the exact implementation commit. Legacy groups ran on unchanged protected legacy source during preparation; source hashes verify no post-commit implementation edits. No genuine Qwen run initiated here: the owner's Mac results are separately attributed in the diagnosis, not replaced with mocks.

| Actual command | Final | UTC start | Owned cleanup |
|---|---|---|---|
| `npm run build:verify` | PASS | 2026-10-29T19:09:34.218Z | True |
| `npm run lint` | PASS | 2026-10-29T19:03:39.409Z | not applicable |
| `node_modules/.bin/prisma validate --config prisma7.config.ts` | PASS | 2026-10-29T19:03:39.412Z | not applicable |
| `npm run test:authorization` | PASS | 2026-10-29T19:01:58.708Z | True |
| `npm run test:integration` | PASS | 2026-10-29T19:00:17.766Z | True |
| `npm run test:local-ai-diagnostics` | PASS | 2026-10-29T19:08:44.644Z | True |
| `npm run test:local-ai` | PASS | 2026-10-29T19:09:01.695Z | True |
| `npm run test:login-readiness` | PASS | 2026-10-29T19:01:38.573Z | True |
| `npm run test:meetup-session` | PASS | 2026-10-29T19:00:55.096Z | True |
| `npm run test:meetup` | PASS | 2026-10-29T19:03:37.877Z | True |
| `npm run test:rental-api` | PASS | 2026-10-29T19:02:30.959Z | True |
| `npm run test:support-staff-production` | PASS | 2026-10-29T19:09:18.769Z | True |
| `npm run test:support-staff` | PASS | 2026-10-29T19:03:03.616Z | True |
| `node_modules/.bin/tsc --noEmit` | PASS | 2026-10-29T19:03:39.407Z | not applicable |
| `npm run test:unit` | PASS | 2026-10-29T19:03:39.410Z | not applicable |

## Targeted assertions

- All34 existing synthetic selector contexts remain structurally valid; existing source-kind checks retained. Translation fixture explicitly asserts onlyR1/PARTICIPANT_CLAIM; valid Chinese text accepted, promotion to knownFacts rejected.
- Unit cases distinguish envelope/model/incomplete/missing-content/JSON/length-hint conditions; object/array/text errors; empty/duplicate/unknown refs and known-fact source kind. Forged internal diagnostic strings are discarded; error.message stays VALIDATION. No raw sentinel appears in safe DTO.
- Actual app HTTP diagnostic-on run covers all15 categories (14 matrix cases plus root-object failure), not Qwen behavior. Exact closed diagnostic DTOs asserted. Negative requests use existing separate owned fixture accounts to retain unchanged six/minute limit; no limiter override. Anonymous errors contain no metadata; default-off malformed output stays exactly code-only. Logs asserted free of raw/hidden-thinking/reference sentinels. Real native browser login, en/zh controls, unsent editable drafts, no-overflow and strict page/console/external-request collectors retained. Existing case/listing/booking/Support/history snapshots remain equal.
- Production configuration intentionally includes both local pilot and diagnostic flags; routes still404. Normal build uses no test-only font substitution.
- Full genuine virtual-camera pickup/return regression12 tests; other original integration, meetup-session, login, authorization, rental and Support/13A checks pass. No assertions/collectors/deadlines loosened, no automatic inference retries. Historical overlapping-browser login intermittence is not claimed resolved; browser suites ran sequentially, static checks sometimes overlapped them.

No selected project-suite initial failures occurred. A temporary preservation utility initially assumed every tracked path was a regular file; it was corrected to compare symlink targets before final auditing. This did not change an application guard or test assertion. Earlier13F and owner's Mac failure evidence remain historical and are not erased by these passes.

## Preservation and limits

[preservation.json](preservation.json):1861 prior tracked files unchanged (eight deliberately modified existing files excluded);33 historical SQL migrations, entire Prisma schema, canonical roadmap, private/auth/staff libraries, UI, catalogue, schema format and prompt/request options preserved. One additive npm test command only; previous commands/dependencies/lockfile unchanged. No new migration/model/permission.

[cleanup.json](cleanup.json): verified read-only maintenance check, zero owned R1 databases/test principals. All changing runs created new owned targets and cleaned them; no existing application DB reset/migration/seed. [diagnostic-browser-evidence.json](diagnostic-browser-evidence.json) explicitly says mock transport, not realQwen. [camera-pickup.json](camera-pickup.json)/[camera-return.json](camera-return.json) are actual virtual-camera QR diagnostics, unrelated to model quality.

The original Chinese failure's reason and an independently reproduced real-model correction remain UNVERIFIED. Mac rerun instructions in [DIAGNOSIS_AND_MAC_REPRODUCTION.md](DIAGNOSIS_AND_MAC_REPRODUCTION.md). No push, merge, deployment, production activation or real customer-data access.
