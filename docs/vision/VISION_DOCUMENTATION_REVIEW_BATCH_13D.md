# Batch 13D — Vision & Item Documentation Foundation

28 October 2026 · Asia/Taipei · development candidate for independent review, not production approval.

## Baseline and revisions

- Starting branch: `feature/identity-assurance-foundation-batch-13c`.
- Actual clean baseline HEAD: `a7286ab0ba6958504d580723bb5051789b49e6f8`.
- Verified ancestor implementation: `13b114330535c0ba8a9066230dba29d9a8f23666`; evidence: `f639e074005a59a146ba2f8c9318b84d9709712c`.
- Isolated branch: `feature/vision-item-documentation-batch-13d`.
- Implementation: `3b5c964772a9e140eeb34900f80d47535acf0227`.
- Separate evidence closeout: `8476e2157a985669a2d3730b3117c70f6d213bc4`.

No push, merge, deployment, existing application DB mutation, new migration/schema/dependency, live AI/Vision/eKYC provider, biometric processing, staff/Support activation, financial action or autonomous dispute decision. No Owner Listing Studio/Borrower AI batch started.

## Delivered application behavior

`/dev/item-documentation` is a real bilingual heritage UI with actual scoped server reads and multipart preview. It is independently gated to development plus the verified fresh owned-test database/run identity and current authenticated actor. It is not an invented listing directory or synthetic API-success mock.

An actual listing owner can see the current item/category and linked original listing media, view the versioned category-specific areas/safety suggestions, select or capture permitted photos, declare known wear/accessories, see missing selected views, explicitly review and receive actual server-decoded quality hints. **Nothing is saved or published.** Changed source revisions conflict; incomplete/unconfirmed/invalid submissions fail. No new publication requirement or durable owner-confirmation record is activated.

Version1 camera, power-tool and camping definitions use different views/accessories/functional guidance; unknown categories use a conservative general checklist. Broad legacy category labels are not item recognition and applicability remains explicit future work. The immutable rental-specific versioned snapshot is not implemented: never pretend legacy photos followed these new requirements.

Participant booking mode displays original pickup/return/later-inspection evidence with authorship/server times and links to the original protected bytes. Temporary side-by-side photo selection under matching area headings is **human pairing, not verified mapping**. Missing/obscured/unclassified views stay unknown. Original notes and checklists are accessible, and current listing accessories are explicitly not a rental inventory snapshot. Pickup is the rental baseline, not listing/later material.

Stage receipts are separate from photo validity. Existing 13B authority checks supply return acknowledgment; the new read-only pickup status requires its matching completed challenge/participant event and bilateral handoff confirmation. Missing proofs remain null. These acknowledge application events, not forensic capture authenticity or real-MRT arrival. The new comparison fixture deliberately has no genuine receipt; its null timestamps are tested. The unchanged full meetup suite separately exercises actual QR/physical-receipt and 13B authority behavior.

[Architecture/gap audit](batch13d/ARCHITECTURE_AND_GAPS.md) · [contracts/security/quality](batch13d/CONTRACT_AND_PRIVACY.md) · [setup and limitations](batch13d/SETUP_AND_LIMITATIONS.md).

## Quality and Vision boundary

Reuses existing `validatePrivatePhotos`: true still-image decode, MIME/format/size/pixel/animation checks and metadata-stripped re-encoding. New bounded128×128 greyscale exposure/edge-detail calculations return labelled retake suggestions and decoded dimensions. A smooth image can trigger low-detail, and a sharp bright irrelevant image can pass; hints establish neither coverage nor damage/function/authenticity. No AI has identified or inspected the item.

Provider-independent future input/output types cover category/checklist version, authorized original refs/provenance, quality/possible differences/accessory uncertainty/retakes, uncertainty/confidence and unavailable/failed states. Structural validation is not semantic correctness or resource authorization. Current model state is always **UNAVAILABLE**, observations empty; no transport/SDK/key/export/action path.

