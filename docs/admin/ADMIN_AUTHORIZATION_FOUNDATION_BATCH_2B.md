# Batch 2B — authorization foundation review

24 October 2026 (Asia/Taipei). Branch: `feature/admin-authorization-foundation-batch-2b`. Base: `security/admin-readiness-batch-2a` at **`9b58969351fa091a969f7bca094f7a47c639fe5c`**. The starting working tree was clean. Final implementation SHA is the commit containing this report and is provided in the closeout response.

## Outcome and authority boundary

Implemented 74 immutable capability contracts, a tested candidate policy evaluator and a server-only loader boundary. **No new staff role, grant, account, approval workflow or operational power is activated.** There is no activation switch, DB-backed staff adapter, new production HTTP route, permission endpoint, approval store/executor or AI credential. Existing ADMIN and ChatReviewer checks remain authoritative and unchanged.

All decisions have `mode: SHADOW_ONLY`, `readyForActivation: false` and candidate `MATCH`/`DENY`. MATCH means only that a synthetic future contract matches its supplied server snapshot. It is not authorization, an approval, an execution token or permission to bypass existing checks. Proposed role allocations remain proposed even when a fixture matches them.

## Baseline security review

Reviewed the full Batch 2A diff from `98d24a9` to `9b58969`, including its isolation guard, shared Prisma client, logger, CLI paths, Next/Prisma patch families, dependency evidence and diagnostic changes. The Admin auth/mutation/evidence services and API checks were unchanged; chat/meetup edits changed unexpected-error logging, and temporary GPS eligibility became stricter. No confirmed permission weakening or new unresolved authorization regression was found. This batch makes no changes to those application boundaries, migration history or the lockfile.

Known limits remain: historical synthetic-camera intermittence, Batch 2A's transient chat redirect assertion, and incomplete independent exploit validation for registry dependency advisories. Current tests passing does not establish that those intermittent failures are fixed. The legacy read-helper and broad-ADMIN issues below predate this batch and are migration blockers, not newly activated access paths.

## Architecture

- `lib/authorization/registry.ts`: canonical action identifiers, resource kind, immutable server risk, scope, proposed/confirmed allocation metadata and domain invariants. Unknown/inherited/forged identifiers deny. The contract metadata and pure evaluator are internal testable definitions; the only server integration seam is server-only.
- `lib/authorization/policy.ts`: pure candidate evaluation against trusted snapshots. Requires a valid current human session, active verified membership, matching account/person binding, matching authorization and policy versions, active unexpired exact scope grant, correct resource/assignment and no participant/target conflict. Revoked/suspended/expired/stale actors and grants deny; role names and legacy ADMIN do not bypass scope.
- `lib/authorization/server.ts`: server-only `createShadowPolicyService`. Installed server loaders resolve sessions, membership, scope and resource facts. Request data supplies only an action and resource selector; it never establishes role, risk, membership, assignment, evidence integrity or proposal approval. A returned resource must match the selector. Loader failures propagate without a successful decision; no mutation callback exists.
- Production `app`, `components`, `scripts`, legacy Admin and chat code do not import the new module. Tests enforce this nonactivation boundary and baseline route checksums.

Scope includes exact resource grants, assigned cases, queue claims, separate Owner/Borrower support channels and an independently verified disposable-lab attestation. Proposed metadata reads still require explicit scope. Case/evidence access requires assignment, bounded purpose, integrity and an available audit boundary. No bodies or evidence bytes are returned by the evaluator. Future real DTO projection, scope-before-count queries and audit-before-bytes remain DAL implementation gates, not capabilities conferred by this module.

Risk comes from frozen contracts plus server-loaded risk/domain facts. A forged LOW classification cannot downgrade a high-risk action or a resource needing escalation. All domain-changing candidates require legal-lifecycle/evidence attestations and an approved domain-policy version. Immutable targets deny; arbitrary Booking status editing, audit rewriting, evidence alteration/export and disabling invariants deny regardless of role. No staff action can stand in for physical receipt, participant consent, checklists or real geolocation.

High-risk request and approval actions are separate identifiers. Approval eligibility additionally requires a recent verified human step-up, a distinct currently eligible human requester, no participant/subject/investigator/recommender/original-reviewer conflict, and exact action/resource/version/evidence/policy/payload-hash/expiry binding. These are read-only candidate checks, **not** an independent approval engine. Persistence, locking, canonical-payload derivation, step-up verification and one-time execution are intentionally not implemented.

