# Source-backed agreement extension gap analysis

| Area | Baseline / reuse | R2 candidate | Remaining gap |
|---|---|---|---|
| Owner documentation | `lib/item-studio/service.ts`, `DevItemVersion/Photo/Event`: immutable confirmation, private photos | Explicit version designation and atomic revision event in `lib/rental-documentation/service.ts` | Production retention, deletion and transfer policy |
| Listing participation | `app/listings/[id]/page.tsx`, `app/api/bookings/route.ts`: existing status/account/media/moderation/station/availability gates | Designation does not activate a listing or bypass actual request checks | Production undocumented-listing cutover unapproved |
| Borrower request authority | Existing quote, material price/deposit/date/station, serializable Booking insert and requestKey/hash | Session-bound quote context, exact normalized acknowledgement; DB-stamped timestamp in same Booking transaction | No general amendment mechanism; cancel/reject and renew review |
| Owner acceptance authority | Existing `app/api/bookings/[id]/route.ts` PENDING→CONFIRMED | Same transaction checks selected event and records DB-stamped acceptance | Production mutual-agreement/cutover policy unapproved |
| Content identity | R1 immutable owner version and private source photos | Canonical digest covers exact declarations/provenance/photo references; immutable reference chain through Booking | Not physical authenticity, machine verification or signed legal acceptance |
| Idempotency/concurrency | Existing exact request key/hash and listing locks | Normalized version/context/ack added to hash only when present, unique context, expected designation revision, serializable failure closed | No invented automatic retries on changed content |
| Legacy agreements | Existing Booking price/date/station and lifecycle | Nullable fields remain null; original request hash preserved when docs absent; actual legacy acceptance tested | No backfill; historical missing docs UNKNOWN |
| Evidence | Existing `BookingEvidencePhoto`, meetup event/receipt and private participant readers | No original evidence writer changes; review media is a separate protected projection of R1 owner photos | Pickup remains actual physical baseline; old area mappings unknown |
| Inspection/disputes | Existing13B preview and13D comparison | Reusable actual agreed ledger on booking/inspection/comparison |13B-R1 real typed claims/responses and qualifying notification delivery still blocked |
| Localization/design | Existing heritage tokens, locales and surfaces | Ruled readable ledger, en/zh-TW labels, protected photo grid, responsive checks | Original user text/raw categories not translated; wider Stage9 visual acceptance unresolved |
| AI/eKYC/Support/financial | Existing refusal/inert contracts and scoped Support worker | No changed authority or inference path | No providers, real verification, automatic decisions or production rollout |
