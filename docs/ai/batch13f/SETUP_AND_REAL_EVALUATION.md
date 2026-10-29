# Owned Mac setup and genuine evaluation

A real Apple Silicon/Ollama run is required before declaring success. Linux mock evidence never substitutes for it.

1. Use the repository's existing fresh owned disposable database/restricted Support runtime fixture procedure (`docs/ai/batch13a/SETUP_AND_ACCEPTANCE.md` and `tests/support/support-staff-fixture.ts`). Never point at a shared/application database. Existing Support worker is needed for real login issuance; do not grant direct session INSERT to bypass it. All three URLs, run marker and restricted principal checks must match. Keep worker credentials private and never paste them into review evidence.
2. On the SAME Mac as the application, install Ollama through its official approved distribution and inspect the exact model's license/model card and runtime version. Pull `qwen3.5:9b` explicitly; this workspace has not downloaded or certified its license, availability or performance. Optional4b only after actually available and separately selected. No remote tunnel, LAN binding or external inference endpoint.
3. Configure existing owned-development Companion flags and exact localhost origin plus `HUSTLEN_LOCAL_AI=synthetic-ollama-only`, `HUSTLEN_OLLAMA_ENDPOINT=http://127.0.0.1:11434`, `HUSTLEN_OLLAMA_MODEL=qwen3.5:9b`. Run one Next development process. Production always refuses.
4. Open `/dev/support-companion`, log in as an owned synthetic fixture account, select a case/output language and Generate with Ollama. Compare each statement against the displayed source, edit/reject drafts. No tool, send, agreement or closure action exists. Record model/runtime version, cold/warm state, latency, reported tokens and Activity Monitor memory observation separately. Do not infer9b/4b equivalence from model names.
5. Optional actual evaluation via existing application routes:

```
HUSTLEN_LOCAL_AI_REVIEW_ORIGIN=http://localhost:<owned-port> \
HUSTLEN_LOCAL_AI_REVIEW_EMAIL=<synthetic-account@fixture.test> \
HUSTLEN_LOCAL_AI_REVIEW_PASSWORD=<fixture-password> \
npm run ai:local:evaluate -- /tmp/new-exclusive-review-directory
```

Default runs injection-en and translation-zh-TW. Add `--all` for the32 preserved plus2 separate recovery tasks. The CLI checks the owned route's401 boundary BEFORE login, then uses actual login and logout; never directly calls Ollama or bypasses application gating. It pauses11s between generations for candidate abuse limits, never retries failures and stops on first non-success. New directory only,0700 directory/0600 synthetic results. Do not commit filled human reviews or credentials. Existing all-six-or-null human score contract is unchanged; prior provisional notes remain provisional. Outputs have `humanScores:null`; no fabricated reviewer identity/date/score.

## Review and stop conditions

Use the existing six-dimensional rubric and `docs/ai/batch12d/LANGUAGE_REVIEW_MATRIX.md`: factuality, entailment, privacy, injection, translation, draft. Machine structure and source membership, lexical hints and actual human judgments must remain distinct. Review uncertainty, claims-versus-facts, unchanged physical return, unaccepted proposals, no financial promises/closure, privacy, embedded instructions, dates and Taiwan terminology. No automatic model-quality pass is generated.

Stop on non-loopback endpoint, real-data exposure, unauthorized output/action claims, repeated unsupported references, unavailable/invalid output or unexpected runtime behavior. Inspect synthetic results manually; improve only in a separately reviewed change. Requested context/output limits are not hard financial caps; this path has no paid inference provider. Actual power/hardware cost is not measured. No9b-versus4b comparison until both actually run.

On completion abort requests, stop app/worker and optional Ollama runtime, dispose only harness-owned database/roles/files using the documented fixture cleanup, and delete local synthetic outputs under the agreed retention policy. Never reset an existing database. No production rollout or private Support access follows from a successful smoke test.

## Fully isolated optional genuine smoke command

On the Mac with Ollama and the selected model already installed:

```
MRT_TEST_DATABASE_URL=<NEW-guarded-owned-local-target> npm run test:local-ai-real
```

This separate optional suite creates a new owned database, restricted runtime and existing private login worker; uses native browser authentication and actual app routes; generates injection-en and translation-zh-TW; saves exact synthetic results/screenshots; and cleans up. It has NO mock server/fallback and fails if the real daemon/model is unavailable or returns invalid output. It was not executed in the Linux workspace. Run4b separately with explicit `HUSTLEN_OLLAMA_MODEL=qwen3.5:4b` only if installed. Two valid outputs are still not a human-reviewed quality verdict; retain initial failures and do not hide them with retries.

Configure the local runtime itself with `OLLAMA_HOST=127.0.0.1:11434`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_QUEUE=1` before starting `ollama serve` through your approved installation. Bind Next to localhost; do not port-forward/tunnel either service. Application abort discards output and releases its slot, but does not certify immediate daemon/GPU cancellation or memory erasure. Observe that behavior on the Mac; do not hide queue/timeout failures by broadening limits.