## Role allocation and unresolved product decisions

The [complete generated matrix](ADMIN_CAPABILITY_MATRIX_BATCH_2B.md) identifies confirmed authority, proposed allocations, blocked policies and denials for every action/role. It supersedes neither product approval nor the historical planning documents.

- OPS policy-bounded listing restriction/restoration and immediate station suspension reflect expressly confirmed role-level authority, but remain inactive and subject to approved domain policy and audit. Restoration of stations and sensitive geofence changes remain separate high-risk proposals.
- The historical all-role temporary user restriction/release allocation is **not approved**. Both actions deny all roles until product defines authorized roles/domains, duration/cumulative limits, release policy and escalation. There is no universal suspension right.
- Concrete low-risk booking examples, pending-handoff custody recovery, routine mediation disclosures and per-key low-risk settings remain blocked pending policy approval.
- Other Super Admin/Support/Moderator allocations, approval-role assignments, evidence domains and notice/settings bounds are proposed implementation specifications. Future onboarding requires explicit signoff rather than deriving authority from the old planning matrix.
- AI contracts are deferred and every service principal denies. There is no payment or autonomous-administration permission.

## Legacy inventory and migration readiness

[Every legacy Admin authorization entrypoint](LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md) is inventoried, with [machine-readable API methods, guards and baseline hashes](LEGACY_ADMIN_ENTRYPOINTS_BATCH_2B.json). It includes 21 Admin route files, every Admin page/component, transaction services, chat grant/scope checks, protected listing media outside `/api/admin`, auth/session boundaries and credential-authorized CLI tools.

**Existing gaps:** `lib/admin/data.ts` and `lib/admin/cases.ts` are server-only helpers relying on guarded callers rather than actor-scoped DAL authorization. Legacy rental evidence and Admin reads are broadly available to active ADMINs. Those behaviors are preserved, not copied into future limited-role policy. Local provisioning/import tooling is not a future staff onboarding API. Every such path must be replaced or explicitly retired before cutover; a new role can never use a broad ADMIN fallback.

The [additive migration plan](STAFF_MIGRATION_READINESS_BATCH_2B.md) defines future StaffPerson/account links, fixed-role memberships, scoped grants, epochs, session bindings, assignment/evidence grants and append-only authorization events. It preserves UserRole, ChatReviewer, sessions, old IDs and immutable history. It forbids automatic ADMIN→Super Admin and ChatReviewer→Moderator conversion, combining roles to evade limits, alias self-approval and assigning ADMIN to satisfy old endpoints. No schema or migration file was changed and no staff identity migration was executed.

Bootstrap requires independently verified humans and sufficient independent reviewer/approver coverage. Staff-grant changes and SA-authored high-risk work need two independently eligible humans under the proposed allocation; appeals may need additional coverage. Hold/reject when coverage is absent; no one-person exception. Future service identities remain separate from humans and cannot satisfy separation of duties.

## Verification and negative coverage

