# Batch 13D-R1 — Durable Item Documentation & Owner Listing Studio

28 October 2026 · Asia/Taipei · owned-development review candidate, not production approval.

## Revisions

- Starting branch: `feature/vision-item-documentation-batch-13d`.
- Actual clean baseline: `bfc01b4b79b6d1dc10af6781cdb8d5e3f25697d8`.
- Supplied implementation `3b5c964772a9e140eeb34900f80d47535acf0227` and closeout `8476e2157a985669a2d3730b3117c70f6d213bc4` verified ancestors.
- New isolated branch: `feature/durable-owner-studio-batch-13d-r1`.
- Tested implementation: `c3bbfedf4209c1855d2a223a8381b84a132fbf83`.
- Separate evidence closeout: `4e16630e8aafcd6187a3b86f6331438ccf1e9aee`.

No push, merge, deployment or existing application database operation. No live provider, biometric/eKYC processing, production participation/publication requirement, staff/Support activation, financial action or autonomous decision.

## Real durable vertical slice

`/dev/item-studio` now saves real owner/listing-scoped PostgreSQL drafts, reloads them across navigation/new authenticated sessions, persists sanitized protected photos and confirms immutable versions. Both photo-first and manual-first lead to the same draft and review, not independent records. Owners explicitly declare condition/defects, accessory inclusion/exclusion/unspecified and photograph visibility, with source-scoped area refs. An explicit NONE accessory statement represents no included accessories; empty unspecified data is not silently converted into none.

The UI shows dirty state, database save time/revision, missing views, saved material-fact review and confirmed-version/event history. Dirty text must be saved before attaching photos; draft/record discard warns, and confirmation uses saved complete data plus explicit owner acknowledgment. Confirmation is a human declaration, never AI verification or automatic publication/reactivation. Existing listing stays INACTIVE in the test through every save/upload/confirmation.

There is actual protected image persistence, not in-memory/session/localStorage substitution. Media follows existing private bytea and image-validation conventions, under a distinctly named OWNER_SELECTION_NOT_RENTAL_EVIDENCE source. Sanitized bytes are immutable; input/stored SHA256 and DB timestamps identify transformations/provenance, not forensic authenticity. Original raw/EXIF/files are not retained. Original rental bytes and custody code remain untouched.

[Pre-implementation audit](batch13d-r1/AUDIT_BEFORE_IMPLEMENTATION.md) identifies reuse/gaps before changes. [Persistence/security contract](batch13d-r1/PERSISTENCE_AND_SECURITY.md) defines exact bounds, history, authorization, media and scope. [Setup/verification](batch13d-r1/VERIFICATION_AND_SETUP.md).

## Additive schema and integrity

One new migration: `prisma/migrations/20261028160000_owned_item_documentation/migration.sql`. Four models: DevItemDraft, DevItemPhoto, DevItemVersion, DevItemEvent. No data backfill or historical migration change. User/Listing gain reverse Prisma relations only; no existing scalar state or permission is rewritten.

Owner/account/session/listing locks and expected revisions prevent lost updates. Required events, photos, draft changes and confirmation snapshots commit atomically. Deferred DB checks reject a write lacking its event or mismatched confirmation source. Versions/photos/events reject UPDATE/DELETE and populated TRUNCATE. An injected event failure rolls back actual draft state. Record caps and closed bounded DTOs prohibit arbitrary metadata, foreign refs or owner/role attribution.

Separate service/proxy and database guards require development, actual owned disposable DB/run identity and exact flag/configuration. Valid existing session and owner authorization; exact Origin/custom CSRF protection. No ADMIN/Staff bypass. Protected bytes never acquire public unrestricted links. A queued mutation blocked by an account lock is refused after its real session is revoked; account-before-session locking matches credential-revocation order. No change to existing auth/session issuance.

## Rental snapshot: explicit tested blocker

**No agreed rental snapshot was created.** The existing request/quotation/owner-acceptance contract has no borrower-reviewed documentation version/hash or same-proposal consent. Adding a unilateral latest-owner-version endpoint would invent a second agreement authority.

The tested participant-scoped adapter returns UNKNOWN / AGREEMENT_EXTENSION_REQUIRED, no snapshot and creationAllowed=false consistently. Neither new controlled bookings nor historical ones are backfilled. Required next approval: exact version/hash presentation and borrower acknowledgment, matching owner acceptance, transactional binding/replay/concurrency, cutover/compatibility and ongoing-obligation rules within the original booking lifecycle. The existing frozen price/date/station terms are unchanged. Fresh pickup evidence remains the actual physical-handoff condition baseline, distinct from agreed information.

