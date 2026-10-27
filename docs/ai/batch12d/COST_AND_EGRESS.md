# Cost and egress safety assessment

No live provider/model selected, no external AI request, credentials, SDK, paid operation or network activation. Live attempts remain unconditionally refused by `experiment-contract.ts`; checkpoint has ten missing decisions and empty destinations. The application still composes only `OfflineBriefAdapter`; production page/API refusal remains independent of flags. The review CLI has no environment/network/DB loader or activation path. A review file does not authorize anything.

## What current arithmetic does and does not prove

`reserveDryRun` checks exact numeric fields, integer bounds, cumulative request/token/cost arithmetic, overflow and per-request maxima before returning a new immutable reservation. Unit tests cover malformed/negative/nonfinite/extra fields and over-limits. It is **pure local arithmetic**, not a tokenizer, provider tariff, authoritative billing ledger, multi-process lock, quota enforcer or hard spending cap. Callers supply cost/token assumptions; the code cannot verify them. It grants neither network nor payment authority.

| Risk | Offline guarantee / limitation | Prerequisite for a future authorized experiment |
| --- | --- | --- |
| Provider spending ceilings | Unknown, provider not selected; dashboards may be alerts or lagged soft limits | Verify exact provider-side enforcement scope, delay, currency/tax/fees, shared-project balance and dedicated account/key; fail blocked if reliable approved cap cannot be established |
| Timeout/failure billing | Aborting local work may not stop remote inference or billing; no real evidence available | Document every billable attempt/failure/cancellation, reserve worst case until authoritative reconciliation; never release budget merely because HTTP failed |
| Token counting | No tokenizer/pricing/model limits approved | Approved version-compatible tokenizer and request framing, special/cached/reasoning/output tokens, maximum permitted generation; conservative bounds for all charged categories |
| Retry amplification | No offline retries; this is not approved live policy | Count/reserve each attempted call; propose zero initial retries for owner consideration. Idempotency semantics must be verified, not assumed free |
| Concurrent processes | Pure arithmetic cannot prevent two callers reserving same balance | Dedicated durable atomic ledger and serialized reservation, crash recovery and uncertain-attempt reconciliation; no process-local counter presented as financial control |
| Estimation versus billing | Supplied maximumCostMicrousd is hypothetical | Exact tariff/version, rounding and all charges, provider-enforced ceilings where available; distinguish estimates/reservations from measured usage and actual invoice |
| Overspend races | No calls exist, so no exposure from this batch | Preflight worst-case bound, durable reservations before dispatch, fail closed on missing/uncertain meters; account for in-flight work after stop |
| Credential compromise | No credentials read/activated here; future compromise can bypass client ledger | Least privilege, dedicated low-quota secret, controlled egress, revocation, isolation from shared spending, independent monitoring/kill owner |
| Unexpected unsafe output | Offline hints are not a safety detector | Explicit stop thresholds and human inspection, halt dispatch, revoke key/egress if needed, retain bounded diagnostic evidence and reconcile already-in-flight cost |

A client estimate, local flag or reservation counter alone cannot guarantee a hard financial cap. Unknown billing paths cannot be cured by a larger timeout or by retrying. **Reliable hard-cost enforcement remains unestablished; all billable execution remains blocked.** No actual quality, latency, token usage or model spending measurement is available. No model request happened; US$0 incurred by this batch is not an estimate of future experiment cost.

No-egress tests use throwing fetch sentinels, import/source checks, the current fixed composition and browser external-request checks. These are scoped evidence for the shipped offline path, not an OS-level network sandbox or proof that a future injected adapter is safe. Infrastructure enforcement, redirects, DNS/TLS, secrets and cost control must be separately reviewed before adding any transport. Existing external cloud-moderation unit fixtures use fake transports and are not this experiment.
