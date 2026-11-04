# Mission 0 — Multi-agent execution plan

Prepared 2026-11-05 (Asia/Taipei). Planning only; no feature branches or agents have been created.

## Verified starting point

- Repository: `https://github.com/bubbl3gum-jpg/lend-ya.git` (fetch and push).
- Proposed base: `6b477c4194de0f618c7aa38a658a474d72e31fcb`, remote `origin/recovery/candidate-validation-20261103`.
- Validation worktree: `C:/Users/leest/orca/workspaces/lend-ya/baseline-validation-6b477c4`, detached HEAD.
- `git fetch origin --no-tags` succeeded. `git rev-list --left-right --count origin/main...HEAD` returned `0 176`.
- Both original worktrees were clean. Main remains at `f856dc360b332007dd79725ddee0d28102411521`.
- Acceptance remains governed by `BASELINE_ACCEPTANCE_REPORT.md`; this plan is not permission to start feature development.

## Worktree and branch convention — proposed, not executed

After explicit baseline acceptance, create each branch from the exact accepted full SHA, not a moving remote name:

| Agent | Proposed branch | Separate worktree |
|---|---|---|
| A | `feature/m0-6b477c4-email-recovery` | sibling `feature-a-email-recovery` |
| B | `feature/m0-6b477c4-deposit-ledger` | sibling `feature-b-deposit-ledger` |
| C | `feature/m0-6b477c4-mobile-consistency` | sibling `feature-c-mobile-consistency` |
| Integrator | `integration/m0-6b477c4-features` | sibling `feature-integration` |

Example for later authorized execution: `git worktree add -b feature/m0-6b477c4-email-recovery <new-absolute-path> <accepted-full-sha>`.
If baseline repairs change the accepted SHA, use that new SHA and update every name and report. Never use a main checkout for feature work.

## File ownership

Paths marked NEW are proposals, not existing functionality. Ownership is exclusive unless an integration handoff is recorded.

| Owner | Files/modules | Allowed responsibility | Shared dependency / conflict |
|---|---|---|---|
| A | `app/api/auth/forgot-password/route.ts`; NEW `app/api/auth/reset-password/route.ts`, `app/reset-password/page.tsx`, `lib/password-recovery/*`, `components/password-recovery-form.tsx`; recovery-specific tests | Recovery request, token consumption, delivery adapter, security regression | Existing `lib/auth.ts` hashing/session issuance coordination; credentials and session revocation must stay atomic |
| A initially | `components/auth-form.tsx` | Narrow recovery integration | C must not edit this file concurrently; request presentation changes after A lands |
| B | NEW `lib/deposits/*`, `lib/ledger/*`, deposit-specific tests | Approved deposit policy and immutable accounting contracts | Booking snapshots, Decimal precision, idempotency, dispute/financial separation |
| B after contract review | `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts` | Only approved financial integration points | High overlap with rental lifecycle, evidence, documentation acknowledgement and reservation locking; integrator reviews every change |
| C | `app/globals.css`, `components/site-header.tsx`, `components/heritage/*`, `components/listings-browser.tsx`, `components/listing-card.tsx`, layout-only slices of `app/account/layout.tsx` | Responsive consistency, accessibility, existing design tokens, visual evidence | Global CSS can change A/B screens without touching their source; freeze screenshots against integrated code |
| C by handoff only | `components/booking-form.tsx`, `components/booking-actions.tsx`, `components/create-listing-form.tsx`, `components/edit-listing-form.tsx`, `app/bookings/[id]/page.tsx` | Presentation after A/B contracts stabilize | Money labels, validation, quotation and lifecycle actions are shared behavior; no independent financial or auth edits |
| Integrator | `prisma/schema.prisma`, all NEW migration directories, `lib/auth.ts`, `lib/api-response.ts`, `lib/api-validation.ts`, `package.json`, `package-lock.json`, `.env.example`, `.github/workflows/verify.yml`, shared test runner | Serialize schema/shared infrastructure edits, approve dependency changes, own integration evidence | Agents submit exact required diffs/contracts; no concurrent changes or regeneration by multiple agents |
| Integrator + C by handoff | `lib/i18n/catalogues.ts`, `lib/i18n/core.ts`, NEW domain catalogues | Stable translation keys and bilingual error/label integration | A/B define message meaning, C checks display; never change raw API values for localization |

## Database migration ownership

The integrator is the sole schema/migration writer. A supplies token/session/recovery-event requirements; B supplies policy/ledger/account/event requirements. C owns no migrations. Reserve a unique timestamped migration name per change, review SQL and order together, generate the matching Prisma client separately in every worktree, and test both fresh install and populated upgrade. Historical migrations are immutable.

Several existing candidate migrations deliberately require a marked disposable database. Never remove those guards to make shared or production migration deployment succeed. A production migration/cutover strategy is a separate decision.

## Resource isolation

- One `node_modules`, `.next`, ignored artifact directory, private environment configuration and application port per worktree. Never symlink `.next` or dependencies between agents.
- One fresh PostgreSQL database per suite, with explicit `MRT_TEST_DATABASE_URL`, local `hustlen_test_*` naming, exact target validation and random ownership marker. Do not precreate runner databases or point at a shared development database.
- Use `tests/run-isolated.ts`; it generates a private meetup secret, deploys into its owned database and checks ownership before cleanup. Never run raw database test files against a shared target.
- Run suites sequentially within one worktree: its Next build/dev outputs are shared. Other worktrees may run independently on unique ports and databases.
- Preserve development-only identity, Vision, AI and location-simulation gates; synthetic success grants no production authority. No live providers, real identity documents, payment transfers or customer email delivery during tests.
- No secrets, tokens, cookies, customer data or raw provider envelopes in committed evidence.

## Integration sequence and merge procedure

1. Close the baseline acceptance failures or obtain a narrowly documented owner decision; pin the accepted SHA. Feature work remains stopped until explicit acceptance.
2. Agree shared contracts and owner policies. Integrator reserves migration ownership; agents receive exact file boundaries and required regressions.
3. A and B develop independent domain modules; C can work on its exclusive layout files. No agent edits another's worktree or branch.
4. Review and integrate A's recovery/security slice first in the integration worktree. Serialize its schema/auth changes and rerun auth/session/abuse regressions.
5. Review and integrate B's policy/ledger slice next, with no provider activation. Verify booking immutability, retries, monetary precision and financial state separation.
6. Refresh C against those integrated contracts by an explicitly reviewed update; integrate shared-screen presentation last. Preserve its earlier exclusive CSS/component work.
7. On the integration branch only, use reviewed normal merges after authorization; no force pushes, main reset, history rewrites or automatic conflict resolution. Check status and branch SHAs before each operation. Resolve conflicts by domain contract, then rerun affected suites plus the full required baseline.
8. Deliver exact SHAs, migration order, raw exit codes and initial failures as a review package. Main merge, publication and deployment each require explicit authorization; this mission grants none.

## Required agent handoff

Each agent reports its base/head SHA, changed paths, schema requests, tests actually executed, untouched gates, known limitations and unresolved product decisions. No historical report substitutes for a fresh check. Stop and request integrator coordination if ownership boundaries need to expand.

## Unresolved issues and recommendations

Fresh Mission 0 testing has exposed Windows portability failures and an authorization expiry assertion failure. See `REGRESSION_TEST_BASELINE.md`; do not assume a Linux rerun resolves the authorization finding. Mobile design must follow `AGENTS.md`, `docs/design/HUSTLEN_UI_UX_DESIGN_CONTRACT.md` and the existing heritage foundation. Owner visual approval and financial/recovery policy remain outstanding.
