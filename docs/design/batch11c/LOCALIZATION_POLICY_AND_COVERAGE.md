# Localization foundation — working product proposal

**27 October 2026, Asia/Taipei.** Functional Stage 9 candidate authorized for review, not a previously approved production language policy or a whole-site bilingual launch. R1 materials remain provisional.

## Exact preference policy

- Supported identifiers: `en` and `zh-TW`. English is the proposed default. No Accept-Language auto-selection, locale routes or automatic account-based language association.
- Server reads allowlisted nonsensitive cookie `hustlen_locale`; unknown/malformed/unsupported values fall back to English. Client reads the same cookie through a small external store, so server HTML and initial hydration agree. There is no mount-time local-storage override that changes the server's initial language.
- Selector updates translated content immediately through context/external-store subscriptions. It does not navigate or refresh/remount the account form, preserving drafts. Real navigation/reload uses the cookie again; persisted/cached route props do not override current allowed browser preference.
- Cookie: path `/`, SameSite=Lax, one-year expiry, Secure on HTTPS, deliberately JS-readable because it is not a credential. No session/authorization meaning. Local storage `hustlen:locale` is a nonsensitive cache/event signal, not an authoritative server policy.
- If cookies/storage are blocked, the current document can still change language in memory; full-reload persistence cannot be promised, and English fallback is safe. Invalid values never become role, database selector or operational-setting keys.
- Language, Light/Dark/System, immersive effects and sound use independent values. Sound remains OFF by default and no locale/authentication action plays audio. The existing readiness state disables preference controls until browser state is usable.

## Architecture and fallback

`lib/i18n/catalogues.ts`: explicit 131-key English catalogue, typed Traditional Chinese catalogue. `MessageId` is derived from English keys; `zhTW` must provide every key. `lib/i18n/core.ts`: centralized exact parsing, English fallback, literal interpolation and native Intl formatters. `lib/i18n/server.ts`: server-only cookie initialization. `components/i18n/locale.tsx`: small provider, hook, safe text component and working selector. No new localization dependency or remote catalogue/translation request.

Missing/empty known translation falls back to the English message. Unknown IDs produce fixed English “This text is unavailable.”; no untrusted ID is echoed. Development diagnostics are deduplicated/bounded to 32 known IDs or a fixed UNKNOWN_MESSAGE marker and never log values, names, tokens, messages or private content. Normal catalogues are complete; unit fixtures exercise missing-message behavior without deleting runtime translations.

Named `{name}`, `{category}`, `{number}`, `{reference}` interpolation is a single literal replacement. React text rendering escapes data; no HTML catalogue or dangerouslySetInnerHTML. Placeholders must match across both languages. Dynamic user data is preserved, not recursively translated/interpreted.

`formatMoney` preserves **USD** and numerical values; en uses en-US and zh-TW uses zh-TW presentation (e.g. `$1,234.50` vs `US$1,234.50`). There is no conversion or currency-policy change. `formatNumber` uses the chosen locale. `formatTime` uses Asia/Taipei and locale-appropriate calendar presentation; unit tests cover the date boundary. The current slice has no new ordinary-user session timestamp field, so no dates are invented merely to display this helper.

## Coverage — exact boundaries

| Area | Coverage |
| --- | --- |
| Actual `/` homepage | All static headings, hero alt text, CTAs, section labels, empty states, disclosure/footer and money presentation. |
| Shared marketplace toolbar/rail/Explore/account dialog | All static labels, accessible names, close/loading/error/suspension/sign-out text and filtered link captions. Trusted server role/chat-gate decisions are unchanged. |
| `/account` settings and shared account shell | Actual email read-only/status fields, name form and dirty/validation/saving/success/failure/expiry states, security-unavailable explanations, authorized security link and editorial copy. |
| Appearance/language/effects/sound preferences | All labels, options except intentional language autonyms, descriptions and scope disclosure. Language options display English and 繁體中文（台灣） intentionally. |
| `/catalogue` proof | Same reused homepage view and study caption translate as a direct reuse, not a new unrelated feature. |
| Browse | Shared header/preferences translate; body/filter/status/detail content remains English. The English main region and localized header are tagged separately. |
| Account activity, trust/verification, public profiles | Shared shell/header translates; existing data/content remains English, with explicit English content-region language. |
| Login/register/forgot-password, booking/rental/MRT selectors, messages, Support, Admin, announcements/settings | Existing English page content and all backend contracts remain unchanged. Shared marketplace header may translate where present. No full-site bilingual claim. |
| User-generated titles/categories/names/descriptions/reviews, private chat/Support/evidence, historical records, technical IDs/status enums | Never machine-translated or rewritten. A Chinese page can correctly show an English user-authored listing title/category. |

Document root remains English for untranslated routes; scoped localized surfaces/header/form carry `lang=en` or `lang=zh-TW`. Locale is not applied blindly to untranslated operational content. Browser tests verify real Chinese server HTML before JavaScript, correct hydration, keyboard switching and no console hydration errors.

## Typography and review

Retain all R1 palettes, textures, imagery and tactile contract. Use local CJK-capable Noto Serif CJK TC/Noto Serif TC/Songti/PMingLiU and Noto Sans CJK TC/PingFang/Microsoft JhengHei fallbacks; no downloaded/bundled new font. Noto CJK TC is available in the test environment. Chinese headings use upright serif metrics and slightly smaller mobile form titles to avoid cramped single-character wrapping. Latin brand **Hustlen’** remains unchanged; no official Chinese brand name is invented. Finite transitions are disabled only for stable screenshot capture, not in runtime UX tests.

Owner decisions still needed: default/selection policy and persistence, exact locale coverage expansion, glossary and draft translation approval, legal/security wording review, date/calendar/currency display conventions and physical-device/screen-reader acceptance. The implemented candidate is reviewable functionality, not approval to deploy this language policy.
