# Milestone 7B — controlled local Vision adapter

31 October 2026, Asia/Taipei. Development candidate; no download, genuine Vision execution, external image transmission or model-quality acceptance.

## Baseline and model prerequisite audit

Started clean on `feature/isolated-vision-prototype-foundation-milestone-7a`, final HEAD `4b8a190e45bf7fd51c629fe980b90798be6328f4`; isolated branch `feature/controlled-local-vision-adapter-milestone-7b`. M6 research, M7A pinned schematics/mock contract, item documentation and evidence access reviewed. Existing text gateway, M7A `vision-observation-v1`, UI, source pin/assets, authentication, migrations and canonical14-stage roadmap unchanged. M5A–C and M3B genuine acceptance remain deferred; Stage10 In Progress and earlier Stage6–9 blockers preserved.

### Current official-source check

[MODEL_SOURCES.json](MODEL_SOURCES.json) records actual URLs, UTC retrieval date/status and SHA256 of accessible documents. Official listing and registry manifest attempts again returned proxy403. Official Ollama API documentation, Qwen repository README and repository LICENSE were fetched successfully. Repository Apache2.0 is verified, but not a full installed artifact's license/layer provenance. No model layer or weight was fetched.

Owner-supplied listing: `https://ollama.com/library/qwen3-vl:8b-instruct-q4_K_M`, Qwen3-VL8B Instruct, Q4_K_M, approximately6.2GB, Apache2.0 listing. **These listing metadata were not independently retrievable here**. Neither a complete registry manifest digest, projector/layer hashes, exact on-disk download size nor artifact minimum Ollama version is independently confirmed. No truncated digest or mutable tag is treated as a pinned installed artifact. Upstream Transformers>=4.57.0 applies to the documented Transformers route, not an inferred Ollama requirement. No claim of full prerequisite verification.

## Delivered architecture

No new API, page action, Generate button, upload, booking/evidence reader or provider-selection control. The adapter has no inference call site in the existing page. `inference-server.ts` is an unused server-only entry point requiring existing `prototypeActor` (owned restricted database/session/ACTIVE/exact actor allowlist), then the adapter, then a fresh actor check before disclosure. No model gets a ticket/action tool. Client cannot supply manifests, image bytes, URLs, prompts, model identities, assurance or transport implementations.

### Independent no-execution boundary

The actual execution entry and live HTTP transport both refuse through a private source-level **false** authorization constant. There is deliberately no environment/credential/approval-file/HTTP way to enable it. Valid model configuration is not execution authorization. `runMockVision` is an internal deterministic test seam with caller-supplied authored transport; it **always** produces MOCK_TEST_OUTPUT, never genuine provenance. It is not exposed to HTTP or UI.

Future approval requires a focused review/change to enable the real entry and route/operator workflow, not blindly toggling a flag. Default execution currently refuses **before** file decoding, metadata network requests or inference. Public documentation retrieval is separate research, not adapter model egress.

### Limits and transport

