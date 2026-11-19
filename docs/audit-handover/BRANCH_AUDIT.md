# Branch audit

Baseline `77aae95e950939483dd1418cf83c5261bc0ed67e` (verified remote default `main`). The remote advertised 72 heads, and all 72 fetched names and SHA values matched. The one local branch, `work`, points at the baseline. Of 71 remote branches other than main, 68 are equal to or ancestors of main and three carry branch-only changes. Across the diverged branches there are six positive patch comparisons. These include two related recovery implementations.

Counts are main-only / branch-only. For integrated refs, the tip is the merge base and there are zero branch-only commits. Integrated means that history is reachable. Later canonical commits may revise or disable the feature. Evidence lists representative paths from the tip or a preceding substantive commit and is scoped to the branch tip. Some historical refs include preceding milestones as well. Branches with no Git-only work still have product or acceptance gates summarized in [Feature status](FEATURE_STATUS.md).

| Branch | Purpose | HEAD (author timestamp in Git) | Relative to main | Integration status | Outstanding work | Evidence |
|---|---|---|---:|---|---|---|
| `local/work` | docs: record Mission 5 hydration causal evidence and acceptance. Last implementation-path commit: fc4bf60 test: reject captured hydration failures in rental acceptance | `77aae95e950939483dd1418cf83c5261bc0ed67e` <br> 2026-11-06T00:47:12+08:00 | 0 / 0 | Canonical / same tip | See roadmap | `docs/audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md`, `tests/rental-browser.test.ts`, `tests/support/browser-diagnostics.ts` |
| `origin/codex/lend-ya-mvp-verification` | Complete rental workflows, admin moderation, and MVP verification | `18529a30bb7da3c3db08baca614ef1fe2764eb10` <br> 2026-10-13T17:50:08Z | 199 / 0 | Integrated by ancestry | See feature acceptance gates | `.github/workflows/verify.yml`, `.gitignore` |
| `origin/consolidation/hustlen-canonical-20261106` | docs: record Mission 5 hydration causal evidence and acceptance. Last implementation-path commit: fc4bf60 test: reject captured hydration failures in rental acceptance | `77aae95e950939483dd1418cf83c5261bc0ed67e` <br> 2026-11-06T00:47:12+08:00 | 0 / 0 | Canonical / same tip | See roadmap | `docs/audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md`, `tests/rental-browser.test.ts`, `tests/support/browser-diagnostics.ts` |
| `origin/docs/ai-product-trust-blueprint-v01` | docs(ai): preserve working product and trust blueprint v0.1 | `e4070a7d3a79916a899f564d9901016968fe502f` <br> 2026-10-28T06:46:48Z | 114 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/AI_PRODUCT_TRUST_BLUEPRINT_V0_1_RECONCILIATION.md`, `docs/ai/AI_PRODUCT_TRUST_SYSTEM_BLUEPRINT_V0_1.md` |
| `origin/feature/account-editorial-design-batch-11a` | docs: archive Batch 11A visual review and regression evidence. Last implementation-path commit: a7e1929 feat: introduce editorial account design foundation for Batch 11A | `912fc8c4a065ffe9af1ce35c44d7ce3d1c663764` <br> 2026-10-26T14:33:26Z | 149 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/ACCOUNT_DESIGN_REVIEW_BATCH_11A.md`, `docs/design/batch11a/SCREENSHOTS.md`, `AGENTS.md`, `app/account/layout.tsx` |
| `origin/feature/account-localization-batch-11c` | docs(review): index Batch 11C implementation and closeout evidence. Last implementation-path commit: 19833cc feat(account): add scoped English and Taiwan Chinese localization | `0ac03f31f54dd907ee3b4de9a66f38a939d86240` <br> 2026-10-26T18:23:20Z | 140 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/ACCOUNT_LOCALIZATION_REVIEW_BATCH_11C.md`, `docs/design/batch11c/CHANGED_FILES.md`, `AGENTS.md`, `app/account/layout.tsx` |
| `origin/feature/account-security-ux-review-batch-11f` | Index Batch 11F implementation and evidence for independent review | `7b90c72bcfaa724b30b5dfc15b3bbd2af7b9d86b` <br> 2026-10-27T04:14:07Z | 131 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/ACCOUNT_SECURITY_ACCEPTANCE_REVIEW_BATCH_11F.md` |
| `origin/feature/admin-authorization-foundation-batch-2b` | Add inactive staff capability contracts and shadow authorization tests | `1204aea00865643d1ef0723ca60111ffc3216fa4` <br> 2026-10-23T18:59:49Z | 184 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/ADMIN_AUTHORIZATION_FOUNDATION_BATCH_2B.md`, `docs/admin/ADMIN_CAPABILITY_MATRIX_BATCH_2B.md` |
| `origin/feature/admin-control-center-batch-1` | Improve Admin navigation and overview with scoped read models | `98d24a918be7ce391c201cfd1822eb6ed84bbc36` <br> 2026-10-23T18:02:08Z | 186 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/layout.tsx`, `app/admin/page.tsx` |
| `origin/feature/admin-operations-workbench-batch-7a` | feat(admin): add read-only operations workbench | `fe83e274ba93183d6b083bd13184015c21a3dc52` <br> 2026-10-24T15:51:42Z | 172 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/workbench/error.tsx`, `app/admin/workbench/loading.tsx` |
| `origin/feature/admin-own-session-security-overview-batch-6c` | feat(admin): add read-only own-session security overview | `ca2d374b07b0346241318002bf786ef7ce6a0b91` <br> 2026-10-24T14:08:44Z | 173 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/account-security/page.tsx`, `app/api/admin/account-security/route.ts` |
| `origin/feature/admin-passkey-integration-pilot-batch-5b` | feat(auth): add owned development Admin passkey pilot | `da630045d7a535c2e7201ad449f87aa0b21ea7ec` <br> 2026-10-24T10:53:26Z | 177 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/layout.tsx`, `app/admin/security/page.tsx` |
| `origin/feature/agricultural-luxury-r1` | docs: index R1 implementation and independent visual acceptance review. Last implementation-path commit: 95238a5 feat: refine agricultural materials and tactile catalogue UX for 11A-R1 | `97722d12e4aef0d3fd0b1654f32d8230210d1d85` <br> 2026-10-26T15:30:09Z | 146 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/AGRICULTURAL_LUXURY_REVIEW_BATCH_11A_R1.md`, `AGENTS.md`, `app/account/layout.tsx` |
| `origin/feature/ai-case-brief-synthetic-batch-12a` | Index Batch 12A implementation and closeout for product review. Last implementation-path commit: cf67562 Add gated synthetic Case Brief notebook and Stage 10 product proposal | `993967f4363a4a1218ac9be978e844f6ee182158` <br> 2026-10-27T05:49:52Z | 128 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/AI_CASE_BRIEF_REVIEW_BATCH_12A.md`, `AGENTS.md`, `app/admin/ai-case-brief/page.tsx` |
| `origin/feature/ai-roadmap-milestone-1-review` | docs: align supplementary AI roadmap and milestone one acceptance | `35c3df6b1882e6bab1982ef8079746fb763f7aab` <br> 2026-10-30T04:07:38Z | 77 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/MASTER_AI_DEVELOPMENT_ROADMAP.md`, `docs/ai/MILESTONE_1_OWNER_ACCEPTANCE.md` |
| `origin/feature/announcements-settings-foundation-batch-10a` | docs: index final Batch 10A revisions, roadmap and review results. Last implementation-path commit: 27bbcb3 feat: add isolated announcements candidate and read-only platform settings | `9854b24a7189e4172d9b03f1148832c416175550` <br> 2026-10-26T07:58:01Z | 157 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/announcements/ANNOUNCEMENTS_REVIEW_BATCH_10A.md`, `app/admin/announcements/page.tsx`, `app/admin/settings/page.tsx` |
| `origin/feature/approval-execution-safety-batch-4b` | Add blocked execution contracts and isolated atomic approval rehearsal | `c017ca878da65d44059988067ef6263448bd9875` <br> 2026-10-24T09:31:52Z | 179 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/APPROVAL_EXECUTION_INTEGRATION_READINESS_BATCH_4B.md`, `docs/admin/APPROVAL_EXECUTION_REVIEW_BATCH_4B.md` |
| `origin/feature/authenticated-password-change-batch-11e` | docs(review): index Batch 11E candidate and independent review evidence. Last implementation-path commit: b5bd093 feat(account): add isolated authenticated password change and session revocation | `3058073fbff218e63eb7c1ddb6c342966000ffe8` <br> 2026-10-27T03:22:12Z | 134 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/PASSWORD_CHANGE_REVIEW_BATCH_11E.md`, `AGENTS.md`, `app/account/page.tsx` |
| `origin/feature/bilingual-marketplace-journey-batch-11d` | docs(review): index Batch 11D implementation and evidence. Last implementation-path commit: 1866016 feat(marketplace): localize discovery journey and preserve account continuity | `e9636b7c2150f17ed3952c41600fd6217eacd5d2` <br> 2026-10-27T01:44:20Z | 137 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/BILINGUAL_MARKETPLACE_REVIEW_BATCH_11D.md`, `AGENTS.md`, `app/heritage.css` |
| `origin/feature/case-history-audit-navigation-batch-7d` | feat: add read-only case history and safe audit navigation | `fec839b7b62711733b94210aba55fdcb6d599f29` <br> 2026-10-24T17:44:25Z | 169 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/case-audit/[id]/page.tsx`, `app/admin/disputes/[id]/history/page.tsx` |
| `origin/feature/chat-demo-acceptance` | Record blocked review PR and Actions attempts. Last implementation-path commit: 04d6917 Add isolated chat demo and activity-ordered inbox | `59bbf07a3db4206dd068be885bee7bae7a5a5ef4` <br> 2026-10-19T05:19:41Z | 192 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/MILESTONE21_CHAT_DEMO.md`, `app/api/conversations/route.ts`, `components/chat/participant.tsx` |
| `origin/feature/chat-moderation-mvp` | Add gated private chat and case-scoped safety moderation | `f9ae3a6f71daccaf6777f859be5fc723f62e4613` <br> 2026-10-19T04:26:43Z | 194 / 0 | Integrated by ancestry | See feature acceptance gates | `.github/workflows/verify.yml`, `app/admin/chat/[id]/page.tsx` |
| `origin/feature/customer-service-companion-batch-13a` | docs(ai): record exact Batch 13A evidence revision. Last implementation-path commit: 02d3669 feat(ai): add scoped offline Customer Service companion checkpoint | `b9df4dc2fedff2ca8b43da3e21f940ef1ef11bd1` <br> 2026-10-28T03:25:50Z | 115 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/CUSTOMER_SERVICE_COMPANION_REVIEW_BATCH_13A.md`, `AGENTS.md`, `app/api/dev/support-companion/route.ts` |
| `origin/feature/customer-service-foundation-batch-8a` | feat: add read-only Support workspace and private ticket contracts | `1d921d2f42e6137266877e2d2f5c48997a71e2b4` <br> 2026-10-25T00:23:42Z | 168 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/support/page.tsx`, `app/api/admin/support/route.ts` |
| `origin/feature/customer-service-ticket-intake-batch-8b` | feat: add isolated requester ticket intake and immutable lifecycle foundation | `86eef8c00745f9625d4e6b56ba420bd0e8734d44` <br> 2026-10-25T15:39:26Z | 167 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/support/page.tsx`, `app/api/support/tickets/[id]/route.ts` |
| `origin/feature/durable-disputes-responses-batch-13b-r1` | docs: index exact 13B-R1 closeout revision. Last implementation-path commit: a6c8705 feat: persist owned-development condition claims and borrower responses | `748698710a1e9b98eb43b6e3d4f11f0577a53003` <br> 2026-10-29T04:53:05Z | 95 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/inspection/DURABLE_DISPUTE_RESPONSE_REVIEW_BATCH_13B_R1.md`, `AGENTS.md`, `app/account/activity/page.tsx` |
| `origin/feature/durable-owner-studio-batch-13d-r1` | docs(studio): index exact 13D-R1 evidence closeout. Last implementation-path commit: c3bbfed feat(studio): persist owned item drafts, protected photos and confirmations | `8528ac146a67bc22d24513fa6dab87fab4058c58` <br> 2026-10-28T15:56:35Z | 101 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/vision/DURABLE_OWNER_STUDIO_REVIEW_BATCH_13D_R1.md`, `AGENTS.md`, `app/api/dev/item-studio/photos/[id]/route.ts` |
| `origin/feature/identity-assurance-foundation-batch-13c` | docs(identity): index exact Batch 13C evidence closeout. Last implementation-path commit: 13b1143 feat(identity): add owned synthetic eKYC assurance foundation | `a7286ab0ba6958504d580723bb5051789b49e6f8` <br> 2026-10-28T09:14:28Z | 107 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/identity/IDENTITY_ASSURANCE_REVIEW_BATCH_13C.md`, `docs/identity/batch13c/lint.log`, `AGENTS.md`, `app/account/identity/page.tsx` |
| `origin/feature/independent-approval-foundation-batch-4a` | Add inactive independent approval persistence and candidate review foundation | `ce9ad9d1dd7d3b894d4904374421272050629424` <br> 2026-10-24T08:47:26Z | 180 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/INDEPENDENT_APPROVAL_ARCHITECTURE_BATCH_4A.md`, `docs/admin/INDEPENDENT_APPROVAL_REVIEW_BATCH_4A.md` |
| `origin/feature/intelligent-chat-moderation` | Add measurable moderation rules and isolated shadow analysis | `fcd369a35fbd07df9ef9f9092b394ab0298d20b2` <br> 2026-10-19T12:31:15Z | 191 / 0 | Integrated by ancestry | See feature acceptance gates | `components/chat/reviewer.tsx`, `docs/INTELLIGENT_CHAT_MODERATION.md` |
| `origin/feature/local-ai-customer-service-batch-13f` | docs: index exact 13F evidence closeout revision. Last implementation-path commit: b20f638 feat: add gated synthetic-only local Ollama pilot | `f926659c128e85af6935e3cb72c6ab1ad4d65270` <br> 2026-10-29T07:52:51Z | 89 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/LOCAL_AI_CUSTOMER_SERVICE_REVIEW_BATCH_13F.md`, `AGENTS.md`, `app/api/dev/support-companion/local/route.ts` |
| `origin/feature/marketplace-home-navigation-batch-11b` | docs: index Batch 11B independent review and Stage 9 follow-up. Last implementation-path commit: 5d7101a feat: integrate marketplace homepage and shared heritage navigation for 11B | `afa1da866936fcfb0f3eb14cca4c78ea70580b18` <br> 2026-10-26T16:27:08Z | 143 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/MARKETPLACE_HOMEPAGE_REVIEW_BATCH_11B.md`, `AGENTS.md`, `app/catalogue/page.tsx` |
| `origin/feature/model-experiment-preparation-batch-12c` | Index Batch 12C preparation and missing live-model approvals | `7be0a59ffe590e1ede373940087fe6ee541b2860` <br> 2026-10-27T08:55:28Z | 121 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/MODEL_EXPERIMENT_PREPARATION_REVIEW_BATCH_12C.md` |
| `origin/feature/mrt-operations-geofencing-lab-batch-9a` | docs: record Batch 9A MRT review, screenshots and regression evidence. Last implementation-path commit: df37580 feat: add read-only MRT Operations and isolated Geofencing Test Lab | `87010119026af1d04fa0fd63f378f10c90d2011a` <br> 2026-10-26T02:46:31Z | 162 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/mrt/MRT_OPERATIONS_REVIEW_BATCH_9A.md`, `docs/security/batch9a/baseline-preservation.json`, `app/admin/locations/lab/page.tsx`, `app/admin/locations/page.tsx` |
| `origin/feature/official-mrt-booking` | Integrate official MRT selection with listing and booking workflows | `a02293d49336e84f0590bae7be36eb41fe8c24a0` <br> 2026-10-16T08:02:56Z | 199 / 0 | Integrated by ancestry | See feature acceptance gates | `README.md`, `app/api/bookings/[id]/route.ts` |
| `origin/feature/offline-ai-quality-review-batch-12d` | docs(ai): record exact Batch 12D closeout revision | `911fc303d604514d92cbe8238884b0e1bbaebb97` <br> 2026-10-27T11:39:05Z | 118 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/OFFLINE_QUALITY_REVIEW_BATCH_12D.md` |
| `origin/feature/operations-investigation-context-batch-7b` | feat(admin): add current investigation context and safe queue return links | `e58f09412321672be2ab7c42c57c277bcac487e3` <br> 2026-10-24T16:29:09Z | 171 / 0 | Integrated by ancestry | See feature acceptance gates | `app/admin/bookings/[id]/page.tsx`, `app/admin/disputes/[id]/page.tsx` |
| `origin/feature/playable-local-ai-demo` | docs: publish playable local AI demo checkout and verification. Last implementation-path commit: df35b12 fix: interrupt owned demo migration promptly on shutdown | `baad3b670fcdeaf925c96359cc293b35575ae8e9` <br> 2026-10-30T02:33:39Z | 82 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/local-demo/START_HERE.md`, `docs/ai/local-demo/publication-verification.json`, `scripts/local-ai-demo.ts`, `tests/local-ai-demo.test.ts` |
| `origin/feature/private-support-channel-foundation-batch-8c` | feat: add isolated requester-private support channel foundation | `00eb14d5282edb90f52411d82ef96f843f4cf936` <br> 2026-10-25T16:33:09Z | 166 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/support/channels/[id]/messages/route.ts`, `app/api/support/tickets/[id]/channel/route.ts` |
| `origin/feature/protected-ai-evaluation-runner-milestone-3b` | docs: record protected runner verification and pending approvals. Last implementation-path commit: 396762e feat: add bounded protected advisory evaluation runner | `e557a5181f7e421b64bb3576f69157ec3486626b` <br> 2026-10-30T06:50:16Z | 72 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/milestone3b/REVIEW.md`, `docs/ai/milestone3b/verification.json`, `docs/ai/MASTER_AI_DEVELOPMENT_ROADMAP.md`, `lib/advisory-evaluation/client.ts` |
| `origin/feature/qr-mrt-handoff-return` | Add opt-in MRT QR pickup and return verification | `74c726e2fc04e8b568d3a7fc5f895d6feade57a8` <br> 2026-10-19T14:08:12Z | 190 / 0 | Integrated by ancestry | See feature acceptance gates | `.github/workflows/verify.yml`, `app/api/bookings/[id]/meetup/[operation]/route.ts` |
| `origin/feature/rental-documentation-agreement-batch-13d-r2` | docs: index exact R2 evidence closeout revision. Last implementation-path commit: 847a947 feat: bind owned-development rental requests to reviewed item documentation | `95785a8c5ce777785bdf2fbb3871b5e617557705` <br> 2026-10-28T17:11:00Z | 98 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/vision/RENTAL_DOCUMENTATION_AGREEMENT_REVIEW_BATCH_13D_R2.md`, `AGENTS.md`, `app/api/bookings/[id]/route.ts` |
| `origin/feature/resolution-room-mutual-recovery-batch-13e` | docs: index exact 13E closeout revision. Last implementation-path commit: b9297ff feat: add owned-development two-party recovery resolution room | `f6a4dfb43f85eb72a442ee317dbce48ae45e558c` <br> 2026-10-29T06:12:56Z | 92 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/recovery/RESOLUTION_ROOM_REVIEW_BATCH_13E.md`, `docs/recovery/batch13e/VERIFICATION.md`, `AGENTS.md`, `app/api/dev/recovery-room/route.ts` |
| `origin/feature/scoped-staff-data-access-batch-3b` | Add isolated scoped staff read adapters and authorization readiness evidence | `208e297a4ea2bfe337e029d2b5ca88a6436ad2bb` <br> 2026-10-24T05:33:54Z | 182 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/ADMIN_SCOPED_ACCESS_REVIEW_BATCH_3B.md`, `docs/admin/SCOPED_DATA_ACCESS_ARCHITECTURE_BATCH_3B.md` |
| `origin/feature/scoped-staff-listing-read-pilot-batch-6a` | feat(security): integrate owned scoped staff listing read pilot | `ff7b2b6fc9e859e7d34851fb4a5c03aac67b01a9` <br> 2026-10-24T12:55:48Z | 175 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/dev/staff-listing-read/route.ts`, `app/dev/staff-listing-inspection/page.tsx` |
| `origin/feature/scoped-support-assignment-replies-batch-8d` | docs: record Batch 8D review evidence and production rollout gates. Last implementation-path commit: 4995595 feat: add owned scoped Support assignment and two-way reply candidate | `79ddffd9fd0a99623ac8ac00dcb491c52857ed0b` <br> 2026-10-25T17:43:17Z | 164 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/security/batch8d/baseline-preservation.json`, `docs/security/batch8d/camera-negative-evidence.json`, `app/api/auth/login/route.ts`, `app/api/dev/support-agent/route.ts` |
| `origin/feature/staff-authentication-mfa-foundation-batch-5a` | feat(auth): add isolated real staff WebAuthn MFA foundation | `f35a33b1d9530429b1870011da0a608c11e2afe8` <br> 2026-10-24T10:14:10Z | 178 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/STAFF_MFA_ARCHITECTURE_BATCH_5A.md`, `docs/admin/STAFF_MFA_REVIEW_BATCH_5A.md` |
| `origin/feature/staff-identity-database-foundation-batch-3a` | Add inactive staff identity database foundation and migration safety tests | `c51812bfd0bde62ab2cf30baef08bd73302fba39` <br> 2026-10-23T19:29:19Z | 183 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/STAFF_BOOTSTRAP_RUNBOOK_BATCH_3A.md`, `docs/admin/STAFF_IDENTITY_DATABASE_FOUNDATION_BATCH_3A.md` |
| `origin/feature/synthetic-ai-integration-batch-12b` | Index Batch 12B implementation and offline evidence for review. Last implementation-path commit: b921a3c Match disabled synthetic API refusal in exhaustive authorization coverage | `cc68facd7fcc29d4af8d186357e3f01f44258559` <br> 2026-10-27T06:48:37Z | 124 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/AI_INTEGRATION_REVIEW_BATCH_12B.md`, `tests/authorization.integration.test.ts` |
| `origin/feature/temporary-local-meetup` | Separate QR redemption and physical confirmation deadlines | `88af673e46603854006affee8e3dd783d5e14584` <br> 2026-10-20T02:48:21Z | 189 / 0 | Integrated by ancestry | See feature acceptance gates | `components/meetup-verification.tsx`, `docs/MILESTONE3_1_QR_ACCEPTANCE.md` |
| `origin/feature/temporary-local-meetup-testing` | Add isolated temporary local meetup testing mode | `cf215e0bdda92d7874329f16102c2a9ebd20a1be` <br> 2026-10-23T07:15:12Z | 188 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/bookings/[id]/meetup/[operation]/route.ts`, `components/meetup-verification.tsx` |
| `origin/feature/trust-evidence-inspection-batch-13b` | docs(inspection): record exact Batch 13B closeout revision. Last implementation-path commit: fa5b3e3 feat(inspection): add owned return evidence and unsent dispute review foundation | `6ff743df3871cc58437a72f5f36bc595fbffe9ea` <br> 2026-10-28T07:34:40Z | 110 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/inspection/TRUST_EVIDENCE_REVIEW_BATCH_13B.md`, `AGENTS.md`, `app/api/dev/inspection/route.ts` |
| `origin/feature/trusted-staff-sessions-audit-batch-3c` | Add pending staff session and durable audit foundations with revocation tests | `9998e5be836b79530cabf32bb75981e4daf6223e` <br> 2026-10-24T06:10:53Z | 181 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/admin/STAFF_REVOCATION_BATCH_4_READINESS.md`, `docs/admin/STAFF_SESSION_AUDIT_ARCHITECTURE_BATCH_3C.md` |
| `origin/feature/typed-platform-settings-batch-10b` | docs: index final Batch 10B revisions and independent review report. Last implementation-path commit: 94eee81 feat: add owned typed display settings with immutable history and rollback | `4c023549f65cd0788c7c6a4b5a2f65172e670f72` <br> 2026-10-26T08:56:36Z | 154 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/settings/TYPED_SETTINGS_REVIEW_BATCH_10B.md`, `app/admin/settings/page.tsx`, `app/api/admin/platform-settings/route.ts` |
| `origin/feature/vision-item-documentation-batch-13d` | docs(vision): index exact Batch 13D closeout revision. Last implementation-path commit: 3b5c964 feat(vision): add owned item documentation and evidence review | `bfc01b4b79b6d1dc10af6781cdb8d5e3f25697d8` <br> 2026-10-28T14:51:04Z | 104 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/vision/VISION_DOCUMENTATION_REVIEW_BATCH_13D.md`, `docs/vision/batch13d/initial-outcomes.json`, `AGENTS.md`, `app/api/dev/item-documentation/route.ts` |
| `origin/fix/camera-qr-verification-reliability-batch-7c` | fix: harden camera QR detection and stream lifecycle with reliability evidence | `93d3c646abc44e8298f2acd9bc3d57507f0691fe` <br> 2026-10-24T17:19:37Z | 170 / 0 | Integrated by ancestry | See feature acceptance gates | `components/meetup-verification.tsx`, `docs/admin/CAMERA_QR_RELIABILITY_REVIEW_BATCH_7C.md` |
| `origin/fix/local-qwen-generation-reliability-batch-13f-r2` | docs: record R2 deterministic verification and Mac acceptance gap. Last implementation-path commit: fd6c63a fix: constrain local Qwen generation to manifest source kinds | `3b4e247a018265657074dc60e5934298a6358183` <br> 2026-10-30T03:25:39Z | 80 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/batch13f-r2/verification.json`, `docs/ai/batch13f-r2/REVIEW.md`, `lib/local-inference/contracts.ts` |
| `origin/fix/local-qwen-validation-diagnostics-batch-13f-r1` | docs: index exact R1 validation evidence revision. Last implementation-path commit: 8e097dd fix: classify local inference validation failures in owned tests | `4fa6eb98379c63262953407efc1259a0425a8c85` <br> 2026-10-29T19:10:33Z | 86 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/ai/LOCAL_QWEN_VALIDATION_REVIEW_BATCH_13F_R1.md`, `docs/ai/batch13f-r1/DIAGNOSIS_AND_MAC_REPRODUCTION.md`, `lib/local-inference/contracts.ts` |
| `origin/fix/login-navigation-staff-rollout-readiness-batch-6b` | fix(auth): commit login navigation and document staff rollout gates | `d9bac9c0d6f5d867ba2a365874b9e3ea64246e62` <br> 2026-10-24T13:37:52Z | 174 / 0 | Integrated by ancestry | See feature acceptance gates | `components/auth-form.tsx`, `docs/admin/CONTROLLED_STAFF_READ_ROLLOUT_BATCH_6B.md` |
| `origin/fix/mandatory-rental-meetup-integration` | fix: require bilateral GPS and QR receipts for every new rental | `87459cbc169bc47b3fba2ef1e51577c4ef6968c9` <br> 2026-11-02T09:00:48Z | 34 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/bookings/[id]/route.ts`, `app/api/bookings/route.ts` |
| `origin/fix/milestone1-core-stability` | Stabilize rental retries, auth isolation and evidence access | `0f5c9ddea4c091f9a073b768c20bad4134317e2e` <br> 2026-10-19T03:47:48Z | 195 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/admin/disputes/[id]/evidence/[photoId]/route.ts`, `app/api/auth/login/route.ts` |
| `origin/fix/mrt-logout-polling-batch-10c` | docs: index final MRT logout polling repair and Stage 8 verification. Last implementation-path commit: b915e75 fix: cancel MRT status polls and close authenticated fixture lifecycle | `bcfb32566c31140f6539fe1a109500bdcee18865` <br> 2026-10-26T10:09:59Z | 151 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/security/MRT_LOGOUT_POLLING_REVIEW_BATCH_10C.md`, `components/meetup-verification.tsx`, `docs/roadmap/MASTER_ROADMAP_14_STAGES.md` |
| `origin/fix/mrt-post-integration-repairs` | Repair MRT availability races and isolate regression tests | `7a4dc6058dfbff7316ae53bd893337ebd651d674` <br> 2026-10-16T18:15:45Z | 198 / 0 | Integrated by ancestry | See feature acceptance gates | `.gitignore`, `README.md` |
| `origin/fix/qr-meetup-acceptance-hardening` | docs: add functional acceptance audit. Last implementation-path commit: 88af673 Separate QR redemption and physical confirmation deadlines | `3d8dd73437e3290459b3ef4ef228492cd447d131` <br> 2026-11-02T21:01:04+08:00 | 189 / 1 | Unique audit | Retain dated audit as historical evidence | `docs/audits/2026-11-02/FUNCTIONAL_ACCEPTANCE_AUDIT.md` |
| `origin/integration/account-recovery-milestones-1-2` | wip(test): checkpoint interrupted recovery acceptance setup | `7700f4538f1c6bc70373c5d3f483ac7aabb0f86e` <br> 2026-11-14T07:16:09Z | 0 / 4 | Integration candidate / unfinished | Resume isolated acceptance and reconcile WIP | `.env.example`, `README.md`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/register/route.ts` |
| `origin/integration/hustlen-mrt-complete` | Integrate Admin/MVP and official MRT booking systems | `b702a44d83b37679e08955f4b897273d24b11071` <br> 2026-10-16T18:55:03Z | 196 / 0 | Integrated by ancestry | See feature acceptance gates | `.github/workflows/verify.yml`, `.gitignore` |
| `origin/integration/hustlen-product-consolidation-20261102` | docs: audit complete UI consistency and integration merge readiness. Last implementation-path commit: c136dc9 fix: keep browse filters disabled until hydration attaches handlers | `0d88f4cd1f1aadb44792da24496888174115668d` <br> 2026-11-02T07:38:58Z | 35 / 0 | Integrated by ancestry | See feature acceptance gates | `docs/design/DESIGN_SYSTEM_PROPOSAL.md`, `docs/design/FULL_UI_UX_AUDIT.md`, `components/listings-browser.tsx`, `docs/product/browse-hydration-repair/REVIEW.md` |
| `origin/main` | docs: record Mission 5 hydration causal evidence and acceptance. Last implementation-path commit: fc4bf60 test: reject captured hydration failures in rental acceptance | `77aae95e950939483dd1418cf83c5261bc0ed67e` <br> 2026-11-06T00:47:12+08:00 | 0 / 0 | Canonical / same tip | See roadmap | `docs/audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md`, `tests/rental-browser.test.ts`, `tests/support/browser-diagnostics.ts` |
| `origin/recovery/account-recovery-milestones-1-2` | feat: implement account recovery milestones 1 and 2 | `d760ab3d390a57ff180f9a97e700b807e58f51ab` <br> 2026-11-09T12:21:57Z | 197 / 1 | Historical implementation / superseded candidate | Compare safeguards; prefer integrated successor for evaluation | `.env.example`, `.gitignore`, `README.md`, `app/api/auth/forgot-password/route.ts` |
| `origin/recovery/candidate-validation-20261103` | Group participant booking history and verify full lifecycle navigation | `6b477c4194de0f618c7aa38a658a474d72e31fcb` <br> 2026-11-04T10:41:50Z | 21 / 0 | Integrated by ancestry | See feature acceptance gates | `app/bookings/[id]/error.tsx`, `app/dashboard/error.tsx` |
| `origin/security/admin-readiness-batch-2a` | Harden disposable database isolation and sensitive error logging | `9b58969351fa091a969f7bca094f7a47c639fe5c` <br> 2026-10-23T18:25:24Z | 185 / 0 | Integrated by ancestry | See feature acceptance gates | `AGENTS.md`, `app/api/bookings/[id]/meetup/[operation]/route.ts` |
| `origin/security/staff-operational-readiness-batch-5c` | security: verify staff operational readiness and fix login hydration race | `a7063ee2510dd83258eea156c1ed7245ee0164e6` <br> 2026-10-24T11:34:53Z | 176 / 0 | Integrated by ancestry | See feature acceptance gates | `components/auth-form.tsx`, `docs/admin/ASSISTED_PASSKEY_RECOVERY_REVIEW_BATCH_5C.md` |
| `origin/stabilization/baseline-20261102` | Stabilize rental verification and test workflows | `cf61149442229fc60d2879752e8574a5df5c493e` <br> 2026-11-02T14:19:30Z | 33 / 0 | Integrated by ancestry | See feature acceptance gates | `app/api/bookings/route.ts`, `components/booking-actions.tsx` |

