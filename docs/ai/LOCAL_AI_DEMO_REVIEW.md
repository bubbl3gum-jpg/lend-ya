# Interactive local AI demo — review

30 October2026, Asia/Taipei. Existing13F/R1 tooling only; no new AI capability, translation service, permissions or UI redesign.

Baseline `4fa6eb98379c63262953407efc1259a0425a8c85`; clean start on published R1. Isolated branch `feature/interactive-local-ai-demo`.

Implementation `df35b122a18f398347586e1c928fdf2618b4ec46` (preceding launcher commit `ba10d0da9764f8da84c49cc10eb01cc360a9566e`). Review evidence committed separately; no source edits in closeout.

## Start, play, stop

[Exact Mac instructions](local-demo/START_HERE.md). With your NEW guarded target exported as MRT_TEST_DATABASE_URL:

```sh
npm run demo:local-ai
```

The same explicit one-command form is `MRT_TEST_DATABASE_URL='<new-local-hustlen_test_*-URL>' npm run demo:local-ai`. Reuse the working local test-server credentials, never your original application database name. Existing Ollama and full Chromium must already be installed; the script checks9b presence and never installs/starts/stops Ollama or PostgreSQL.

Visible Chromium authenticates with the existing synthetic account through native login, opens the real Companion, then **waits indefinitely for human interaction**. Zero automated generations. Existing34 permitted synthetic selector contexts and gateway reused. Normal loading and real validation failures remain; no scripted fallback, cookie injection, hidden auth bypass or model-result coercion. Native confirmation dialogs wait for the human. Existing credential/config/session and inference limits retained, not renewed. No new case access or active staff grants. Real assigned-staff COPILOT remains separately gated.

Ctrl+C (or closing the entire browser) closes only its browser and recorded detached child process groups, reuses fixture cleanup, verifies the database marker before drop, removes its own socket/Next directory and only new recorded upload filenames (pre-existing filenames excluded). Ctrl+C during migration also interrupts that owned child promptly. No port/name kill or external-service shutdown. Hard kills/power loss cannot guarantee cleanup; marker failure refuses removal rather than adopting another DB.

## Actual verification

**14/14 final selected command groups passed;154 unit tests plus the headed launcher suite.** [Machine ledger and initial outcomes](local-demo/verification.json).

The launcher test used a real HEADFUL Chromium window under a Linux test-only Xorg dummy display, real persistence/private worker/native login and an external mock Ollama. A test-only loopback CDP wrapper acted as the human and refused any headless argument; the launcher exposes no such hook. It verifies production refusal, absent-model refusal, preservation of an existing marked sentinel database, startup SIGINT cleanup, zero automatic generations, two manual requests, valid English then visible Chinese502, language switching, window persistence, normal shutdown, all owned roles/DB/socket/temporary directory removed, pre-existing media preserved/new recorded upload removed, and PostgreSQL/Ollama test service alive after shutdown. Expected502 console error explicitly checked; unexpected page/console errors not suppressed. No authorization-success mocks.

This is **not a genuine Qwen-quality or Mac GUI measurement**. The application/gateway is unchanged from the owner's genuine Mac inference; actual Qwen calls occur when the owner presses Generate in this launcher. Chinese failure remains uncorrected/visible. No live model was installed or evaluated here.

| Command | Final | UTC start |
|---|---|---|
| `npm run build:verify` | PASS | 2026-10-29T19:52:11.903Z |
| `npm run lint` | PASS | 2026-10-29T19:52:42.799Z |
| `node_modules/.bin/prisma validate --config prisma7.config.ts` | PASS | 2026-10-29T19:52:42.802Z |
| `npm run test:authorization` | PASS | 2026-10-29T19:50:31.895Z |
| `npm run test:integration` | PASS | 2026-10-29T19:48:57.380Z |
| `npm run test:local-ai-diagnostics` | PASS | 2026-10-29T19:47:49.127Z |
| `npm run test:local-ai` | PASS | 2026-10-29T19:48:15.300Z |
| `npm run test:login-readiness` | PASS | 2026-10-29T19:51:11.821Z |
| `npm run test:meetup-session` | PASS | 2026-10-29T19:49:43.353Z |
| `npm run test:support-staff-production` | PASS | 2026-10-29T19:48:35.667Z |
| `npm run test:support-staff` | PASS | 2026-10-29T19:51:37.267Z |
| `node_modules/.bin/tsc --noEmit` | PASS | 2026-10-29T19:52:42.796Z |
| `npm run test:unit` | PASS | 2026-10-29T19:52:42.800Z |
| `npm run test:local-ai-demo` | PASS | 2026-10-29T19:53:51.493Z |

Initial outcomes remain separate: first headed run exposed Playwright's automatic dialog dismissal, fixed by leaving native dialogs unanswered for the human; new test-helper environment typing corrected; initial regression commands refused overlong database names produced by an external temporary coordinator before database connection. Only the coordinator's prefix was shortened. No database guard, assertion, browser collector or inference timeout was weakened. Final headed suite was rerun on exact implementation commit; other selected groups passed on unchanged legacy runtime plus the launcher source. Original full camera suite was not rerun for this tooling-only change; R1's prior camera evidence is historical, not relabelled as a new result.

## Preservation and cleanup

[Preservation](local-demo/preservation.json) verifies1879 prior files unchanged,33 historical migrations, all application/AI/auth/ownership/fixture/schema/roadmap source and lockfile preserved. Package adds only demo and headed-test commands; existing commands/dependencies unchanged. Normal production build without font substitution passed; production refusal and default/diagnostic errors remain intact.

[Cleanup](local-demo/cleanup.json): read-only verified maintenance query finds zero demo/regression databases or owned test principals. Only new guarded disposable targets used; no existing application DB reset/migration/seed. [Implementation hashes](local-demo/implementation-source-hashes.json).

No push, merge, deploy or production operations. No roadmap stage declared complete. Remain at this utility for manual local testing.

## Complete changed-file inventory

- `docs/ai/LOCAL_AI_DEMO_REVIEW.md`
- `docs/ai/local-demo/START_HERE.md`
- `docs/ai/local-demo/cleanup.json`
- `docs/ai/local-demo/implementation-source-hashes.json`
- `docs/ai/local-demo/preservation.json`
- `docs/ai/local-demo/verification.json`
- `package.json`
- `scripts/local-ai-demo.ts`
- `tests/local-ai-demo.test.ts`
