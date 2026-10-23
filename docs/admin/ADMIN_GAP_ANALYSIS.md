# Admin Control Center Blueprint v1 — implementation gap analysis

Date: 24 October 2026 (Asia/Taipei). Read-only analysis with documentation-only deliverables.

## 1. Baseline and evidence standard

Repository `bubbl3gum-jpg/lend-ya`; reference branch `feature/temporary-local-meetup-testing`. Local HEAD and remote ref both equal `cf215e0bdda92d7874329f16102c2a9ebd20a1be`. No advanced-branch delta needed evaluation; this exact commit is the baseline. No application code, historical migration or database was changed for this analysis.

[Blueprint](ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md) specifies target behavior; [matrix](ADMIN_PERMISSION_MATRIX.md) specifies proposed authorization; [roadmap](ADMIN_IMPLEMENTATION_ROADMAP.md) orders changes. Proposed routes/models are design candidates, not implemented APIs.

Classifications used for **every feature row**: **Existing and verified**, **Existing but needs modification**, **Partially implemented**, **Missing**, **Future/deferred**. Verified means the specifically described existing behavior has same-baseline executable evidence, not that the proposed Blueprint capability exists or all paths are proven.

Complexity: S = roughly 1–3 focused engineer-days; M = 4–8; L = 9–15; XL = 16–25+. Estimates include focused tests, assume current stack familiarity and exclude waiting for policy/operational approvals. They are not commitments; overlapping rows share infrastructure and must not be simply summed. Privacy/approval migrations have higher risk than visual layout work.

### Recovered execution evidence (not rerun here)

These logs were produced during the preceding audit of the same commit in this conversation and were recovered intact in the current workspace. This analysis inspected code and reports only; it did not rerun database-changing suites or connect to user databases.

| Suite | Existing evidence | Artifact reference |
|---|---|---|
| Admin | PASS, 7 test nodes; real ADMIN login/records, directories, permissions, desktop/mobile | `.test-artifacts/ef919849d8c3eebaae189886`; `/tmp/hustlen-audit/test:admin.json` and `.log` |
| Moderation/admin mutations | PASS, 10 nodes; restrictions, reports, disputes, concurrency, audited changes and UI forms | `.test-artifacts/c170061da40fdecf20f3b07f`; `/tmp/hustlen-audit/test:moderation.json` |
| Chat/reviewer | PASS, 14 nodes; scoped grants, claims, evidence, decisions/appeals, browser delivery and restart | `.test-artifacts/a84ef701a5d3b7952f4d64ef`; `/tmp/hustlen-audit/test:chat.json` |
| Admin migration | PASS, 1 node; forward/history preservation fixtures | `.test-artifacts/791134b1891de0086352b426`; `/tmp/hustlen-audit/test:admin-migration.json` |
| Meetup initial run | FAIL, 9 nodes: 7 pass, 2 fail including parent | `.test-artifacts/1cc11c9d06451ab5dd4df039` |
| Meetup serial retry (previously inaccessible) | FAIL, 9 nodes: 7 pass, 2 fail including parent | `.test-artifacts/401feabe6370092c0eaf9afc`; `/tmp/hustlen-audit/test:meetup.json` |

The serial retry is now known to have failed, not passed. Its fake-camera browser assertion did not show the expected verified-booking feedback; this is not evidence that role/consent API gates failed. Preserve the test limitation as a lab/camera acceptance dependency. User-reported Android success is physical-device context, not a new device test performed here. Test-node counts include aggregate parents. Logs/artifacts are local and may not exist in a fresh checkout; test files and this recorded result are the review references, not a claim of remote CI success.

## 2. Feature-by-feature gaps and reuse

