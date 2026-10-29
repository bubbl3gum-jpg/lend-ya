# Hustlen' — Original 14-Stage Master Development Roadmap

**Canonical product roadmap.** Supplied and confirmed by the product owner on 26 October 2026. No existing canonical 14-stage file was found; this file records the original stages without replacing or renumbering the existing Blueprint engineering plan. Future work must identify its master stage. Engineering batches (6A, 7D, 8B, 9A, 10A, etc.) are implementation increments, not product stages.

Progress updated for Batch 12C (Stage 10 non-egress experiment preparation; live-model authorization remains incomplete and earlier blockers unchanged). Status vocabulary: **Planned / In Progress / Implemented Candidate / Production Ready**. Implemented Candidate means an independently reviewable implementation exists; it does not mark the whole stage complete or authorize production. **No stage is newly declared Production Ready.** Historical reports are evidence for their own revisions; the Batch 10C selected regression ledger records current reruns.

Cross-references: [Blueprint v1](../admin/ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md), [gap analysis](../admin/ADMIN_GAP_ANALYSIS.md), [permission matrix](../admin/ADMIN_PERMISSION_MATRIX.md), [engineering implementation roadmap](../admin/ADMIN_IMPLEMENTATION_ROADMAP.md). Preserve original objectives below; update the progress fields as verified increments land.

## 1. Complete Admin Blueprint

Design the complete Control Center, its navigation, settings, functionality, roles and future AI permissions.

- **Status:** Implemented Candidate
- **Implemented functionality:** Approved Blueprint v1 documents define grouped navigation, authority boundaries, fixed-role/capability design and deferred AI controls.
- **Remaining functionality:** Production policy details and later product decisions remain explicit; design approval is not operational activation.
- **Relevant engineering batches:** Blueprint v1 planning
- **Verification evidence:** docs/admin/ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md; ADMIN_PERMISSION_MATRIX.md
- **Production blockers:** Unresolved product decisions and independent production acceptance.

## 2. Audit & Implementation Planning

Compare the agreed blueprint with the existing repository. Identify reusable components, missing systems and required migrations.

- **Status:** Implemented Candidate
- **Implemented functionality:** Repository gap analysis, exact legacy entry-point inventories, permission matrix and incremental engineering roadmap exist. Batch 10A adds announcement/configuration audit.
- **Remaining functionality:** Keep inventories current and review each additive migration, scope and rollout dependency.
- **Relevant engineering batches:** Initial audit; 2B; 10A
- **Verification evidence:** docs/admin/ADMIN_GAP_ANALYSIS.md; ADMIN_IMPLEMENTATION_ROADMAP.md; docs/settings/PLATFORM_SETTINGS_INVENTORY_BATCH_10A.md
- **Production blockers:** No planning document is permission to deploy or activate roles.

## 3. Security Foundation

Address existing security findings, strengthen authentication, logging, database boundaries and regression tests.

- **Status:** In Progress
- **Implemented functionality:** Owned disposable DB guard/driver validation, bounded operational errors, authorization/MFA foundations, development passkey browser pilot and login reliability checks exist.
- **Remaining functionality:** Production MFA/recovery decisions, trusted ingress, durable audit/monitoring, dependency tracking and operational security acceptance.
- **Relevant engineering batches:** 2A; 2B; 3A–3C; 5A–5C; 6A–6C; ongoing regressions
- **Verification evidence:** docs/admin/STAFF_MFA_REVIEW_BATCH_5A.md; ADMIN_PASSKEY_PILOT_REVIEW_BATCH_5B.md; LOGIN_AND_STAFF_READINESS_REVIEW_BATCH_6B.md; Batch 10A verification
- **Production blockers:** No mandatory production MFA, real identity provisioning or recovery rollout approved; infrastructure and recovery ownership remain pending.

## 4. Admin Governance & Permissions

Implement Super Admin and staff roles, server-side permissions, independent approvals, audit trails and emergency controls.