## Divergent refs

### `origin/fix/qr-meetup-acceptance-hardening`

Merge base `88af673e46603854006affee8e3dd783d5e14584`. 1 branch delta paths and 1 of those paths differ from main at the branch tip. `git cherry` matched 0 equivalent non-merge patches and returned 1 branch-only non-merge patches. Patch equivalence alone does not prove feature absence after rewrites.

- 3d8dd73437e3290459b3ef4ef228492cd447d131 2026-11-02T21:01:04+08:00 docs: add functional acceptance audit

Changed paths relative to the fork point:

```text
A	docs/audits/2026-11-02/FUNCTIONAL_ACCEPTANCE_AUDIT.md
```

### `origin/integration/account-recovery-milestones-1-2`

Merge base `77aae95e950939483dd1418cf83c5261bc0ed67e`. 79 branch delta paths and 79 of those paths differ from main at the branch tip. `git cherry` matched 0 equivalent non-merge patches and returned 4 branch-only non-merge patches. Patch equivalence alone does not prove feature absence after rewrites.

- 5b3a1d67a40ca3d7fba1c070b0b6cbd563a25147 2026-11-09T12:53:21Z Integrate account recovery with canonical authentication safeguards
- 0517551156fcd37f914377ce5570a31b1748f4ff 2026-11-12T09:53:14Z feat(auth): refine login and add recovery request experience
- 0dee5cda939aefc80014d955023a5fbeac4e59c9 2026-11-12T17:08:27Z feat(auth): add secure password reset screen
- 7700f4538f1c6bc70373c5d3f483ac7aabb0f86e 2026-11-14T07:16:09Z wip(test): checkpoint interrupted recovery acceptance setup

