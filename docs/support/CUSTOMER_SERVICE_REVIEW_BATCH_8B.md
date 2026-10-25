# Batch 8B independent review: isolated ticket intake candidate

**Starting Batch 8A SHA: 1d921d2f42e6137266877e2d2f5c48997a71e2b4.** Working tree was clean and ancestry from Batch 7D `fec839b7b62711733b94210aba55fdcb6d599f29` verified. Isolated branch: **feature/customer-service-ticket-intake-batch-8b**. Main closeout gives the exact final implementation SHA. No push, merge, deployment or existing application-database migration.

## Outcome and mandatory policy gate

Implemented a genuine requester-only creation/list/detail workflow **only in an owned development candidate**, disabled in production/default environments. The explicit request allowed this candidate despite unresolved policy; no approval is invented. [Policy mapping](SUPPORT_TICKET_POLICY_MAPPING_BATCH_8B.md) identifies unresolved retention/deletion/legal holds, final eligibility (including suspended obligations), lifecycle, rate limits and notifications. The working categories and candidate-only quota are not production policy. No Support Agent roles, assignments, private conversations, Admin ticket reader or operational recovery is enabled.

[Schema, service, DTO, idempotency and UI contract](SUPPORT_TICKET_CONTRACT_BATCH_8B.md) gives exact source paths and integrity behavior. Text-only intake references one eligible existing record or none. Creation atomically persists the initial append-only event; no status-transition API exists. Reports/disputes/chat stay canonical and are never copied into tickets. The existing public help and case-focused Admin Support remain functional.

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
| `npm run test:mvp` | Exit 0; ℹ pass 11; owned cleanup confirmed |
| `npm run test:rental-api` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:rental-browser` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:scoped-reads` | Exit 0; ℹ pass 10; owned cleanup confirmed |
| `npm run test:stability` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:staff-read-pilot` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:staff-schema` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-session-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:staff-session` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:support-ticket-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-ticket-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-tickets` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 75/75 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

[Actual results ledger](../security/batch8b/verification.json) keeps initial failures, corrections and final child outcomes separate. The wrapper's exit is not substituted for child exit. Changing tests use only new verified owned hustlen_test_b8b_* databases. Node counts include parent tests. UTC artifact timestamps are machine evidence; UI timestamps use Asia/Taipei.

Screenshots: [desktop](../security/batch8b/ticket-desktop.png), [tablet](../security/batch8b/ticket-tablet.png), [mobile](../security/batch8b/ticket-mobile.png). Actual native browser login/create/own-list/detail flows run at all three viewports; screenshots use public synthetic requester text only. [Requester privacy/atomicity/idempotency proof](../security/batch8b/ticket-security.json), [populated upgrade preservation](../security/batch8b/support-ticket-preservation.json), [production refusal](../security/batch8b/production-refusal.json).

The full default camera meetup suite must complete genuine virtual-camera **pickup and return** and the 7B post-return checkpoint. [Pickup](../security/batch8b/camera-pickup.json), [return](../security/batch8b/camera-return.json), [post-return proof](../security/batch8b/investigation-qr-receipt.json) are safe metadata only. Manual-code protocol tests stay separate. Physical-device camera acceptance remains outstanding from 7C; this batch does not certify actual iOS/Android cameras.

Initial outcomes and corrections, kept separate from final passes:

- Initial candidate intake/browser suite passed 6/6. Initial populated-upgrade run failed its old-client check because the copied test expected MFA to be absent; the actual Batch 8A client already includes MFA. The assertion was corrected to require MFA and exclude only SupportTicket. No existing MFA implementation or security expectation was removed.
- The existing migration regression detected a genuine initial schema mismatch: SQL foreign keys and composite unique keys were missing from the Prisma model. The schema was updated to represent those constraints (including inverse relations on existing models); no SQL protection was removed. Follow-up combined schema diff is empty. Initial drift result is retained.
- Candidate and upgrade suites were repeated after adding an independent owned-database INSERT guard, with negative marker and direct cross-booking SQL checks. Configured development production refusal passed; final candidate remains 6/6 and upgrade 4/4.
- Moderation passed all nine functional subtests but failed parent teardown because its legacy TRUNCATE CASCADE reached protected ticket/event tables. MVP's initial run likewise passed ten functional subtests then failed old teardown (the module had loaded before its corresponding cleanup edit). Both now rely on ownership-verified whole-database disposal in run-isolated.ts; immutable triggers and all functional assertions remain. Follow-ups pass 10/10 moderation and 11/11 MVP.
- A temporary guarded edit script stopped before applying the second teardown edit; the missing change was applied explicitly. This is recorded as tooling iteration, not an application authorization failure.
- A repeated production-mode check overlapped MVP's production build. Next refused the concurrent build lock before any tests started. It was rerun alone after completion with unchanged deadlines/assertions and passed 1/1. No framework lock or timeout was disabled.
- Final read-page review added bounded operational error wrapping after database reads and a browser unavailable-state assertion. Its first locator matched both the application alert and Next route announcer (4/6 plus parent failure); scoping it to main content fixed the test. The final browser run confirms generic unavailable feedback and no private ticket text; final build/type/lint pass.

