# Editorial foundation — Batch 11A

Implements master Stage 9 under the [mandatory design contract](HUSTLEN_UI_UX_DESIGN_CONTRACT.md). Review candidate only; wider adoption awaits product-owner visual approval.

## Audit and scope

Before implementation: `app/globals.css` had duplicated root backgrounds, Arial body typography and Tailwind v4 inline theme aliases. `app/layout.tsx` loads Geist/Geist Mono but sets slate body utilities; it is unchanged. No Tailwind configuration file or agricultural reference artwork was present; `public/` contained generic Next/Vercel/file/window/globe SVGs. Original approved visual reference assets are unavailable here. This candidate follows the written contract, with original simple botanical linework rather than a claim to reproduce missing artwork.

`components/site-header.tsx` is a reusable authenticated server header; `app/account/layout.tsx` formerly put a basic link row inside a main containing the header. `components/account-settings.tsx` had one display-name PATCH form. Account activity and trust pages already exist; no password-change or language selector is added or represented as implemented. Existing auth/security and rental controls remain authoritative.

Applied slice: `/account`, its local navigation, the account instance of the shared SiteHeader, plus palette compatibility for retained `/account/verification` records. Other marketplace/Admin headers retain their current presentation. Public profiles, listing pages and MRT styling are untouched. Reusable foundation is opt-in via `.catalogue`, not a global dark mode override.

## Token contract

Tokens live in `app/globals.css`, under `.catalogue` and `[data-theme="dark"]`.

| Role | Light | Dark |
| --- | --- | --- |
| paper | `#f3eedf` | `#202b25` |
| clean sheet | `#fcf9f0` | `#28372e` |
| wash/selection | `#e7e9da` | `#303f33` |
| ink | `#293b30` | `#eee9d8` |
| muted ink | `#596455` | `#bdc5b3` |
| rule | `#a5ac96` | `#71816a` |
| action | `#345840` | `#c6d3ad` |
| action foreground | `#fffdf4` | `#203026` |
| focus | `#8d491d` | `#f1c38c` |
| error | `#9a3025` | `#ffb6a1` |

Typography: `--display` Georgia/Times local serifs; `--support` Arial/Helvetica local sans. No new external font dependency. Fluid title 3–5.25rem, section title 1.8–2.5rem, body generally .88–1rem, supporting text .78rem. Small uppercase archival labels are short orientation aids, never primary instructions. Existing root Geist setup remains unchanged.

Material: one self-contained tiled SVG fractal grain overlay at .075 light/.055 dark opacity. Pointer-transparent and behind content; clean sheets/inputs are opaque. Original inline botanical SVG is decorative, `aria-hidden`, inherits action ink and needs no network image request. Grain is for page/editorial paper, not dense inputs or tables. No gradients, distressed edges, marble, glass or gold.

Borders: fine 1px rules, 3px double editorial rules, 3px active index edge, 5px masthead top rule. Control radius 3px, nearly square paper sections. Shadow only a small 0 2px 4px action/dropdown lift. Section spacing uses `clamp(2rem, 5vw, 4rem)`; desktop content max 1280px, 230px index and remaining content column. At 760px, navigation becomes a two-column index above the form. No repeated rounded-card grid.

Interaction: 140ms color/background/border transitions and 1px active-button press. No entrance/parallax effects. Reduced motion disables transitions/animation/smooth scrolling. Forced-colors removes grain and adds a system Highlight active-page outline. Focus is 3px with 4px offset; controls at least 44–48px high. Labels associate explicitly, helper text uses describedby, errors use alert, saves use status, busy/disabled states prevent duplicate submits. Long email/name text wraps. Focus remains visible; skip link targets account content.

## Appearance state

`components/account-shell.tsx` uses `useSyncExternalStore`; safe server snapshot is light. Exact local preference key `hustlen:catalogue-theme` accepts light/dark; it carries no identity or authority. A custom local event and native storage events update mounted instances; listeners are removed on cleanup. Storage failure falls back to an in-memory preference. Existing server HTML and hydration remain consistent. A saved dark preference applies after hydration; a brief initial light appearance remains possible. No blocking inline script or new CSP allowance is added. The switch is a native toggle button with `aria-pressed`.

Do not interpret appearance as a server setting, logged-in identity or authorization. Theme selection currently affects only the account slice. Automatic OS theme selection, full-marketplace rollout and cross-device synchronization are deferred.

## Functional boundary

Display-name update retains `/api/account`, method PATCH, exact `{name}` payload, max 100 characters and server validation. Adds local dirty feedback, clean saving state, visible success/error and retry without losing input. No password/recovery/MFA/language/permissions feature is fabricated. Account APIs, sessions, logout document navigation, booking, Support, geofencing, evidence and Prisma migrations are unchanged.

## Inheritance and visual acceptance

Future approved slices reuse these tokens/components and the same material/typography rules. Admin adaptation should be a separate scoped batch with dense readable surfaces. No global class-name palette replacements. Preserve functional semantic warnings and MRT line colors. Request product-owner review of the actual screenshots before wider adoption; engineering tests do not establish aesthetic acceptance or production readiness.