- **Status:** In Progress
- **Implemented functionality:** Fixed human capability contracts, additive identity/membership/version/grant history, trusted-session/MFA and independent approval/execution rehearsal foundations exist; legacy guards remain authoritative.
- **Remaining functionality:** Reviewed real verified-human onboarding, scoped production data layer/principals, safe legacy cutover, independently staffed approvals and emergency policy.
- **Relevant engineering batches:** 2B; 3A–3C; 4A–4B; 5A–6B
- **Verification evidence:** docs/admin/STAFF_MIGRATION_READINESS_BATCH_2B.md; exact legacy authorization inventories; existing authorization/approval/scoped-read regression suites
- **Production blockers:** No ACTIVE future staff memberships/grants, broad ADMIN OR STAFF fallback, high-risk execution or single-person approval bypass.

## 5. Admin Dashboard Redesign

Build the preferred grouped sidebar, proportional overview, attention panel, statistics and clean navigation.

- **Status:** Implemented Candidate
- **Implemented functionality:** Responsive grouped sidebar, accurate Overview metrics/attention/read models, preserved reports/disputes/chat navigation; later batches add guarded workspaces.
- **Remaining functionality:** Independent product/accessibility acceptance, future scoped metric integration and safe production release.
- **Relevant engineering batches:** 1; 6C; 7A–7D; 8A; 9A; 10A
- **Verification evidence:** components/admin/navigation.tsx; app/admin/page.tsx; tests/admin.integration.test.ts; Batch 10A responsive evidence
- **Production blockers:** Visual acceptance and production release are separate from passing development tests; no unavailable permissions exposed.

## 6. Operations Management

Bookings, listings, MRT policies and the isolated Geofencing Test Lab with GPS or map selection.

- **Status:** In Progress
- **Implemented functionality:** Existing guarded booking/listing views and legacy actions; Workbench/investigation/case-history navigation; Batch 9A Locations and owned consented GPS/map TEST_LOCATION Lab.
- **Remaining functionality:** Authorized station suspension/restoration, independent restoration approval, safety override precedence, geofence policy versions, coordinate gaps/calibration and physical MRT field testing.
- **Relevant engineering batches:** 7A–7D; 9A
- **Verification evidence:** docs/mrt/MRT_OPERATIONS_REVIEW_BATCH_9A.md; GEOFENCING_TEST_LAB_CONTRACT_BATCH_9A.md; Locations/Lab and full camera regressions
- **Production blockers:** Station suspension/restoration is not authorized or implemented. Real scoped Operations activation remains blocked. No test centre can become real station verification; 11 stations lack coordinates.

## 7. Customer Service & Recovery

Build support tickets, private case messaging, dispute investigation, custody recovery and approval workflows.

- **Status:** In Progress
- **Implemented functionality:** Batch 13E adds an owned-development shared Resolution Room subordinate to the actual structured Dispute, immutable non-financial proposals/counterproposals, counterparty decisions, coordination discussion and case-rooted activity notices. Agreement remains completion-pending and never changes custody, booking terms, money or case status. Contact blocks/suspension remain effective; human assistance is intent-only. Batch 13B-R1 adds an owned-development structured claim and borrower response using the existing Dispute identity/Booking transition, immutable subordinate history, participant notice/inbox and explicitly non-enforceable synthetic delivery timing. No production Support or financial authority. Read-only legacy Support workspace; owned requester ticket intake, private channels, synthetic scoped assignments and two-way replies; existing dispute/investigation views.
- **Remaining functionality:** Resolve production eligibility/lifecycle/content/retention/deletion/holds, real staff/assignment/independence, production principals and migration, recovery, notifications/mediation and custody recovery approvals.
- **Relevant engineering batches:** 7A–7D; 8A–8D; 13B-R1 (durable participant condition-case candidate); 13E (shared non-executing recovery candidate)
- **Verification evidence:** docs/recovery/RESOLUTION_ROOM_REVIEW_BATCH_13E.md; docs/inspection/DURABLE_DISPUTE_RESPONSE_REVIEW_BATCH_13B_R1.md; docs/support/CUSTOMER_SERVICE_REVIEW_BATCH_8D.md; STAGE_7_PRODUCTION_DECISION_TRACKER_BATCH_9A.md; scoped Support/privacy/migration regressions
- **Production blockers:** All unfinished Stage 7 production policies and activation gates remain. Passing synthetic candidate tests is not customer-service launch approval or custody recovery authority.

## 8. Announcements & Platform Settings

Add notices, scheduling, configurable operational policies, feature controls and change history.

