# Milestone 2.1 — isolated chat acceptance and safe local demo

Base: `feature/chat-moderation-mvp` (`f9ae3a6f71daccaf6777f859be5fc723f62e4613`). Review branch: `feature/chat-demo-acceptance`. Intended PR target: `fix/milestone1-core-stability`, as requested. The PR therefore includes Milestone 2 as well as this follow-up. Do not merge or deploy during review.

This guide supersedes the Milestone 2 report's manual-fixture and inbox-ordering limitations. It does not approve production retention, moderation thresholds or public enablement. All screenshots and acceptance conversations use synthetic local fixtures. Browser acceptance below means an agent executed the manual workflow through real browser forms, not that a human reviewer has signed off.

## Launch and stop locally

In this prepared workspace the owned fixture database already exists. Run `npm run demo:chat -- info`, then `npm run demo:chat -- start`; do not run init over retained state. On a fresh checkout use the initialization steps below. The server is intentionally stopped when regression tests run.

Prerequisites: the repository's pinned Node/npm dependencies (`npm ci`), PostgreSQL reachable on localhost, a **test-only** PostgreSQL role allowed to create/drop disposable databases, and Chromium for browser acceptance. Run from the repository root. Generate Prisma Client using `npx prisma generate --config prisma7.config.ts`. Existing onboarding startup instructions still apply; no network/security settings need changing for local demo operation.

```sh
# Choose a NEW, unused database name. Replace the test-only connection credentials.
# Do not set this to an existing database, even an existing test database.
export MRT_TEST_DATABASE_URL='postgresql://TEST_ROLE:TEST_PASSWORD@localhost:55433/hustlen_test_chat_demo_review_01'
# Change review_01 if that name has already been used.
npm run demo:chat -- init
npm run demo:chat -- info
npm run demo:chat -- start
```

Use a lowercase actual name, for example `hustlen_test_chat_demo_review_01`. `CHAT_DEMO_PORT=3101` may be supplied at **init** to choose another unused port; default is 3100. Start uses the supported webpack development server, clears only its owned generated development cache, warms the demo pages, verifies unauthenticated moderator routes return 401, and opens only a localhost listener. On the same machine, open the local website on the displayed port in separate browser profiles. No public preview, tunnel or deployment is created. A cloud filesystem snapshot does not preserve the running process; run `start` again in a later session.

`info` prints fixture emails, IDs, listing ID and a randomly generated **demo-only** shared password. The password and test connection URL are saved only in ignored `.test-artifacts/chat-demo/state.json` with mode 0600. Do not commit/share that file, ordinary logs or real credentials. The command does not change your normal `.env`/DATABASE_URL.

`init` creates a new database, records the repository's ownership marker, applies all forward migrations only there, imports the retained MRT snapshot, registers four fixtures and creates an active camera listing through the existing upload/listing API. It never adopts, resets or seeds a pre-existing database. Reviewer grants are local, explicit and audited; provisioning is transactional. Failed initialization preserves owned state for inspection/explicit teardown; it does not silently retry against another database.

`start` verifies ownership and reuses the existing fixture database without migration/reset/reseed. It forces `CHAT_ENABLED=false` and sets `CHAT_PREVIEW_USER_IDS` to **only the two ordinary fixture users**, irrespective of inherited feature flags. Reviewer APIs still require explicit grants and case assignment. Existing main/integration branches and the existing marketplace database are untouched.

Ctrl-C stops the server and preserves demo data. After the owning process has exited:

```sh
npm run demo:chat -- down
```

Teardown checks ownership again, refuses a running/preparing demo (`server.lock` / `init.lock`) and refuses other database sessions. It never kills database sessions. It drops only the owned disposable database and removes that database's recorded listing media and local state. Ignored logs/screenshots remain available. To start over, choose an unused test database name and run init again. There is no automatic cleanup of a crashed process's locks: inspect the stored PID, confirm that preparation/server has stopped, and only then remove the stale local lock manually. Never remove a lock to bypass a running process. A failed CREATE does not establish ownership.

