# First scoped staff read integration — Batch 6A review

24 October 2026 (Asia/Taipei). Reviewed clean starting branch `security/staff-operational-readiness-batch-5c`, exact final SHA **a7063ee2510dd83258eea156c1ed7245ee0164e6**. Isolated branch: **feature/scoped-staff-listing-read-pilot-batch-6a**. This report belongs to the implementation commit; its exact SHA is supplied in the closeout. No merge, push, deployment, real staff provisioning or existing-database migration occurred.

## Delivered workflow and explicit boundary

Implemented an actual Next application/browser → private worker → real WebAuthn → exact listing scope → transactional immutable metadata audit → four-field response workflow. Positive authority is an explicitly owned **synthetic fixture policy**, never real staff activation. Actual public staff memberships/grants remain DRAFT, existing pending bindings never authorize, and production/disabled surfaces return 404 before private selection/streaming.

The app uses restricted runtime credentials. A separate private Node worker receives restricted verifier and read/audit credentials through stdin. The ordinary app cannot insert trusted proofs, grants, fixture bindings or success audit rows. This is genuine SQL principal and process separation for development; it is **not certified hostile-process OS isolation**. Same-user/operator .env exposure remains a precise production blocker. The real production staff-read chain is not activated or emulated. See [actual trust-chain diagram and architecture](SCOPED_STAFF_READ_ARCHITECTURE_BATCH_6A.md) and [bounded later activation plan](SCOPED_STAFF_READ_ACTIVATION_PLAN_BATCH_6A.md).

## Exact source and changed files

| File | Change |
| --- | --- |
| `app/api/dev/staff-listing-read/route.ts` | Controlled POST bridge, no general production staff endpoint. |
| `app/dev/staff-listing-inspection/page.tsx` | Owned-only, authenticated USER page with no resource data server-rendered. |
| `components/staff-listing-inspection.tsx` | Clearly labelled synthetic-identity interface: native enrollment, real assertion and one listing inspection. No operational mutation. |
| `lib/staff-read-pilot/config.ts` | Strict current development/local origin/database/run/schema ownership policy; production denies. |
| `lib/staff-read-pilot/bridge.ts` | Actual session cookie/ACTIVE USER check, runtime privilege gate, closed bounded JSON/Origin/Host checks and authenticated bounded Unix-socket request. Fully buffers worker result. |
| `lib/staff-read-pilot/worker-service.ts` | Fixed commands only; real existing MFA service, test admission and immutable fixture binding after signed assertion. No role/identity/grant/writer command. |
| `lib/staff-read-pilot/read.ts` | Authoritative persisted core/proof/scope resolution, locks, fixed projection, typed immutable access event, final deadlines/versions and commit-before-return. No shadow evaluator. |
| `scripts/staff-read-pilot-worker.mjs` | Private Node 24 worker, stdin-only DB bootstrap, distinct restricted principal verification, 0600 authenticated Unix socket, safe failure and graceful shutdown. |
| `tests/support/staff-read-pilot.ts` | Fresh-owned-only test schema/policy and sixth read/audit principal on top of the Batch 5C profile. Synthetic accounts and DRAFT contract references only; cleanup removes new schema/principals. |
| `tests/staff-read-pilot.integration.test.ts` | 14 reported tests: actual app/native browser, scope/projection, real proof, negative trust states, exact attribution, runtime forgery denial, races/expiry/audit/timeout/outage and ownership. |
| `tests/staff-read-pilot-config.test.ts` | Production, unsafe environment/connection/origin/binding refusal. |
| `tests/mfa-pilot-production.test.ts` | Existing actual production/disabled tests now also require new API/page 404. |
| `tests/run-isolated.ts`, `package.json` | Owned `test:staff-read-pilot` and config unit check; explicit staff flag/origin only for applicable test configuration. |
| `proxy.ts` | Narrow early production/disabled refusal and matcher for new development page. Existing guards remain. |
| `lib/operational-error.ts` | Add only safe SQLSTATE 55P03 to existing bounded code allowlist so real lock timeout is diagnosable without private errors. |
| `docs/admin/SCOPED_STAFF_READ_*.md`, `docs/security/batch6a/*` | Architecture/actual diagram, activation blockers, review, exact inventory, screenshots, bounded audit/race/test/preservation evidence. |

Exhaustive inventory: [changed-files.txt](../security/batch6a/changed-files.txt).

## Field projection, scope and durable audit

The only Listing SELECT projects **id, status, category, adminRestricted** with a bound exact ID and owner/canonical-owner-alias conflict predicates. Exact current grant lookup precedes any Listing selection; there is no wildcard, count, pagination or broad Admin helper. Existing unassigned and nonexistent IDs return identical generic denials. Unknown role/person/grant/policy/proof/case/count/limit selectors fail closed. The response is a literal four-key DTO, not an Admin object spread.