Changed paths relative to the fork point:

```text
M	.env.example
M	README.md
M	app/api/auth/forgot-password/route.ts
M	app/api/auth/register/route.ts
A	app/api/auth/reset-password/route.ts
A	app/auth.css
A	app/forgot-password/page.tsx
M	app/login/page.tsx
A	app/reset-password/page.tsx
M	components/auth-form.tsx
A	components/auth-shell.tsx
M	components/password-change.tsx
A	components/password-reset-form.tsx
A	components/recovery-request-form.tsx
A	docs/ACCOUNT_RECOVERY_EMAIL_SETUP.md
A	docs/ACCOUNT_RECOVERY_INTEGRATION.md
A	docs/ACCOUNT_RECOVERY_MILESTONE_1.md
A	docs/ACCOUNT_RECOVERY_MILESTONE_2.md
A	docs/ACCOUNT_RECOVERY_STEP3_WIP.md
A	docs/design/account-recovery-step1/REVIEW.md
A	docs/design/account-recovery-step1/screenshots/login-desktop.png
A	docs/design/account-recovery-step1/screenshots/login-mobile-dark.png
A	docs/design/account-recovery-step1/screenshots/login-mobile-light.png
A	docs/design/account-recovery-step1/screenshots/recovery-desktop.png
A	docs/design/account-recovery-step1/screenshots/recovery-mobile-dark.png
A	docs/design/account-recovery-step1/screenshots/recovery-mobile-light.png
A	docs/design/account-recovery-step1/screenshots/recovery-received-desktop.png
A	docs/design/account-recovery-step1/screenshots/recovery-unavailable-desktop.png
A	docs/design/account-recovery-step1/validation.json
A	docs/design/account-recovery-step2/REVIEW.md
A	docs/design/account-recovery-step2/accessibility.json
A	docs/design/account-recovery-step2/baseline-comparison.json
A	docs/design/account-recovery-step2/reset-validation.json
A	docs/design/account-recovery-step2/screenshots/reset-form-desktop-dark.png
A	docs/design/account-recovery-step2/screenshots/reset-form-desktop.png
A	docs/design/account-recovery-step2/screenshots/reset-form-mobile-dark.png
A	docs/design/account-recovery-step2/screenshots/reset-form-mobile.png
A	docs/design/account-recovery-step2/screenshots/reset-invalid-desktop.png
A	docs/design/account-recovery-step2/screenshots/reset-invalid-mobile.png
A	docs/design/account-recovery-step2/screenshots/reset-success-desktop.png
A	docs/design/account-recovery-step2/screenshots/reset-success-mobile.png
A	docs/design/account-recovery-step2/screenshots/reset-uncertain-desktop.png
A	docs/design/account-recovery-step2/screenshots/reset-uncertain-mobile.png
A	docs/design/account-recovery-step2/screenshots/reset-validation-desktop.png
A	docs/design/account-recovery-step2/screenshots/reset-validation-mobile.png
M	lib/auth.ts
A	lib/email/config.ts
A	lib/email/crypto.ts
A	lib/email/outbox.ts
A	lib/email/resend.ts
A	lib/email/templates.ts
A	lib/email/worker.ts
M	lib/i18n/catalogues.ts
A	lib/password-account.ts
M	lib/password-change/input.ts
M	lib/password-change/service.ts
A	lib/password-policy.ts
A	lib/password-recovery.ts
A	lib/password.ts
A	lib/recovery-link.ts
M	next.config.ts
M	package.json
A	prisma/migrations/20261109090000_password_recovery/migration.sql
A	prisma/migrations/20261109100000_recovery_email_outbox/migration.sql
M	prisma/schema.prisma
A	scripts/email-worker.ts
M	tests/account-password-review.integration.test.ts
A	tests/account-recovery-migration.test.ts
M	tests/account-security-ux.integration.test.ts
A	tests/email-integration.ts
A	tests/email.test.ts
M	tests/password-change.integration.test.ts
M	tests/password-change.test.ts
A	tests/password-recovery.test.ts
A	tests/password-reset-ui.ts
A	tests/recovery-integration.ts
A	tests/recovery-link.test.ts
A	tests/recovery-request-ui.ts
M	tests/run-isolated.ts
```

