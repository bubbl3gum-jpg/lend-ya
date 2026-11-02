# Hustlen’ — Unified Product Audit & Consolidation Gate
**Baseline:** `feature/ai-roadmap-milestone-1-review`  
**Safe working branch:** `integration/hustlen-product-consolidation-20261102`  
**Prepared:** 2 November 2026 (Asia/Taipei)  
**Status:** DOCUMENTATION / PRE-INTEGRATION AUDIT. No code merge, deployment, or fresh end-to-end tests are claimed.

## Goal
Present a coherent, testable peer-to-peer **item rental** marketplace with one owner/borrower journey, one Admin entry, and one transparently experimental Qwen support showcase. Pause new Vision and unrelated scope until this product is demonstrably coherent.

## What was inspected and what is *not* verified
Inspected GitHub branch ancestry/comparison and existing README, product roadmap, AI roadmap, MRT integration guide, Qwen playground/acceptance sheets and design/localization contracts. The newer branch includes inherited implementation and historic tests. **Repository documentation does not prove the current integration runs on the owner's machine.** No local Docker/Postgres, Chromium, Ollama, Qwen or live browser execution occurred during this audit.

## Git integration findings
- `lend-ya/main` contains an official MRT-selector integration (120 physical handoff stations). Standalone `mrt-map` is a reference/demo, **not** an additional service to import again.
- `integration/hustlen-mrt-complete` is in the ancestry of the more recent `fix/local-qwen-generation-reliability-batch-13f-r2`; the latter is 116 commits ahead of it.
- `feature/ai-roadmap-milestone-1-review` includes the R2 Qwen work plus later interactive-playground and roadmap review work; it is three commits ahead of that R2 branch.
- Relative to `main`, this reviewed branch has 121 commits ahead and is missing one independent `main` commit. **The histories diverge; no force push, wholesale reset or blind all-branch merge.**
- Other sampled feature branches (official MRT booking, QR handoff, homepage/design, Vision documentation and local Qwen customer-service foundations) are ancestors of the reviewed newer branch. Do not re-merge ancestors.
- This working branch was created from the reviewed branch **without changing `main`**. The independent main commit needs an exact conflict/behavior review.

## Function inventory (documented implementation, not newly runtime-verified)

| Area | Already present in code / prior documentation | Outstanding integration or release gate | Demo priority |
|---|---|---|---|
| Accounts & sessions | Register/login, user/admin routes; active-session checks; account settings | Validate fresh login and logout; secure credential recovery and broader staff access remain gated | P0 |
| Listings | Physical-item listing create/edit, photos/media, category/detail, deposit/day-price fields, eligibility/moderation | Seed stable real-photo fixtures; verify currency disclosure (existing display uses USD), upload durability before production | P0 |
| Discovery | Homepage, Browse search/category/station filters, listing detail and responsive shared navigation | Fix broken/dead links, empty/error states, price consistency and visual hierarchy | P0 |
| Booking lifecycle | PENDING → CONFIRMED → HANDOFF_PENDING → IN_USE → RETURN_PENDING → INSPECTION → COMPLETED; conflicts and disputes | Verify complete two-account journey against fresh isolated DB; no fake payments or automatic dispute outcomes | P0 |
| MRT handoff | Official 120-location selection built into listing/booking; owner availability and borrower choice | Verify station names/visibility and mobile interactions; physical station/exit/geofencing validation not production-complete | P0 |
| QR & evidence | QR/handoff/camera reliability increments, protected photos, receipt/return and inspection state machinery | Actual device, camera permission and owner-vs-borrower acceptance tests; no synthetic custody facts | P0 |
| Messaging/moderation | Marketplace chat and moderation/evaluation workstreams | Verify end-user navigation, conversation permissions, false positives/negatives and user-facing feedback | P1 |
| Reviews & trust | Verified-rental trust/review record concepts and guarded flows documented | Review what can be submitted and displayed; do not imply KYC or certified trust | P1 |
| Admin | Legacy Admin Desktop: overview, users, listings, bookings, reports, disputes, audit records and moderation | New staff governance/MFA/approvals remain development candidates; avoid exposing inactive controls | P0 (core) |
| Support & resolution | Ticket intake, private channels, scoped replies, dispute cases, proposed Resolution Room | Development-only synthetic scopes, human support/retention and recovery permissions remain gated | P1 |
| Account UX & localization | Agricultural-luxury system, homepage/shared-header/account and Browse/detail English + zh-TW portions | Visually unapproved; many transactional pages English-only; don't claim full bilingual rollout | P0 (clarity) |
| Announcements/settings | Draft/publication-window candidate, typed read/config prototypes | Live audience and production policy not authorized | P2 |
| Qwen AI | Local Qwen 3.5 9B through Ollama pilot, source-aware validation, owner/borrower fictional scenarios and 1–6-turn playground | Real five-case playground quality/bilingual/latency owner acceptance NOT completed; no private record access, no production bot | P0 (clearly labelled demo) |
| AI workflow evaluation | Offline corpora, rubric, guardrails, local reliability diagnostics | Manual measured quality and policy acceptance incomplete; inherited mocks are not genuine-model results | P1 |
| Vision AI | Inert provider-independent contracts/documentation/photographic workflow prerequisites | Operational provider-backed Vision NOT implemented or authorized; explicitly deferred | Out of scope |
| Financial | Rental prices/deposits/totals stored/displayed | No payments, escrow/holds, payouts, refunds or money-custody processing | Out of scope |
| Production | Regression runners, isolated DB protections and migration evidence | Deployment, backups/restore, monitoring, real-user pilot, device/accessibility tests still needed | Out of scope |

