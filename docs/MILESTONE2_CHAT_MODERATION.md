# Milestone 2 — Private Chat and Trust & Safety MVP

> For the current isolated demo, activity ordering and reconnect recovery, see [Milestone 2.1](MILESTONE21_CHAT_DEMO.md). This report preserves the original Milestone 2 evidence.

## Review scope and release status

Base: `fix/milestone1-core-stability` (`0f5c9ddea4c091f9a073b768c20bad4134317e2e`). Feature: `feature/chat-moderation-mvp`.

Chat is disabled by default. This branch adds persistent listing-scoped conversations and human moderation; it does not deploy, merge, migrate an existing marketplace database, implement payments, QR, mobile, push delivery or AI. No private text is transmitted to a moderation provider. Server processing means this is **not end-to-end encrypted**.

## Functionality and guarantees

| Area | Implemented behavior |
| --- | --- |
| Conversation identity | Unique listing + derived Owner + authenticated Borrower; two participants; no self-contact or forged participants. Existing thread continues across bookings/completion. |
| Delivery | Transactional messages with server timestamps, per-conversation sequence, sender-scoped idempotency keys and durable outbox metadata. The conversation UI polls every three seconds and inbox every five seconds. |
| Recovery | `after` uses update sequence, including late release of older held messages; initial/older history uses creation sequence. Recipient cannot see held/rejected text. |
| Read state | Monotonic delivered-message cursor; unread counts and other-participant read indicators. Hidden message IDs cannot advance read state. |
| Safety | Server normalization, bounded input, duplicate detection, rate buckets, explainable rules and user reports. Flags never automatically suspend or change trust. |
| Reviewer access | Persisted active ADMIN plus explicit enabled ChatReviewer grant, case claim, no own-conversation review, independent appeal reviewer. Queue exposes metadata only. |
| Evidence | Immutable message text/hashes and bounded snapshot references (at most five messages); evidence read commits a persistent audit before returning content. Audit failure withholds content. |
| Decisions | Explicit reason and classification; warning, dismissal, held release/rejection; stale concurrent decisions fail. Corrections append an appeal decision and preserve original warning/history. |
| Blocks | Directional pair-wide block records; either direction prevents new free text and held release, including on other listings. Own block alone can be removed. History/reporting remain accessible. |
| Rental obligations | Blocked/suspended participants retain existing rental actions. Structured support request for a validated active booking records a staff case without sending free text to the other participant or changing booking state. |
| Privacy | No ordinary-log message bodies, request parameters or Prisma error objects. General audit stores references/classification rather than chat text or private decision explanations. |
| Restart | Database messages, cursors, reports, reviewer grants, warnings, cases and outbox survive application restart. |

### Deterministic moderation contract

`ALLOWED` is delivered. `FLAGGED` is delivered and queued. `HELD` is stored for its sender and authorized assigned reviewer, withheld from the recipient. Empty or overlong input fails input validation (400); otherwise text rejected by technical moderation returns `REJECTED` with HTTP 422 and is not stored; human rejection retains a held message as REJECTED for evidence and sender visibility.

Policy `deterministic-mvp-1` recognizes explicit threat/drug-offer/sexual-service-offer patterns in English, Traditional Chinese and Indonesian. Recognized quotation/negation/reporting context downgrades these signals to review rather than hold. Credential requests, direct insults, external HTTP links and repetitive content trigger review. Isolated words about prohibited subjects do not establish wrongdoing. Rule codes/categories/version remain available to scoped reviewers.

This is a limited pattern set, not full language understanding or a legal determination. Slang, code switching, spelling changes, obfuscation and contextual ambiguity can evade it or create false positives. URLs are flagged without fetching, reputation lookup or destination execution. Ordinary allowable marketplace links can therefore create cases. Trained human review and abuse monitoring remain necessary.

New accepted sends: 20/user/minute; new conversations: 5/user/minute; reports: 5/user/day; appeals: 5/user/day; coordination: 3/user/day. Normalized duplicate text is limited for 60 seconds across that sender's conversations. Rate windows are fixed; retries with the same valid idempotency key replay the original message. Changed content/conversation/reference under a reused key returns 409. Reported-message retries deduplicate; conversation reports and coordination requests deduplicate per user/day. These limits are initial configurable-in-code operational choices, requiring product review before broad enablement.

## HTTP API inventory

All routes require the existing cookie session. Participant routes additionally require the server feature flag or explicit preview user ID. Writes accept JSON, reject unknown fields, and retain existing origin checks. Private responses use no-store. Administrative role never bypasses participant history authorization.

