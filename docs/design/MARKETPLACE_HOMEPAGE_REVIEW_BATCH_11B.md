# Hustlen’ — Batch 11B independent review

**Master Stage 9 — Account Settings & User Experience. Provisional R1 appearance retained; final visual acceptance is pending.**

- Branch: `feature/marketplace-home-navigation-batch-11b`
- Verified R1 implementation: `95238a58be48730956eb25087353e1e82f146fd2`
- Verified R1 evidence closeout: `42db04a18a8252a266074cd26408ebf23e5e7cf8`
- Actual starting review HEAD: `97722d12e4aef0d3fd0b1654f32d8230210d1d85`, clean working tree, both commits confirmed ancestors.
- Tested 11B implementation: **`5d7101a84c2944d0ad69c4a1e4659fa0af774ce1`**.
- Separate evidence closeout: **`d21ebf194f09a610041398d04cc55a6dc4000e7a`**.
- This final report is a documentation-only successor of the evidence closeout. No merge, push, deploy or existing application database modification.

## Result and audit

The actual `/` homepage now uses the provisional R1 agricultural catalogue composition and materials, with real eligible categories/listings, functional Browse/category/detail paths, existing MRT pickup-station discovery and current account/rental navigation. `/catalogue` remains an explicitly labelled design study and shares the same server composition/read model. No second aesthetic system, new artwork, animation engine or fictional marketplace metrics were introduced.

The [pre-change homepage/navigation audit](batch11b/HOMEPAGE_NAVIGATION_AUDIT.md) identifies existing functionality and exact source references before integration. The canonical roadmap, mandatory design contract and complete R1 foundation were reviewed. The product owner's authorization here permits this narrow integration while the visual system remains provisional; it is not final design approval or permission for a comprehensive redesign.

## Real homepage and data contract

`components/marketplace/home.tsx` supplies the reused hero, actual category plates, recent records, MRT entry and existing-flow narrative. `lib/marketplace/discovery.ts` is a server-only public projection with exactly two discovery queries: up to twelve categories and four recent listing records. Predicates remain ACTIVE listing, no Admin restriction, ACTIVE owner and PHOTO media. List ordering adds a deterministic ID tie-break; no per-card database query or private participant/evidence projection.

Homepage categories target `/listings?category=<eligible value>#marketplace-filters`. `app/listings/page.tsx` validates the initial category against its actual eligible categories; unknown/array selectors fall back to ALL. `ListingsBrowser` retains existing search/category/status/station filtering and availability calculation. Explicit category URL navigation keys the consumer so it cannot retain an unrelated stale category. Manual filters otherwise retain their existing local behavior; this does not claim a full URL-state system.

Real listing IDs link to unchanged detail/booking routes. Home says **Recent listings**, not guaranteed immediate rental availability. Existing Browse/detail status and booking eligibility remain authoritative. No products, ratings, user/booking counts or station availability are invented. With no eligible data, honest empty states appear. Screenshot records are clearly named **Design fixture**, created only in owned disposable databases, with original R1 fixture illustration media.

The R1 proof's NT$ display conflicted with existing Browse/detail USD formatting. Shared home/proof cards now preserve the existing USD display convention and unchanged stored amounts; no currency conversion, pricing computation, payment or financial-policy change. Currency/localization decisions remain separate.

## Shared navigation and MRT entry points

Public navigation uses fixed implemented destinations: Home, Browse, Categories, MRT pickup stations and Customer service. Desktop home/proof uses the heritage rail; below 1100px it is replaced by Explore's native sheet, without a duplicated visible link row. Other marketplace routes use the shared toolbar/Explore sheet. Native dialogs reuse R1's close/Escape/outside/link dismissal, focus wrapping/restoration and active-page states, with unique heading IDs.

Authenticated account destinations remain Dashboard, own public profile, Account Settings, Activity logs, My listings, My borrowings and Trust/verification. Messages is shown only through existing `chatAvailable(currentUser.id)`; Admin Desktop still uses server-resolved legacy ADMIN. No UI link grants authority. Anonymous users receive actual Log in/Sign up links. Appearance & sound targets real home preferences.

