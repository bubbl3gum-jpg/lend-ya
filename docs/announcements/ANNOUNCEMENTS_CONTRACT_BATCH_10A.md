# Announcement candidate lifecycle and privacy — Batch 10A

This is a functional, persisted, **owned-development informational fixture**, not production publication approval. Legacy ACTIVE Admins may inspect the directory and history. Only exact allowlisted development Admin testers may mutate or enter the demonstration audience. There is no new staff authority.

## Routes and functional surface

- `app/admin/announcements/page.tsx`: guarded directory, draft editor, text preview, schedule/publication, archive/withdrawal and history, using `components/admin/announcements.tsx`.
- `app/api/admin/announcements/route.ts`: GET directory or a single validated `history` UUID; POST one exact command. Existing `adminApi` guard plus service guards. Private/no-store and Vary Cookie. No arbitrary selector, actor, role, audience, risk, HTML, notification or URL field.
- `app/dev/announcements/page.tsx`: separately guarded, dynamic test-audience page; rejects URL selectors. No marketplace/homepage insertion, notification provider or delivery statistics. Production proxy refuses this page even with the flag set. Service gating independently refuses production mutations.
- `lib/announcements/service.ts`: current account/session from trusted cookies and persisted User/AuthSession. Every service resolves current authority. The write transaction rechecks account and session after obtaining the idempotency lock. No membership, grant, approval or execution activation.

## Owned configuration and cleanup

`lib/announcements/config.ts` requires NODE_ENV=development, `HUSTLEN_ANNOUNCEMENT_CANDIDATE=owned-informational-only`, a 24-hex `MRT_TEST_RUN_ID`, exact matching DATABASE_URL/TEST_DATABASE_URL/MRT_TEST_DATABASE_URL, strict local disposable `hustlen_test_*` target, exact `HUSTLEN_ANNOUNCEMENT_ORIGIN=http://localhost:<port>` and bounded explicit `HUSTLEN_ANNOUNCEMENT_ADMIN_IDS`. No origin, ID mapping, role or policy is taken from the browser. Effective pg Client host/port/database are checked; the live DB name and exact `hustlen-mrt-test:<runId>` ownership comment are checked before candidate access. Ambient PostgreSQL/URL overrides are rejected by the existing isolation guard before connecting. URLs/credentials and allowlist values are never displayed.

Run `npm run test:announcements`, `npm run test:announcements-migration`, `npm run test:announcements-production` through `tests/run-isolated.ts`, with MRT_TEST_DATABASE_URL pointing to an explicitly chosen **absent** owned local test DB. The runner creates/marks/migrates it, starts the candidate, supplies tester ID 1 and pinned free-port origin, then verifies ownership before cleanup. It will not adopt an existing DB. Do not point these commands at a retained demo or application DB; do not manually migrate the existing app. Artifacts go to ignored `.test-artifacts/<runId>`. The tests create synthetic accounts inside their newly owned DB only. Whole-DB disposal removes notice content/history along with all fixture data. No seed or real staff provisioning is required or authorized. Production migrations/releases remain separate review work because the inherited chain includes owned-test-only Support migrations.

## Candidate data / transitions

`prisma/schema.prisma` adds Announcement and AnnouncementEvent, plus two reverse User relations (no existing columns changed). Forward migration `20261026090000_announcement_candidate/migration.sql` creates only new objects in a transaction. All old migration bytes remain untouched.

