# Actual offline observations — no model results

Dataset digest `ced5a1e9f01f3eea0250fbfa2e85b8f4026002b3994ac9c927b3442efd04fff0`; 16 proposed quality tasks, all returned structurally valid **offline** results. Human judgments remain UNREVIEWED and all 96 dimension scores are null. Real provider requests 0, model/provider null, token usage null, provider latency null, actual model spend US$0. No real-model factual/translation/privacy/injection/draft-quality result exists.

Automatic hint counts: {'SOURCE_CLAIM_REVIEW': 44, 'LANGUAGE_REVIEW': 20, 'UNVERIFIED_INTERPRETATION': 4, 'ACCUSATION_REVIEW': 4, 'COMPLETION_REVIEW': 4}. These count fields, including repeated summary/observation claims; they are not failed-case counts, human scores or quality percentages.

5 of 8 zh-TW tasks contain LANGUAGE_REVIEW hints: SYN-BORROWER-A:zh-TW, SYN-OWNER-A:zh-TW, SYN-CONFLICT:zh-TW, SYN-ACCUSATION:zh-TW, SYN-NOISE:zh-TW. The deterministic adapter copies English excerpts and uses a generic prewritten Chinese clarification draft; this demonstrates a baseline limitation, not successful translation inference. Mixed-language sources can evade this very simple character hint. Absence of the hint does not establish language quality.

Participant-claim/accusation flags preserve uncertainty, not guilt findings. Completion wording checks can flag a negated statement such as “not confirmed handoff”; this is a documented lexical false alarm, not an established completed event. Manual claim-by-claim comparison remains necessary. Novel-number tests compare only cited sources, so citing the wrong date within the same case can raise a hint; they do not detect every paraphrase or semantic error.

The source-injection fixture runs only through the offline adapter/validator. No real model was exposed to instructions or tested for robustness. Unknown action fields and foreign references remain structurally rejected, no executor exists, and no actual private data is available. Authored adversarial interpretations exercise hints but are not observed model failures.

Decision: further offline/human rubric review is justified; no actual model candidate can be evaluated until all ten checkpoint decisions and reliable hard-cost controls are approved. Do not substitute this metadata for model evidence.