| Method/path | Input / purpose |
| --- | --- |
| GET `/api/conversations` | `limit` 1–50, optional `before`; inbox, latest visible message, unread/contact flags, notices and cases |
| POST `/api/conversations` | `{listingId}`; create/reuse continuing conversation |
| GET `/api/conversations/:id/messages` | `limit` 1–50; either `before` creation sequence or `after` update cursor; ordered messages, cursor, nextBefore, hasMore |
| POST `/api/conversations/:id/messages` | `{clientMessageId, body, bookingId?}`; key 8–128 alphanumeric/underscore/hyphen, body at most 4,000 UTF-16 units; booking must match listing and both participants |
| POST `/api/conversations/:id/read` | `{throughMessageId}`; monotonic delivered-message read position |
| POST `/api/conversations/:id/block` | `{blocked: boolean}`; change own directional block |
| POST `/api/conversations/:id/report` | `{messageId?, reason}`; reason up to 1,000 characters; omitted ID reports conversation |
| POST `/api/conversations/:id/coordination` | `{bookingId}`; fixed support request for CONFIRMED/HANDOFF_PENDING/IN_USE/RETURN_PENDING/INSPECTION/DISPUTED booking |
| GET `/api/chat/cases` | Paginated own-target/reporter case decisions and explanations |
| POST `/api/chat/cases/:id/appeal` | `{reason}`; one appeal of a decided original case; at most 1,000 characters |
| GET `/api/admin/chat/cases` | Reviewer-only OPEN queue, `limit`/`before`; metadata only |
| POST `/api/admin/chat/cases/:id/claim` | `{}`; atomic assignment; conflicts rejected |
| GET `/api/admin/chat/cases/:id` | Assigned-reviewer-only bounded evidence; audited on every request |
| POST `/api/admin/chat/cases/:id/decision` | `{action, classification, reason, expectedVersion}`; reason at most 2,000 characters |

Decisions: DISMISS, WARN, RELEASE, REJECT, CORRECT. Classifications: NO_VIOLATION, ILLEGAL_GOODS, PROHIBITED_SOLICITATION, SCAMS, THREATS, HARASSMENT, SPAM, OTHER. HELD messages require RELEASE/REJECT. CORRECT requires an appeal of a warning. An appeal can release a previously rejected held message. Release checks current suspension/block state. Existing account restrictions remain a separate reasoned Admin action; chat does not grant new account-management powers.

Responses expose structured `{error, code}` on failure; 400 malformed/oversized inputs/cursors, 401 missing session, 403 contact/reviewer scope, 404 inaccessible resource, 409 stale/conflicting state, 415 non-JSON content type, 422 technical text rejection, 429 rate/duplicate limit, 503 participant feature disabled. Clients must retain clientMessageId on retry, drain hasMore pages before advancing a polling cursor and merge by message ID/update sequence. Bodies are private user content and must not be copied into analytics/error logs.

## Exact migration requirements

New forward migration: `prisma/migrations/20261019120000_private_chat_safety/migration.sql`, after all existing migrations including `20261019090000_booking_request_idempotency`.

It creates ChatMessageStatus and ten tables: Conversation, ConversationParticipant, ChatMessage, UserBlock, ChatReviewer, ChatModerationCase, MessageReport, ChatWarning, ChatRateLimit, ChatOutboxEvent (the enum is separate). It adds uniqueness/cursor indexes, restrictive foreign keys, input/state checks and evidence-preservation triggers. It depends on the existing `prevent_admin_audit_rewrite()` function. Existing User/Listing/Booking schema changes are Prisma relation fields only; no existing rows are rewritten, backfilled or deleted. No historical migration/checksum changes are required.

Review SQL before any future authorized deployment. PostgreSQL's migration role needs CREATE TABLE/TYPE/INDEX/FUNCTION/TRIGGER and references to existing User, Listing, Booking and audit function. Regenerate Prisma Client (`npx prisma generate`) after installing the locked dependencies. Schema-only diff generation does not need a live/shadow database. Do not use `db push`, `migrate dev`, reset, or migrate deploy against `p2p_marketplace` for review.

The migration was applied only by the isolation runner to newly created owned `hustlen_test_*` databases. Public enablement and live migration are not authorized by this work.

## Safe review instructions