Logout still uses the unchanged real LogoutButton/API/session invalidation and full document navigation. It is available inside the account sheet as well as normal chrome; the outside control is hidden while a sheet is open. The strict meetup-session suite verifies actual modal logout and delayed-response protection. No protected API or custody/evidence logic changes.

There is **no standalone public MRT map route** in the repository. The home MRT section honestly targets Browse's existing pickup-station filter. The actual interactive map remains in the existing listing/booking station selectors; the new browser suite opens the eligible listing's borrower map and closes it normally. No station coordinates, operation policy, GPS simulation or station safety/availability claims change.

The Admin Control Center keeps its separate navigation and density. Non-shell legacy detail/rental/messages/Support content retains its existing presentation; only shared header chrome changes there. This is not a claim of complete marketplace or Admin theming.

## Themes, interactions and the narrow preference correction

Home, Browse, `/catalogue` and Account share R1's Light/Dark/System, server appearance initialization, local sound/motion preferences and original material assets. Header-only providers preserve the same preference on existing operational screens without wrapping/restyling their content. All R1 art/discovery interaction functions remain byte-identical; only the provider's header-only/readiness presentation and shared menu options are extended.

The stronger cross-document test exposed a preference-restoration edge: server-rendered sound OFF could become persisted ON during a redundant checkbox check. Nonessential Appearance, Immersive effects and Discovery sound controls now remain disabled/aria-busy until browser preference snapshots are ready. The test asserts the restored values rather than toggling a preference already selected. **Navigation, saving, booking, login and authentication transitions are not delayed.** Real JavaScript-disabled browsing verifies these preference controls remain unavailable while native category links still work.

Actual homepage interaction tests verify nine keyboard specks and cleanup, opt-in native audio/context closure, independent effects/mute, reduced motion, no sound from opt-in alone, and nondefault preferences shared both through Account navigation and subsequent document loads. The R1 suite additionally preserves pointer/touch, audio/storage fallback, live System changes, server-saved Dark, native sheet focus/outside dismissal and no autoplay after persisted sound opt-in.

The first local-only theme preference migration can still briefly mismatch server appearance; R1's existing limitation is retained. No unsafe inline script, CSP weakening, password/MFA/session issuance/recovery change or security-sensitive sound handler was added.

## Visual evidence, performance and accessibility

**[Independent gallery](batch11b/gallery.html)** · [Full screenshot index](batch11b/SCREENSHOTS.md).

- [Homepage light desktop](batch11b/screenshots/homepage-light-desktop.png) / [dark desktop](batch11b/screenshots/homepage-dark-desktop.png).
- [Light tablet](batch11b/screenshots/homepage-light-tablet.png) / [dark tablet](batch11b/screenshots/homepage-dark-tablet.png).
- [Light mobile](batch11b/screenshots/homepage-light-mobile.png) / [dark mobile](batch11b/screenshots/homepage-dark-mobile.png).
- [Mobile Explore sheet](batch11b/screenshots/marketplace-menu-mobile.png), [real Browse filters](batch11b/screenshots/browse-dark-mobile.png).
- [Account light](batch11b/screenshots/account-light-desktop.png) / [dark](batch11b/screenshots/account-dark-desktop.png).

Images are unretouched real app captures with explicitly synthetic fixtures. The separate sound/particle regression screenshots are accurately labelled `/catalogue`; the homepage's actual effects are independently exercised and recorded in [homepage-navigation.json](batch11b/homepage-navigation.json). No screenshot substitution implies a different route was tested.

[Performance/accessibility checks](batch11b/performance-accessibility.json): all seven original public art assets remain hash-identical and under 500KB total, with no new runtime dependency/library. Fixed hero/image geometry and aspect ratios reserve space. Two bounded home discovery queries replace duplicated implementations; no per-card queries. Existing full Browse scalability is retained, not claimed solved. At 1440/820/390 widths, real browser navigation, no overflow, labelled controls, active routes, touch-sized targets, focus/dismissal, reduced motion and preference continuity pass. Browse semantic status badge colors and official MRT line distinctions are preserved.

