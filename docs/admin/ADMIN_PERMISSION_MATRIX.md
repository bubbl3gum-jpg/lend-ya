# Admin permission matrix — Blueprint v1

Date: 24 October 2026 (Asia/Taipei). Proposed policy; not implemented.
Baseline: `feature/temporary-local-meetup-testing`, `cf215e0bdda92d7874329f16102c2a9ebd20a1be` (local and remote match).

**Batch 6C product approval:** Operations Staff may use `listings.read` only for exactly granted listing IDs, limited to `id`, `status`, `category`, and `adminRestricted`, under authenticated and audited access. This narrow policy is approved; runtime staff activation is not. All other allocations retain their existing approval status.

Related: [blueprint](ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md), [gaps](ADMIN_GAP_ANALYSIS.md), [roadmap](ADMIN_IMPLEMENTATION_ROADMAP.md).

## 1. Policy vocabulary

Exactly four fixed roles: Super Admin (SA), Operations Staff (OPS), Support Agent (SUP), Moderator (MOD). Proposed v1 default is one active staff role per verified human membership. Do not combine role grants to evade a restriction. Account status, case assignment, conflict rules and independent approval apply in addition to role.

- **D**: direct action within the resource/policy scope. Reason, expected version, validation and audit still required for mutations.
- **S**: scoped read/action only after explicit assignment/purpose or evidence grant. Not global search/export authority.
- **P**: may submit a high-risk proposal/recommendation in the assigned domain; cannot execute it merely by submitting.
- **P/A**: may propose, or independently approve another eligible human's proposal; never both on the same action. Execution is a constrained system operation under approved payload, not a raw staff mutation.
- **—**: denied, including direct API calls. Hidden controls are not enforcement.
- **LAB**: additionally requires owned disposable development database, demo/staff allowlists and all test-mode invariants. No production override.

A value with S also applies to SA. Case access is not automatic just because staff has a powerful role. Staff who are parties, targets or material investigators in the action cannot be its independent approver. Full private evidence and participant text must not be embedded in global directory DTOs.

## 2. Action matrix

Except for the explicitly approved OPS read scope above, every identifier below is a proposed server-side action/capability, not a route or permission that exists today. P/A rights must be split into separate `.request` and `.approve` checks in implementation; D never implies approval rights.

