# Decisions required before the first actual model experiment

**No live-model experiment is authorized by 12B.** Existing credentials, environment flags, an offline adapter's model label or passing contracts are not approval. No purchases or inference spend occurred.

Obtain a separate explicit instruction approving all of:

1. **Use case/dataset:** synthetic one-case Case Brief only; exact checked-in fixture revision and output languages; no arbitrary text, real tickets/messages, customer identities, booking/evidence or opposite-party joins.
2. **Provider/model:** named provider, exact model/revision and exact HTTPS endpoint/region; accepted no-training, retention/deletion, subprocessor/data terms and legal/privacy owner. No arbitrary endpoint or automatic fallback.
3. **Secret/egress ownership:** named infrastructure owner, approved server-side secret storage/access, exact destination allowlist and runtime restrictions, no browser key, logs or credentials in Git. Dedicated bounded identity, not Admin-session inheritance.
4. **Hard usage and spend:** requests/day and concurrency, input/output token ceilings, retry policy (prefer none for first experiment), total US$ cap and per-brief cap; approve actual price schedule and stop behavior. Prior 12A targets (3000/700 tokens, US$0.01/brief, US$25 total) remain proposals, not authorization. Offline 12B uses character bounds and zero model spend; those are not token/cost enforcement.
5. **Latency/failure:** approved deadline/cancel behavior, no fallback to broader data/provider, last-valid-draft handling, incident owner and inference-only disable control. Current 1500ms offline timeout is not an approved model latency target.
6. **Evaluation/human review:** exact held-out synthetic set, expected facts/unknowns, citation entailment and translation scoring, injection/accusation/conflict tests, unacceptable failure criteria and independent reviewers. Structural reference validity alone must never certify factuality.
7. **Retention/audit:** permitted run/source-reference metadata and any output retention, access/readers, deletion/holds, cost/latency logging and failure-to-audit handling. No raw prompts/responses or credentials in ordinary logs. Local review marks are not durable audit history.

Only then implement the smallest server-only model adapter and synthetic selector composition with actual provenance, approved budgets and no tools. Report live results separately from deterministic checks. Live Support AI, staff activation and private-data export still require Stage 7 exact authorization/assignment/privacy and Stage 10 production approvals; neither follows from a synthetic model experiment. Stage 11 automation remains out of scope.
