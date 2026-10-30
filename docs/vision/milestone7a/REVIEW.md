# Milestone 7A — isolated Vision prototype foundation

31 October 2026, Asia/Taipei. Development candidate only. Baseline: clean `docs/vision-provider-research-milestone-6`, `823a128088c5d21df16ab0604ec416002e80b377`. Implementation branch: `feature/isolated-vision-prototype-foundation-milestone-7a`.

## Audit and scope

Reviewed Milestone6 `docs/vision/milestone6/PROVIDER_RESEARCH_AND_RECOMMENDATION.md`, existing category registry, item documentation/studio, inspection/future contracts, photo access and normalization, original canonical roadmap and design contracts. Existing `lib/item-documentation/vision-contract.ts` already has bounded advisory observation fields; its input requires a real booking ID. New fixture-only contract reuses its field types without inventing a booking or duplicating custody. Existing unavailable-provider contracts and Qwen gateway remain unchanged.

Item capture/storage, deterministic brightness/detail hints, authorized private evidence reads and side-by-side presentation are implemented. Genuine image understanding is not. Rental upload normalization strips metadata and re-encodes; stored evidence is not necessarily camera-original bytes. Studio hash/provenance and snapshot behavior remain intact. No customer image/evidence read is added. Original14-stage roadmap and Stage6–9 blockers remain unchanged; Stage10 stays In Progress, no Stage11 authority. M5A–C and M3B genuine acceptance remain deferred.

## Delivered fixture and observation contracts

`lib/vision-prototype/fixture.json`, validated by `contracts.ts`, is pinned to digest `629ee0b6b37f913656d2fb3d154a7fd3b9ffb9e387d5e8cec3df9668ebd706c9` over JSON.stringify(parsed manifest), version `vision-fixture-v1`.

- One camera/body schematic pair: permitted P1/PICKUP and R1/RETURN, matching version1 camera checklist, explicit limitations and null capturedAt. IDs are server allowlisted.
- Two original project-authored PNG schematics and two480×330 PNG resize derivatives; no third-party artwork or camera photographs. Assets are private application files, not public URLs. Parent640×440 schematics are **stored fixture parents**, not camera originals, rental evidence or genuine physical observations. These are intentional UI diagrams; their timestamps do not pretend to be photography events.
- Separate immutable parent IDs/SHA256 and derivative SHA256/RESIZE metadata. Endpoint verifies bytes against manifest on every read. Changing bytes/manifest needs reviewed new pin/version; the endpoint does not import or accept browser manifests.
- Matched/unmatched view flag, exact area/stage pairing and explicit visibility limitations. Here matched means schematic layout only, not photographic comparability or validated condition.
- `groundTruth:null`: no real photographs/labels/reviewer identities were supplied. Version1 deliberately rejects non-null labels and photograph claims. A future photographic fixture revision must separately record actual authorization/license, stored-parent origin, capture-time provenance, protected hashes, transformation chain and genuine human label provenance. This candidate is **not** a general photo importer or populated evaluation dataset.

Observation envelope `vision-observation-v1` binds exact fixture digest, provenance **MOCK_TEST_OUTPUT**, humanReview **REQUIRED**, max12 observations. It cannot claim genuine inference. Kinds: VISIBLE_OBSERVATION, POSSIBLE_DIFFERENCE, INSUFFICIENT_EVIDENCE, NOT_COMPARABLE, MISSING_OR_OBSCURED_VIEW, HUMAN_REVIEW_REQUIRED. Each has exact allowed fields, valid same-area image refs, bounded nonblank text/uncertainty and advisory:true; unknown/status/financial/liability fields rejected. POSSIBLE_DIFFERENCE additionally requires both refs of a declared **matched** pickup/return pair in that area. Unknown, same-stage, wrong-area, unmatched and stale-digest comparisons rejected.

Allowed existing refs do not prove that text actually describes the correct pixels. A syntactically non-comparative text can still contain an unsupported comparison; deterministic schema cannot solve semantic entailment. All mock content is authored as test output, never a completed inspection. No original model response or real observation exists. Human review remains required, never complete. No observation enters Customer Service CONTEXT/knownFacts.

## Protected interface and authorization

Page: `/dev/vision-prototype`. Bytes: GET `/api/dev/vision-fixtures?id=P1&variant=derived` (or R1, parent). No write/upload/inference endpoint; POST always refuses.

Independent `NODE_ENV===development` and `HUSTLEN_VISION_PROTOTYPE=fixture-only`, plus explicit exact integer account allowlist `HUSTLEN_VISION_FIXTURE_ACTOR_IDS`. Uses existing `companionActor` for real current session/ACTIVE user, owned marked disposable database and restricted Support runtime. No role/grant issued. Flag or browser-selected ID alone is insufficient. Fixture actor IDs remain private server configuration, not exposed in UI. Existing Support worker/login unchanged.

