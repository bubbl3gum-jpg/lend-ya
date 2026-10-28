# Evidence architecture audit and implementation gaps

Baseline: clean `feature/identity-assurance-foundation-batch-13c` HEAD `a7286ab0ba6958504d580723bb5051789b49e6f8`. Supplied implementation `13b114330535c0ba8a9066230dba29d9a8f23666` and closeout `f639e074005a59a146ba2f8c9318b84d9709712c` verified ancestors. New isolated branch: `feature/vision-item-documentation-batch-13d`.

| Existing source | Actual behavior / reuse | Gap and boundary |
| --- | --- | --- |
| `prisma/schema.prisma`: Listing, ListingMedia | Actual owner/category/condition/categoryDetails and timestamped photo/video records | No immutable rental-specific accessory inventory, checklist revision or per-area photo mapping |
| `lib/listing-media.ts`; `app/api/listings/route.ts`; `app/api/listings/[id]/route.ts` | Bounded multipart; sanitized decoded still photos; video validation via ffprobe; existing publication/media/access checks | Do not duplicate storage, edit active listings or install new publication requirements. New preview stores nothing |
| `lib/booking-evidence.ts` | Existing JPEG/PNG/WebP actual decoding, size/pixel/animation/MIME validation, metadata-stripped re-encoding; private evidence submission rules | Reuse `validatePrivatePhotos` for transient preview inputs. No alternate rental upload/capture endpoint |
| `lib/rental-checklist.ts` | Five exact yes/no/not-applicable/unknown questions for matching, inspection, damage, accessories and function | Not category-specific viewpoints. Preserve current fields and all existing requirements |
| `lib/meetup/service.ts`; `app/api/bookings/[id]/handoff/route.ts`, `return/route.ts`, `inspection/route.ts` | GPS/freshness/accuracy, QR/virtual-camera verification, explicit consent, receipt/custody/lifecycle; existing evidence append rules | New checklist/photos do not satisfy these prerequisites. No biometric/eKYC authority or custody shortcut |
| `prisma/schema.prisma`: BookingEvidencePhoto + `app/api/bookings/[id]/evidence/[photoId]/route.ts` | Original bytes, booking/uploader/stage/createdAt and participant-only bytes; broad ADMIN alone denied | Stage is not proof of capture time, area visibility or verified physical event. Never re-label or replace historical records |
| Handoff / Return / categoryDetails | Actual owner/borrower notes and five-question checklists; current listing accessories where declared | Current listing data is not the historical pickup inventory. No invented category mapping or included accessory count |
| `lib/inspection/service.ts` | Authorized participant summary, real return receipt and stable 24h window, original/later evidence distinction | Reuse summary for comparison; absent actual QR receipt yields null, even for an INSPECTION status fixture |
| `lib/inspection/future-contracts.ts` | Inert Vision/eKYC contracts and always-denied execution | Preserved. New small Vision contract extends category/version/area/references, unavailable/failure/retake semantics without activating inference |
| Support / staff / 13A companion | Separate scoped private-channel data layer and existing gates | No Support reader, channel/case selector, staff grant or Support evidence audience added |

## Working slice

Version1 registry covers camera equipment, power-tool guidance under the existing broad Tools category, camping equipment and conservative general fallback. Different viewpoint IDs and safety suggestions; no item recognition. Broad categories cannot establish exact subtype or applicability. Owners explicitly document actual included components/unknowns; later applicability/exceptions and richer subtypes need policy/design review.

`/dev/item-documentation` and `/api/dev/item-documentation` provide actual own-listing reads, selected/captured file preview, server-decoded quality hints and an explicit owner-reviewed **unsaved** result. Existing source revision is hashed; a changed listing/media/owner invalidates preview. No new draft, publication, checklist, evidence or confirmation is persisted. Two reviews of the same unchanged source are non-mutating previews, not conflicting committed submissions or durable audit events.

Booking mode reads actual authorized pickup/return/later records and allows side-by-side temporary human pairing under the current category template. Legacy evidence has **no recorded area mapping**. Unselected, missing or obscured areas remain unknown. Choosing an image does not establish that it shows that area or a condition difference. Original pickup evidence is the rental baseline; listing/later material is separately labelled. Original notes/checklists are accessible in a disclosure; current listing accessory declaration is explicitly not a rental snapshot.

Complexity: registry, deterministic hints and scoped preview are small/medium; durable versioned declarations/owner confirmation, per-rental checklist snapshots, authenticated capture-to-area provenance, applicability/exception policy and secure immutable claim submissions are medium/large future work. They require additive persistence/migration/compatibility approval before production requirements. No duplicate custody/evidence store or unnecessary general AI framework.

## Preserved blockers

No separate Batch13B-R1 artifact was found in the starting checkout. Preserve the user's explicitly named unresolved 13B-R1 dependencies and the existing 13B reports: durable immutable structured claim submissions, persisted borrower responses, qualifying notification-delivery events, enforceable 48h deadline, exception/extension/appeal policy, production lifecycle cutover and any settlement. The 24h owner inspection and 48h borrower response durations remain unchanged. Nothing in 13D supplies delivery proof, claims, response persistence or financial authority.
