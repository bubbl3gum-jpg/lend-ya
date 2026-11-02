# UX consolidation report

2 November 2026. Scoped reuse of the existing Balanced Agricultural Luxury system, not another design direction or whole-site visual acceptance.

## Navigation map and reachability

- Home `/` → real discovery/categories and recent eligible listings.
- Browse `/listings` → query/category/station filters → `/listings/[id]` → authorized booking request.
- **List an item** `/listings/new` → existing native auth redirect if anonymous → owner form. New primary entry; no new publication rules.
- **My rentals** `/dashboard` → owned listings / borrowings / bookings → `/bookings/[id]` → state-specific existing actions. New primary label points to existing combined dashboard; no invented dedicated route.
- Categories `/#discovery` and MRT `/listings#marketplace-filters` retained. Station selection still uses the integrated modal, not another map page/service.
- Messages appears only when the current user's existing chat gate permits it; Account keeps profile/history/settings, logout and exact legacy Admin link.
- Help `/customer-service` → planning, rental stage, report/dispute guidance. Ticket links appear only after existing owned candidate check; no developer-panel link.
- Admin `/admin` remains its own authenticated ACTIVE legacy workspace with grouped operations/community/system navigation. Reviewer evidence checks remain additional, not bypassed by the menu.
- `/dev/*`, passkey pilot, Lab, AI/translation/Vision and staff interfaces deliberately remain gated/hidden. `/catalogue` is the retained earlier design study, not a second booking engine; it does not need a new public menu item.

## Before / after

Before: new-listing and combined rental journey were discoverable mainly through secondary/dashboard paths; Help used independent white rounded cards and gave little explanation of return receipt versus inspection or experimental AI. CI did not include pushes to the named consolidation branch.

After: existing primary desktop/rail/mobile sheet registry adds List an item/My rentals while preserving all old categories/MRT/Help links. Two typed locale keys preserve English/Traditional Chinese navigation. Help reuses HeritageSurface, HeritageSection and EditorialHeading with server-resolved appearance/locale, paper/soil surfaces, existing textures, local typography, fine rules and a responsive two-column/one-column flow. No new particles, sound, assets, animation engine or provider call. Operational body is explicitly English. Skip link, main focus target and existing modal Escape/focus restoration retained. Server-side ticket condition is unchanged.

Changed sources: `lib/marketplace/navigation.ts`, `lib/i18n/catalogues.ts`, `app/customer-service/page.tsx`; `app/heritage.css` adds only scoped Help heading/secondary ink rules; shared primitives and permissions untouched. Browser coverage extends existing homepage test with actual anonymous auth redirects from both new entries, desktop/tablet/mobile light/dark Help screenshots, no horizontal overflow, no public dev/ticket links, mobile Escape/focus and real menu navigation. No relaxed deadlines or browser-error suppression.

## Visual acceptance and remaining gaps

Fresh screenshots and test outcome are linked from COMPLETE_TEST_REPORT.md and `consolidation-20261102/screenshots/` when captured. They show real application rendering over synthetic fixtures, not genuine Qwen or physical device evidence. Previously committed screenshots are historical, never a current pass. Texture/typography inherited; controls remain clean. Full contrast/WCAG, screen-reader/native mobile and product-owner visual acceptance remain pending. Admin, messaging and booking still contain legacy surfaces; this scoped consolidation does not claim those screens are restyled. Mandatory security/booking actions remain explicit and unautomated.

Final review additionally corrected Help title scale and fixed-parchment secondary ink after inspecting the first mobile dark capture. The initial capture is retained as such; no claim of product-owner approval.

Final application captures: [desktop/light](consolidation-20261102/screenshots/help-light-desktop.png), [desktop/dark](consolidation-20261102/screenshots/help-dark-desktop.png), [tablet/light](consolidation-20261102/screenshots/help-light-tablet.png), [tablet/dark](consolidation-20261102/screenshots/help-dark-tablet.png), [mobile/light](consolidation-20261102/screenshots/help-light-mobile.png), [mobile/dark](consolidation-20261102/screenshots/help-dark-mobile.png), [mobile menu](consolidation-20261102/screenshots/marketplace-menu-mobile.png). Mobile dark was visually inspected. Final test also measures actual action foreground/background contrast≥4.5 and touch height≥44px in all six configurations; that is not a whole-page accessibility certification.
