# Hustlen’ — Batch 11A-R1 visual and UX review

**Stage 9 — Account Settings & User Experience. Product-owner visual acceptance remains pending.**

- Branch: `feature/agricultural-luxury-r1`
- Starting documentation/evidence HEAD: `912fc8c4a065ffe9af1ce35c44d7ce3d1c663764`; initially clean, with the prior implementation in its ancestry.
- Verified prior implementation: `a7e1929d0ac1d128eea22873b51ed31a12f79fec`, technically functional but **not visually accepted**.
- Tested R1 implementation: **`95238a58be48730956eb25087353e1e82f146fd2`**.
- Separate evidence closeout: **`42db04a18a8252a266074cd26408ebf23e5e7cf8`**.
- This report is a documentation-only successor of the closeout. No merge, push or deploy; no existing application database changed.

## Visual review entry points

**[Side-by-side independent review](batch11a-r1/review.html)** — supplied reference, before/after accounts, mobile navigation, real effects and material detail.

[Complete screenshot/fidelity checklist](batch11a-r1/VISUAL_REVIEW.md) · [Dark marketplace proof](batch11a-r1/screenshots/marketplace-dark-desktop.png) · [Light account](batch11a-r1/screenshots/account-light-desktop.png) · [Dark account](batch11a-r1/screenshots/account-dark-desktop.png) · [Mobile sheet](batch11a-r1/screenshots/account-sheet-mobile.png).

The owner-supplied reference was available and directly inspected. It was not treated as evidence that pictured features exist, nor used as a source of copied public illustrations. Both prior Batch 11A account screenshots were studied and archived unchanged for comparison. R1 substantially changes the material composition beyond palette replacement: soil/charcoal paper, walnut publication rails, matte brass rules/actions, engraved wheat and object plates, rich original harvest imagery, clean inset controls and parchment editorial inserts.

The ten required review questions are assessed explicitly in the fidelity checklist. Engineering judgment is that the candidate now provides a coherent direction suitable for aesthetic review; it is not a claim of owner approval, pixel equivalence or a finished marketplace redesign.

## Functional scope and architecture

Account Settings retains its real authenticated name update through the existing `/api/account` PATCH. The revised account book has denser, purposeful hierarchy, a wheat-bearing secondary index, fine material borders, clear dirty/error/saving feedback and a restrained physical press/success seal. Inputs and important data remain high contrast. No harvest hero is forced into account/security forms.

The shared heritage header now uses a native account dialog sheet, with labelled purpose, active route, 44–48px targets, scrolling, Escape/outside/close/navigation dismissal, explicit keyboard boundary wrapping and focus restoration. The legacy header variant is retained. Mobile screenshots show the deliberate viewport sheet rather than the old awkward floating dropdown.

A small labelled link from the existing homepage opens **`/catalogue`**, a focused read-only design study, not a replaced homepage. It uses actual persisted eligible listing/category queries: ACTIVE listing, not Admin-restricted, ACTIVE owner and an existing PHOTO. Up to twelve real categories and four recent records are read; an exact eligible category can filter the records. Unknown category selectors fall back to the eligible all-category view. Restricted/private fixtures are not leaked. Existing listing links/browse/rental routes remain real. Empty states are truthful.

Screenshot listing data is explicitly named **Design fixture**, seeded only in fresh owned databases. Original engraved fixture illustrations are not passed off as real product photography, and no ratings, reviews, transactions, delivery or booking statistics are fabricated. Outside fixtures, the real records retain their own persisted media. The proof does not reconstruct the reference's map/favorites/notifications or modify MRT flows.

Reusable primitives, tokens, timings and controls are specified in [Material & Interaction Foundation R1](MATERIAL_AND_INTERACTION_FOUNDATION_R1.md): `HeritageSurface`, `HeritageSection`, `EditorialHeading`, engraving treatment, material borders, `DiscoveryLink`, form press, and shared appearance/effects/sound preferences. No animation/game library or dependency upgrade was added.

## Tactile, sound and theme contract