The demo was repeatedly initialized, started, stopped and torn down during verification. A development defect in the first helper used active database sessions alone to detect a running server; an idle server's pool could have closed them. That check allowed removal of its **owned test database**, never the marketplace database. The finished helper adds explicit process locks before any teardown. Active-server refusal and unchanged state were then verified. CLI safety tests also reject protected names, nonlocal URLs, shared development targets and overwriting retained state.

## Roles and manual workflow

| Fixture | Role / access |
| --- | --- |
| `owner@chat-demo.example.test` | Ordinary USER; owns eligible camera listing; preview chat enabled |
| `borrower@chat-demo.example.test` | Ordinary USER; can contact Owner before booking; preview chat enabled |
| `reviewer@chat-demo.example.test` | Active ADMIN plus ChatReviewer grant; claim required before reading bounded case evidence |
| `appeal@chat-demo.example.test` | Separate active ADMIN plus ChatReviewer grant; can independently review appeals |

Use the generated password from `info`. Separate browser profiles prevent one account's login from replacing another's cookies.

1. Borrower opens the fixture listing, selects “Chat with Owner” and sends a question before booking. Owner opens Messages, replies, and both check polling delivery, unread counts and “Mark loaded messages read.” The thread continues after any future bookings; init creates no booking or rental obligation.
2. Send the harmless multilingual examples below. Confirm delivery. Send the explicit synthetic solicitation fixtures; confirm HELD on the sender side and absent from the recipient's view.
3. Borrower reports a delivered message or reports the conversation. Block contact; both directions of new free text are disabled while history/reporting/existing rental routes remain. Remove only the Borrower's own block to continue the demo. Existing obligation handling is regression-tested separately; no no-show or penalty policy is added.
4. Reviewer opens `/admin/chat`, claims a case, reads only its bounded evidence, chooses classification/action and records a reason. Refresh evidence explicitly to record another access audit. Other reviewers cannot inspect a case they do not own.
5. For the synthetic correction exercise, reject a held fixture with an explicit test reason. Owner opens Messages, supplies an appeal explanation and appeals the decided case. The original reviewer cannot claim that appeal. The separate appeal reviewer claims it and records an independent disposition. A deliberate release of a prohibited synthetic test string exercises the correction/delivery mechanism only; it is **not** a policy allowing prohibited offers.
6. Observe recipient delivery after release, including unread indication. Stop and restart the server; sign in using a fresh browser context and reopen the thread. Messages/case decisions/read state remain in the demo database.

The same browser form workflow is executable and screenshot-producing:

```sh
# Run while the local demo is started. Set the actual installed Chromium path.
export MRT_BROWSER_PATH=/usr/bin/chromium
npm run demo:chat:acceptance
# Optional: append -- --headed on a machine with a desktop/display.
# Stop and restart the demo server, then:
npm run demo:chat:acceptance -- --verify-restart
```

Screenshots/results are written to ignored `.test-artifacts/chat-demo/`. The acceptance runner requires a live matching demo process lock before making browser requests and uses only owned synthetic fixture state. It verifies that reviewers themselves have no participant preview access, while their granted review APIs work. The workflow can be repeated; random message suffixes avoid duplicate-content collisions. Sustained repetition may hit the intentionally preserved per-user rate limits—wait for the next window rather than weakening them.

## Actual browser acceptance and multilingual observations

| Check | Executed result |
| --- | --- |
| Listing-initiated pre-booking thread, Owner reply, polling | PASS |
| Unread indicator and sender read receipt | PASS |
| Message report; block prevents both directions; unblock restores contact | PASS |
| Held text hidden from recipient | PASS |
| Reviewer queue, case claim, bounded evidence, reasoned rejection | PASS |
| User appeal; original reviewer denied; independent reviewer disposition | PASS |
| Logout/fresh login and complete server stop/restart | PASS; released text recovered |
| Normal English / Traditional Chinese / Indonesian discussion | ALLOWED and delivered |
| Explicit solicitation fixtures in those three languages | HELD and not delivered until explicit review |

