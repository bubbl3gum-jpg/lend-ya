# Batch 8C review — private support channel foundation

Candidate branch: `feature/private-support-channel-foundation-batch-8c`. Exact parent: `86eef8c00745f9625d4e6b56ba420bd0e8734d44` (Batch 8B), initially clean; ancestry to Batch 8A `1d921d2f42e6137266877e2d2f5c48997a71e2b4` verified. This document and its evidence belong to the isolated implementation commit; obtain its exact SHA with `git log -1 --format=%H -- docs/support/CUSTOMER_SERVICE_REVIEW_BATCH_8C.md`. No merge, deploy, production migration or staff provisioning.

Implemented an owned-test-only requester channel and text messages, independently scoped from marketplace chat. Neither shared booking participation nor legacy ADMIN/ChatReviewer grants cross-ticket visibility. No staff conversation, reply, invitation, notification, attachment, lifecycle transition or evidence import is enabled.

## Review entry points

- [Ownership, service/API, schema, security and cleanup contract](SUPPORT_CHANNEL_CONTRACT_BATCH_8C.md).
- [Decision-ready product register and concrete Batch 8D plan](SUPPORT_CHANNEL_DECISIONS_BATCH_8C.md).
- [Changed files](../security/batch8c/changed-files.txt), [verification ledger](../security/batch8c/verification.json).
- [Channel privacy/API/browser results](../security/batch8c/channel-security.json), [real database privilege assessment](../security/batch8c/channel-database-boundary.json).
- [Populated upgrade preservation](../security/batch8c/support-channel-preservation.json), [baseline hashes](../security/batch8c/baseline-preservation.json), [cleanup](../security/batch8c/cleanup.json), [production refusal](../security/batch8c/production-refusal.json).
- Responsive browser evidence: [desktop](../security/batch8c/channel-desktop.png), [tablet](../security/batch8c/channel-tablet.png), [mobile](../security/batch8c/channel-mobile.png). Synthetic requester content only; these are actual application routes and native login, not static mockups.

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
| `npm run test:support-channel-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-channel-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-channels` | Exit 0; ℹ pass 9; owned cleanup confirmed |
| `npm run test:support-ticket-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-ticket-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-tickets` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 77/77 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

Node totals include parent tests. Each changing test used a new owned disposable local database; the maintenance connection performed read-only cleanup checks. The candidate quota of 20 messages in tests is not production policy. Production tests use real build/start with accidentally configured development flags and prove refusal. No deadlines or security validation were weakened.

Initial/intermediate outcomes are retained separately in the ledger:

- First Prisma generation rejected the one-to-one channel relation without a compound unique key; SQL and Prisma now represent the same exact requester constraint. Combined migration schema-diff regression passes.
- Initial populated-upgrade test incorrectly counted the intentionally seeded historical ticket as an empty new table. Only new channel/message tables are now required empty; historical ticket and initial event are preserved. Added a negative owned-marker DDL refusal case; final upgrade tests include rollback, exact recovery, replay, old-client compatibility and row/trigger/migration preservation.
- Initial lint rejected JSX inside a try/catch and unused test bindings. The channel page now catches only its data read and renders outside the try, using the existing bounded error boundary. Final lint/type checks pass.
- Earlier positive channel suites preceded the final transcript/evidence canary and private-route log checks; final evidence explicitly records canary coverage. One overlapping run failed its existing five-second browser navigation assertion. A fresh serial follow-up passed unchanged assertions, including the three viewports and log privacy checks.
- Initial moderation, rental browser, login readiness and staff-read browser runs failed navigation/login deadlines while other browser/build jobs overlapped. This is an observed timing correlation, not proof of a single cause. Quiet reruns are recorded separately; no timeout increase or authentication change was made.
- The old Batch 8B upgrade fixture initially included the later channel migration while removing the ticket migration. It now excludes the new migration to test its intended historical boundary. Historical SQL and test assertions remain intact; follow-up passes 4/4.
- First new production runner target exceeded PostgreSQL's 63-character database-name limit. The guard correctly refused before creating a database. Only the temporary runner's generated name was shortened; isolation rules were not loosened.
- Initial full meetup had seven protocol passes and three browser subtest failures (parent failed too). Actual pickup and return camera diagnostics both recorded successful verification, but the complete browser flow was not a pass. Cleanup stalled while a page repeatedly navigated; only that run's test child was terminated after diagnosis and its ownership harness removed the database. This failure remains separate from the bounded final run.
- An optional formatting command attempted unavailable Prettier and failed because npm's external cache directory was unavailable. No dependency/configuration was changed; the small historical-fixture addition was formatted directly, followed by normal lint/type verification.

Final full meetup follow-up passes 11/11 with actual virtual-camera pickup and return, manual response-loss checked separately, negative camera cases and the post-return investigation checkpoint. Safe metadata: [pickup](../security/batch8c/camera-pickup.json), [return](../security/batch8c/camera-return.json), [post-return proof](../security/batch8c/investigation-qr-receipt.json). No QR payload, camera recording or evidence photo is committed. This does not certify physical iOS/Android devices; that separate acceptance gate remains outstanding.

## Preservation and limits

All 24 historical migration SQL files are byte-identical. Protected application/service files, official MRT catalogue, session/legacy Admin and reviewer logic, booking/custody/evidence, camera/GPS/consent, staff/MFA/approval and marketplace chat implementations are unchanged. Existing schema storage is unchanged except a new candidate ticket identity key/relation; new tables/functions/triggers are additive and test-only. The old client can still read historical tickets. The populated fixture preserves users, sessions, reviewer grants, bookings, immutable evidence, case history, staff/MFA/approval records, ticket/event rows, triggers and migration records.

The coarse proxy adds refusal for only new candidate paths; existing refusal and CSRF logic are preserved. The existing ticket detail gains only a gated own-channel link. Development request logging excludes private candidate route UUIDs; bounded operational error logging remains. Upstream production logging is not certified.

**Production intake/messaging and staff read/write remain BLOCKED.** The candidate's privileged test owner is not requester RLS; restricted real test principals deny access, but no deployment least-privilege policy is installed. No durable staff disclosure audit or ticket assignment is implemented. Canonical human identity/conflicts, final eligibility/suspended obligations, categories, lifecycle, retention/deletion/legal holds, content, anti-abuse limits, notifications and mediation require explicit review. The next batch must implement genuine scoped database/audit boundaries before proposing any staff reader/reply. No role activation, operational recovery, sanctions, payment, approval execution or AI rights were issued.
