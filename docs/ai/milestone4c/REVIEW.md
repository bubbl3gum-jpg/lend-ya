# Milestone 4C — provider recommendation and three-call readiness

31 October2026, Asia/Taipei. **Research and trial proposal only; no provider activation or calls.** Baseline clean branch `feature/mock-translation-sidecar-milestone-4b`, HEAD `77f209378578c1e3f992a3463b8b6ab9d0199b9f`. Research branch `docs/translation-provider-pilot-readiness-milestone-4c`.

## Recommendation and readiness verdict

Recommend **Google Cloud Translation Advanced v3, synchronous translateText, explicit standard NMT model `projects/{owner-approved-project}/locations/global/models/general/nmt`**, MIME `text/plain`, one text/one target per call, **no glossary for the first three requests**. Exact endpoint proposal: `https://translation.googleapis.com/v3/projects/{owner-approved-project}/locations/global:translateText`.

This is **one recommended product, not an activated/owner-selected provider**. No Basic/v2, Translation LLM, Gemini, AutoML, Azure, DeepL or Qwen fallback. The global location is proposed only for synthetic anchors; it is not a Taiwan processing/residency guarantee. Do not move location or add a glossary silently.

Why this choice: accessible official protobuf/discovery documents explicitly distinguish NMT from Translation LLM, document the exact method/model/source/target/plain-text/contents mapping, and offer a narrow integration with the existing field sidecar. It avoids new local-model contention and custom model/glossary setup for a168-character baseline. This is a judgment about integration scope, **not measured Taiwan translation superiority, lowest verified price or certified privacy**.

**Not ready to execute.** Current commercial/privacy/region/language listings remain inaccessible here, no project/credentials/quota verified, no genuine-provenance adapter exists, and a concrete M4B T03 time-tokenization defect needs a separately approved correction. Provider selection and implementation/execution each require explicit owner approval. No runtime code changed.

## 1. Existing implementation audit

| Existing source | Verified behavior / preservation |
|---|---|
| `lib/translation-sidecar/store.ts` | Frozen cloned/revalidated canonical reply+manifest+model; opaque UUID, actor and exact session-incarnation ownership, five-minute/session-expiry TTL, timer/sweep, six/session,12/account,128/process,256KiB/canonical and4MiB serialized content budget. No durable transcript store/migrations; process restart/eviction fails stale. |
| `server.ts` | Strict development `mock-only` flag plus existing local/owned restricted runtime, native current ACTIVE account/session; token hash/session ID/birth/run binding kept server-side. Exact Origin/Host/header/content type/query checks, bounded reader,20/session/minute, fresh auth after operation. |
| `types.ts`, `contracts.ts` | Canonical/manifest/text digests, exact server-selected paths/source locale, separate original/target locale and requests/results/failures; no arbitrary text or source-kind override. Literal integrity and script hints are not semantic fidelity proof. |
| `engine.ts`, `mock.ts` | Only exact authored catalogue; MOCK_TEST_OUTPUT and model:null; unchanged canonical response; two unique successful request IDs/snapshot, identical replay, explicit unavailable/rejected/failed states. No network client/paid backend or credential activation path. |
| `components/translation-sidecar.tsx` | Explicit target/field request, original plus separate unreviewed mock display, cancellation/stale-sequence protection, no automatic translation or summary/submission overwrite. |
| `lib/local-inference/server.ts` | Optional snapshot metadata only after original validation; no gateway/model/prompt/source-schema changes. Existing fixed historical scenarios not automatically captured. |
| `gateway.ts`, `contracts.ts`, M5A knowledge, M5B notes, M5C handoff, M3/M7 files | Preserved. No source kind/claim/authority upgrade, private Support/booking/evidence read, Vision execution or new grant. |

### Confirmed readiness defect, not a provider failure

Read-only invocation of existing `literals`/`verifyLiteralIntegrity` on M4A's exact T03 anchors produced:

- EN source `Friday18:00 and Saturday10:00 are proposals; neither was accepted.` → `["18","00","10","00"]`
- Authored zh-TW anchor `週五18:00與週六10:00均為提議，雙方尚未達成協議。` → `["18:00","10:00"]`
- Result: **PROTECTED_VALUE_MISMATCH**.

