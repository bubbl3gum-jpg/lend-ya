# Parallel development readiness

Date: 2026-11-05 (Asia/Taipei). Recommendation: **CONDITIONAL**.

Scope: planning and review only. This document does not authorize feature agents, branch/worktree creation, integrations, remote writes, deployment or production data access. Companion documents: [dependency matrix](FEATURE_DEPENDENCY_MATRIX.md) and [acceptance plan](REMAINING_ACCEPTANCE_PLAN.md). The archived `mission0/` plans remain unchanged historical evidence; this plan supersedes their proposed candidate SHA and branch names.

## Verified repository and evidence

| Item | Observed result |
|---|---|
| Exact fetch/push remote | `https://github.com/bubbl3gum-jpg/lend-ya.git` |
| Authorized branch/worktree | `stabilization/operation-new-features-baseline`, `C:/Users/leest/orca/workspaces/lend-ya/baseline-stabilization` |
| Starting HEAD | `2c8e835a4ae95285621b89f08b764bc934b83f41`; clean tracked/untracked status before planning edits |
| Ancestry | `git merge-base --is-ancestor 6b477c4194de0f618c7aa38a658a474d72e31fcb HEAD` and the same command for `3ff7ddda6337f3d0bb443f63656fa9a1f968c9a0`: both exit 0 |
| Local main comparison | `git rev-list --left-right --count main...HEAD`: `0 186`; local history, not proof of current remote state |
| Original worktrees | Main at `C:/Users/leest/orca/lend-ya`; partner at `.../rockling`; both at `f856dc360b332007dd79725ddee0d28102411521`. Default session directory is the partner worktree, so all planning writes use the explicit stabilization directory. |
| Detached evidence worktree | `.../baseline-validation-6b477c4` at `6b477c4194de0f618c7aa38a658a474d72e31fcb`; retained, not reused |
| Report integrity | `BASELINE_STABILIZATION_REPORT.md` SHA-256 `47c9509180f4fb09051046ceb4506badfb7bf11183394b3638040bb878ccdb87`; `BROWSER_ACCEPTANCE_CLOSURE.md` SHA-256 `2836aa2133c01be4335c2664a69b9baaf7bd6f82dc3672b25c8a7c3487bb096c` |

Read `AGENTS.md`, `CLAUDE.md`, both reports, archived Mission 0 plans, relevant auth/booking/schema/test code, the design contract and canonical 14-stage roadmap. Preserve Stage 6-9 gates, provisional visual approval and all development-only identity/Vision/AI restrictions. Future code authors must read the installed Next documentation before editing code; this mission changes Markdown only.

Commands executed in this planning mission: `git remote -v`, `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain=v1`, `git worktree list --porcelain`, ancestry/count commands above, `Get-FileHash`, targeted `rg` searches and source/report reads. No fetch was needed/requested; remote freshness is **unverified**. The planning commit is a documentation-only descendant of the starting SHA; its exact SHA is returned after commit (a report cannot embed its own commit hash).

## Evidence scope and outstanding blockers

Mission 0.1 was BLOCKED; Mission 0.2 supplies later targeted repair evidence. Read both in sequence; do not carry its old browser FAIL forward as an unmodified current defect or treat old PASS as new execution.

