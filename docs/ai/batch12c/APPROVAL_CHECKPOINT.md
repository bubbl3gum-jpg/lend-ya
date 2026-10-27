# Live-model authorization checkpoint — incomplete

27 October 2026, Asia/Taipei. The 12C instruction authorizes **non-egress preparation only** unless separate explicit owner approvals are supplied. None of the following ten decisions has been supplied. The batch title, existing API keys, flags, a repository approval file or offline success is not consent.

| Decision | Confirmed scope | Missing live decision |
| --- | --- | --- |
| 1. Provider/model | No live provider selected or implemented. | Exact provider and immutable model/revision. |
| 2. Endpoint/service owner | Empty destination allowlist; all live attempts refused. | Exact API URL/region, service ownership and egress controls. |
| 3. Data terms | Real customer data prohibited. | Accepted processing/training/retention/deletion/subprocessor terms. |
| 4. Dataset | A reproducible proposed synthetic quality corpus is prepared, not approved for export. | Explicit approval of its exact version and SHA-256. |
| 5. Tasks/languages | Offline en/zh-TW preparation only. | Exact English summary and English/mixed-source→Traditional-Chinese tasks. |
| 6. Credential/egress owners | No provider secret loaded or activated. | Named credential/secret-store and network owners/access/incident procedures. |
| 7. Hard request/token/spend caps | Zero real requests/spend; arithmetic rehearsal only. | Maximum requests, input/output/total tokens, reliable worst-case billable cost and total USD ceiling. |
| 8. Execution limits | Existing offline deadlines/cancel controls retained; preparation sequential. | Actual model timeout, retry count (recommend zero initially) and concurrency, including failed-attempt billing. |
| 9. Retention/diagnostics | Offline report stores IDs/digests/hints, no provider bodies; no actual model outputs exist. | Approved output retention, authorized reviewers, deletion/holds and bounded diagnostics policy. |
| 10. Stop conditions | No experiment can start. | Owner and mandatory stop triggers: budget uncertainty, scope leakage, unauthorized action promises, grounding/injection failures, outages or missing audit. |

Confirmed: synthetic-only offline work, no private records, no purchases, no external requests, no credential activation and no Stage 11 executor. These restrictions are **not** model-experiment approval.

## Enforced current behavior

`experiment-contract.ts` reports BLOCKED_APPROVAL_REQUIRED and ten missing decisions. It has no permit issuer, approval-file reader or environment activation path; `refuseLiveExperiment` rejects every destination, including localhost and credential-shaped objects. The existing server composition still hardcodes OfflineBriefAdapter and refuses non-NONE model labels. Production page/API gates continue to refuse with development flags, synthetic credential-shaped strings, fake endpoint and fake approval flag present. Test strings are inert, not activated credentials.

No real adapter was added: the brief explicitly permits it only **after** the checkpoint. There is no provider URL selection, SDK install, egress transport or model browser control in this batch. The UI says blocked and lists pending decisions; there are no approval buttons or credential fields.

## Cost prerequisite

`reserveDryRun` rehearses cumulative integer reservations and per-request ceilings. It accepts only exact numeric fields, rejects negative/non-finite/fractional/overflow values, rejects over-limit requests before reserving, and does not mutate prior reservations. Its supplied token/worst-cost numbers are illustrative arithmetic, not a tokenizer, tariff, metered usage or a billing guarantee. Passing it never unlocks egress.

Reliable hard-cost enforcement cannot yet be established because provider, tokenizer, pricing, billing of failures/retries and approved caps are missing. Therefore **no potentially billable call was conducted**. A future approved adapter must reserve a conservative worst-case cost before each request, serialize limits durably across concurrency/processes, account for all billable failure paths, stop when metering is uncertain and never fall back to another paid provider. Explicitly resolve any unenforceable-cost risk before calls, not afterward.

## Next decision

Further **offline/human rubric evaluation** is justified now. A model-backed candidate is not justified as an executed experiment until the ten decisions above are approved separately. Supply one exact bounded synthetic-only experiment authorization; do not send an API key in chat. A future approved experiment must record actual model/endpoint version, usage/latency/cost, validation, claim-by-claim human scoring and failures separately from current offline reports. Live Support AI, staff activation and private processing remain separately blocked.