- **Status:** Implemented Candidate
- **Implemented functionality:** Stage 8 begins with Batch 10A and extends in Batch 10B: persisted owned-development informational drafts, edit/preview, publication windows, archive/withdrawal, immutable history and controlled test audience; safe 31-entry read-only Platform Settings inventory; two owned-development typed display settings with real consumer integration, immutable history, conflicts and rollback.
- **Remaining functionality:** Approve live audience/authors/publishers/risk/emergency/retention/localization/delivery; approve any production typed configuration slice separately; no arbitrary policy editor.
- **Relevant engineering batches:** 10A; 10B; 10C (verification/lifecycle repair)
- **Verification evidence:** docs/announcements/ANNOUNCEMENTS_REVIEW_BATCH_10A.md; ANNOUNCEMENTS_CONTRACT_BATCH_10A.md; PRODUCT_DECISIONS_BATCH_10A.md; docs/settings/TYPED_SETTINGS_REVIEW_BATCH_10B.md; TYPED_SETTINGS_CONTRACT_BATCH_10B.md; PRODUCT_DECISIONS_BATCH_10B.md; docs/security/MRT_LOGOUT_POLLING_REVIEW_BATCH_10C.md
- **Production blockers:** Production publication/mutations blocked, no operational settings edits, high-risk approvals/execution or notifications enabled. Entire Stage 8 is not production ready. Batch 10C closes the legacy MRT logout/polling defect with client cancellation/session-loss handling and a strict fixture-phase boundary. Three fresh original runs (including overlapping browsers) and all selected regression groups pass; this does not approve production publishing, configuration or staff activation.

## 9. Account Settings & User Experience

Improve profiles, password management, language selection, mobile UX and the overall design system. Add light/dark themes during the visual makeover.

- **Status:** In Progress
- **Implemented functionality:** Existing account/profile/settings pages and responsive marketplace/Admin components are present; own-session security overview is implemented. Batch 11A introduces an opt-in Balanced Agricultural Luxury foundation, account/shared-shell light/dark candidate and preserved display-name editing. Batch 11A-R1 refines materials against the supplied reference, adds an isolated real-data marketplace design study, accessible account sheet, System appearance, bounded discovery particles and optional original sound. Batch 11B reuses that provisional system on the actual homepage with eligible data, real Browse/category/MRT entry points and shared accessible marketplace navigation. Batch 11C adds typed English/Traditional Chinese catalogues, immediate cookie-backed language selection, localized homepage/shared navigation/account forms, real save/error/session-expiry feedback and language-aware formatting. Batch 11D extends the same typed catalogue into real Browse/category filters and public listing detail presentation, preserving raw category keys, eligible visibility, money values and existing English rental/private workflows with explicit scope notices. Account activity/trust reuse bilingual navigation while their record bodies remain explicitly English. Batch 11E adds an owned-development-only authenticated password-change candidate for allowlisted ordinary accounts, existing-password verification, atomic all-session revocation/security events and bilingual account UX. Legacy Admin/staff/reviewer changes are excluded pending MFA policy. Batch 11F corrects effective credential reuse and silently skipped credential/audit writes, adds local password visibility, focused bilingual feedback and responsive checks, and records the already-authorized request boundary. Two bounded overlap login trials pass unchanged five-second assertions; historical R1 intermittence is not reproduced or root-caused. The recovery endpoint remains a non-delivering stub, not a working recovery service.
- **Remaining functionality:** Product-owner visual acceptance before wider rollout, production password-policy/security/notification/principal approval, separate approved recovery implementation, remaining profile capabilities and localization beyond the explicit homepage/navigation/account slice, full accessibility acceptance, remaining non-shell marketplace/Admin presentation, legacy preference first-visit migration review, real-device sensory/performance acceptance and tracked login-navigation timing investigation.
- **Relevant engineering batches:** Existing MVP; 1; 6C; 11A; 11A-R1; 11B; 11C; 11D; 11E; 11F (development-only credential/session candidate; visual direction and production security policy remain unapproved)
- **Verification evidence:** docs/design/HUSTLEN_UI_UX_DESIGN_CONTRACT.md; docs/design/EDITORIAL_FOUNDATION_BATCH_11A.md; docs/design/ACCOUNT_DESIGN_REVIEW_BATCH_11A.md; docs/design/AGRICULTURAL_LUXURY_REVIEW_BATCH_11A_R1.md; docs/design/MARKETPLACE_HOMEPAGE_REVIEW_BATCH_11B.md; docs/design/batch11b/STAGE_9_FOLLOW_UP.md; docs/design/ACCOUNT_LOCALIZATION_REVIEW_BATCH_11C.md; docs/design/BILINGUAL_MARKETPLACE_REVIEW_BATCH_11D.md; docs/design/batch11d/PASSWORD_CHANGE_AND_RECOVERY_PROPOSAL.md; docs/design/PASSWORD_CHANGE_REVIEW_BATCH_11E.md; docs/design/ACCOUNT_SECURITY_ACCEPTANCE_REVIEW_BATCH_11F.md; docs/design/batch11f/STAGE_9_COMPLETION_ASSESSMENT.md; docs/design/batch11e/SECURITY_ARCHITECTURE_AND_POLICY.md; docs/design/batch11c/LOCALIZATION_POLICY_AND_COVERAGE.md; components/account-settings.tsx; app/admin/account-security
- **Production blockers:** Batch 11A was NOT visually accepted. R1 remains provisional. Batch 11B integrates it into the actual homepage and shared marketplace navigation without declaring an approved site redesign. Product-owner design review is required before wider rollout; Stage 9 is not production ready. Full password/language/marketplace makeover is not claimed. Independent security review, production principals/events/notification policy and physical-device/screen-reader/native-zoom acceptance remain pending. Stage 10 planning alone may proceed with synthetic/read-only design and separate future authorization; no AI implementation or Stage 9 completion is implied.