| Check / issue | Status and classification | Evidence / disposition |
|---|---|---|
| Windows/Webpack rental browser | Historical final PASS twice, 7/7 each, 286/277 seconds | Re-read `.test-artifacts/mission02/epoch-rental.csv`; complete logs named `epoch-rental-1.log` and `epoch-rental-2.log`. Not rerun in this planning mission. |
| Meetup/auth/API/unit/static | Historical Mission 0.2 final PASS | Meetup 16/16, authorization 8/8, login 1/1, rental API 20/20, QR-reader regression, separate production-camera 2/2, unit 219/219, type/lint/build; report and CSV evidence. `closure.csv` contains intermediate failures; `epoch-acceptance.csv` also contains a rejected hyphenated-DB command, not a browser test result. |
| Review hydration, QR sampling, stale RSC observer, fixture leaks | Repaired application/harness defects with scoped regression evidence | `components/verified-review-form.tsx`, `lib/qr-camera-reader.ts`, `tests/support/dev-navigation.ts`, rental/meetup tests; not proven portable by Windows results alone. No newly verified unresolved product defect in these paths. |
| Ubuntu canonical and bundler matrix | NOT RUN; environment-dependent acceptance gap | Fresh `wsl --list --quiet` returns no distribution; `docker info` fails because Linux-engine pipe is absent. Do not install/start infrastructure or infer hosted success. |
| Closure workflow database labels | Newly verified **test infrastructure defect**, not an application bug | `.github/workflows/browser-acceptance.yml` changes `:` to `_` but retains `-`; guard `lib/disposable-database-url.ts` allows only `hustlen_test_[a-z0-9_]+`. Pure local Node validation rejects `test_login-readiness`, `test_rental-api`, `test_rental-browser`, accepts `test_rental_browser`. No DB connection/workflow run. Repair before trusting CI; see acceptance plan. |
| Windows Turbopack development | NOT RUN on final repair; portability unresolved | Selector exists in `tests/support/next-bundler.ts`; old navigation/hydration symptoms must be re-evaluated on final code. Production Turbopack build does not satisfy this gate. |
| Real mobile camera, Safari/Firefox, visual approval | NOT RUN / owner acceptance gap | Authored Y4M and Chromium are useful automation, not physical-device evidence. Secure device access and fixtures need preflight. |
| Historical UTC-convention timestamps | Unresolved real-data risk / cutover decision | Runtime UTC binding repaired; provenance and any historic shifted data have not been inspected. Never bulk-shift eight hours. No production DB access here. |
| Dev dependency advisory | Historical risk, fresh audit NOT RUN | Closure report records 8 moderate dev entries, zero production findings; registry metadata can change. Do not present counts as a fresh audit or make unrelated upgrades. |
| Recovery delivery, deposit/ledger policies | Missing feature contracts, not baseline regression | Forgot route explicitly says delivery is not configured; Decimal deposit snapshots do not implement money movement. Owner decisions precede implementation. |

No application, database, browser, unit, lint or build suite was executed in this planning mission. The only executable probe was pure URL-policy validation using pinned Node, which confirmed the CI naming mismatch without network/database access. Native Node emitted a module-type warning; no package change is proposed for that diagnostic warning.

## Proposed workstreams and start gates

| Responsibility | Can be isolated after explicit feature authorization | Must wait |
|---|---|---|
| A - email recovery | Domain contract, single-use token protocol, abuse/race tests and fake local mail transport in NEW `lib/password-recovery/` and dedicated tests | Sender/provider, TTL, ordinary/staff scope, revocation policy; shared auth and schema integration require review. No real mail or provider credentials authorized. |
| B - deposit policy / ledger foundation | Approved deterministic Decimal calculations, immutable quote/version contract and ledger invariant design in NEW `lib/deposits/`, `lib/ledger/`, dedicated tests | Currency/rounding/limits, hold vs charge, deductions/refunds/authority, posting model; no funds/API/lifecycle activation. Integrator serializes schema. |
| C - mobile consistency | Approved presentation-only slice, e.g. shared header/account shell, keyboard/layout/theme/locale checks using existing design system | Scope/visual sign-off; A owns auth forms initially, B/integrator own booking integration. No booking/auth/state-machine rewrites or aesthetic redesign. |
| Integrator / acceptance coordinator | Contract register, ownership leases, acceptance evidence, shared primitives/migrations and integration review | Explicit owner approval before creating worktrees/agents or integrating. This role does not waive a failing guard. |

A/B pure domain work and C's disjoint approved presentation slice can proceed concurrently **after** those start gates. A and B persistence changes, shared forms, booking routes and global changes cannot be independently merged in parallel. Payment providers, bank transfers/refunds, real eKYC, Vision and AI execution remain deferred; do not add agents for them.

## Isolated worktrees (proposed, none created)

Use the exact owner-approved full SHA, initially proposed `2c8e835a4ae95285621b89f08b764bc934b83f41`; planning-only descendants are source-equivalent. If acceptance repairs change code, approve the new SHA and regenerate every base record before start. Never branch from a moving remote name.

