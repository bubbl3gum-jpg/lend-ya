# Lend-Ya development handover

**Start at canonical `origin/main`, commit `77aae95e950939483dd1418cf83c5261bc0ed67e`.** The local `work` checkout used by this audit points to the same commit. The November 6 consolidation branch points at that exact SHA. Begin normal development from a reviewed canonical revision with any local work preserved.

Lend-Ya is a Taipei-focused peer-to-peer rental marketplace, also branded Hustlen’. The App Router renders marketplace, account, booking and operations pages and exposes API handlers. PostgreSQL and Prisma persist identities, listings, bookings, MRT selections, custody receipts, private evidence, reviews and operational records. Listing media use the application filesystem. Staff, identity, condition, recovery, Support and AI features have independent development gates. Some are durable owned pilots. Their presence on main does not convey production approval.

## Current handoff

- The core journey is listing discovery → renter request → owner decision → bilateral MRT pickup verification and handoff → rental → verified return and inspection → eligible review or dispute. Relevant services are under [meetup](../../lib/meetup), [booking APIs](../../app/api/bookings) and [rental lifecycle](../../lib/rental-lifecycle.ts).
- Account creation and revocable sessions are implemented. Main has a placeholder recovery response. The canonical-based [recovery candidate](BRANCH_AUDIT.md#cross-branch-conclusions) adds email outbox, reset flow and UI. Its November 14 WIP wired a missing Step 3 test file. Evaluate it separately after restoring rental acceptance.
- Canonical Mission 5 ends with a confirmed development hydration failure in its tested ordering and a repaired browser-test guard. Production prevalence is unknown. The audit reproduced a different environment problem, Prisma engine access through the cloud proxy.
- Current audit evidence: locked dependencies and lint passed, 216 unit checks passed, two files failed on missing generated Prisma client, and type checking failed. Build, migrated integration, browser and physical-device acceptance were unexecuted. The registry scan exposed two moderate Next advisories and additional development-tool advisories.

## Owner decisions and remaining questions

| Decision | Status and effect |
|---|---|
| Canonical branch | Owner specified main in the audit brief. Current starting SHA is verified against the remote. |
| Next milestone | Owner confirmed rental acceptance first during the audit. Prioritize environment recovery and rental gates before account-recovery integration. |
| Production rollout and policy | Payment/deposit execution, identity assurance, staff role rollout, qualifying dispute delivery, real device acceptance and AI provider activation each need explicit agreement before implementation or rollout. These choices did not block the documentation audit. |
| Recovery delivery scope | Reconfirm rollout and provider arrangements when beginning recovery acceptance. Current branch text identifies simulated email for Step 3. |

When intent is unclear, check canonical source and branch evidence, then describe the conflicting evidence, affected behavior and practical options to the owner. Record confirmed decisions here or in the corresponding successor review. Continue evidence gathering in unrelated areas while waiting.

## Safely resume verification

1. Confirm `git status --short --branch` and compare `git rev-parse HEAD` against the canonical SHA. Read [agent rules](../../AGENTS.md) and the applicable domain contract before changes.
2. Use the pinned Node and npm, `npm ci`, and the verified Prisma host access in the development environment. The current cloud still receives 403 from `binaries.prisma.sh`. Use the environment settings to apply the previously saved domain allowance and verify that it is in force before retrying generation.
3. Configure a local PostgreSQL 17 instance with the documented [setup](../../README.md#local-development). Preserve existing data, avoid resets, and use private local values for meetup settings. For DB checks use the repository runner with an unused `hustlen_test_*` database, distinct from the app database. The runner owns creation and cleanup.
4. Verify `npm run db:generate`, `npm run test:unit`, `npm run lint` and `npm run typecheck`, followed by `npm run build:verify` and the owned migration, authorization, rental, meetup and camera suites. Run Next-related acceptance sequentially, retain exact exits, and use synthetic actors only. Follow the [roadmap](NEXT_STEPS_ROADMAP.md) for ordering.
5. Keep provisional flags unset except for explicit owned fixtures. Require separate decisions for any production rollout, live provider or user-data treatment.

## Reading order

- [Branch audit](BRANCH_AUDIT.md) covers all 72 remote heads plus the local checkout alias.
- [Architecture audit](ARCHITECTURE_AUDIT.md) maps runtime services, routes and database contracts.
- [Feature status](FEATURE_STATUS.md) lists functional scope, gates and verification limits.
- [Security and quality](SECURITY_AND_QUALITY_AUDIT.md) records risks, exact checks, exits and logs.
- [Development history](DEVELOPMENT_HISTORY.md) reconstructs milestones and stopping points.
- [Next steps roadmap](NEXT_STEPS_ROADMAP.md) lists dependencies, owner gates and acceptance criteria.
