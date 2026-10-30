# Hustlen’ — supplementary AI development roadmap

30 October 2026, Asia/Taipei. Execution source: the owner's “MASTER AI DEVELOPMENT ROADMAP & EXECUTION DIRECTIVE” supplied on this date. Working implementation/audit record, not production policy or model-quality approval.

The canonical project plan remains [`docs/roadmap/MASTER_ROADMAP_14_STAGES.md`](../roadmap/MASTER_ROADMAP_14_STAGES.md). These ten AI milestones are a supplementary workstream, principally within Stage10 and related existing stages; they do not renumber, replace or complete the original fourteen stages. AI supports decisions, never replaces consent, verified evidence or authorized human judgment. Stage11 autonomous actions are not authorized.

## Execution checkpoint

Build → Verify → Demonstrate → Review → Approve → Continue. One milestone at a time. Stop after Milestone1 for owner acceptance. Do not infer approval of later work from this roadmap.

Audited clean local branch before this documentation increment: `feature/interactive-local-ai-playground`, HEAD `eeb557de3829bbb1b328ba285c40af461139cbb4`. Playground implementation `34c0c722959e9f8a57da0745b8c1b9bd80cfeaad`; successful R2 reviewed ancestor `3b4e247a018265657074dc60e5934298a6358183`; playable-launcher ancestor `baad3b670fcdeaf925c96359cc293b35575ae8e9`. This is the latest inspected workspace state, not a claim about every remote branch. R2 was previously published; the subsequent playground branch has not been pushed. The owner reports genuine Qwen9b success for SYN-BORROWER-A:en, SYN-REVIEW-INJECTION:en and SYN-REVIEW-TRANSLATION:zh-TW. That is owner-reported fixed-scenario acceptance, not five-case playground acceptance or a comprehensive evaluation.

Focused branch for this audit/roadmap increment: `feature/ai-roadmap-milestone-1-review`. Earlier unfinished launcher diagnostics remain in their existing Git stash. No stashed files are included. The original canonical roadmap is unchanged; some earlier checkpoint prose is historical, including its original “Mac results unavailable” statement. This supplement records the newer owner report explicitly rather than silently rewriting historical evidence.

## Status vocabulary and evidence rule

Use only **Not Started**, **Researching**, **In Progress**, **Implemented — Unverified**, **Verified**, or **Blocked**. “Implemented — Unverified” may have passing deterministic/application tests but still lacks required genuine model/manual acceptance. “Verified” requires evidence for that milestone's stated acceptance, not merely a passing mock. None of the milestones is currently marked Verified.

| Milestone | Status | Existing implementation and evidence | Remaining acceptance/dependency |
| --- | --- | --- | --- |
| 1. Free-form Customer Service AI playground | Implemented — Unverified | Real protected UI, strict free-form manifest builder, existing local Qwen gateway. Three-turn mock/browser evidence in `playground/verification.json`. | Five distinct fictional cases through actual Qwen; inspect usefulness and attribution; owner acceptance. |
| 2. Multi-turn conversational AI | Implemented — Unverified | Previously authorized playground already retains up to six user turns, displays AI separately and clears/reset-cancels. This directive adds no further implementation. | Five-turn genuine conversation, context/fidelity review, and explicit permission to proceed after M1. |
| 3. AI reliability and evaluation | In Progress | Offline corpora, unscored rubric/review files, deterministic failure tests and owner-reported three fixed-model successes. | Reproducible actual model report, observed success/failure/latency, bilingual human judgments. No fabricated scores. |
| 4. Independent language translation | Not Started | Existing bilingual model drafts and interface localization are not a dedicated translation adapter. | Provider-independent interface first when this milestone is authorized; provider research, privacy/cost approval before external or paid processing. |
| 5. Customer Service AI workflows | In Progress | Existing deterministic GUIDE/COPILOT and local advisory JSON/next-step/draft fields; restricted assigned-channel worker remains separate. | Validate supported policy grounding, clarification/escalation responsibilities and approved integration. No AI action authority. |
| 6. Vision AI provider research and selection | Not Started | Inert provider-independent Vision contracts and documentation/camera preparation only. | Current primary-source comparison, costs/assumptions, privacy, evaluation plan and explicit provider/architecture approval. Research only. |
| 7. Vision AI prototype | Blocked | No approved operational provider-backed Vision inference. | Complete and approve M6, permitted test photos, exact external-processing/cost authorization. |
| 8. Owner and Borrower AI expansion | Not Started | Item studio/documentation and marketplace search foundations are reusable, not working Owner/Borrower AI. | Approved separate scope; real eligible listings as truth; owner review before publication; Vision approval where used. |
| 9. Permissioned marketplace integration | Blocked | Scoped deterministic Support reads exist; local Qwen is isolated from real records. | Exact per-user scoped read design, data/retention/provider approval. Separate approval for any future write. |
| 10. Controlled pilot and launch readiness | Not Started | Owned local auth/DB guards and regressions are preparatory protections, not launch readiness. | Security/privacy/legal, quality/cost/capacity, accessibility, escalation, monitoring, retention, controlled participant acceptance and explicit production authorization. |

