# Material & interaction foundation — Batch 11A-R1

Stage 9; extends the mandatory [design contract](HUSTLEN_UI_UX_DESIGN_CONTRACT.md). Original Batch 11A was functional but **not visually accepted**. Its audit remains historical evidence, not the current art direction. The owner-supplied homepage reference is now available in `batch11a-r1/reference/owner-homepage.jpg`, for review only. It is not a screenshot of implemented functionality, nor a production asset.

## Audit and adoption boundary

The existing homepage (`app/page.tsx`) selects three eligible recent photo listings; browse (`app/listings/page.tsx`) selects eligible listings and derives categories/stations, with client-side search/filtering. Eligibility requires ACTIVE listing, no Admin restriction, ACTIVE owner and a PHOTO. Existing listing, booking, MRT, account and Admin routes remain authoritative. Header visibility continues to use the existing authenticated user and Chat availability rules.

R1 keeps the existing homepage and browse architecture, adding a labelled link to `/catalogue`, a read-only marketplace design study with the same eligibility predicates. It queries up to twelve eligible real categories and four recent eligible records, filtering only an exact category from that eligible set. Unknown selectors revert to the eligible all-category view. It exposes no new mutation, operational setting or private profile fields. Synthetic listing fixtures in screenshots are clearly named **Design fixture**, inserted only by the owned test harness. No fictional ratings, delivery counts or transactions appear.

Account Settings preserves its real name PATCH. The account and catalogue roots opt into `HeritageSurface`; unrelated marketplace, booking/map and Admin layouts retain their existing UI. The shared server header exposes a heritage variant without changing its legacy variant or authorization decisions. The product owner must approve this visual direction before wider adoption.

## Materials and typography

`app/heritage.css` is a scoped extension to the original `app/globals.css` foundation; import order is explicit in the existing root layout. No global theme replacement.

| Token | Light | Dark / System-dark |
| --- | --- | --- |
| paper | `#e8dfcb` cream archival paper | `#191812` dark soil/charcoal |
| sheet | `#f7efdd` warm ivory | `#29261e` walnut publication surface |
| wash | `#dcd2b9` parchment | `#3c3628` warm timber |
| ink | `#342e25` rich warm ink | `#eee1c6` aged ivory |
| muted ink | `#675844` earth ink | `#c6b797` warm muted ink |
| rule | `#9c8665` archival brown | `#8f7c59` muted brass |
| action | `#4c5437` agricultural olive | `#cba56b` matte antique brass |
| action ink | `#fff6df` | `#211c14` |
| focus | `#8c461d` | `#f0c086` |
| error | `#962f23` | `#ffbca3` |
| brass illustration ink | `#8a632d` | `#c9a46c` |

Shared publication rail: walnut `#332d23` light / soil `#211f17` dark, warm foreground `#e9dcc0`. Parchment editorial inset stays `#e7d6b6` with dark earth text in both modes. This is an intentional print insert, not a generic white card.

Georgia/Times display typography remains local and uses italic editorial titles; Arial/Helvetica supports operational text. Header brand includes an original engraved wheat mark and small running motto. Desktop uses asymmetrical secondary rails, numbered catalogue plates, fine/double archival borders and controlled density. Textures are actual small raster assets, not practically invisible CSS gradients: organic grain across suitable paper/soil areas and finer transparent fibers on print surfaces. Inputs remain opaque, high-contrast sheets. There is no fake marble, grunge, metallic gradient, glass or heavy floating-panel shadow. The hero's dark transparency gradient serves text legibility, not gold decoration.

See [asset provenance](batch11a-r1/ASSETS.md) for all original artwork, source hashes, sizes and reference limitations. No supplied reference pixels were reused in public artwork.

## Shared primitives