### `origin/recovery/account-recovery-milestones-1-2`

Merge base `f856dc360b332007dd79725ddee0d28102411521`. 30 branch delta paths and 30 of those paths differ from main at the branch tip. `git cherry` matched 0 equivalent non-merge patches and returned 1 branch-only non-merge patches. Patch equivalence alone does not prove feature absence after rewrites.

- d760ab3d390a57ff180f9a97e700b807e58f51ab 2026-11-09T12:21:57Z feat: implement account recovery milestones 1 and 2

Changed paths relative to the fork point:

```text
A	.env.example
M	.gitignore
M	README.md
M	app/api/auth/forgot-password/route.ts
M	app/api/auth/login/route.ts
M	app/api/auth/register/route.ts
A	app/api/auth/reset-password/route.ts
M	components/auth-form.tsx
A	docs/ACCOUNT_RECOVERY_EMAIL_SETUP.md
A	docs/ACCOUNT_RECOVERY_MILESTONE_1.md
A	docs/ACCOUNT_RECOVERY_MILESTONE_2.md
M	lib/auth.ts
A	lib/email/config.ts
A	lib/email/crypto.ts
A	lib/email/outbox.ts
A	lib/email/resend.ts
A	lib/email/templates.ts
A	lib/email/worker.ts
A	lib/password-recovery.ts
A	lib/password.ts
M	package.json
A	prisma/migrations/20261109090000_password_recovery/migration.sql
A	prisma/migrations/20261109100000_recovery_email_outbox/migration.sql
M	prisma/schema.prisma
A	scripts/email-worker.ts
A	tests/email-integration.ts
A	tests/email.test.ts
A	tests/password-recovery.test.ts
A	tests/recovery-integration.ts
M	tests/run-isolated.ts
```

