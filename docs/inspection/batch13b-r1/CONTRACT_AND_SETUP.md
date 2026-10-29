# Durable condition-case contract and setup

29 October 2026, Asia/Taipei. Owned-development candidate, not production policy or rollout.

## One authoritative case

`app/api/bookings/[id]/dispute/route.ts` keeps the existing legacy request unchanged. An explicit closed `{structured, requestKey}` body delegates to `lib/condition-claims/service.ts` inside the same original submission boundary. It creates the actual legacy `Dispute` and moves the actual Booking from eligible INSPECTION to DISPUTED, together with subordinate claim/notice/event persistence in one serializable transaction. There is no separate case ID, status editor, resolution operation or second custody writer.

Never attach invented structured metadata to a historical dispute. Existing untyped disputes retain their original participant/status contract, including their broader in-use/return safety purposes. They do not become structured inspection claims merely by existing. Production convergence/cutover of these writers requires separate policy review; this candidate does not assert that every legacy dispute now has a24h rule.

## Additive model and immutable facts

`DevConditionClaim`: primary key is actual Dispute ID, unique Booking FK, frozen owner/borrower IDs, original typed allegation, exact request key/server content hash, database-derived verified return/24h deadline/submission time, optional exact accepted R2 agreement context, fixed `owned-condition-claim-v1` policy and bounded event revision.

`DevConditionNotice`: one immutable borrower-scoped notice for that actual case, database creation time. It is not an email/push/SMS delivery receipt.

`DevConditionEvent`: append-only UUID, exact case/actor, unique sequential revision, fixed event kind, bounded closed statement payload, idempotency key/server hash and database time. Original allegation plus notice-created and notice-queued events are mandatory in the creation transaction. Subsequent owner supplement, borrower original response/clarification and self-reported notice-view events never rewrite original content. Unique partial index permits one original borrower response; clarifications remain separately attributed.

New migration `20261029110000_owned_condition_claims` creates only these tables/relations/indexes and scoped guards. No old row backfill or historical migration changes. Immutable original metadata, event/notice UPDATE/DELETE/TRUNCATE refusal, original Dispute allegation protection and deferred atomic revision/history/notice checks fail closed. Original legacy resolution fields remain under existing Admin authority and audits; no new resolver or staff access. Current case status always comes from Dispute. Existing audited Admin resolution is not silently converted into a new participant event or AI decision.

The initial case, notice, three events and Booking state change roll back together if any required persistence fails. Metadata revision advances exactly1 per subsequent event. Original typed component/concern cannot change; supplement input has no replacement component/type/status. Narrative supplements are attributed statements, not automatically admitted new allegations or verified facts. Human review must reject semantic scope creep; software does not claim to understand factual truth. No material amendment or deadline exception process is activated.

## Return authority and deadlines

Reuse `lib/inspection/service.ts:inspectionSummary`, now accepting an optional transaction reader without changing default preview behavior. Authoritative return requires the actual owner RETURN/PHYSICAL_RECEIPT_ACK linked to a consumed and completed RETURN challenge with completion hash, correct issuer/verifier, matching bilateral handoff and borrower Return record. Booking DISPUTED, borrower return submission, page load or an unsent message cannot manufacture the timestamp.

The server checks [verified return, verified return+24h); database trigger independently derives/stamps the same return/deadline and rejects absent/future/expired verification. Original submission time cannot be client supplied or reset. Owner supplements are limited to the original24h window and same issue. Outside it use an independently approved future exception/human recovery process, currently unavailable. No ordinary claim if physical return happened without qualifying verification.

Borrower response has **no enforceable48h cutoff**. Created, queued, viewed or failed/unavailable delivery never starts one. A trusted synthetic fixture TEST_DELIVERED event may calculate a demonstration timestamp+48h, clearly synthetic and never enforceable. Even when its demonstration deadline is past, response remains allowed and Dispute stays OPEN. Silence never creates guilt, closure, liability or a financial action. No scheduling worker or external delivery adapter exists.

## Authentication and privacy

Independent `HUSTLEN_CONDITION_CLAIMS=owned-dispute-only`, `NODE_ENV=development`, three identical strictly validated local disposable database URLs,24-hex run ID and actual database name/ownership comment are required. Proxy and service independently refuse production even configured flags. SQL writes also require actual owned database, transaction pilot/actor/session settings and real current session. No browser role, user ID, hash, time, assurance or delivery flag is trusted.