| Synthetic input (random suffix omitted) | Observed outcome | Assessment |
| --- | --- | --- |
| How do I report scams and illegal goods? | ALLOWED | Harmless English discussion preserved |
| 請問如何檢舉毒品與性交易？ | ALLOWED | Harmless Traditional Chinese discussion preserved |
| Bagaimana melaporkan narkoba dan penipuan? | ALLOWED | Harmless Indonesian discussion preserved |
| I offer paid sex | HELD | Explicit English solicitation signal |
| 提供性交易服務 | HELD | Explicit Traditional Chinese solicitation signal |
| menjual jasa seks | HELD | Explicit Indonesian solicitation signal |
| I will kill you with kindness | HELD | **False positive:** an idiom matches the direct-threat pattern |
| selling c0caine | ALLOWED | **False negative:** obfuscated wording evades the narrow drug-offer pattern |

No moderation rules were broadened to conceal these limitations. Existing automated tests also exercise explicit threats/drug offers, contextual quotations/negation, credential requests, insults and links. Pattern coverage is not comprehensive multilingual understanding. None of these examples automatically suspends a user, changes trust or changes a Booking.

### Screenshots from actual browser execution

Images contain only synthetic accounts and fixtures; no login password, session cookie or connection URL is shown.

- [Conversation and read indicators](milestone21/screenshots/01-conversation.png)
- [Sender's held messages](milestone21/screenshots/02-held-messages.png)
- [Blocked contact with retained controls](milestone21/screenshots/03-blocked-contact.png)
- [Reviewer queue](milestone21/screenshots/04-moderation-queue.png)
- [Scoped, reasoned decision](milestone21/screenshots/05-scoped-decision.png)
- [Independent appeal decision](milestone21/screenshots/05b-independent-appeal.png)
- [Fresh-login restart persistence](milestone21/screenshots/06-restart-persistence.png)

## Ordering and reconnect changes

Conversation.lastActivityAt is indexed with ID and updated transactionally on a new stored message or held-message release. Read receipts, reports and block toggles do not reorder a thread. Inbox order is `(lastActivityAt DESC, id DESC)` with an opaque timestamp/ID keyset boundary. This replaces the preview API's numeric inbox `before` cursor; clients must echo `nextBefore` verbatim with URL encoding. Message-history `before` remains a numeric creation sequence and `after` remains the update sequence.

The UI merges pages and sorts by returned activity time/ID. The composer stays disabled until its authenticated conversation metadata has loaded, avoiding pre-hydration input loss. On opening/reopening a thread it loads recent history, then resumes update polling from the participant's persisted read cursor instead of immediately discarding older unseen updates by jumping to the current conversation version. Thus a newly released old held message is recovered even when it falls outside the latest creation-history page. Pagination remains bounded to 50 messages/request; large unread backlogs drain over multiple polls. Older already-read history remains available through “Load older messages.”

Regression coverage revives an older thread, checks activity order, equal-timestamp ID tie-breaking, stable keyset boundaries and invalid cursors, then releases a held message behind 53 later messages. Both backward history and paginated update recovery retain that message, and release moves its thread to the inbox top. Existing concurrent sends, idempotency, read monotonicity and restart tests remain active.

Forward migration: `20261019150000_chat_activity_order` adds/backfills only the new Conversation timestamp and creates its composite index. The backfill uses original message creation times; historical releases made before this migration are not reconstructed in the initial activity timestamp. New sends/releases update activity normally. Existing messages, evidence and Booking rows are not rewritten. Apply it only in a newly initialized disposable demo/test database for this task. No historical migration/checksum changes, live migration or production enablement occurred.

## Operational decisions still requiring approval

- **Assignment:** explicitly granted reviewers may claim eligible unassigned cases. There is no automatic escalation, reassignment or override-browse endpoint. Decide staffing, review response targets, claim expiry, unavailable-reviewer reassignment, emergency escalation and operator grant/revocation governance before public enablement. Do not grant broad private-chat access as a workaround.
- **Appeals:** one shared appeal per original case; a different reviewer is required. Decide additional appeal levels and competing reporter/target requests. Original decisions/evidence remain immutable.
- **Moderation:** approve thresholds, categories, link treatment, rate limits, false-positive/negative response and user notices. Current rules remain deterministic/explainable; the observed failures above need product/safety review, not an unsupported completeness claim.
- **Retention:** the prior proposal (routine messages 90 days, reported evidence 365 days after closure, audits 730 days) is still a proposal. Configured day values do not delete data; automatic deletion remains disabled. Approve legal holds, exports/deletion rights, backup expiry and an audited purge design. Dropping an explicitly disposable demo database is separate from production retention.
- **Privacy:** no E2EE claim; server processes messages. Private content is excluded from ordinary error logs and general audit metadata. Evidence reads require explicit reviewer grant, assignment and a successful persistent access audit; context remains bounded to five immutable references. Production DB roles must lack DDL/TRUNCATE rights. No third-party AI or content transmission is added.
- **Rental support:** blocked/suspended participants retain existing duties and structured coordination/customer-service routes. No new no-show, failed-meetup, payment or account-penalty policy is introduced. Staffing and service expectations need approval.

## Exact change inventory

Application delta from Milestone 2: `lib/chat/service.ts`, `lib/chat/moderation.ts`, `app/api/conversations/route.ts`, `components/chat/participant.tsx`, `prisma/schema.prisma`, and the new `prisma/migrations/20261019150000_chat_activity_order/migration.sql`.

Demo/verification: `scripts/chat-demo.ts`, `scripts/chat-demo-acceptance.ts`, `tests/chat-demo-safety.test.ts`, `tests/chat.integration.test.ts`, and package commands in `package.json`.

Review artifacts: this guide, `docs/milestone21/screenshots/*.png`, a pointer in the earlier Milestone 2 report and the prepared PR description. No generated client, environment/state file, private database URL, raw server log, upload or dependency change is included. No booking/handoff/lifecycle application code was changed.

## Automated verification and GitHub status

Final executable results follow below. Earlier development failures are kept distinct: an initial demo audit fixture lacked required previousState; that was fixed and provisioning made transactional. The browser walkthrough initially hit cold-compilation timeouts; its form expectations now allow 20 seconds. Reusing the Turbopack dev cache also produced framework 404 responses for the nested claim/decision routes while adjacent routes remained available. The demo launcher uses the supported webpack dev server; the application routes/authorization are unchanged. Development shutdown lock cleanup was made idempotent after concurrent signal/finally cleanup exposed an ENOENT race. The walkthrough also exposed early composer input being reset before hydration/readiness; the composer now remains disabled until metadata is ready, and browser steps wait for that readiness. Do not run regression builds while keeping this development demo open: shared Next-generated type files and Fast Refresh can reload open pages during navigation. The final full suite is run sequentially with the demo stopped. One rental browser run during concurrent browser/compiler activity timed out after five seconds while a dispute submission was still saving; it is rerun without that competing workload rather than relaxing its existing assertions.

GitHub API probing (`gh api repos/bubbl3gum-jpg/lend-ya`) returned `Forbidden`; `gh auth status` also reported unusable API authentication. Native Git access is separate. No API restriction, credential or network setting was bypassed/changed. PR creation and Actions dispatch are blocked until the environment has authorized GitHub API access with PR-write and Actions-dispatch permissions. A feature push alone does not trigger the existing push branch filter. CI must be reported as **not run**, not passed, until an actual workflow run is available.

### Final local results — 2026-10-19

The complete 14-command application regression run completed with exit 0 on the final application/schema/migration changes. Final demo-guard changes additionally received fresh TypeScript, lint, unit and real-browser checks. Source hashes were checked before commit; no tested application source changed after the full run. Prisma Client generation and schema validation passed. No local final checks were skipped, failed or blocked.

| Command | Outcome | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | Exit 0 |
| `npm run lint` | PASS | Exit 0 |
| `npm run test:unit` | PASS | 26 passing Node results; zero failed/skipped |
| `npm run test:chat` | PASS | 11 passing Node results; zero failed/skipped |
| `npm run test:stability` | PASS | 8 passing Node results; zero failed/skipped |
| `npm run test:integration` | PASS | MRT API/browser and station-removal race assertions; no browser errors |
| `npm run test:rental-api` | PASS | 13 passing Node results; zero failed/skipped |
| `npm run test:rental-browser` | PASS | 4 passing Node results; zero failed/skipped |
| `npm run test:admin` | PASS | 7 passing Node results; zero failed/skipped |
| `npm run test:moderation` | PASS | 10 passing Node results; zero failed/skipped |
| `npm run test:migration` | PASS | Existing data/checksums preserved; combined Prisma schema diff empty |
| `npm run test:admin-migration` | PASS | 1 passing Node results; zero failed/skipped |
| `npm run test:mvp` | PASS | 11 passing Node results; zero failed/skipped |
| `npm run build:verify` | PASS | Exit 0 |

Total: **91 passing Node test results**, including parent wrappers, plus the MRT functional/migration script assertions. Chat contains ten acceptance scenarios plus its parent; the added scenario covers activity ordering and long-page release recovery, with a fresh-browser assertion also exercising the recovery UI. Earlier failing development runs are not counted as final passing evidence. The final rental browser run passed its original assertions without changing timeout/assertion code.

All database suites created distinct new owned `hustlen_test_m2_m21verified_*` databases and removed them afterward. The separate `hustlen_test_chat_demo_21` database was created specifically for this task, teardown/fresh-init tested, and is retained for local review. Its server is stopped at handover; its fixture data and generated credentials remain in ignored state. No query/migration/seed/reset/drop was run against `p2p_marketplace`.

New migration SHA-256: `85f230192eee6c04855c769cec3e14a3a61db262fe2dcc7cb2b4b2937d9c506a`. All pre-existing migrations remain unchanged.

The final retained-demo browser workflow and fresh-login server-restart check passed on the finished scripts. Both restarted moderator mutation routes returned 401 without a session, and an active-server teardown attempt was refused before cleanup. Screenshots above show actual synthetic browser pages. These are local execution results, not human product-policy approval or GitHub CI results.

### Remote review handover

Implementation commit: `04d69173eddcbf87d9e829ead22ca96148eeb1e9`, pushed successfully to [feature/chat-demo-acceptance](https://github.com/bubbl3gum-jpg/lend-ya/tree/feature/chat-demo-acceptance). Subsequent report-only commits do not change the tested implementation.

Actual post-push attempts:

- `gh pr create --base fix/milestone1-core-stability --head feature/chat-demo-acceptance --title "Add isolated chat demo and activity-ordered inbox" --body-file docs/milestone21/PR_DESCRIPTION.md` failed: `Post "https://api.github.com/graphql": Forbidden`. **No PR was created.**
- `gh workflow run verify.yml --ref feature/chat-demo-acceptance` failed while looking up the workflow: `Get "https://api.github.com/repos/bubbl3gum-jpg/lend-ya/actions/workflows/verify.yml": Forbidden`. **No workflow was dispatched; CI status is NOT RUN.**

Enable authenticated GitHub API access with repository PR-write and Actions-dispatch permissions to retry those exact commands. Do not paste credentials into chat. Alternatively, [open the prepared comparison against the requested stabilization base](https://github.com/bubbl3gum-jpg/lend-ya/compare/fix/milestone1-core-stability...feature/chat-demo-acceptance?expand=1) and create a review PR using `docs/milestone21/PR_DESCRIPTION.md`. PR creation should trigger the existing verification workflow; inspect its real result, or manually dispatch Verify combined Hustlen for this feature branch if needed. Do not merge.

No merge, deployment, public chat enablement or live database migration occurred. Local acceptance is complete; remote PR/CI verification remains an external access blocker, and the policy decisions above remain unapproved.
