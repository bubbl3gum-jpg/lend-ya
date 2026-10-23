# Hustlen' Admin Control Center Blueprint v1

Date: 24 October 2026 (Asia/Taipei). Design only; no application behavior changed.

## Baseline and authority

Repository: `bubbl3gum-jpg/lend-ya`. Both local and remote `feature/temporary-local-meetup-testing` HEAD were verified as `cf215e0bdda92d7874329f16102c2a9ebd20a1be`. The branch has not advanced beyond the requested baseline. The working tree was clean before these documents.

The user's approved authority rules are requirements. Concrete thresholds, route/model names, metric definitions and role allocations below are **proposed implementation defaults**, not additional product approvals. Nothing in these documents implements permissions or approves a deployment. Unspecified authority is denied. Future changes require separate approval to code.

Companions: [gap analysis](ADMIN_GAP_ANALYSIS.md), [permission matrix](ADMIN_PERMISSION_MATRIX.md), [roadmap](ADMIN_IMPLEMENTATION_ROADMAP.md).

## 1. Interface and information architecture

| Sidebar group | Destination | Proposed content / route | Classification |
|---|---|---|---|
| General | Overview | `/admin`: four metrics, scoped attention queue, platform activity | Existing but needs modification |
| Operations | Bookings | Existing directory/details; bounded low-risk operations; dispute/incident subroutes | Existing but needs modification |
| Operations | Listings | Existing directory/details; restrictions and listing-report subroutes | Existing but needs modification |
| Operations | Locations | `/admin/locations`: catalogue, safety suspension, approved policy versions | Partially implemented (catalogue only; no Admin UI/API) |
| Community | Users | Existing directory/details; scoped temporary safety restrictions and review requests | Existing but needs modification |
| Community | Support | `/admin/support`: tickets, private channels, recommendations and approval queue | Partially implemented (current intake/cases are not tickets) |
| Community | Announcements | `/admin/announcements`: drafts, routine publication, high-impact review | Missing |
| System | Platform Settings | `/admin/settings`: typed low-risk settings and high-risk proposals | Missing |
| System | Security | `/admin/security`: staff, approval policy, access review, incidents | Partially implemented (guards exist; no center) |
| System | Audit Logs | Existing search/filter/pagination plus new action/approval references | Existing but needs modification |

Keep existing `/admin/reports`, `/admin/disputes`, `/admin/chat` URLs and IDs working. Nest their navigation under Listings, Bookings and Support respectively without silently merging their data or privacy rules. Support can link an assigned rental incident; Moderation remains a distinct case permission, not an unrestricted support inbox. Existing deep links should survive, with guarded redirects only if route moves are later approved. Pending approvals appear as a permission-scoped queue under Security and contextual tabs in each domain; no additional top-level sidebar item is necessary.

Use one responsive shell: grouped sidebar on desktop, accessible drawer on mobile, visible keyboard focus, `aria-current`, explicit group labels and predictable breadcrumbs. Scale content to available width rather than stretching every card. A four-card grid becomes two then one column; filter bars wrap; tables use bounded horizontal scrolling or detail cards. Preserve current confirmation/error/loading affordances and mobile navigation. No placeholder links for unimplemented screens should ship.

### Overview specification

Proposed four metrics, with definitions beside the query rather than ambiguous labels:

1. **Active rentals:** HANDOFF_PENDING + IN_USE + RETURN_PENDING + INSPECTION; show DISPUTED separately in attention, not hidden inside this count.
2. **Bookings awaiting owner decision:** PENDING, excluding administratively closed/cancelled records. Owner action remains required; this is not staff acceptance authority.
3. **Open support/incident cases:** nonterminal SupportTickets plus linked unresolved incidents, deduplicated by ticket; until tickets exist do not pretend chat coordination cases are this metric.
4. **Actionable safety/review items:** unique authorized queue entries needing staff action; count each case once even if linked to multiple alerts. Exclude approvals the viewer cannot act on.

All queries must be scoped before aggregation; unauthorized counts can leak private incidents. Show `as of` time, timezone and drill-down link with matching filters. New metrics may be unavailable until their models ship; do not fill them with fabricated zeros.

**Requires Attention:** scoped disputes/failed custody confirmations, pending approvals, expiring user restrictions, suspended stations awaiting review, report queues, unassigned/stranded cases and overdue obligations once a policy defines them. Each entry has severity, age, owner, reason summary and permitted next action. Listing a problem must not authorize changing Booking.status.

**Platform activity:** redacted immutable administrative events, separate from recent registrations/listings/bookings. Reuse existing recent-record queries as a distinctly labelled secondary panel. Exclude private support bodies, raw GPS, credentials and evidence bytes from activity feeds.

## 2. Role architecture

Fixed roles: **Super Admin**, **Operations Staff**, **Support Agent**, **Moderator**. A proposed `StaffMembership` links a human account to one fixed active role with grant/revoke metadata and authorization version. Role definitions and capability-to-role mapping are versioned application policy; no arbitrary dashboard-defined roles, wildcard grants or self-assigned capabilities in v1.