- Exact server model `qwen3-vl:8b-instruct-q4_K_M`. Explicit server config required; no fallback to qwen3.5 or different Vision model.
- Exact numerical `http://127.0.0.1:11434`; Node HTTP pins hostname/port/path, ignores proxy environment, rejects non200, never follows redirects. Only future GET `/api/tags` and POST `/api/chat`; no pull/delete/load/hosted endpoint.
- Full configured `sha256:` plus64 hex manifest pin required. Future transport checks local `/api/tags` exact name/full digest before and after inference. This detects ordinary tag changes but is **not cryptographic execution attestation**, nor proof of official registry/license/layer provenance. Model response must report exact tag. Concurrent malicious local retagging/local server deception remains outside this check; do not claim fully attested weights from a tag lookup.
- At most4 input references (current catalogue only2), unique server-allowed IDs. Only fixed M7A **derived** bytes are read by constant path mapping, SHA256 verified and decoded as PNG. Dimensions must equal manifest resize and be≤1536 each,≤1MiB/image,≤4MiB total; no arbitrary resolver/client data. Context8192, output2048 tokens requested, temperature0, no tools/thinking/streaming, Vision keep_alive0s. No claim that these settings guarantee exact processor token use, model fit or semantic quality.
- Request≤6MiB, provider envelope≤64KiB, observations≤12, each text/uncertainty≤1000 characters. Unknown JSON fields rejected in generated output. No silent repair, statement dropping, scripted success, fallback or retry.
-60-second request budget/cancellation timer, explicit cancellation, one in-flight Vision operation **per process**. No queue/auto retry; busy requests fail. Test seam can shorten deadline only. Local trusted fixture file I/O/decoding has fixed byte/pixel bounds; this is not an OS-level hard real-time deadline for a hung filesystem. An uncooperative pending transport keeps the slot until settled; canceled/timed-out work cannot admit overlapping jobs merely by returning early. Real Node HTTP aborts request. This is not a distributed or cross-text-model lock.
- Safe bounded error codes: UNAVAILABLE, EXECUTION_NOT_AUTHORIZED, MODEL_IDENTITY, INPUT, IMAGE_BINDING, LIMIT, CANCELED, TIMEOUT, TRANSPORT, RESPONSE_SIZE, PROVIDER_JSON, PROVIDER_ENVELOPE, CONTENT_JSON, INCOMPLETE_OUTPUT, OBSERVATION. Measured local latency on attempted work/success; preflight refusal may have null latency. No raw provider content, hidden thinking, logs, credentials, cookies, images or upstream errors returned/stored.

## New result contract and source safeguards

`vision-execution-v1` is additive; old M7A contract remains byte-for-byte unchanged and mock-only. New envelope binds fixture digest, model tag/full configured digest, image IDs/stages/parent+derivative hashes, prompt digest, measured latency, mandatory human review and advisory observations. No provider-authored provenance/model/prompt/latency fields are trusted to construct this envelope.

- MOCK_TEST_OUTPUT + MOCK_NOT_ATTESTED for every injected/mock run.
- LOCAL_OLLAMA_VISION_INFERENCE + PRE_POST_DIGEST_CHECKED_NOT_ATTESTED reserved for actual future built-in transport execution; currently impossible through the source-level refusal.
- Strict validator accepts only the expected provenance for the caller's execution path; mock envelope cannot be used where genuine provenance is expected. A structurally accepted hypothetical record is not proof it executed; no signature/attestation system is claimed.
- New ACCESSORY_UNCERTAIN kind, alongside M7A's visible, possible difference, insufficient, noncomparable, missing/obscured and human-review kinds. Reuses M7A observation field validation without changing that contract. Internal validation maps accessory kind to the existing comparison **check only**; it does not rewrite returned observations or relabel mock output. Both POSSIBLE_DIFFERENCE and ACCESSORY_UNCERTAIN require the relevant matched pickup/return pair and allowed same-area refs. Single-image uncertainty should use INSUFFICIENT_EVIDENCE instead.
- Allowed refs must also be among images actually sent, not merely somewhere in the catalogue. Exact fixture version/digest checked before bytes. Wrong source IDs/stages/area/hash bindings, unknown/financial/action fields, missing uncertainty, incomplete provider response or malformed JSON fail visibly.

Reference membership does **not** prove region correctness. Prompt says visible text/captions are untrusted, preserve uncertainty, abstain on poor coverage and never infer liability/cause/money/custody/identity. These instructions and syntax tests are not evidence of actual injection resistance or factual safety. Semantically unsafe statements inside otherwise valid free text still require real-model evaluation/human review; no claim that regex/schema prevents every unsupported assertion. No original evidence modified and no machine observation enters Qwen CONTEXT/knownFacts. Current schema still covers authored schematics only, not authorized photographs.

## Owner hardware and feasibility update

