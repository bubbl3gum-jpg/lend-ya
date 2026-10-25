# SupportTicket and participant-private conversation proposal

**Proposal only. No executable schema, migration, ticket identity, assignment, message route or production policy is added in Batch 8A.** Product decisions in [the register](SUPPORT_PRODUCT_DECISIONS_BATCH_8A.md) must be approved before permanent deployment. This is a data/access contract for review, not automatic approval of proposed fields, categories or transitions.

## Model responsibilities and field proposal

Existing ListingReport and Dispute remain canonical allegations/decisions. AdminAuditLog remains existing administrative audit; ChatModerationCase remains moderation, and marketplace Conversation remains bilateral marketplace chat. A future SupportTicket would provide a dedicated help-request lifecycle and assignment boundary that those models currently lack; it must reference, not duplicate, their protected contents or custody consequences.

| Proposed record/field | Contract and existing-model relationship | Approval dependency |
| --- | --- | --- |
| SupportTicket.id | Server-generated random UUID, immutable canonical identifier. Optional opaque public reference may be added separately; neither is authorization. Never use report/dispute numeric IDs as a shared ticket ID. | Identifier/reference presentation approval. |
| requesterUserId | FK to authenticated persisted User at creation; never browser-provided actor. No impersonated creation. Account aliases do not imply separate verified humans. | Who may request tickets, suspended-user obligation exceptions and on-behalf creation policy. |
| categoryCode, policyVersion | Fixed approved registry code and the policy version used for intake. No free-form category creates authority. | Exact categories/relationship requirements and versioning. |
| primary reference | At most one primary booking/listing/report/dispute FK; category may require one. Additional links must be independently validated members of the same approved case graph. | Whether unlinked/general-account tickets are allowed; multi-link policy. |
| createdAt | Actual persisted creation time; immutable. | Standard retention/access policy. |
| currentState, lifecycleVersion | Snapshot derived by atomic append of approved lifecycle events; optimistic version for concurrency. No default state set until the transition contract is approved. | Exact opening/closure/reopening/escalation rules. |
| assignment reference | Nullable assignment ID referencing a verified human StaffPerson, not just User/email or a role string. Existing StaffMembership/version and exact bounded case/channel grants are checked live. | Assigning authority, conflict rules, workload/ownership changes and rollout readiness. |
| requester relationship evidence | Server-checked `booking.ownerId/renterId`, listing owner/reporter or dispute relationship; immutable link/role snapshot with source IDs and verification time. This means verified **relationship**, not invented identity verification/MFA. | Eligibility and relationship change/deletion handling. |
| retentionPolicyVersion / hold reference | Approved retention schedule reference, not a hard-coded speculative TTL. Distinguish message content, metadata, audit and attachment retention. Holds and lawful erasure require reviewed authority. | All retention/deletion/hold requirements. |

Prefer typed nullable FKs with a check limiting primary reference cardinality over an untyped arbitrary target string. A related Dispute must belong to the linked Booking; ListingReport to linked Listing; linked Booking's listing must match any approved listing reference. Validate in the transaction; use FKs/composite constraints/triggers in a separately reviewed migration where expressible. Do not accept a link merely because its numeric ID exists. Deny cross-case linking; a primary link change would require a defined reviewed transition, not silent rebinding of messages.

## Future lifecycle and immutable events

Illustrative states for product review: RECEIVED, IN_REVIEW, WAITING_FOR_REQUESTER, ESCALATED, CLOSED. They are **unapproved**, not deployed enum/default values. Reopening may be a transition or a new linked ticket; product must choose. “Closed” means support handling ended under a recorded reason, never booking completion, physical return, inspection acceptance, dispute resolution or a serious sanction.

Proposed SupportTicketEvent is a ticket-specific lifecycle fact, not another general audit system: UUID or monotonic ID, ticketId, sequence/version, fixed event type, actual persisted timestamp, trusted actor identity reference, policy/authorization version, normalized outcome/reason code, exact approved link/assignment changes, correlation/idempotency key. Unique `(ticketId,sequence)` and idempotency constraints; append-only update/delete restrictions with scoped database writer privileges. Previous/new versions must be consistent in the same transaction; append failure rolls back the snapshot change. Stable order `(sequence,id)` per ticket; timestamps may tie. Events preserve provenance and avoid raw narrative/evidence in audit fields. Sensitive case notes, if approved, are separately scoped content, not event explanations or public ticket descriptions.

Keep actual access decisions in the existing StaffSecurityEvent boundary after its approved scoped extension; do not treat console logs or the old broad audit directory as sufficient private-thread audit. Read/disclosure failure must not succeed if required durable access auditing fails. No new role, audit writer or capability is activated now.

## Assignment and human-conflict controls

Assignment is exact ticket scope and, separately, exact channel scope. Server policy resolves ACTIVE membership, trusted real session binding, persisted authorization version, revocation, grant expiry, action, resource ID, risk and assignment. `support.queue.read`, `support.channel.read/write`, `support.internal_notes.write`, `support.ticket.close` are existing **future** contracts; their role allocations remain subject to approved matrices and do not turn into legacy authority. `support.ticket.assign` must not silently become self-assignment or escalation authority.

