# Batch 8D review — scoped assignment and two-way Support replies

Branch: `feature/scoped-support-assignment-replies-batch-8d`. Baseline: `00eb14d5282edb90f52411d82ef96f843f4cf936` (Batch 8C), initially clean with correct 8B ancestry. Final tested implementation SHA: **49955958d6915b41cc087cd997a28f62ffdeaeac**. The evidence-only closeout commit follows that implementation; resolve its exact revision with `git log -1 --format=%H -- docs/support/CUSTOMER_SERVICE_REVIEW_BATCH_8D.md`. The final handoff identifies both revisions. No push, merge, deployment, real staff activation or existing application database modification.

Implemented the complete owned-development workflow with real persistence: independent Owner/Borrower tickets → privileged ownership-verified fixture assignment to an independent synthetic canonical Support person → actual native passkey verification → exact scoped SQL transcript read with committed attributed audit → atomic Support reply/audit/stream → Owner reads the reply → Borrower/unrelated Support denied → revocation prevents subsequent reads/replies and clears displayed transcript.

This is functional candidate code, not a mock authorization response. Actual StaffMembership and StaffCapabilityGrant ACTIVE constraints remain installed. Synthetic TEST_ACTIVE candidate records and DRAFT SUPPORT memberships do not authorize production endpoints or high-risk actions. The production staff cutover remains blocked.

## Review package

- [Assignment, channel capabilities, schema, trusted session, SQL, audit and cleanup contract](SUPPORT_ASSIGNMENT_REPLY_CONTRACT_BATCH_8D.md).
- [Decision register, remaining Stage 7 gates and MRT/Stage 8 recommendation](SUPPORT_STAGE_7_DECISIONS_BATCH_8D.md).
- [Complete changed-file inventory](../security/batch8d/changed-files.txt), [full verification ledger](../security/batch8d/verification.json).
- [Authorization and principal results](../security/batch8d/support-security.json), [actual browser workflow](../security/batch8d/support-browser-evidence.json), [safe audit sample](../security/batch8d/support-audit-sample.json).
- [Populated migration preservation](../security/batch8d/support-staff-preservation.json), [baseline hashes](../security/batch8d/baseline-preservation.json), [cleanup](../security/batch8d/cleanup.json), [production refusal](../security/batch8d/production-refusal.json).
- Actual native-browser screenshots: [desktop](../security/batch8d/support-agent-desktop.png), [tablet](../security/batch8d/support-agent-tablet.png), [mobile](../security/batch8d/support-agent-mobile.png). Public synthetic fixture text only; no private test canaries, QR secrets or coordinates.

## Confirmed findings and changes

1. **Candidate authentication issuance risk:** a runtime credential with direct AuthSession mint/replace or password-write authority could undermine requester bearer-session SQL scoping. The 8D fixture removes those writes. Its explicit development-only login branch retains existing validation/rate limit/password checks and delegates independent credential verification/session issuance to the private identity/MFA worker. Default and production login flow remains unchanged. This is a demonstrated candidate-boundary hardening, not a claim that a production credential deployment has been audited or remediated.
2. **Function and audit isolation:** application and Support worker credentials have no direct private Support SELECT or successful audit/reply INSERT; helper execution is denied. Fixed-search-path SQL entry points verify real PostgreSQL session_user and current token-bound authority before private selection. The worker cannot choose arbitrary actor/audit objects. Migration and MFA/identity issuer are trusted roots; OS/process/secrets isolation remains a production requirement.
3. **Independent scopes:** assignment is not a channel wildcard. Metadata/history/read/reply actions are separate, exact and versioned. Issuer/assignee and participant aliases are checked against canonical people. No ADMIN OR SUPPORT_AGENT or reviewer fallback exists. Expired/revoked assignments, grants, memberships, credentials and session/authorization incarnations deny.
4. **Atomic evidence:** successful private reads require committed attributed audit. Reply, immutable staff author, combined stream and audit have transactional and deferred-FK integrity. Injected initial audit failure and late stream failure both deny and roll back; direct unaudited reply insertion fails. Parallel ordering and retry-key identity are tested.
5. **Additive storage:** a SQL-managed private candidate namespace, independent staff reply author model and stream references preserve all historical requester messages and public Prisma schema. Only a new requester INSERT stream trigger is added to an existing table. No historical SQL, booking/evidence/session row or official MRT catalogue is rewritten.

