# Verification and acceptance record

2 November 2026. Baseline `0d88f4cd1f1aadb44792da24496888174115668d`. Branch `fix/mandatory-rental-meetup-integration`. [Complete run ledger](verification.json) retains initial failures, superseded candidate runs and final core-MVP runs separately. No GitHub CI run is claimed for this unpushed branch.

## Selected results

| Command | Actual result |
|---|---|
| `npm run test:unit` | PASS 202/202 |
| `npm run test:meetup` | PASS 13/13, full expiry/QR/GPS/receipt/inspection suite |
| `npm run test:meetup-camera` | PASS 5/5, additional no-preview new-booking negatives and genuine virtual-camera pickup/return decoding |
| `npm run test:meetup-session` | PASS 6/6, session loss/logout/polling cleanup |
| `npm run test:rental-api` | PASS 13/13 after updating legacy flow setup and immutable-row teardown |
| `npm run test:rental-browser` | PASS 4/4, actual native UI/evidence/explicit receipt/restart |
| `npm run test:integration` | PASS, original station/filter/rental/logout assertions retained; no unexpected browser errors |
| `npm run test:admin` | PASS 7/7, including new seed-booking verification and historical seed preservation |
| `npm run test:mvp` | PASS 12/12, including production-mode filtering/hydration and actual QR-protocol fixture lifecycle |
| `npm run test:support-handoff` | PASS 1/1, mocked inference; actual protected synthetic Support persistence |
| `npm run test:translation-sidecar` | PASS 1/1, mock-only; no provider execution |
| `npm run test:migration` | PASS, original fresh/historical upgrade assertions |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npx prisma validate --config prisma7.config.ts` | PASS |
| `npm run build:verify` | PASS, normal production build in a fresh owned database, no substituted font |

Node test totals include parent test records. These are selected relevant suites, not every command in package.json. Timeline and run IDs are authoritative in the ledger. Final label-only assurance correction was followed by targeted camera, TypeScript, unit, lint, migration and normal-build verification; earlier successful lifecycle/Admin/MVP/Support/translation runs are retained with their exact times rather than described as newly rerun.

## Security acceptance evidence

- Every native new booking is enrolled atomically without a preview allowlist or toggle. Initial missing bilateral GPS blocks evidence. A different valid coordinate for the second participant is accepted within the radius; equal coordinates are not required.
- New-booking pickup without a challenge fails; wrong participant, consumed QR under another verification key, missing physical receipt and manual-code downgrade attempts fail. Missing required server configuration returns 503 and leaves no new Booking row.
- Pickup check-ins do not authorize return evidence. New RETURN check-ins are required. The old unverified inspection shortcut fails for enrolled bookings.
- Full retained engine checks cover wrong stage/booking, expiry, one-time consumption, bounded idempotent retry, inaccurate/outside/unavailable GPS, independent reduced-assurance acknowledgements, wrong Origin, cancellation/dispute invalidation and expired confirmation windows.
- The final camera case creates a normal booking without preview allowlists. Pickup and return use native virtual-camera QR decoding in independent authenticated mobile contexts. Actual permission denial and explicit bilateral GPS fallback are exercised at return; QR is still scanned. [Camera JSON](camera-return.json) and [receipt/inspection separation](investigation-qr-receipt.json) retain safe diagnostic evidence.
- Reduced-location assurance is now retained in verify/replay responses, matching issuance's `REDUCED_LOCATION_UNVERIFIED`, and is displayed explicitly. This corrects a narrow pre-existing DTO inconsistency; no acceptance threshold is relaxed.
- QR validation alone leaves HANDOFF_PENDING / RETURN_PENDING unchanged. Separate user receipt and condition controls remain necessary. Return receipt enters INSPECTION without accepting condition; inspection is explicitly performed later.
- Missing/failed camera initialization, invalid QR content, interrupted tracks, stop/navigation cleanup, refresh/restart and real session invalidation remain tested. No general browser-error suppression or increased deadlines.
- TEST_LOCATION remains independently gated, bilateral, expiring/revocable and unmistakably simulated. No station coordinates are changed or temporary coordinates logged/committed.

## Initial failures and justified corrections

1. During development, TypeScript caught temporary JSX prop placement/type-inference errors and incompatible full Playwright context types. Props were restricted to BookingActions; the test helper now uses only its required structural cookie interface. Final typecheck passes.
2. A supplementary camera run before the owner's core-MVP clarification failed the new rollback fixture: an active rental correctly triggered BOOKING_OVERLAP (409) before the intended activation refusal. The fixture was changed to a separate available listing. The overlap guard was not relaxed. A later full run passed.
3. After mandatory enrollment replaced the superseded development gate, `test:rental-api` initially failed an older booking test that submitted handoff without GPS/QR. Its cleanup also attempted to delete a Booking referenced by immutable MeetupSession. Positive fixture progression now performs actual authenticated GPS and QR-protocol calls; missing-verification negatives remain in the dedicated meetup suite. Identical bound receipt retries legitimately return two successful idempotent responses; the concurrency assertion additionally verifies exactly one physical-receipt event and unchanged evidence counts.
4. Admin's six subtests initially passed, but its parent failed while cleanup tried to delete new immutable seed-booking records. Cleanup now leaves those rows intact for the existing guarded whole-database teardown. Seed assertions verify that newly created seed bookings have sessions, and historical seed preservation assertions remain. The corrected Admin run passed 7/7.

No migration SQL, safety threshold, overdue reservation guard, camera requirement or evidence validator was changed to obtain passes. API-focused test helpers submit real QR payloads through authenticated application routes; they are explicitly not camera-decoding evidence. Historical preview tests use clearly authored historical SQL fixtures, never a public endpoint that opts new bookings out.

## Preservation and limits

[Preservation evidence](preservation.json): all 33 historical migration SQL files match baseline hashes; schema and station catalogue are unchanged. The seed writer changes only its new-booking branch and never retrofits existing bookings. Every changing suite uses a newly marked owned disposable database. [Cleanup check](cleanup.json) records remaining test database count; raw private logs stay ignored/outside Git. Existing stash and configuration are preserved. No existing application database or original booking #4 was inspected or changed.

[Mobile screenshots](screenshots/README.md) show actual pickup verification, separate physical return/inspection and completion. No QR issuance-secret screenshot is committed. This is browser/virtual-device evidence with emulated geolocation, **not physical-phone acceptance**. Camera-token verification proves possession of the one-time QR payload under the required participant/stage/GPS checks; it is not cryptographic hardware-camera attestation or proof against spoofed GPS. No fake client `camera=true` assertion is introduced.

Before release: configure a stable private meetup secret and bounded confirmation period; obtain owner acceptance using two physical authenticated devices in a trusted HTTPS context, genuine station GPS (or explicitly TEST_LOCATION rehearsal), camera focus/permissions and separately confirmed inspection. Review assistance/recovery readiness. No merge, push, deployment, provider call, financial decision or production-data operation is performed by this task.