| Role | Proposed branch | Proposed sibling directory |
|---|---|---|
| Acceptance | `acceptance/m02-2c8e835-cross-platform` | `acceptance-m02-cross-platform` |
| A | `feature/m02-2c8e835-email-recovery` | `feature-m02-a-recovery` |
| B | `feature/m02-2c8e835-deposit-ledger` | `feature-m02-b-deposits` |
| C | `feature/m02-2c8e835-mobile-consistency` | `feature-m02-c-mobile` |
| Integrator | `integration/m02-2c8e835-controlled-features` | `integration-m02-features` |

Future command template, **NOT EXECUTED**: `git worktree add -b <approved-branch> <new-absolute-sibling-path> <approved-full-sha>`. Verify target absence, branch absence and clean source first; never reuse/remove existing validation or partner worktrees.

Each worktree needs its own locked dependency install, generated client, temporary paths, Next output and logs. Assign unique available server ports and fresh named databases per runner; never copy `.env` credentials or point two agents at one application database. Keep the existing marker/target checks and uppercase/lowercase restrictions. Share a local PostgreSQL service only if expressly designated test-only, with unique DBs and validated ownership; otherwise separate services/ports. Do not reset/adopt an existing DB. Run one Next/browser/build job per worktree and serialize heavy acceptance jobs per host to preserve security subprocess resource limits.

Every agent handoff records full base/tip SHA, owned files, schema/API assumptions, exact commands and exit codes, artifact paths, remaining failures, and whether evidence is historical or fresh. No independent claim of baseline/production readiness.

## Integration gates and order

1. Owner accepts this conditional scope, supported environment, integrator identity and product contracts. No feature start is authorized by this planning commit alone.
2. Acceptance owner corrects CI label generation in its isolated repair scope, validates all labels, obtains both Linux matrix results and canonical verification. Windows Turbopack either passes or is explicitly excluded from supported development with owner sign-off; no silent waiver. Hardware gate blocks camera/release claims, not independent approved domain experiments.
3. Freeze interfaces and exclusive file ownership before any approved domain work. With explicit owner approval, A/B pure modules and C disjoint layouts may run while gate 2 executes; shared integration must wait for gate 2 disposition. Integrator reviews A's shared credential primitive first; serial schema order is A recovery migration, then B ledger migration on the updated schema.
4. For later authorized integration only, verify clean integration worktree and exact approved SHAs; review diffs, then integrate one reviewed workstream at a time using recorded merge commits. Do not cherry-pick overlapping auth/schema/UI patches independently or rewrite partner history. Resolve conflicts by contract and rerun tests on the resulting tree; never choose an entire side blindly.
5. Integrate A behavior, B domain/persistence then booking adapters, and C's dependent auth/booking presentation last. After each seam run targeted security/domain tests; after final assembly run the full acceptance plan on the **integration tip**, not only individual branch tips.
6. Require zero failing critical auth/privacy/custody/QR/ledger tests, no unexplained cancellations/skips, no weakened guards, reviewed migrations on an empty owned DB plus upgrade fixture, actual private image decoding, and persisted restart/lifecycle checks. Preserve expected source digests; security refactors need separate authorization, not adjusted hashes.
7. Human reviews combined evidence and owner visual/device decisions. Main merge/push/deploy/data cutover require new authorization. Keep failed integration evidence; repair with forward commits in the isolated integration branch. No reset/delete of shared branches/databases is a rollback procedure.

## Recommendation and decisions

**GO** for these planning documents and contract review. **CONDITIONAL** for future isolated feature work after explicit approval and the workstream-specific gates. **NO-GO** for shared lifecycle/auth/schema integration without acceptance disposition, feature-agent launch now, main merge, production money/identity/provider activation or deployment.

Owner decisions: supported OS/bundlers and required Linux evidence; integrator/reviewer; recovery delivery and security semantics; deposit/ledger financial contract; mobile scope/design/device matrix; historical timestamp audit policy; advisory remediation timing; and whether physical-device acceptance gates all feature start or only camera/shared UI integration. Proposed default: permit only explicitly approved isolated domain/presentation work while platform checks run; block shared integration and release claims until their gates pass.

Planning verification: original main and partner worktrees were rechecked clean at their recorded SHA; both input report hashes remain identical. Only the three requested planning Markdown files are new. No suites were rerun to validate a documentation-only change; command registration, relative links, staged whitespace and scope are checked before commit. No existing workflow, source, schema or lockfile is repaired by this commit.