## Actual verification results

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
| `npm run test:support-channel-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-channel-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-channels` | Exit 0; ℹ pass 9; owned cleanup confirmed |
| `npm run test:support-staff-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-staff-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-staff` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:support-ticket-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-ticket-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-tickets` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 80/80 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

All changing suites use fresh owned disposable databases. Final command totals include parent Node tests; initial results are separate, not folded into a misleading passing aggregate. The ledger contains exact command/run timestamps, artifacts, exit status, counts and owned cleanup. Times there are technical UTC; UI screenshots use Asia/Taipei.

The new candidate tests cover HTTP, direct server service and real PostgreSQL principal boundaries. Native WebAuthn browser enrollment/assertion is separate from the deterministic authenticator used for additional signed-assertion API negatives; no verifier or authorization result is mocked. Three responsive widths have keyboard-focus and overflow checks. Production build/start refusal deliberately configures the development flag and proves no production access or provisioning.

The full meetup suite passes 11/11 with genuine virtual-camera pickup and return QR decoding. Safe metadata: [pickup](../security/batch8d/camera-pickup.json), [return](../security/batch8d/camera-return.json), [post-return proof](../security/batch8d/investigation-qr-receipt.json). Manual response-loss and camera negatives remain separate assertions. No evidence image/video, QR payload or coordinates are committed. Physical iOS/Android camera certification remains a separate pre-existing device gate.

## Initial outcomes and root causes, kept separate

- First new service test did not use the existing server-only Node boundary loader. It failed before executing the suite. The harness now applies the same loader used by MFA/scoped service tests; it substitutes only Next's build marker, never authorization/verifiers.
- Initial booking fixture used an invalid status. It now uses the actual existing CONFIRMED enum. No Booking enum, lifecycle or custody rule changed.
- Initial copied populated-upgrade fixture removed the target migration twice. It now removes it once, starts with all 25 historical migrations, and proves marker refusal, transactional DDL rollback, exact recovery, replay, historical rows/triggers and old-client reads.
- Initial valid WebAuthn-to-SQL binding failed closed because a PL/pgSQL assurance parameter was ambiguous with a table column. Qualifying the parameter fixed valid access; no identity/assurance check was removed.
- The expiry negative originally expired the main actor then tried to restore it. Existing getCurrentUser correctly deletes expired sessions; the missing row caused later test failures. A separate expired fixture now verifies deletion, while temporary suspension/incarnation changes restore in finally.
- Initial native browser selectors used an incorrect login label and an unscoped alert matching Next's route announcer. They now use actual labels and the application main alert. The workbench initially lacked the existing SiteHeader/logout control; both candidate pages now include it. Logout verification awaits the existing document navigation before checking the deleted session.
- A direct-service test initially expected old assurance to remain usable after adding an alias. Existing authorization-version triggers correctly invalidated it. The test now proves epoch advancement and stale-assurance denial, then obtains a fresh genuine assertion. This was successful revocation behaviour, not a flaky login.
- The restricted identity worker initially needed the INSERT privilege used by Prisma session creation. Only that trusted issuer receives it; runtime session/password writes remain denied. No application direct session-write fallback exists in 8D mode.
- Initial TypeScript reported new fixture environment/header type inference errors; they were corrected. Initial lint had one unused test import, removed. Final static results are recorded above.
- Older staff/MFA/approval/ticket/channel migration fixtures exclude the later SQL-managed candidate so their intended prerequisite boundary remains testable. A meetup upgrade test deliberately switches back to the full root history; excluding 8D there produced a checksum-set mismatch. Its original coverage was restored, and it passes. Historical migrations and assertions were not weakened.
- The final 11-way requester write test exposed a shared-to-exclusive account-lock upgrade conflict (55P03). Requester session resolution now takes its required exclusive account lock immediately, in the existing user-before-channel order. The same concurrency and lock/statement deadlines now pass; the fail-closed initial result is retained.
- After the first positive candidate run, additional tests independently exercised expired authority, credential/member revocation and worker outage. Assignment/member/grant TRUNCATE protection was also added alongside a direct negative assertion; relevant candidate/migration/production verification was repeated. No existing deadline was increased, initial failure suppressed or camera replaced by manual-code acceptance.

No recurring chat-login or synthetic-camera failure occurred in this batch’s sequential final regression runs. Initial new-candidate failures above were investigated and corrected with concrete causes; they were not hidden by blind retries. Final Unicode transport coverage verifies an 11-message, 2000-character CJK transcript and stream cursor under the bounded 128 KiB private response limit. Final configuration/privilege tests show expired pilot configuration prevents private session issuance and mistakenly granted runtime session-mint authority makes HTTP and direct SQL access fail closed.

## Preservation and production blockers

[Preservation evidence](../security/batch8d/baseline-preservation.json) covers all 25 historical migrations, unchanged public Prisma schema and existing auth/session/MFA/staff/approval/booking/evidence/camera/GPS/consent/chat/Admin services and official MRT data. Proxy additions preserve existing CSRF and prior pilot refusal logic. Existing `/admin/support` report/dispute routes and legacy authorization remain unchanged. Old-client and populated-fixture tests preserve historical requester messages as well as users, sessions, reviewer grants, audit/evidence, bookings and pending staff foundations.

**Production intake/messaging, real staff roles, assignments and high-risk execution remain blocked.** There is no approved production human-verification/assignment cutover, production principal installer, OS/process/secrets isolation or final policy for eligibility, suspended support rights, categories, lifecycle, content, abuse, retention/deletion/legal holds, notifications or mediation. Candidate immutable text and synthetic expiry/quotas are not policy approval. Existing support/rental/inspection obligations remain on their prior protected paths. Account recovery, financial outcomes, sanctions, unsafe-station restoration, evidence changes, custody overrides, approval execution and AI administration remain excluded.

Complete the independent review and decision/production-boundary gates in the Stage 7 document before any real-user enablement. MRT operations and Announcements/Platform Settings are separate future batches; this implementation does not authorize them.