Runners used at most two groups concurrently each; candidate, security, browser and meetup/build jobs overlapped at retained timestamps. Follow-ups used fresh owned databases; the final production check ran alone. Initial results are not combined into a misleading passing aggregate. No QR/GPS/camera/evidence/consent requirement or assertion deadline was weakened.

## Integrity, preservation and limits

[Baseline hashes](../security/batch8b/baseline-preservation.json) preserve existing auth/session/role, evidence/custody, QR/GPS/consent/camera, chat, staff/MFA/approval, case-history and Admin service implementations, official MRT data and all 23 historical migrations. Prisma changes add candidate models/inverse relations only; the new SQL migration creates two candidate tables and supporting integrity objects with no legacy row updates. Read old-client and populated-fixture results alongside the fresh-install tests; no existing database is reset or migrated. [Cleanup](../security/batch8b/cleanup.json) confirms final ownership-scoped disposal.

Candidate limits: only allowlisted ACTIVE users in verified localhost test environments; only RECEIVED/version 1; no edits/transitions; no attachments/messages/notifications; no production rate/retention policy; no durable staff-private-ticket access audit; no private Admin ticket reader. Runtime service ownership is independent of HTTP and DB triggers enforce typed relationship/initial event integrity, but there is no new requester-specific RLS/principal deployment. Future scoped staff/conversation access cannot rely on broad legacy runtime grants. Test-only data is removed with its owned DB; immutable history is not a lawful-retention policy for real users. Free-text warnings are not automated PII detection. Offset list pagination is not a frozen multi-request snapshot.

## Concrete Batch 8C private-conversation proposal

1. Resolve and explicitly approve the policy register before any production migration/intake activation: final categories/eligibility/link rules, suspended-user obligations, lifecycle/closure/reopening, content/metadata/hash/audit retention and legal holds, production abuse/rate controls and notifications. Review the candidate-only CHECKs/ownership restrictions and migration path under a separate approved release. Do not silently amend applied historical SQL or skip migrations.
2. After approval, design separate SupportParticipantChannel and message storage, linking exact ticket + authenticated participant side. Owner–Support and Borrower–Support have independent UUIDs, queries, sequences, receipts and attachment scopes. One participant must not learn opposite-channel content, metadata, existence, unread counts or notifications merely from a shared booking. General-account/report cases need approved participant rules; do not automatically invite an opposite party.
3. Before staff access, implement/review exact assignment, channel grants, live trusted session/authorization-version revocation, participant/alias/investigator conflict checks and fail-closed durable access audit via the existing staff-security foundation. No ADMIN OR SUPPORT_AGENT fallback or automatic role provisioning. Enforce trusted scoped database selection/functions/RLS/least privileges appropriate to the reviewed connection architecture; client-set actor/GUC claims are insufficient. If that binding is not available, block private messaging rollout.
4. Start with tightly scoped text-only own-channel operations and idempotency/concurrent ordering, not transcript import or broad support inbox access. Keep staff notes separate and private. No automatic forwarding/copying/AI summarization; any mediation requires approved exact content/version/audience/disclosure basis and independently authorized sensitive sharing. Existing rental/chat evidence references need separate approved access; no automatic attachments.
5. Test Owner↔Borrower isolation at HTTP/service/database/socket/notification/download boundaries, exact assignee scopes, revocation races, expired/suspended sessions, malicious IDs/role claims, audit/event failure, idempotent retries, lifecycle concurrency, retention/holds, fresh/populated upgrades and old-client compatibility. Preserve all existing case, booking, evidence and actual camera regressions. Ticket/channel closure must never imply rental completion, physical return, inspection acceptance or dispute resolution. Recovery, sanctions, payments, approval execution and AI remain excluded.

Reproduce only through `tests/run-isolated.ts` with an absent local owned test database and installed Chromium/ffmpeg. New commands: `test:support-tickets`, `test:support-ticket-migration`, `test:support-ticket-production`; the harness pins candidate origin/allowlist/explicit test quota for the positive fixtures. Do not use real user submissions. [Changed-file inventory](../security/batch8b/changed-files.txt). Stop at the isolated review commit.
