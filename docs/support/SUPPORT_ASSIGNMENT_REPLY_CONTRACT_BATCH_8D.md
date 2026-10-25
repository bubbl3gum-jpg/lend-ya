# Scoped Support assignment and reply contract — Batch 8D

Baseline: `00eb14d5282edb90f52411d82ef96f843f4cf936`, Batch 8C. Branch: `feature/scoped-support-assignment-replies-batch-8d`. This is a functioning owned-development candidate, not production Support activation.

## Reused foundations and cutover limits

The candidate reuses existing AuthSession cookies/password verification, canonical StaffPerson/StaffAccountAssociation records, persisted authorization epochs, the real WebAuthn verifier/credential and assurance models, DRAFT memberships, disposable-database guards, the bounded error logger and real temporary database-principal fixture. Existing marketplace chat audience is not reused. No legacy ADMIN, ChatReviewer, StaffMembership ACTIVE or StaffCapabilityGrant ACTIVE authorization is added.

`inspectPersistedStaffIdentity` and existing scoped production staff services remain denied/pending. Existing staff activation constraints are unchanged. The synthetic fixture supplies a persisted, visibly labelled TEST_ACTIVE candidate member tied to a verified-in-fixture canonical person, verified association and DRAFT SUPPORT membership. It does not certify a real human. No real staff provisioning, role migration or approval executor is connected.

## Entry points

- `/dev/support-requester`, `/api/dev/support-requester`: independent requester intake, own ticket/channel and unified transcript in the new candidate. This SQL-scoped path is separate from the unchanged 8B/8C Prisma requester services. The old 8C transcript remains requester-only; use the 8D page for two-way acceptance.
- `/dev/support-agent`, `/api/dev/support-agent`: synthetic agent workbench, actual native passkey enrollment/verification, exact assigned metadata, explicitly granted channels, audited transcript, reply and read-only ticket event metadata.
- `lib/support-staff-candidate/{config,commands,bridge,service,page,login}.ts`; `scripts/support-candidate-worker.mjs`; `components/support-candidate-workbench.tsx`.

No assignment/grant/activation/invitation/closure/recovery/sanction/custody/payment/mediation/AI command exists. The existing `/admin/support` report/dispute workspace is unchanged. A role or passkey alone never authorizes a private channel.

Proxy, config, page, service, worker and SQL gates require explicit development configuration, a pinned exact localhost origin, effective local test database connection and exact owned run marker. Production routes refuse even when the candidate flag is configured. SQL gate also checks current database, protected configuration expiry and the actual PostgreSQL session_user principal. Expired configuration also blocks private login issuance. Temporary-table creation is denied to tested runtime/worker/MFA principals; forged database identity variables do not confer access. No browser role, staff ID, assignment object, origin/RP/assurance policy or mutable database GUC is authority.

## Assignment and grant model

The forward-only migration `20261026010000_scoped_support_candidate` creates an explicitly SQL-managed `hustlen_support_candidate` schema outside Prisma's public-schema model. Functions, privileges, triggers and cross-schema references are intentionally managed by reviewed SQL; Prisma validation alone does not validate this namespace. The migration refuses before DDL outside owned disposable databases. All prior migration files remain untouched.

| Record | Contract |
| --- | --- |
| configuration/requester | Protected exact run, pinned WebAuthn configuration hash, distinct runtime/worker principals, one-hour maximum configuration lifetime, explicit test quotas and requester allowlist; no application writes |
| member | Unique account/person/association/DRAFT membership references, exact candidate policy, TEST_ACTIVE/TEST_REVOKED, persisted version and bounded validity; no actual active role |
| assignment | Exact ticket/member, distinct verified-in-fixture human issuer, provenance, state/version, database creation time and attributed revocation; one TEST_ACTIVE assignment per ticket |
| channel_grant | Exact assignment/ticket and channel for channel actions; no channel wildcard; exact action, independent issuer/provenance, version, bounded validity and attributed revocation |
| authorization_history | Append-only initial/revocation records with object, version, state, issuer/revoker, provenance and database time |
| binding | Exact member/version, current AuthSession ID **and creation incarnation**, real persisted WebAuthn assurance, authorization epoch and bounded expiry; immutable |
| audit | Trusted actor/person/association/session incarnation, member/assignment/grant versions, assurance/MFA epoch, ticket/channel/action, correlation, outcome, database principal and time; no content or credentials |
| reply | Separate immutable staff-person attribution, exact ticket/channel, bounded text, retry key/hash and mandatory matching audit; never impersonates requester |
| entry | Immutable unified per-channel stream with exactly one requester-message or staff-reply reference and unique positive sequence |

Member/assignment/grant validity windows are at most one hour. Authority is further bounded by configuration, session, DRAFT membership, actual assurance, assignment and grant expiry. Changes only permit attributed revocation with a version increment; arbitrary edits/reactivation and history deletion/truncation fail. Reissuance requires a new independently issued record/assignment, not reviving old grants. Development quotas and validity are not approved production policy.

Assignment/grant issuance exists only in `tests/support/support-staff-fixture.ts`, after exact ownership validation, through the privileged fixture owner. It is not an application endpoint or production assignment authority. Assignee and issuer must be different canonical persons and must not be participants or aliases in the linked ticket/booking/listing/report/dispute relationship. Runtime checks repeat conflicts and current authority checks. Different account IDs cannot satisfy independent-human rules. Missing/unresolved real-world human verification remains a production blocker.

Capabilities are closed candidate contracts: `ticket.metadata.read`, `ticket.events.read`, `channel.read`, `channel.reply`. These do not alter the proposed global role registry or approve disputed allocations. Queue/ticket selection needs exact metadata grants; safe history has a distinct grant. Assignment alone reveals no channels. Channel enumeration returns only explicitly readable channel IDs. Reply requires both current read and reply grants.