**Owner-confirmed:** MacBook Air, Apple M4,24GB unified memory; existing Customer Service model `qwen3.5:9b`; proposed Vision Qwen3-VL8B Instruct Q4_K_M. This corrects M7A's unknown-RAM prerequisite. No Mac execution or measurement performed here.

Approximately6.2GB download is owner-reported package size, not inference memory. Unified memory must also cover quantization overhead, vision encoder/projector, image tokens/KV cache, Ollama, OS, Chromium, Next/PostgreSQL and potentially resident text Qwen.24GB makes a conservative feasibility test reasonable but **does not establish fit**, minimum free memory, thermal sustainability or latency. MacBook Air thermal behavior during sustained work is unmeasured; no performance guarantee.

### Sequential resource plan (future owner approval)

1. Schedule a dedicated Vision-only trial window; no Customer Service generation, M3B evaluation or parallel browser workloads. Keep its working model/version/config unchanged. Never automatically unload/stop/replace the text model or existing Ollama service.
2. Read `ollama ps` to identify resident models and use Activity Monitor → Memory to watch Memory Pressure and Swap Used. A resident but idle text model can still consume memory; idle inference alone does not free it. Record baseline OS/app/free-memory/swap state and model residency before approving a call.
3. Start with **one matched pair/two derivatives**, longest edge≤1024 initially, existing context8192/output2048 cap, concurrency1, no retries. This is a future photo-derivative proposal, not new photographs in current fixture. Four images is a hard adapter maximum, not a recommended starting workload. Any changed derivative must have a real hash/transform manifest.
4. If text model residency or existing workloads leave uncertain headroom, **defer**. Ask owner how to schedule a safe window; do not silently unload it. Actual future orchestration needs an exclusive owner-supervised lease/window covering text and Vision starts (and a review for multiple processes). Current per-process Vision semaphore does not serialize the unchanged text gateway. Genuine execution remains blocked until this operational protection is approved.
5. During each approved call, stop further cases for yellow/red memory pressure, growing swap, system instability, model eviction, unexpectedly high memory/latency or any source/security error. Abort only this request; do not kill external services. Record peak memory, pressure/swap, cold vs warm timing, actual runtime/model identity and failure. Provider/server cancellation may not instantly reclaim all memory; verify before any next case.

In this batch, the hard no-execution boundary is the protection against text/Vision resource contention: zero Vision model calls can overlap. No working memory watcher, global resource scheduler or text-gateway change is claimed.

## Deterministic verification and limitations

`npm run test:vision-adapter` uses only authored fake responses and validated schematic bytes. Tests cover config/loopback identity, full-format pin, payload/source limits, independent observations/pair validation, malformed/oversized/incomplete output, hidden-reasoning exclusion, errors, cancellation/deadline, overlap refusal, no retry, mock/genuine separation and unenableable default transport. Test fixture digest is a synthetic64-hex test constant, **not an installed model digest**.

Existing `test:vision-prototype` exercises actual guarded app/native authentication, invalid actor/selector/origin/session cases, schematics and mock UI with zero model requests. Production-refusal suite deliberately configures development flags. Original playground and M5C handoff regression retained, inference explicitly mocked. No new HTTP inference endpoint exists, so server-only dormant entry's actor checks reuse the existing tested guard; it is not claimed as a new end-to-end authorized inference route.

Prompt-injection checks verify fixed instructions, refusal of forged refs/authority fields and that quoted untrusted text cannot invoke application actions. No injected photographic pixels were actually interpreted by a model, and actual semantic resistance remains unverified. Real HTTP metadata/transport branch is intentionally not activated or claimed tested against Ollama. No inference token/quality/latency results invented; measured test adapter latency is not Mac/Qwen latency.

Final command results, any initial corrections, preservation and owned cleanup are recorded in `verification.json`. No full QR/camera or marketplace regression claimed if not in selected ledger. No historical migrations, existing databases, evidence, UI/appearance or M3 corpora altered.

## Future three-case genuine photographic smoke procedure

**Blocked now. Separate explicit owner approval needed** for model download, exact artifact, image rights/hashes, inference scope, local-only execution, output retention and resource stop policy. No download/inference command is provided as something to run in this batch.

