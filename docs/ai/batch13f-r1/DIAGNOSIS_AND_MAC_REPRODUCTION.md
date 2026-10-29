# Batch 13F-R1 — Qwen validation diagnosis and reproduction

30 October 2026, Asia/Taipei. Targeted observability repair; **the Chinese failure's exact cause is not established yet**.

## Baseline and supplied evidence

Clean starting branch `feature/local-ai-customer-service-batch-13f`, HEAD `f926659c128e85af6935e3cb72c6ab1ad4d65270`. Isolated branch `fix/local-qwen-validation-diagnostics-batch-13f-r1`.

Owner reports actual Apple Silicon/Ollama0.40.13/Qwen3.5:9b inference at that revision: `SYN-REVIEW-INJECTION:en` HTTP200, LOCAL_OLLAMA_INFERENCE,25,458ms,400 output tokens; `SYN-REVIEW-TRANSLATION:zh-TW` HTTP502/VALIDATION after about23s. Owner also reports33 fresh migrations, successful native auth/navigation and database cleanup. These are **owner-reported observations**, not independently rerun measurements here. Full failed provider content was not supplied and is not requested. The workspace remains Linux without an Ollama daemon/Mac terminal tool, so no genuine model requests were initiated here.

## What the observed502 means

At the starting revision all conditions below produced the same `VALIDATION` code. A normal60s timeout instead returns504/TIMEOUT; connection/non-success provider status maps to503 or429. Approximately23s and502 do not establish a timeout. English success demonstrates one accepted structured result, not overall factuality/injection resistance or Chinese quality.

The translation task is an unchanged pinned manifest with one source, `R1`, kind `PARTICIPANT_CLAIM`, no CONTEXT. Consequently `knownFacts` must be empty: citingR1 there is deliberately refused. A summary of that participant's uncertainty belongs in participantClaims, not promoted to verified application fact. This is one plausible cause, **not the confirmed cause**. Other possibilities include JSON/code fences, schema key/type/bounds violations, missing drafts, localized/unknown references, incomplete provider output or byte limits. Chinese characters themselves are not categorically rejected; both Chinese drafts and the unchanged34 bilingual contexts pass deterministic validation fixtures.

The Ollama format schema expresses shape/bounds; the server additionally enforces nonblank/control-character text, unique/case-local refs and CONTEXT-only known facts. Passing the provider schema never established all those conditions or factual entailment. No source/fact rule or schema is loosened here. No speculative prompt/model fix is applied without the failing category.

## Fixed diagnostic taxonomy

Only fixed enums are returned; no arbitrary field names, array indices, offending values/refs, excerpts, hashes, token material, raw JSON, thinking or provider error strings.

| Reason | Meaning |
|---|---|
| PROVIDER_JSON |200 provider body is not parseable JSON |
| RESPONSE_SIZE |Provider body exceeds unchanged65,536-byte limit |
| PROVIDER_ENVELOPE |Provider root is not an expected object |
| MODEL_MISMATCH |Reported model does not match exact configured model |
| INCOMPLETE_RESPONSE |`done` is not true |
| CONTENT_MISSING |Missing/wrong-type message/content |
| CONTENT_JSON |Message content is not parseable JSON; no fence stripping or repair |
| CONTENT_JSON_LIMIT |Content JSON invalid AND provider reports fixed `done_reason=length`; this is a provider-reported hint, not proof of causal truncation |
| OBJECT_SHAPE |Wrong object shape, unknown/missing key |
| ARRAY_SHAPE |Wrong array type or more than12 entries |
| TEXT_INVALID |Wrong type, blank, >2000 UTF-16 units or forbidden control characters |
| REFS_EMPTY |Statement lacks references |
| REFS_DUPLICATE |Repeated source references |
| REFS_UNKNOWN |Reference not in this exact synthetic context |
| FACT_SOURCE_KIND |Known-fact reference is not CONTEXT |

Fixed field labels: provider,root,knownFacts,participantClaims,uncertainties,nextSteps,requiresAgreement,humanReview,drafts,drafts.en,drafts.zh-TW. First failing condition is reported; it does not assert that no later condition also fails. Invalid/missing optional token metrics still become unavailable, as before, rather than causing502.

## Boundary and implementation scope