Marketplace Owner/Borrower flexibility remains unchanged. Do not replace marketplace `UserRole.USER` with an Owner/Staff hybrid. Existing `UserRole.ADMIN` and `ChatReviewer` are compatibility records to migrate carefully, not sufficient new authorization.

Every request and sensitive service operation checks persisted staff membership, account status, capability, resource/case scope, conflicts of interest, action risk and any approval. The sidebar is a reflection of permission, never the enforcement point. Super Admin has explicitly enumerated administrative capabilities, not a bypass for case privacy, participant consent, ownership markers or independent approvals. See the matrix for defaults.

## 3. Domain authority boundaries

### Bookings and disputes

Proposed direct low-risk Operations actions are **internal tag, follow-up assignment and acknowledgement of an operational alert**. They do not change dates, parties, money, agreed station, custody, evidence or rental state. This is a deliberately small initial allowlist; broad cancellation or date editing is not implicitly approved.

Support investigates an assigned incident and records a recommendation. A separate authorized human administrator approves high-risk outcomes; a constrained server executor applies only legal consequences using the existing lifecycle guards. No generic status editor. Reuse `resolveDispute` evidence requirements and Booking lock discipline, but split recommendation/approval/execution. Pending-handoff physical/digital mismatch needs a dedicated incident policy; do not bypass its absence with fabricated pickup evidence. Funds handling remains out of scope.

### Listings and users

Operations may directly restrict/restore listings under documented policies, with reason, case reference, expected version and mandatory audit. Restoration removes only the staff restriction, never owner inactivity, suspension, unresolved reports or missing-media restrictions.

Proposed temporary user safety restrictions are time-bounded, reasoned and policy-scoped. They must preserve return, inspection, dispute and private support obligations. Expiry removes only that restriction, not another concurrent sanction. Cumulative extensions/repeated short restrictions must escalate under a reviewed cap to prevent a de facto permanent sanction. Serious/long-term sanctions require distinct authorized human review. Identity verification, arbitrary account impersonation and password access are not granted powers.

### Locations and geofencing

Keep the official station catalogue and historical Booking.meetingStationId unchanged. Add an independent operational safety overlay keyed to canonical station identity. Operations can immediately **suspend** an unsafe station; restoration and sensitive geofence changes require independent approval. Neither a suspension timer nor the expiry of a proposal may automatically restore a station.

New booking selection/quote/request/acceptance must check effective station safety. Existing bookings retain the agreed station: display a warning and create coordination work instead of silently moving the meeting point. A suspended station must not produce new misleading station-arrival claims; a policy-approved assisted path must preserve actual custody obligations without faking location proof. Historic completed evidence retains the original policy/version.

Use immutable proposed/effective geofence-policy versions, provenance and bounded parameters, separate from source catalogue bytes. Missing coordinates cannot be converted to verified arrival by widening a radius or selecting a nearby interchange. Approved policy changes cannot disable freshness/accuracy/distance checks or mutate historical evidence. Define which active challenge policies invalidate/reissue when a station is suspended or its effective policy changes before implementation.

### Isolated Geofencing Test Lab

Expose the lab only in a development runtime attached to a verified owned disposable `hustlen_test_*` database, with explicit demo-participant and staff-lab allowlists. A production Super Admin cannot enable it by a dashboard setting. A production Locations page may describe the lab but must not run it or connect to its database.

Two proposed center sources: `BROWSER_CURRENT` (on-demand genuine device reading) and `MAP_SELECTION` (explicit interactive map choice). Map selection chooses only a simulated center; it never fabricates participant device readings. Both require bilateral simulation acknowledgement, booking/generation scope, unchanged check-in policy, TEST_LOCATION assurance, one-hour expiry, revocation and cleanup. Keep center coordinates in ephemeral memory, out of URLs/logs/audit payloads and official station records. Static catalogue map rendering can be reused; current MRT selector selects stations, not arbitrary GPS centers. Effective PostgreSQL connection overrides must be rejected/validated before using the current hostname guards. Current camera regression is an unresolved acceptance gate, not justification to weaken QR protections.

### Support and controlled mediation

A ticket is not the marketplace conversation. Create independent Owner-to-Support and Borrower-to-Support private channels. Participants may see their own channel only; no hidden forwarding of the opposite channel, internal notes or unrelated marketplace chat. Staff access requires assignment/case grant and purpose; attachments use a scoped audited access route.

A mediation message must be a newly composed/redacted item, explicitly marked shareable to a specific channel/audience and recorded in a disclosure ledger with author, purpose, source references and consent/lawful-policy basis. Default is private. High-risk disclosures need independent authorization; protected evidence/third-party identifiers must not be copied simply because the operator can read them. Support recommendations link bounded evidence rather than exporting entire chats. Legal basis/retention and who may consent are policy gates, not automatically supplied by a UI checkbox.

### Announcements and settings