Before testing:

- Independently access official registry/model card; verify exact Q4_K_M manifest/layers/weight+projector license and full digest, runtime minimum and installed metadata after separately approved download. Record `ollama --version`; current installed version is not supplied/verified for this Mac update. Do not derive minimum version from Transformers or download size.
- Review a small photographic fixture revision (current M7A fixture accepts schematics/null labels only). Supply actual authorized object photographs and genuine human ground truth/provenance. The current prototype must not be relabelled into a real-photograph dataset, and mock result must not be relabelled as inference.
- Approve a focused operator entry/activation change, authoritative actor/owned-runtime checks, exact model pin, one-call limits and sequential resource plan. Keep no public Generate button until execution explicitly approved. No customer evidence reader or Qwen bridge follows.
- Approve private local result location/permissions, maximum retention/cleanup and access. No generated transcripts committed; no raw provider envelopes/hidden thinking/logged images. Current adapter has no persistence/exporter.

Cases, one real call each (three total), serial, no retries:

1. Same item area under different lighting, human documents unchanged condition and visibility. Expected careful uncertainty/no invented defect, not automatically scored pass.
2. Clearly visible real or explicitly labelled simulated difference, matched authorized pickup/return views and genuine human region label. No cause/valuation/liability inference.
3. Obscured/noncomparable view, actual coverage limitation and genuine human label. Expected abstention/coverage advice, not inferred absence.

Per case: record source/derivative hashes, stage/area matching, current session, exact model/runtime/config/prompt, actual success/failure, usage if available, measured memory/cold-warm latency, structured refs and human review. Independent refs/pair validation does not replace image-region judgment. Any retry or additional prefix/model/language call requires scope approval rather than running silently. Stop after three; no benchmark, extra evaluation system, production integration or next batch automatic start.

## Decisions and remaining blockers

Registry verification still blocked; exact installed artifact/digest/license/runtime unknown.24GB M4 fit, peak memory, contention behavior, latency and image-analysis quality remain unavailable. No authorized photographs/labels or genuine-output acceptance. Live execution source boundary and reviewed photo-fixture revision still required. Owner-approved resource/retention plan and exact3-call authorization required. No Vision→Customer Service source bridge, identity processing, financial/custody/dispute decision, production credential/activation or staff privilege. Stop for owner review.

Context-budget limitation: configured8192 context is a conservative request, not independent proof that an image processor fits every prospective photo set without truncation. Future photographic acceptance must check exact processor/image-token behavior and full input coverage; do not hide overflow by truncating sources or raising deadlines/context automatically. Current source catalogue consists only of two small schematics.

## Exact source-change inventory

- `lib/vision-prototype/adapter-config.ts`: exact model/loopback identity, full-format digest, bounds and safe error codes.
- `lib/vision-prototype/adapter.ts`: server-owned image loading/hash/decoder checks, bounded request, mock seam, hard-disabled fixed HTTP path, strict output validation, measured latency and cancellation/in-flight lifecycle.
- `lib/vision-prototype/execution-contract.ts`: additive execution envelope, source/image/hash/model/provenance binding and accessory uncertainty; existing mock-only contract untouched.
- `lib/vision-prototype/inference-server.ts`: dormant server-only existing authorization wrapper, no HTTP/UI entry point.
- `tests/vision-adapter.test.ts`: six deterministic tests using authored mocks; no model inference or weight download.
- `package.json`: focused adapter test command and unit registration only; no dependencies added.
- `docs/vision/milestone7b/REVIEW.md`: architecture, provenance/privacy audit, M4/24GB owner update, limits, future smoke procedure and blockers.
- `docs/vision/milestone7b/MODEL_SOURCES.json`: dated retrieval receipts, hashes and owner-supplied hardware/listing clearly distinguished.
- `docs/vision/milestone7b/verification.json`: metadata-only closeout ledger; no inference transcripts/private images.