| Command | Actual result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test:unit` | PASS, 57/57; includes 12 new authorization groups |
| `npm run test:authorization` | PASS, 7/7, including parent; final-source rerun |
| `npm run test:admin` | PASS, 7/7 |
| `npm run test:moderation` | PASS, 10/10 |
| `npm run test:chat` | PASS, 14/14 on this run |
| `npm run test:rental-api` | PASS, 13/13 booking/lifecycle checks |
| `npm run test:stability` | PASS, 8/8 |
| `npm run test:meetup` | PASS, 9/9, including real synthetic-camera scan scenario |
| `npm run build:verify` | PASS, isolated production build; final-source rerun |
| `git diff --check` | PASS |

The 74×4 contract/role matrix is exercised in pure tests and again over a test-only loopback HTTP server. The HTTP loader authenticates actual fixture sessions via the existing application `/api/auth/me`, while hypothetical memberships exist only in test memory. Body/header role/risk claims are ignored. High-risk approval candidates intentionally deny at that HTTP boundary without a server-loaded proposal; detailed independent-human eligibility is tested with synthetic trusted snapshots in unit tests.

Every exported method in the 21 existing Admin route files is directly tested with anonymous requests, ordinary users and each of the four future role labels on **UserRole.USER** accounts. The existing Admin overview remains accessible to the usual isolated legacy ADMIN fixture; Admin without ChatReviewer remains denied review access. Direct server-service negatives exercise moderateUser, moderateListing, resolveReport, resolveDispute, rental evidence, chat claim/read/decide; failed calls create no success audit and do not suspend their target. Existing moderation/chat/stability suites cover populated evidence, assignment, audits and authorized functionality.

Negatives include unknown/prototype/forged actions, revoked/suspended/expired/stale authorization, invalid user/person binding, grant expiry/revocation/version/scope, resource mismatch, own booking/target/alias conflicts, case ownership, separate private channels, absent evidence purpose/audit/integrity, role mismatch, forged risk, protected invariants, original appeal reviewers, self/investigator/recommender approval, service requesters, stale proposal versions/hashes and expired step-up. Real AuthSession expiry is tested at both HTTP and service shadow boundaries.

All DB-changing checks used fresh `hustlen_test_b2b_*` targets through the unchanged target/ownership guard. The only harness change adds `--authorization`, using the same create-new/marker/recheck/cleanup sequence. No existing user database was adopted, reset, migrated or seeded. All completed runs, including setup failures, reported owned-database cleanup. Reproduce with an explicit new local `MRT_TEST_DATABASE_URL`, `MRT_BROWSER_PATH=/usr/bin/chromium` and `MRT_TEST_KEEP_ON_FAILURE=0`; invoke npm harness commands, not integration files directly.

The new direct-service test required Node 24's test-only `tests/support/server-boundary-loader.mjs`: Next resolves `server-only` at bundle time, while a global React server condition breaks plain Node's `next/navigation` imports. The loader resolves only that marker to Next's own server empty module, only under isolated-runner variables. It does not mock authentication, actor checks, DB transactions, reviewer grants or evidence gates; production bundler checks/imports are unchanged. No dependency was added and the lockfile is unchanged.

Initial authoring/setup failures are retained: one new unit negative accidentally used an unchanged valid resource kind (corrected fixture); four integration setup attempts encountered marker resolution, SQL test-string quoting, a stripped condition, and React-condition import compatibility. They failed before authorization subtests/privileged actions, were corrected without loosening requirements, and cleaned up their owned databases. The final integration passes. No production security regression was established by these setup failures. No current chat or camera flake reproduced, and no flake fix is claimed.

[Verification manifest](../security/batch2b/verification.json) preserves run IDs, UTC timestamps, exits/counts/cleanup and setup outcomes. Raw logs and synthetic browser artifacts remain local under `/tmp/hustlen-b2b/` and ignored `.test-artifacts/<runId>/`; no private case text, tokens, GPS coordinates or credentials are committed.

## Exact changed files

- `docs/admin/ADMIN_AUTHORIZATION_FOUNDATION_BATCH_2B.md`
- `docs/admin/ADMIN_CAPABILITY_MATRIX_BATCH_2B.md`
- `docs/admin/LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md`
- `docs/admin/LEGACY_ADMIN_ENTRYPOINTS_BATCH_2B.json`
- `docs/admin/STAFF_MIGRATION_READINESS_BATCH_2B.md`
- `docs/security/batch2b/verification.json`
- `lib/authorization/policy.ts`
- `lib/authorization/registry.ts`
- `lib/authorization/server.ts`
- `package.json`
- `tests/authorization-policy.test.ts`
- `tests/authorization.integration.test.ts`
- `tests/fixtures/authorization.ts`
- `tests/run-isolated.ts`
- `tests/support/server-boundary-loader.mjs`

## Batch 3 prerequisites / stop boundary

1. Product approval for P/B matrix entries and exact low-risk/domain policies; verified human identity and sufficient independent coverage.
2. Reviewed scoped DAL/DTO/count design for **every** inventoried path, including existing unguarded read helpers and protected media; no ADMIN OR staff-role fallback.
3. Independent review of additive schema/rollback/roster reconciliation, authorization and policy version invalidation, assignment/alias scope and audit failure behavior, tested on owned populated fixtures.
4. Trusted membership/session/step-up/proposal loaders and transactional domain guards, explicit privacy/retention/disclosure policies, shadow mismatch review and exhaustive direct-route/service tests before activation.
5. A separately authorized approval engine before any high-risk effect; distinct service-principal design before any AI identity. The current candidate policy is not a production enforcement API.

Stop at this isolated committed implementation for review. No staff activation, real staff account creation, migration on existing records, merge, push or deployment was performed.