Local notes are unsent. New selected photos and declarations are transient preview inputs, never new rental evidence. Original bytes/stages/timestamps/authorship/booking relationships remain intact; original QR/GPS/camera/consent/custody authorization is unchanged. No liability, repair costs, deductions or dispute resolution.

## Actual verification

- 140/140 unit tests; TypeScript, lint with no warnings, Prisma validation and normal production build pass.
- 18/18 final **selected** isolated command groups pass; [exact ledger](batch13d/regression-ledger.json) contains commands, artifact IDs/times, exits and cleanup. This is not a claim all historical commands/concurrency conditions passed.
- Actual native browser login, image file selection/multipart quality review, server category/fallback selection, live en/zh-TW switching without lost owner declarations, real protected image loading, desktop/tablet/mobile owner/comparison layouts, keyboard focus and no overflow. [Screenshots](batch13d/SCREENSHOTS.md), [browser evidence](batch13d/browser-evidence.json).
- Real HTTP owner/borrower/unrelated legacy ADMIN boundaries, closed Support selector, malformed/MIME-mismatched/incomplete/unconfirmed/forged inputs, missing custom CSRF header/wrong Origin, stale listing revision, suspended preview refusal, actual session expiry/logout denial and original private-byte hash equality.
- Full `test:meetup`:12/12 including genuine virtual-camera pickup and return decoding; [pickup](batch13d/camera-pickup.json) / [return](batch13d/camera-return.json). Original camera/meetup/assertion/collector files unchanged.
- Original integration, meetup-session, login-readiness, authorization, MFA, Admin, rental API/browser, account-security, chat, Support channels/scoped staff including 13A companion,13C browser, historical populated migration preservation and normal build rerun.

Initial failure is not hidden: the first browser run reached owner review but failed exact select naming; explicit accessible labels corrected it without relaxed assertions. A later run **overlapped unit/tsc/lint** and failed the existing five-second native-login navigation assertion: login returned200, while `/dashboard` remained compiling. The serial fresh rerun passed unchanged. This recurrence of the historical overlap timing issue remains unresolved; it is not attributed to new authentication code (none changed). [Verification detail](batch13d/VERIFICATION.md) and [initial/failure ledger](batch13d/initial-outcomes.json) retain separate results with no raw credential snapshots.

## Preservation and unfinished commitments

[Preservation manifest](batch13d/preservation.json):113 original core/historical files unchanged, including existing booking/listing/auth, evidence/media/checklist, meetup/camera, inspection, identity, Support/staff/AI, schema/migrations/lockfile and canonical product blueprint. Original14 objectives/order and Stage 6–9 sections unchanged. [Migration evidence](batch13d/migration-evidence.json) preserves prior historical rows/checksums/foreign keys/evidence bytes in a newly owned fixture. [Cleanup](batch13d/cleanup.json) confirms zero remaining owned 13D DBs/marked test principals. [Complete changed-file inventory](batch13d/CHANGED_FILES.md).

Working candidate only: documentation selection/unsaved review, actual decode heuristics, authorized comparison/local notes. Test photos/accounts/bookings are synthetic. Blocked: durable declarations/owner confirmation/audit, per-rental checklist/accessory snapshots, capture-area provenance, applicability/exceptions, production publication requirements, live Vision/data processing approval and any actual damage/accessory detection. Retention and compatibility need reviewed additive persistence before enforcement.

No separate 13B-R1 artifact was found at baseline; the user's named unresolved 13B-R1 claim/response and qualifying notification dependencies remain explicitly preserved. No durable structured claims, persisted borrower responses, reliable delivered notification, enforceable 48h timer, deadline exceptions/extensions/appeals, production lifecycle cutover or settlement was implemented. Canonical 24h owner inspection /48h borrower response unchanged. No station controls, Support rollout, publishing/settings approvals or Stage 9 acceptance silently completed.

The [canonical 14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) remains authoritative; Stage 10 **In Progress**.13D is a foundation increment with dependencies in existing operations/recovery/account/marketplace stages, not a new stage or model/automation approval. Stop for review.