- **Discovery:** real pointer, Enter and touch activation produces nine fine soil/brass specks, with 420ms transform/opacity motion and removal at 460ms. Keyboard uses the control centre. The actual link is never delayed/prevented. No passive looping animation or continuing simulation.
- **Press:** at most 2px form press and decorative seal; existing real textual save success remains exact. No dirt/audio on saving, authentication or security actions.
- **Hover/reveal:** 2px engraved-plate lift, small border/material shifts and one limited 300ms editorial reveal. Core controls are never delayed.
- **Control/cleanup:** independent `Immersive effects`, live reduced-motion checks and CSS suppression; absolute pointer-transparent particles, replaced timers and unmount cleanup. Ordinary functional focus/state feedback remains.
- **Sound:** OFF by default; explicit `Discovery sound` opt-in, nonsensitive persistent preference shared across the heritage roots. Original native Web Audio noise, 110ms source, low gain .045, stop by 120ms/context close at 180ms. Trusted intentional discovery only, no autoplay, no focus/keypress loop/security audio. Unsupported/blocked audio does not block real navigation. [Original optional offline preview](batch11a-r1/soil-sound-preview.wav); it approximates the runtime family rather than being a bit-identical stochastic recording.
- **Theme:** Light, Dark and live System mode. Server HTML uses an exact allowlisted nonsensitive appearance cookie; no unsafe inline bootstrap or CSP relaxation. Legacy local-only preference migrates after hydration, so its first migration visit can still mismatch briefly. Later saved choices render correctly on the server. Storage failure uses in-memory fallback, without a persistence guarantee when storage is blocked.

[Actual UX result](batch11a-r1/heritage-ux.json) and [account save/navigation result](batch11a-r1/account-browser.json) support these claims. The representative particle capture pauses the actual CSS animation at 110ms only for a clear frame; its real cleanup timer is unchanged and removal is asserted afterward. Sound is tested using the actual native browser API, not a mock authorization or playback success.

## Assets, performance and accessibility

[Asset inventory and provenance](batch11a-r1/ASSETS.md) · [hashes/sizes](batch11a-r1/assets.json). All public artwork is original generated or programmatic work; the supplied reference remains review-only. Harvest artwork is disclosed as generated illustration, not documentary photography/location evidence. No proprietary reference illustration, unsuitable stock source, game audio or Minecraft asset was copied.

All seven public art/texture assets total **435,200 bytes**, under 500 KB before browser caching. The hero is 1536px WebP, object plates 480px WebP and repeat textures 320px. No new package or lockfile changes.

[Performance/accessibility checks](batch11a-r1/performance-accessibility.json): bounded nine nodes per activated control, no animation simulation/layout loop, transform/opacity animation, real timer/audio closure, explicit cleanup and tested mobile overflow behavior. Opaque token pairs checked at **≥5.19:1**. Native labels, focus indicators, required-field constraints, keyboard selection/navigation, touch activation, reduced motion, storage/audio failure fallback and real error/retry are exercised. The form/error surfaces remain readable above the material textures.

These are engineering checks, not low-end-device FPS/LCP/CLS measurements or complete WCAG/screen-reader certification. Real Safari/iOS hardware, zoom/screen-reader behavior of retained account subpages and subjective sound/visual quality remain acceptance work. No claim of full-device accessibility or aesthetic completion is made.

## Selected regression ledger — actual results

All **21 final selected command groups** succeeded, plus 90 unit tests, TypeScript, lint and Prisma validation. This is not a clean first-attempt pass and not a rerun of every repository suite. Initial failures and the unresolved login timing observation are retained below. All database-changing commands used fresh owned disposable targets through the existing guarded harness; every final command confirmed owned cleanup.