## SQL and principal boundary

Scoped SECURITY DEFINER entry points have fixed trusted search paths with pg_temp explicitly last and revoked PUBLIC/helper execution. Their owner is the disposable migration principal; ordinary credentials cannot create in public or candidate schemas, change functions/privileges, select private Support tables or forge successful audits. Application and worker roles have no private-table SELECT or audit/reply INSERT. Requester selection resolves a bearer session token in SQL and constrains ticket/channel by that session's allowlisted requester. Staff selection resolves the current token, canonical association/person, DRAFT SUPPORT membership, protected synthetic member, real WebAuthn binding, versions, assignment, per-action channel grants and conflicts **before** private selection. Browser actor objects and mutable client-set GUCs are never accepted.

The private worker has separate restricted Support function-execution and MFA credentials. It obtains them over a private stdin bootstrap, not application environment or browser. A bounded, authenticated Unix socket (0600) carries closed commands from the server; the current cookie is forwarded server-side. The database Support credential cannot insert MFA assurance or choose arbitrary actor/audit values. SQL session_user distinguishes requester and staff entry points. Direct runtime, worker and MFA principal tests prove private-table/helper/audit denial, not just HTTP checks.

The MFA/identity issuer and migration owner remain trusted roots. This owned-container demonstration does not certify OS isolation, secret-manager distribution, network isolation or a production credential deployment. The worker's two privileged responsibilities share a Node process; production separation requires explicit review. Migration/fixture owner access is not claimed to be privacy-restricted.

## Authentication issuance hardening for this mode

A credential that could mint/replace another user's AuthSession or password could defeat requester bearer-token scoping. The 8D fixture revokes AuthSession INSERT/UPDATE and all User UPDATE columns from the ordinary application principal. HTTP admission and the SQL gate also refuse effective session-mint/replace or password-update privileges if mistakenly granted; this is verified by temporarily granting and revoking the privilege in an owned fixture. It retains the existing authenticated logout deletion path. The existing login route has a narrowly gated development-only branch after its unchanged request validation, rate limit and password check: a private worker independently rechecks credentials and ACTIVE state, issues a new random persisted session under the MFA/identity principal, and returns the credential only over the private channel for the existing HttpOnly cookie setter. Browser responses still contain only the original safe user DTO. There is no actor-ID issuance command exposed by the candidate API.

Default/production login and the Batch 6B document-navigation fix are unchanged. This is not a replacement production authentication architecture. The fixture uses pre-created synthetic accounts; it is not general registration, account editing or recovery rollout. Legacy broad runtime privileges outside this candidate still need a reviewed production cutover. Logout and expiration delete the current session; old assurance cannot be reused for a new or replaced session incarnation.

## Audit, ordering and transactional disclosure

`scopedSupportService` commits before returning a private result. SQL takes authority/session/version locks, checks expiry again after access, and inserts attributed access audits in the same transaction. Audit insertion/commit failure returns no private DTO. No operational console event substitutes for a successful access record. Denied requests disclose no private data; bounded operational failures are separate from successful immutable access history.

Reply and audit have deferred mutual foreign-key integrity. New reply, stream entry and attributed audit commit together or none commit. A late stream failure is tested after audit/reply insertion, as well as initial audit failure and direct unaudited reply insertion. Immutable requester attribution from 8C remains intact. A new AFTER INSERT trigger adds requester messages to the stream; migration backfills historical requester references without modifying original messages. Existing per-requester message ordinals are preserved; the 8D stream adds its own deterministic combined ordering under the same channel lock.

Retry keys are per author/channel. Identical retry returns the original reply under **current** authority and an attributed current read audit; conflicting content is denied. Parallel replies/requester messages serialize through the channel lock. Requester session resolution takes its required exclusive account lock from the start, avoiding shared-lock upgrades under concurrency without extending deadlines. The private response is bounded to 128 KiB, covering an 11-message page even with maximum-length Unicode text. Transcript pages contain at most 11 rows for a 10-row UI page plus has-more detection; no opposite ticket counts, previews or timestamps are exposed. DTOs contain stream reference/sequence, requester-versus-synthetic-Support label, permitted text and database time, not person IDs, hashes, tokens or credential data.

## Product and operating boundaries

No transcript/evidence import, forwarding, notification, attachment, autonomous draft, closure or high-risk action exists. Private messages cannot change rental custody, receipt, inspection, dispute decisions or evidence. Existing suspended-user rental/return/inspection/support obligations remain on existing paths; the ACTIVE-only candidate does not settle suspended-user intake policy. User-facing times use Asia/Taipei; technical evidence timestamps are UTC.

On a failed private operation the workbench clears private rows and shows a generic unavailable/revoked/expired state. Queue refresh clears prior selection; a successful factor verification is never labelled production staff authority. No live availability, delivery or read receipt is invented. Existing legacy services, sessions and operational protections are regression-tested separately.

## Safe reproduction and cleanup

Commands: `test:support-staff`, `test:support-staff-migration`, `test:support-staff-production`, through `tests/run-isolated.ts` only. Require an absent local `hustlen_test_*` target, installed Chromium and the repository's normal test dependencies. The harness creates and verifies its owned database; the fixture creates short-lived uniquely named real database principals, synthetic identities and exact assignments. Never point these commands at an existing application database or run their fixture installer manually there.

Tests stop only their own app/worker, remove their candidate schema and ephemeral role grants through the verified owner, then remove the whole owned database/uploads via the harness. Interrupted cleanup must use the run's exact marker/manifest, not a prefix-only destructive sweep. The review package includes read-only maintenance confirmation of zero remaining batch databases and owned principals. No credentials, private message canaries, evidence photos, QR payloads or coordinates are committed.
