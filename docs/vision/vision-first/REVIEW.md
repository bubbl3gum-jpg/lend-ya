# Vision-first controlled provider prototype

31 October2026, Asia/Taipei. Owner-prioritized development candidate. Clean local baseline: `docs/translation-provider-pilot-readiness-milestone-4c`, `50e8808ee2ef8d5688e37745116251b31e9ecdc7`. Branch `feature/vision-first-controlled-provider-prototype`. No assumption that GitHub's default branch contains these local milestones; no push/merge/deploy.

## Actual audit and scope reset

Verified ancestry of M7A `1e85a4f`/`4b8a190`, M7B `f38ed3e`/`64248c1`, M4B `9615cc6`/`77f2093` and M4C `50e8808`. [Separate prioritized plan](../../roadmap/VISION_FIRST_DELIVERY_PLAN.md) provides KEEP / COMPLETE / DEFER / REMOVE-FROM-SCOPE inventory. Canonical14-stage roadmap remains unchanged; English project demonstration does not imply production launch or close Stage6–9 blockers.

Audited `lib/item-studio/service.ts`, `lib/rental-documentation/service.ts`, `lib/booking-evidence.ts`, `lib/rental-lifecycle.ts`, `lib/inspection/service.ts`, `lib/condition-claims/` and M7A/B. Reuse owner-bound versioned documentation, category/area checklists, prospective snapshot agreement, stage/uploader/time provenance, private participant evidence and receipt-derived return. No competing custody/evidence system, no choosing latest listing photos or replacing pickup originals. Stored rental evidence is normalized/re-encoded, not necessarily camera-original bytes; do not imply database-wide WORM guarantees for legacy photos.

M4B is in `lib/translation-sidecar/`, its API/component, optional `lib/local-inference/server.ts` capture hook and launcher flag. Preserve it and all authored i18n. Translation providers/broad bilingual delivery are removed from required MVP scope, not deleted. Existing Customer Service remains secondary; no new capabilities or private-record bridge. Vision demo disables text generation and translation in its own app child without changing the existing separate local-AI demo's purpose. No KYC/biometrics, financial/liability automation, new staff powers or AI execution authority.

## Implemented: extend M7B into a controlled hosted/local path

- Extracted M7B's existing pinned image preparation, instructions and JSON schema into shared functions rather than replacing the local adapter. Both candidates use one shared per-process Vision slot, including retaining that slot for outstanding uncooperative canceled work. M7B tests preserve original local payload/validation behavior.
- One explicit server `HUSTLEN_VISION_PROVIDER=GEMINI|OLLAMA` per run. No AUTO/default, browser model/provider/endpoint choice, switching or fallback. Choice is fixed during execution and rechecked before disclosure.
- Added Gemini adapter: fixed HTTPS `generativelanguage.googleapis.com:443/v1beta/models/gemini-3.8-flash:generateContent`; server API-key header on dormant live branch, no credential in URL/browser; no redirects/proxy routing, file API, image URLs or SDK dependency. Inline images are checked server-owned fixture derivatives only. Reuses byte/hash/dimension bounds and independent observation/paired-reference validation.
- Candidate limits remain4images,1536maxdimension,1MiB/image,4MiBaggregate,6MiBrequest,64KiBresponse,2048outputtokens,60s deadline/cancel, no retries. Local context8192; hosted text is a fixed bounded manifest/instruction plus bounded pixels, not an input-token-cost guarantee.
- Actual local and hosted execution remain source-level **hard-disabled before network/credentials**. Flags/key/request/approval-file cannot activate them. New route refuses LIVE. No authorized real photographs supplied, and current catalogue remains schematic-only. No private/customer image/evidence reader or upload added.

### Model verification limitation

[MODEL_SOURCES.json](MODEL_SOURCES.json): models/pricing/structured pages blocked by proxy403, attempted discovery JSON404; official Google Gen AI SDK README retrieved and documents inline image parts/response_json_schema. It mentions `gemini-3.8-flash-tts`, which is **not evidence of a Vision Gemini3.8 Flash model**. The requested candidate is represented provisionally as `gemini-3.8-flash`, not independently verified available. No substitution with TTS, Gemini2.5/3.1, Translation LLM or any other provider. Wrong-family/TTS responses rejected in tests.

Exact Vision model ID/capability/version, supported JSON-schema controls, pricing/quota/privacy/region/Taiwan eligibility remain unresolved and block genuine execution. Header/TLS/live API handling is implemented but not executed or claimed provider acceptance. No real key or model downloaded. Local Qwen artifact/license/runtime prerequisites remain as M7B; owner M4/24GB fit, latency and quality remain unmeasured.

## Working protected interface and observations

Retains `/dev/vision-prototype`, paired stage-labelled images, stored-parent/derived distinctions, hashes and original mock disclosures. New English review panel shows selected provider and explicit UNAVAILABLE, PROCESSING, FAILED, INSUFFICIENT_EVIDENCE, NOT_COMPARABLE and REVIEW_REQUIRED states; authored display scenario, Run MOCK review test and cancel. Live button disabled. Nothing runs on page load. No redesigned marketplace, new global CSS/sounds/effects or mandatory bilingual work.

Scenarios exercise coverage, noncomparability, comparison contract and malformed response. Mock comparison explicitly says no actual item difference detected. Observations show kind, checklist area, links to adjacent image refs, description, uncertainty and mandatory human review. Missing evidence never becomes proof of damage/no damage. No cause, responsibility, price, refund, custody or dispute decision.

`vision-hosted-execution-v1` adds requested/reported model identity, fixture/parent/derivative hashes, prompt digest, measured adapter latency, required human review and separate MOCK_TEST_OUTPUT/GEMINI_VISION_INFERENCE. Original local execution-v1 and old mock-only contract preserved. Provider envelope/content parsing excludes hidden thought/tool parts, incomplete/malformed output, invalid model or foreign refs. Hosted reported identity is not weight attestation. Source membership is structural, not image-region factual accuracy; prompt constraints are not proof of semantic safety.