The time regex's word boundaries depend on surrounding script. This is an actual deterministic false-rejection defect with the existing authored anchors, **not an observed Google translation or quality score**. No genuine output exists. Required future bounded fix: recognize the same exact literal time spans independent of adjacent Latin/Han text, test real time/offset/amount changes still fail, and preserve values/order. Do not remove literal checks, edit source punctuation/spaces or silently repair output. No fix made in M4C.

## 2. Current-source due diligence

[SOURCES.json](SOURCES.json) records20 official URLs attempted, five retrieved official source files and15 inaccessible pages (proxy403), with check time and SHA256 for fetched content. Both original and newer Google documentation domains were considered across M4A/M4C; inaccessible pages are references to verify, **not pages claimed as read**. No translation request, account access or credentials used. Official API source can confirm method shapes, not current account eligibility, quota, billing or legal conditions.

| Requirement | Google Cloud Translation Advanced | Azure AI Translator | DeepL API |
|---|---|---|---|
| Exact product/API | **Verified:** v3 translateText; official discovery root translation.googleapis.com, revision20260814; explicit general/nmt vs general/translation-llm. Recommend NMT only. | **Verified:** official stable Translator Text v3.0 REST spec, `/translate`, source/target parameters, general vs custom category. | **Verified:** official OpenAPI `/v2/translate`, paid api.deepl.com vs api-free.deepl.com; text/glossary/model-type fields. |
| EN→Traditional; Traditional→EN | **Unverified currently:** proposal en→zh-TW and zh-TW→en; exact bidirectional support for chosen product/model/account must be confirmed. General BCP47 fields are not a supported-language listing. | **Unverified currently:** proposal en↔zh-Hant; public language metadata GET blocked. Spec example zh-Hant for localized language names does not prove target support. | **Unverified currently:** proposed EN and appropriate traditional target/source codes must be checked from actual text-language capability table. zh-Hant in style/voice resources is not proof of bidirectional text/glossary availability. |
| Taiwan terminology | **Verified feature shape:** glossary_config; glossary/model same non-global location. Exact EN/zh-TW pair and term behavior unverified. Initial global pilot deliberately has no glossary. | **Verified feature shape:** Custom Translator category and dictionary/translation operations. Exact pair/custom dictionary controls unverified; not interchangeable with a Google glossary. | **Verified feature shape:** glossary APIs/model-type controls in SDK/OpenAPI; exact traditional pair/style beta applicability unverified. |
| Current price | Pricing page blocked; no verified current unit rate/credit/free allowance. | Pricing page blocked; no verified current rate/tier. | Pricing page blocked; SDK's free-character statement is not verified current account offer or private-data permission. |
| Quota/request limits | **Verified schema:** recommends total contents<30000 codepoints; contents list max1024 entries. This is not account QPS/per-minute character quota or confirmed balance. Quota docs/account inaccessible. Trial far smaller, but disabled/zero quota still possible. | Spec defines request-array/source/target/plain-text shapes; authoritative current service/account character/QPS quotas not verified. Do not treat historical spec annotations as current commercial quota. | Schema documents text operations; current account/tier/request caps not verified. Trial intentionally one tiny text. SDK retries must be disabled if ever selected. |
| Training/retention | Current data-usage page blocked. No verified no-training/zero-retention/DPA claim. | Current privacy page blocked. No verified no-log/zero-retention guarantee. | Current data-security page blocked. No verified private-data/training/retention guarantee. |
| Region/Taiwan eligibility | Global model path **verified**, Taiwan account/billing eligibility and exact processing locations unverified. Nearby/Taiwan cloud region ≠ NMT availability/residency. | Credential region/endpoint concepts in official materials, but chosen current region, residency and Taiwan signup eligibility unverified. | Current account eligibility, routing and residency unverified; European corporate location is not an execution guarantee. |
| Credentials/deployment | **Verified:** v3 OAuth cloud-platform/cloud-translation scopes in discovery. Future approved project/billing/API enablement, least-privilege principal/ADC and exact IAM requirements must be confirmed; no key created. | Spec describes subscription/bearer authentication, region requirements depending on resource; current account setup/least privilege unverified. Never put secrets in URL despite historical spec examples. | SDK requires API auth; Free and paid endpoints distinct. No key created; paid/free privacy cannot be assumed equivalent. |
| Model reproducibility | Explicit NMT model family, not immutable provider weights/build. Record requested model and actual returned model if supplied; otherwise null. | API version/category is not a pinned deployed model build. | Model type/model_type_used is not immutable model build. |
| Error handling | Future adapter fails any non2xx/malformed response; no retry/fallback. **Verified:** region mismatch can return INVALID_ARGUMENT400. Current account errors/quotas untested. | Source spec includes typed error shape; current operational errors untested. Proposed fail-closed policy independent of vendor error strings. | **Verified SDK:** automatically retries transient429/5xx/network failures, default up to five retries; a trial would require explicit zero retries. |