| Capability / action | SA | OPS | SUP | MOD | Scope / risk / condition |
|---|---|---|---|---|---|
| `overview.read` | D | D | D | D | Return only permitted metrics/queues; filter before count |
| `bookings.read` | S | D | S | S | OPS operational fields only; SUP assigned ticket; MOD linked case |
| `bookings.internal_tag.write` | D | D | — | — | Fixed low-risk internal tags, no participant-visible state change |
| `bookings.followup.assign` | D | D | — | — | Assign operational work; recipient must be authorized |
| `bookings.alert.acknowledge` | D | D | — | — | Acknowledges queue item, not pickup/return/custody |
| `bookings.high_risk_change` | P/A | P | P | — | Only enumerated legal consequences; no generic status/date/amount editor |
| `disputes.investigate` | S | S | S | — | Assigned case, purpose and bounded evidence; maintain participant privacy |
| `disputes.recommend` | P | P | P | — | Immutable recommendation; not a resolution |
| `disputes.resolution` | P/A | — | P | — | SUP recommendation; distinct SA approval; original domain evidence gates remain |
| `custody_incidents.recommend` | P | P | P | — | Requires separately approved pending-handoff recovery policy |
| `custody_incidents.resolution` | P/A | — | P | — | No fabricated party consent, checklist, location or return record |
| `listings.read` | D | S | S | S | OPS: approved exact-ID grants and four-field projection only, authenticated and audited; other allocations remain proposed |
| `listings.restrict` | D | D | P | D | Approved safety/report policy, documented reason, version and audit; MOD case-scoped |
| `listings.restore` | D | D | — | D | Within policy/case; cannot remove other effective restrictions |
| `listing_reports.review` | S | S | — | S | Claim/assignment and original evidence; no blanket private-chat access |
| `locations.read` | D | D | S | S | Catalogue/safety metadata; never raw participant GPS |
| `locations.suspend` | D | D | P | P | Immediate deny-only safety overlay; no automatic timer restoration |
| `locations.restore` | P/A | P | — | — | Distinct human approval tied to station/safety-state version |
| `geofence_policy.change` | P/A | P | — | — | Sensitive bounds/source/policy changes; immutable source and historic evidence |
| `geofence_lab.use` | D+LAB | D+LAB | — | — | Existing demo participants retain own consent; staff cannot impersonate them |
| `users.directory.read` | D | S | S | S | Field-limited; no universal email/private-record export |
| `users.temporary_safety_restrict` | D | D | D | D | Authorized domain/case, bounded expiry/cumulative cap, reason, preserve obligations |
| `users.temporary_safety_release` | D | D | D | D | Only policy-authorized own/domain restriction; no lifting another sanction |
| `users.serious_sanction` | P/A | P | P | P | Long-duration/serious sanctions require independent review; no unilateral permanent ban |
| `users.serious_sanction_restore` | P/A | P | P | P | Same separation and expected-version rules |
| `support.queue.read` | D | S | D | S | Metadata scoped by domain; no bodies in queue projection |
| `support.ticket.assign` | D | — | D | — | SUP within own authorized queue; cross-team escalation by SA |
| `support.channel.read_write` | S | — | S | — | Assigned private Owner/SUP or Borrower/SUP channel only |
| `support.internal_notes.write` | S | — | S | — | Explicit internal visibility; never returned to participants |
| `support.mediation.routine_share` | S | — | S | — | New redacted statement; explicit approved basis/audience, disclosure audit |
| `support.mediation.sensitive_share` | P/A+S | — | P+S | — | Narrow approved disclosure, not access to opposite channel by default |
| `support.ticket.close` | S | — | S | — | Close service work only; cannot close a rental/dispute or discard evidence |
| `chat_cases.queue_claim` | S | — | — | S | MOD eligibility replaces reviewed ChatReviewer grants only through migration plan |
| `chat_cases.evidence.read` | S | — | — | S | Assigned case snapshot; audited read, never unrestricted chat search |
| `chat_cases.routine_decision` | S | — | — | S | RELEASE/REJECT/WARN/DISMISS; no account or rental sanctions |
| `chat_cases.appeal_decision` | S | — | — | S | Different human from original decision; requester/participants excluded |
| `chat_cases.reassign` | D | — | — | — | Audited transfer to eligible nonconflicted reviewer; no evidence disclosure until grant |
| `evidence.rental_case.read` | S | S | S | — | Only needed assigned investigation; commit access audit before bytes |
| `evidence.export` | — | — | — | — | Not enabled by v1; separate privacy/export policy required |
| `announcements.routine.publish` | D | D | D | — | Fixed approved audience/format constraints; server risk classifier |
| `announcements.draft` | D | D | D | D | Draft has no publication side effect |
| `announcements.high_impact` | P/A | P | P | P | Exact revision/body/audience/schedule; distinct human approval |
| `announcements.emergency_high_impact` | P/A | P | P | — | Expedited dual-human route, bounded templates/TTL; no lone-operator exception |
| `settings.low_risk.write` | D | D | D | — | Per-key domain allowlist; SUP support-hours/help metadata only |
| `settings.high_risk.change` | P/A | P | P | — | Per-key risk policy and distinct human approval |
| `security.staff_grant_revoke` | P/A | — | — | — | Two humans; no self-grant, alias approver or automatic legacy escalation |
| `security.policy_change` | P/A | — | — | — | Versioned reviewed policy within immutable invariants |
| `security.access_review` | D | — | — | — | Grant/activity metadata, not all private evidence |
| `security.session_revoke` | D | — | — | — | Narrow defensive action, mandatory audit/notification as policy permits; no login-as-user |
| `approvals.queue.read` | S | S | S | S | Own/domain proposal status; approval eligibility checked separately |
| `audit.read` | D | S | S | S | Redacted SA metadata; others own/assigned/domain events only |
| `audit.update_delete` | — | — | — | — | Forbidden by invariant; retention/archival is a separate governed process |
| `security.disable_invariants` | — | — | — | — | Forbidden even after approval |
| `payments.move_funds` | — | — | — | — | Future/deferred; no payment authority implied |
| `ai.autonomous_admin` | — | — | — | — | Future/deferred; no service agent implementation in v1 |

SA queue ownership does not imply SA has read/write access to private support bodies. OPS can request help on a ticket without receiving both parties' conversations. MOD has chat-case scope, not support-case messaging scope. The distinct roles need not share all features simply because a sidebar has a destination.

## 3. Fixed low-risk / high-risk boundary

Direct low-risk operations cannot mutate booking dates, station, price, deposit, status, party IDs, condition records or physical receipt. New direct booking actions beyond the three listed require explicit policy review. Routine listing restoration cannot reactivate an owner-inactive listing or clear unresolved reports. Temporary user restrictions require configured duration/cumulative limits and cannot be chained to avoid independent sanction review.

Station restoration, sensitive geofence changes, serious user sanctions, high-impact notices, high-risk settings, staff grants and high-risk dispute/custody outcomes always follow the approval protocol. Request payloads cannot label themselves low-risk. New action identifiers default to denied until reviewed. Batch endpoints enforce permissions/risk per resource; a batch cannot turn many low-risk changes into an unreviewed high-impact notice or mass sanction.

