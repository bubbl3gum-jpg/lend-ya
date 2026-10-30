# Milestone 5C — development-only human Support handoff

Review date: 30 October 2026, Asia/Taipei. Candidate, not production acceptance.

## Baseline and feasibility verdict

Clean starting branch `feature/structured-customer-service-case-assistance-milestone-5b`, HEAD `42d6ad35e8343f497dc22ed4552c47b733416d9f`. Isolated branch `feature/development-human-support-handoff-milestone-5c`.

**Compatible existing authorized path found.** No new privilege, migration, worker action, inference tool or production policy required. Preparing a summary does not grant submission authority. The model never calls intake. The human application action uses existing native authentication and independent requester checks.

## Existing intake audit (source references)

- `app/api/dev/support-requester/route.ts` delegates POST to `supportCandidateApi(request,"requester")` in `lib/support-staff-candidate/bridge.ts`. Requires development-only owned runtime, exact localhost Host/Origin, JSON, no query selectors/cross-site requests, current ACTIVE authenticated account and real `p2p_session` cookie. Private no-store/Vary Cookie responses.
- `lib/support-staff-candidate/config.ts`: explicit owned-synthetic flag, matching three database URLs, guarded test database and exact run marker. `ownedSupportRuntime` independently checks effective database identity and restricted database privileges. Production refusal is independent of the flag.
- `lib/support-staff-candidate/commands.ts`, `lib/support/input.ts`: closed `create` fields categoryCode, subject (1–120), description (1–2000), UUID requestKey, optional single related-record selector; controls/unknown fields rejected. The new UI always uses OTHER_SUPPORT with a fixed fictional subject and null related selectors. No browser actor ID.
- `lib/support-staff-candidate/service.ts` invokes existing `hustlen_support_candidate.requester_request(token,jsonb)` on restricted runtime connection; BEGIN/COMMIT includes deferred integrity. Failure rolls back before disclosure. Staff worker remains separate and unchanged; no escalation into its privileges.
- `prisma/migrations/20261026010000_scoped_support_candidate/migration.sql` (read only): database gate checks runtime principal, run marker, fixture expiration; session checks persisted token hash, expiration and ACTIVE account under locks. Exact requester allowlist required. Per-user lock serializes creation. Request key + content digest provide same-payload replay, conflicting-content rejection and bounded fixture ticket count. Insert SupportTicket and TICKET_RECEIVED event in one transaction; only then return id/category/currentState/createdAt. No replay flag in this scoped receipt.
- `tests/support/support-staff-fixture.ts`: demo requester already appears in fixture allowlist; runtime has EXECUTE on requester_request, not added staff grants. `scripts/local-ai-demo.ts` logs in that requester through existing native login. Configuration expires after one hour, ticket limit12. Launcher/fixture untouched.
- Existing direct `app/api/support/tickets/route.ts` / `lib/support/tickets.ts` is a different broader Prisma intake requiring its own flags/allowlist. It is **not** used to bypass the restricted runtime.
- Private channels in `lib/support/channels.ts`, `lib/support-staff-candidate/service.ts` and scoped SQL remain separately participant/assignment/assurance/grant gated. This integration creates no channel, assignment, notification or message. Neither counterpart nor an unassigned human gains access.
- Historical immutable ticket/event constraints: `prisma/migrations/20261025090000_support_ticket_candidate/migration.sql` remain unchanged. Receipt event is intake history, not proof of human delivery/read/acceptance.

Canonical `docs/roadmap/MASTER_ROADMAP_14_STAGES.md` unchanged: Stage10 In Progress; Stage6 station controls, Stage7 production Support policies, Stage8 publication/settings approvals and Stage9 aesthetic acceptance remain unfinished. No Stage11 action.

## Implemented contract and UX

Case Notes and summary preparation reused, not rebuilt. Optional handoff appears only after Prepare Summary. Existing inferred issue/category, role and source reference labels remain in the user-editable summary when retained by user. Intake has no typed source-metadata field; references are unverified description text, never evidence links. No new structured provenance claim is invented. Actor is bound by the service, never copied from AI/browser identity fields.

1. Edit local summary. It must be nonblank and, with the immutable fictional/unverified preamble, fit existing 2000-character description limit. No truncation. Existing 8000-character local draft remains available.
2. Preview exact subject, category and description; destination explicitly owned development Support intake, no real booking/evidence attached.
3. Checkbox explicitly confirms reviewed fictional payload. Cancel before submission sends nothing.
4. Separate confirm button sends one existing `create` command. Synchronous ref guard blocks duplicate clicks. Persisted receipt shape validated before success; UI shows genuine server ID/time and only database intake confirmation.
5. On rejection/network/invalid receipt: no success. Explicit retry retains original immutable attempted payload/key, even after draft edits, so ambiguous transport completion cannot create a second ticket through retry. No automatic retries. After first attempt, this handoff cannot switch payload/key or cancel an already-issued request. Local drafts remain independently editable. New conversation/reload clears page-memory receipts and keys; this is not durable cross-reload duplicate prevention. A deliberately new handoff remains a new ticket under existing fixture limits.

