# Complete fresh test report

2 November2026, Asia/Taipei. Tested implementation `7f1f6e4072c51b540bba92f5b700afbbdd1ff478`; documentation closeout follows separately. Machine-readable [verification.json](consolidation-20261102/verification.json) retains **every run**, including failures and repeats. This is the selected regression set, not all repository suites or production certification.

## Latest executed outcomes

| Actual command | Started (Asia/Taipei) | Result | Coverage / artifacts |
|---|---|---|---|
| `npm run build:verify` | 11:17:17 | PASS | command exit recorded; `.test-artifacts/e105888016c2c82b5cc50b10` |
| `npm audit --json` | 11:03:15 | FINDINGS (exit1) | command exit recorded; no DB artifact |
| `npm run lint` | 11:21:22 | PASS | command exit recorded; no DB artifact |
| `npx prisma validate --config prisma7.config.ts` | 10:55:30 | PASS | command exit recorded; no DB artifact |
| `npm run test:admin` | 11:03:31 | PASS | ℹ tests 7; ℹ pass 7; ℹ fail 0; `.test-artifacts/3f5c253c606d6ebb140cdaf8` |
| `npm run test:admin-migration` | 11:13:38 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/00652deaf460d791c29e65df` |
| `npm run test:announcements` | 11:08:11 | PASS | ℹ tests 9; ℹ pass 9; ℹ fail 0; `.test-artifacts/f96565dbd128c4ec1fbd8684` |
| `npm run test:authorization` | 11:07:17 | PASS | ℹ tests 8; ℹ pass 8; ℹ fail 0; `.test-artifacts/c4b18908c8de2bb21f289000` |
| `npm run test:chat` | 11:05:04 | PASS | ℹ tests 14; ℹ pass 14; ℹ fail 0; `.test-artifacts/1892cb717ea74058f05467e9` |
| `npm run test:homepage` | 11:19:33 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/6859541620f000dbe6e1cd52` |
| `npm run test:integration` | 11:14:14 | PASS | command exit recorded; `.test-artifacts/e84f3aec65400c492a934c1c` |
| `npm run test:local-ai-demo` | 11:15:10 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; no DB artifact |
| `npm run test:local-ai-playground` | 11:06:38 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/7b1c8e72c2b72f77a1664852` |
| `npm run test:locations` | 11:07:46 | PASS | ℹ tests 7; ℹ pass 7; ℹ fail 0; `.test-artifacts/ebaa8b2dd145462506e6311e` |
| `npm run test:login-readiness` | 11:12:22 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/c6534cab44b47d826b0f3e9c` |
| `npm run test:meetup` | 10:59:14 | PASS | ℹ tests 12; ℹ pass 12; ℹ fail 0; `.test-artifacts/026808eac998f1f1a31ccb4d` |
| `npm run test:meetup-session` | 11:10:48 | PASS | ℹ tests 6; ℹ pass 6; ℹ fail 0; `.test-artifacts/984d32bab85607b01f29e39f` |
| `npm run test:mfa` | 11:12:42 | PASS | ℹ tests 16; ℹ pass 16; ℹ fail 0; `.test-artifacts/8a43e70175dceaf76797c922` |
| `npm run test:migration` | 10:56:02 | PASS | command exit recorded; `.test-artifacts/e95916bb63fb60e26bb8c282` |
| `npm run test:moderation` | 11:04:11 | PASS | ℹ tests 10; ℹ pass 10; ℹ fail 0; `.test-artifacts/6fee5b81da1e994f2ae02386` |
| `npm run test:platform-settings` | 11:08:36 | PASS | ℹ tests 8; ℹ pass 8; ℹ fail 0; `.test-artifacts/540990f9722d82908b1c00f4` |
| `npm run test:rental-api` | 10:56:08 | PASS | ℹ tests 13; ℹ pass 13; ℹ fail 0; `.test-artifacts/cb2ad9ac6671b53a7535107f` |
| `npm run test:rental-browser` | 11:11:29 | PASS | ℹ tests 4; ℹ pass 4; ℹ fail 0; `.test-artifacts/38dc3d70bf00adb062b41d2f` |
| `npm run test:stability` | 11:06:20 | PASS | ℹ tests 8; ℹ pass 8; ℹ fail 0; `.test-artifacts/60cc7934af0d1af7e6b1e9a9` |
| `npm run test:support-handoff` | 11:07:00 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/fdbccf51a94efd0e20c0ab6e` |
| `npm run test:support-staff-production` | 11:08:55 | PASS | ℹ tests 1; ℹ pass 1; ℹ fail 0; `.test-artifacts/b315322c2ee818de54ba91f8` |
| `npx tsc --noEmit` | 11:21:22 | PASS | command exit recorded; no DB artifact |
| `npm run test:unit` | 11:06:47 | PASS | ℹ tests 201; ℹ pass 201; ℹ fail 0; no DB artifact |

Additional checks: clean install of573 packages in a separate task-owned `/tmp` directory using the exact final lock; `npx next typegen`; focused dependency-security3/3 (bounded Zod/deepmerge/URI vectors); `git diff --check`. All33 original migration bytes remain identical. No generated client/schema push or destructive reset was used.

## Initial failures and separate corrections

- **test:integration**: Initial30s mobile Zoom in tap timeout. Subsequent original runs twice pass. No map code fixed; resource/source-HMR overlap existed but causation unproven. Intermittence remains tracked.
- **test:meetup-session**: Temporary evidence wrapper moved active build output during concurrent static check. Restored bytes; corrected wrapper to archive only completed own IDs. Fresh6/6 pass. No product guard/timeout/collector changed.
- **test:admin-migration**: Whole-row fixture comparison omitted three existing nullable documentation columns. Added explicit null assertions plus exact original-field comparison; populated forward replay then passes. Historical migrations unchanged.
- **test:homepage**: New contrast helper inside serialized browser evaluate triggered tsx __name ReferenceError. Moved arithmetic to Node, reading actual browser styles; unchanged4.5 ratio/44px thresholds pass.
- **dependency-audit**: Initial high Zod advisory plus16 moderate affected package entries. Dev-only patch and bounded regression remove high;16 moderate remain and audit stays exit1.

No deadlines were increased. No unexpected browser errors, all401s, source-validation failures or camera requirements were globally suppressed. The original integration now passes twice with unchanged product assertions; this does not establish the cause of the first mobile tap timeout.

## What the tests actually establish

- Actual source-backed MRT inventory and selected station persistence, owner photo/video listing form, borrower booking, unavailable-station and concurrent station-edit/booking races. The original integration covers native pages and legacy lifecycle; full meetup separately covers protected real virtual-camera pickup/return, independent receipt and inspection. Do not combine separate fixtures into a claim of one manually performed real-world rental.
- Rental API13/13; rental browser4/4; Admin7/7; moderation10/10; chat14/14; stability8/8; authorization8/8; MFA16/16; session/logout6/6; all selected positive/negative assertions preserved. Exact whole suite outcomes are above.
- Full meetup12/12 includes actual virtual-camera QR decoding at pickup and return, consent/GPS/checklists/evidence/auth/restart/replay/negative camera behavior. No Vision-model image analysis occurred. Safe event counts are in the ledger.
- Native synthetic login, protected worker, free-form/multi-turn mocked AI, explicit user-confirmed persisted Support handoff and production refusal tested. Headed launcher1/1 verifies zero automatic inference,2 manual mock attempts with visible success/failure, retained browser and ownership cleanup; it never proves real Qwen quality.
- Final Help/navigation browser covers real auth redirects, no public ticket/developer links, keyboard menu Escape/focus, both themes at1440/820/390 widths, no overflow and action contrast≥4.5/touch height≥44px. Final screenshot review is engineering evidence, not full WCAG/aesthetic approval.
- Normal production build uses existing local font stack, no historical test font substitution. New owned DB schema only.

## Blocked, unrun and non-passing work

Actual local Ollama GET `/api/tags` returned ECONNREFUSED at the recorded time; no executable/attached Mac runtime was available. Genuine English/zh-TW inference, multi-turn semantics, injection resistance and latency are BLOCKED, not substituted by mocks. Historical owner-reported Qwen results remain historical. No genuine benchmark, live Vision/translation, provider activation, weight download or customer-data export.

The full set of password, identity/studio/recovery, staff migration and all historical individual pilot scripts was not rerun in this consolidation. Their code and boundaries were preserved; report current coverage only where named above. Physical device/Safari, owner/team demonstration and full accessibility/visual acceptance remain unavailable. `npm audit` remains nonzero for16 moderate development-tool package entries rooted in minimatch GHSA-g3hv-75wg-m249. Do not label the project fully vulnerability-free.

## Preservation, privacy and independent review

Every changing suite used a new guarded owned local test database and reported teardown, or the launcher made explicit ownership assertions. A final read-only maintenance query found **zero** `hustlen_test_consolidation_*` databases. No existing application DB records were migrated/reset/seeded. Raw test artifacts are private ignored data preserved by completed-run ID outside the constrained build filesystem; original-path symlinks remain. The one temporary-wrapper concurrency mistake is disclosed above. Existing stash, private configuration, original migrations, station data, auth/lifecycle and AI gateway sources remain preserved.

Committed screenshots: [Help desktop/light](consolidation-20261102/screenshots/help-light-desktop.png), [desktop/dark](consolidation-20261102/screenshots/help-dark-desktop.png), [tablet/light](consolidation-20261102/screenshots/help-light-tablet.png), [tablet/dark](consolidation-20261102/screenshots/help-dark-tablet.png), [mobile/light](consolidation-20261102/screenshots/help-light-mobile.png), [mobile/dark](consolidation-20261102/screenshots/help-dark-mobile.png), [mobile navigation](consolidation-20261102/screenshots/marketplace-menu-mobile.png), [marketplace](consolidation-20261102/screenshots/homepage-dark-desktop.png). [Initial mobile capture](consolidation-20261102/screenshots/help-dark-mobile-initial.png) is explicitly pre-correction evidence, not final appearance. No QR payload, auth cookie or inference transcript screenshots were added.

See RELEASE_READINESS_REPORT.md: reviewable development candidate, not an authorization to push, merge or deploy.
