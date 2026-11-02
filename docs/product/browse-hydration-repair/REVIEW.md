# Browse filter hydration repair

2 November2026, Asia/Taipei. Baseline `003961deff8f541ceda119308f90005e33d653ed`; integration branch unchanged. No migration, authentication, eligibility, booking, evidence or operational policy change.

## Verified cause and reproduction

The ordinary baseline `npm run test:mvp` passed11/11 locally: the reported failure is timing-dependent. Inspection found the browse component renders enabled server HTML controls while its query/category/status/station state starts at empty/ALL. Before client JavaScript attaches onChange handlers, native inputs accept edits but React never receives those events. Hydration can preserve the edited DOM values while internal filter state stays at its defaults. Both counter and cards then correctly reflect the unchanged internal state, contrary to the visible controls.

A controlled production-server experiment reproduces the **exact** one-listing expectation failure at the existing5000ms deadline. Client script responses are held behind an explicit promise, not delayed by a sleep. Fill the original item's title, Cameras and Ximen while scripts are held; release scripts and await the existing preference-control hydration signal. Before **and after** hydration, all three visible values remain selected while counter/cards remain **4 listings/4 cards**. See `production-before.json`. This is a user-facing readiness defect exposed by browser timing, not an incorrect filter predicate or an assertion to change to four.

Important configuration distinction: the existing MVP command builds production assets, but starts a **development** server for its original account/browse subtest; its final cookie subtest switches to production. Preserve that configuration and original assertions. The additive focused regression runs explicitly against the production server. Local Node24/PostgreSQL17 and the same locked Next/React/test commands were used; system Chromium was used because the CI-managed Chrome156 download was denied HTTP403 by this workspace's network. Do not claim an identical Ubuntu/managed-browser execution locally. The new GitHub run is needed to verify that exact CI environment.

## Small application correction

`components/listings-browser.tsx` reuses the existing preference-controls pattern: useSyncExternalStore's matching false server/hydration snapshot, then true client snapshot after hydration. Native fieldset.disabled protects all four controls until their handlers are attached, with aria-busy, a screen-reader legend and a localized preparation message. This addresses actual users, rather than adding only a Playwright readiness marker. An unhydrated control no longer appears to accept input that is silently lost. It does not queue keys typed outside a disabled control. Server-rendered listings remain readable while scripts load; no-JavaScript client filtering remains unavailable.

All existing controlled values, raw option values, server eligibility, initial-category handling, filter predicates, count and card derivation remain unchanged. No arbitrary timer, network retry or longer deadline. Client navigation is also verified: controls become usable on actual client mounts without a permanently disabled state. Two typed English/Traditional Chinese labels preserve existing localization; only the catalogue completeness count changes from333 to335.

## Focused regression

`tests/mvp-security.test.ts` keeps the original `1 listing` expectation and adds a production case after its existing production transition. Four persisted API-created fixtures and an actual test report provide known categories, stations and available/flagged states. With script delivery held, verify fieldset's native disabled attribute, all four actual controls disabled, and the loading message. Release the gate; verify controls enable, then test each filter independently and in conjunction, case-insensitive search, zero matches, exact rendered listing IDs, counter/card agreement, real client navigation and URL-initial category. No arbitrary sleeps, assertion deadline increases or browser-error suppression.

An initial test-only mistake used Playwright toBeDisabled on the fieldset itself; that matcher reports it enabled even though its disabled attribute and all child disabled states are present. Corrected the group check to assert the native attribute and retained all four real control-disabled assertions. This was not a product change or relaxed filtering expectation.

## Verification/publication

`verification.json` records fresh runs including the baseline pass, controlled failure, test-instrumentation failure and final corrected outcomes. `production-after.json` records the focused production acceptance. Only fresh marked owned disposable DBs were changed and removed. Original migration hashes, private configuration, stash and main remain untouched.

The Actions result is checked after publication against the exact new commit and reported separately. Local system-browser success must not be presented as the new remote CI result. No unrelated product development, main merge or deployment.

Final local results: MVP12/12, integration exit0, homepage1/1, unit201/201, TypeScript/lint and guarded normal production build pass. Initial failures remain in the ledger. The original one-listing expectation and every prior MVP subtest remain.