States: local draft, preview, pending, rejected/outcome unconfirmed, persisted. No assigned/human received/responded state asserted. Browser does not claim a failed transport proves no write occurred. No response-time promise. Original local draft may still say not sent: it is preserved user-reviewed text, while separate receipt records actual submission status.

No summaries are resent to Qwen. No original source classifier, manifest, validator, model settings, timeout, retry, knowledge fingerprint, M3 contract or AI behavior changed. No private-record retrieval, financial/custody/dispute changes, production Support, new translation/Vision provider or AI tool introduced.

## Verification

See `verification.json` for actual command ledger and cleanup. Inference in application tests is explicitly mocked; not genuine Qwen quality evidence. Browser test uses native login and real restricted SQL persistence. Tests cover preview/confirmation/cancel, receipt matching actual row/event, same-key concurrent requests, conflicting/forged/invalid payloads, wrong origin, invalid/revoked/expired sessions, suspended/non-allowlisted accounts, event failure rollback, unchanged other domain records, conversation follow-ups and reset, en/zh-TW and desktop/tablet/mobile layout. Existing Support suite verifies scoped privacy and domain invariants; production suite verifies refusal. No application database changed; test fixtures/migrations only in fresh owned disposable databases, cleaned by original harness. No historical migrations modified.

Initial correction: TypeScript inferred helper token parameter as UUID template type; explicitly typed it string to permit invalid-session negative fixture. Runtime authorization unchanged. No timeout/assertion weakening, no general browser-error suppression. No full benchmark or genuine inference run.

## Manual Mac acceptance

After checking out this branch and installing dependencies, use your existing private guarded database startup wrapper and `npm run demo:local-ai`. Launcher unchanged; do not substitute literal placeholder credentials or original application database.

Open Interactive Playground, enable fictional Case Notes, select role/topic/language and enter fictional material only. Generate via real Ollama, expand notes, Prepare local summary, edit, Preview Support submission. Confirm displayed payload/destination, check confirmation and submit. Inspect persisted ID/time; no agent/human delivery inferred. Cancel a separate preview and verify no submission. Overlong drafts require manual shortening. Explicit retry after failure uses exact original content/key. Keep validation failures visible. Ctrl+C cleans only demo-owned database/processes/roles/files; existing PostgreSQL and Ollama remain running. Real Qwen usefulness and M3B acceptance remain owner-deferred.

## Production blockers and next recommendation

No production release authority, real-data consent/retention/delivery policy, staff onboarding/assignment, operational response guarantees or production Support messaging approved. New candidate does not resolve these. Fixture expiry and in-memory deduplication make this a disposable demonstration, not durable production handoff. User must avoid sensitive data; a warning is not automatic privacy detection. Receipt validation confirms expected contract but does not independently attest a human action.

Next step: owner manually reviews this narrow flow with fictional inputs. No further implementation batch, genuine M3B test or provider integration starts automatically. Future production handoff needs separately reviewed privacy/retention, durable request recovery, assignment and honest delivery contracts.

Additional verification notes: initial lint rejected reading refs in render; attempted-payload display now uses React state and only synchronous click exclusion uses a ref. Expanded test initially restored an expired session with UPDATE after existing auth had correctly deleted it; subsequent expected403 received401. Test reordered expiration last, preserving the actual delete-on-expiry contract rather than altering auth. Final browser negative submission deliberately removes the fixture requester allowlist, verifies403/no receipt/no row, restores it and explicitly retries the identical attempted request. Exactly one expected403 resource console error is asserted for that exact scenario; any extra console errors still fail. No global401/403 suppression.

Final added UI failure assertion initially matched both our alert and Next.js route announcer. Scoped it to the named Synthetic Support handoff region; no timeout increase or error suppression. Initial failure evidence is retained in the verification ledger.

## Changed-file inventory

- `components/case-notes.tsx`: mounts separate handoff only after prepared draft; separates AI recommendation/draft from actual submission status.
- `components/support-handoff.tsx`: bilingual preview, exact-text confirmation, cancel, pending/failure, stable-key explicit retry, persisted receipt only.
- `lib/local-inference/support-handoff.ts`: client-safe exact existing ticket-input adapter and minimal receipt validation; no inference/storage access.
- `tests/support-handoff.test.ts`: bounded payload/no record or actor selector/receipt negative contracts.
- `tests/local-ai.integration.test.ts`: opt-in actual-app/SQL handoff tests; old modes unchanged except truthful status wording.
- `package.json`: focused test command and unit-suite registration; dependency versions unchanged.
- `docs/ai/milestone5c/REVIEW.md`: audit, feasibility, privacy, scope, testing, manual acceptance, blockers.
- `docs/ai/milestone5c/verification.json`: metadata-only final ledger and commits; no credentials or generated Qwen transcripts.

Implementation commit: `ef77a9c982c064d5050b8d68efbfe0a76145fb78`. Separate evidence closeout commit contains this final inventory and `verification.json`; obtain exact closeout with `git rev-parse HEAD` on the review branch. Final selected checks: 180/180 unit, TypeScript, lint, handoff1/1, Case Notes1/1, Support staff15/15, production refusal1/1, original playground1/1 and normal guarded production build all pass. All selected disposable database executions cleaned up. No full marketplace regression or real-model acceptance claimed.