No provider has measured rental-domain fidelity, Taiwan-native wording, latency or reliability here. Traditional script support alone does not guarantee 物主/借用者, 押金/租金, 尚未確認 or neutral liability wording. Current pricing, legal guarantees, training and regional support are deliberately **not inferred from SDK examples**.

### Decision matrix (qualitative judgment, not quality scores)

| Selection factor | Google Advanced NMT | Azure Translator | DeepL |
|---|---|---|---|
| Narrow existing field-sidecar integration | Preferred: explicit one contents→one translations mapping/model path | Plausible equivalent, but different API/credential mapping | Plausible once exact traditional language pair verified |
| Rental terminology progression | Glossary-capable route documented; adding glossary needs non-global region/pair approval | Custom/category or dictionary route needs pair/setup verification | Glossary/style controls need exact pair verification |
| Privacy readiness | Blocked pending current terms; synthetic-only proposed | Equally unverified; no automatic privacy advantage | Equally unverified; no free-tier shortcut |
| Expected cost assessment | Precisely bound tiny source payload, **rate unavailable** | Rate unavailable; cannot rank cheaper | Rate/subscription availability unavailable; cannot rank cheaper |
| Pilot complexity | Preferred no glossary/custom model; one API and one fixed model family | Extra selection work without measured advantage now | Additional language/model compatibility uncertainty |

Recommendation is conditional on owner choosing this exact Google product and resolving blockers. If Google fails due diligence, **stop for a new owner decision**; no silent switch to another service/model/location.

## 3. Exact three-call proposal

Machine-readable, non-executable proposal: [THREE_CALL_PROPOSAL.json](THREE_CALL_PROPOSAL.json). No provider outputs or scores exist; fields remain null. Exact UTF8 strings, no BOM/newline/whitespace normalization; hashes cover raw string bytes, not JSON wrapper. T03's unusual lack of spaces is intentionally preserved from M4A, not silently corrected.

| Task / direction | Exact source | Unicode scalars / bytes | SHA256 |
|---|---|---:|---|
| T03 en→zh-TW | `Friday18:00 and Saturday10:00 are proposals; neither was accepted.` |66 /66| `72fb0688dfd6d61001f4def282e1780e6475c231f2bf01f16c516bd157949ff0` |
| T05 zh-TW→en | `借用者表示已歸還，但尚未驗證實際收件。` |19 /57| `9cbe36e48c1ae37edf5bde5ad8d9fe19d459e07f320a3e52e4e1f6e3588175ec` |
| T08 en→zh-TW | `NT$1000 is the stated deposit; NT$400 is the rental fee. Neither is confirmed paid.` |83 /83| `b272e420e7ce3429394dfa7d7cf03d863d227e4073f0dc2d0a6d3556b949b5f6` |

**Total168 source scalars,206UTF8 bytes.** Exactly three planned translateText requests, each one source string/one target. Zero retries, no batching targets, no detect-language, back-translation, glossary creation, model comparison or hidden replacement call. At most three actual translateText attempts; if scope/auth/source/integrity/operational stop occurs, remaining items stay NOT_RUN and actual count is reported honestly rather than filling missing successes. Authentication/any read-only account preflight must be separately approved and completed before run; no uncounted translation calls.