| ID | Feature | Classification | Exact source / behavior inspected | Gap / reusable part | Complexity |
|---|---|---|---|---|---|
| G01 | Responsive Admin shell | Existing but needs modification | `app/admin/layout.tsx::AdminLayout`, `components/admin/navigation.tsx::AdminNavigation/AdminBreadcrumbs` | Reuse guarded shell, responsive sidebar/details, breadcrumbs; add grouped nav and role-aware destinations | M |
| G02 | Overview counts and recent records | Existing and verified | `lib/admin/data.ts:56 getAdminOverview`, `app/admin/page.tsx::Overview`; admin tests | RepeatableRead counts/recent records are real; not yet four-metric Blueprint overview | S to reuse |
| G03 | Four metrics + Requires Attention + platform activity | Partially implemented | Same overview plus `lib/admin/cases.ts::caseDirectory` | New scoped cross-domain aggregation, definitions, dedup/age/assignment; distinguish audit activity from recent records | M–L |
| G04 | Booking directory/details | Existing and verified | `getAdminDirectory('bookings')`, `getAdminBooking`; `components/admin/details.tsx:323 AdminBookingDetail` | Reuse filters/history/read DTOs; currently no general staff booking-write endpoint | S to reuse |
| G05 | Limited low-risk booking actions | Missing | Admin booking routes expose GET only; participant changes in `app/api/bookings/[id]/route.ts` are not staff authority | New bounded internal tags/follow-up/alert actions and scoped audit; no status editor | M |
| G06 | Listing directories and moderation | Existing but needs modification | `lib/admin/mutations.ts:187 moderateListing`, `AdminListingDetail`, listing moderation PATCH | Atomic reason/version/audit reusable; broad ADMIN must become per-action OPS/MOD scope; preserve other restrictions | M |
| G07 | Listing reports | Existing but needs modification | `resolveReport:236`, `caseDirectory/caseDetail`, report pages | Reuse immutable allegation/decision history; add assignment/scope and policy distinctions, maintain old URLs | M |
| G08 | Locations catalogue | Partially implemented | `prisma/schema.prisma:109 MrtStation`, `lib/mrt/network.ts:24 eligibleStationWhere`, `lib/mrt/import.ts::importMrt` | Catalogue/operational flag exists; no staff safety overlay/history or Admin location UI/API | L |
| G09 | Immediate station suspension / approved restoration | Missing | No `app/api/admin/locations` or station action service | Operational safety state + reason/version, booking/quote/accept integration, approval-bound restoration | L |
| G10 | Sensitive real-geofence policy management | Partially implemented | `lib/meetup/location.ts::locationSettings/evaluateLocation`; `lib/meetup/config.ts` | Env-bounded checks exist; no effective policy version, approvals or safe Admin editor | L |
| G11 | Current-GPS isolated demo | Existing but needs modification | `lib/meetup/test-location.ts`, `lib/meetup/service.ts:34 testAllowed/:66 temporaryLocation`, `components/meetup-verification.tsx::setTemporaryLocation`, `scripts/local-meetup-demo.ts` | Current GPS/dual consent/expiry remain; staff lab gate and effective-host guard hardening needed; camera evidence not fully passing | M |
| G12 | Interactive-map Test Lab selection | Missing | `components/mrt/MRTMap.tsx`, `MRTStationSelector.tsx` select canonical stations, not arbitrary test centers | Reuse drawing/navigation geometry only; add simulated map center adapter and consent/generation flow, no real-station writes | M–L |
| G13 | User directory and account restriction | Existing but needs modification | `lib/admin/mutations.ts:134 moderateUser`; schema `AccountStatus`; user status PATCH | Binary unbounded ACTIVE/SUSPENDED and broad ADMIN today; need scoped expiring restrictions, cumulative caps, independent serious sanction review | L |
| G14 | Four staff roles and granular permissions | Missing | `schema.prisma:14 UserRole` only USER/ADMIN; `lib/admin/auth.ts:13/:19`, `mutations.ts:101 actor` | Reuse persisted account lookup; no role union/wildcard or automatic legacy privilege expansion | XL shared foundation |
| G15 | Extra reviewer grant, case assignment, appeals | Existing but needs modification | `schema.prisma:435 ChatReviewer/:442 ChatModerationCase`, `lib/chat/moderation.ts::reviewer/caseRecord/claim/decide` | Strong case/conflict/audit controls reusable; four-role mapping and audited reassignment missing | M–L |
| G16 | Structured support intake | Partially implemented | `app/customer-service/page.tsx`, `lib/chat/service.ts::coordination`, `lib/meetup/service.ts:1135 assistance` | Guidance + structured coordination cases exist; no dedicated SupportTicket/SLA/ownership lifecycle | L |
| G17 | Separate private Owner and Borrower support messaging | Missing | `Conversation` ties Owner/Borrower together; `ChatModerationCase` snapshots are not private support threads | New ticket channels and ACLs, scoped attachments/internal notes; do not repurpose marketplace chat | XL |
| G18 | Controlled mediation/disclosure | Missing | No support-channel disclosure model or endpoint | Explicit audience/basis/redaction/disclosure ledger and separate sensitive-share approval | L |
| G19 | Dispute investigation and guarded outcomes | Existing but needs modification | `lib/admin/mutations.ts:307 resolveDispute`; `lib/admin/cases.ts:213 caseDetail`; moderation tests | Existing legal outcomes/evidence locks/audit reusable; same ADMIN can investigate/decide, no approval separation | L |
| G20 | Pending-handoff incident reconciliation | Missing | `app/api/bookings/[id]/dispute/route.ts:55`; assistance cases cannot reconcile custody | New approved incident policy, bounded recommendation/execution; never fabricate bilateral pickup | L–XL |
| G21 | Routine announcements | Missing | No announcement route/model/page | Typed audience, draft/revision/schedule, safe rendering, publication/audit/outbox | M–L |
| G22 | High-impact / emergency notice approval | Missing | No announcement or generic approval service | Exact content/audience revision approval; expedited two-human emergency path | L, after approval foundation |
| G23 | Low-risk Platform Settings | Missing | Configuration currently env/hardcoded; `lib/chat/config.ts` and meetup config are not dashboard settings | Per-key schema/risk/version service; no secret/env editor | M |
| G24 | High-risk settings and invariant protection | Missing | No approvals or settings model; hardcoded domain guards exist | Independent approval within immutable bounds; forbidden invariant-disable action always rejected | L |
| G25 | Security center / staff access lifecycle | Partially implemented | `lib/auth.ts::getCurrentUser`, current guards, `scripts/create-admin.ts`, `scripts/chat-reviewer.ts` | Session/role controls exist; no staff grant/review UI, MFA/step-up workflow or independent human approvals | L–XL |
| G26 | Audit logs / evidence-read accountability | Existing but needs modification | `schema.prisma:334 AdminAuditLog`, `lib/admin/evidence.ts:5 readDisputeEvidence`, audit-log page/API | Preserve immutable logs/audited reads; add proposal/config/publication/disclosure/principal events and scoped projections | L |
| G27 | Independent high-risk approval foundation | Missing | No change-request/approval/execute model; only confirmations and expectedStatus/version checks | Window.confirm and two sequential clicks are not independent authorization | XL |
| G28 | Account settings dependency | Existing but needs modification | `app/api/account/route.ts::PATCH`, `components/account-settings.tsx` | Self name change only; keep isolated from staff grants/policy. Add staff step-up/security to separate system, not this API | S integration / L identity work |
| G29 | AI recommendations | Partially implemented | `lib/chat/analysis/jobs.ts`, `provider.ts`, `cloud.ts`; `components/chat/reviewer.tsx` | Deterministic mock shadow + synthetic-only adapter; no autonomous authority or live Admin agent | S for preserving advisory boundary |
| G30 | Autonomous AI service agents | Future/deferred | No administrative ServicePrincipal/capability execution system | Plan separate identity/audit envelope now; no agent powers, credentials or execution in this phase | Future XL |
| G31 | Payment/deposit movement | Future/deferred | Booking monetary fields are snapshots; no payments Admin subsystem | Do not introduce payment approvals or settlement authority under dispute/settings work | Out of scope |