Host/optional Origin/cross-site restrictions, exact query allowlist, no arbitrary file paths or external URLs, exact approved image IDs, private/no-store/Cookie variance, MIME/nosniff/sandbox/same-origin headers. Rechecks actor after loading bytes. Page denies anonymous/unlisted accounts; session deletion/suspension denies further bytes. Already-rendered schematics are not erased universally on revocation; they contain no customer material. No other private records or new staff evidence readers.

Proxy explicitly refuses both surfaces outside development even when the flag/allowlist is configured; server checks remain independent. Existing guarded runtime identity and database protections retained. No migrations/credentials/provider/transport added, no schema/data changes outside original owned test fixtures.

UI reuses HeritageSurface, SiteHeader, server locale/appearance, warm paper/ink/typography, restrained rules and responsive two-column layout. No new global CSS, assets fetched from stock, effects, sounds or unrelated redesign. Main views show derived stage-labelled schematics and checklist area; native disclosures show parent/hash/resize metadata and explicit original distinction. Provider panel says UNAVAILABLE; separate collapsed mock panel labelled MOCK/TEST, not model output. English and Taiwan Traditional Chinese operational copy; technical source IDs stay unchanged. Keyboard disclosures work without JS inference controls. No Generate/Download/Select Provider button.

## Official artifact/license/runtime prerequisite review

See `MODEL_SOURCES.json` for URLs, retrieval status, date and hashes. Only public metadata/documentation requests; no layer/weight/model downloads. Official Qwen README and repository LICENSE fetched successfully on31 October2026. Repository license is Apache2.0. README documents Qwen3-VL-8B-Instruct, multi-image input and Transformers>=4.57.0 for **that Transformers path**; do not call this an Ollama minimum requirement.

The **proposed, unverified** Ollama tag `qwen3-vl:8b-instruct-q4_K_M` and its registry manifest were both blocked by proxy403, as was the upstream8B-Instruct model card. Therefore this work **cannot confirm tag existence, exact quantization, model/projector layers, license embedded in that artifact, minimum Ollama build, manifest digest, total layer bytes or Mac compatibility**. It does not claim a reviewed fixed artifact. Do not run a pull based on this suggested name. Provider/artifact approval remains blocked until official metadata is accessible and reviewed. SDK/source version names are not model artifact identity.

Future exact artifact record must include registry/name/tag, immutable manifest/layer hashes, source checkpoint revision and weight license, quantization method, projector/vision encoder, context/image limits, processor/template, runtime minimum/version and actual download size. Do not hash an installed mutable alias and call it upstream license verification.

### Mac planning requirements (unmeasured)

Owner Apple Silicon RAM/free memory unspecified. For8 billion parameters, ideal4-bit **weight-only arithmetic** is roughly4GB decimal,8-bit8GB,16-bit16GB; not an actual artifact size or total memory requirement. Quantization metadata, vision encoder/projector, KV cache, image tokens, runtime, OS, Next.js/Chromium/PostgreSQL and existing text Qwen add memory. The upstream README contains a commented historical Qwen2.5-VL memory table; **do not use it as Qwen3-VL Mac requirements**.

Planning preference is a16–24GB-or-more unified-memory machine for a small quantized trial, but this is not a verified minimum or fit promise. An8GB Mac may be impractical alongside the application; no compatibility claim is made. Image count/resolution and quantization affect fine-defect visibility and memory, so review them explicitly. No Mac/Ollama Vision execution here; latency/memory/quality unknown.

Existing qwen3.5:9b text model and future Vision model can contend for RAM, GPU, bandwidth and cause model eviction/cold starts. Proposed future test serializes inference and records resident models/peak memory/swap/cold-vs-warm latency; do not automatically unload, stop or change the owner's text model/service. Owner must approve scheduling/resource changes. No timeout increase, hidden retries or service restart introduced.

## Verification and UI review notes

See `verification.json` for final actual results and initial failures. New deterministic tests cover exact pin/hashes, versions, source allowlists, stage/area/matching, forged refs/extra fields/uncertainty, and production/actor configuration. Actual application test uses fresh owned database, existing restricted fixture/native browser login and **zero calls to even the loopback mock Ollama**. Existing inference mock server is incidental harness reuse, never genuine inference. UI checks private image bytes/hash, anonymous/unlisted/suspended/revoked access, invalid selectors/Origin, desktop/tablet/mobile overflow, visible mock label, keyboard disclosures, parent/derived image loading and unchanged domain rows.

Production build/start refuses new surfaces with flag deliberately configured; original playground/handoff regressions retained. No genuine visual-model evidence or photographic accuracy result. No benchmark or customer/private images. Original camera/QR suites are not represented as rerun because this slice never changes their behavior; unit regression includes existing evidence contracts.