Limits proposal: concurrency1;30s total deadline per HTTP translate attempt;120s run cap after fixture snapshots issued;128 scalars/384bytes maximum per source and256scalars/768bytes across run; response≤64KiB, translated field≤1024 scalars. Exact hashed contents only, no context/prompt prefixes or hidden extra fields. Snapshot TTL stays five minutes; expiry requires stop, not extending TTL or reconstructing from browser text. Caller explicitly sets mimeType:text/plain (Google default can be HTML), sourceLanguageCode and targetLanguageCode; no auto-detect or transliteration. Fixed explicit global NMT path. No other inference/provider calls.

### Canonical-source and genuine-provenance prerequisite

M4B intentionally accepts snapshots of validated Qwen replies and only MOCK_TEST_OUTPUT. The three M4A strings are **authored synthetic anchors, not observed Qwen output**; they cannot be inserted into a browser request or relabelled as genuine Qwen/model translation.

Future bounded implementation proposal: one operator-only, server-allowlisted three-fixture seeding path under the existing owned native actor/session guards, reusing SnapshotStore, Advisory validation and source-aware mapping. Explicit canonical origin AUTHORED_SYNTHETIC_NO_QWEN/model NONE, each source remains PARTICIPANT_CLAIM (not a rental fact). No new arbitrary-text endpoint or marketplace retrieval. This avoids running deferred Qwen/M3B to obtain sources. Exact fixtures/provenance and the small T03 parser correction require implementation approval first.

Add genuine Google translation provenance separately, retaining mock types/behavior: e.g. GOOGLE_CLOUD_TRANSLATION_API with actual v3/requested-model/returned-model-or-null and measured latency. Do not relabel mock successes as real or pretend a managed model path is immutable weights. Reuse existing source/field/digest/literal validation, session checks, original-preservation UI and frozen handoff contract; do not build another snapshot/evaluation framework. M4C creates none of these runtime changes.

## 4. Charges and privacy constraints

Current official prices **unverified**: https://cloud.google.com/translate/pricing . No remembered USD/million rate presented as current. If verified billing is `P`USD/million source characters for one target, and these168scalars equal the provider's billed unit, estimated variable charge = **0.000168×P USD**; hard source cap256 would imply0.000256×P under that same verified rule. Source byte count206 is not the character count. Minimums, credits, setup/billing charges, regional/model surcharges and taxable currency conversion unverified; no total invoice or free trial guarantee.

Owner must confirm current unit/counting rules and explicit dollar cap before execution. Google budget alerts are not assumed to be hard spending stops. Fixed endpoint/model/three-attempt/character caps constrain scope, but do not prove an all-account financial cap or prevent compromised credentials. If a reliable approved cost bound cannot be established, keep execution blocked. Timeout/disconnect can still be charged; record attempted call, no retry. No quotas/billing/project actually queried using credentials.

Private-data policy: synthetic anchors only, no names, customer records, Support conversation, booking IDs, handoff edits, photographs or identity material. Only the single selected string is proposed for export; source IDs/kinds/ref mapping/authority stay local immutable. Global execution requires explicit owner acceptance for this synthetic-only scope; it establishes no production residency/privacy approval. No claim of Taiwan eligibility/PDPA compliance or training/retention exclusion without current terms/legal review.

### Output retention and failure records — proposal, not implemented

Approve private local ignored `.test-artifacts/translation-pilot/<approved-run-id>/`, directory0700/files0600, maximum7days then explicit marked cleanup (earlier owner deletion allowed). No output persisted now. Current M4B memory TTL is not a disk-exporter/retention mechanism; a small scoped exporter/cleanup needs approval before a future trial.

Store: original task/source hash and canonical binding, exact one-target request identity, actual attempt/time/model-family/location/API/latency/status (validate model resource but redact its project component), allowlisted translatedText, structural/literal checks, safe failure code and genuine review notes only when provided. Preserve original returned translation unchanged **within output bounds**, including rejected text for authorized review; never repair into success. Malformed/oversized output records bounded reason and actual known byte/status metadata, not an unlimited raw envelope. No bearer tokens, credentials, cookies, private account/billing identifiers, raw provider diagnostics or hidden reasoning. Provider-side retention/deletion is separate and unverified.

