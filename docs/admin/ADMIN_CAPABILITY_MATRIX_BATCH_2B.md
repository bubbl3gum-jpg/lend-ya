# Batch 2B capability-to-role contract matrix

24 October 2026 (Asia/Taipei). **Inactive candidate policy, not staff grants.** Source: `lib/authorization/registry.ts`; earlier broad planning matrix remains historical proposed input.

C = role-level authority expressly confirmed by product rules, still inactive and requiring approved domain policy plus exact scope. P = proposed allocation requiring product approval before activation. B = blocked for every role until product policy/allocation is approved. — = denied. A MATCH in shadow is never permission, proposal approval or execution. All rows require active verified human membership, current session/version and exact server-loaded resource grants.

| Action | SA | OPS | SUP | MOD | Risk / scope |
| --- | --- | --- | --- | --- | --- |
| `overview.read` | P | P | P | P | READ / RESOURCE |
| `bookings.read` | P | P | P | P | READ / RESOURCE |
| `bookings.internal_tag.write` | B | B | — | — | LOW / RESOURCE |
| `bookings.followup.assign` | B | B | — | — | LOW / RESOURCE |
| `bookings.alert.acknowledge` | B | B | — | — | LOW / RESOURCE |
| `bookings.status.write` | — | — | — | — | FORBIDDEN / RESOURCE |
| `disputes.investigate` | P | P | P | — | READ / ASSIGNED_CASE |
| `disputes.recommend` | P | P | P | — | LOW / ASSIGNED_CASE |
| `disputes.resolution.request` | P | — | P | — | HIGH / ASSIGNED_CASE |
| `disputes.resolution.approve` | P | — | — | — | HIGH / ASSIGNED_CASE |
| `custody_incidents.recommend` | B | B | B | — | LOW / ASSIGNED_CASE |
| `custody_incidents.resolution.request` | B | — | B | — | HIGH / ASSIGNED_CASE |
| `custody_incidents.resolution.approve` | B | — | — | — | HIGH / ASSIGNED_CASE |
| `listings.read` | P | P | P | P | READ / RESOURCE |
| `listings.restrict` | P | C | — | P | LOW / RESOURCE |
| `listings.restore` | P | C | — | P | LOW / RESOURCE |
| `listings.restriction.request` | — | — | P | — | LOW / ASSIGNED_CASE |
| `listing_reports.review` | P | P | — | P | READ / ASSIGNED_CASE |
| `locations.read` | P | P | P | P | READ / RESOURCE |
| `locations.suspend` | P | C | — | — | LOW / RESOURCE |
| `locations.suspension.request` | — | — | P | P | LOW / RESOURCE |
| `locations.restore.request` | P | P | — | — | HIGH / RESOURCE |
| `locations.restore.approve` | P | — | — | — | HIGH / RESOURCE |
| `geofence_policy.change.request` | P | P | — | — | HIGH / RESOURCE |
| `geofence_policy.change.approve` | P | — | — | — | HIGH / RESOURCE |
| `geofence_lab.use` | P | P | — | — | LOW / LAB |
| `users.directory.read` | P | P | P | P | READ / RESOURCE |
| `users.temporary_safety_restrict` | B | B | B | B | LOW / ASSIGNED_CASE |
| `users.temporary_safety_release` | B | B | B | B | LOW / ASSIGNED_CASE |
| `users.serious_sanction.request` | P | P | P | P | HIGH / ASSIGNED_CASE |
| `users.serious_sanction.approve` | P | — | — | — | HIGH / ASSIGNED_CASE |
| `users.serious_sanction_restore.request` | P | P | P | P | HIGH / ASSIGNED_CASE |
| `users.serious_sanction_restore.approve` | P | — | — | — | HIGH / ASSIGNED_CASE |
| `support.queue.read` | P | P | P | P | READ / RESOURCE |
| `support.ticket.assign` | P | — | P | — | LOW / RESOURCE |
| `support.channel.read` | P | — | P | — | READ / PRIVATE_CHANNEL |
| `support.channel.write` | P | — | P | — | LOW / PRIVATE_CHANNEL |
| `support.internal_notes.write` | P | — | P | — | LOW / ASSIGNED_CASE |
| `support.mediation.routine_share` | B | — | B | — | LOW / ASSIGNED_CASE |
| `support.mediation.sensitive_share.request` | P | — | P | — | HIGH / ASSIGNED_CASE |
| `support.mediation.sensitive_share.approve` | P | — | — | — | HIGH / ASSIGNED_CASE |
| `support.ticket.close` | P | — | P | — | LOW / ASSIGNED_CASE |
| `chat_cases.queue_claim` | P | — | — | P | LOW / CASE_QUEUE |
| `chat_cases.evidence.read` | P | — | — | P | READ / ASSIGNED_CASE |
| `chat_cases.routine_decision` | P | — | — | P | LOW / ASSIGNED_CASE |
| `chat_cases.appeal_decision` | P | — | — | P | LOW / ASSIGNED_CASE |
| `chat_cases.reassign` | P | — | — | — | LOW / RESOURCE |
| `evidence.rental_case.read` | P | P | P | — | READ / ASSIGNED_CASE |
| `evidence.export` | — | — | — | — | FORBIDDEN / RESOURCE |
| `evidence.modify` | — | — | — | — | FORBIDDEN / RESOURCE |
| `announcements.draft` | P | P | P | P | LOW / RESOURCE |
| `announcements.routine.publish` | P | P | P | — | LOW / RESOURCE |
| `announcements.high_impact.request` | P | P | P | P | HIGH / RESOURCE |
| `announcements.high_impact.approve` | P | — | — | — | HIGH / RESOURCE |
| `announcements.emergency_high_impact.request` | P | P | P | — | HIGH / RESOURCE |
| `announcements.emergency_high_impact.approve` | P | — | — | — | HIGH / RESOURCE |
| `settings.low_risk.write` | B | B | B | — | LOW / RESOURCE |
| `settings.high_risk.change.request` | P | P | P | — | HIGH / RESOURCE |
| `settings.high_risk.change.approve` | P | — | — | — | HIGH / RESOURCE |
| `security.staff_grant_revoke.request` | P | — | — | — | HIGH / RESOURCE |
| `security.staff_grant_revoke.approve` | P | — | — | — | HIGH / RESOURCE |
| `security.policy_change.request` | P | — | — | — | HIGH / RESOURCE |
| `security.policy_change.approve` | P | — | — | — | HIGH / RESOURCE |
| `security.access_review` | P | — | — | — | READ / RESOURCE |
| `security.session_revoke` | P | — | — | — | LOW / RESOURCE |
| `approvals.queue.read` | P | P | P | P | READ / RESOURCE |
| `audit.read` | P | P | P | P | READ / RESOURCE |
| `audit.update_delete` | — | — | — | — | FORBIDDEN / RESOURCE |
| `security.disable_invariants` | — | — | — | — | FORBIDDEN / RESOURCE |
| `payments.move_funds` | — | — | — | — | DEFERRED / RESOURCE |
| `ai.assist.summarize` | — | — | — | — | DEFERRED / RESOURCE |
| `ai.assist.classify` | — | — | — | — | DEFERRED / RESOURCE |
| `ai.credentials.issue` | — | — | — | — | DEFERRED / RESOURCE |
| `ai.autonomous_admin` | — | — | — | — | DEFERRED / RESOURCE |

