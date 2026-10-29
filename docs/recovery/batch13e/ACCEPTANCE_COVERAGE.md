# Acceptance coverage and limits

| Requirement | Executable evidence |
|---|---|
| Actual original case, parties and agreement | Focused fixture performs real registration, R1 confirmation, R2 selection/borrower acknowledgement/owner acceptance, actual missing-charger claim and borrower response through existing endpoints. Return proof fixture is explicitly synthetic; full original camera suite is separate. |
| Working two-party UI | Native owner/borrower sessions open their actual condition case and follow the room link. Owner enters room/discusses, borrower proposes charger return at a real typed place/time, owner explicitly accepts, both reopen persisted plan/history. |
| Reopen after logout/login | Native owner sign-out invalidates the actual old cookie; protected request401, real new login reopens unchanged accepted proposal. |
| Cross-booking/unrelated staff | Unrelated USER and persisted unrelated legacy ADMIN GET denied; valid foreign POST denied; offer from another owned case cannot be accepted under the wrong case. |
| Explicit decisions | Self-accept403; counterparty accepts; reject/withdraw with correct roles; wrong-party withdrawal403; withdrawn/superseded/expired acceptance409. One accepted plan remains frozen. |
| Counterproposal and competing offers | New immutable offer references original; original terms deep-equal and state SUPERSEDED. Concurrent first offers produce one pending offer. No consent carried to new terms. |
| Duplicate/concurrent acceptance | Same-key concurrent attempts may return200/409; exact retry succeeds without duplicate decision, conflicting action/key fails. Partial unique terminal index and history uniqueness tested against actual persisted count. |
| Atomicity | Injected activity-notice failure rolls back event and room revision, no fake successful message. Deferred room/proposal/event/notice checks preserve complete history. |
| Expiry | Half-open unit boundary; controlled fixture ages one unanswered offer with guard restored before HTTP. Read derives EXPIRED; stale acceptance refused. Accepted state remains accepted, completion pending, after offer expiry in unit contract. |
| Contact safety | Existing UserBlock prevents new message/offer; suspended participants retain read/assistance intent while free text denied. Existing heuristic refuses password solicitation. New room is not a contact bypass. |
| Session revocation | Real User lock, queued writer, actual AuthSession deletion/commit: queued write401 and room revision unchanged; later request401. Expired unrelated session denied. |
| Notices/assistance | Actual opposite-recipient notices, created/queued/viewed distinct, deliveredAt always null. Wrong recipient cannot view-ack. Assistance persists intent without staff assignment/ticket/delivery. |
| Original evidence and authority | Whole original Booking/Return/Handoff/challenge/event/photo/claim/response/notice/agreement snapshots remain deep-equal after room workflow; case remains OPEN. No financial, custody, documentation or booking amendment operation exists. |
| Closed case | Explicit separate owned fixture closure makes room read-only; new message denied. Room never calls a resolver. |
| UI/localization | Real en/zh-TW screenshots1440/820/390, keyboard focus, no horizontal overflow, actual browser submission/navigation/reload, original text/IDs unchanged. Strict errors/external-origins arrays empty. |
| Production and migrations | Actual production build/start with flags and real authenticated cookie refuses room writes; new rows remain empty. Populated old schema upgrade, partial SQL failure rollback, replay/checksum/source preservation; original historical migration suite. |

No mock authorization-success responses, global browser-error suppression, weakened old assertions/deadlines, fake completion/delivery or substituted camera acceptance. Test count is one composite scenario per new harness, not an inflated scenario total. Not production safety/accessibility/physical-device or product-owner visual acceptance. Original overlapping-login issue remains tracked, not declared resolved by serial passing tests.
