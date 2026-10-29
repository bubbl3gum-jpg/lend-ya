# Play the existing local Customer Service AI

30 October 2026, Asia/Taipei. Existing13F/R1 application; no new AI capability or translation API.

## Mac startup

Use the same local PostgreSQL credentials/host that passed your genuine13F test, but choose a NEW nonexistent `hustlen_test_*` database name (at most63 characters). Keep your original application `DATABASE_URL` in the normal local environment; do not replace/reset that database.

Prerequisites: the repository's Node24+/dependencies, local PostgreSQL with the same owned-fixture create-database/create-role permissions used by `test:local-ai-real`, installed full Playwright Chromium, and your existing loopback Ollama with `qwen3.5:9b` installed/running. If Chromium is missing, install it once with `npx playwright install chromium`. The launcher does not install/download models or start/stop external services.

From the repository root, replace the placeholder URL with your guarded disposable target:

```sh
MRT_TEST_DATABASE_URL='postgresql://<local-test-user>:<password>@127.0.0.1:5432/hustlen_test_local_ai_<new_unique_suffix>' npm run demo:local-ai
```

Or, if that **new target** is already exported as `MRT_TEST_DATABASE_URL`, the complete startup command is simply:

```sh
npm run demo:local-ai
```

Do not paste credentials into chat or commit `.env`. Unsupported driver overrides, nonlocal targets, production mode, an existing target or missing9b model cause refusal. Never reset a database to bypass refusal; choose a fresh name.

## What opens

The launcher verifies installed9b metadata at numerical loopback11434, creates/marks a new database, deploys existing migrations and reuses the existing synthetic authentication/restricted Support fixture/private worker. Next runs at an automatically selected localhost port, under restricted runtime credentials. A **visible Chromium window** opens, fills the synthetic account's real native login form and navigates to `/dev/support-companion`. No cookie injection, mock login or general prompt endpoint.

Wait for Terminal's `Ready: http://localhost:<port>/dev/support-companion`. There are **zero automatic generations**. In the local-AI panel select a synthetic scenario/output language, press **Generate with Ollama**, wait through normal loading, compare advice with sources, edit/reject drafts and switch UI language. A failed Chinese output remains a visible error. R1's category-only diagnostic is available in that request's Network response; share only scenario/status/code/diagnostic if needed, never prompts/thinking/cookies/connection data.

Confirmation dialogs stay native and wait for your choice; the launcher neither accepts nor auto-dismisses them. Browser/application remain open after any number of scenarios. No timer closes the demo after one/two results. Existing inference60s/rate/concurrency, session/account/ownership, source validation and fixture expiry remain unchanged. Database-login credentials have the fixture's existing30-minute validity and its configuration is bounded to1hour; established connections can outlive login validity, while fresh connections/logins or requests may be denied. The launcher does not renew/extend permissions. If expiry interferes, stop and restart with a NEW target.

The original GUIDE remains offline. Assigned-case staff COPILOT still needs its existing independent assignment/assurance; this launcher issues no extra staff grants and does not activate it. The local panel accepts only the existing permitted synthetic catalogue. Do not paste real customer information, photographs, identities or evidence. No send/accept/settle/payment/custody action is added.

## Shutdown

Press **Ctrl+C once in the launching Terminal**, then wait for:

```
Removed this run's marked disposable database and restricted fixture roles.
```

Closing the entire browser also requests the same shutdown. Only recorded launcher-owned Next/worker/migration process groups and its Chromium instance are stopped. Your PostgreSQL container and existing Ollama service stay running. Existing ownership checks precede removal; roles are removed by the original fixture cleanup, followed by the marked database. The run's Next temporary directory and owned worker socket are removed. New listing-upload filenames recorded in that owned DB are removed only if absent before the demo; pre-existing files are preserved. No general storage deletion or force reset.

If cleanup reports incomplete, preserve the printed database/run identifiers and investigate ownership before manual recovery; never reset/adopt another database. SIGKILL/power loss cannot promise graceful cleanup. Repeated Ctrl+C does not intentionally bypass cleanup. Credentials, raw model responses and thinking are not printed by the launcher.

## Verification boundary

`npm run test:local-ai-demo` is a separate deterministic **headed** launcher test. On Linux it needs a test X display; without one it explicitly skips rather than substituting headless. It uses an external mock daemon on an exclusively acquired11434 and a test-only loopback CDP wrapper to act as the human. The production launcher has no mock/CDP/headless switch. Do not run that integration test over an occupied real Ollama port; it refuses to replace the daemon. Native login, two manual simulated calls, visible502, language switching, retained window, protected existing DB/file and Ctrl+C cleanup are checked. It is not genuine Qwen-quality evidence. Genuine Qwen on your Mac continues through the unchanged13F/R1 gateway when you click Generate.

No production deployment, existing-data migration, roadmap completion or new AI/translation capability follows from this utility.
