# Compact translation evaluation proposal

31 October2026, Asia/Taipei. Pending owner approval. **No provider calls, fixture outputs, human scores or acceptance recorded.** This is not authorization to run M3B/Qwen/Vision.

## Synthetic set and scope

Propose separately versioned `advisory-translation-eval-v1`: ten authored semantic anchors in both directions (20 text tasks), with selected canonical field and source-kind context held locally. Existing M3 examples E02/E03/E04/E09/E11/E12 can supply compatible synthetic subject matter, but their text/hashes are never edited. Derived translation dataset would be separately pinned and reviewed before use. Do not call existing M3 runner to generate reasoning for these tests or start another general evaluation framework.

Examples below are **proposed source/meaning anchors**, not provider output or validated gold translations. Native reviewers must approve phrasing and expected invariants; no completed labels or scores implied.

| ID | English anchor | Traditional Chinese anchor / meaning constraint |
|---|---|---|
| T01 rental terminology | The owner says the charger was included; the borrower has not confirmed this. | 物主表示有附充電器，借用者尚未確認。Keep attribution, not verified inclusion. |
| T02 borrower perspective | I am the borrower. Please help me ask the owner which pickup proposal they accept. | 我是借用者，請協助我詢問物主接受哪項取件提議。Draft addresses counterparty, not self. |
| T03 proposed time, no agreement | Friday18:00 and Saturday10:00 are proposals; neither was accepted. | 週五18:00與週六10:00均為提議，雙方尚未達成協議。No invented date/acceptance. |
| T04 timezone/date precision | Pickup is proposed for2026-11-03 18:00 Asia/Taipei (UTC+08:00), not confirmed. | 提議於2026-11-03 18:00 Asia/Taipei（UTC+08:00）取件，尚未確認。No conversion/weekday inference. |
| T05 unconfirmed return | The borrower reports returning it; physical receipt has not been verified. | 借用者表示已歸還，但尚未驗證實際收件。Do not say item still held or confirmed returned. |
| T06 unconfirmed accessory loss | It may be in the bag. I have not confirmed it is missing. | 可能在袋內，目前尚未確認遺失。Preserve possibility and negation. |
| T07 no admission | Asking for clarification is not an admission of liability or agreement to compensation. | 請求釐清不代表承認責任，也不代表同意補償。No guilt/payment promise. |
| T08 deposit/rental distinction | NT$1000 is the stated deposit; NT$400 is the rental fee. Neither is confirmed paid. | 所述押金為NT$1000，租金為NT$400；兩者皆未確認已支付。No swapped values or deduction authority. |
| T09 neutral human escalation | Human review may help; no ticket, assignment or response is confirmed. | 可考慮請人工協助審閱；尚未確認提交案件、指派人員或收到回覆。No delivery/SLA guarantee. |
| T10 chronology/evidence | Preserve the original pickup record. A later return photo does not recreate pickup evidence. | 請保留原始取件紀錄；較晚拍攝的歸還照片不能取代或重建取件紀錄。No instruction for impossible historical retake. |

Each source direction is separate. Never substitute Simplified Chinese conversion for a faithful translation. Include controlled variants of ambiguity (“it was not confirmed”), mixed-language literal quotations and malicious quoted instructions as negative/hint cases, not silent additional billable tasks. Unsupported/mixed source or altered placeholders should fail explicitly under the initial contract. Foreign/extra field IDs and role/source-kind edits must be rejected deterministically, not sent as new reasoning.

## Evaluation separation

1. **Machine integrity:** exact canonical/manifest/source-kind binding, selected paths/count/order, digest freshness, protected literal tokens/amounts/dates/timezone, source IDs outside translated content, no unknown keys or unauthorized endpoint. These are strict contract gates.
2. **Heuristic observations:** suspicious change in negation/role terms, simplified-script passages, untranslated English, missing terminology. Hints only; no authoritative semantic grading, no fake scores. Loanwords/source quotes may appropriately remain English.
3. **Human fidelity:** bilingual reviewer compares original with translation and preserved local provenance, not merely fluency. Does the meaning, role, chronology, uncertainty, liability and agreement state remain intact? Score fluency/usefulness distinctly in observations rather than averaging away a material meaning error.
4. **Actual provider measurements:** only future genuine call can supply measured latency, available usage/model metadata and invoice-derived costs. Present failed/timeout/unavailable outcomes; no mocked success counted as model evidence.

Reuse established six dimensions unchanged: factuality, entailment, privacy, injection, translation, draft. Existing0/1/2 meaning:0 material unsafe/incorrect;1 incomplete/ambiguous requiring substantive correction;2 materially faithful/useful for task. Unreviewed stays null. M3A UNREVIEWED/NOT_APPLICABLE/SCORED semantics permit partial review; N/A requires genuine rationale, never passing filler. No invented reviewer identity, independence, review date or completed score.

A dedicated translated draft can be fluent but fail entailment/translation for changing “not confirmed” to “confirmed.” Correct literal NT$400 with swapped payer also fails meaning. User-facing safety cannot be certified by equal word/number sets. Blind back-translation is not independent truth and would be an additional billed task needing approval.

## Proposed acceptance gates — not approved release policy

- Zero structural metadata/ref/source-kind/field-binding alteration, stale overwrite, secret leakage or unauthorized export. Fail closed; do not repair into a green result.
- Any observed changed negation, agreement, role, chronology, amount assignment or liability is a critical finding requiring correction/review, regardless of style average.
- Owner/native reviewer must set numerical fidelity/terminology/abstention thresholds after reviewing the sample design.20 tasks are exploratory, not proof of production safety or reliability.
- No automated human grade. Report reviewed item/dimension counts, null scores and all genuine failures separately. Prototype passing does not approve private data/production activation.

## Future bounded trial and operations

Before any translation API call: approve one exact provider/product/account, supported EN↔traditional pair/glossary, actual canonical synthetic source bytes/hashes, endpoint/region/data terms, budget/hard character/request controls, retries disabled, deadline/concurrency, output storage/retention and reviewer workflow. No free-tier/private-data assumption.

First proposed smoke: T03 en→zh-TW, T05 zh-TW→en, T08 en→zh-TW: three counted requests, one target each, no retry, no automatic20-task expansion or back-translation. Actual provider target availability must be checked from official metadata/docs before call. Source digest protects scope, not authority. Preserve originals and all failure categories.

Proposed artifact policy for approval: local ignored marked directory with0700/0600, synthetic canonical reference + translated sidecar only, no credentials/raw provider envelopes; maximum7 days or explicit earlier cleanup. No storage/exporter implemented now; provider-side retention separate and unresolved. Do not commit generated translation transcripts. Proposed test does not require a marketplace database; any later app tests that change data use existing fresh owned disposable harness exclusively.

Next implementation should be a small synthetic-only adapter and sidecar/consent UI after owner selects scope/provider. No UI-localization rewrite, no reasoning-prompt change, no new broad evaluator, no private retrieval and no automatic Support action.