- `HeritageSurface`: scoped texture/theme root and single shared appearance/effects/sound preference location.
- `HeritageSection`, `EditorialHeading`: parchment sections and numbered editorial hierarchy.
- `WheatMark`, `ObjectEngraving`: original code-drawn botanical and object plates; generated engraved plates supplement meaningful category imagery.
- `DiscoveryLink`: real Next links with event-driven particles and optional sound. Only intentional category/discovery uses are wired. Navigation is never prevented or delayed.
- `heritage-press`: restrained form press, ink/border feedback and decorative success seal. No particles or audio are attached to saving, authentication or security actions.
- `HeritageAccountMenu`: native modal dialog with explicit label, close control, Escape/outside dismissal, bounded keyboard wrapping, active-route state and focus restoration. Link activation closes before real navigation. Mobile is a deliberate viewport sheet with scrollable contents, not an awkward floating dropdown.

## Tactile contract

“Sowing → Cultivating → Harvesting → Sharing” is an interaction metaphor, not a game mechanic or a new rental state machine.

- Sowing: selected discovery links emit exactly nine fine earth/brass specks at the pointer or keyboard-centred activation point; 420ms transform/opacity animation, modest direction/size variation, removed after 460ms.
- Cultivating: a 2px lift of a category engraving on hover/focus and small material/border changes; no large scaling or floating cards.
- Harvesting: real successful profile save gets the existing exact textual confirmation plus a tiny decorative seal; press travel at most 2px, no invented save success.
- Sharing: real links lead to eligible category records and existing item/rental flows. The parchment end section tells the actual broad flow without replacing verification requirements.
- One limited 300ms, 5px editorial reveal is used for the end section; no paragraph-by-paragraph or core-form delay.

Particles are pointer-transparent, absolute-positioned and nonessential. There is no requestAnimationFrame simulation or animation/game dependency. At most nine temporary nodes per activated control; a repeated activation replaces the burst and timer. Timer/listener/audio cleanup occurs on unmount. Reduced motion is checked at activation and in CSS, including a live media-query change. `Immersive effects` turns particles/reveals/decorative movement off separately from ordinary functional focus/state feedback. Focus and text remain usable when all effects are off.

## Original optional sound

`Discovery sound` is OFF by default and stored under the nonsensitive local key `hustlen:sound`. No database/account field, credential or server policy is involved. One shared key/control works across both heritage roots and same-origin tabs. Sound starts only in a trusted discovery click/key activation, never at mount, opt-in, focus, save, password/security or routine navigation. Re-enabling sound does not play a preview automatically.

Native Web Audio synthesizes 110ms of short decaying noise, bandpass 850Hz/Q .7, low gain .045, stops by 120ms and closes the context at 180ms. Each link replaces/closes its previous active context; unmount clears timers and closes audio. Unsupported/blocked audio fails silently as optional sensory enhancement while the real navigation proceeds. Motion and sound are independent preferences. No Minecraft/game audio or external recordings were used. The optional offline WAV review sample is an original filtered-noise approximation of the same family; runtime noise is stochastic, not a bit-identical recording. Human listening on phone/speaker/headphones remains part of product review.

## Appearance and first paint

Exact Light, Dark and System options. System is resolved in CSS via `prefers-color-scheme`, including changes on an already open page. A nonsensitive, allowlisted `hustlen_appearance` cookie lets the server emit the saved mode on subsequent HTML responses. The client writes only light/dark/system; the server rejects other values to System. Cookie is SameSite=Lax, path `/`, one-year expiry, Secure on HTTPS, and grants no authority. No custom inline bootstrap, CSP relaxation, auth cookie or session code change.

Old local-only Batch 11A preferences migrate to the appearance cookie after hydration; the first migration visit can still have a brief mismatch. Subsequently saved preferences render on the server. System mode needs no script to select dark/light at first paint. Local storage failure retains nonessential preferences in memory for the current document; persistence cannot be guaranteed when storage/cookies are blocked.

## Acceptance boundary

Real browser tests and screenshots assess the actual routes and a known synthetic dataset. Asset budgets, bounded nodes/timers/audio and token contrast are engineering checks, not proof of low-end hardware performance, complete WCAG conformance or aesthetic approval. The full comparison/checklist and actual selected regression outcomes belong in the R1 review report. Stage 9 remains In Progress; unfinished Stages 6–8 and all production activation restrictions remain unchanged.
