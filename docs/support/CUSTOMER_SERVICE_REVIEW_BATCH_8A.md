# Batch 8A Customer Service foundation review

Baseline: clean Batch 7D **fec839b7b62711733b94210aba55fdcb6d599f29** on `feature/case-history-audit-navigation-batch-7d`, verified descendant of corrected 7C **93d3c646abc44e8298f2acd9bc3d57507f0691fe**. Isolated implementation branch: **feature/customer-service-foundation-batch-8a**. The main closeout supplies the exact final Batch 8A SHA; this review is committed with the implementation. No merge or deployment.

## Delivered

Community → **Support** now opens a useful read-only case workspace for existing ACTIVE legacy Admins. Open/historical listing reports and booking disputes share one typed directory with separate genuine counts, exact type/ID filters, bounded pagination, actual creation/latest-resolution timestamps, safe related-record links and the existing history/audit workflow. The directory purpose differs from Operations Workbench's six current exception queues; its counts never pretend to be tickets, assignments, SLAs, unique incidents or tasks.

No ticket, conversation, assignment, lifecycle writer, staff role or capability is activated. The existing marketplace chat, public Customer Service help, report/dispute intake/actions, QR/GPS/camera/consent/custody, protected evidence, passkey pilot, staff sessions and approval safeguards stay unchanged.

Review documents:

- [Current implementation audit, DTO/count/navigation/access-log contract](SUPPORT_WORKSPACE_CONTRACT_BATCH_8A.md).
- [Implementation-ready ticket/channel proposal with schema and access constraints](SUPPORT_TICKET_PROPOSAL_BATCH_8A.md).
- [Approved principles versus unresolved product decisions](SUPPORT_PRODUCT_DECISIONS_BATCH_8A.md).
- [Exact changed-file inventory](../security/batch8a/changed-files.txt).

## Verification and evidence

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
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 73/73 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

[Actual execution ledger](../security/batch8a/verification.json) records child exits, timestamps, separate initial failures, owned database cleanup and concurrency conditions. All changing tests use newly created verified owned `hustlen_test_b8a_*` databases. Test wrappers' own success is not substituted for child outcomes. Node counts include parent tests.

Focused fixtures verify four original real existing case records (two report/dispute numeric-ID collisions), genuine administrative report/dispute resolution audit rows, shared parent relationships, persisted historical timeline fields, a missing legacy resolution timestamp, source-row equality before/after reads, 28-case pagination and current-state counts. Additional owned historical fixtures are explicitly synthetic, not future ticket policy or a claim of real physical custody. No production record is backfilled or modified.

Browser evidence: [desktop](../security/batch8a/support-desktop.png), [tablet](../security/batch8a/support-tablet.png), [mobile](../security/batch8a/support-mobile.png). Real login, Community navigation, accessible filters, previous/next pages, history/audit paths, browser Back restoring Support filters, keyboard Workbench return and independent page denial are tested. The new list and links expose no private case narrative, participant contact, evidence or credentials; private fixture canaries are asserted absent. [Security proof](../security/batch8a/support-security.json), [pagination benchmark](../security/batch8a/support-pagination.json), [access-log allowlist proof](../security/batch8a/support-access-audit.json).

Initial outcomes remain separate from final passes:

- Initial focused run: 6/8 (one browser subtest and its parent failed). Exact selection labels were not discoverable because an implicit label included option text. A standalone real-browser HTML reproduction showed zero exact-label matches; explicit aria-labels fixed the new filter controls. No navigation/security timeout was increased.
- Next focused run: 6/8. After a pagination click, the test read the URL before Next navigation committed. It now waits for the expected page parameter using the existing default URL assertion deadline, matching other browser checks. No application retry or authentication change was added.
- The corrected focused run passed 8/8. Review subsequently found that Reset dropped a valid Workbench envelope; the new page now preserves it, with a browser assertion and fresh final focused/build verification. A subsequent new-page-only metric-title spacing adjustment aligned values across wrapped labels; screenshots and production build were regenerated and the final focused run again passed 8/8.
- The first fixture snapshot helper issued simultaneous queries on one pg Client and produced a deprecation warning. Those test-only reads were made sequential before the passing run; the application already uses one bound SQL statement and did not require a driver/dependency change.
- The legacy Admin suite initially reported 5/7 because its exact sidebar inventory lacked the newly implemented `/admin/support` link. The expectation was extended with that one route; all existing entries and authorization assertions remain. Its follow-up outcome is recorded separately in the ledger.
- One accidental nonexistent-script invocation (`test:support-workspace-invalid-command`) failed in npm before test/harness startup. It created no test database, is retained as a tooling error, and is not counted as an executed regression suite.

Initial runners used at most two groups concurrently each; security, meetup/build, browser, focused UI and the Admin follow-up overlapped at recorded times. Every changing invocation used a fresh owned database. No timeout increase, blind retry or suppressed initial failure is used to claim success. Machine artifact timestamps are UTC; the UI renders Asia/Taipei.

