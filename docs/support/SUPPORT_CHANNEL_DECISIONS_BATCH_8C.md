# Decision-ready policy proposal — Batch 8C

These proposals are not product approval and do not activate production. Existing 8A/8B decisions remain unresolved unless explicitly recorded below.

| Area | Confirmed boundary | Proposed decision for approval | Gate |
| --- | --- | --- | --- |
| Ownership | Independent requester ticket/channel; no opposite-party invitation | One requester channel per ticket; separate staff-only notes | Candidate implemented; production blocked |
| Eligibility | ACTIVE allowlisted synthetic users only | Preserve access to rental/return/inspection/support obligations during restriction; define safely limited intake for restricted users | Product/security review |
| Categories/relationships | Existing 8B closed-list candidate; exact recorded links | Approve final categories and relationship evidence; unresolved aliases/self-dealing remain blocked | Product review |
| Lifecycle | RECEIVED/version 1 only; no closure | Define triage, response, closure, appeal/reopen and requester visibility independently of Booking state | Product review |
| Content | Text-only 2000-character synthetic candidate | Approve real text rules, prohibited data, moderation/escalation, safety notices and accessibility | Product/legal review |
| Abuse | Explicit test ticket/message quotas | Approve per-account/channel/time-window controls, durable idempotency retention and proportional abuse responses | Security/product review |
| Retention | Dispose whole synthetic database after tests | Set separately justified durations for message text, metadata, hashes and access audit; define deletion/redaction/legal holds and immutable history coexistence | Legal/security/product review; no invented duration |
| Assignment | No staff readers or replies | Exact independently authorized ticket assignment + explicit channel/action grants and expiry; reject participant/alias/investigator conflict | Staff scoped DB/audit prerequisites |
| Notifications | None | Approve minimal private notification payloads and opt-in/contact rules; no opposite-party disclosure | Privacy/product review |
| Mediation | No forwarding | Explicit content version, recipient audience, legal/disclosure basis and required approval; never copy a private thread wholesale | Separate design/approval |
| Canonical identity | Account/session ownership, not verified-human certification | Canonical human reconciliation for staff independence and conflicts; ambiguous accounts fail closed | Staff identity review |
| Recovery | None | Continue separate assisted recovery proposal; no password/email/self-approved bypass | Separate approved batch |

Approval requests should specify each decision's owner, rationale, version, effective date, retention basis, affected audiences, tests and rollback conditions. Do not treat a candidate constant or proposed permission matrix as approval. Production migration design must replace the explicit owned-test-only barrier through a separately reviewed additive release; never rewrite applied historical SQL or skip migrations silently.

## Concrete Batch 8D proposal: assignment and reply readiness

1. Review product decisions above and the existing fixed-role matrix. Keep all runtime roles inactive until approved scoped access exists. Support investigates/recommends; separate humans approve high-risk outcomes.
2. Design additive assignment and channel-action grant records with immutable history, bounded purpose, actor provenance, expiry and persisted authorization versions. Resolve canonical-human aliases and participant/investigator conflicts. Define reassignment/revocation race semantics before coding.
3. Build a genuine database-scoped reader/writer and independent audit writer under reviewed least-privilege principals. Bind trusted server-resolved identity to the transaction without trusting browser claims or mutable client GUCs. Revoke legacy broad private access on the new path. Prove denial using direct SQL, not only mocks. If unavailable, keep staff access blocked.
4. Commit durable access decisions/evidence-access events before private disclosure; audit failure must return no private DTO. Do not put message text in audit logs. Define narrowly scoped incident access with distinct authorization rather than a Super Admin blanket bypass.
5. Add a dedicated staff-reply attribution model; preserve requester-author foreign keys and immutable message history. Keep internal notes, participant-visible replies and mediation separate. No reply implies delivery/read, rental transition, dispute resolution or sanctions.
6. Test exact assignments/action scopes, revoked/expired sessions/grants, alias conflicts, concurrent revocation/reassignment, audit writer failure, direct SQL and cross-channel errors/counts/logs/downloads/notifications. Re-run fresh/populated migrations, old clients and full actual-camera pickup/return. Negative tests must show legacy ADMIN/ChatReviewer alone still cannot disclose channels.
7. Only after independent review propose a bounded rollout, staff provisioning, recovery and production logging/retention deployment. No activation, production migration, staff onboarding or reply implementation is authorized by this document.
