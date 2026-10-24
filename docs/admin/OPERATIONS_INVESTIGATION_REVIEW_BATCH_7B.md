# Operations Investigation Context — Batch 7B review

Baseline: clean **feature/admin-operations-workbench-batch-7a**, exact final commit **fe83e274ba93183d6b083bd13184015c21a3dc52**, parent **ca2d374b07b0346241318002bf786ef7ce6a0b91**. Isolated branch: **feature/operations-investigation-context-batch-7b**. The main closeout report supplies the exact final implementation commit SHA; this supporting report is part of that commit. Evidence retains actual execution timestamps.

## Delivered and existing functionality reused

Workbench rows now carry a closed navigation envelope to the existing Booking, Listing, Report and Dispute routes. Each guarded detail retains its complete existing forms, evidence permissions and record panels, with one compact **Investigation context** section after its title. `components/admin/details.tsx` and `components/admin/cases.tsx` only gain optional node slots; existing operational logic is unchanged.

The new section re-evaluates current matches against the same six SQL predicates, reports evaluation time/current primary state, explains fixed reasons and shows concise booking or listing checkpoint metadata. It supports a selected category that matches, no longer matches now, or describes a different record type in a related-record navigation chain. A link is never treated as proof of an earlier match or of an outstanding problem. Direct or invalid-context detail links continue working with a fixed safe Back fallback.

A valid Back preserves category, optional exact record filter, page and page size. The panel's related Booking/Listing link carries that same return view. Existing legacy detail links remain ordinary direct links; this batch does not rewrite unrelated navigation or the Admin shell. No arbitrary return URL/origin, actor, role, identity/evidence selector or private text can be carried by the accepted envelope.

[Shared explanation/navigation contract](OPERATIONS_INVESTIGATION_CONTRACT_BATCH_7B.md) documents exact fields, limits, loading/error behavior and snapshot semantics.

## Current authoritative checkpoints

Booking and related-Booking context separately show bilateral handoff, borrower submission, physical return via owner confirmation and/or completed QR receipt, accepted owner inspection, open/resolved disputes and administrative closure. All boolean definitions come from Batch 7A's shared SQL. Detail-only path booleans explain the physical-return OR predicate; they do not change it. Resolving a dispute or persisting COMPLETED/ADMIN_CLOSED never supplies missing checkpoints.

Listing and related-Listing context shows current restriction and open-report count. Report/Dispute context shows its actual current case state, current matching case criteria and its real persisted parent relationship. It does not select case narratives, participant identities/contacts, conversation text, identity documents, evidence bytes, coordinates, challenge secrets or credentials.

A missing checkpoint says **Not established by current records**, with an explicit warning that incomplete records are not a finding of participant fault. No record is rewritten or automatically repaired. The existing detailed record rendering and the new panel retain separate reads; the panel itself is internally consistent within one Repeatable Read snapshot and explicitly dated. Concurrent later changes can require refreshing the view; no global live consistency or lock against future writes is claimed.

## Shared source and authorization

- `lib/admin/workbench-catalog.ts`: shared categories, reason labels and record-kind applicability. Original Workbench exports stay compatible.
- `lib/admin/workbench-sql.ts`: shared checkpoint and category SQL. [Preservation proof](../security/batch7b/shared-predicate-preservation.json) verifies the original six-category SQL tail and every checkpoint predicate literal. Queue eligibility, counts, ordering and pagination remain unchanged.
- `lib/admin/workbench-navigation.ts`: pure validated sender/parser; generated hrefs contain only fixed local paths and bounded known-category/integer navigation metadata.
- `lib/admin/investigation.ts`: server-only, independently authenticated current ACTIVE legacy ADMIN, validated route kind/ID, no navigation input. Three fixed data-query calls per detail; parent IDs come from database relationships, not the URL envelope.
- `components/admin/investigation-context.tsx`: existing page guard, accessible generic loading surface, current-state explanation, no-conclusion unavailable state with bounded error reference, safe local links. Auth/not-found denials stay denials.
- Existing detail route wrappers pass the optional panel without changing underlying route/resource guards. Proxy only extends no-store matching to these detail route families; its production-refusal/Origin/CSRF function remains unchanged.

There is no new API, Prisma model, migration, mutation, staff identity or privilege grant. All existing Admin API/evidence/mutation source hashes remain unchanged. The approved future Operations `listings.read` policy and its decision documents are unchanged: exact Listing grants; only id, status, category, adminRestricted; authenticated access and mandatory audit. It does not authorize this broader legacy-Admin panel or activate new staff roles.

## Browser and correctness evidence

[Desktop](../security/batch7b/investigation-desktop.png) · [Tablet](../security/batch7b/investigation-tablet.png) · [Mobile](../security/batch7b/investigation-mobile.png).

These are actual context-panel captures within the unchanged Admin detail view at 1440×1000, 834×1112 and 390×844 viewports. Only the new component is captured to avoid copying existing private narrative/evidence panels into review artifacts. The synthetic fixture has a resolved dispute and administrative closure with missing physical-return records; the UI correctly keeps these separate. Captures were visually inspected. This is virtual Chromium evidence, not physical-device certification.

