# Batch 11B — real application screenshots

All captures are unretouched application screenshots against newly owned disposable databases. Listing/name/email data is explicitly synthetic and uses the title **Design fixture**. Original R1 artwork and texture assets are reused unchanged; visual direction remains provisional. No products, ratings, users, availability or transaction counts are fabricated in the real homepage.

| Actual view | Light | Dark |
| --- | --- | --- |
| Homepage — desktop 1440px | [Light](screenshots/homepage-light-desktop.png) | [Dark](screenshots/homepage-dark-desktop.png) |
| Homepage — tablet 820px | [Light](screenshots/homepage-light-tablet.png) | [Dark](screenshots/homepage-dark-tablet.png) |
| Homepage — mobile 390px | [Light](screenshots/homepage-light-mobile.png) | [Dark](screenshots/homepage-dark-mobile.png) |
| Account with shared navigation | [Light](screenshots/account-light-desktop.png) | [Dark](screenshots/account-dark-desktop.png) |

Other actual views:

- [Explore navigation sheet, viewport-sized mobile](screenshots/marketplace-menu-mobile.png).
- [Real Browse with retained station/category filters, dark mobile](screenshots/browse-dark-mobile.png).
- [Optional sound control — existing interaction regression](screenshots/sound-opt-in.png).
- [Keyboard particle frame — existing `/catalogue` interaction regression](screenshots/soil-keyboard-frame.png).

The last two are deliberately labelled `/catalogue` regression views, not substituted homepage screenshots. The homepage test independently exercises actual trusted keyboard particles, optional native audio and closure, independent effects/mute, reduced motion and preference continuity; see [homepage-navigation.json](homepage-navigation.json). The R1 component regression adds pointer/touch/unsupported-audio and focus/outside-dismissal coverage; see [interaction-regression.json](interaction-regression.json).

Desktop home/proof surfaces use the existing heritage rail; smaller screens use Explore instead of a duplicated link row. Other marketplace routes receive the shared toolbar/sheet. The account dialog remains separate and its real logout action is available without reaching behind a modal. Admin navigation is unchanged.

The MRT homepage section links to the existing pickup-station filter. It does not depict a fabricated standalone map, station availability or changed GPS policy. The actual borrower map remains in the existing eligible-listing booking selector and is exercised by browser tests.

Light/dark retain R1's material/typography system. No comprehensive visual redesign or final owner acceptance is claimed. Physical-device/screen-reader/performance and future visual refinement remain in the Stage 9 follow-up plan.