## Cross-branch conclusions

- **QR and MRT.** The audit-only QR ref adds one historical report. Its November 2 status was tied to an older owner checkout. The production path changed on canonical main through `87459cbc` and subsequent stabilization. Use main's [meetup enrollment](../../lib/meetup/enrollment.ts) and [booking route](../../app/api/bookings/route.ts) as the source of truth for new bookings. Retain the audit for historical evidence about verified versus unverified device flows.
- **Account recovery.** Main's [forgot-password endpoint](../../app/api/auth/forgot-password/route.ts) returns a configuration message. The separate owned-development authenticated password change is reachable in main and solves a different problem. `d760ab3` is the older standalone branch. Its two migration names, reset endpoint and Resend outbox have counterparts on the canonical-based candidate. Shared concepts and filenames do not imply equivalent patches. `5b3a1d6` adapts the implementation to canonical auth safeguards, `0517551` and `0dee5cd` add request and reset UX, and `7700f45` wires an acceptance target whose test source is absent. Inspect `docs/ACCOUNT_RECOVERY_STEP3_WIP.md` at that tip for exact boundaries. Evaluate that candidate under simulated email after core rental acceptance.
- **Admin and staff.** The sequence from Control Center through capability and identity tables, session binding, approval rehearsal, WebAuthn and pilot reads is all reachable. Production role rollout is still gated. See [Feature status](FEATURE_STATUS.md) and [Development history](DEVELOPMENT_HISTORY.md).
- **AI, documentation, and disputes.** Synthetic Case Brief, offline evaluations, the local companion, studio agreement and condition/recovery room prototypes are reachable. Their gates and deployment restrictions still apply. The condition room and password recovery branches refer to different product areas.
- **Consolidation.** The November 6 consolidation ref and main have identical tip IDs. The November 2 integration and stabilization refs and November 3 recovery-validation ref are ancestors. Use them for historical comparisons and recovery evidence.

