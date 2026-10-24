# Batch 7D independent review

Starting Batch 7C SHA: **93d3c646abc44e8298f2acd9bc3d57507f0691fe**. Baseline working tree was clean; the isolated branch is **feature/case-history-audit-navigation-batch-7d**, directly based on that commit. The main closeout provides the exact final Batch 7D SHA. At the user's explicit mid-task request, the completed Batch 7C branch was pushed and remote HEAD verified at that SHA; Batch 7D remains a separate local review commit.

## Delivered behavior

Legacy ACTIVE Admins can see a compact case-history preview, open a paginated chronological history, inspect allowlisted audit metadata, inspect related records/current custody checkpoints, and return to their original validated Workbench view. Existing complete report/dispute details, actions, evidence, audit directory and User/Listing decision-history links remain.

The [history contract and implementation inventory](CASE_HISTORY_AUDIT_CONTRACT_BATCH_7D.md) identifies actual persisted sources, fixed DTOs, exact ordering, privacy and performance limitations. No CaseHistory model exists or is added. Creation/latest-resolution fields are marked persisted case timestamps; audit entries have distinct source labels. Current state is not invented history; administrative resolution is not physical receipt or accepted inspection.

## Verification

| Command | Actual final result |
| --- | --- |
| `npm run test:admin-migration` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:admin-own-session` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:admin` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:approval-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:approval` | Exit 0; ℹ pass 18; owned cleanup confirmed |
| `npm run test:authorization` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:case-history` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:chat` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:database-principals` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:execution-rehearsal` | Exit 0; ℹ pass 18; owned cleanup confirmed |
| `npm run test:investigation-receipt` | Exit 0; ℹ pass 2; owned cleanup confirmed |
| `npm run test:login-navigation` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:login-readiness` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:meetup-migration` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:meetup` | Exit 0; ℹ pass 11; owned cleanup confirmed |
| `npm run test:mfa-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:mfa-pilot-disabled` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:mfa-pilot-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:mfa-pilot` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:mfa` | Exit 0; ℹ pass 16; owned cleanup confirmed |
| `npm run test:migration` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:moderation` | Exit 0; ℹ pass 10; owned cleanup confirmed |
| `npm run test:rental-api` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:rental-browser` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:scoped-reads` | Exit 0; ℹ pass 10; owned cleanup confirmed |
| `npm run test:stability` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:staff-read-pilot` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:staff-schema` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-session-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:staff-session` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 70/70 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

[Actual execution ledger](../security/batch7d/verification.json) separates initial failures from final child exits, records conditions/artifacts and checks owned-database cleanup. New changing tests use freshly created verified owned `hustlen_test_b7d_*` databases. No existing application database is migrated, reset, seeded or changed. The 503-entry benchmark is reported in [history-performance.json](../security/batch7d/history-performance.json); it is an HTTP-level synthetic benchmark, not production sizing. Across its 26 paginated requests, observed minimum/median/maximum were 30.5/83.4/155.0 ms.

Initial results are retained separately:

- First fixture run stopped at the existing one-open-dispute-per-booking constraint; fixture ordering was corrected. Second used an unsupported report `action` field instead of the existing `decision` contract; corrected without changing the API or its validation. Historical handoff fixture fields satisfy the existing dispute requirements; no custody rule was bypassed.
- The next run passed three checks and failed three (plus parent): an overstrict `Vary: Cookie` equality ignored valid Next RSC variation tokens; native SQL JSON timestamps lacked an explicit UTC suffix; and the test clicked the hidden mobile copy of a responsive queue link on desktop. The timestamp DTO was corrected to explicit UTC; tests now check Cookie membership and select the actually visible link. No application navigation deadline increased.
- Two focused runs then passed 7/7. One repeat happened after a guarded test-edit script stopped before adding the expanded checks; it is recorded as a repeated original-coverage run, not claimed as expanded coverage.
- Expanded coverage initially hit the unchanged 20-second authentication readiness probe before browser launch. Server logs directly confirm Turbopack **ENOSPC**, and workspace inspection found zero available disk. Dependent checks subsequently failed from the absent browser; these are reported rather than suppressed. Moderation logs also directly confirm ENOSPC. Rental-browser restart/timing and several pre-test startup failures occurred during the same disk incident; their bounded startup logs alone do not establish a separate application defect. [Disk incident evidence](../security/batch7d/disk-incident.json) records the exact distinctions.
- Only generated `next` directories from completed historical owned runs were removed (216); source, top-level server/test logs, screenshots and selected review evidence were retained. Generated internal Next build logs inside those directories were removed with their caches; the 7D incident logs were preserved. Disk availability rose to about 19 GB. No application/dependency change or timeout increase was made to address the incident.
- After cleanup, the expanded history run reached page 2 but its expectation used a different URL query order from the existing closed helper. Correcting that test expectation produced the final **8/8** pass, including explicit history/audit page denial, actual UI pagination, unknown audit context fallback and missing-record handling. The earlier 6/8 result remains in the ledger.
- The initial TypeScript check caught the shared User/Listing `CaseHistory` consumer types; those pre-existing audit links were preserved. The first unit run detected two uninventoried new read APIs; a new additive 7D guard/hash inventory was included without altering prior inventories. Final TypeScript and all 70 unit tests pass. An initial formatter command could not use the home cache; formatting used the existing writable temporary npm cache, without dependency changes.

Follow-up conditions: history was first rerun alone; the canonical-URL expectation run overlapped the first two limited follow-up regressions. The affected regression groups were rerun with at most two groups concurrently and fresh owned databases. Initial groups used at most three groups per runner, with the full meetup/build and focused history jobs also overlapping. Actual start/end times are retained; concurrency is not asserted as the sole cause of any failure.

