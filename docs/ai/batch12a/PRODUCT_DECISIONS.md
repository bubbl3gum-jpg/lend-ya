# Product-owner decisions

Only 12A synthetic/scripted prototype is authorized. Everything in this table is **proposed, pending explicit approval for later work**; fixture behavior is not production policy.

| ID | Decision / recommendation | Required owner and gate |
| --- | --- | --- |
| AI-01 | First use case: one-channel source-linked Case Brief, not open-ended Admin chatbot. | Product; confirm usefulness from prototype review. |
| AI-02 | Future authorized Support Agent only for exact assignment/channel/message scope; dedicated assistant read identity, no ADMIN OR STAFF bypass. | Product + security + Support; Stage 7/roles remain inactive until approved cutover. |
| AI-03 | Process only approved bounded excerpt manifest, timestamps/source versions and language; exclude identifiers, evidence and opposite-party conversations. | Privacy + Support + security; approve exact fields, redaction and omission behavior. |
| AI-04 | Whether any external processing is permitted; no provider selected. | Product/privacy/security; signed training, retention, deletion, region and subprocessor terms, egress/secret ownership. |
| AI-05 | Immutable bounded run/review metadata; separately approve output/edited-draft retention and authorized readers/holds/erasure. | Privacy + operations; no raw prompt logs by default, no local mark mistaken for audit. |
| AI-06 | Human owns the edited reply; review and send are distinct; edit invalidates review. | Support + product; separate existing send authorization, no AI automation. |
| AI-07 | English and Taiwan Traditional Chinese; retain original source text beside uncertain translations. | Product + Taiwan-language reviewer; no automatic translation of identity or authority identifiers. |
| AI-08 | Proposed token, US$0.01/brief and US$25 synthetic-pilot caps, p50 3s/p95 8s/10s hard timeout. | Product + infrastructure; approve actual pricing, retry budget and metering, not estimates alone. |
| AI-09 | Held-out synthetic evaluation and failure gates in integration proposal; human-rated faithfulness, not just schema validity. | Product + independent evaluation/security reviewers; no model-quality claim from 12A. |
| AI-10 | On outage/invalid/stale/unavailable result, retain authorized source workflow and show no answer; no automatic provider/data-scope fallback. | Operations + security + Support; incident/monitoring ownership and inference-only disable control. |

Next approval request should be a separately scoped 12B brief with these decisions answered. No credentials or live-data processing are required to review this notebook.