Any non2xx, timeout, malformed mapping, unknown/missing extra text, altered literals/field binding, expired session/snapshot, budget violation or unauthorized destination stops the attempt and can stop the remaining run. Original canonical response remains unchanged; failed translation is not displayed as available. No alternate provider or new Qwen reasoning. Actual provider output may change script/spacing/number formatting; record legitimate rejections, not validator bypasses. T03's known false rejection must be fixed under approval before the trial.

## 5. Native human-review criteria

Use existing six dimensions unchanged: factuality, entailment, privacy, injection, translation, draft;0 material incorrect/unsafe,1 substantive correction required,2 materially faithful/useful. Partial/N/A review with rationale allowed through additive translation review binding; no changes to M3 historical corpus/score schema. Reviewer identity/date only when genuinely supplied; every score currently null. No automatic grade from fluent prose, script detector, equal number sets or back-translation.

- **T03:** both Friday18:00 and Saturday10:00 remain proposals; neither accepted, no invented calendar date/confirmed pickup. Natural Taiwan wording such as 雙方尚未達成協議, not a forced agreement.
- **T05:** borrower is the reporting party; reported return does not become verified physical receipt, and lack of verification does not imply borrower still holds the item.
- **T08:** NT$1000 remains 押金, NT$400 remains 租金; neither confirmed paid; no deductions, refund, liability or payment-authority promise.
- Across all: sources/refs/kinds/role/authority metadata unchanged and outside provider text; preserve negation/time/amount association, not just literal character sets. Separate fluency and faithful meaning. Any material changed agreement, certainty, liability, role or amount is a stop/review finding regardless of stylistic quality. Three examples cannot establish release safety.

## 6. Exact approvals before any implementation/execution

| Decision | Required owner action / current state |
|---|---|
| Provider choice | Approve exact Google Advanced v3/global standard NMT recommendation, no fallback. **Pending**. |
| Current capabilities | Verify en↔zh-TW source/target for exact model/account; no Simplified/script substitution. **Unverified; blocks execution**. |
| Commercial/privacy/region | Confirm current pricing/counting/quota, project/Taiwan eligibility, data training/retention/DPA/processing region; explicitly accept global synthetic-only export. **Unverified**. |
| Credential deployment | Approve one project/API/billing owner, least-privileged OAuth/ADC principal/scopes and secret handling, no key in source/browser/URL. **None created**. |
| Bounded implementation | Authorize one Google adapter/genuine provenance extension, three-fixture server seeding and T03 literal tokenizer correction with strict negative tests; reuse M4B only. **Not started**. |
| Execution scope | Approve exact three raw strings/hashes/directions, max3calls, no retry,30s/call,120s run, concurrency1, char/byte caps, no glossary or extra model work. **Not approved**. |
| Budget and retention | Approve verified price-based dollar cap/enforcement and local artifact path,7day maximum/earlier cleanup and access. **Pending**. |
| Reviewer and acceptance | Name actual bilingual/native reviewer, agree partial rubric and stop criteria; no provider/model acceptance implied. **No completed reviews**. |

Current service/weight downloads, paid requests, credentials, real data, production integration, push/merge/deploy and next batch remain prohibited. Stop for owner review/provider selection.

## 7. Verification and limitations of this checkpoint

Read-only repository audit, public primary-source retrieval, proposal JSON/hash/count checks and the single deterministic **authored** T03 literal diagnostic. No runtime build/regression/model/translation tests claimed executed in this research checkpoint. No application source/contract/schema/validator changes, no M4B behavior altered. Canonical Qwen, Customer Service, Vision gates, evaluation artifacts, historical migrations and deferred acceptance untouched. Clean documentation branch, no stash/config manipulation. Current price/privacy/language/region/account due diligence remains incomplete due access restrictions; no fully verified commercial recommendation claimed.

## Exact documentation inventory

- `docs/ai/milestone4c/REVIEW.md`: implementation audit, verified/unverified provider matrix, exact recommendation, pricing/privacy limits, T03 blocker and approval gates.
- `docs/ai/milestone4c/SOURCES.json`: dated primary-source retrieval statuses and digests; blocked sources not claimed read.
- `docs/ai/milestone4c/THREE_CALL_PROPOSAL.json`: exact three raw strings/directions/hashes/counts and proposed caps; no executable runner, provider outputs or approvals.

No new application source, npm script, credential, exporter, inference adapter or migration.