Initial verification corrections recorded honestly: TypeScript unknown-property array narrowing corrected after validation, no relaxed schema; first browser test inspected hidden lazy-loaded parent images without opening disclosures, corrected to open/scroll/await their load with ordinary unchanged assertion deadline. First production test found new page outside explicit proxy matcher (Next404 had different cache header ordering); added explicit fail-closed proxy/matcher instead of loosening existing test. No general browser error suppression or increased timeout.

Screenshots are actual application views under `.test-artifacts/<run>/vision-desktop.png`, `vision-tablet.png`, `vision-mobile.png` from final runner; metadata ledger records location. They show diagrams, not model output or owner visual acceptance. Review candidate only; no wider redesign acceptance inferred.

## Development verification / viewing requirements

Run `npm run test:vision-prototype` with your existing private `MRT_TEST_DATABASE_URL` pointing to a **new** guarded target; test uses existing isolated harness, supplies exact fixture actor, starts real app/browser, checks UI and cleans up. It is an automated test and closes afterward, not a new demo launcher. Existing `npm run demo:local-ai` is unchanged and does not automatically enable Vision or inherit new private allowlist settings.

For a manually provisioned existing owned synthetic runtime, an operator must explicitly configure the separate Vision flag and that fixture account's numeric ID, retaining all original Support/Companion runtime, marker, origin, database-principal and session requirements. Then authenticate natively and visit the page. Do not run Next with an application database or broad owner principal to bypass runtime guards. No standalone provisioning/download/inference command is added by this milestone.

## Future three-case procedure — approval required

No case photograph or human review label is supplied/approved yet. The three scenarios are plans, not populated assets or completed tests:

1. **Unchanged condition/different lighting:** actually authorized owner photographs of the same visible region, genuinely documented unchanged state, paired views; human states illumination differences and coverage.
2. **Clearly visible difference:** safe authorized object with genuine documented change or explicitly labelled removable simulated mark; genuine paired photographs/regions and human label distinguish simulation from physical damage. No invented causation/valuation.
3. **Obscured/non-comparable view:** actual occluded/unmatched authorized views; genuine human note that condition cannot reliably be compared, expected abstention.

Before any execution: owner approves exact photographs/rights, immutable hashes, actual label author/provenance, artifact/license/digest/runtime, resource schedule, local-only network behavior, retention, request/context/output/concurrency limits and stop conditions. A future separately versioned photographic fixture validator and genuine-inference provenance contract need review; current schematic-only/mock-only validator must not be bypassed or relabelled as real.

Proposed execution after separate approval: one model, one call/case, concurrency1, no retries (three counted calls). Preserve actual outputs/failures with allowed local artifacts; independent ref/pair/uncertainty validation and genuine human image-region judgment. Record actual model/quantization, processor/prompt hash, image counts/dimensions, measured latency/memory and failures. Zero labels/scores/latency invented. Stop on invalid provenance, privacy issue or unauthorized access. No expansion to full benchmark, actual booking retrieval, Qwen bridge, eKYC or automatic actions.

## Outstanding decisions / stop boundary

Exact Ollama artifact/license/runtime metadata verification blocked; Mac feasibility untested; no real authorized photographs/labels; no Vision provider selection or execution approval; no machine-observation Customer Service bridge; no production data/retention/export policy approved. These are prerequisites, not environment flags to bypass. No push, merge, deployment, weight download, live/paid inference, real database operations or next milestone authorized. Stop for owner review of this isolated candidate.

## Exact changed-file inventory

- `app/api/dev/vision-fixtures/route.ts`
- `app/dev/vision-prototype/page.tsx`
- `docs/vision/milestone7a/MODEL_SOURCES.json`
- `docs/vision/milestone7a/REVIEW.md`
- `docs/vision/milestone7a/verification.json`
- `lib/vision-prototype/assets/P1-derived.png`
- `lib/vision-prototype/assets/P1-parent.png`
- `lib/vision-prototype/assets/R1-derived.png`
- `lib/vision-prototype/assets/R1-parent.png`
- `lib/vision-prototype/config.ts`
- `lib/vision-prototype/contracts.ts`
- `lib/vision-prototype/fixture.json`
- `lib/vision-prototype/server.ts`
- `package.json`
- `proxy.ts`
- `tests/local-ai.integration.test.ts`
- `tests/run-isolated.ts`
- `tests/support-staff-production.test.ts`
- `tests/vision-prototype.test.ts`

Implementation SHA: `1e85a4f514210d425552b7779c9d90d461e52952`. Separate closeout records `verification.json`. Final selected results:184/184 unit, TypeScript, lint, fixture browser1/1, production refusal1/1, original playground1/1, M5C handoff1/1 and normal build pass. All selected owned databases cleaned up. No actual model or photographic performance result.