| Command | Actual final result | Artifact |
| --- | --- | --- |
| `npm run test:account-design` | 1 passed; cleanup confirmed | `.test-artifacts/68014af78f2a65b1935d16ea` |
| `npm run test:heritage-ui` | 1 passed; cleanup confirmed | `.test-artifacts/f393fab6a8a554f45f894d62` |
| `npm run test:integration` | exit 0; cleanup confirmed | `.test-artifacts/abde9b3ffdd295429b61535c` |
| `npm run test:meetup-session` | 6 passed; cleanup confirmed | `.test-artifacts/e9b847ef6e169c762b09a13c` |
| `npm run test:meetup` | 11 passed; cleanup confirmed | `.test-artifacts/78046b788541f793b865767f` |
| `npm run test:login-readiness` | 1 passed; cleanup confirmed | `.test-artifacts/5f47c3f8beeec574a40c2c04` |
| `npm run test:login-navigation` | 7 passed; cleanup confirmed | `.test-artifacts/2c0d780830feae9e8b6b0bdd` |
| `npm run test:admin` | 7 passed; cleanup confirmed | `.test-artifacts/528e9047a0e7c53ff3ba2178` |
| `npm run test:rental-api` | 13 passed; cleanup confirmed | `.test-artifacts/38abf8945d259a790e354813` |
| `npm run test:rental-browser` | 4 passed; cleanup confirmed | `.test-artifacts/c17a6380f2f1615ec61c18af` |
| `npm run test:mvp` | 11 passed; cleanup confirmed | `.test-artifacts/29351770cd383a95b929f679` |
| `npm run test:support-channels` | 9 passed; cleanup confirmed | `.test-artifacts/eabdff1956a16ba57f47cba3` |
| `npm run test:support-staff` | 14 passed; cleanup confirmed | `.test-artifacts/da8bf41e07bf8af71df4f957` |
| `npm run test:authorization` | 8 passed; cleanup confirmed | `.test-artifacts/4dbc11ba284e91f5d8f6f6ee` |
| `npm run test:staff-session` | 13 passed; cleanup confirmed | `.test-artifacts/e1cff08abefd5ccac6a40e77` |
| `npm run test:mfa` | 16 passed; cleanup confirmed | `.test-artifacts/c136984785807117966aab5e` |
| `npm run test:announcements` | 9 passed; cleanup confirmed | `.test-artifacts/d275f874f9ac4fe2d9700e0c` |
| `npm run test:platform-settings` | 8 passed; cleanup confirmed | `.test-artifacts/b6c3407de5c4949b150b95f3` |
| `npm run test:locations` | 7 passed; cleanup confirmed | `.test-artifacts/cbdba627fdff207595f94d76` |
| `npm run test:workbench` | 7 passed; cleanup confirmed | `.test-artifacts/ac61c41a37cf8088130e193f` |
| `npm run build:verify` | exit 0; cleanup confirmed | `.test-artifacts/9c3e633eb32d2739753b730d` |