The expanded actual HTTP/browser/PostgreSQL Workbench suite reports **7/7** in the final run. It reuses real participant/checklist/photo lifecycle fixtures for valid handoff/return/completion, and separately labelled legacy anomalies for missing records. It covers:

- Shared six-queue membership/count/DTO/pagination checks and exact-ID navigation.
- Current reasons for bookings, listings, reports and disputes; open vs resolved case states; completed records with missing historical handoff/return/inspection.
- Restriction changing after a valid Workbench selection: current context reports no match, rather than trusting the old link.
- Forged original record filters do not select the detail record; actual route ID remains authoritative. Case-to-related-Booking context preserves the return view and explicitly marks a cross-type selected category as not applicable.
- External/forged/repeated/private return metadata is discarded; direct details still render. The four pure navigation unit tests cover canonical round-trip/defaults, unknown/inherited categories, integer limits and unsafe sender paths.
- Anonymous/USER/suspended denials on all four detail routes, no protected checkpoint output, and no new panel exposure of private canaries/contact values.
- Native Admin login; Workbench → report deep link; custody queue page 2 at page size 1 → detail → exact Back restoration; all three viewports. Existing keyboard skip/focus and overflow checks stay intact.
- An actual owned-table outage leaves the underlying Booking detail available while investigation reports unavailable, with no false physical-return checkpoint. The existing Workbench error/retry drill and data-preservation hashes/counts also pass.

The meetup suite includes an additional check **after** genuine synthetic-camera QR and explicit physical-return confirmation, **before** owner inspection acceptance. Both full runs stopped earlier at pickup-camera verification, so that browser-specific assertion was **not reached**. It is not reported as passed.

A separate explicit `test:investigation-receipt` mode reuses the existing owned meetup fixture helpers and actual application APIs for geofenced checks, challenge issuance/verification, participant condition acknowledgements and physical receipt. It uses the existing **manual-code transport of the same QR challenge protocol**, without fabricating positive rows or mocking verification. It passed **2/2**, showing recorded physical return via the completed challenge while inspection acceptance remains unestablished. This independently verifies the new checkpoint explanation; it does **not** certify camera decoding. The mode is explicitly selected only by the owned isolated test harness, never by production application configuration, and does not change the default full meetup run.

## Initial results and reproducibility limits

All recorded Workbench/context iterations passed; intermediate successful runs covered progressively expanded cases and are retained separately from the final layout evidence. They are not called blind retries. No existing security/login/camera deadline was increased, and Batch 6B's document-navigation fix remains unchanged.

The initial meetup run reported **7/9**: its existing synthetic-camera pickup assertion did not reach “Verified booking” within the existing 20 seconds, before the new context assertion was reached. Bounded diagnostics show the borrower video readyState 4 at 640×480 and playing; this does not establish why decoding/verification failed. The failure is retained separately and is not attributed to the new detail panel. The bounded fresh-owned recheck also reported **7/9 at the same assertion**, again before the new context assertion. This is an unresolved full-regression blocker, not a green meetup result. Both failures and bounded video diagnostics remain in the evidence. No third blind camera retry was made and no QR/GPS/camera/evidence/consent check was relaxed. The later scoped API receipt test is listed separately and is not substituted for either failed full run.

The original and expanded unit suites, all existing authorization boundaries, current Admin actions and immutable evidence remain covered. A finite set of successful runs does not establish universal camera/login reliability or production-scale performance. Shared queue reads can scan larger source sets; measured load/EXPLAIN work and any index/keyset change remain a separate review, not an unapproved migration here.

## Verification ledger