Routine announcements: authorized Operations/Support staff, approved audience/format/link allowlist, moderation/preview, reason, schedule, immutable revision and audit. High-impact notices (safety/legal, large affected population, account/rental consequences) need independent approval bound to exact content, audience and schedule. Expedited emergency workflow retains distinct human actors: an on-duty initiator and independent approver use pre-reviewed templates, short expiry and mandatory review. One available staff member cannot publish an unapproved high-impact notice; immediate station/user deny-only safety controls remain available separately.

Platform Settings is a typed allowlist, not an editor for environment variables, SQL, secrets or arbitrary JSON. Candidate low-risk settings: support display hours, page-size defaults within fixed bounds and approved nonsecurity help text. High-risk changes include operational geofence policy and restriction thresholds; require approval. Payment, authorization, audit, evidence, production-test-mode and custody invariants are not settings that can be disabled, even with two approvals. Settings classify risk server-side and store immutable versions. Account settings remain self-service name/profile behavior, never staff-role management.

## 4. Independent human approval protocol

A proposed `AdminChangeRequest` stores requester principal/person, recorded investigator/recommender identities, action type/risk, resource ID, expected resource/evidence version, canonical payload/hash, policy version, expiry and idempotency key. Append-only decisions reference that exact hash and version.

Proposed lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED/CANCELLED/EXPIRED, then APPROVED → EXECUTED or STALE. Terminal history is immutable; edits create a new revision and invalidate earlier approval. APPROVED never means unrestricted future authority. Failed transient execution may be retried under the same key only if the approval remains current; stale resources require a new proposal.

For a high-risk action require a distinct active **human person**, not merely a different account ID. Approver must hold the action-specific approval capability and cannot be requester, recommendation author, recorded investigator, subject, booking participant or otherwise conflicted. A Super Admin cannot approve their own proposal, use an alias account or supply a service agent as the second human. Approval after role revocation/account restriction/expiry must be rejected. A minimum of two independently authorized humans is required; appeal review may need a third independent person if the original two are conflicted.

At execution, one transaction locks proposal/decision/resource in a documented order; rechecks fresh human grants, step-up session assurance, conflicts, payload hash, policy/resource/evidence versions and expiry; verifies legal domain invariants; writes the domain effect, execution marker and mandatory audit atomically. A unique execution/idempotency constraint prevents double application. External publication uses a transactional outbox and the same immutable revision key; retries cannot publish a different audience/body. Audit failure fails closed. A forged approved status or browser-supplied risk classification is never sufficient.

Emergency urgency cannot waive two-human high-risk approval. If only one qualified person exists, high-risk actions remain unavailable; escalation or adding a legitimately independent authorized human is an operational prerequisite.

## 5. Audit, bootstrap and future service agents

Preserve existing `AdminAuditLog` rows and its immutability trigger. Add append-only references to proposals, decisions, execution, permission/policy versions, principal type and correlation IDs. Current log rows reference a human User with an integer target ID; do not fabricate a human user or force UUID resources into numeric IDs for future service events. An additive generalized event envelope can reference legacy logs and typed string resource IDs without rewriting them. Separate denied/failed-request security events from committed domain events; neither should contain private text/GPS/secret values.

Record grants/revocations, safety restrictions/restorations, settings versions, announcement revisions/publication, case assignment/disclosure, evidence access, approval/rejection/execution and emergency use. Keep field-limited/redacted read models; evidence-read audit must commit before bytes are released. Retention/backup policies must preserve meaningful accountability without promising indefinite exposure of private evidence.

Bootstrap staff from an independently reviewed roster, not a blanket ADMIN→Super Admin mapping. Provision the first two independently verified Super Admin humans through a documented controlled operator procedure with reconciliation/audit, then enable normal grant approval. Two humans with only one approval-eligible SA are insufficient for staff-grant changes or SA-authored high-risk requests under the proposed matrix. Do not implement an anonymous first-admin endpoint or self-approval exemption. Protect last-capable-admin availability without allowing a lone operator to impersonate a second approver. In a small team, queue high-risk changes and arrange authorized external/duty coverage; document the resulting service-level limitation.

Future AI/service agents are **Future/deferred**. Design event envelopes/principals now, but do not create autonomous administrative powers. Later proposals must use separate nonhuman identity, explicit narrow capability/tenant/resource/time limits, bounded untrusted input, no shared human credentials and human approval for high-risk actions. AI may eventually draft a summary or tag recommendation; it must not approve human requests, see all private channels, broaden its own grant, make custody claims or disable invariants. Existing shadow analysis is advisory and not a permission architecture.

## 6. Remaining policy inputs

Before coding the affected batch: approve temporary restriction durations/cumulative caps; exact low-risk booking allowlist; station-suspension effects on existing challenges and assisted exchange; serious-sanction thresholds; routine versus high-impact notice criteria and emergency staffing; support sharing/retention rules; high-risk setting allowlists/bounds; which independent humans may approve and cover appeals. The authority direction is fixed by the approved blueprint; these numerical/scope decisions must not be silently invented during implementation.