Immutable invariants: server authorization; distinct-human high-risk approval; participant evidence/receipt requirements; legal Booking state transitions; evidence immutability/access auditing; test-mode production exclusion; station identity preservation; bounded real-geofence checks; secret non-disclosure. They are not configurable booleans in Platform Settings.

## 4. Migration from ADMIN and ChatReviewer

Current source: `prisma/schema.prisma:14` has USER/ADMIN only; `lib/admin/auth.ts:13,19`, `lib/admin/mutations.ts:13,101`, `lib/admin/evidence.ts:5`, `lib/chat/http.ts::chatApi` and `lib/chat/moderation.ts::reviewer` enforce that architecture. `scripts/create-admin.ts` is a local/nonproduction promotion helper; `scripts/chat-reviewer.ts` grants only in owned test databases. Neither is a production staff onboarding service.

Proposed staged migration:

1. Inventory existing ADMINs/reviewer grants through a reviewed restricted procedure; record intended role, scopes, person identity, reviewer eligibility and owner. Do not publish roster/private records in docs.
2. Add StaffMembership, grant history/authorization version and human-person binding through a **new** forward migration later. Preserve UserRole, AuthSession, ChatReviewer and existing audit/evidence rows. Populate no new authority by default. No automatic ADMIN→SA or enabled ChatReviewer→unrestricted MOD conversion.
3. Create a central capability policy, field-limited DTOs and scoped service gates. Existing admins may remain in an explicit reviewed legacy cohort during a bounded compatibility window; new lower-trust staff must be unable to use legacy broad ADMIN routes. Until every route/page/service is gated, do not onboard those staff or set ADMIN just to satisfy old wrappers.
4. Replace every authorization surface, including old evidence routes, server component queries, chat wrappers/reviewer checks, navigation and scripts. Sensitive service functions recheck current membership/scope inside their write/read-audit transaction. Remove legacy fallback atomically with enabling new lower-privilege roles. There must never be `new permission OR user.role===ADMIN` as an unrestricted bypass.
5. Review each old reviewer grant individually; retain case assignment/conflict checks and case history. Keep unmapped grants inactive in the new system; do not move case bodies. Provide controlled reassignment for stranded cases, never silent assignment to the mapping operator.
6. Invalidate stale authorization caches/sessions as needed; getCurrentUser must not treat a cookie's old staff role as authority. Tests prove immediate revocation and legacy-endpoint denial. New menu/capability APIs disclose only safe effective access, not private grant audit data.
7. After reconciliation and regression gates, retire legacy checks/helper usage in a later approved change; historical role/grant/log records remain intelligible. Rollback must not restore blanket privileges to newly onboarded staff.

A User with a new staff membership must never be provisioned a broad legacy ADMIN marker as a shortcut before permission migration is complete. Keep marketplace role semantics and authenticated account self-service separate.

## 5. Independent approval checks and operational constraints

For each high-risk execution require: authorized requester and distinct authorized human approver; approved domain/action; no participant/subject/investigator/recommender conflict; exact payload/resource/evidence/policy version; unexpired immutable decision; current grants/account status; recent step-up human authentication; one execution/idempotency key; atomic effect plus audit. Approval permission alone grants no data access outside the approval's bounded evidence purpose.

Bind human identity to a verified staff-person record under a controlled process. Two accounts for one founder do not satisfy separation. Role changes and human-identity changes are sensitive approved events, not a way to reset conflict tracking. Service principals cannot count as independent humans. Original reviewer cannot decide their own appeal.

Bootstrap needs at least two qualified humans for high-risk work and a controlled initial provisioning/runbook. Under this proposed matrix, staff-grant changes and SA-authored high-risk requests specifically require two independently eligible Super Admins. One SA plus an OPS requester can handle eligible OPS-originated proposals, but that staffing arrangement cannot approve the SA's own requests or change staff grants. A two-person team may lack an eligible independent appeal reviewer; hold the case and bring in another authorized reviewer. If no distinct approver is available, queue or reject high-risk execution; do not add a self-approval or break-glass invariant bypass. Emergency high-impact announcements retain this rule. Immediate station suspension and bounded safety restriction remain separate deny-only powers, with accountability and escalation.

## 6. Tests generated from this matrix

For each capability, test every role in direct HTTP calls and server service invocation; also anonymous, ordinary USER, suspended/revoked staff, stale session, changed grant and wrong resource scope. Assert forbidden paths return no private content and perform no mutation/audit-success event. Test field projection and counts independently of UI visibility.

Approval tests: same account, alias accounts bound to same person, investigator approval, subject/participant conflicts, revoked approver, expired/modified payload, policy/evidence drift, duplicate concurrent execute, audit failure rollback and outbox retry. Test all old routes so a UI-only migration cannot preserve broad authority accidentally. Separate caller-auth failure events from committed action audit; no sensitive payloads in either.