Engineering/browser checks are not low-end-device FPS/LCP/CLS benchmarks, full screen-reader/zoom/Safari/iOS certification, subjective sound acceptance or owner visual approval. Those remain Stage 9 follow-up. Current identity is meaningful but provisional, not permanently approved.

## Selected regression ledger — actual outcomes

All **24 final selected command groups passed**, plus 90 unit tests, TypeScript, lint and Prisma validation. This is a selected ledger, not every repository suite or a first-attempt-clean claim. All changing tests used fresh owned disposable databases and confirmed cleanup. Initial new-test failures are retained below.

| Command | Actual final result | Owned artifact |
| --- | --- | --- |
| `npm run test:homepage` | 1 passed; cleanup confirmed | `.test-artifacts/ea4dfe0e30e7193812938dde` |
| `npm run test:account-design` | 1 passed; cleanup confirmed | `.test-artifacts/cea35f7bdae97c4261e9d264` |
| `npm run test:heritage-ui` | 1 passed; cleanup confirmed | `.test-artifacts/227a5810300ddc11f7618c31` |
| `npm run test:integration` | exit 0; cleanup confirmed | `.test-artifacts/f6e36aec402c1256f506edab` |
| `npm run test:meetup-session` | 6 passed; cleanup confirmed | `.test-artifacts/78d0fed92876dfdff171df5c` |
| `npm run test:meetup` | 11 passed; cleanup confirmed | `.test-artifacts/98a50eea102d0c2ed09eba71` |
| `npm run test:admin` | 7 passed; cleanup confirmed | `.test-artifacts/f70298602238147b11b0acb4` |
| `npm run test:rental-api` | 13 passed; cleanup confirmed | `.test-artifacts/b73ec6ff1db3f9a9986f1139` |
| `npm run test:rental-browser` | 4 passed; cleanup confirmed | `.test-artifacts/b69ae4748d4f3957294a3977` |
| `npm run test:chat` | 14 passed; cleanup confirmed | `.test-artifacts/95acadd60fc61f1ac0326b40` |
| `npm run test:support-channels` | 9 passed; cleanup confirmed | `.test-artifacts/8af9bdb00308104e179d35ab` |
| `npm run test:support-staff` | 14 passed; cleanup confirmed | `.test-artifacts/0fb7f815294eba24863e2f6b` |
| `npm run test:authorization` | 8 passed; cleanup confirmed | `.test-artifacts/7ce4bfad30617f24abf7a92b` |
| `npm run test:staff-session` | 13 passed; cleanup confirmed | `.test-artifacts/d40cc36109739703786c42df` |
| `npm run test:mfa` | 16 passed; cleanup confirmed | `.test-artifacts/675b5084cdbecf3f84261d98` |
| `npm run test:announcements` | 9 passed; cleanup confirmed | `.test-artifacts/b765e7c0f9a3ffbd67937f42` |
| `npm run test:platform-settings` | 8 passed; cleanup confirmed | `.test-artifacts/96da2470d8e3cdf002f6fba0` |
| `npm run test:locations` | 7 passed; cleanup confirmed | `.test-artifacts/d84f74b8fa5614ee7b6260a9` |
| `npm run test:workbench` | 7 passed; cleanup confirmed | `.test-artifacts/be7c6b365e9586a33cba889a` |
| `npm run test:mvp` | 11 passed; cleanup confirmed | `.test-artifacts/c82f5606c409e13c16df70ec` |
| `npm run test:moderation` | 10 passed; cleanup confirmed | `.test-artifacts/42b93ecef966e875adcb97d1` |
| `npm run test:login-navigation` | 7 passed; cleanup confirmed | `.test-artifacts/c1635724ab8a561075e686ba` |
| `npm run test:login-readiness` | 1 passed; cleanup confirmed | `.test-artifacts/0672087c5929ddf2f693fefe` |
| `npm run build:verify` | exit 0; cleanup confirmed | `.test-artifacts/24acd6aed0ecc9e3ba7928be` |