- ID: database-generated UUID, immutable. Trusted creator references User; both announcement and event use actual DB timestamps. UTC timestamptz(3), rendered via `formatRentalTime` in Asia/Taipei. A client timestamp never sets attribution or audit time.
- Content: required title 1–120 and body 1–4000 JavaScript characters (DB lengths also bounded). Text only; markup delimiters and unsafe controls rejected; React escapes all rendered content. No links auto-rendered, embeds, HTML, image beacons or arbitrary request snapshots.
- Fixed audience `OWNED_TEST_ADMIN`. No public/logged-in/Owner/Borrower targeting; all notices in this candidate are fixture informational content. High-impact, emergency, safety-critical or platform-wide publication has no command or live audience.
- Persisted states exactly DRAFT, PUBLISHED, ARCHIVED. Create always DRAFT v1. EDIT only DRAFT. PUBLISH only DRAFT, with explicit UTC start/expiry in years 2000–2100 and a positive window ≤31 days (test policy). A persisted PUBLISHED notice is labelled SCHEDULED before start, ACTIVE during `[start, expiry)`, EXPIRED at expiry. WITHDRAW only PUBLISHED → ARCHIVED. ARCHIVE only DRAFT → ARCHIVED. ARCHIVED is terminal. Published content/windows cannot be overwritten. Make a new draft for a correction; no deletion action.
- Candidate quota 100 notices, 500 revisions per notice (last slot reserved for withdrawal/archive); no fabricated pagination/counts. Directory/history are bounded to those caps. No production quota or retention policy is approved by these values.

## Visibility / time

The reader projection selects only `id,title,body,startsAt,expiresAt`, where persisted state=PUBLISHED, audience=OWNED_TEST_ADMIN, `startsAt <= statement_timestamp()` and `expiresAt > statement_timestamp()`. Authorization precedes the query. SQL uses the database server clock; browser time/audience and client filters cannot publish drafts or resurrect expired/withdrawn notices. There is no cross-request cache; server rendering and API reads are no-store. A page already loaded is a snapshot, not remote erasure of a reader's memory; reload requests re-evaluate visibility. No worker is needed to derive this view. Any later email/SMS/push delivery needs separately approved outbox, provider, retries, idempotency, audience snapshots, retention and cancellation semantics.

## Atomicity and immutable history

Each command contains a UUID requestId and (except CREATE) exact id/version. Fixed command shapes are validated before writes. Transaction-scoped PostgreSQL advisory locks serialize identical retry keys, then row locks and version comparison serialize edits. Same key + same actor + same canonical command hash returns the original id/version, without duplicate mutation/event. Different payload/actor with that key returns 409. Lost-edit/transition conflicts return 409. No automatic retry changes content or elevates risk.

The mutation and AnnouncementEvent insert share one Prisma transaction. Event stores generated id, exact announcement id, trusted actor id, fixed action, previous/resulting versions, requestId, SHA-256 command hash and actual DB timestamp. No body snapshot, token, raw request, private case content, GPS or user-selected attribution. Historical metadata records who changed which revision; old draft bodies are deliberately not reconstructable. Any production need for retained content snapshots requires explicit privacy/retention approval.

Unique requestId and `(announcementId,resultingVersion)`, forward version checks, foreign keys, ownership guard, append-only event UPDATE/DELETE refusal, and TRUNCATE refusal apply at DB level. Deferred mutual revision/event constraints reject eventless mutations at commit. Published title/body/windows and immutable identity/creator/createdAt cannot change. Fault-injected event failure rolls back creation, draft editing and publication. DB-owner/superuser control can disable triggers and remains a trusted infrastructure boundary; this candidate does not claim protection against a malicious database owner or provide a production least-privilege publisher principal.

## Security boundary and remaining limits

Exact pinned Origin/Host, application/json, bounded 32KiB parser, no query selectors on POST, and cross-site rejection supplement unchanged proxy CSRF checks. Mutation service performs its own candidate/actor/session checks; hiding buttons is not authorization. Production may use safe Admin read views only after a separately approved migration/deployment path; nothing in this batch authorizes deployment.

No connection to approval executor, no broad ADMIN OR STAFF fallback, no role grants, no general status/settings editor. The isolation and caps are candidate containment, not a production anti-abuse or independent-approval design. Live author/publisher allocation, risk categories, ownership/conflict rules, emergency procedure, retention/deletion, localization and delivery remain in the product decision register.