## 1. Free-form Customer Service AI playground — current stop point

Goal: owner writes fictional rental situations and receives genuine Qwen reasoning with structured advice, attribution, uncertainties, visible generation/latency and honest errors. Preserve fixed scenarios separately.

Implemented reuse (no duplicate system):

- `components/local-ai-playground.tsx`: fictional-input warning, Owner/Borrower selection, chronological user/advice display, loading elapsed seconds, returned latency, source details, explicit failures and new-conversation reset. Uses existing heritage visual classes; no redesign, assets, effects or sound.
- `components/support-companion.tsx`: exposes this only when the existing gated local panel is available; existing offline modes and fixed panel stay intact.
- `lib/local-inference/playground.ts`: exact `{mode,side,language,messages}` input; 1–6 user turns, 1000 UTF-16 code units/turn, no forbidden controls, manifest≤12000 UTF-8 bytes, server-generated source IDs and fixed explicit fixture timestamp. All tester input is PARTICIPANT_CLAIM; browser cannot supply CONTEXT or trusted identities/events. Overlimits reject, never silently truncate.
- `lib/local-inference/server.ts`: same local POST endpoint, owned restricted runtime, authenticated ACTIVE user, strict Origin/Host/header/content checks, rate limit and post-inference identity/session check. No new unrestricted endpoint or record retriever.
- `lib/local-inference/contracts.ts`: R2 source-aware generation schema and independent validator. Claims-only input requires zero knownFacts; unknown references and claim promotion fail visibly.
- `lib/local-inference/gateway.ts`: existing numerical-loopback Ollama transport, qwen3.5:9b default, unchanged60s/2048-output-token options, request/response caps, cancellation and one-in-flight bound. No retry, repair, tools or hosted fallback.
- `scripts/local-ai-demo.ts`: original headed interactive launcher, native synthetic login, restricted worker, fresh marked disposable DB and owned cleanup. Source unchanged in this increment.

The previously requested follow-up capability is already present. It resends **user turns only**, never previous AI replies as evidence. AI replies remain page-memory display only. Ambiguous references to earlier suggestions need clarification or restating the suggestion. No independent claim that this limited memory satisfies M2's genuine five-turn quality acceptance.

Acceptance: five different fictional cases return actual LOCAL_OLLAMA_INFERENCE results through the real browser, pass validation and receive owner review. Status remains Implemented — Unverified until observed. See [owner acceptance sheet](MILESTONE_1_OWNER_ACCEPTANCE.md) and [candidate review](playground/REVIEW.md).

## 2. Multi-turn conversational AI

Goal: five-turn conversation with relevant context, explicit user/model distinction, bounded temporary memory, loading/cancel/reset and no fabricated evidence. Earlier AI output is not verified fact; corrections are new participant claims. Existing inherited UI has a six-user-turn ceiling; do not expand it here. Actual five-turn fidelity is unverified. Stop for M1 owner review before new M2 development or acceptance programme.

## 3. AI reliability and evaluation

Evaluate factuality, attribution, claim/context separation, uncertainty, useful clarification/next steps, injection/privacy, unauthorized financial/custody recommendations, latency, observed generation rate and English/zh-TW quality. Reuse `lib/ai-case-brief/experiment.ts`, `review-corpus.ts`, `review-packet.ts`, `docs/ai/batch12d/REVIEW_WORKFLOW.md`, `LANGUAGE_REVIEW_MATRIX.md` and the established six-dimensional rubric. Preserve pinned corpus hashes and null scores. Existing all-or-none review-format limitations and provisional owner notes must not be converted into artificial complete scores.

Future coverage must include disputed damage, missing accessories, late return, conflicting pickup times, unverified handoffs, cancellation and unsupported accusations. Record actual initial failures and retries separately. Automated source membership is not entailment; structural success is not safety approval. No new live experiment or synthetic score generation in this increment.

## 4. Independent language translation

Future sequence: original user message → Qwen reasoning → source/safety validation → translation adapter → integrity checks → localized display. Do not automatically translate original evidence before reasoning. Initially en and zh-TW. Preserve canonical validated output, references, source kinds, dates, money and agreement/negation; language switching must not rerun reasoning. A translation failure remains a distinct visible failure.

Research providers before choosing; credentials stay server-side; no real customer data during pilot. Implement the independent contract only when this milestone begins. Exact provider, endpoint, terms/retention, budget, credentials and egress require explicit approval before external or paid processing. Existing Qwen bilingual drafts do not count as this architecture.

## 5. Customer Service AI workflows

Future workflow identifies issue type, asks clarification, explains supported policies, identifies missing data, separates reports from verified records, suggests voluntary steps, escalates to humans and drafts messages for review. Categories: scheduling, handoff, return confirmation, condition, accessories, cancellation, communication and escalation.