### UI/components worth retaining

- `components/admin/ui.tsx`: AdminTitle, AdminPanel, AdminTable, DetailFields, StatusBadge and formatting helpers. Retain semantic headings/tables and test mobile overflow; standardize proportional spacing and timezone conventions separately.
- `directory.tsx::AdminDirectory` and `lib/admin/query.ts::parseAdminQuery`: allowlisted query keys, bounded pagination, filters and links. New role projections must be applied in services, not merely hide columns.
- `details.tsx::AdminUserDetail/AdminListingDetail/AdminBookingDetail`: evidence/history detail composition. Separate capabilities for each action; current broad participantSelect exposes email and is too broad as a universal new-role DTO.
- `cases.tsx::AdminCaseDirectory/AdminCaseDetail`: immutable history and case forms. Do not assume a listing report, rental dispute, support ticket and chat case share identical permission/visibility rules.
- `action-form.tsx::AdminActionForm`: required reason, explicit human confirmation and error handling. Reuse for low-risk actions; replace high-risk direct-submit semantics with propose/review/execute UX. Browser confirmation is not approval.
- `components/chat/reviewer.tsx::ChatQueue/ChatCase`: bounded case snapshot, explicit claim, audited evidence refresh and recommendations labelled unverified. Keep assignment/independent appeal checks; add reassignment rather than granting all staff all conversations.
- `components/rental-evidence.tsx`, `lib/booking-evidence.ts`: attributed rendering and sanitized private images. New support attachments must retain purpose/ACL/audit rules, not use public listing media.
- `MRTMap.tsx`/`MRTStationSelector.tsx`: rendering, zoom/pan/search and bilingual identities. Arbitrary map selection is new behavior and cannot turn a schematic SVG coordinate into latitude/longitude without an explicitly correct transform/map source.

## 3. Permission and data architecture gaps

Current ADMIN can read general directories and execute user/listing/report/dispute actions after active-role checks. Sensitive write services reread persisted authorization in their transaction; expected status/flags and domain locks prevent stale actions, and audit writes commit atomically. This is a good integrity foundation but not four-role separation.

Rental evidence uses a distinct case-scoped route, but any active ADMIN who knows a dispute/photo ID can meet the current role guard; there is no general investigation assignment requirement. Rental dispute decisions do not exclude an ADMIN who is a rental participant or its investigator. Chat is stricter: active ADMIN + explicit ChatReviewer grant + assignment + participant/original-reviewer conflicts. New roles must not flatten this stronger architecture into a generic staff flag.