## 10. AI Assistant — Stage 1

Introduce read-only analysis, support-case summaries, categorization, translation and drafts with human review.

- **Status:** In Progress
- **Implemented functionality:** Batch 13D-R2 extends the existing owned-development rental request/owner acceptance with exact owner-designated immutable documentation, session-bound borrower review and acknowledgement, protected participant access and stale-version refusal. It does not activate production requirements or replace fresh pickup evidence. Batch 13D-R1 adds real owned-development documentation drafts, private photo persistence, immutable owner confirmations and atomic revision events, plus scoped inspection integration. The R1 adapter remains blocked outside the separately gated R2 extension; no production publishing or AI is activated. Batch 13D adds owned-development versioned category documentation, unsaved owner review with deterministic image-quality hints and participant-only pickup/return comparison; original evidence and unknown legacy area mappings remain explicit, with no Vision inference or production requirement. Batch 13C adds a session-bound owned-development bilingual identity simulation, inert future participation contract and synthetic booking-stage challenge; no real eKYC/provider or production restrictions. Batch 13B adds an owned-development return/inspection evidence register, server-derived 24-hour window and non-submitting owner claim/borrower response previews. The separately authorized13B-R1 candidate adds durable structured submissions/responses; production cutover, approved qualifying notification deadlines and exception/appeal policies remain blocked; physical return is shown independently from dispute status. Normal build no longer requires remote Google Fonts. Existing advisory mock-shadow chat analysis and deferred nonhuman-principal contracts remain. Batch 12A adds a development-only ACTIVE legacy Admin synthetic Case Brief notebook: four authored bilingual scenarios, local scripted summaries and references, explicit unknowns/category suggestions, editable local drafts and human-review demonstration. Batch 12B adds one-case server manifests, strict versioned output/source contracts, deterministic offline adapter, real authenticated HTTP pipeline, classified failure/cancellation and 16 offline evaluation scenarios. Batch 12C adds a digest-pinned proposed 16-task quality corpus, six-dimension unscored human rubric, limited grounding/translation/privacy hints, blocked approval notebook panel and offline preparation CLI. Batch 12D adds a separate synthetic safety supplement, reproducible 32-item offline human-review packet and strictly bound local scoring-file validator. At the Batch 12D closeout, zero genuine human reviews were completed; its committed 192 review scores remain null. Batch 13A adds an owned-development Customer Service guide/ticket-draft surface and assigned-channel return-focused copilot, reusing the restricted Stage 7 worker, native assurance and audited per-channel access. It is deterministic, not model inference, and performs no automatic sends or ticket creation. No production private-case AI, live-model inference or provider connection.
- **Remaining functionality:** Approve useful first workflow, exact roles/channel fields, external processing/provider terms, dedicated read-only service identity, export minimization, retention/audit, actual quality/cost/latency evaluation and failure ownership. The first actual model experiment still requires separate provider/model/terms/egress/budget/evaluation approval; 12B supplies only the offline foundation. Live private integration remains separate.
- **Relevant engineering batches:** 13D-R2 (development-only rental documentation agreement extension); 13D-R1 (durable owner documentation; no live AI or rental agreement authority); 13D (item documentation/Vision contracts; dependencies in existing Stages 6/7/9/12, no provider or production gates); 13C (identity-assurance synthetic foundation, dependencies in Stages 3/4/9/12/14; no real provider or eligibility activation); 13B (Trust & Evidence Foundation; supersedes the earlier Owner Assistant batch assignment; dependencies in Stages 7/9/12); 13A (Customer Service checkpoint; Owner/Borrower/integration programme remains deferred under the trust-first sequence); 12A; 12B (offline only); 12C (non-egress preparation; all ten live decisions missing); 12D (offline review readiness, no live authorization); existing chat mock-shadow foundation
- **Verification evidence:** docs/vision/DURABLE_OWNER_STUDIO_REVIEW_BATCH_13D_R1.md; docs/vision/VISION_DOCUMENTATION_REVIEW_BATCH_13D.md; docs/identity/IDENTITY_ASSURANCE_REVIEW_BATCH_13C.md; docs/product/HUSTLEN_AI_PRODUCT_BLUEPRINT.md; docs/inspection/TRUST_EVIDENCE_REVIEW_BATCH_13B.md; docs/ai/CUSTOMER_SERVICE_COMPANION_REVIEW_BATCH_13A.md; docs/ai/batch13a/ARCHITECTURE_AND_BOUNDARIES.md; docs/ai/OFFLINE_QUALITY_REVIEW_BATCH_12D.md; docs/ai/batch12d/OWNER_DECISIONS.md; docs/ai/AI_CASE_BRIEF_REVIEW_BATCH_12A.md; docs/ai/AI_INTEGRATION_REVIEW_BATCH_12B.md; docs/ai/MODEL_EXPERIMENT_PREPARATION_REVIEW_BATCH_12C.md; docs/ai/batch12c/APPROVAL_CHECKPOINT.md; docs/ai/batch12b/CONTRACT_AND_BOUNDARIES.md; docs/ai/batch12a/PRODUCT_AND_WORKFLOW.md; READ_ONLY_INTEGRATION_AND_12B.md; SYNTHETIC_EVALUATION.md; selected browser/refusal/authorization regressions
- **Production blockers:** No real model credentials, live Support/evidence export, staff identity activation, AI permissions or autonomous action. Stage 7 access/production policy gates and Stage 9 acceptance blockers remain. Scripted success does not demonstrate model quality or production readiness.

