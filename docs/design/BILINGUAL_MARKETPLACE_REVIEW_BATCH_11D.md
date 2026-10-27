# Batch 11D — Bilingual Marketplace Journey & Account UX Continuity

27 October 2026, Asia/Taipei. Stage 9 implemented candidate; language/visual acceptance and production readiness remain unapproved.

## Revisions

- Isolated branch: `feature/bilingual-marketplace-journey-batch-11d`.
- Clean Batch 11C documentation baseline: `0ac03f31f54dd907ee3b4de9a66f38a939d86240`.
- Verified ancestors: 11C implementation `19833cc841f40aef595228f7568fb23373a68fe6`, evidence `8622c053ffb2ebe317818dcb78b963f5bfc53325`.
- **Tested implementation: `1866016dc5891cd90c9472e4ff8895024d275ea9`.**
- **Separate evidence closeout: `d2fd4ce6ed85b4b6a6e1d68b2fba9820283365f7`.**
- This final review/index commit is documentation only, so these are exact preceding revisions, not self-referential hashes.

## Working result

The actual Home → Browse → Listing Detail → Account journey now shares the existing English/Traditional Chinese preference. Browse translates search/filter labels, exact-valued category/status/station options, result counts, empty states, cards and report controls. Listing discovery translates public detail labels, daily price/deposit presentation, availability, media descriptions, back/login/restriction states and known category/detail display labels. Real error/not-found/retry and pending-link feedback use the same typed catalogue. There are **203 paired messages**, without a new localization dependency, remote translation, duplicate-language route or schema change.

Language switching preserves Browse filters and mounted rental/account drafts. The server cookie initializes ordinary page rendering; invalid locale/category preferences fall back safely. Reload and connected real navigation preserve the selected locale. Existing Light/Dark/System, default-OFF sound, reduced-motion behavior and independently controlled effects remain intact. Materials/artwork remain the provisional R1 system; localized text expansion receives bounded wrapping/contrast adjustments, not another redesign.

The scope is deliberately **public discovery**, not the entire rental transaction. Existing quotation, station picker and private chat entry remain English with a bilingual notice and `lang=en`. Account activity/trust reuse the shared bilingual navigation and responsive account index; their own historical records/body content remain explicitly English. Password change does not exist, and forgot-password does not deliver messages. Neither workflow was faked or activated.

## Data and authority

Server Browse queries/read models and detail eligibility checks compare token-for-token with 11C. ACTIVE/unrestricted/ACTIVE-owner/photo requirements for Browse remain unchanged. The existing detail owner-self-view exception and no-photo detail behavior are preserved; no-photo details do not acquire booking authority. Hidden detail requests remain actual **404**, independently of language.

The eight creation-category strings map to translated display labels only. Unknown categories/detail keys remain raw, escaped values. Exact query/option values, persisted enums, descriptions, names, report descriptions and station catalogue names are not rewritten. Search additionally recognizes the chosen known-category label while retaining all raw text matching. Real report submission preserves English reason identifiers and raw description; duplicate reports remain **409**, now with an accurate translated explanation.

Price/deposit remain the same persisted Decimal values. The schema has no currency column; existing homepage/detail/core formatters explicitly display USD. 11D preserves that existing presentation contract without converting to TWD or claiming a separately approved launch-currency policy. No stored dates, private messages, evidence, custody, booking lifecycle, operational settings or staff authority change.

## Evidence index

| Deliverable | Evidence |
| --- | --- |
| Complete changed-file inventory | [CHANGED_FILES.md](batch11d/CHANGED_FILES.md) |
| Existing routes, currency/category authority, account review | [DISCOVERY_AND_ACCOUNT_AUDIT.md](batch11d/DISCOVERY_AND_ACCOUNT_AUDIT.md) |
| Exact bilingual scope, fallback and exclusions | [LOCALIZATION_COVERAGE.md](batch11d/LOCALIZATION_COVERAGE.md) |
| All 203 pairs and Taiwan terminology | [TRANSLATION_CATALOGUE.md](batch11d/TRANSLATION_CATALOGUE.md), [GLOSSARY.md](batch11d/GLOSSARY.md) |
| Real persisted journey/filter/report proof | [discovery-browser.json](batch11d/discovery-browser.json), [browser test source](../../tests/discovery-localization.integration.test.ts) |
| 36 desktop/tablet/mobile locale/theme captures | [SCREENSHOTS.md](batch11d/SCREENSHOTS.md) |
| Real storage-failure and retry | [error-retry.json](batch11d/error-retry.json) |
| Preserved account and sensory behavior | [account-localization-browser.json](batch11d/account-localization-browser.json), [heritage-regression.json](batch11d/heritage-regression.json) |
| Password change/recovery decision proposal | [PASSWORD_CHANGE_AND_RECOVERY_PROPOSAL.md](batch11d/PASSWORD_CHANGE_AND_RECOVERY_PROPOSAL.md) |
| Exact selected commands/results | [TEST_COMMANDS.md](batch11d/TEST_COMMANDS.md), [regression-ledger.json](batch11d/regression-ledger.json) |
| Initial failures, corrections and reruns | [INITIAL_FAILURES.md](batch11d/INITIAL_FAILURES.md), [initial-outcomes.json](batch11d/initial-outcomes.json) |
| Historical/data-access preservation and cleanup | [preservation.json](batch11d/preservation.json), [cleanup.json](batch11d/cleanup.json) |
| Remaining acceptance / next recommendation | [ACCESSIBILITY_AND_NEXT_STEPS.md](batch11d/ACCESSIBILITY_AND_NEXT_STEPS.md), [canonical roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) |