## Product decisions still required

- The old matrix’s all-role temporary user suspension/release allocation is **not approved**. Both contracts deny every role, including Super Admin, even with scope grants. Decide authorized domains/roles, maximum duration, cumulative limits and who may lift which overlay before activation. Serious sanctions are separate proposals requiring independent authorization; proposal rights here are themselves proposed.
- Three explicit OPS allocations reflect confirmed authority: policy-bounded listing restriction/restoration and immediate station suspension. They never lift owner inactivity, other sanctions or unresolved safety restrictions, and do not restore a station. Exact policy and atomic audit remain prerequisites.
- The three concrete low-risk booking actions (internal tags, follow-up assignment, alert acknowledgement) are proposed examples, not approved action allowlists; they remain blocked. No booking status/date/party/price/deposit editor exists. Pending-handoff recovery also remains blocked until a separately approved custody policy exists.
- All Super Admin allocations, Support/Moderator domain allocations, evidence eligibility, approval-role assignments, staff-grant authority, support disclosure rules, routine-notice bounds and settings-key allowlists require explicit review. A role name never grants unassigned case access, the opposite support channel, private chat search or evidence export.
- Routine mediation sharing and low-risk settings remain blocked pending disclosure basis/audience policy and per-key allowlists. High-risk requests and approvals are different identifiers; no execute capability or approval engine exists.
- “P” rows may MATCH only in the candidate evaluator. `readyForActivation` is always false. There is no activation flag or production membership loader. A future cutover must resolve these allocations and domain policies, not reinterpret P as an approved grant.

## Contract clarifications

- The unsafe generic planning label `bookings.high_risk_change` is deliberately unknown/denied. Explicit future dispute and custody proposal contracts replace any general status-edit implication; current legal transitions and participant receipt/evidence checks remain authoritative.
- Support’s proposed listing/station recommendations use separate `.request` actions; they do not inherit the direct mutation capability. Private support read and write are separate capabilities, with exact Owner/Borrower channel grants.
- All AI entries are DEFERRED and all service principals are denied. Future AI assistance requires its own principal/capability review; there are no credentials, human-role mappings or autonomous execution rights.
- Security invariants, audit rewriting, evidence modification/export and arbitrary booking status editing remain forbidden regardless of role, grant or claimed approval.
- High-risk approval eligibility requires recent verified human step-up, a distinct currently eligible human requester, exclusion of participants/subjects/investigators/recommenders/original reviewers, and exact action/resource/version/evidence/policy/payload/expiry binding. This evaluates eligibility only; persistence, locking and execution are not implemented.