## 11. AI Automation — Stage 2

Allow explicitly approved low-risk actions under strict permissions, limits, logs, monitoring and a kill switch.

- **Status:** Planned
- **Implemented functionality:** No autonomous administrative execution implemented; contracts reserve distinct nonhuman identities and human approval boundaries.
- **Remaining functionality:** Approve exact low-risk actions and scoped service identities, limits, evidence/audit, monitoring, kill switch and rollback acceptance.
- **Relevant engineering batches:** Future/deferred
- **Verification evidence:** docs/admin/ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md; capability and migration readiness contracts
- **Production blockers:** Explicit product/security authorization required. AI cannot satisfy independent-human approvals or inherit a human session.

## 12. Marketplace Improvements

Owner blackout dates, overdue/no-show workflows, notifications, listing media maintenance and additional reliability improvements.

- **Status:** In Progress
- **Implemented functionality:** Existing listing media/rental lifecycle and reliability regressions are present; QR/camera/login reliability increments exist.
- **Remaining functionality:** Dedicated Stage 12 audit and scoped implementation for blackout dates, approved overdue/no-show workflows, notification delivery and media maintenance.
- **Relevant engineering batches:** Existing MVP; 6B; 7C (reliability foundations only)
- **Verification evidence:** Existing rental/media code; docs/milestone-5-report.md; camera/login and rental regressions
- **Production blockers:** No assumption that blackout dates, complete no-show handling or notification pipeline exist; custody/participant policy changes need separate approval.

