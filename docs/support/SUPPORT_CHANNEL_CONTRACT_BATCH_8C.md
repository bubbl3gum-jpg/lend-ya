# Private support channel contract — Batch 8C

Baseline: Batch 8B `86eef8c00745f9625d4e6b56ba420bd0e8734d44`. Candidate branch: `feature/private-support-channel-foundation-batch-8c`.

## Boundary and ownership

This is a requester-only, synthetic-data development candidate. It is not a live Support conversation: no staff can receive, read or reply, and no delivery, notification or resolution is represented. A requester is resolved from the existing authenticated ACTIVE account/session and candidate allowlist. This does not certify a canonical verified human. Existing ADMIN and ChatReviewer status confer no channel access.

One immutable channel belongs to exactly one ticket and its exact requester. Owner and Borrower on a shared booking must submit independent tickets; neither submission creates an opposite-party ticket/channel. All reads select exact UUID plus requester predicates before disclosure. Foreign, malformed and missing resource identifiers return the same unavailable response. No opposite-channel existence/count/timestamp is returned.

`lib/support/channels.ts` enforces ownership independently of HTTP. `lib/support/channel-input.ts` accepts only content and UUID retry key for messages and one bounded cursor for reads. `lib/support/channel-config.ts` inherits the 8B localhost/owned-marker/allowlist checks and requires its own flag and explicit development message quota. `lib/support/tickets.ts` validates the effective database target and exact run ownership marker. Browser role, author, owner, membership, assignment, assurance or policy claims are rejected.

## Relationship rules

The database function `support_channel_candidate_side` reads minimal relationship metadata only, after service ownership selection. Linked booking/dispute: exact recorded Owner or Borrower. Listing: exact listing owner. Report: exact reporter; self-reports against one's own listing are blocked. Unlinked account ticket: REQUESTER, without importing booking authority. Same-account booking Owner/Borrower is ambiguous and blocked. Ineligible or changed relationship denies message access. Different recorded account IDs do not establish different humans; unresolved duplicate-human/alias cases block future independent staff authority. No implicit mediation audience exists.

## Storage and consistency

`prisma/migrations/20261025160000_support_private_channel_candidate/migration.sql` refuses before DDL unless the actual database is `hustlen_test_*` with a valid owned test comment. It adds no production data and updates no legacy rows. Historical migrations remain byte-identical.

- SupportParticipantChannel: UUID, ticket, participant account, validated closed-list side, exact candidate policy version, database creation time. Composite foreign key binds ticket/requester; unique ticket prevents multiple requester channels.
- SupportMessage: UUID, channel/ticket/author composite foreign key to that channel's requester; content 1–2000 characters, UUID retry key, SHA-256 request hash, positive sequence, database timestamp. Unique channel/sequence and channel/retry-key constraints.
- INSERT triggers recheck owned database, ACTIVE requester and live relationship, lock in user→ticket/channel order, derive database timestamp and next sequence. UPDATE/DELETE/TRUNCATE are refused. These immutability rules are candidate integrity, not approved production retention.
- Service transactions serialize writes under channel locks. Identical retry returns existing message; changed content with the same key returns conflict. Failure rolls back insertion and ordering. The explicitly configured quota is development-only, not an approved production anti-abuse policy.

## Endpoints and minimal DTOs

| Endpoint | Behaviour |
| --- | --- |
| GET `/api/support/tickets/:id/channel` | Own eligible ticket only; own minimal channel or null |
| POST same, `{}` | Create own channel, 201; existing identical channel, 200 |
| GET `/api/support/channels/:id/messages?after=N` | Own channel; 10 ascending messages, hasMore, nextAfter; no total count |
| POST same | Validated own text/retry key; new 201, replay 200, conflict 409, test quota 429 |

Channel DTO is id, ticketId, relationshipSide, createdAt; message DTO is id, sequence, content, createdAt. Author IDs, hashes, session secrets and foreign metadata are excluded. Responses are private/no-store and vary on Cookie. Write requests require exact configured Origin/Host, same-origin CSRF conditions and JSON. Unknown fields/filters fail closed. Service operational failures use bounded structured error references, not raw private data.

UI: `/customer-service/tickets/:id/channel`, `components/support-requester-channel.tsx`. Explicit candidate warning, no live-support claims, labelled text-only controls, retry handling and bounded pagination. Dates use Asia/Taipei. `proxy.ts` refuses production/default requests independently of the service. A true production build/start test sets both candidate flags and still obtains refusal and zero candidate rows.

## Database privilege and audit assessment

**Staff read/write gate: BLOCKED.** The synthetic candidate uses the existing privileged runtime database owner, which can read all test channels directly. This is not requester-specific RLS, a deployed least-privilege architecture, or a production database privacy certification.

PUBLIC access is revoked on new tables/helpers. `tests/support/database-principals.ts` now excludes Support tables from broad synthetic runtime grants. The integration test creates real temporary migration/runtime/MFA/authorization/inspection principals: four restricted profiles cannot select ticket/channel/message data, insert messages or execute the relationship helper; the privileged owner remains demonstrably broader. This test fixture change does not configure deployment privileges. Composite constraints protect attribution, not disclosure from a privileged owner.

Requester reads do not invent staff-security audit records. Future private staff disclosure requires a separately isolated durable audit writer and fail-closed audit commit before private DTO release. Console logging is insufficient. Next development request logging excludes candidate private UUID routes; bounded operational logs remain. Upstream/access/APM/production logging and retention must be reviewed separately; no production logging certification is claimed.

## Future staff contract — not active

Every action must independently require canonical verified human/account association, current trusted staff session and required real assurance, eligible active membership, exact ticket assignment, exact channel/action grant, persisted authorization versions/revocation, participant/alias/investigator conflicts, resource/lifecycle checks and successful durable access audit. Never use ADMIN OR SUPPORT_AGENT, ChatReviewer or client-set identity/GUC claims. Role strings cannot bypass any resource condition. No staff accounts, active grants or assignments are created here.

Staff replies need a separately reviewed author model and scoped writer. Do not relax the requester composite foreign key to impersonate a requester. Internal notes, private participant messages and mediation disclosures require separate audiences. Existing marketplace chat, booking evidence and dispute narratives remain protected and are never copied into channels.

## Safe setup and cleanup

Use only `tests/run-isolated.ts` and an absent localhost `hustlen_test_*` database target. Harness creates a fresh owned database, pins exact origin/allowlist/test quotas, applies candidate migrations and removes its owned database/uploads in finally. Commands: `npm run test:support-channels`, `npm run test:support-channel-migration`, `npm run test:support-channel-production`. Never run candidate migrations against an application database. Never seed real staff or user content. Do not enable flags on an existing database.

For an interrupted runner, preserve diagnostics, identify the exact run's child processes and ownership manifest, stop only those children, and let its ownership-verified harness dispose the database. Do not use broad DROP/TRUNCATE, remove immutable triggers, or sweep databases by prefix without ownership verification. Final read-only maintenance evidence records remaining owned resources. No raw text, evidence images, QR secrets, token hashes or coordinates belong in review artifacts.