Read/audit execute in one READ COMMITTED transaction. Current session ID/birth, ACTIVE account, canonical references, synthetic marker, proposed Operations role/test membership, matching DRAFT contract, real current proof/key/epochs/config, immutable test binding and exact current grant are checked. Shared locks prevent concurrent authority/resource changes from silently passing. After the filtered selection, a fixed attributed audit is inserted, deadlines and versions are rechecked, COMMIT is awaited, then the worker/app return fully buffered JSON. No sensitive streaming or metadata in SSR.

Audit fields contain bounded actor/session/birth/member/grant/binding/proof references, lossless versions, exact listing, fixed policy/action/result, UUID correlation, DB writer identity, timestamp and fingerprint of the four selected values. No private listing bodies, raw credentials/proofs, coordinates or free-form JSON. The fixture result is TEST_ACCESS_COMMITTED, not a production COMMITTED staff event. Append-only/truncate protection plus grants prevent historical rewrite or caller-controlled audit insertion. A [bounded audit sample](../security/batch6a/staff-read-audit-sample.json) demonstrates attribution to the actual read/audit database principal.

## Actual failure and race evidence

| Case | Result |
| --- | --- |
| Anonymous/ordinary/legacy ADMIN | No implicit Operations access; 401/403 and no listing metadata. Actual USER fixture requires all persisted synthetic chain links. |
| Role/member/grant | Wrong role, revoked/expired membership or grant and missing grant deny. DRAFT contract references alone never permit a read. Unknown capabilities/selectors cannot broaden scope. |
| Identity/session | Revoked association/person, suspended account, wrong session, expired session and reused session ID with new birth deny. Existing alias/session/version suites also pass. |
| Real WebAuthn | Actual browser and actual Node-generated signed assertions; invalid binding/proof flags, replay, revoked key, stale MFA/auth epoch and expired proof context deny. Negative owner-inserted expired rows are test attacks, never positive authentication. |
| Exact scope/privacy | Only four keys returned; private title/description canaries absent. Unassigned existing/nonexistent IDs produce identical errors and no success audit. Invalid/wildcard/bulk/count/pagination selectors cannot select a broader set. |
| Audit failure | Real audit-insert trigger failure rolls back/suppresses response; retry after removing the owned fixture fault succeeds with one audit. Owner UPDATE/TRUNCATE attempts against audit are blocked by history protections. |
| Expiry during audit | Real signed proof/test binding is valid on entry; a controlled audit delay crosses member/binding expiry. Selected metadata and provisional audit both roll back. |
| Revocation before read lock | A peer holds the exact grant, starts a read, then revokes/commits. The waiting read observes current state and denies; no response headers or private data released while pending. |
| Revocation behind authorized read | Read holds authority locks while waiting on Listing. Concurrent grant revocation waits, then applies after the read's committed audit; the next read denies. Authorization linearizes at commit, not at an impossible promise to recall delivered data. |
| Lock timeout | Real peer Listing lock causes bounded SQLSTATE **55P03**, generic denial and no audit/data release. Existing execution-rehearsal deadlock tests still pass; no separate new read-deadlock result is claimed. |
| Runtime forgery | Ordinary runtime INSERT attempts on member/grant/binding/audit and real MFA/staff tables fail with 42501; trigger disable fails. No privileged DB URL is supplied in explicit app spawn env. |
| Private worker outage | Worker stops; app returns 503 without metadata or new audit. No fallback to Admin helper, owner connection or cached policy. |
| Ownership | Wrong database marker returns 404 before worker selection; schema/current ownership and explicit development config are checked independently. |
| Production/flag-off | Actual production build/start with enabled flags and actual disabled development server return 404 for both new surfaces. Existing passkey refusal remains intact. |

[Staff-read evidence](../security/batch6a/staff-read-evidence.json) records four committed authorized reads in the final suite; failures do not add success rows. [Batch 5C principal regression](../security/batch6a/batch5c-principal-regression.json) preserves the five-principal baseline test including its 40 denied SQL operations. New read/audit credentials have no staff provisioning or proof manufacture privileges; verifier/read principals are distinct and checked at startup. Ordinary runtime privileges are rechecked at each bridge admission.

## Browser evidence

[Desktop](../security/batch6a/staff-read-desktop.png) · [Mobile](../security/batch6a/staff-read-mobile.png).

A real browser logs in through the existing form, creates a native virtual CTAP2 passkey, supplies an actual signed assertion, receives the worker's session-bound test binding and reads the granted listing through the real Next route. Tests confirm the four-field response and durable event before the UI shows metadata. Screenshots explicitly warn that the identity is synthetic and real staff roles remain blocked. These results do not certify physical authenticators or physical mobile browser support.

## Verification and monitored reliability

Final selected runs report **265 passing tests**, including parent test counts and **60 unit tests**, after one bounded fresh chat retry. TypeScript, ESLint, Prisma validation and final production build pass. All database-changing suites use fresh, verified owned disposable databases.