## Qwen AI: truth-in-demo contract
**Position the feature as “Local Customer Service AI — Experimental Demo.”** Genuine model requires local Ollama `qwen3.5:9b`, guarded local DB/runtime, authenticated user and the existing `npm run demo:local-ai` launcher. It uses fictional participant claims only; no real customer records. UI supports 1–6 user turns (earlier *user* turns resent, earlier AI replies are not trusted evidence). It cannot message participants, refund, resolve a dispute or access another participant's account. Three fixed-case successful outputs were reported by the owner; the five separate freeform genuine-model acceptance cases are recorded as not yet executed. Earlier verification reports 157/157 unit tests and mocked-playground browser acceptance, **not a full current combined application pass.**

## P0 exit criteria: demo-ready, not production-ready
- [ ] Clean install and deployment of schema on **new isolated test database**, never overwrite existing data
- [ ] Confirm `main`'s independent MRT merge commit is not lost; reconcile on integration branch with review
- [ ] Unit, migration, TypeScript, lint, build and critical browser tests pass on integration branch, evidence recorded
- [ ] Owner login → listing creation/photo upload → selected MRT stations → borrower Browse/detail → booking → owner accept
- [ ] Owner handoff evidence/QR → borrower receipt → borrower return → owner inspection → complete
- [ ] Dispute/Support demo with safe data and human-controlled outcome
- [ ] Admin login, moderation, users/bookings/reports, audit read, permission denial for ordinary user
- [ ] Qwen local fictional scenario produces actual Ollama result, or fallback explicitly marked **AI unavailable**, with no invented answer
- [ ] Unified UX: one obvious Home/Browse/List/Dashboard/Bookings/Messages/Help path, separate Admin; no exposed labs/pilots without clearly labelled demo entry
- [ ] Mobile smoke test, unreadable states, accessibility/focus and error recovery checked
- [ ] Reliable deterministic demo fixtures, reset instructions, simple 1-page runbook, team rehearsal and demo recording backup

## Recommended execution sequence
**Gate 0 — Audit first:** Codex generates exhaustive route/API/database/UI/function inventory *from source*, with file refs, implementation flag, reachable UI, owner/borrower/admin permissions, test evidence and gaps. Also map all visible dead ends and duplicate navigation. No feature expansion.

**Gate 1 — Reconcile safely:** work only on `integration/hustlen-product-consolidation-20261102`; compare independent `main` commit with ancestor MRT integrations. Bring forward only actually missing behavior, preserving all original migrations and data. No `main` merge.

**Gate 2 — Stabilize:** install dependencies, run static checks and all P0 isolated DB/browser suites; fix observed regression failures one by one. Never edit tests to hide legitimate failures.

**Gate 3 — UX polish:** organize into user journeys, simplify labels and navigation, hide/label experimental admin and Qwen panels, preserve approved balanced agricultural-luxury direction and texture without new redesign.

**Gate 4 — Demo acceptance:** two-person full lifecycle, admin support demo and optional local Qwen sample, each with screenshot/log and failed-case notes. Require owner/team acceptance before submitting a PR.

**Gate 5 — Merge decision:** after exact test log and diff review, open a PR from this integration branch to `main`; do not bypass review or modify production.

## Codex audit instruction (copy into a coding agent on this branch)
> Perform a read-only, exhaustive product-functionality and consolidation audit of Hustlen’ on `integration/hustlen-product-consolidation-20261102`, comparing it with `main` and all relevant feature branches. Produce (1) actual route/API/function inventory including how to reach each feature, (2) permission matrix for public/owner/borrower/admin/development-only, (3) source-backed status: working by test evidence / implemented but unverified / hidden or unreachable / not implemented / gated, (4) direct versus inherited branch ancestry map and exact one-main-commit reconciliation diff, (5) full executable E2E test plan using only newly owned disposable `hustlen_test_*` databases, (6) Qwen genuine-model vs mock evidence and fallback behavior, (7) navigation/UX consistency problems, (8) prioritized P0/P1/P2 fixes and (9) meeting demo script. Do not start Vision, new AI autonomy or payment features. Do not touch `main`, existing databases, production accounts, uncommitted user files or secrets; no destructive ref operation. Report all uncertainty. Ask for review after the audit before implementing fixes.

## Primary repository evidence
- `README.md`
- `docs/roadmap/MASTER_ROADMAP_14_STAGES.md`
- `docs/ai/MASTER_AI_DEVELOPMENT_ROADMAP.md`
- `docs/ai/playground/REVIEW.md`
- `docs/ai/MILESTONE_1_OWNER_ACCEPTANCE.md`
- `docs/mrt/INTEGRATION.md`
- `docs/design/HUSTLEN_UI_UX_DESIGN_CONTRACT.md`
- `docs/design/batch11d/LOCALIZATION_COVERAGE.md`

This audit is a **planning snapshot**, not a certified exhaustive source or runtime audit. The coding agent's next output should prove each claim with file paths, test results and screenshots.