`AdminAuditLog` has human User/admin FK, integer target IDs and immutable rows. Future approval/disclosure/UUID resources and service identities require additive event representation. Existing `ChatOutboxEvent` supports chat-domain events, not an automatically reusable authorization or publication queue. No production staff/MFA/bootstrap/dual-approval flow exists. Local helper restrictions must remain; a new Support role cannot be made ADMIN merely to pass old route checks.

## 4. Proposed additive model and endpoint candidates

All names below are suggestions for a later approved implementation. Create **new forward migrations only** and preserve original records/IDs/checksums. Do not overload existing evidence/chat fields to evade constraints.

| Model / versioned record | Purpose / key invariants | Proposed API surface |
|---|---|---|
| StaffPerson, StaffMembership, StaffGrantEvent | Verified human identity; one fixed active role; grant/revoke/version history; no aliases for approval | `/api/admin/me/capabilities` GET; `/api/admin/security/staff` GET; staff change via approved change request |
| AdminChangeRequest, AdminApprovalDecision, AdminExecution | Exact action/payload/resource/evidence/policy version; expiry; different human; unique execution key | `/api/admin/change-requests` GET/POST; `/{id}` GET; `/{id}/submit`, `/approve`, `/reject`, `/cancel`, `/execute` POST |
| AdministrativeEvent (additive envelope) | Typed principal/resource refs + legacy log ID, immutable safe metadata; no secret/GPS/text blobs | Existing audit GET extended with server projections; no UPDATE/DELETE endpoint |
| BookingOperation, OperationalWorkItem | Allowlisted internal tag/follow-up/alert acknowledgements only | `/api/admin/bookings/{id}/operations` POST; read in existing detail |
| AccountSafetyRestriction, restriction events | Scope/reason/start/expiry/cumulative limits; independent serious sanctions; preserve obligations | `/api/admin/users/{id}/restrictions` GET/POST, `/{rid}/release` POST; serious changes via request/approval |
| StationSafetyState, StationSafetyEvent | Canonical ID; append-only reason/history; deny-only immediate suspension; restoration only approval-bound | `/api/admin/locations` GET; `/{id}` GET; `/{id}/suspend` POST; restoration via change request |
| GeofencePolicyVersion | Provenance/bounds, immutable revisions and effective version; never rewrite source catalogue | `/api/admin/locations/{id}/policy` GET; proposed changes through change requests |
| SupportTicket, TicketAssignmentEvent | Link listing/booking/dispute without merging histories; status/priority/ownership/version/SLA | Participant `/api/support/tickets` GET/POST; staff `/api/admin/support/tickets` GET; `/{id}` GET; `/assign`, `/status` POST |
| SupportChannel, SupportMessage | Unique Owner-private/Borrower-private channel per ticket/party; audience immutable; separate internal notes | Participant `/api/support/tickets/{id}/messages` GET/POST (own channel); staff scoped `/{id}/channels/{channel}/messages` GET/POST |
| SupportEvidenceGrant, SupportAttachment | Bound purpose/ticket/actor/resource, private sanitized bytes and audited access | Scoped participant/staff attachment upload/read paths; no general photo-by-ID bypass |
| SupportInternalNote, MediationDisclosure | Internal-only notes; explicit shareable redacted message with audience/basis/source refs and disclosure audit | `/{ticket}/notes` GET/POST; `/{ticket}/mediation-proposals` POST; sensitive sharing via approval |
| DisputeRecommendation, CustodyIncident | Immutable investigation/recommendation version, linkage to approval and original rental evidence | `/api/admin/disputes/{id}/recommendations` POST; `/api/admin/bookings/{id}/incidents` POST; execution only approved legal action |
| Announcement, AnnouncementRevision, Publication | Immutable body/audience/schedule classification; one publication per revision; delivery state | `/api/admin/announcements` GET/POST; `/{id}/revisions` POST; `/publish` for routine only; high-impact through requests |
| PlatformSettingDefinition, SettingVersion | Code-defined typed key/risk/bounds; effective version; no secrets or invariant switches | `/api/admin/settings` GET; `/{key}` PATCH for low-risk allowed keys only; high-risk through requests |
| GeneralOutboxJob / domain publication outbox | Approved immutable payload, idempotent external side effect, retry/failure/monitoring | Internal worker interface, not arbitrary staff enqueue/execute API |
| Future ServicePrincipal and scoped grant | Separate nonhuman identity; expiry/resources and actor type | No v1 active API; future/deferred |