| Command | Reported tests | Final actual result |
| --- | ---: | --- |
| `npm run test:unit` | 60 | Pass |
| `npx tsc --noEmit` | — | Pass |
| `npm run lint` | — | Pass |
| `npx prisma validate --config prisma7.config.ts` | — | Pass |
| `npm run test:staff-read-pilot` | 14 | Pass; owned database removed |
| `npm run test:authorization` | 8 | Pass; owned database removed |
| `npm run test:approval` | 18 | Pass; owned database removed |
| `npm run test:approval-migration` | 4 | Pass; owned database removed |
| `npm run test:execution-rehearsal` | 18 | Pass; owned database removed |
| `npm run test:staff-schema` | 8 | Pass; owned database removed |
| `npm run test:staff-migration` | 4 | Pass; owned database removed |
| `npm run test:staff-session` | 13 | Pass; owned database removed |
| `npm run test:staff-session-migration` | 4 | Pass; owned database removed |
| `npm run test:scoped-reads` | 10 | Pass; owned database removed |
| `npm run test:admin` | 7 | Pass; owned database removed |
| `npm run test:moderation` | 10 | Pass; owned database removed |
| `npm run test:chat` | 14 | Pass; owned database removed |
| `npm run test:rental-api` | 13 | Pass; owned database removed |
| `npm run test:stability` | 8 | Pass; owned database removed |
| `npm run test:meetup` | 9 | Pass; owned database removed |
| `npm run test:mfa-migration` | 4 | Pass; owned database removed |
| `npm run test:mfa` | 16 | Pass; owned database removed |
| `npm run test:mfa-pilot` | 13 | Pass; owned database removed |
| `npm run test:mfa-pilot-disabled` | 1 | Pass; owned database removed |
| `npm run test:mfa-pilot-production` | 1 | Pass; owned database removed |
| `npm run test:login-readiness` | 1 | Pass; owned database removed |
| `npm run test:database-principals` | 7 | Pass; owned database removed |
| `npm run build:verify` | — | Pass; owned database removed |

[verification.json](../security/batch6a/verification.json) retains exact times/exits/artifacts and initial chat failure metadata. Initial implementation findings were corrected without weakening checks: the fixture's grant expiry exceeded its membership due to insertion timing; grant validity was shortened. Extra system-column selection conflicted with narrow privileges; exact four-field SQL/fingerprint retained. Privilege introspection by relation text required schema access; catalog OID lookup fixed that rather than granting runtime access to the protected schema.

**Chat remains intermittent.** First run reported 12/14 pass because the existing five-second login navigation assertion timed out. This time diagnostics explicitly show hydration ready, actual login POST **200**, present HttpOnly cookie and page still `/login`; final DB sample shows zero lock waiters. This differs from the pre-hydration defect fixed in Batch 5C. It points to a remaining post-authentication navigation/timing issue, but aggregate logs and an end-of-attempt DB sample cannot prove its cause. A fresh owned retry passes 14/14. Neither login code, readiness regression, timeout nor assertion was changed; do not claim this retry resolves the issue. [Bounded first-failure diagnostic](../security/batch6a/chat-first-diagnostic.json).

Meetup passed **9/9 including synthetic-camera browser QR acceptance**, temporary TEST_LOCATION consent/revocation/expiry, custody/confirmation-window/return/restart checks. No camera/QR/GPS/evidence rule or station catalogue changed. Finite success does not certify absence of future camera intermittence.

## Preservation and remaining activation blockers

All **23 historical migration SQL files**, Prisma schema and lockfile remain byte-for-byte unchanged. No new Prisma migration. The extra test policy/binding/audit schema exists only in fresh fixture provisioning and is dropped with the test. **52 legacy authentication/Admin/authorization/pilot source files**, including the Batch 5C hydration fix, compare unchanged; all 21 legacy Admin API guards and broad helper boundaries remain. See [baseline preservation](../security/batch6a/baseline-preservation.json).

Existing ACTIVE, APPROVED, EXECUTED, APPROVE and COMMITTED activation restrictions remain installed/effective. Fresh migration and populated upgrade suites pass historical table/trigger preservation, failure rollback/replay and old-client compatibility; [upgrade evidence](../security/batch6a/upgrade-preservation.json). Public browsing/listing creation, booking custody, MRT catalogue and participant/evidence permissions are unchanged. No operational listing actions, user sanctions, approvals, recovery, support actions or AI principals were added.

All disposable databases/principals are removed; [cleanup evidence](../security/batch6a/cleanup.json) records a read-only catalog check. Only selected bounded test metadata/screenshots are committed; ignored fixture artifacts remain locally for diagnosis.

**Production stays blocked** by unapproved human proofing/role allocation and missing real active-staff issuer/schema cutover, exact production RP/TLS configuration, device/recovery/retention/notification policy and genuinely isolated service/secret infrastructure. Same-development-UID workers and app-readable operator files are not production isolation; bwrap namespace setup was unavailable. The code does not bypass that blocker with a production mock or feature flag. The [activation proposal](SCOPED_STAFF_READ_ACTIVATION_PLAN_BATCH_6A.md) scopes the later reviewed change to this one four-field read only; high-risk execution and mandatory legacy Admin MFA remain separate decisions.
