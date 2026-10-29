# Batch13F-R1 — Genuine Qwen validation failure review

30 October2026, Asia/Taipei. **Targeted diagnosis delivered; actual Chinese root cause still requires the Mac category rerun.**

Branch `fix/local-qwen-validation-diagnostics-batch-13f-r1`. Clean baseline `f926659c128e85af6935e3cb72c6ab1ad4d65270` verified against supplied13F HEAD.

Implementation `8e097ddb33a15307cedae78a7a10390b46af7a4e`.

Evidence closeout **fbd7f54f32e5509e0b697f914fed60d378c31f6e**, indexed by a subsequent documentation-only commit.

The owner reports genuine9b inference: English injection200/25,458ms/400 tokens; Chinese translation502/VALIDATION/~23s, with fresh migrations/native auth/cleanup successful. These are supplied observations, not locally reproduced measurements. The starting implementation collapsed every validation condition into one code, so exact cause cannot be recovered from those facts alone.

Added15 fixed validation reason categories and fixed field labels, available only with explicit owned-development test opt-in AFTER all original guards pass. Default error body unchanged. No raw response, thinking, offending values/refs, credentials, arbitrary key names or source text in HTTP diagnostics or ordinary logs. Source/JSON/shape requirements remain strict; no prompt/schema/limit/model change, no repair/retry/fallback. Byte-limit rejection is classified before closing the stream, retaining deterministic diagnostics. This is not a claim that the Chinese result was repaired.

Translation's sole source isR1/PARTICIPANT_CLAIM; knownFacts must therefore be empty. Violating this intentional boundary is plausible, not confirmed. Missing/incorrect JSON, fields, drafts, source IDs, response envelope or byte limits remain other possibilities. No blanket Chinese-language rejection was found. Genuine Mac execution is unavailable in this Linux workspace; do not infer a semantic fix or model quality from deterministic tests.

- [Diagnosis, complete reason map, safety scope and Mac reproduction](batch13f-r1/DIAGNOSIS_AND_MAC_REPRODUCTION.md).
- [Tests and actual results](batch13f-r1/VERIFICATION.md), [machine ledger](batch13f-r1/verification-results.json).
- [Exact changed files](batch13f-r1/CHANGED_FILES.md), [implementation hashes](batch13f-r1/implementation-source-hashes.json).
- [Preservation](batch13f-r1/preservation.json), [cleanup](batch13f-r1/cleanup.json).

15/15 selected command groups passed,154 unit tests, genuine camera pickup/return regression, normal production build and diagnostic-flag production refusal. Exact-commit focused reruns passed. No selected project-suite failure; temporary audit utility symlink correction disclosed in ledger. No history/schema/roadmap/UI/authorization changes. All test databases newly owned and cleaned.

**Next Mac step:** make the reviewed R1 commit available locally and rerun the existing `npm run test:local-ai-real` with a NEW guarded disposable target. It now enables static categories inside its owned runtime, saves them in `.test-artifacts/<run-id>/real-local-results.json` and STILL fails on502. Share only scenario/status/code/diagnostic. Do not send raw model/thinking/prompt/cookie/connection data. A diagnostic reason is required before choosing a justified prompt/adapter correction; no timeout increase or silent retry.

No production AI, live/private customer context, staff activation, financial/custody action, push, merge or deploy. Stage10 remains In Progress and all earlier roadmap blockers unchanged. Stop for review.