## 13. Payments & Deposits

Finalize provider, custody of funds, deposit holds, payouts, refunds and financial dispute policies before implementation.

- **Status:** Planned
- **Implemented functionality:** Marketplace price fields and rental totals exist; they do not establish payment processing or custody of funds.
- **Remaining functionality:** Provider/regulatory/funds custody/deposit hold/payout/refund/financial dispute policies and approval before implementation.
- **Relevant engineering batches:** Future/deferred
- **Verification evidence:** Existing booking price data only; Blueprint explicitly defers payments
- **Production blockers:** No financial provider, payment authority, funds custody, payout/refund implementation or approval claimed.

## 14. Pilot Readiness & Launch

Complete operational security, backups, real MRT field testing, accessibility, monitoring and supervised real-user acceptance.

- **Status:** In Progress
- **Implemented functionality:** Broad owned-disposable regression, migration preservation, synthetic browser/camera and responsive evidence exists.
- **Remaining functionality:** Backups/restore drills, monitored production infrastructure, real MRT field calibration/device acceptance, accessibility review, staffing/recovery and supervised real-user pilot acceptance.
- **Relevant engineering batches:** Ongoing security/reliability batches; future supervised launch
- **Verification evidence:** Batch 9A review and current Batch 10A evidence; prior security/MVP reports
- **Production blockers:** No merge/deploy or real-user launch authorized. Outstanding Stage 6/7/8 policy and activation gates, real-human separation, production migration and security acceptance remain.

## Current implementation boundary

Stage 6 still lacks authorized station suspension/restoration. Stage 7 still has unresolved production policies and activation gates. Stage 8 starts with Batch 10A and extends through Batch 10B with only two development display settings; it has no live publisher, production configuration writes or arbitrary settings editor. These statements must not be removed because isolated tests pass. Future policy approvals must record owner/date/version/scope and independent review. No automatic merges, pushes, deployments, staff provisioning, production MFA enforcement, Support enablement, approval execution, financial controls or AI administration follow from this roadmap.

Batch 13D-R2 checkpoint: see `docs/vision/RENTAL_DOCUMENTATION_AGREEMENT_REVIEW_BATCH_13D_R2.md`. Stage 10 remains In Progress. Stages 6–9 and all production/visual approval blockers remain unchanged. Engineering candidates do not establish production readiness.

Batch 13B-R1 is a development-only Stage7 trust/recovery increment, with existing Stage6/9/10/12 dependencies. See `docs/inspection/DURABLE_DISPUTE_RESPONSE_REVIEW_BATCH_13B_R1.md`. It does not add a master stage or complete Stage7/10. Stage6 station controls, Stage7 production access/policies, Stage8 publishing/settings approvals and Stage9 aesthetic acceptance remain unfinished.

Batch 13E advances the existing Stage7 recovery candidate with Stage6/9/10/12 dependencies, not a new master stage. See `docs/recovery/RESOLUTION_ROOM_REVIEW_BATCH_13E.md`. Production delivery, staff access, recovery completion/amendment authority and financial settlement remain separately gated. All unfinished Stage6–9 requirements remain; Stage10 remains In Progress and Stage11 autonomy unapproved.

### Batch 13F checkpoint — Stage 10 local synthetic Customer Service pilot

Stage10 remains **In Progress**. The separately authorized local-only candidate adds an Ollama gateway and optional fixed-synthetic Companion panel. Existing32 review tasks remain pinned; two separate camera/charger recovery tasks extend coverage. No production/private-data inference or Stage11 actions. Mocked application/browser and deterministic contract evidence must be distinguished from genuine model evaluation. The Mac/Ollama9b demonstration, bilingual human quality review, observed resource/latency results and any4b comparison remain unavailable until actually run. See `docs/ai/batch13f/ARCHITECTURE_AND_BOUNDARIES.md` and `SETUP_AND_REAL_EVALUATION.md`. No stage is completed by this checkpoint; unfinished Stage6 station controls, Stage7 Support/delivery policy, Stage8 publishing/settings approvals and Stage9 visual acceptance are unchanged. Earlier no-egress checkpoints remain historical; this new authorization permits numerical-loopback synthetic inference only, not hosted providers or production export.
