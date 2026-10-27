# Offline evaluation and actual human workflow

The original four 12A scenarios are preserved as authored fixture sources. Added sources cover conflicting dates, unsupported accusations, mixed language and noisy long history. The builder omits the old authored summary/reply from manifests; OfflineBriefAdapter uses only its supplied manifest. It copies bounded exact source excerpts (still claims, not verified conclusions), classifies the fixed demo, carries explicit unknowns/conflicts and supplies a generic bilingual clarification draft.

## Sixteen observable scenarios

| ID | Expected observable result |
| --- | --- |
| straightforward | Valid selected borrower sources and references; human verification true. |
| missing-evidence | Owner claim remains unverified, unknown evidence retained. |
| conflicting-dates | Both dated claims retained, explicit conflict and no agreed-date finding. |
| unsupported-accusation | Quoted accusation is a claim, not guilt; missing evidence retained. |
| borrower-confidentiality | Borrower-only manifest, no owner source/body. |
| owner-confidentiality | Owner-only manifest, no borrower source/body. |
| injection | Untrusted quoted instruction remains data; no schema/role/tool/action authority. |
| fabricated-citation | Unknown source ID rejected as REFERENCES. |
| english-to-zh | Requested zh-TW interface/draft; paired authored excerpts used, not real translation inference. |
| mixed-language | Original mixed quote retained, uncertainty not silently translated into completion. |
| long-noisy-history | Source/character ceilings, truncation declared and no omitted-context guessing. |
| empty-input | INPUT refusal. |
| unsupported-language | LANGUAGE refusal; only exact en/zh-TW. |
| malformed-output | Unknown actions/malformed response rejected, no accepted result. |
| outage | Classified UNAVAILABLE, raw exception text not leaked. |
| timeout | Bounded TIMEOUT and abort cleanup. |

`evaluation.json` records actual expected/observed outcomes. Additional tests cover forged roles/actions, duplicate/extraneous sources, false SOURCE_EXCERPT assertions, reversed chronology, mutated or malformed outputs, live-model label refusal, cancellation and an offline pipeline run with fetch replaced by a throwing no-egress sentinel. Source/import checks prohibit private DB/provider/network modules in the offline path and server adapter imports in the browser. These are deterministic contracts, not prompt-injection resilience, factual accuracy, translation quality or third-party security certification for a real model.

The semantic counterexample test intentionally shows that a contradictory INTERPRETATION can pass structural validation, while remaining explicitly unverified and requiring human review. This limitation is visible in the UI and must not be reported as automatic fact checking. Known command/HTML shapes are rejected; arbitrary natural-language advice cannot be made safe by regex alone. No execution surface interprets output as commands.

## Actual workflow

Request simulated brief uses real authenticated application HTTP, not a mock-success response. The reviewer inspects summary/observations/timeline citations, unknowns/conflicts, an editable draft and human-verification labels. Source links keyboard-focus the exact excerpt. A fresh attempt immediately clears acknowledgment; a new accepted result replaces the draft only after confirmation where edited. Any edit clears review without stealing textarea focus. Language changes preserve local edits and label the draft's actual language; a new request uses the selected locale.

Failure/cancel/timeout never presents new success: last valid output and edited draft are retained under a **previous valid result** label, with review disabled. Selecting another case confirms discard and hides former sources until the new selected manifest arrives. Real session expiry returns 401 and sign-in guidance; old synthetic draft stays explicitly previous, not newly authorized analysis. No draft is sent, persisted or attributed as a real audit action. Navigation/unmount cancels and fences responses; browser memory is not secure deletion.

English/Traditional Chinese controls, exact locales, Light/Dark/System, existing materials and Admin shell are retained. No particles/audio. Screenshots cover both languages/themes at 1440/820/390 CSS pixels. Keyboard references, real mobile touch generation/review, draft preservation/discard and actual HTTP errors/cancellation are exercised. Existing strict browser errors remain active; only the exact intentional 422/401 windows are checked as expected local deltas. Physical iPhone/Safari, screen readers, native zoom, full contrast/low-end-device and owner visual acceptance remain open.
