# Batch 11D localization coverage and preference contract

English (`en`) and Taiwan Traditional Chinese (`zh-TW`) remain the only identifiers. 11C cookie/SSR initialization, exact fallback, bounded development diagnostics, literal interpolation, independent preferences and storage-disabled behavior are unchanged. No locale routes, duplicate pages, new account locale column or machine translation. This remains a candidate, not an approved full-site bilingual release.

| Surface | Covered | Deliberate exclusions |
| --- | --- | --- |
| Home and `/catalogue` proof | Existing static content, navigation, prices and eight known category display labels | User listing titles, unknown categories, artwork attribution brand/proper names |
| `/listings` Browse | Header, title/create link, search/placeholder, category/status/station labels, raw-valued options, formatted count, empty state, cards, availability, daily price and pickup prefix | Raw title/description/condition, station catalogue names, unknown category values |
| `/listings/[id]` discovery | Back link, public detail labels, exact known category/detail labels, photo/alt text, availability, price/deposit, pickup heading, login and restricted/flagged notices | Raw title/description/condition/owner, detail values and unknown technical keys, existing station names |
| Listing report form | Buttons, reason display labels, optional detail label, busy/success/login/generic failure | Raw report body and exact server reason values; known server errors use exact static mappings; unknown errors use localized generic failure without echoing raw response data |
| Route states | Pending listing links, fixed error/retry and not-found copy | No raw exception rendered; client error boundary safe initial English before browser locale is available; no new streaming loading boundary |
| Account personal details | All 11C coverage preserved, including real saves, retained drafts, errors and expiry | No new password/email/security capability |
| Account activity/trust | Existing shared bilingual navigation/preferences, responsive shell, selected-page state, visible bilingual boundary notice | Own historical events, dates (existing UTC), trust body/review records stay English and `lang=en`; no new data selector or transformation |
| Rental quotation/station picker and private chat entry on listing | Bilingual notice clearly identifies English transactional workflow; preserved draft across discovery-language changes | Workflow labels, API validation, station-map controls and private chat remain English within `lang=en`; no divergent rental implementation |
| Other pages | Existing translated shared shell where already integrated | Login/register/recovery, listing create/edit, dashboards, booking/rental records, Support, Admin, announcements/settings, operational/legal content remain English |

## Data semantics

Category display lookup is exact and own-property checked against the eight creation identifiers, not a database rewrite. Unknown case/alias/prototype-like category/detail strings remain literal escaped text. Filters submit/compare original category/status/station values. Search retains original title/description/category matching and additionally matches the chosen known-category display label. Prices use existing USD formatting with unchanged decimals; no authoritative currency column or conversion exists. Production currency approval remains open. Dates and bookings are untouched.

Locale selection never navigates/refreshes the form. Context updates text and attributes in place, preserving Browse filter state and existing rental/account drafts. Reload follows the server cookie. Invalid cookie/category selectors fall back to English/all eligible categories. Appearance/sound/effects remain independent; sound OFF default, existing reduced-motion suppression, no new tactile effects on reports/security/rental actions.

## Quality and accessibility review boundary

Use local CJK typography and existing R1 material tokens. Explicit accessible filter names avoid option text contaminating exact label lookup; raw option values remain stable. Existing native account/Explore dialogs retain Escape/outside/navigation dismissal and focus return. New progress status is pointer-transparent and fixed-position, without layout shift, timers or loops. No new animation dependency, asset, font download or continuous simulation. Error UI contains only fixed messages, not server error text. Public raw content is rendered as React text.

Desktop/tablet/mobile screenshots and actual keyboard navigation are evidence for this slice. They do not replace Taiwan-native language review, manual contrast/zoom/high-contrast/screen-reader acceptance, Safari and physical-device testing, FPS or production Core Web Vitals. R1 visual approval remains pending. Glossary/default locale/persistence and security/legal wording still need product review. No stage is declared Production Ready.
