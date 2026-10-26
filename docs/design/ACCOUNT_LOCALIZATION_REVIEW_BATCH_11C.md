# Batch 11C — Account Experience & Localization review

27 October 2026, Asia/Taipei. Stage 9 implemented candidate; not production or product-owner visual/language approval.

## Revisions and baseline

- Branch: `feature/account-localization-batch-11c`.
- Clean starting HEAD: `afa1da866936fcfb0f3eb14cca4c78ea70580b18` on `feature/marketplace-home-navigation-batch-11b`.
- Verified 11B implementation ancestor: `5d7101a84c2944d0ad69c4a1e4659fa0af774ce1`; evidence ancestor: `d21ebf194f09a610041398d04cc55a6dc4000e7a`.
- Tested implementation: **`19833cc841f40aef595228f7568fb23373a68fe6`**.
- Separate evidence closeout: **`8622c053ffb2ebe317818dcb78b963f5bfc53325`**.
- This final report/index commit changes documentation only; neither preceding SHA is a self-referential claim.

## Result

The actual homepage, shared marketplace navigation and Account Settings now have complete typed English and Traditional Chinese catalogues (131 paired messages). A real language selector changes the current page immediately without remounting the account form; an exact allowlisted cookie initializes server rendering and hydration consistently. Invalid preferences fall back to English. Blocked browser storage permits in-document language changes without pretending reload persistence works. Language is separate from appearance, sound and motion preferences.

Account editing still uses the original authenticated name-only API. The interface now explains read-only email, validates clearly, preserves drafts across language changes and real server errors, supports actual retry, and distinguishes saved, unsaved, saving and expired-session states. An actual 401 hides stale read-only account metadata while retaining the typed draft and sign-in guidance, including during subsequent edits. No password or recovery success was fabricated: no change-password endpoint exists, and the forgot-password endpoint does not deliver recovery messages.

Existing R1 artwork, warm materials, themes, mobile navigation and tactile foundation are retained. Chinese uses local CJK serif/sans fallbacks, upright heading metrics and adjusted narrow-screen sizing. No new image/font asset, remote translation service or localization dependency was introduced. Shared navigation still derives Admin/chat links from trusted server checks.

## Inspection links

- [Complete changed-file inventory](batch11c/CHANGED_FILES.md).
- [Account capability/backend audit](batch11c/ACCOUNT_CAPABILITY_AUDIT.md).
- [Exact preference, fallback, architecture and coverage contract](batch11c/LOCALIZATION_POLICY_AND_COVERAGE.md).
- [All 131 translation pairs](batch11c/TRANSLATION_CATALOGUE.md) and [draft Taiwan glossary](batch11c/GLOSSARY.md).
- [24 desktop/tablet/mobile locale/theme screenshots plus session expiry](batch11c/SCREENSHOTS.md).
- [Actual bilingual browser outcomes](batch11c/localization-browser.json).
- [Commands and selected verification scope](batch11c/TEST_COMMANDS.md), [machine regression ledger](batch11c/regression-ledger.json), [initial failures](batch11c/INITIAL_FAILURES.md) and [attempt metadata](batch11c/initial-outcomes.json).
- [Historical/API preservation](batch11c/preservation.json), [read-only cleanup verification](batch11c/cleanup.json).
- [Next Stage 9 milestone](batch11c/STAGE_9_NEXT_STEPS.md) and [canonical 14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md).

## Verification and limits

All **25 selected command groups** finally passed, including original integration, account/home/heritage, meetup-session, full meetup, Admin/Workbench, rental API/browser, chat, Support, authorization/staff-session/MFA, announcements/settings, Locations, moderation and login navigation/readiness, plus production build. Unit tests: **94/94**. TypeScript, lint and Prisma validation exited 0. The ledger lists every exact script and owned-run artifact; this is not a claim that every repository test script ran.

Full meetup passed **11/11** with genuine virtual-camera pickup and return QR decoding, real verify responses and `verifiedBooking: true` in the retained diagnostic records. GPS, consent, camera, evidence, custody and session guards were not relaxed. Standard browser error collection and existing deadlines remain unchanged. New negative scenarios assert only exact expected 500/401/disabled-development-script observations; unexpected errors remain failing.

Initial attempts were not all green. They exposed optional appearance-cookie persistence throwing when blocked, keyboard readiness assumptions, an expiry fixture racing a successful-save refresh, and a development RSC stream-finish wait that timed out and required exact-owned-run interruption. Each is separately recorded with the correction and final fresh results. The final account/localization/build runs include the last expiry-feedback correction. Existing R1 overlapping-workload login timing remains unresolved: this batch’s quiet serial login-readiness pass does not prove it fixed.

All changing tests used newly owned disposable databases. Final read-only maintenance checks found **zero** Batch 11C databases and zero owned test principals. Original API guards, Prisma schema, historical migrations, dependency lockfile and public assets are unchanged. Fresh migration replay occurred in isolated runs; no new schema migration or separately rerun populated-upgrade campaign is claimed. Existing application databases were not modified.

## Outstanding acceptance

This is a deliberately scoped bilingual slice. Login, Browse body, account activity/trust bodies, Admin, booking, Support and other operational content remain English; scoped language attributes identify untranslated regions. User content, private records and historical data are never automatically translated. USD values/currency remain unchanged; Taiwan-local time formatting is centralized without inventing ordinary-user session timestamps.

Product-owner decisions remain for default locale/persistence, glossary and wording, expansion scope, legal/security translations and formatting conventions. R1 visual acceptance, physical-device/font/screen-reader acceptance and broader performance review remain open. Password change/recovery needs its own approved secure design and delivery policy. No wider marketplace redesign or production-language rollout is implied.

Stage 9 remains **In Progress**. Original 14-stage ordering/objectives are preserved; Stage 6/7/8 sections are unchanged, including station controls, Support activation/policies and production publishing/settings approvals. No staff activation, high-risk execution, AI, payments, production configuration or Support rollout was introduced. Nothing was pushed, merged or deployed.
