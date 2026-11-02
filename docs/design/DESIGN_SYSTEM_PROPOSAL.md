# Shared heritage design architecture — proposal for approval

2 November 2026. Documentation only; this does not authorize implementation or declare Stage 9 visual acceptance.

## Ownership

One server-resolved appearance/locale boundary per rendered page, preserving current cookie identifiers, System appearance updates, CSP and authentication. SiteHeader becomes a consumer of that boundary instead of sometimes owning only header preferences. AccountShell and Admin layout consume common tokens with their own density. Avoid nested providers, duplicated preference footers and independent locale resets.

## Reusable shell family

| Shell | Intended use | Deliberate variation |
|---|---|---|
| Catalogue | Home, Browse, detail, Help | Editorial masthead, material rail, controlled photography/engraving |
| Compact authentication | Login/register | Calm narrow form, visible brand and return path; no decorative hero blocking login |
| Transaction | Dashboard, booking, authoring, messaging | Clean controls, ruled records, stage/next-actor hierarchy; restrained texture outside dense evidence |
| Account | Settings, activity, trust | Existing AccountShell editorial reference and contextual index |
| Administration | Existing authorized Admin pages | Dense grouped sidebar/tables; same ink, paper, typography and focus language |

Shells are presentation choices, never permission sources. Do not change routes, server guards, records or operation availability.

## Token authority

Use semantic roles: canvas, raised surface, clean control, inset paper, ink, secondary ink, rule, strong rule, accent, on-accent, focus, danger, warning, success, informational and disabled. Map existing heritage variables incrementally; retire duplicate definitions only after usage inventory and visual review. Keep the approved R1 soil/walnut/olive/brass dark palette and ivory/fiber light palette. No pure-white SaaS reset, metallic gradients, glass or oversized floating panels.

Typography: reuse current locally available Georgia/Times display and Arial/Helvetica supporting roles until separately licensed typography is approved. Editorial headings provide hierarchy; operational numbers, labels, dates and tables remain easy to scan. Establish heading/body/caption scales and line lengths, not one serif treatment for every control.

Materials: reuse original paper-fiber/organic-grain assets with documented provenance. Texture should be visible on canvas, masthead and section dividers, quiet around fields, absent behind QR and dense evidence. Restrained 1px rules, small shared radii and minimal elevation replace repeated large rounded white cards. Preserve fixed parchment editorial insets where contrast is intentional.

Status colors remain semantic across themes. MRT line colors and QR contrast are functional exceptions. Do not recolor all `bg-white` descendants globally; migrate explicit component variants.

## Component vocabulary

- PageFrame and EditorialHeading: breadcrumb/eyebrow, title, concise purpose, relevant action.
- RuledSection and RecordGroup: list/table/detail variants, optional contextual engraving rather than random icons.
- Field/FieldHelp/FieldError: consistent labels, required/optional meaning, described-by errors, appropriate autocomplete, unchanged validation.
- Action: primary/secondary/quiet/danger/loading/disabled; true disabled behavior, not visual opacity alone. No duplicate submissions.
- StatusLabel and StageSummary: readable state plus explanation and next actor; no general status editor.
- Feedback: success/error/empty/loading/not-found/denied/unavailable with live-region semantics, retry/navigation and persistent context.
- Navigation: shared destination labels and current-page indicators, responsive native dialog/menu, proper focus return and Escape/outside/navigation dismissal.
- EvidenceFrame: immutable source/stage/time/authorization labels, clean image surface, original/derivative distinction; no inferred AI findings.

## Interaction and accessibility

Retain existing discovery-only tactile effects and opt-in sound, off by default. Respect reduced motion and independent immersive-effect preference. Avoid decorative delays and effects on auth, security, payments, custody and Admin operations. Target 44px touch controls where practical; test WCAG minimum size/spacing, contrast, focus, zoom, keyboard and screen-reader announcements. Never replace a real readiness condition with sleeps or animations.

## Adoption gates

1. Product owner approves shell/token/state rules against light/dark desktop/mobile examples.
2. Implement a narrow auth + one operational record slice; no broad rewrite.
3. Verify genuine interactions and existing auth/rental/QR/Support/AI regression suites in owned databases.
4. Review before expansion. Preserve all fourteen roadmap stages and unfinished operational/publishing/Support/visual acceptance gates.