| Command | Reported tests | Actual selected result |
| --- | ---: | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | — | Pass, exit 0 |
| `npm run lint` | — | Pass, exit 0 |
| `npm run test:unit` | 64 | Pass, exit 0 |
| `npx prisma validate --config prisma7.config.ts` | — | Pass, exit 0 |
| `npm run build:verify` | — | Pass; owned DB removed |
| `npm run test:admin-migration` | 1 | Pass; owned DB removed |
| `npm run test:admin-own-session` | 6 | Pass; owned DB removed |
| `npm run test:admin` | 7 | Pass; owned DB removed |
| `npm run test:approval-migration` | 4 | Pass; owned DB removed |
| `npm run test:approval` | 18 | Pass; owned DB removed |
| `npm run test:authorization` | 8 | Pass; owned DB removed |
| `npm run test:chat` | 14 | Pass; owned DB removed |
| `npm run test:database-principals` | 7 | Pass; owned DB removed |
| `npm run test:execution-rehearsal` | 18 | Pass; owned DB removed |
| `npm run test:investigation-receipt` | 2 | Pass; owned DB removed |
| `npm run test:login-navigation` | 7 | Pass; owned DB removed |
| `npm run test:login-readiness` | 1 | Pass; owned DB removed |
| `npm run test:meetup-migration` | 1 | Pass; owned DB removed |
| `npm run test:meetup` | 9 | **FAIL: 7/9; camera gate unresolved**; owned DB removed |
| `npm run test:mfa-migration` | 4 | Pass; owned DB removed |
| `npm run test:mfa-pilot-disabled` | 1 | Pass; owned DB removed |
| `npm run test:mfa-pilot-production` | 1 | Pass; owned DB removed |
| `npm run test:mfa-pilot` | 13 | Pass; owned DB removed |
| `npm run test:mfa` | 16 | Pass; owned DB removed |
| `npm run test:migration` | — | Pass; owned DB removed |
| `npm run test:moderation` | 10 | Pass; owned DB removed |
| `npm run test:rental-api` | 13 | Pass; owned DB removed |
| `npm run test:rental-browser` | 4 | Pass; owned DB removed |
| `npm run test:scoped-reads` | 10 | Pass; owned DB removed |
| `npm run test:stability` | 8 | Pass; owned DB removed |
| `npm run test:staff-migration` | 4 | Pass; owned DB removed |
| `npm run test:staff-read-pilot` | 14 | Pass; owned DB removed |
| `npm run test:staff-schema` | 8 | Pass; owned DB removed |
| `npm run test:staff-session-migration` | 4 | Pass; owned DB removed |
| `npm run test:staff-session` | 13 | Pass; owned DB removed |
| `npm run test:workbench` | 7 | Pass; owned DB removed |

[verification.json](../security/batch7b/verification.json) records exact actual child exits, artifact IDs, times, intermediate successes, initial failure/recheck and database cleanup. The wrapper's own exit is not substituted for its children. Counts include Node parent tests. The 64 unit tests include four navigation tests; selected final commands are listed once.

Changing tests use newly created owned `hustlen_test_b7b_*` databases with effective-target checks and run-specific ownership markers. Positive lifecycle/QR proof runs through existing application routes. Fault injection/temporary fixture changes are restricted to that owned DB and restored before cleanup. Historical fresh/populated migration tests preserve representative sessions/users/bookings/reviewers/audits/evidence, rollback/replay and old-client compatibility. No application DB is reset, migrated, seeded or modified.

[Baseline preservation](../security/batch7b/baseline-preservation.json) verifies all 23 historical SQL migrations, Prisma schema, lockfile, auth/logout, existing Admin APIs and guards, staff/MFA/approval/read code, approved Operations policy documents and official MRT/custody/location source. The four read-only wrappers/common queue composition and two render slots are the intentional changes, not a claim that those source files are unchanged. [Cleanup](../security/batch7b/cleanup.json) records the final read-only maintenance catalog check.

Reproduce using `npm run test:workbench`, `npm run test:unit` and `npm run test:meetup`, with a new validated unused `MRT_TEST_DATABASE_URL` distinct from the application database for every changing run. The existing isolated harness provisions/verifies forward fixtures and removes owned DB/uploads/principals. Configure supported Chromium through MRT_BROWSER_PATH/CHROMIUM_PATH when needed. The full meetup command remains failed as described above; other selected checks passed. Complete command results are above; ignored `.test-artifacts/<runid>` hold local diagnostics, while committed evidence is bounded and contains no raw QR secrets, cookies, private narratives or evidence bytes.

## Remaining gaps and Batch 7C recommendation

No assignments, staff identities, response SLAs, urgency, automatic remediation, sanctions, custody override, listing mutation, recovery, approval executor or AI operation is added. An investigation explanation is not a resolution or legal finding. Existing evidence authorization remains the only route to protected materials. Related links in the new panel preserve context; other legacy links still use normal direct navigation.

**First Batch 7C prerequisite:** investigate the unresolved pickup-camera verification failure with bounded scanner/video/browser diagnostics and physical-device coverage. Require genuine camera acceptance before treating the complete meetup regression gate as green; do not relax GPS, QR, consent, evidence or deadlines. The cause has not been established by this batch.

After that gate is resolved, recommend **a focused read-only case-history navigation improvement**: connect the existing CaseHistory/audit views and related-record links to the same validated return envelope and make chronological case transitions easier to follow using existing records. First audit current `CaseHistory`/audit pagination and approve exact bounded metadata, so the next batch enhances existing views instead of duplicating them or introducing mutable staff notes. Keep private narratives/evidence behind current guards and carry no evidence selectors or free text in URLs.

Real Operations activation still needs the separately approved identity/sponsor/cohort/lifetime/recovery/retention/origin policies, genuinely isolated privileged service/secrets, trusted real staff-session issuer/scoped access layer and exact reviewed additive activation migration. This context panel supplies none of those activation rights.

Exact inventory: [changed-files.txt](../security/batch7b/changed-files.txt). No merge, push, deployment, real staff provisioning, active grant, approval execution, recovery, operational mutation power or AI administration occurred. Stop at the isolated review commit.
