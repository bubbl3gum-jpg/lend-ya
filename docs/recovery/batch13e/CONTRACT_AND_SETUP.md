# Resolution Room contract — development candidate

29 October 2026, Asia/Taipei. Not production policy or activation.

## Authority and source

One room is subordinate to one actual `DevConditionClaim.disputeId`, which is the existing legacy Dispute ID. `Dispute.status` remains the case authority. Existing Booking/return/evidence/agreement writers are unchanged. No second dispute identity, settlement state, general-purpose status editor or action executor.

Only an actual structured post-return case can open a room; legacy cases without that approved foundation are not backfilled. The room shows current listing title as current (not frozen rental terms), actual original verified physical-return timestamp, immutable original allegation, original borrower statements, permitted evidence links, canonical case status and original booking/case links. Private Support conversations, ordinary chat history and internal staff notes are not copied.

## Additive data

`DevRecoveryRoom`: one row per existing structured dispute; immutable opening time/policy `owned-recovery-room-v1`, bounded mutable history revision.

`DevRecoveryProposal`: immutable UUID, exact case/author, revision1, fixed supported category, bounded explanation/place, optional server-normalized coordination time, bounded lifetime, DB creation/expiry and optional exact predecessor. Every changed/counter offer gets a NEW proposal identity/revision1; no row editing or consent carried forward.

`DevRecoveryEvent`: append-only exact case/actor/revision/kind, optional exact proposal/notice reference, bounded closed payload, idempotency key/server hash and database time. Opening, message, proposal, counter supersession, accept/reject/withdraw, assistance intent and notice-view acknowledgements are distinct.

`DevRecoveryNotice`: immutable activity recipient/event, case FK to the EXISTING DevConditionNotice root, DB created/queued times. It reuses case notification authority/semantics without consuming or altering original claim/response history quotas. Root notice is not permission to read someone else's private Support data.

One additive forward-only transactional migration creates four tables, strict FKs, uniqueness/partial indexes and scoped guards. All previous migrations remain unchanged. Deferred constraints require exact sequential room history, one originating event per proposal, counter supersession history and one opposite-participant activity notice for every substantive event. Immutable proposal/event/notice UPDATE/DELETE/TRUNCATE is refused. Room metadata changes only by exactly1 revision per appended event. No original case, response, receipt, agreement or evidence row is updated by room writes.

## Candidate proposal policy

Supported categories only: return a reported accessory, additional inspection, documentation clarification/coordination, human assistance, other non-financial coordination. Explanation≤1500 chars; place≤120 chars. Accessory return/additional inspection require paired place and future time. Other categories may omit both; supplying one requires the other. Local date/time strings use the existing Asia/Taipei parser; UTC/offset inputs normalize server-side. Actual DB time enforces future time≤30 days.

Candidate lifetime1–168 whole hours, default UI24. Database derives expiry at creation, bounded by the earlier scheduled time. These are development limits, not approved production expiry/reminder policies. Unanswered expiry is half-open; reads derive EXPIRED from stored DB expiry/current DB clock without a worker or history rewrite. An already accepted plan remains accepted after offer expiry, with **completion pending**.

At most one unresolved unexpired offer. A counterproposal atomically marks its pending predecessor SUPERSEDED and creates a new immutable offer, preserving terms/actor/history. It is not acceptance. Counterparty only may accept/reject; proposer only may withdraw a pending offer. Expired, withdrawn, superseded, rejected or stale offers cannot be accepted. Accepted plans are frozen; further plan changes require a separately approved amendment process. Discussion and assistance remain available subject to contact/case restrictions.

An explicit proposal submission records the proposer's intent. Only a distinct actual counterparty's authenticated acceptance records mutual coordination agreement. It NEVER closes the case, changes custody, alters the original station/dates/price/deposit/documentation, waives rights, creates a receipt, proves completion, charges/refunds money or assigns guilt. No COMPLETE, SETTLE, RESCHEDULE_BOOKING, PAYMENT or DELIVERED command exists.

## Authorization and transactions

Require `HUSTLEN_RECOVERY_ROOM=owned-recovery-only`, `NODE_ENV=development`, plus existing independent condition-claim gate: exact three validated local disposable database URLs,24-hex run ID and actual DB name/comment matching the owned harness. Proxy, page/service and SQL guards independently refuse unauthorized environments; production remains refused even configured flags. Browser role/user/time/hash/assurance fields cannot confer authority.

Private reads require the actual stored owner or borrower and a current persisted session. No ADMIN OR STAFF shortcut. DTOs exclude session/request hashes, private staff notes and unrelated cases. GET performs no room creation/view mutation. Explicit OPEN creates the first real room/history; repeated opening returns its saved state without inventing mutual agreement.