Test Lab should reuse the isolated booking-scoped meetup API only after separate staff-lab/runtime validation; a proposed `/api/admin/lab/test-centers` adapter must not become a production endpoint or accept a caller-chosen real database/booking. Add `centerSource` discrimination for current-GPS vs map selection; never accept client-provided actor/risk/ownership assertions as authority.

Ticket channel uniqueness must prevent a party from becoming the opposite private-channel member by creating a second ticket or guessing an ID. All proposal/action routes need idempotency, expected versions, JSON/body limits, same-origin defenses and server-side domain validators. These route names are not permission rules themselves.

## 5. Cross-domain dependencies

| Dependency | Required design / integration boundary |
|---|---|
| Customer Service → Support | Replace static guidance with ticket entry only when ticket ACL/attachments/routing exist; keep current report/dispute links and unavailable-service explanations until then |
| Account settings → Security | Self profile editing cannot accept staff role, sanction state, approval identity or settings. Add staff MFA/step-up separately, do not use account rename as a verified person identity |
| Support → Bookings/disputes | Read assigned bounded evidence; recommend; a distinct administrator approves; existing lifecycle/immutable records govern execution |
| Support → Marketplace chat | Independent private support channels; explicit bounded evidence grants if a marketplace excerpt is needed; no default full-history access |
| Locations → MRT import/selector/booking/QR | Effective safety overlay must survive import and be checked consistently in selector/quote/request/accept and challenge policy; preserve historic agreed station |
| Test Lab → Locations | Reuse safe display identities only; no mutation/import/export path from test center to effective real geofencing |
| Users → existing obligations | Restriction expiry/restoration must be additive and scoped; preserve return/inspection/dispute/support availability |
| Announcements → Settings/outbox | Risk classification and audience caps are code policy, not editable thresholds that let notices downgrade themselves; no new notification provider assumed |
| Approvals → Security/audit | Persisted human grants, conflicts, step-up and immutable payload must exist before enabling high-risk actions; audit failure rolls back |
| AI → all domains | Advisory output is untrusted input, not authorization. Separate future principal/capability and human approval; no new autonomous worker in this work |

## 6. Security risks and safeguards required by the new powers

| Risk | Present foundation / gap | Required safeguard and gate |
|---|---|---|
| Legacy ADMIN bypass after partial RBAC rollout | Old role checks remain throughout wrappers, service functions and pages | Inventory and replace every path before new lower-privilege onboarding; raw API/service negative tests |
| Same-person/two-account self-approval | No independent-approval model | Verified staff-person binding; requester/investigator/subject conflicts; no Super Admin or emergency exemption |
| Approval replay or changed target/payload | ExpectedStatus exists, but not payload-bound approval | Canonical hash, resource/evidence/policy versions, expiry, execution uniqueness and transactional recheck |
| Staff sanctions used to conceal unresolved property | Binary suspension allows legitimate obligations today | Preserve obligation routes; bounded scope/cumulative limits; serious sanctions reviewed; tests of overlapping restrictions |
| Station restoration or radius edit produces false safety | Only catalogue operational/env settings today | Deny-only suspension; approved immutable restoration/policy version; invalidate unsafe new proofs, preserve history |
| Test coordinates leak into real geofencing/logs | Existing test mode has memory/marker safeguards; host query override caveat | Effective driver-host validation, own DB name/marker, prod refusal, separated test API/data, no raw coordinates in logs/URLs |
| Support leaks one party's private channel to the other | No ticket private-channel system | Server channel ACL and field projection; explicit disclosure ledger, redaction, purpose, scoped audited evidence access |
| Generic admin reads expose excessive PII | Current ADMIN-wide selectors include participant email | Per-role/resource DTOs/count scoping and no bulk export by default; evidence access purpose/assignment |
| Case decisions corrupt custody or erase evidence | Guarded existing outcomes; pending-handoff recovery absent | Reuse legal validators, design incidents separately; no arbitrary state editor or fabricated receipt, even after approval |
| Emergency announcement becomes phishing/bulk abuse | No announcement system | Risk classifier, restricted links/audiences, dual-human exact revision approval, rate/size limits and revoke/audit |
| Settings disable authorization, audits or test isolation | Current guards are code/env, no settings service | Immutable invariant allow-deny policy; reject unknown keys and risk downgrades; never secret/env editor |
| Audit failure, sensitive logs or overbroad audit browsing | Transactional domain audit works; generic error logger forwards Error objects | Atomic success audit; protected denial events; redaction/retention; do not promise tamperproof external anchoring |
| Reviewer leaves with open cases | Claim prevents takeover; no handover route | Audited scope-preserving reassignment and independent appeals/offboarding |
| AI prompt injection or identity confusion | Existing mock/synthetic analysis is advisory | No administration execution now; later explicit nonhuman least privilege and no counted human approval |
| One-person bootstrap/incident team | No safe separation-of-duties operational workflow | Controlled roster/bootstrap; high-risk work blocked until distinct eligible humans available; document SLA constraints |