Authenticated POST `/api/dev/vision-prototype` uses existing native ACTIVE session, exact fixture-actor allowlist, owned marked restricted runtime, Origin/Host/custom-header/plain JSON checks, closed `{mode,scenario}` input and12actor/minute. No browser-provided refs or provider can override server selection. Production proxy and server independently refuse despite flags. No model tool, Support action or Vision→Qwen CONTEXT/knownFacts connection.

## Usable demo and resource prerequisites

`npm run demo:vision -- --provider=gemini` uses existing private guarded MRT_TEST_DATABASE_URL startup configuration with a **new** target. Shared launcher provisions only its own fresh DB/roles/fixture, starts actual Next/private login worker, opens visible Chromium via native login to Vision and stays open. Ctrl+C stops only owned children and removes owned DB/roles/files. Existing PostgreSQL and Ollama remain running; no text-model unload/change. Gemini schematic mode needs no Ollama, Vision weights or API key; no keys forwarded into the demo child.

`--provider=ollama` is a separate explicit selection and requires an existing reviewed full server manifest pin; no fake installed hash generated. It still runs mocks. Do not download a model to try this candidate. Original `npm run demo:local-ai` retains its native model-presence check and functionality.

New Vision demo keeps Customer Service/translation outside the required flow; core English UI is sufficient. Existing bilingual modules are retained. For genuine local Vision, MacBook Air M4/24GB needs actual resource/memory-pressure/swap testing, sequential text/Vision calls and approved resource policy;6.2GB download is not runtime memory. Shared slot is Vision-only/per-process, not a distributed text-model scheduler.

## Actual verification and limits

See `verification.json` for exact outcomes and initial failures. Unit tests cover hosted configuration/payload, shared prepared hashes/limits, independent observations, source pairing/uncertainty/action rejection, malformed/model/TTS/oversize failures, shared cross-provider slot, cancellation/timeout, no retry and execution refusal despite synthetic credential-like strings. No real credential created.

Native browser tests use fresh owned restricted fixture and actual app/auth, **authored mock responses only**. They verify zero automatic/model calls, disabled LIVE, mock states, source links, malformed failure without a success, wrong actor/ref/provider/body/Origin rejection, session deletion, unchanged domain rows and responsive screenshots. Production flags deliberately configured. Existing M7A, Qwen, translation and handoff tests retained; no validator/deadline weakening. Exactly one intentional malformed502 resource console error asserted in its negative UI test; extra errors fail.

Initial new API test expected400 for wrong Origin, but existing proxy correctly rejected403 first. Corrected that exact assertion, not auth behavior. Initial normal build could not start because workspace disk filled from historical generated artifacts; no application build pass claimed from that failure. Current-task generated artifacts were preserved in private `/tmp` storage with original ignored paths linked; no evidence/database/stash/config deleted. Remaining checks rerun after space recovery. See ledger for actual results rather than assuming all selected groups passed.

**Genuine visual evidence remains unavailable.** Zero actual photographs, human labels, paid calls, model downloads or real damage findings. This is a functioning controlled interface and implemented provider payload/validation path, not completed photographic AI acceptance. Actual-photo revision/activation after owner inputs remains a small explicit prerequisite; do not claim schematics complete the final project.

## Immediate acceptance gate

[Three-case actual-photo plan](PHOTOGRAPH_ACCEPTANCE_PLAN.md): owner supplies authorized photos/provenance/labels; verify one exact model/provider; approve privacy, retention, resources/API charges/call caps. Then review the private photographic fixture revision and explicit live activation, perform at most three approved requests, and report actual results/failures/human visual judgments. No new broad framework or automatic next batch. No push/merge/deploy or private-photo export in this candidate.

Additional initial observation: headed Vision test checked the resource-console count immediately after response headers and observed0 before the failed UI settled. It now awaits the real visible failure and polls the same exact expected count with the existing default deadline; no error/assertion removed. Vision mode uses explicit disabled values for text/translation flags so Next environment-file loading cannot re-enable them.

## Exact changed-file inventory

- `app/api/dev/vision-prototype/route.ts`
- `app/dev/vision-prototype/page.tsx`
- `components/vision-review.tsx`
- `docs/roadmap/VISION_FIRST_DELIVERY_PLAN.md`
- `docs/vision/vision-first/MODEL_SOURCES.json`
- `docs/vision/vision-first/PHOTOGRAPH_ACCEPTANCE_PLAN.md`
- `docs/vision/vision-first/REVIEW.md`
- `docs/vision/vision-first/screenshots/desktop-mock.png`
- `docs/vision/vision-first/screenshots/mobile-mock.png`
- `docs/vision/vision-first/screenshots/tablet-mock.png`
- `docs/vision/vision-first/verification.json`
- `lib/vision-prototype/adapter.ts`
- `lib/vision-prototype/gemini.ts`
- `lib/vision-prototype/provider.ts`
- `lib/vision-prototype/review-server.ts`
- `lib/vision-prototype/slot.ts`
- `package.json`
- `proxy.ts`
- `scripts/local-ai-demo.ts`
- `tests/local-ai-demo.test.ts`
- `tests/local-ai.integration.test.ts`
- `tests/run-isolated.ts`
- `tests/support-staff-production.test.ts`
- `tests/vision-provider.test.ts`

Actual responsive mock captures: [desktop](screenshots/desktop-mock.png), [tablet](screenshots/tablet-mock.png), [mobile](screenshots/mobile-mock.png). Mobile visually inspected; authored mock identity and absence of real photographs explicit.