1. Fetch and check out `feature/chat-moderation-mvp`; compare with `fix/milestone1-core-stability`. Existing CI runs on pull requests/manual dispatch and main/integration pushes; a feature-branch push alone does not run GitHub CI. A review PR should target the stabilization base; do not merge or deploy during review.
2. Use the pinned lockfile (`npm ci`) and `npx prisma generate`. Use the existing onboarding service instructions for disposable PostgreSQL and Chromium. Do not point the application or runner at a real database.
3. Set `MRT_TEST_DATABASE_URL` to an **unused** `hustlen_test_*` PostgreSQL database name using a test-only role with database creation rights. The runner creates, records ownership of, migrates and drops it. Existing databases and protected marketplace names are refused. Set `MRT_BROWSER_PATH` to the installed Chromium executable if necessary.
4. Run `npm run test:chat`, `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, then the legacy suites listed below. Each database suite needs a new unused database name; do not manually migrate an existing database to prepare tests. The chat suite starts and restarts its own server, tests disabled and enabled states, and cleans it up.
5. The automated suite is the reproducible UI review path; it creates its own fixtures and browser sessions. A standalone manual fixture-retention tool is not supplied. Any separate manual preview must first be provisioned in an isolated owned sandbox; never reuse the marketplace database. Start with general chat off. Set `CHAT_PREVIEW_USER_IDS` to comma-separated fixture participant IDs for a narrow preview, or use `CHAT_ENABLED=true` only inside the isolated acceptance environment. These are server settings, not browser bypasses.
6. Existing active test ADMIN fixtures additionally need explicit reviewer provisioning. `npx tsx scripts/chat-reviewer.ts <existing-admin-id>` grants only ChatReviewer; append `--revoke` to disable it. This helper requires runner ownership, refuses production and creates a persistent grant audit; it cannot grant ADMIN. No public privilege-grant endpoint exists. A separate approved operational provisioning process is required for production.
7. Use `/messages`, listing “Chat with Owner”, and `/admin/chat`. Two independent approved reviewers are needed to test appeals. Never expose a test server publicly or enable general-user chat as part of this review.

## Retention proposal — approval pending

Proposed discussion starting points: routine chat 90 days after last conversation activity; reported evidence 365 days after final case/appeal closure; evidence-access/decision audits 730 days. Define legal holds, abuse investigations, export/access/deletion rights, account deletion and backup expiry before implementation. These numbers are **not approved or enforced**.

`CHAT_MESSAGE_RETENTION_DAYS` and `CHAT_EVIDENCE_RETENTION_DAYS` accept positive day counts and expose configured values; unset means undecided. `automaticDeletionEnabled` is always false. No retention/deletion job is installed. Evidence-preservation triggers deliberately prevent message/case deletion and editing of original evidence. A future approved purge process must preserve holds, audit authorized deletion and handle restrictive foreign keys; setting a day count alone never deletes records. Current storage is indefinite pending that decision; disclose this to preview users.

## Remaining operational/security limitations and decisions

- Approve rules, hold thresholds, links policy, rate limits, user notices, false-positive handling and reviewer response targets before public enablement. No automatic suspension, trust reduction or rental-state changes are permitted by this implementation.
- Decide staffing/assignment reassignment and escalation when an assigned reviewer is unavailable. There is no unrestricted browse/search or case-reassignment endpoint. A reviewer can claim an eligible unassigned case; queue metadata is visible to explicitly granted active reviewers. Production least-privilege grants and revocation need an approved operator workflow.
- Support routing records a bounded staff case and exposes existing customer-service/rental routes. No staffed-response SLA, realtime support transport or new no-show/failed-meetup policy is introduced. Existing rental/dispute controls remain authoritative; Milestone 1's unresolved no-show/listing-report enforcement decisions remain unresolved.
- One appeal per original case is supported, shared by target/reporter. Decide additional appeal levels and conflicting appeals; original decisions/evidence are never overwritten. Decision explanations are visible to affected users/reporters; reviewers must avoid quoting secrets/private third-party text.
- Evidence context is an immutable capture at case creation, not an expanding surveillance window. Later relevant messages need a separate report. At most five references are readable per case. Database administrators remain technically privileged; hashes/triggers do not protect against a database superuser rewriting data/schema or a role with TRUNCATE/DDL rights. A production application role must have those privileges withheld; the isolated test role intentionally owns disposable databases.
- Existing authentication abuse controls are unchanged. Chat limits are per authenticated user, not comprehensive IP/device/Sybil controls or distributed account-abuse detection. Polling is bounded but has no dedicated GET request quota; capacity/load testing remains outstanding.
- Inbox is ordered by conversation creation ID, not latest activity. Initial history shows the latest page by creation order; a long-disconnected client without a saved cursor may need older-history pagination to see an old newly released message. Ongoing cursor polling recovers releases. No offline mobile cache, edits, attachments, search, read-notification push or outbox consumer is implemented.
- No independent penetration test, production performance/availability exercise, localization audit or exhaustive multilingual safety evaluation has been performed. Passing fixture tests is not a claim that all abusive language is detected.

## Executable verification evidence

Final results are recorded below after the acceptance/regression run completes. Earlier development runs are not counted as final passing evidence: one browser login selector used the wrong existing label; another run exposed a select-label association issue and a persistence assertion that searched only the default page. The label was corrected and the persistence check requests a larger page. All other assertions remain active; no failing tests were disabled.

### Files and review map

- `prisma/schema.prisma`, `prisma/migrations/20261019120000_private_chat_safety/migration.sql`: additive data model, indexes, integrity and evidence-preservation controls.
- `lib/chat/{config,http,policy,service,moderation}.ts`: flags/settings, HTTP boundaries, deterministic rules, participant transactions and reviewer authorization/auditing.
- `app/api/conversations/**`, `app/api/chat/**`, `app/api/admin/chat/**`: API contracts listed above.
- `components/chat/{participant,reviewer}.tsx`, `app/messages/**`, `app/admin/chat/**`: inbox, conversation, report/block/support, queue and scoped case screens.
- `app/listings/[id]/page.tsx`, `components/site-header.tsx`, `components/admin/navigation.tsx`: existing navigation entry points.
- `components/admin/cases.tsx`, `lib/admin/cases.ts`: general audit filters for metadata-only chat audit events.
- `scripts/chat-reviewer.ts`: explicit runner-owned sandbox reviewer provisioning/revocation.
- `tests/chat-policy.test.ts`, `tests/chat.integration.test.ts`, `tests/run-isolated.ts`, `package.json`, `.github/workflows/verify.yml`: unit/API/browser/restart checks and isolated/CI wiring.
- `docs/MILESTONE2_CHAT_MODERATION.md`: this report.

No historical migration, lockfile, generated Prisma Client, environment file, raw test log, screenshot, upload or credential is included. Synthetic test actors/passwords exist only as fixture definitions. Raw test outputs stay in ignored `.test-artifacts/` or outside the checkout.

### Final run — 2026-10-19

All 14 commands completed with exit 0 on the final implementation/test file set. Prisma Client generation (7.10.0), schema validation and `git diff --check` also passed. No final tests were blocked or skipped. Database-changing runs used distinct new runner-owned `hustlen_test_m2_acceptance_*` databases, which were removed after their runs. The existing `p2p_marketplace` database was not used.

| Command | Outcome | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | Exit 0 |
| `npm run lint` | PASS | Exit 0 |
| `npm run test:unit` | PASS | 25 passing Node test results; zero failed/skipped |
| `npm run test:chat` | PASS | 10 passing Node test results; zero failed/skipped |
| `npm run test:stability` | PASS | 8 passing Node test results; zero failed/skipped |
| `npm run test:integration` | PASS | MRT API/browser, editing/booking races, search/map selection; browserErrors empty |
| `npm run test:rental-api` | PASS | 13 passing Node test results; zero failed/skipped |
| `npm run test:rental-browser` | PASS | 4 passing Node test results; zero failed/skipped |
| `npm run test:admin` | PASS | 7 passing Node test results; zero failed/skipped |
| `npm run test:moderation` | PASS | 10 passing Node test results; zero failed/skipped |
| `npm run test:migration` | PASS | 11 preservation assertions; all 15 applied migrations checked; combined schema diff empty |
| `npm run test:admin-migration` | PASS | 1 passing Node test results; zero failed/skipped |
| `npm run test:mvp` | PASS | 11 passing Node test results; zero failed/skipped |
| `npm run build:verify` | PASS | Exit 0 |

Total: 89 passing Node test results (including parent results), plus the MRT functional and migration-preservation script assertions. Chat comprises nine acceptance scenarios plus its parent result, including actual browser interaction and application restart. These are local execution results; GitHub CI has not been run by a feature push.

New migration SHA-256: `935358d65c8db5af17acd2236dc6579accd673a9bf03aad9454ca71849eb20f2`. Historical migrations were unchanged. Implementation/test hashes were checked against the acceptance-run snapshot before commit; only report text changed after testing.

Status: ready for isolated feature review. Keep general chat disabled pending the operational, privacy/retention and product-policy approvals above. Passing tests do not authorize public deployment or establish comprehensive abuse detection.