## Actual verification

**25/25 selected command groups** passed their final executions; **95/95 unit tests** passed. Final TypeScript, lint, Prisma validation and production build exited 0. This covers discovery/localization/account/home/heritage; original integration; meetup-session; full meetup; login navigation/readiness; Admin/Workbench; rental API/browser; chat/moderation; Support channels/staff; authorization/staff sessions/MFA; announcements/settings and Locations. The ledger identifies exact scripts, UTC timestamps, owned-run artifact IDs and cleanup outcomes. It is not a claim that every repository suite ran.

Full `test:meetup` passed **11/11**, retaining actual virtual-camera QR decoding at pickup and return, real verify responses and `verifiedBooking: true` ([pickup](batch11d/camera-pickup.json), [return](batch11d/camera-return.json)). Existing camera/GPS/consent/evidence/custody and logout/polling requirements are unchanged. The quiet login-readiness run passed its original deadline; **R1 overlapping-workload timing remains unresolved**. A serial pass does not prove root-cause closure.

The discovery test uses actual application routes and persisted fixtures: real category links, search/status/station filters, raw escaped titles/details, saved report values, duplicate-report denial, hidden-listing denial, invalid preference fallback, keyboard activation, mobile Escape/focus return, retained drafts and no overflow at 1440/820/390. Masthead computed text/background contrast is at least 4.5:1 across both languages/themes. A deliberately renamed table in the owned disposable database produces a real 500; fixed localized error copy avoids raw error material, and retry refetches successfully after restoration. Primary journey and successful retry require empty error arrays. Expected 404/409/fault observations are narrowly scoped; shared browser collection and existing deadlines remain unchanged.

Initial attempts were not all green. Retained evidence includes selector/textarea observation mistakes, a streaming loading boundary that changed 404 to 200, client-only not-found text serialization, a stale catalogue-count assertion, expected-fault classification, and a genuine retry defect from using reset() instead of this Next version’s refetching retry(). Screenshot review corrected dark/detail/masthead contrast and status wrapping. The final contrast test also needed its arithmetic moved out of the serialized browser callback because the TS runner injected an unavailable helper. These attempts are recorded separately, never disguised as passes.

## Preservation and acceptance limits

All changing tests used freshly created, verified owned disposable databases. Final read-only maintenance verification found **zero Batch 11D databases and zero owned test principals**. The deliberate table fault was restored in finally before harness cleanup. No existing application database was modified. No migration was introduced; fresh replay and existing historical-migration unit checks ran, while a separate populated-upgrade campaign was not needed/rerun for this presentation-only batch. Historical migrations/schema, API/auth/session/CSRF code, booking/MRT/chat operational components, private evidence/Support/staff guards, dependency lockfile and public assets are unchanged.

Physical devices, Safari, assistive technologies, zoom/high-contrast, full manual contrast/focus acceptance, low-end FPS/memory and production Core Web Vitals remain open. English workflow/record boundaries are explicit; Hustlen’ is not declared fully bilingual or visually finalized. Owner/native-speaker review is still required for translations/glossary/default preference policy, formatting and launch currency, alongside provisional R1 visual acceptance.

The next recommended engineering scope is **genuine authenticated password change**, after explicit security/product decisions on reauthentication, limits, credential update concurrency, session/MFA revocation and notification delivery. Recovery is a distinct gated design. The proposal is an engineering threat review, not independent security approval or authorization to implement. Accessibility closure should be planned alongside that decision. Do not begin Stage 10 AI.

Stage 9 remains **In Progress**. Original 14-stage titles/objectives/order and Stage 6/7/8 blocker sections are preserved. No production Support, station controls, publishing/settings writes, staff activation, financial controls, high-risk execution, AI or recovery was enabled. Nothing was pushed, merged or deployed.