The full default `test:meetup` retains actual virtual-camera pickup **and return**, real scanner/server verification and the 7B post-return investigation assertion. Manual-code protocol/response-loss tests are separate. Selected [pickup](../security/batch8a/camera-pickup.json), [return](../security/batch8a/camera-return.json) and [post-return evidence](../security/batch8a/investigation-qr-receipt.json) contain bounded metadata only; no QR secrets/pixels/video are committed. Physical iOS/Android camera, secure-origin, focus/glare/performance and lifecycle certification remains outstanding from 7C, not newly certified by this UI batch.

## Security, preservation and limitations

Page and API guards plus an independent service guard require a current persisted ACTIVE legacy ADMIN. Client role/actor/assignment/evidence selectors are not trusted; future Support Agent roles do not authorize this endpoint. Fixed typed projections exclude private content; existing detailed case/evidence routes retain their own checks. Read responses are private/no-store. Proxy CSRF/production-pilot refusal logic is unchanged; only the Support page matcher is added. One SQL statement snapshot computes counts/page; no per-case queries or new schema/index. Timestamp ties and typed IDs sort deterministically; offset pages are not a multi-request frozen snapshot under concurrent changes. HTTP-level fixture timing is not production-scale sizing.

Successful Support reads have bounded metadata-only operational logs with server-resolved administrator ID, normalized filters, time and returned count. These are **not durable immutable case-history audits**, and log collection/retention is an operational dependency. Existing private evidence audit remains; new staff/private-thread access must wait for approved fail-closed durable access auditing and exact scoped data access. The broad legacy audit directory exposes reasons, actor details and state JSON; it must not be reused by simply granting Support Agents ADMIN or adding a fallback guard.

[Preservation hashes](../security/batch8a/baseline-preservation.json) cover the earlier application/API/detail/history/authorization/chat/evidence/staff/MFA/approval/camera implementations, all historical migrations/schema, official MRT data, baseline tests and existing planning policies. Only the sidebar link, proxy matcher, test dispatch/unit inventory, one exact legacy navigation expectation and test script additions alter existing files. Existing populated [staff](../security/batch8a/staff-preservation.json) and [MFA](../security/batch8a/mfa-preservation.json) migration regressions preserve their earlier historical fixtures; their fixture baseline SHAs do not replace the 7D starting commit. [Read-only maintenance cleanup check](../security/batch8a/cleanup.json) verifies no batch-owned databases or test principals remain. No real application database is migrated, reset, seeded or modified.

Support intentionally has no participant private-message reader, general notes search, attachment display, staff assignment, ticket priority/SLA, notification delivery or new resolution control. Browser Back restores Support filters; explicit case-history Back links still target validated Workbench context. Legacy incomplete histories remain incomplete. Permanent ticket deployment is blocked on unresolved ownership/category/retention/lifecycle decisions, not supplied by fixture defaults.

## Concrete Batch 8B plan and approval gates

1. **Approve the decision register first.** Record exact creators/relationship eligibility, categories, ticket/shared-field visibility, lifecycle/reopening, retention/deletion/holds, intake limits and notification policy. Recommend text-only requester intake initially; attachment, mediation, email delivery and staff-role rollout stay deferred unless independently approved. Do not create a migration from unapproved candidate states or defaults.
2. After approval, review additive SupportTicket, minimal participant relationship/channel boundary and append-only lifecycle event SQL/Prisma design. Preserve canonical Report/Dispute/Conversation and immutable historical records. Enforce primary/same-case links, trusted requester identity, idempotency and transactional lifecycle versions. Run fresh/populated migration, partial-failure/replay and old-client compatibility fixtures in newly owned databases only.
3. Implement narrowly scoped authenticated **requester intake and own-ticket receipt/status read** with server-derived participant relationship and minimal DTO; do not expose staff inbox messaging or cross-party channel creation implicitly. Test unauthorized/cross-case references, duplicate requests/concurrency, suspended-account support obligations according to the approved policy, content limits, CSRF/no-store, safe logging, unavailable DB and unchanged booking/evidence records.
4. Keep any initial Admin review read-only and explicit. Before future Support staff/private threads, require a separately reviewed scoped DAL, exact live assignment/channel grants, trusted staff session/version revocation and durable fail-closed audit through the existing foundation. Prove Owner cannot read Borrower–Support content/metadata and vice versa at HTTP, service and database privilege boundaries, including downloads, sockets and notifications. No unrestricted legacy ADMIN fallback.
5. Gate production rollout on independent privacy/security review, complete migration/preservation evidence, all current regression suites including actual pickup/return camera acceptance, and approved operational retention/response procedures. Independent high-risk approvals, serious sanctions, custody/evidence edits, passkey recovery, payments and AI remain outside this plan. If required policy or trusted database scope is unavailable, report that gate blocked rather than invent a bypass.

Reproduce with the existing fresh-owned harness: configure an absent local `hustlen_test_*` name in `MRT_TEST_DATABASE_URL`, distinct from the application database, then `npm run test:support-workspace`. Never adopt an existing DB. Chromium path is supplied through existing browser variables; full meetup also requires ffmpeg. Static commands and each regression command are recorded above. No ticket-model migration exists in this batch.
