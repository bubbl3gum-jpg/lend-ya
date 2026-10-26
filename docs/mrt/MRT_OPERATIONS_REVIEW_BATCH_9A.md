# Batch 9A review — MRT Operations and Geofencing Test Lab

Branch: `feature/mrt-operations-geofencing-lab-batch-9a`. Final tested implementation SHA: **df375807e7bdd0e4b2956fa54847bed8d5e42eac**. Baseline: `79ddffd9fd0a99623ac8ac00dcb491c52857ed0b`, the exact subsequent closeout of Batch 8D implementation `49955958d6915b41cc087cd997a28f62ffdeaeac`; clean working tree and ancestry verified before branching. An evidence-only closeout commit follows the implementation; resolve its exact revision with `git log -1 --format=%H -- docs/mrt/MRT_OPERATIONS_REVIEW_BATCH_9A.md`. Final handoff identifies both revisions. Nothing merged, pushed or deployed.

Implemented Operations → Locations for existing ACTIVE legacy Admins and a separate explicitly owned-development Geofencing Test Lab. The workspace is read-only; the Lab is TEST_LOCATION math and cannot write a booking/check-in/challenge, alter evidence/custody or authorize another participant. No new staff roles or operational mutations were activated.

## Independent review package

- [Current feature inventory, exact source references and station-policy gaps](MRT_OPERATIONS_INVENTORY_BATCH_9A.md).
- [Lab ownership, consent, expiry, auditing, setup and cleanup contract](GEOFENCING_TEST_LAB_CONTRACT_BATCH_9A.md).
- [Explicit unfinished Stage 7 production decision tracker](../support/STAGE_7_PRODUCTION_DECISION_TRACKER_BATCH_9A.md).
- [Changed-file inventory](../security/batch9a/changed-files.txt), [full regression ledger](../security/batch9a/verification.json), [preservation hashes](../security/batch9a/baseline-preservation.json), [cleanup](../security/batch9a/cleanup.json).
- [Actual Locations/Lab authorization, privacy and browser evidence](../security/batch9a/locations-lab-security.json), [safe audit example](../security/batch9a/lab-audit-sample.json), [production refusal](../security/batch9a/production-refusal.json), [catalogue coverage](../security/batch9a/catalogue-coverage.json).

Responsive screenshots from real application routes and native browser sessions:

| Surface | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Read-only MRT Locations | [Desktop](../security/batch9a/locations-desktop.png) | [Tablet](../security/batch9a/locations-tablet.png) | [Mobile](../security/batch9a/locations-mobile.png) |
| Owned TEST_LOCATION Lab | [Desktop](../security/batch9a/lab-desktop.png) | [Tablet](../security/batch9a/lab-tablet.png) | [Mobile](../security/batch9a/lab-mobile.png) |

Screenshots use synthetic self-device readings at a public official station. No real personal coordinates, QR payloads, evidence images or credentials are committed. User-facing times are Asia/Taipei; ledger timestamps are technical UTC.

## Working, read-only, test-only and blocked

- **Working/read-only:** actual 120-station, six-line official snapshot, bilingual station names/codes, interchange identity, station/code/line/status filters, map keyboard selection, exact details, actual persisted operational flag, coordinate availability and existing server policy values. The schematic is labelled as such; directory filters do not rewrite the catalogue or booking choices.
- **Production-safe read-only surface:** current-session ACTIVE ADMIN pages/API with minimal allowlisted DTO, bounded station query, private/no-store and existing guards. Production build/start tests the workspace while independently refusing the Lab, even with its flag configured. This does not authorize deployment of the whole inherited candidate branch/migration history.
- **Working/test-only:** explicit self-device consent, native geolocation on demand with denial handling, synthetic map centre/sample selection, north-up metric boundary plot, existing accuracy/freshness/Haversine calculations, browser/session incarnation binding, expiry ≤1 hour, early revocation and safe audit. All results are TEST_LOCATION with arrivalVerified=false.
- **Blocked:** unsafe-station suspension, restoration, operational/geofence edits, independent station approval/execution, real Operations roles, production GPS simulation and real Support activation. No station mutation endpoint or emergency bypass exists. The current `operational` flag has no incident/review/restoration model.

## Verification and actual results

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
| `npm run test:locations-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:locations` | Exit 0; ℹ pass 7; owned cleanup confirmed |
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
| `npm run test:support-staff-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-staff-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-staff` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:support-ticket-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-ticket-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-tickets` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:unit` | Exit 0; 84/84 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

The changing suites ran exclusively against newly created, ownership-verified disposable databases. The final maintenance query was read-only and confirms complete owned-resource cleanup. No existing application database was reset, migrated or seeded. No 9A migration was added; all 26 historical SQL migrations and public Prisma schema are unchanged.