| Static/unit check | Result |
| --- | --- |
| `npm run test:unit` | 90/90 |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npx prisma validate` | valid, exit 0 |
| `git diff --check` | clean |

[Machine-readable full selected ledger](batch11a-r1/verification.json). The original integration and the six-node logout/polling suite remain strict. Full meetup is **11/11**, with actual virtual-camera pickup and return decoding, not manual-code substitution: [pickup](batch11a-r1/camera-pickup.json), [return](batch11a-r1/camera-return.json). Existing deadlines, authorization, GPS/consent/camera/evidence/custody requirements and the global browser-error collector are unchanged.

R1 browser coverage includes actual registration/session/account save/database verification/logout; both themes at 1440/820/390; live System changes; server-rendered saved Dark; native sheet Escape/outside/link dismissal and focus wrapping/restoration; pointer-down form state; keyboard/touch particles and removal; real optional audio start/stop/close, independent motion/mute and no autoplay after persisted opt-in; unavailable storage/audio fallback; real category filtering and restricted-record exclusion. Tests use actual routes and responses, with only the existing narrowly asserted transport-outage UI fixture. No fabricated successful authentication or save response.

## Initial failures, corrective work and remaining timing risk

[Initial outcomes](batch11a-r1/initial-outcomes.json) are separate from final results.

1. Initial account test failed because a decorative seal added a check glyph to DOM text. It became an aria-hidden CSS-generated ornament, preserving the exact existing success assertion.
2. Initial R1 test caught backward Tab leaving native dialog controls in Chromium. Explicit first/last wrapping fixed the actual focus behavior; Escape/focus return remained native.
3. Initial static checking caught a test diagnostic typed as base Animation rather than CSSAnimation and a CommonJS import in the offline texture generator. Both were corrected; final TypeScript/lint passed.
4. Visual inspection, rather than hidden reruns, drove compact menu typography, finer fibers, richer original object plates, correct reduced-motion handling and replacement of an unsupported font arrow with an original inline SVG. Affected UI screenshots/build were rerun after source changes.
5. **Login readiness initially failed the unmodified 5,000ms navigation assertion during overlapping candidate browser work.** Server log recorded login 200 (1,890ms total; 1,761ms Next compilation; 122ms application) and dashboard 200 (254ms). The browser still awaited dashboard navigation at the deadline. This is not proof of an authentication defect or proof that concurrency caused the timing. No login code or timeout changed. After all other browser/build groups completed, a new owned serial run passed delayed hydration and six repeated browser logins. [Bounded initial/serial timing evidence](batch11a-r1/login-timing.json). **Underlying timing intermittence is not root-causally resolved by R1.** Do not erase this risk because the final rerun passed.

A temporary read-only cleanup helper also needed its `/tmp` module import corrected before any connection; the corrected effective-target check confirmed cleanup. No application code or security boundary changed for that packaging issue.

## Preservation, ownership and cleanup

[Preservation proof](batch11a-r1/preservation.json): **1,041** preexisting protected files byte-identical, including every API route, auth/session/logout, booking/meetup/evidence and staff/MFA/approval/Support/announcement/settings service, proxy/configuration guards, original integration/meetup tests and global collector. All **28 historical migrations**, Prisma schema, lockfile and historical review evidence are unchanged. No new migration. Fresh tests replayed historical migrations; no existing application database was reset, migrated, seeded or modified.

[Cleanup](batch11a-r1/cleanup.json) uses the effective-target guard and read-only maintenance catalog verification: zero remaining owned R1 databases and zero owned test principals. [Cache cleanup](batch11a-r1/cache-cleanup.json) removed only generated build caches from completed successful owned R1 runs; screenshots/diagnostics were retained. No existing application records or historical evidence were deleted. No actual staff provisioning, production Support, station mutation, high-risk action, publishing/settings write, finance or AI execution was activated.

## Roadmap and owner decisions

The canonical [14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) keeps every original stage name/order/objective. Stage 9 remains **In Progress**. Batch 11A was not visually accepted; R1 is a correction candidate, not a new master stage or a completed website makeover. Stage 6 station controls, Stage 7 Support production policies/activation and Stage 8 publishing/settings approvals remain explicitly unchanged; all three full sections are preserved byte-for-byte.

Owner review is still required for:

- Whether soil/walnut/parchment depth and fiber intensity now meet the supplied reference.
- Serif character, wheat branding, engraving/photographic balance and visual density.
- Particle weight/timing, press feel, optional sound timbre/loudness and control placement.
- Both-theme balance, mobile sheet comfort on actual devices and legacy preference first-visit behavior.
- Whether a later batch should adapt the actual homepage or other routes. No wider adoption is authorized by this candidate.

Remaining technical acceptance: investigate the recurring login timing observation separately without relaxing its deadline; physical-phone/Safari, screen-reader/zoom/performance/listening review; later password/profile/language policy/audit work. Do not bundle recovery, staff activation, approvals or operational policy edits into visual follow-up.

## Inventory and reproduction

[Complete changed-file inventory](batch11a-r1/changed-files.txt) — 74 files, including original artwork, tests, documentation and comparison screenshots; the functional slice is account/shared shell plus one catalogue proof route.

[Reproducing with fresh owned databases](batch11a-r1/REPRODUCING.md). The offline review/gallery and optional manually played WAV need no live database. Stop here for independent product-owner review. No push, merge or deploy was performed.