## Metadata and coverage boundaries

- `git ls-remote --symref origin HEAD` identifies main. `git ls-remote --heads origin` was matched name-for-name and SHA-for-SHA against fetched refs. The repository reports a non-shallow history. Branches cited only in historical documents cannot be treated as current remote heads.
- Git advertises one PR head, `refs/pull/1/head` at `18529a30bb7da3c3db08baca614ef1fe2764eb10`, which is reachable from main. The GitHub API returned HTTP 403 for PR and release listings. PR state, titles, completeness, review, exact GitHub merge method and releases are unverified. Reachability of the PR head does not prove that the PR itself was merged via GitHub.
- Canonical Git merge commits are `f856dc3`, `b702a44`, `86113ab` and `f1d4952`. They establish in-repository merge topology. The one remote tag is `rollback/main-before-consolidation-20261106` at `f856dc360b332007dd79725ddee0d28102411521`.
- The checked-in workflows are [Verify combined Hustlen](../../.github/workflows/verify.yml) and [Browser acceptance](../../.github/workflows/browser-acceptance.yml). Remote run status was not independently retrieved.

## Reproduce the comparison

From the repository root, `git ls-remote --heads origin` enumerates advertised branch tips. Compare it with `git for-each-ref refs/remotes/origin --format='%(objectname) %(refname)'` after fetching all heads. For a branch `origin/<name>`, run `git merge-base origin/main origin/<name>`, `git rev-list --left-right --count origin/main...origin/<name>`, `git cherry origin/main origin/<name>`, and `git diff --name-status origin/main...origin/<name>`. Compare fork-changed paths directly between both tips to see whether the current file content differs, then read the relevant handlers and contracts. The audit recorded all tips and intermediate comparisons in `/workspace/audit-evidence/branches.json` for this instance.