New verification covers actual official identifiers, all lines/interchanges, operational eligibility, strict DTOs, current-session Admin denial, Lab allowlist/consent, exact Origin/CSRF, wrong browser and replaced/expired/suspended sessions, sample boundaries, accuracy/freshness, centre/session expiry, revocation, audit failure, actual native browser GPS permission denial/grant, map selection, responsive widths/keyboard focus and Owner/Borrower booking-station policy. A valid Lab reference does not make an unoffered or globally ineligible station quotable. Protected station/listing/booking/meetup/evidence/Support/staff fixtures remain identical after the tests.

The full meetup regression passes 11/11, including genuine virtual-camera pickup and return QR decoding. Safe metadata: [pickup](../security/batch9a/camera-pickup.json), [return](../security/batch9a/camera-return.json), [post-return checkpoint](../security/batch9a/investigation-qr-receipt.json). Manual-code recovery and camera negatives remain distinct checks. No QR payload, evidence image or coordinates are committed.

## Initial outcomes retained separately

- The first new API/privacy cases passed, but native browser acceptance stopped on an exact select-label lookup. Select labels included option text; explicit accessible names now identify MRT line, status, official station, duration and map-selection controls. The subsequent full new suite passes; no timeout was increased.
- First production verification compiled the application but stopped at TypeScript in the new tests: the official station JSON correctly allows missing coordinates. Test fixtures now explicitly choose/assert a station with numeric coordinates; the feature preserves unavailable-coordinate states instead of inventing data. There are 109 validated-coordinate records and 11 without coordinates; the official file remains unchanged.
- The first unit run caught the two new Admin API routes missing from the exact authorization inventory. A separate 9A inventory pins their routes and delegated Lab guard sources. All old route hashes and guard recognition checks remain intact; only the exact new Lab route gets its separately pinned delegated-guard assertion. Initial failure metadata and final results are distinct.
- The initial broad Admin browser run caught its expected navigation array missing Locations. Only that new item was added to the assertion. All old links, keyboard/navigation/detail/privacy assertions and deadlines remain unchanged; a fresh owned-database follow-up is recorded separately.
- Final ledger validation also found the generic authorization sweep expecting 401/403 for the new default-off Lab route. That exact route now uses its valid status operation and requires 404 when disabled; every legacy route retains its previous exact denial expectations. The configured Lab suite separately proves 401/403 authentication/authorization denial. The initial sweep failure is retained; it was not an access bypass.
- A warning in the initial new fixture came from parallel queries on one pg Client. The snapshot helper now reads those tables sequentially with the same comparisons. No application transaction or safety test was weakened.
- Final consent review makes in-flight GPS/results ignore withdrawal/unmount, checks centre identity again after audit, and prevents an expired temporary centre from silently becoming a real-station calculation. Production/unallowlisted testers see an unavailable explanation rather than an inactive Lab link. Revocation erases state before auditing, so audit failure cannot force private coordinate retention.

No recurring chat-login or synthetic-camera failure occurred in the final sequential runs. The navigation-array, initial label, inventory and test-coordinate typing failures above were investigated with concrete causes and retained separately, rather than hidden by blind retries. Final map review replaced an imprecise plot-edge caption with an explicit metric scale bar and reused the existing exact-code search helper so API and directory agree (R05 selects Daan, not BR05). Native screenshots were refreshed after these focused corrections; only the framework development portal overlay is omitted.

## Preservation, limitations and next batch

All existing authorization, staff/MFA/approval, Support, booking, Owner/Borrower station selection, QR/camera/GPS/consent, custody/evidence and dispute implementations are unchanged. The sidebar gains only Locations. The proxy adds only the Lab refusal and Locations matcher while preserving earlier refusals and CSRF logic. Existing API authorization inventory files remain unchanged; 9A is an additive inventory. No official catalogue, radius policy, historical migration, production station row or user database was edited.

The catalogue is an imported snapshot dated 2026-10-16, not a live closure/safety feed. Missing coordinates remain unavailable, and exit-specific calibration is unresolved. Lab device binding is a browser cookie/session credential, not verified hardware. Its state is intentionally process-local/single-worker; restart fails closed, and page-close revocation is best effort with server expiry as backstop. Upstream/proxy/APM production logging remains a separate infrastructure review. Physical iOS/Android GPS/camera acceptance is not certified by a synthetic browser test.

Recommended next step: independently review this read-only milestone and the explicit station-operation gaps. Resolve authoritative coordinate coverage/calibration and catalogue-import precedence, then separately authorize an additive station-operation/history design and scoped suspension/restoration execution policy. Do not flip operational booleans as a substitute for independent authorization, overwrite agreed booking stations, or block existing return/inspection/support obligations. Real Operations activation and high-risk execution still require their separately reviewed identity/scope/approval cutover.

Stage 7 remains explicitly unfinished in the linked decision tracker: final eligibility, categories, lifecycle, retention/deletion/holds, content, anti-abuse, human/assignment policy, credential infrastructure, recovery, notifications and mediation are not approved. Stage 8 Announcements/Platform Settings should be a separate scoped batch with approved routine permissions, independent high-impact/high-risk approvals and immutable audit. No new powers or AI administration are authorized here.
