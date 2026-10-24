# Staff session, identity and audit attribution — Batch 3B

24 October 2026 (Asia/Taipei). Design and blockers; no provisioning, approval execution or role activation.

## Required additive design

Batch 3A's verified-human person and permanent account associations are prerequisites, not credentials. Existing AuthSession authenticates a marketplace account only. A future **StaffSessionBinding** must bind that exact session to a verified person, current account association, current fixed-role membership, persisted bigint authorization epoch, policy version and short-lived, issuer-verified step-up attestation. Store opaque attestation references and hashes, not authenticator secrets. No session role claim, browser-provided epoch/risk or external hash proves human identity. Canonical proofing must merge account aliases before conflict evaluation. Reject epoch values that cannot safely enter the existing numeric shadow evaluator; never silently truncate bigint values. The eventual production evaluator should use bigint-safe comparison consistently.

Each request must resolve the session and account from the trusted existing transport, then check account/session expiry, link verification/revocation, human verification, single eligible membership, membership validity, current epoch/policy, exact current grants and domain assignments. Revocation of any link/member/grant/person invalidates staff authorization without rewriting marketplace sessions. Existing sessions with no binding have no staff rights. Legacy ADMIN/ChatReviewer remains authoritative until a separate atomic cutover; no `ADMIN OR staffRole` or temporary ADMIN marker for new staff.

Future **StaffAssignment** and **EvidenceAccessGrant** overlays must reference canonical human/membership, exact domain resource/case, validity, authorization/policy versions, assignment provenance and bounded purpose/evidence versions. Existing ChatModerationCase.assignedTo is an account-based legacy assignment; it cannot be silently elevated into a verified-human general case grant. Bookings, disputes, reports and future support cases lack the complete assignment/provenance representation required by limited roles. Absent or unresolved mappings deny. Build trusted adapters that look up actual participant IDs, their canonical aliases, targets, investigators, recommenders and prior reviewers; never let request parameters fill conflict lists.

Future private support-channel grants must reference one exact OWNER or BORROWER channel and case. Case assignment does not imply channel access, disclosure consent, mediation sharing or authority over both participants. No support tables, screens or messaging feature is implemented in Batch 3B.

## Human attribution and audit boundary

PostgreSQL CURRENT_USER identifies the connection role, not the acting human. Batch 3A's immutable history and proposer/issuer/provenance references are preserved, but do not authenticate a writer. A future trusted application actor binding must derive human/account/session/membership from server-verified attestation and bind it to each exact action, authorization/policy version, resource/evidence version and purpose. The system must independently authenticate the actor rather than accept a caller-set person ID or PostgreSQL session variable.

Prepare a separate append-only **StaffAccessEvent** for sensitive reads, including exact evidence reference/version, purpose, outcome, trusted actor/session/attestation reference, current authorization version, action, resource/case, timestamp and bounded correlation ID. No raw messages, GPS, credentials, bytes, proof documents or broad request/error blobs. Sensitive bytes require durable audit in the same successful transaction (or a separately reviewed guaranteed durable protocol) before release. Audit failure must deny, not log-and-continue. Independent access to audit storage and immutable retention/export need review; do not let an ordinary runtime DB owner rewrite attribution. No real event writer or unrestricted ledger endpoint exists now; only a test-owned audit table exercises the transactional contract.

Transactions must resolve and recheck scope atomically with domain reads/writes. Repeatable-read gives consistent data, but hides later revocation commits. Batch 3B therefore requires a fresh fence and tests a second-connection epoch change. A future production implementation must also close the interval between fence, commit and release with compatible actor/resource locks or another reviewed protocol. Test lock ordering, cancellation, timeout, revocation writers, assignment transfer, evidence mutation and cache staleness. A boolean fixture fence is not production enforcement.

## Fresh human authentication requirements

| Operation | Future requirement |
| --- | --- |
| Any staff session establishment | Verified human + MFA + current membership/epoch + bounded session binding |
| Routine scoped metadata | Valid staff binding; bounded inactivity/absolute expiry; authoritative epoch checks |
| Private rental/moderation/support evidence or exports | Recent MFA/step-up, exact case/purpose/evidence grant, successful durable access audit; exports remain forbidden until separately reviewed |
| Staff grants, role changes, session/security controls, policy/geofence/high-risk settings | Fresh human step-up and independently authorized human decision where required |
| Serious sanctions, high-risk dispute outcomes, high-impact announcements | Distinct eligible verified humans, fresh step-up, exact approved request binding; no execution implemented |

Exact step-up TTL, authenticator recovery policy and emergency taxonomy still require approval. No fallback to a shared staff session, service principal or alternate-account vote when coverage is insufficient.

## Account correction, retention and database privileges

Permanent account links cannot be retargeted or deleted. Future correction needs an independently reviewed additive supersession/dispute mechanism retaining the original canonical identity, all aliases and immutable provenance. Do not create a second person to reset conflicts or rolling restriction budgets. Review mistaken-link remedies, data-subject requests, legal holds, minimal proof retention and the User deletion RESTRICT behavior before onboarding. Never publish the staff roster or proof hashes in Git or ordinary logs.

Review runtime and migration principals separately: the application must not own tables, alter constraints/triggers, create arbitrary SQL functions/triggers, truncate records or impersonate audit actors. Migration credentials need controlled, separately logged access and must not be the runtime default. Trigger-depth checks do not defend against a principal able to create arbitrary triggers. Do not casually add SECURITY DEFINER routines; any future minimal writer requires a separate privilege/search-path/injection review. The disposable test provisioner owns its fixtures by design; these tests do not attest production credentials. This batch changes no production credentials, role grants, infrastructure or schema.

## Cutover and subsequent approval-engine prerequisites

1. Approve the remaining role/field/purpose allocations and canonical human proofing, MFA, session binding, retention and account-correction procedures. Obtain sufficient independent human coverage; hold high-risk work when conflicts leave no eligible reviewer.
2. Add and test the session, assignment, evidence grant and attributable access-event models through separately reviewed forward migrations on fresh/populated owned fixtures. No historical edits or automatic ADMIN/ChatReviewer promotion.
3. Implement trusted persistence loaders, minimal DB privileges, attributable transactional audit and race-safe version/assignment rechecks. Rehearse revocation, stale sessions, alias conflicts, mixed application versions and audit outage.
4. Cover every legacy entry point, private media path, service/helper, server component and CLI in the [coverage report](ADMIN_SCOPED_ACCESS_REVIEW_BATCH_3B.md). Scope before aggregates; preserve participant access, legal Booking transitions, QR/camera/GPS, consent, checklists, receipt, disputes and immutable evidence.
5. Keep production inactive until independently reviewed enforcement adapters and an atomic cutover plan cover the entire surface. Only a separately approved forward migration may reconsider the ACTIVE-blocking CHECK constraints. Existing shadow MATCH/envelopes must never become bearer permits.
6. For a subsequent approval-engine batch, separately design immutable proposals/decisions bound to exact capability, canonical payload hash, target/evidence/policy/authorization versions and expiry. Separate proposal, approval and execution authority. Exclude participants, targets, investigators, recommenders and prior conflicted reviewers by canonical human identity; require current requester and approver eligibility/step-up at decision and execution. Use domain-transaction rechecks, idempotent execution and audit-failure rollback. No self-approval, emergency invariant bypass, general Booking status editor or financial/AI execution. This document authorizes none of those implementations.
