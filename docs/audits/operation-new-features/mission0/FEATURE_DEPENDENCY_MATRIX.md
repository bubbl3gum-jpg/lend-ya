# Mission 0 — Feature dependency matrix

Date: 2026-11-05 (Asia/Taipei). Source: exact candidate `6b477c4194de0f618c7aa38a658a474d72e31fcb`. Proposed responsibilities only; no feature implementation is authorized by this report.

## Source evidence and planned dependencies

| Feature | Existing evidence | Missing dependency | Owner / integration dependency |
|---|---|---|---|
| Email recovery | `app/api/auth/forgot-password/route.ts` validates contact then says delivery is not configured; `components/auth-form.tsx` calls it | Delivery choice, bounded request/consume flow, hashed single-use expiring tokens, reset page, abuse controls and session policy | A; integrator owns schema and shared auth; C receives UI after behavior stabilizes |
| Authenticated password change | `lib/password-change/config.ts` requires `owned-password-only`; existing credential/session transaction code is a dependency, not forgotten-password recovery | Decide reusable primitives without activating the gated candidate | A proposes shared changes; integrator reviews `lib/auth.ts` and session race coverage |
| Deposit policy | `components/create-listing-form.tsx` accepts owner-entered amount; `app/api/bookings/route.ts` validates and snapshots it | Approved currency, policy versioning, rounding, caps, no-deposit rules and immutable quote semantics | B; no dynamic policy is assumed approved |
| Ledger | `prisma/schema.prisma` contains deposit amounts, not a complete operational money lifecycle | Account/event model, balanced immutable postings, idempotency, reversals, reconciliation and financial-state contract | B designs; integrator alone writes migrations |
| Payments / transfers / refunds | `app/customer-service/page.tsx` says payment processing is unavailable | Provider, authorization/capture/settlement rules, transfer evidence/reconciliation, refund authority and webhook handling | Deferred follow-on; B's ledger must not imply money has moved |
| Mobile consistency | `components/site-header.tsx` has wrapping constraints; responsive styles and MRT map exist | Agreed screen/device matrix, accessible dialogs/forms, visual acceptance in both themes/locales | C; no API, schema, eligibility or lifecycle edits |
| Identity | `lib/identity/service.ts` gates synthetic development only; `simulation.ts` declares `realEligibility: false` | Real verification provider, retention, human review and eligibility policy | Out of scope; all agents preserve gates |
| Vision | `lib/vision-prototype/config.ts` requires development `fixture-only`; adapters refuse unauthorized live execution | Approved inference/evaluation/data policy and quality acceptance | Out of scope; no financial/identity/custody authority |
| Location simulation / QR | `lib/meetup/test-location.ts`, `lib/meetup/config.ts`, `tests/meetup.integration.test.ts` | Physical-device acceptance remains separate from virtual-camera evidence | Preserve local-only ownership and existing receipt/QR protocol |

## Shared-file conflicts and mitigations

| Shared path | Conflict | Mitigation |
|---|---|---|
| `prisma/schema.prisma`, `prisma/migrations/*` | A recovery persistence and B ledger persistence | Integrator serializes all schema changes; no edited historical migrations |
| `lib/auth.ts`, auth routes | Credential/session lock and reset semantics | A proposes minimal change; integrator owns shared primitive and regression review |
| `components/auth-form.tsx` | Recovery state and responsive layout | A exclusive first; C follow-up after integration |
| Booking API/detail/actions/forms | Ledger policy, stored quotation, labels and current lifecycle | B domain work first; C presentation by handoff; retain booking snapshot and evidence contracts |
| `app/globals.css`, heritage tokens | Global effects on all new forms | C owns changes; integrated browser acceptance checks A/B surfaces |
| Package manifests / environment template / CI | Delivery SDK, tooling, scripts and new variables | Integrator only; locked install/audit required; never commit actual credentials |
| i18n catalogues and common validation | Concurrent key/type/meaning changes | Separate domain modules where possible; integrator resolves shared keys, C checks rendering |

## Ownership and test order

Baseline acceptance -> approved recovery/financial/visual contracts -> A recovery -> B policy/ledger -> C shared-screen integration -> integrated full regression -> human merge review.

C's exclusive CSS/layout work may proceed in parallel only after acceptance and explicit feature authorization. Financial provider integration is a later scope; no ledger balance should be presented as proof of collected funds.

Evidence commands used: `git diff --name-only origin/main HEAD -- app lib components prisma package.json package-lock.json`, direct reads of the paths above, `git rev-list --left-right --count origin/main...HEAD`, and fresh checks documented in `REGRESSION_TEST_BASELINE.md`. Results: broad auth/booking/schema/UI overlap confirmed; baseline has 176 commits absent from main. No feature branches created.

## Owner decisions before implementation

1. Accept or repair the exact baseline; decide supported development OS and pinned Node runtime.
2. Recovery: email only versus phone, sender/provider, token lifetime, reset confirmation, session revocation and staff/Admin policy.
3. Deposits: currency (documentation currently describes USD display), amount policy, charge versus hold, cancellation/deduction/refund authority and accounting semantics.
4. Mobile: supported browsers/devices, scoped pages, theme/locale acceptance and whether this is consistency repair or a separately approved redesign.
5. Integrator identity, protected integration branch policy and required review/check gates.
6. Keep candidate-only migrations and feature gates intact; separately decide any production schema/cutover plan.

Fresh validation evidence: locked install, schema/type/lint/build and the 20-test rental API suite passed; unit, authorization, baseline evidence parsing and MRT/browser checks failed. A timestamp diagnostic found an approximately eight-hour pg/Prisma raw-query difference on this Asia/Taipei test cluster. Those failures and environment prerequisites are dependencies of all three agents, not assigned feature work. See `REGRESSION_TEST_BASELINE.md` for commands and exact scope.

Recommendation: approve the contracts and exclusive ownership matrix only after baseline failure disposition, before assigning feature agents. Historical test evidence and presence of schema fields do not demonstrate operational recovery, finance, identity or Vision.