Writes require exact trusted localhost Origin/URL, custom X-Hustlen-Recovery-Room:1, no cross-site metadata, bounded closed input. Lock participant User rows in sorted order, then actual AuthSession and Booking, matching contact-block and credential-revocation ordering. Revalidate resource/case/offer/revision inside a serializable transaction. Atomic notice/event failure rolls back the whole action. Same actor/key/exact normalized content returns saved state; changed content/key conflicts. Concurrent losers may receive409 and retry with the original key; no automatic mutation retry. Revoked-session serialization errors are classified through the existing persisted session resolver after rollback, yielding401 without reauthorizing a write. Existing expired-session cleanup semantics remain unchanged.

Case closure makes new room writes unavailable; already recorded history stays readable. View/open replays which perform no mutation may return existing state. Offer acceptance and case status are checked under actual Booking serialization, preserving existing Admin resolution ordering without adding a resolver.

## Contact safety and continuing obligations

Reuse existing UserBlock/account restrictions. Shared history remains readable by actual participants. If either account is suspended or either party blocked the other, new free-text discussion, new/counter offers and acceptance are refused; rejection/withdrawal, notice acknowledgement and fixed human-assistance intent remain available. Original rental/return/inspection/formal response controls are unchanged. No safety block is bypassed merely by entering a recovery room.

New shared text uses the existing deterministic chat-policy function conservatively: only ALLOWED passes; held/rejected/flagged text is not shared here. This is a limited heuristic, not comprehensive understanding or an AI/legal finding. It creates no unauthorized moderation-case transcript or staff access. Private Support/human assistance is a separately authorized path; intent alone does not claim delivery/assignment. False-positive/product policy review remains necessary before production.

Bounds:200 room events,20 messages per participant,10 proposals total and one assistance intent per participant. Counter and decision history retained. Notice view is unique/idempotent, not a way to consume all decision capacity. Every activity notice is for the OTHER actual case participant, never arbitrary client recipients. Limits are candidate safeguards, not production approval.

## Notifications and deadlines

Activity creation atomically records a case-rooted created/queued in-app notice. It is available for authenticated retrieval; no external worker/email/push/SMS delivery is claimed. Explicit notice-view action is a distinct authenticated self-report, not proof of comprehension or qualifying delivery. No delivered timestamp or delivery activation command exists. No48h response enforcement starts from room creation, queueing, viewing or agreement.

Original24h owner-claim/supplement rules remain intact. Room discussion/documentation proposals are coordination statements, not formal allegation/evidence amendments; no uploads or new evidence-reference write path. Original Case register remains authoritative for permitted formal supplements and responses. Source records cannot be replaced by room text. Human-assistance intent does not open a ticket or grant staff access.

## UX and guidance

Real room page `/dev/recovery-room?bookingId=...` is linked from actual condition-case records, which are reachable from account activity. Existing case UI remains when recovery flag is off. Native forms review exact proposed terms before submission; explicit counterparty acceptance confirms coordination-only limits. Original facts, allegations, borrower statements, proposals, shared discussion and decisions are labelled separately.

Typed English/Traditional Chinese operational copy; source statements/names/IDs remain unchanged. Existing heritage surfaces/typography/theme/language/sound/effects preferences are reused. No new artwork, animations or sound. Deterministic contextual templates suggest accessory discussion, additional inspection or human review without asserting missing/damaged items. They are authored candidate copy for product review, not active generative AI or approved production advice.

## Setup, tests and cleanup

Use only the verified owned harness with a NEW unique local `hustlen_test_*` target per changing command:

```
MRT_TEST_DATABASE_URL=<new guarded target> npm run test:recovery-room
MRT_TEST_DATABASE_URL=<another new target> npm run test:recovery-room-production
MRT_TEST_DATABASE_URL=<another new target> npm run test:recovery-room-migration
```

Runner verifies effective driver/target, creates/marks ownership (never adopts/resets), deploys only there, sets exact localhost room/claim/inspection/R1/R2 gates/origins, runs actual application and drops only that verified owned DB/removes recorded fixture files. Never point at an application/shared database or log credentials.

Focused verification seeds explicitly synthetic return proof records, while using real registration, R1 confirmation/R2 borrower acknowledgement/owner acceptance, actual structured claim/response and actual room endpoints/native browser interactions. It is not real-world physical proof. The unchanged full meetup suite separately exercises genuine virtual-camera pickup/return decoding. Expiry is aged only in a privileged owned synthetic fixture with its guard restored before HTTP; no application clock override or timestamp editor.

Candidate rows retain immutable history until owned database disposal. No production retention/deletion/holds/transfer or principal migration is approved. RESTRICT FKs intentionally preserve linked records; rollback must not erase history. Older code's original authorities are unchanged, but a real rollout/rollback and user-communication plan requires review before any production activation.
