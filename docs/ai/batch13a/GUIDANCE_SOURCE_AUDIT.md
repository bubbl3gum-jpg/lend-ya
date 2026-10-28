# Procedure source audit and language policy

This candidate answers only implemented procedure facts or explicitly says a policy is unavailable. Source references are repository paths, not claims that the source is an approved legal/financial policy. Code existence and current behavior are reviewed; production authority is not inferred. No arbitrary retrieved document can extend the registry.

| Topics | Authoritative existing source | Candidate boundary |
| --- | --- | --- |
| Borrowing / listings | `app/listings/[id]/page.tsx`, `app/listings/new/page.tsx` | Requests are not acceptance/availability; no publishing or acceptance action. |
| Pickup, QR, return, inspection, condition/evidence | `lib/rental-lifecycle.ts`, `lib/rental-checklist.ts`, `app/api/bookings/[id]/dispute/route.ts` | Scans, physical receipt, evidence and lifecycle remain separate; no completion, guilt or compensation finding. |
| MRT and failed location/QR | `lib/meetup/location.ts`, `lib/meetup/service.ts` | Existing geofence/consent/fallback rules only; TEST_LOCATION never real MRT arrival. No station changes. |
| Deposits / payments | Canonical roadmap Stage 13 | Distinguish displayed price/deposit; no implemented collection/custody/refund or guaranteed policy. |
| No-show | Canonical roadmap Stage 12 | No invented penalty, deadlines or auto-cancellation; retain agreed facts and seek human clarification. |
| Contact / intake | `lib/support-staff-candidate/commands.ts`, existing `/dev/support-requester` | Test intake only; explicit user submit in existing flow; no production response-time promise. |
| Technical issue | `lib/api-response.ts` | Capture non-secret visible error and step; no state repair or bypass. |
| Account access | `docs/design/batch11f/STAGE_9_COMPLETION_ASSESSMENT.md`, existing auth | No recovery, identity proof, password disclosure or reset-email promise. |

`lib/assistant/messages.ts` is a typed feature catalogue keyed identically in en/zh-TW, using existing locale provider/preferences. It does not fork language/session handling or alter the existing 331-key catalogue contract. All 18 static guidance and clarification entries have Chinese text, tested for presence and known English leakage. Source identifiers and immutable original text are not translated. Arbitrary user report is labelled unverified/original-language; no external translation service or invented translation. Partial source translation is explicitly unavailable, rather than silently pretending mixed text is a translated answer.

No actual model, genuine bilingual quality acceptance, independent security certification or product-owner visual approval is claimed. User feedback from the earlier human pilot motivates avoiding irrelevant return drafts for unrelated sources; those feedback scores remain untouched and provisional.
