# Batch 13B-R1 — Durable Dispute, Borrower Response & Notification Foundation

29 October 2026, Asia/Taipei. Review candidate only; no production cutover, push, merge or deployment.

## Revisions and outcome

- Branch: `feature/durable-disputes-responses-batch-13b-r1`.
- Clean baseline: `95785a8c5ce777785bdf2fbb3871b5e617557705` on the R2 branch.
- Supplied R2 implementation `847a947a5a0b1ab1fff546f2df4e673a7f2af920` and evidence `00d75e1192f27b4a507679a61e00692c4e6ffbb9` are verified ancestors.
- Tested implementation: `a6c8705e78fa0948210e23a9b6f940f711f55e9c`.
- Separate evidence closeout: `28145c4263b5a97341d4639005e44447c24c732a`; indexed by a subsequent documentation-only commit.

An actual authenticated owner can review and submit a specific structured claim in the owned-development environment. The real borrower can find that same saved case through account activity/inbox, inspect authorized references and submit/reopen an immutable factual response. This is persisted application behavior, not another unsent preview. The existing Dispute remains the case identity and Booking remains the existing lifecycle authority.

All 31 selected command groups passed at their final runs, including 146 unit tests, static checks, real browser flows, original integration/rental/Support/authentication, R1/R2/identity, genuine virtual-camera meetup, migration preservation and normal production build. Initial failures/corrections remain separately recorded. Cleanup found zero residual owned13B-R1 databases or principals. All 31 historical migrations and 256 protected source/test files remain unchanged.

## Review package

- [Source-backed pre-implementation audit](batch13b-r1/AUDIT_BEFORE_IMPLEMENTATION.md).
- [Model, policy, authority, security and setup contract](batch13b-r1/CONTRACT_AND_SETUP.md).
- [Acceptance coverage](batch13b-r1/ACCEPTANCE_COVERAGE.md).
- [Exact changed-file inventory](batch13b-r1/CHANGED_FILES.md).
- [Actual command ledger and initial failures](batch13b-r1/VERIFICATION.md).
- [Responsive screenshots](batch13b-r1/SCREENSHOTS.md).
- [Browser evidence](batch13b-r1/browser-evidence.json), [migration evidence](batch13b-r1/migration-evidence.json), [source preservation](batch13b-r1/preservation.json), [cleanup](batch13b-r1/cleanup.json).
- [Support source readiness — no new grants](batch13b-r1/SUPPORT_SOURCE_CONTRACT.md).

## Authority, model and events

The original booking dispute endpoint delegates only an explicit typed pilot body to the new service; the untyped legacy contract remains unchanged. One serializable transaction creates the actual Dispute, preserves the existing authorized Booking→DISPUTED transition, stores immutable original claim and exact accepted R2 documentation context if present, creates borrower notice and records three mandatory initial events. No second case identity or independently mutable state machine.

One additive transactional migration creates `DevConditionClaim`, `DevConditionNotice` and `DevConditionEvent`, with restrictive FKs, bounded versions/payloads, idempotency uniqueness, one original borrower response, original allegation protection and deferred atomic history/notice constraints. Original claim, response and evidence references cannot be silently replaced; subsequent supplements/clarifications are attributed new events. Fixed concern/component remain immutable; narrative supplements are statements requiring human review, not automatically admitted new allegations. No material-amendment or exception operation is enabled.

The actual verified return predicate is reused inside the transaction and independently checked in SQL. Ordinary owner submission is permitted only within the half-open24h window. No verified receipt means no invented clock. Owner supplements share the same deadline; a page reload cannot reset it. Returned custody remains acknowledged independently from an OPEN dispute and its existing workflow status.

Owner creation requires ACTIVE account; existing suspended participant obligations permit case reads and borrower responses/clarifications. Writes lock current account/session and Booking and fail closed on stale authorization. A queued write behind actual session deletion returns401 after a read-only conflict recheck, with no event. No browser actor/time/hash/status or staff flag is authoritative. Unknown payload fields/actions and foreign evidence/actors are rejected. DTOs exclude internal Admin notes and secrets; exact participant-only private/no-store reads have no ADMIN OR STAFF bypass.

## Notice and48h boundary

Notice creation/queueing is durable but not delivery. Explicit borrower view/acknowledgement is separately recorded and never starts an enforceable clock. No real delivery channel or real DELIVERED event is implemented. Trusted direct owned-test fixture events calculate a demonstration48h timestamp, including deliberately aged synthetic timing; these are prominently not actual delivery, not an approved deadline and never liability authority. No HTTP/flag path can insert real delivery or turn enforcement on.

Actual borrower response stores explanation, position on facts, accessory clarification, authorized evidence refs and human-assistance request. Disagreement and uncertainty are first-class choices; agreement with facts never implies compensation. Original response remains immutable; clarifications are distinct. Human-assistance request records intent, not invented staff assignment, ticket creation or delivered messaging. Silence never closes a case, assigns guilt or deducts money.

## Preservation and testing limits

Fresh/populated migration tests preserve historical users, bookings, sessions, reviewer grants, audits, legacy Dispute/Return and original private evidence bytes; partial SQL failure rolls back, deploy/replay succeeds, prior checksums remain and final schema diff is empty. No backfill of invented facts or fields. No existing application database reset/migration/seed/data operation.

Actual browser tests cover owner review/submission, account navigation/reopening, borrower response/reload, English/Traditional Chinese, desktop/tablet/mobile and keyboard/overflow checks. Full unchanged meetup12/12 retains actual native camera QR decoding at pickup and return. The new focused verification records are synthetic fixtures and are not presented as real-world physical proof. Existing integration, session/logout, Admin/moderation, Support privacy/principals, identity, R1/R2 documentation and build checks passed. Historical general overlapping-login intermittence remains open; serial passes do not resolve it. No disk exhaustion occurred in this batch.

Initial defects were a new-migration CASE syntax error, a duplicate original/history text locator, implicit select names and409 classification of a denied revoked-session race. Each was corrected narrowly; no timeout increase, browser-error suppression, camera relaxation or authorization weakening. Full details and retained outcomes are in the ledger.

## Remaining policy and production blockers

Approved qualifying delivery/channel/receipt semantics, failures/retries/reminders, enforceable real-user48h policy, exceptions/extensions/appeals, ordinary-wear and material-amendment review, new supplemental uploads, retention/holds/deletion, production principals and dispute cutover remain unresolved. Legacy broad-purpose disputes are not retrospectively subjected to the new pilot's ordinary inspection clock. No production activation follows passing fixtures.

Structured Support/Copilot access remains blocked pending exact scoped assignment/capability/audit/field approval; old Support authority is unchanged. No live AI/Vision/eKYC, identity documents/biometrics, financial action, automatic liability/resolution, staff activation or autonomous sender/executor. Original QR/GPS/consent/camera, custody and evidence remain authoritative.

The canonical 14 stages retain names/order/objectives and unfinished earlier commitments. This advances a Stage 7 development candidate with existing Stage 6/9/10/12 dependencies, not a new stage or completion of Stage 7/10. Stage 6 station controls, Stage 7 production policies, Stage 8 publishing/settings approvals and Stage 9 aesthetic acceptance remain unfinished. Await independent review; do not start another batch automatically.