Screenshots: [desktop](../security/batch7d/history-desktop.png), [tablet](../security/batch7d/history-tablet.png), [mobile](../security/batch7d/history-mobile.png). They contain synthetic authorized metadata only; private fixture narratives and audit JSON canaries are asserted absent from new surfaces. Browser tests use native real login/document navigation, visible responsive queue links, actual case/audit navigation, keyboard focus/Enter, direct/forged context and restored original Workbench filters. No authorization success is mocked.

The full default camera-based meetup regression must pass actual virtual-camera pickup **and return** and reach Batch 7B's post-return investigation assertion. Manual-code response-loss/protocol tests remain separately labelled. [Camera evidence](../security/batch7d/camera-pickup.json), [return](../security/batch7d/camera-return.json) and [post-return checkpoint proof](../security/batch7d/investigation-qr-receipt.json) are copied only as bounded safe metadata; no QR pixels, video, signatures or secrets are committed.

## Reproduction

Use the existing `tests/run-isolated.ts` ownership harness and `tests/support/test-database.ts` effective-target guards. Configure `MRT_TEST_DATABASE_URL` as a **new, absent, local development** `hustlen_test_*` database name on the owned test PostgreSQL instance, distinct from the application database. Never point it at an existing database. The harness creates/verifies its marker before migrations or fixtures and drops only its owned database/uploads afterward. Supply the installed Chromium path through `MRT_BROWSER_PATH`/`CHROMIUM_PATH`; full meetup also requires ffmpeg. Do not retain raw camera fixtures in Git.

Commands: `npm run test:case-history`, `npm run test:unit`, `npm run test:camera-reader`, `npm run test:meetup`, and the individually recorded `npm run test:…` regression commands. Static checks: `npx tsc --noEmit`, `npm run lint`, `npx prisma validate`; production build: `npm run build:verify` through the same fresh-owned harness. Every changing command requires a distinct fresh test name; generated artifacts include its run marker. The committed ledger contains actual UTC times and child outcomes, not an inferred aggregate.

## Preservation and remaining limits

[Preservation hashes](../security/batch7d/baseline-preservation.json) cover historical migrations/schema, auth/mutation/evidence/staff/approval/MFA code, shared queue/checkpoint SQL, official MRT data and all corrected Batch 7C camera implementation/tests. The proxy's logic is unchanged; only the additional safe page matcher is added. Existing populated migration regressions also retain [staff historical-row preservation](../security/batch7d/staff-preservation.json) and [MFA historical-row preservation](../security/batch7d/mfa-preservation.json). Their baseline SHAs refer to the earlier migration fixtures, not a different 7D starting branch; synthetic identities exist only in those owned fixtures. No dependency version or lockfile change, migration, staff activation or new operational action is introduced. [Cleanup](../security/batch7d/cleanup.json) records the final read-only maintenance catalog check.

History remains incomplete for legacy decisions with no audit row or resolution timestamp. Duplicate provenance is displayed honestly, not silently inferred/deduplicated. Unknown legacy audit actions have a generic fixed label. Histories are exact-target, not an unbounded graph of every related record. Offset browsing is not a persistent multi-request snapshot. No live refresh, export, text search, new audit writer, ticket workflow or support messaging is added. Existing broader audit-directory payload exposure remains within its legacy guard and deserves separate review before any lower-privilege cutover.

Batch 7C's device limits still apply: Chromium file-backed virtual-camera acceptance is not iOS/Android physical-device certification. Production rollout still needs physical camera, secure-origin, focus/glare/performance and lifecycle acceptance. No camera code or policy is changed in Batch 7D.

## Concrete recommendation for Batch 8 Customer Service

Start with a separately approved **legacy-Admin-only read foundation**, then implement a small structured ticket pilot after privacy/schema review. Do not route future Support Agents through legacy ADMIN APIs.

1. Approve ticket ownership, supported categories, retention, incident/dispute linkage, visibility and escalation rules before schema work. Preserve existing Dispute/ListingReport/Audit sources; tickets link to them rather than inventing case decisions or custody events.
2. Design additive SupportTicket and separate participant-private case conversations: owner and borrower have independent threads; no shared transcript, automatic cross-thread forwarding or private chat/evidence copying. Controlled mediation must explicitly select approved content. Assignment and resource scope are persisted and enforced at HTTP and service boundaries.
3. First deliver read-only structured ticket summaries and scoped assignment-ready projections using separate capabilities and access auditing. Validate participant/assignee/conflict boundaries, legacy history preservation, private-thread non-disclosure, bounded pagination and availability. Keep roles unactivated until scoped service/session enforcement is independently reviewed.
4. Only after approval, add authenticated participant submissions and narrowly scoped staff replies with exact assignment checks, content/attachment policy, notification/privacy review and atomic audit behavior. Support investigates and recommends; a distinct authorized human handles high-risk approval. No independent-approval or executor shortcuts, sanctions, status editor, evidence overrides, passkey recovery, payments or AI execution.
5. Require fresh/populated owned migration fixtures, negative API/service/browser tests, thread/evidence isolation, audit-failure fail-closed behavior and safe redacted operational diagnostics. Preserve QR/GPS/consent/custody and production-disabled pilots. Plan physical-device meetup acceptance separately; do not conceal it behind ticket readiness.

Exact [changed-file inventory](../security/batch7d/changed-files.txt). Stop after local isolated commit and independent review; no merge or deployment.