An assigned human must not be a ticket participant/related booking owner or borrower, an alias of that participant, or a prohibited investigator/approver. Compare verified-human StaffPerson/account associations where available; unresolved human identity means no independence proof, not an exception. Assignment changes revoke old channel grants/version immediately, close stale sockets and invalidate stale authorization. A role name or another case assignment is insufficient. Separate human review remains required for high-risk intervention; no small-team/bootstrap shortcut. If distinct authorized humans are unavailable, escalate/block the risky action without denying legitimate participant support obligations.

## Two independent participant-private channels

Proposed SupportParticipantChannel: immutable UUID, ticket FK, one bound participant User FK, verified relationship/side, createdAt, access policy version. Unique `(ticketId,participantUserId)`; optional side uniqueness only after product approves non-booking/report cases. For a two-party booking:

- Owner ↔ Support channel binds the actual owner, never the borrower.
- Borrower ↔ Support channel binds the actual borrower, never the owner.
- A marketplace participant is authorized only for their own bound channel and approved redacted ticket fields. Knowledge of ticket/channel IDs, ownership of the underlying listing or access to marketplace chat cannot expose the other channel, unread counts, message metadata, attachments or staff notes.
- Staff requires exact live assignment **and** specific channel grant and action. Being an assigned investigator does not imply every evidence source is accessible. Existing ADMIN privilege must not be an `OR` fallback in future scoped APIs. Any human emergency access would need its own approved narrow policy, not a wildcard role.
- Creation of one ticket/channel does not automatically invite the opposite participant, reveal reporter identity or merge their concerns. One-party/general-account cases require approved participant rules; do not pretend all reports have “borrowers.” Ambiguous/same-person two-sided relationships fail validation instead of merging privacy boundaries.

Proposed SupportMessage: channel FK, immutable author identity, body/content reference, per-channel sequence, server timestamp, client request key/hash for idempotency, policy version and moderation/delivery state only once those policies are approved. Unique per-channel sequence/request key; FK must bind message to the correct channel/ticket. Participant queries include authenticated participant ID; staff queries include exact assigned ticket/channel and trusted actor, with atomic audit. No post-fetch application filtering of unrestricted messages.

Do not reuse the existing Conversation owner/borrower shared audience by adding Support as a participant. Dedicated channel/message tables are justified by different privacy and access semantics, not a replacement for chat. Reviewed patterns such as request validation, sequence/idempotency, upload verification and outbox delivery may be reused. No transcript, private evidence, photos or attachments are copied automatically.

## Server and database boundary plan

Future public intake/read paths should derive requester from the session (e.g. `/api/support/tickets` and `/api/support/tickets/[id]/my-channel`); future scoped staff paths must be separate from legacy `/api/admin/*`. Exact API paths are proposed, not installed. Never accept a browser user/staff ID or “verified”/assignment flag to choose a channel. Revalidate resource relationships inside the scoped transaction, not only at routing.

Database reader/writer principals must lack unrestricted Support message SELECT and direct lifecycle writes. Prefer narrowly scoped functions/queries with trusted transaction-bound identity from the approved session/DAL; separately review FORCE RLS or function execution privileges for the actual connection architecture. A client-set GUC, spoofable actor parameter, migration-owner connection or session-pool state is not an authorization boundary. If safely bound database context is not available, private messaging rollout is blocked. Test direct database privilege denial, pooled-context reset, fail-closed grant revocation and all API/service boundaries before access is enabled.

Scope attachments by channel and independently authorize download; no public URL or arbitrary BookingEvidencePhoto ID is a permission. Reject cross-case/channel references even if the sender can access the source elsewhere. Begin 8B with text-only intake if approved; binary uploads and evidence references require separate policy and security review, upload scanning/limits, storage isolation, deletion/hold design and access auditing.

## Mediation, recommendations and notifications

No automatic copying, forwarding, summarization or cross-thread display. Later mediation would create a separately approved disclosure record binding exact selected permitted content/version, authorized sender/recipient, purpose/basis, consent where required, redactions, expiry and immutable audit. `support.mediation.routine_share` is currently blocked-policy in the registry; do not unblock it here. Sensitive sharing retains separate proposal/independent approval. Content change invalidates prior selection approval. Support investigates/recommends; separate authorized humans decide high-risk dispute outcomes.

Notifications must not include private body/evidence in push/email subjects/previews, leak another participant's ticket, or reveal account existence. Channel-bound outbox events require the same recipient scope, idempotency and delivery policy; delivery-provider setup is deferred. Lost-account/passkey recovery, password/email-only access restoration and emergency bypasses are not Support powers.

## Required negative tests before activation

Owner cannot read Borrower channel and vice versa, including IDs, counts, attachments, search/export, sockets and notifications; unrelated users denied; assigned staff denied on wrong case/channel; revoked/expired/suspended/stale versions denied; actor/role/session/assignment forgery denied; participants/investigators/aliases cannot approve their own high-risk action; grant/assignment races serialize and invalidate stale readers; required audit failure denies access; idempotency prevents duplicate intake/messages; replay/conflicting lifecycle versions fail; history is append-only; pooled DB identities cannot bleed; direct SELECT/writes under runtime principals denied; closure never changes Booking/Return/evidence; retention/hold behavior follows approved policy. All schema/upgrade fixtures run only in new owned disposable databases. No role activation is justified by these design documents.