Writes require exact configured localhost `HUSTLEN_CONDITION_CLAIMS_ORIGIN`, matching request URL/Origin, custom `X-Hustlen-Condition-Claim:1`, bounded closed JSON and no cross-site Fetch Metadata. Actor locks User then AuthSession before Booking, matching revocation ordering. A serialization abort denies the write; a read-only post-rollback session recheck reports401 when revocation caused it, without automatically retrying a mutation. Already-authorized operations may finish before revocation obtains its locks; this is not universal cancellation or erasure of previously displayed data.

New owner submission requires ACTIVE owner. Reads and responses/clarifications preserve legitimate obligations for authenticated suspended participants. Only the actual stored owner/borrower can access structured case data; unrelated ordinary users and unrelated legacy ADMIN are denied. No ADMIN OR STAFF fallback. New DTO exposes no request/session hashes, cookies, credential data, internal Admin notes, identity documents or other cases. Reads are private/no-store. Account list is capped50; case history100, owner supplements20, borrower clarifications20, one original response. Repeat viewed acknowledgement is idempotent and does not consume all response capacity.

Evidence inputs are at most10 unique exact BookingEvidencePhoto UUIDs from that rental's permitted HANDOFF_OWNER/HANDOFF_BORROWER/RETURN_BORROWER/INSPECTION_OWNER stages. Existing original evidence endpoints retain participant byte authorization. Original bytes, authorship/stages/times remain unchanged; no new upload/replacement path. Permitted later existing inspection refs may be supplemented. New borrower supplemental file capture requires a separately reviewed secure provenance/access contract. Identity-verification storage is never queried/copied.

Only an actually accepted Booking documentation context can be referenced; no latest listing/version guessing. Existing R2 immutable source supplies original declarations/hash/media. Listing declaration, agreed disclosure and physical pickup/return remain distinct. No Vision inference or damage finding.

## Notice semantics and trusted fixture boundary

Creation persists notice plus CREATED and QUEUED events atomically. Borrower GET/inbox shows the actual allegation. Explicit authenticated VIEW records a distinct self-reported view/acknowledgement, not proof of reading comprehension or approved delivery. Real delivered timestamp is always unavailable/null. Fixed delivery states support pending and explicitly synthetic failed/unavailable/test-delivered records; there is no real DELIVERED event kind or environment flag that enables one.

No HTTP action can insert TEST_DELIVERED/DELIVERY_FAILED/DELIVERY_UNAVAILABLE. Tests use a direct, guarded owned-fixture transaction with actual participant session and additional `hustlen.claim_test_delivery=synthetic-fixture-only` plus fixed source `SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF`. This is not an application endpoint or production credential. One synthetic event is aged only by privileged fixture setup with its guard restored before HTTP, to test a past48h demonstration deadline. No real delivery/claim/return timestamp is changed through application APIs.

## UI and setup

`/dev/inspection` switches its right-hand unsent preview to the durable case component only under the independent claim flag. `/dev/condition-cases` provides actual participant inbox and case reopening; `/account/activity` adds a labelled development-only link. Original preview behavior remains when off. New operational copy is typed English/Traditional Chinese; original statements/IDs remain untranslated. Heritage ledger, theme/preferences, readable forms and source-linked history reuse existing design. No artwork, audio, animation or site redesign. Owner reviews before submitting; borrower may disagree or remain uncertain and record a human-assistance request. That request does not create a Support ticket, assign staff or claim delivered messaging.

Use the guarded runner only, each invocation with a unique NEW owned target:

```
MRT_TEST_DATABASE_URL=<new local hustlen_test_* URL> npm run test:condition-claims
MRT_TEST_DATABASE_URL=<another new target> npm run test:condition-claims-production
MRT_TEST_DATABASE_URL=<another new target> npm run test:condition-claims-migration
```

The harness verifies effective driver/target, CREATEs (never adopts/resets), marks ownership, deploys there, sets exact localhost origins and independent inspection/R1/R2 flags for integration, starts the actual application, records artifacts and drops only that owned DB/removes recorded uploads. Never point this at a shared/application DB. Do not print or commit credentials. Tests with synthetic verification fixtures are not proof of real-world physical return; the separate unchanged full meetup suite exercises actual virtual-camera decoding.

## Remaining decisions

Approved qualifying delivery/channel ownership and verifiable receipt semantics; failed delivery/retry/reminder/timezone/exception responsibility; production48h enforcement and appeals; fairness/ordinary wear/material amendment handling; new evidence uploads and retention/holds/deletion; account/listing transfer/deletion compatibility; production principals and rollout/cutover; independent security/accessibility/product acceptance. Immutable RESTRICT relationships intentionally retain candidate history until verified owned database disposal, not a production retention guarantee. No existing application DB is migrated or modified.