AI never approves refunds/deposit charges, assigns liability, suspends users, closes disputes, changes custody, confirms unverified handoffs, retrieves unauthorized conversations or sends messages without explicit authorization. Preserve Resolution Room and structured claims. The current scoped COPILOT is deterministic (`lib/assistant/server.ts`); its authorized Support snapshots are not routed to the local model. Do not confuse this preparatory behavior with permissioned real-data inference.

## 6. Vision AI provider research and selection — research only

There is **no operational accepted Vision provider**. `lib/inspection/future-contracts.ts` explicitly throws NO_APPROVED_VISION_PROVIDER; `lib/item-documentation/vision-contract.ts`, checklists, quality heuristics and durable item studio are foundations, not inference. Item-condition Vision remains separate from eKYC/liveness.

When authorized to begin research, compare current documented options: OpenAI, Gemini, Claude, AWS Rekognition, Azure AI Vision and suitable local/open-weight models; include specialized services if relevant. No provider selected, researched pricing claimed or capabilities presumed here.

Required comparison: image understanding; actual multi-image comparison; condition/accessory suitability; structured JSON and grounded references; API complexity; verified dated pricing and prototype cost assumptions; measured versus claimed latency/throughput; privacy/retention/residency/Taiwan constraints; scratches, lighting, angle and occlusion limitations; reproducible evaluation needs. Independent object detection is not damage assessment.

Deliver `VISION_AI_PROVIDER_RESEARCH.md`, matrix, cost scenarios, architecture/privacy/security recommendation, evaluation dataset/metrics, prototype plan and unresolved questions. Then **stop for owner approval** before external API integration, transmission or paid usage.

## 7. Vision AI prototype — gated

Only after M6 approval: isolated permitted-photo upload, clarity observations, source-linked differences, missing views, uncertainty and human review. Genuine approved-provider evaluation must record false positives/negatives, uncertainty, latency and actual costs. No causation, theft, custody completion, liability, compensation, deposit withholding or case closure decisions. Photos/angles/occlusion may prevent conclusions. Never extend generic item Vision to identity/biometrics.

## 8. Owner and Borrower AI expansion

Owner: reviewed listing descriptions/completeness, scheduling guidance and documentation; explicit owner publication. Borrower: search-first actual eligible listings, comparison and availability/pickup/terms guidance. Do not invent listings, prices, availability, permissions or verified condition. Existing documentation/search components are dependencies only. Vision suggestions require approved Vision integration. These assistants remain future separately scoped work.

## 9. Permissioned marketplace integration

Potential read integrations: listings, requests/agreements, scheduling/MRT, handoff/return/evidence, Support and Resolution Room. Every record must pass actual requesting-user authorization and scoped retrieval. No blanket access, opposing private Support merge or evidence/provenance mutation. Begin read-only; any write needs separate explicit design, approval, authorization and immutable auditing. Current local synthetic/playground inference is not authority to export actual scoped Support data.

## 10. Controlled pilot and launch readiness

Before moving beyond owned development: security/privacy/legal review, cost/capacity/performance, failure/recovery ownership, accessibility, escalation, retention, monitoring/auditing, genuine model-quality assessment and supervised participant acceptance. No production deployment without explicit authorization. Development flags or this file are never authorization tokens.

## Dependencies and unchanged restrictions

- Preserve original canonical Stages6–9 unfinished commitments: station suspension/restoration authorization; Support production access/delivery policies; announcement/settings publishing approvals; aesthetic/account acceptance. No claimed completion from this supplement.
- Original sessions, participant checks, QR/GPS/camera/consent/evidence, custody, immutable history and financial boundaries remain authoritative. No new migrations or existing DB operations.
- Only newly created owned guarded disposable DBs for changing tests. Cleanup only owned marked artifacts/processes; never stop the user's PostgreSQL container or Ollama.
- Fixed synthetic catalogue and owned fictional input only; no real customer records, hosted inference, translation API, operational Vision, credentials, production staff or Stage11 executor.
- Warnings prohibit sensitive input but cannot prove users typed only fiction. Strict validation is not factual/privacy certification. Ollama memory/cancellation behavior is not equivalent to guaranteed erasure.
- Keep `npm run demo:local-ai` working. Genuine Apple Silicon/Qwen observations and mock/test results remain separately labelled.
- No push, merge or deployment without separate authorization. The next decision is M1 owner acceptance; no new milestone automatically starts.

## Delivery and verification

This increment adds only the supplementary roadmap, M1 acceptance sheet and verification closeout. M1 application code is reused from the already committed candidate, not rebuilt. Exact current file/commit inventory and fresh test results are in `MILESTONE_1_ROADMAP_CLOSEOUT.md`. Prior complete candidate evidence is `playground/verification.json`; inherited R2 evidence is `batch13f-r2/verification.json`. No fresh production/model claim follows from inherited passing tests.
