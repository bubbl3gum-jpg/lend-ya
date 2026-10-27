# Future read-only architecture and proposed Batch 12B

**Proposal, subject to explicit approval.** No provider, credentials, real private records or new permissions are activated by this document. Stage 11 autonomous actions are out of scope.

## Bounded integration

Future request: authenticate the human server-side, verify ACTIVE eligibility, exact capability, case assignment, exact channel/side and independent message visibility. Never accept a role, risk, identity, assurance or authorization supplied by the browser. Use a dedicated bounded assistant service principal; it must not inherit a broad Admin session, DB owner, staff role or evidence-reading right.

Build a server-only source manifest for **one channel** and one authorized snapshot: opaque case handle, source IDs, source versions, event times/kinds, bounded relevant message excerpts and selected UI output language. Proposed input ceiling 12 excerpts, 1500 characters each, total about 3000 model tokens; truncate explicitly and report omitted context. Final tokenizer/character limits need approval. No account IDs, names/email/contact fields, tokens, cookies, raw logs, exact location, attachments, evidence files/URLs, unrelated listing history or opposite-party narratives. Redaction must handle identifiers embedded inside text, not merely omit columns. Synthetic quote translations in 12A are not model-generated.

Before export and before release, recheck session incarnation, authorization version, exact channel/message grants and snapshot freshness; failure discards the result. Avoid holding a DB transaction across provider latency. A shared booking is never sufficient authority. Assignment alone does not authorize every ticket; ticket read does not authorize messages/evidence or external processing. Live Support AI remains blocked while Stage 7 policy/principal/activation gates remain open.

Provider adapter: server-only credential, exact approved endpoint/model, no arbitrary URL or browser key, no tool calls/browsing/function execution, bounded output/time and explicit retry budget. Treat all excerpts as untrusted data in a fixed instruction template. A generated instruction, link or claim can never modify authorization. Use a strict structured result: summary claims with source IDs, timeline references, fixed category suggestions, explicit unknowns, follow-up questions, translated excerpts and draft reply. Reject unknown properties, cross-case/unknown source IDs, excessive strings, invalid categories and unsupported output shape. Escape text; no HTML rendering. Citation existence validates structure, not semantic truth; a human must verify entailment and translations.

If input is incomplete or conflicting, show it explicitly. On refusal/timeout/schema/auth failure show unavailable plus source access through the original authorized workflow. Do not fabricate an answer, silently widen context or send automatically. Draft edit resets review. Future send still requires a separate real human endpoint and exact current case authority; AI never sends, closes, changes booking/custody/evidence, sanctions, stations, settings, disputes, approvals or payments.

## Provider, cost and latency decisions

Compare an approved managed API (contractual no training, documented retention/deletion, region/subprocessors, structured output and stable versions) with an owned inference service (operational/data-control benefits but capacity/security/model-quality costs). No provider is selected and no current price quotation is claimed. Evaluate bilingual Taiwan terminology, source fidelity, injection behavior, outage handling, tokenizer limits and predictable versioning; cheapest output is not sufficient.

Proposed synthetic-pilot targets, **not approved budgets or measured inference performance**: input ≤3000/output ≤700 tokens; p50 ≤3 seconds, p95 ≤8 seconds; hard timeout 10 seconds; no automatic provider fallback; ≤1 explicit bounded retry; target ≤US$0.01 per successful brief and ≤US$25 pilot total. Price calculation: `(inputTokens × providerInputPricePerMillion + outputTokens × providerOutputPricePerMillion) / 1,000,000`, plus retries/fixed fees. Validate actual prices and metering before choosing a provider; insufficient budget fails closed. 12A inference spend is zero because no model call occurred.

## Privacy, retention, audit and monitoring

Require provider training/retention/region terms and lawful external processing approval before any private text export. Zero/short provider retention must be contractually verified, not inferred from a model name. Separate approved retention for manifests, outputs, human edits and review history; no raw prompts/responses in operational logs by default. Metadata audit proposal: bounded actor/principal, exact authorized resource handle/version, purpose, provider/model/template/schema versions, source-reference hashes, timestamps, outcome, token/cost/latency and human-review decision. Restricted readers, deletion/holds and failure-to-audit behavior need explicit ownership/approval. No such AI history model is introduced in 12A. Local reviewed is explicitly not a durable audit record.

Monitoring owners must review unsupported facts, citation failures, cross-scope attempts, stale authorization, injection attempts, provider failures, budget, latency and retention/deletion. Incident kill switch disables inference only; it cannot weaken existing authorization or custody/evidence rules.

## Concrete next batch

Proposed **12B: model-backed synthetic Case Brief candidate only**, if approved:

1. Approve first use case, provider/model/data terms, credential storage/egress, exact synthetic fixture set and hard budgets. No actual private Support data even if synthetic quality passes.
2. Implement one server-only adapter with a fixed synthetic selector; no arbitrary user content or DB case IDs, provider SDK only if justified. Keep production refused and existing Admin gate. Use a separate approved bounded test identity/secret; do not reuse current Admin credentials.
3. Add strict result/reference validation, cancellation, error/outage and budget handling; label actual inference provenance and human review. No send endpoint, AI grant or autonomous tools.
4. Evaluate on a held-out synthetic bilingual set (propose ≥60 examples) with human-reviewed expected facts/unknowns. Measure actual latency/cost separately from development compilation and UI rendering.
5. Proposed release-to-review gates: zero cross-case/party disclosure or operational action attempts accepted; every citation resolves within the selected manifest; all high-risk missing/ambiguous cases retain uncertainty; ≥95% human-rated factual/translation fidelity on the defined set, with zero unsupported binding conclusions. Record initial failures; passing a sample is not a universal safety guarantee. Product/security must approve exact metrics before use.
6. Preserve owned test isolation, human authorization, rollback/outage behavior and existing regression deadlines. Deliver exact versioned dataset/results/model/template revisions and independent review package. Stop without production/live-private integration.

Later live-data work is a separate batch only after Stage 7 access and privacy activation, dedicated read principal, audit/retention and provider export policy are approved. It is not silently included in 12B.
