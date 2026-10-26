# Batch 11A real application screenshots

Captured by `npm run test:account-design` against a fresh owned disposable database. Email addresses/names are synthetic test fixtures. Screenshots are unretouched; the small Next development indicator is visible. The account save and logout use real server routes. An explicit transport-outage fixture is used only for the error-state screenshot, never to fabricate authorization or a successful save.

| View | Screenshot |
| --- | --- |
| Light Account Settings and shared masthead, desktop 1440px | [Light desktop](screenshots/account-light-desktop.png) |
| Dark Account Settings and shared masthead, desktop 1440px | [Dark desktop](screenshots/account-dark-desktop.png) |
| Light tablet 820px | [Light tablet](screenshots/account-light-tablet.png) |
| Dark tablet 820px | [Dark tablet](screenshots/account-dark-tablet.png) |
| Light mobile 390px | [Light mobile](screenshots/account-light-mobile.png) |
| Dark mobile 390px | [Dark mobile](screenshots/account-dark-mobile.png) |
| Open mobile account menu | [Mobile navigation](screenshots/account-mobile-navigation.png) |
| Focused field and unsaved state | [Keyboard focus / dirty state](screenshots/account-focused-unsaved.png) |
| Save outage, retained input and error | [Error state](screenshots/account-save-error.png) |

The desktop/mobile full-page captures include the textured editorial botanical section below the functional form. This is the representative material/illustration evidence, not a separate mockup. Both desktop theme captures include the real shared header in its opt-in account appearance. Dark desktop also captures visible keyboard focus on the theme toggle.

Editorial architecture: the masthead and running header precede a generous serif title, double rule, narrow numbered index and wider ruled form. The footer forms a quiet colophon. The botanical end section sits on grain-bearing paper while dense form controls stay on an opaque clean sheet. Dark mode uses the same composition and material system with forest ink surfaces and warm foregrounds.

## Product-owner visual review — pending

| Required check | Candidate evidence and remaining acceptance |
| --- | --- |
| Premium agricultural catalogue, not SaaS | Masthead, running title, asymmetrical index, serif hierarchy, ruled records and botanical colophon. Product-owner aesthetic acceptance pending. |
| Visible controlled texture | A single reusable grain field is visible on paper/editorial areas; solid control surfaces preserve reading. Review preferred intensity. |
| Readable forms and controls | Real saved/failed/dirty states, explicit labels, high-contrast ink, clean fields and 44–48px interactive targets. |
| Dark identity retained | Same layout, typography, grain and linework; forest surfaces rather than generic black/gray. |
| Typography/material consistency | Same scoped tokens apply throughout the account shell, form, menu and editorial section. |
| Subtle responsive interaction | Native keyboard toggles, 140ms color changes, tactile button, no entrance/parallax motion; reduced motion respected. |
| Accessible across sizes | Browser coverage at 1440/820/390, no horizontal overflow, keyboard focus, active section semantics, readable wrapping and error recovery. Complete screen-reader/accessibility review remains outstanding. |

Original approved reference artwork was unavailable in this workspace; this direction follows the mandatory written contract. These screenshots are an engineering candidate for visual review, not product-owner approval or evidence of a full-marketplace redesign.