Default HTTP errors remain exactly `{ "code": "VALIDATION" }`. Additional metadata requires `HUSTLEN_LOCAL_AI_DIAGNOSTICS=owned-test-categories-only`, enabled only after all existing development/local-model, owned database marker/effective target/restricted principal, real ACTIVE session, exact Origin/Host/custom-header/content-type/closed selector and rate checks. A browser cannot request diagnostic activation. No authorization guard is replaced. Production still refuses even if both pilot/diagnostic flags are configured.

An authorized opted-in error adds only:

```json
{"code":"VALIDATION","diagnostic":{"version":"local-validation-v1","reason":"FACT_SOURCE_KIND","field":"knownFacts"}}
```

**This is an example, not the reason observed in the Mac test.** Ordinary logs remain unchanged; no diagnostic payload or rejected model text is logged. Successful output is unchanged and hidden thinking remains omitted. A safe serializer independently allowlists reason/field strings, including rejection of forged internal diagnostic strings.

The byte-limit path now rejects its promise with the static size category before closing the request, so subsequent stream errors cannot replace that category. This makes observation deterministic; it is not evidence that a stream race caused the reported Chinese failure.

Model request, prompt, JSON format schema, synthetic catalogue, source constraints,60s timeout,24,000-byte input limit,65,536-byte response limit,8192 context/2048 predicted-token options, concurrency/rate bounds and no-retry behavior are retained. No transport fallback, cleanup of bad JSON, invented output or automatic second generation.

## Mac reproduction — existing genuine command

1. Make the reviewed R1 revision available on the Mac and check out the implementation SHA listed in the report. This task does not push/merge/deploy automatically. Preserve the original failed13F artifact; do not overwrite it or call a retry the initial result.
2. Keep Ollama/model on the same Mac, numerical loopback only. Use the same9b model/runtime and unchanged limits; no mock server. Do not run `test:local-ai` or `test:local-ai-diagnostics` while real Ollama occupies11434: those deterministic integration tests deliberately require an exclusive mock bind and never replace a real daemon.
3. Use the existing guarded database setup and a NEW nonexistent target each invocation, with credentials kept local:

```sh
MRT_TEST_DATABASE_URL='postgresql://<owned-test-user>:<password>@127.0.0.1:5432/hustlen_test_13fr1_<new_unique_suffix>' \
  npm run test:local-ai-real
```

Retain the established application-reference environment used by the existing harness; never point the changing test at a real/shared application DB. The harness checks effective target/ownership, creates/deploys only the new target, provisions the existing restricted runtime/private worker, runs native login and disposes owned data/roles/files. No schema change/migration is introduced by R1.
4. `tests/local-ai-real.test.ts` now sets the diagnostic flag **inside that verified owned development app**. No additional browser/URL/header flag. Original English-injection then Chinese-translation sequence,60s model limit,65s response observer and180s suite timeout remain unchanged. A502 STILL fails; no suppression/retry.
5. Read `.test-artifacts/<run-id>/real-local-results.json`. It records the failure HTTP body with its static diagnostic before asserting200. Share only scenario,status,code,diagnostic (and separately any already-approved non-secret measurement). Do not paste raw content/thinking, prompts, cookies, DB URLs or worker credentials. The existing valid synthetic outputs in that file are not error diagnostics or human quality scores.
6. Confirm `Removed owned test database ...` and existing fixture cleanup. Keep the initial and rerun artifacts separately. If the reason is FACT_SOURCE_KIND, the test confirms deliberate source-kind enforcement; if CONTENT_JSON_LIMIT, inspect future model-budget/prompt choices under separate review without silently increasing limits. Other categories identify the exact failing stage for the next narrow investigation.

## Remaining unverified

No independent Mac reproduction, exact original rejected condition, Chinese valid-output outcome, model correctness/translation/injection score or new latency/token/memory measurement. Owner's genuine inference evidence supersedes the earlier historical statement that no real run had occurred, but does not make this repair a model-quality acceptance. Rerun the unchanged genuine command with categories and review that evidence before selecting a prompt/adapter correction.

No production AI, real customer data, hosted provider, new staff/Support authority, booking/custody/evidence/financial/deadline change or canonical-roadmap rewrite. Stop after diagnosis for review.
