# Batch 13F — Local synthetic inference architecture

29 October 2026, Asia/Taipei. Development candidate, not production or quality approval.

## Verified baseline and reuse

Clean starting documentation HEAD `f6a4dfb43f85eb72a442ee317dbce48ae45e558c`, containing requested 13E implementation `b9297ff86f09482ddfef2937a5dd9daff10ba440` and evidence `7a986c96ab4bde7325fd71479b44987495162d7c`. Isolated branch `feature/local-ai-customer-service-batch-13f`.

13A Companion already supports deterministic GUIDE and assigned-channel COPILOT. Those code paths remain offline; their real scoped Support context is NEVER passed to the new gateway. Reuse `companionActor()` for current ACTIVE session plus actual owned-database marker/effective URL/restricted-principal verification. No new private reader, grants, staff identities, tables or migrations.

12C/12D existing 32 bilingual task manifests remain unchanged. Server selects only exact task IDs, builds sources internally and sends no client prompt, booking ID, report, URL, credential, assurance or tools. A separate authored `SYN-RECOVERY-CHARGER` supplement adds en/zh-TW fixtures (34 selectors total), without rewriting pinned datasets or review scores. It distinguishes a synthetic camera-return event from an unresolved accessory allegation and unaccepted recovery proposal. Synthetic context is not real-world proof.

## Transport and limits

`lib/local-inference/gateway.ts` provides a small reusable typed gateway seam with one Ollama adapter only. Numerical `127.0.0.1`, HTTP port11434, fixed `/api/chat`; the only accepted configured base is exactly `http://127.0.0.1:11434`. No DNS, proxy handling, redirect following, browser connection, exposed relay, hosted adapter or arbitrary path/endpoint. Treat other local processes as trusted host infrastructure; this does not certify OS isolation or protect a compromised Mac.

Exact model allowlist `qwen3.5:9b` (default) or explicit `qwen3.5:4b`. No silent fallback, installation or model download. `think:false`, `stream:false`, schema format, temperature0, num_ctx8192, num_predict2048 and keep_alive0s. Unload preference minimizes idle retention but adds cold-start latency; runtime/provider behavior still needs real verification. Entire request≤24000 UTF-8 bytes; response≤65536 bytes;60s abort; one in-flight request per Node process with immediate overload refusal (no queue). Six valid generation attempts per actor/minute, bounded1000 actor counters; no automatic retries. Use a single development app process. These process-local controls are not a distributed production rate limiter. Byte/context/output options do not establish actual tokenizer counts; token counts are reported by Ollama where valid, not invented or billed-cost guarantees.

Node request uses AbortSignal, bounded response buffering and no error body forwarding. Abort/timeout cleans listener/timer and releases concurrency; output arriving after cancellation is discarded. Native browser AbortController plus sequence fence prevent late cancelled results from restoring drafts. No complete prompts/responses in application logs. Operational unexpected-boundary errors use the existing metadata-only structured logger. Expected unavailable/timeout/validation results return static codes, not provider diagnostic text.

## Application authority

`POST /api/dev/support-companion/local` requires independent `HUSTLEN_LOCAL_AI=synthetic-ollama-only` plus existing offline Companion and owned Support runtime gates. NODE_ENV production refuses before inference; proxy independently returns404 for configured production. Exact localhost Origin/Host, no cross-site fetch metadata, custom `X-Hustlen-Local-AI:1`, JSON content and bounded strict object `{scenario}`. Recheck current account/session before output release. Responses private,no-store, Cookie-varying. GET has no inference implementation.

No input selects an actual record or database read operation. Authorization SQL for owned runtime/session remains; no Support ticket/channel/evidence retrieval is called by the local path. Existing COPILOT can separately read its authorized channels only under its unchanged restrictions; it never shares them with Ollama. All inference input is generated from committed synthetic fixtures.

## Output contract

Closed allowlisted DTO: knownFacts, participantClaims, uncertainties, nextSteps, requiresAgreement, humanReview and en/zh-TW drafts. Bounded arrays/text; source IDs must belong to that exact manifest. Known-fact references must be fixture CONTEXT, never participant-claim sources. Reject unknown fields, foreign refs, malformed JSON, unfinished response, invalid token metrics and overlarge body (invalid optional metrics become unavailable).

Only `message.content` enters validation; `thinking`, reasoning and all raw provider fields are discarded. No HTML execution, Markdown interpreter or action dispatcher. React renders plain escaped text. All output remains untrusted advice. A CONTEXT source can still be misinterpreted; structural/source-kind validity is NOT entailment, safety or truth. Prompt instructions are not an authorization system. Wrong but schema-valid claims require human review and may still occur.

Reviewer can compare actual synthetic sources, edit drafts locally or reject; nothing sends, accepts, closes, charges, submits recovery terms or mutates application state. Existing Resolution Room remains the only separately authorized coordination workflow; no connection from model output to it. No AI authority, real identity processing or financial action.

## Experience and future adaptation

Existing heritage surfaces, typography, locale, appearance and preference shell reused; no new assets, sounds, particles or redesign. English and Traditional Chinese operational copy. Original source excerpts remain exact; bilingual model quality is unproven until actual evaluation and human review.

A future hosted adapter would implement a small inference interface but requires separately reviewed transport, credentials, retention, approved data scope, hard billing controls and authorization. This local-only grant does not approve any hosted provider, production path, private export, Stage11 executor or arbitrary general prompt.

### Host/runtime assumptions requiring Mac verification

Bind the application to localhost and never publish/tunnel either port. Configure Ollama itself for loopback-only service, `OLLAMA_NUM_PARALLEL=1` and `OLLAMA_MAX_QUEUE=1`; application per-process counters do not coordinate several app processes or guarantee that a daemon immediately stops computation after HTTP cancellation. Runtime cancellation, unload, context/token behavior and memory pressure require real Mac observation. Never claim a transport abort proves GPU work stopped or memory was erased. Host administrative compromise is outside this application boundary. No model weights or new licensed assets are bundled; inspect exact distribution/model terms before downloading on the Mac.