Existing inspection and comparison views include a real saved-documentation panel under independent gates. Current owners can read their actual confirmed versions labelled **NOT agreed rental terms**. Borrowers receive no unagreed private versions/media; agreed information stays unknown. Actual pickup/return/later inspection sections and original timestamps/authorizations remain separate. There is no automatic photo pairing or legacy mapping invention.

## Verification and evidence

- 142/142 unit tests; TypeScript, lint without warnings, Prisma validation and normal production build pass.
- 19/19 final selected owned-isolated command groups pass. [Exact regression ledger](batch13d-r1/regression-ledger.json) records commands, artifact/run IDs, times, exits and cleanup. Not every historical command or workload condition was rerun.
- Real manual-first save/reload, photo-first creation, actual server decode/quality, owner declarations, protected byte hashes, explicit confirmation, preserved earlier versions after subsequent edits and listing changes, concurrent conflicting saves, foreign references/users, missing/media/CSRF/forged-field rejection, actual expiry/logout and pending-write revocation.
- Main test listing: draft revision12 with12 attributed events, two immutable confirmed versions and five protected photos (including two real browser uploads). Separate photo-first listing also saved. [Persistence evidence](batch13d-r1/persistence-evidence.json).
- SQL tamper tests reject version/photo/event changes/deletes/truncation and a valid-context draft update without its required event. Audit-failure injection503 rolls back, rather than removing operational evidence.
- Actual native browser login, save/reload, real file upload, confirmed history, actual existing inspection-panel read, English/Traditional Chinese switching and desktop1440/tablet820/mobile390 screenshots with strict browser collector and keyboard/overflow checks. [Screenshots](batch13d-r1/SCREENSHOTS.md), [browser evidence](batch13d-r1/browser-evidence.json).
- Full genuine virtual-camera meetup12/12, including pickup and return QR decoding plus13B inspection assertions. [Pickup](batch13d-r1/camera-pickup.json) / [return](batch13d-r1/camera-return.json).
- Existing13D,13C, original integration, meetup-session, login-readiness, authorization/MFA/Admin, rental API/browser, account-security, chat and Support including13A companion rerun.
- Fresh migration installation and existing populated historical upgrade/replay/preservation suite pass; previous rows/foreign keys/evidence/checksums preserved and Prisma schema diff empty. [Migration evidence](batch13d-r1/migration-evidence.json). Code rollback leaves additive data intact; no production down-migration/backup restoration certification claimed.

Initial type, lock-query, new trigger-field and textarea-label failures are retained separately in [initial outcomes](batch13d-r1/initial-outcomes.json). No deadlines/assertions/collectors weakened. Historical overlapping-login timing remains unresolved; passing this selected run is not a resolution claim. Expected audit-failure rejection is a successful negative test, distinct from initial command failures. No live model, external inference/cost, physical-phone camera, complete accessibility or aesthetic acceptance result is invented.

## Preservation and next review

[Preservation manifest](batch13d-r1/preservation.json):114 original core/historical files unchanged, including all old migrations, booking/listing/auth, original camera/meetup/evidence,13B/13C/13D services, Support/staff/AI, lockfile and product blueprint. Old Prisma schema preserved apart from reverse relations/new models. Original14 objectives and Stage6–9 sections unchanged. [Cleanup](batch13d-r1/cleanup.json) confirms no remaining owned13DR1 databases/marked test principals. [Complete inventory](batch13d-r1/CHANGED_FILES.md).

Working development-only: saved drafts/photos, confirmations/history and scoped inspection integration. Synthetic: test items/accounts/photos. Explicitly blocked: real rental agreement binding, production requirements, provider inference, item recognition/damage causation/value, production retention/deletion/holds, ownership-transfer/account-deletion compatibility, accessibility/visual acceptance and actual publication.

Unresolved13B-R1 structured claims, borrower responses, qualifying notification delivery, enforceable48h deadline, exception/extension/appeal, settlement and production dispute cutover remain blocked. Canonical24h owner inspection/48h borrower response unchanged. No real eKYC, live Vision, new staff powers, payments or Stage11 execution. The [original14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) stays authoritative; Stage10 In Progress and all earlier unfinished commitments remain.

Stop for independent review. Snapshot agreement extension and production retention/compatibility must be approved separately; this batch does not authorize further engineering or rollout.