These are risks introduced or exposed by the proposed authority model, not claims that each is an exploited current vulnerability. Dependency advisories, private-data-safe logging, durable backups/restore and trusted ingress from the preceding MVP audit remain deployment prerequisites and are not solved by a dashboard redesign.

## 7. Decision summary

Reuse the tested directories, detail composition, validated queries, transactional audit, rental guards and scoped chat reviewer flows. Implement authorization and approvals **before** exposing new high-risk screens/actions. Do not start by visually reorganizing the existing broad ADMIN powers and then assume granular roles exist. G14/G27 and private support isolation are the largest shared foundations; simple shell changes can ship independently only with unchanged server behavior and explicit labels.

No implementation, database migration/reset, merge or deployment was performed. Proposed thresholds and resource policies identified in the blueprint need confirmation before their batch is authorized.

## Appendix A — complete existing Admin entry-point inventory

All paths below were read from the baseline source. This is an entry-point/guard inventory, not a claim of exhaustive runtime path coverage. Existing behavior coverage is the recovered Admin/moderation/chat evidence in section 1; Blueprint roles and approvals are not implemented.

### Pages (14)

| Exact file | Rendered implementation / permission path |
|---|---|
| `app/admin/audit-logs/page.tsx` | `AdminCaseDirectory (`audit-logs`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/bookings/[id]/page.tsx` | `AdminBookingDetail`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/bookings/page.tsx` | `AdminDirectory (`bookings`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/chat/[id]/page.tsx` | `ChatCase`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/chat/page.tsx` | `ChatQueue`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/disputes/[id]/page.tsx` | `AdminCaseDetail (`disputes`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/disputes/page.tsx` | `AdminCaseDirectory (`disputes`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/listings/[id]/page.tsx` | `AdminListingDetail`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/listings/page.tsx` | `AdminDirectory (`listings`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/page.tsx` | `Overview`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/reports/[id]/page.tsx` | `AdminCaseDetail (`reports`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/reports/page.tsx` | `AdminCaseDirectory (`reports`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/users/[id]/page.tsx` | `AdminUserDetail`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |
| `app/admin/users/page.tsx` | `AdminDirectory (`users`)`; active ADMIN through layout plus component/page checks; chat data also needs ChatReviewer/case scope |

Shared wrappers: `app/admin/layout.tsx` (AdminLayout), `app/admin/loading.tsx`, `app/admin/error.tsx`. The layout verifies active ADMIN. Detail/query components also check before data access. These wrappers are reusable, but not four-role authorization.

### APIs (21)

| Exact file | Explicit method | Handler / guard |
|---|---|---|
| `app/api/admin/audit-logs/route.ts` | GET | `adminApi` → `caseDirectory`; field-limited existing ADMIN projection |
| `app/api/admin/bookings/[id]/route.ts` | GET | `adminApi` → `getAdminBooking`; field-limited existing ADMIN projection |
| `app/api/admin/bookings/route.ts` | GET | `adminApi` → `getAdminDirectory`; field-limited existing ADMIN projection |
| `app/api/admin/chat/cases/[id]/claim/route.ts` | POST | `chatApi(..., true)` → `claim`; active ADMIN + reviewer/case checks |
| `app/api/admin/chat/cases/[id]/decision/route.ts` | POST | `chatApi(..., true)` → `decide`; active ADMIN + reviewer/case checks |
| `app/api/admin/chat/cases/[id]/route.ts` | GET | `chatApi(..., true)` → `readCase`; active ADMIN + reviewer/case checks |
| `app/api/admin/chat/cases/route.ts` | GET | `chatApi(..., true)` → `queue`; active ADMIN + reviewer/case checks |
| `app/api/admin/disputes/[id]/evidence/[photoId]/route.ts` | GET | explicit active ADMIN → `readDisputeEvidence`; case-bound audited bytes |
| `app/api/admin/disputes/[id]/resolve/route.ts` | POST | `adminMutation` → `resolveDispute`; transaction actor recheck |
| `app/api/admin/disputes/[id]/route.ts` | GET | `adminApi` → `caseDetail`; field-limited existing ADMIN projection |
| `app/api/admin/disputes/route.ts` | GET | `adminApi` → `caseDirectory`; field-limited existing ADMIN projection |
| `app/api/admin/listings/[id]/moderation/route.ts` | PATCH | `adminMutation` → `moderateListing`; transaction actor recheck |
| `app/api/admin/listings/[id]/route.ts` | GET | `adminApi` → `getAdminListing`; field-limited existing ADMIN projection |
| `app/api/admin/listings/route.ts` | GET | `adminApi` → `getAdminDirectory`; field-limited existing ADMIN projection |
| `app/api/admin/overview/route.ts` | GET | `adminApi` → `getAdminOverview`; field-limited existing ADMIN projection |
| `app/api/admin/reports/[id]/resolve/route.ts` | POST | `adminMutation` → `resolveReport`; transaction actor recheck |
| `app/api/admin/reports/[id]/route.ts` | GET | `adminApi` → `caseDetail`; field-limited existing ADMIN projection |
| `app/api/admin/reports/route.ts` | GET | `adminApi` → `caseDirectory`; field-limited existing ADMIN projection |
| `app/api/admin/users/[id]/route.ts` | GET | `adminApi` → `getAdminUser`; field-limited existing ADMIN projection |
| `app/api/admin/users/[id]/status/route.ts` | PATCH | `adminMutation` → `moderateUser`; transaction actor recheck |
| `app/api/admin/users/route.ts` | GET | `adminApi` → `getAdminDirectory`; field-limited existing ADMIN projection |

### Services, permission checks and reusable components

| Exact file | Functions / checks inspected (baseline line numbers) |
|---|---|
| `lib/admin/auth.ts` | `requireAdminPage:13`, `adminApi:19` |
| `lib/admin/cases.ts` | `caseQuery:58`, `caseDirectory:120`, `caseDetail:213` |
| `lib/admin/data.ts` | `getAdminOverview:56`, `pagination:132`, `getAdminDirectory:140`, `getAdminUser:199`, `getAdminListing:234`, `getAdminBooking:257` |
| `lib/admin/evidence.ts` | `readDisputeEvidence:5` |
| `lib/admin/mutations.ts` | `adminMutation:13`, `input:90`, `actor:101`, `audit:111`, `moderateUser:134`, `moderateListing:187`, `resolveReport:236`, `resolveDispute:307` |
| `lib/admin/query.ts` | `toSearchParams:18`, `parseAdminQuery:27`, `adminRecordId:98` |
| `components/admin/action-form.tsx` | `AdminActionForm:5` |
| `components/admin/cases.tsx` | `AdminCaseDirectory:21`, `AdminCaseDetail:285`, `CaseHistory:500` |
| `components/admin/details.tsx` | `recordId:25`, `BookingHistory:34`, `AdminUserDetail:61`, `AdminListingDetail:193`, `AdminBookingDetail:323` |
| `components/admin/directory.tsx` | `AdminDirectory:21` |
| `components/admin/navigation.tsx` | `AdminNavigation:14`, `AdminBreadcrumbs:37` |
| `components/admin/ui.tsx` | `AdminTitle:12`, `StatusBadge:26`, `AdminPanel:35`, `DetailFields:49`, `AdminTable:69`, `AdminRecordLink:127` |
| `lib/chat/http.ts` | `fail:8`, `integer:9`, `fields:14`, `text:17`, `explanation:21`, `json:26`, `page:32`, `chatApi:39` |
| `lib/chat/moderation.ts` | `reviewer:8`, `caseRecord:16`, `audit:25`, `queue:29`, `claim:36`, `readCase:47`, `decide:63` |
| `components/chat/reviewer.tsx` | `ChatQueue:8`, `ChatCase:15` |
| `lib/auth.ts` | `derivePasswordKey:25`, `hashSessionToken:37`, `newSessionCredential:46`, `persistSession:53`, `setSessionCookie:67`, `hashPassword:79`, `verifyPassword:85`, `createSession:104`, `deleteCurrentSession:110`, `getCurrentUser:123` |
| `lib/marketplace-permissions.ts` | `requireActiveAccounts:5` |
| `scripts/create-admin.ts` | `usage:7`, `readEmailArgument:12`, `main:34` |
| `scripts/chat-reviewer.ts` | `main:4` |
| `proxy.ts` | `proxy:2` |

Related source dependencies also inspected: `lib/chat/service.ts` (coordination and participant chat), `lib/chat/config.ts`, `lib/chat/analysis/{jobs,provider,cloud}.ts`, `app/customer-service/page.tsx`, `app/api/account/route.ts`, `components/account-settings.tsx`, `components/site-header.tsx`, `lib/meetup/{config,location,service,test-location}.ts`, `lib/mrt/{network,import}.ts`, `components/mrt/{MRTMap,MRTStationSelector}.tsx`, `components/meetup-verification.tsx`, `scripts/local-meetup-demo.ts`, participant Booking routes and `lib/rental-lifecycle.ts`. Existing code has no approved Admin location/test-lab, support-channel, announcement or settings routes beyond those inventoried.

## Appendix B — related database and migration dependencies

| Existing model / exact schema line | Current purpose / migration concern |
|---|---|
| `User` — `prisma/schema.prisma:53` | USER/ADMIN and ACTIVE/SUSPENDED, identity/profile; no four-role membership or verified staff-person binding |
| `AuthSession` — `prisma/schema.prisma:96` | Hashed persisted sessions; keep existing actor/session identity while adding current authorization checks |
| `Listing` — `prisma/schema.prisma:126` | Owner status and adminRestricted; effective restoration must preserve other restrictions |
| `ListingReport` — `prisma/schema.prisma:285` | Allegation and final decision; no separate investigation/approval actors |
| `Booking` — `prisma/schema.prisma:160` | Agreed station, state, pricing and parties; no generic Admin metadata operation model |
| `Handoff` — `prisma/schema.prisma:200` | Attributed bilateral condition records; cannot fabricate/change as a support resolution |
| `Return` — `prisma/schema.prisma:224` | Borrower statement and independent Owner inspection; preserve original records |
| `Dispute` — `prisma/schema.prisma:250` | Finding/outcome/resolver fields; no support recommendation or independent approval linkage |
| `BookingEvidencePhoto` — `prisma/schema.prisma:320` | Private bytea/photos by actor and stage; maintain audited purpose-specific access |
| `AdminAuditLog` — `prisma/schema.prisma:334` | Immutable human admin FK/int target, reason/before/after; additive event refs needed |
| `MrtStation` — `prisma/schema.prisma:109` | Canonical identity/operational catalogue metadata; no separate administrative safety history/policy approval |
| `ListingStation` — `prisma/schema.prisma:149` | Listing-to-station availability, not a station safety suspension policy |
| `Conversation` — `prisma/schema.prisma:364` | Marketplace Owner/Borrower pair; cannot stand in for two independent private support channels |
| `ConversationParticipant` — `prisma/schema.prisma:385` | Marketplace membership/read cursors, not case-staff assignment grants |
| `ChatMessage` — `prisma/schema.prisma:395` | Attributed immutable body/hash/status/sequence; no unrestricted support forwarding |
| `ChatReviewer` — `prisma/schema.prisma:435` | Extra enabled grant for an ADMIN; preserve/review individually during migration |
| `ChatModerationCase` — `prisma/schema.prisma:442` | Assigned bounded snapshot, version/appeal and decision; not a general ticket/approval model |
| `MessageReport` — `prisma/schema.prisma:477` | Report refs and dedup; preserve original allegation |
| `ChatWarning` — `prisma/schema.prisma:492` | Human moderation warning/history; no general temporary AccountSafetyRestriction expiry |
| `ChatOutboxEvent` — `prisma/schema.prisma:510` | Chat-specific outbox; does not itself authorize announcements/settings execution |
| `ChatAnalysisJob` — `prisma/schema.prisma:521` | Mock-shadow advisory work, no autonomous administrative authority |
| `MeetupSession` — `prisma/schema.prisma:541` | Booking opt-in/version; real/lab separation cannot be changed by staff setting |
| `MeetupCheckIn` — `prisma/schema.prisma:553` | Immutable arrival bands/policy ID; test records not real station verification |
| `MeetupFallback` — `prisma/schema.prisma:576` | Bilateral reduced-assurance reason/check pair; no staff consent substitution |
| `MeetupChallenge` — `prisma/schema.prisma:594` | Actor/state/version/expiry/receipt proof; retain all guards under policy/incident changes |
| `MeetupEvent` — `prisma/schema.prisma:626` | Immutable booking event history; no raw test coordinates |
| `MeetupRate` — `prisma/schema.prisma:637` | Booking-scoped rate counters; keep abuse protection during lab integration |

Relevant immutable history: `prisma/migrations/20261014010000_admin_moderation/migration.sql` (admin flags/audit immutability), `20261014020000_dispute_case_history/migration.sql` (dispute history), `20261013100000_private_rental_evidence/migration.sql` (attributed private evidence), `20261019120000_private_chat_safety/migration.sql` (chat/reviewer/evidence constraints), `20261019180000_chat_shadow_analysis/migration.sql` (advisory jobs), `20261019210000_mrt_meetup_verification/migration.sql` and `20261020090000_meetup_confirmation_window/migration.sql` (meetup evidence/proof protections), `20261016100000_official_mrt_stations/migration.sql` (canonical station history). All names refer under `prisma/migrations/`; do not edit them or rebaseline existing databases.

Tests inspected for relevant guard/history/operation expectations: `tests/admin.integration.test.ts`, `tests/moderation.integration.test.ts`, `tests/chat.integration.test.ts`, `tests/core-stability.integration.test.ts`, `tests/moderation-migration.test.ts`, `tests/meetup.integration.test.ts`, `tests/meetup-test-location.test.ts`, `tests/support/test-database.ts` and `tests/run-isolated.ts`. Prior database tests used isolated ownership-marked fixtures; this documentation task did not rerun them.
