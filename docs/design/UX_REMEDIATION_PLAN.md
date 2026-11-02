# UI/UX remediation plan — awaiting owner approval

Audit baseline `c136dc9a355138ea306faa41dd95514524d0fc87`; 2 November 2026. No UI work is authorized by this document.

| Priority / batch | Problem and scope | Acceptance / evidence | Risk / guard |
|---|---|---|---|
| P0 confirmed defect | Dark mobile MRT dialog title/help/result contrast; `components/mrt/MRTStationSelector.tsx`, `components/mrt/map.css`, heritage cascade. | Legible title, guidance, results, selected/disabled controls in both themes and all widths; preserve functional map colors and station availability. Compare supplied dark-mobile evidence. | Medium: narrowly scoped tokens; no station data or policy changes. |
| P0 foundation | Resolve U01–U03 theme ownership and token authority; define shell-consistent error/loading/denied states U10. P0 means prerequisite, not a claim of a newly proven security defect. | Owner approves light/dark shell/state examples; no dark header/light body accident; no provider duplication or locale reset; keyboard focus and text contrast checked. | Medium: inheritance can affect every control. Start one slice; retain CSP, System theme and hydration readiness. |
| P1 auth/authoring | U04–U05 login/register/new/edit consistency and wayfinding. | Real login, invalid credentials, field errors, native create/edit, loading and disabled feedback at 390/820/1440; same existing data/validation. | Medium: never alter auth/session policy or listing publication requirements. |
| P1 rental clarity | U06 dashboard/booking shared records, action hierarchy, pickup/return/inspection distinctions. | Owner/borrower each identify next actor and permitted action; returned item remains returned during dispute; all QR/camera/consent/evidence suites pass unchanged. | High regression sensitivity: presentation only, bounded components, no lifecycle restructuring. |
| P1 account/trust/private states | U07–U08 child record styles, truthful security availability and currently disabled messaging/Support states. | Both themes and mobile; no fabricated identity, enrollment, human assignment or delivery. Existing private access tests remain green. | Medium: no enabling hidden features for visual convenience. |
| P1 Admin | U09 reuse grouped sidebar/Workbench; adapt common materials/type/status/focus at operational density. | Existing routes, permissions, reports/disputes/reviewer controls and audit visibility preserved; tables usable on mobile. | High sensitivity: no roles, grants, approvals or new actions. |
| P2 refinement | U11–U12 terminology, touch areas, map functional islands, spacing, ornament/illustration placement and reduced-motion polish. | Native dialog focus/dismissal, 200% zoom, target spacing and screen-reader review; functional line colors/QR legibility preserved. | Low to medium; no unnecessary effects or global navigation rewrite. |

## Required review gates for each implementation

- Explicit approved scope; changed-file inventory; no database/migration/authorization changes disguised as UI cleanup.
- Before/after real screenshots in both themes at all three widths, including relevant populated/empty/loading/error/focus/disabled states.
- Genuine keyboard/touch/navigation checks, form submission and server-confirmed feedback. No success fabricated for screenshots.
- Relevant unit/TypeScript/lint/normal build; original integration/login/rental/Admin/Support and genuine virtual-camera pickup/return tests where affected. Owned disposable databases only. Keep initial failures and reruns distinct.
- Product-owner aesthetic review. Passing CI is not visual acceptance or production activation.

## Not in this plan

No changes to station coordinates, geofencing, custody, immutable evidence, financial rules, staff authority, AI providers or translation activation. Stage 6 station controls, Stage 7 Support production policies, Stage 8 publishing/settings approvals and Stage 9 visual acceptance remain open as already tracked. Preserve the canonical roadmap; this is a prioritized design remediation plan, not a replacement roadmap.