| Static/unit command | Actual result |
| --- | --- |
| `npm run test:unit` | 90/90 |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npx prisma validate` | valid schema, exit 0 |
| `git diff --check` | clean |

[Full machine-readable ledger](batch11b/verification.json). Original `test:integration` remains strict. The six-node meetup-session suite confirms logout invalidation, denied protected access, cancellation/navigation cleanup, no protected-content resurrection and unexpected-401 detection. Full meetup is **11/11**, with genuine virtual-camera pickup and return decoding: [pickup evidence](batch11b/camera-pickup.json), [return evidence](batch11b/camera-return.json). No manual-code substitution, assertion timeout relaxation or camera/GPS/consent/evidence/custody weakening.

## Initial failures and login timing follow-up

[Initial outcomes](batch11b/initial-outcomes.json) are separate from final successes:

1. The first homepage test's exact implicit-label locator did not match a select whose accessible combobox already showed Cameras and one result. Targeted the actual combobox name; retained the expected value and original deadline.
2. The stronger cross-page sound check raced server OFF/persisted ON restoration. Added the narrow nonessential preference-control readiness state and asserted restored values; no auth/navigation delay. The real server-rendered/no-JavaScript test proves the pending-state contract.
3. The deliberately JavaScript-disabled browser correctly blocked two development HMR scripts. The normal browser collector remains unchanged and strictly empty. Only this explicit negative fixture uses a separate bucket accepting up to two exact development-HMR GET paths with `csp` reason; every other diagnostic still fails. No global console/network/401 suppression or CSP change.

The existing **five-second login-readiness assertion** passed in a fresh quiet serial run after the other browser workloads, including delayed hydration and six repeated browser logins. [Current follow-up evidence](batch11b/login-readiness-follow-up.json). The [R1 overlapping-workload failure](batch11a-r1/login-timing.json) remains tracked: **its root cause is not established or fixed by 11B**. A serial pass is not causal closure. Auth/login/session implementations and existing deadlines remain unchanged.

## Preservation and cleanup

[Preservation proof](batch11b/preservation.json): **1,102** preexisting protected files byte-identical, including all APIs/auth/session/logout, booking/QR/GPS/camera/consent/evidence, Admin navigation, staff/MFA/approval, Support, announcements/settings services; real account editing; MRT selectors/catalogue/coordinates; all original tests/assertions and the global browser collector; public artwork, lockfile and historical evidence. R1 artwork/discovery function suffix is byte-identical. Prisma schema and all **28 historical migrations** are unchanged; there is no new migration. Existing databases were not reset, migrated, seeded or modified.

[Read-only effective-target cleanup check](batch11b/cleanup.json): zero owned 11B databases and zero owned test principals remaining. The harness removed owned uploads. [Cache cleanup](batch11b/cache-cleanup.json) removed generated build caches only from completed successful owned runs, retaining diagnostics and screenshots. No existing historical records/evidence were removed. Test identities were synthetic; no actual staff or production feature was activated.

## Roadmap, follow-up and review boundary

The canonical [14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) preserves every stage name/order/objective. Stage 9 remains **In Progress**, with provisional R1 direction and scoped 11B integration. Stage 6 station controls, Stage 7 Support production policies/activation and Stage 8 publishing/settings approvals remain explicit and their entire sections unchanged.

[Concrete remaining Stage 9 proposal](batch11b/STAGE_9_FOLLOW_UP.md): read-only profile/password-flow audit first; product approval for English/Traditional Chinese locale identifiers/default/preference/explicit fallback/content ownership; then one typed message-catalog vertical slice. No fake language selector or full-localization claim. Continue bounded account-screen consistency, real-device/accessibility/performance/listening review and future owner-directed visual refinements. Address recurring login timing separately without raising deadlines. Do not bundle recovery, mandatory MFA, staff activation or operational-policy changes.

[Complete changed-file inventory](batch11b/changed-files.txt): **48 files**, including source, tests, audit/follow-up and real screenshots. No merge, push, deploy, production Support/publishing/settings activation, station mutation, staff provisioning, high-risk execution, payments or AI. Stop here for independent review.
