# Milestone 3 — secure MRT pickup and return verification

> Follow-up: [Milestone 3.1](MILESTONE3_1_QR_ACCEPTANCE.md) separates QR redemption from confirmation and adds an explicit confirmation-period configuration. Its migration and private HTTPS guide supersede the timing/setup instructions below. This original report records Milestone 3 evidence.
Review branch: `feature/qr-mrt-handoff-return`. Base: `feature/intelligent-chat-moderation` at `fcd369a35fbd07df9ef9f9092b394ab0298d20b2`. Date: 2026-10-19 (Asia/Taipei).

This branch adds an explicitly enrolled, participant-restricted preview. Public QR enforcement remains off. Existing bookings are not enrolled by migration or by setting preview IDs alone. No live database, merge, deployment, payment/deposit processing, external AI, notification service or native app is involved.

**Coordinate limitation:** the existing catalogue has 109 source-documented coordinate pairs and 11 missing pairs, all on the Circular Line. No coordinates were invented. Those 11 stations return location unavailable and can use the explicitly bilateral reduced-assurance path. Official source retrieval is blocked by the cloud egress proxy. Full coordinate coverage and physical-device/onsite calibration are outstanding, so this is not approval to enable verification for real users.

## Existing lifecycle audit and authoritative integration

Before this change, the Owner recorded the initial Handoff and its checklist in CONFIRMED, then the Borrower independently recorded condition evidence to reach IN_USE. The Borrower initiated Return from IN_USE. Owner `PATCH {action:"inspect"}` moved RETURN_PENDING to INSPECTION; there was no separate physical-return receipt. Owner inspection then accepted/completed or recorded a problem without completing. Open disputes block normal completion.

| Operation | Existing state transition | Enrolled-preview integration |
| --- | --- | --- |
| Owner handoff evidence | CONFIRMED → HANDOFF_PENDING | Existing checklist, original evidence and explicit condition acknowledgement remain required. No scan changes this record. |
| Pickup challenge verification | None | Both fresh arrivals (or bilateral fallback), Owner stage evidence, correct Borrower, current challenge/state/version. Consumes the challenge only; still HANDOFF_PENDING. |
| Borrower physical receipt + own evidence | HANDOFF_PENDING → IN_USE | Existing authoritative `submitRentalStage` additionally requires the verified live pickup challenge and a separate `physicalReceipt:true`. Missing checklist/condition/receipt/proof cannot start use. |
| Borrower return evidence | IN_USE → RETURN_PENDING | Existing checklist/evidence and return-intent confirmation unchanged. Pickup arrivals cannot satisfy return. |
| Return challenge verification | None | Correct Owner verifies; booking stays RETURN_PENDING. No condition acceptance or inspection fields are written. |
| Owner physical return acknowledgement | RETURN_PENDING → INSPECTION | The existing inspect transition is gated for enrolled bookings. A dedicated JSON receipt endpoint and the existing PATCH inspect path share the locked receipt service. |
| Owner inspection | INSPECTION → COMPLETED if acceptable; otherwise remains INSPECTION | Existing independent evidence/explicit decision remains authoritative. QR/fallback never accepts condition, settles a deposit or resolves a dispute. |
| Disputed/cancelled/ineligible booking | Existing restrictions | Verification and receipt paths reject; evidence and Booking state remain intact. Existing admin-mediated recovery and dispute controls remain in place. |

All writers continue to coordinate on the Booking row. A new AFTER UPDATE trigger increments a version only on an existing opt-in MeetupSession. Challenges bind both that monotonic version and the Booking state/updatedAt snapshot. This guards every existing Booking writer, including admin transitions, and prevents timestamp-resolution collisions without adding a version column/backfill to historical Booking rows.

The booking has only `meetingStationId`. Both stages explicitly use that same agreed station; the UI says a different return station is unsupported. No station is silently substituted. A future compatible design would add a nullable, separately agreed return-station snapshot (null meaning existing meeting station), bilateral amendment consent, check-in station snapshots and invalidation/reverification on amendment. That agreement/rollout needs approval; it is not implemented here.

## Station coordinates and server-side location checks

[Coverage and source evidence](qr/coordinate-coverage.json) enumerates all 120 physical identities, names/codes, 109 existing coordinate pairs, source references and 11 explicit null pairs. It records the unchanged source catalogue's SHA-256. Runtime reuses `data/mrt/official-network.json`; station identity, walking transfers, links and existing booking station references are unchanged. Unit validation checks identity uniqueness, numeric coverage/bounds and unavailable behavior for every missing point. This is source-documentation and consistency validation, not an independent geodetic survey.

The existing snapshot is dated 2026-10-16 and cites Taipei Open Data station CSV resources, the official Taipei Metro bilingual station menu and the official New Taipei Metro Circular Line table. This task attempted these actual official URLs:

- `https://www.ntmetro.com.tw/basic/?node=10138`
- `https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=c77e91bf-067c-475e-917b-545ff62b7d76`

Both failed at proxy CONNECT with `403 Forbidden`. No TLS verification, network restriction, proxy or allowlist setting was bypassed/changed. To complete fresh reconciliation and the missing Circular Line points, allow the required official source domains (`www.ntmetro.com.tw`, `data.taipei`) in environment settings, preserving existing allowed domains, or supply a source-documented official coordinate export. Access to the station table may require following its official station-detail/data links; a page fetch alone will not establish coordinate accuracy.

Missing points: Shisizhang (Y08), Xiulang Bridge (Y09), Jingping (Y10), Zhonghe (Y12), Qiaohe (Y13), Zhongyuan (Y14), Banxin (Y15), Circular Line Banqiao (Y16), Xinpu Minsheng (Y17), Xingfu (Y19), New Taipei Industrial Park (Y20). Adjacent/interchange coordinates are not copied to fill these gaps.

Only tapping **I've Arrived** requests a one-shot high-accuracy browser location. There is no continuous watcher, IP/Wi-Fi comparison or background location collection. The authenticated role is derived from the Booking. The server resolves its station and computes a Haversine distance; it rejects invalid coordinates, negative/nonfinite accuracy, samples older than 120 seconds or more than five seconds in the future. Accuracy over the configured maximum gives INACCURATE. Otherwise the entire reported accuracy envelope must lie within the configured radius (`distance + accuracy <= radius`), or the outcome is OUTSIDE. Missing coordinates give UNAVAILABLE. Denied, timeout and unsupported-browser outcomes are recorded as unavailable, not success.

Pilot defaults are 200 m for a single-line station and 350 m for a multi-line interchange; station-specific overrides are supported and validated. These are conservative **pilot configuration**, not surveyed exit boundaries. A larger complex/exit needs onsite calibration before rollout. The maximum accepted accuracy defaults to 100 m. Underground positioning may fail even at the correct station.

Stored check-in data is booking, role/user, stage, derived outcome/reason, rounded accuracy/distance band, policy version, server creation/expiry and an HMAC request fingerprint. Raw latitude/longitude and a continuous location trail are not stored. Check-ins expire after ten minutes by default and are independent for pickup and return. New readings invalidate any challenge/fallback bound to superseded reading IDs.

**Spoofing limitation:** a client can fabricate plausible coordinates and timestamps. Tests explicitly demonstrate that valid-looking fabricated coordinates can receive the server-computed supporting signal; a forged `verified:true` claim is rejected. Neither geolocation nor QR proves physical presence or prevents collusion. “Location verified” describes the supporting calculation, not attested device/physical identity.

## Reduced assurance and assistance

Both participants first record fresh check-ins. If at least one is UNAVAILABLE or INACCURATE, and neither is OUTSIDE, they can independently acknowledge reduced assurance, each with an authenticated, immutable reason (5–500 characters). Both acknowledgements bind the same two check-in IDs and expire with them. A single acknowledgement is insufficient. An OUTSIDE reading requires another legitimate check or assistance; it is not silently converted to success.

The challenge stores the fallback record ID, making **location not verified** auditable. Both reasons/acknowledgements remain separate from condition acknowledgement and physical receipt. The fallback does not change booking state, waive evidence, cancel a booking, assign blame or penalize a no-show. A participant can lie about GPS availability; the recorded reduced-assurance status and human oversight are deliberate limits, not spoof-proof presence.

The preview includes a structured **Report issue / request assistance** control even if GPS, camera or free-text chat is unavailable. It reuses the existing COORDINATION case and scoped reviewer queue, with a booking reference and no private-message evidence. It creates no chat message, account penalty or booking transition. Suspended participants retain this route and existing return/inspection/dispute obligations. The Customer Service page remains linked. Email, emergency response and live support/staffing SLAs are not supplied by this MVP.

## Challenge security, retries and privacy

- 32 cryptographically random token bytes, represented as hex; only SHA-256 is stored. QR content is versioned plain data `HUSTLEN1:booking:purpose:challenge:token`, never a URL, cookie or reusable account credential. It includes no name/email or destination to redirect to.
- A separate CSPRNG six-digit one-time code is HMAC-hashed using a server-only secret plus challenge/booking/purpose. Raw token/code are returned only to the authenticated issuer and held in browser memory. Refresh requires renewal if that secret response was lost.
- Owner issues pickup for the actual Borrower; Borrower issues return for the actual Owner. Issuer condition evidence must already exist in the appropriate pending state. Both fresh arrivals/bilateral fallback must be valid at issuance, verification and final acknowledgement.
- Validity defaults to three minutes, measured using server time and capped by arrival expiry. Replacement revokes the previous unfinished challenge, including a previously scanned one. Only one unfinished, unrevoked challenge per booking/purpose is allowed by a database partial unique index.
- The Booking lock serializes issuance, rotation, check-in/fallback changes, verification and final receipt. Conditional consumption requires unconsumed/unrevoked/unexpired state. Exact successful verification retries replay the same receipt; a second distinct consumption is rejected. Successful final receipt/evidence retries compare a stored submission fingerprint and cannot duplicate evidence or transitions. Changed payloads/roles/stages are rejected.
- Issuance has a durable request key. A retry returns existing challenge metadata without rotating it or retrieving its raw secret. If the response was lost, explicit renewal with a new key is required. This preserves hash-only secret storage and makes the tradeoff clear.
- Five failed secret attempts per challenge; at most ten verification attempts per booking/user/stage fixed 15-minute window, independent of rotation. Five issuances and five check-ins per minute per booking/user/stage. Failed guesses/rate limits/wrong-participant verification are auditable metadata events. These are engineering abuse limits, not account sanctions. Repeated failed requests can count again; successful requests have receipt idempotency.
- Final physical receipt is an immutable challenge completion event separate from scan and inspection. QR/receipt/check-in/event identities are protected by triggers. Fallback acknowledgements cannot be rewritten. A Booking update can increment the session version only through the nested trigger, not a direct application Session update.
- New API responses are private/no-store and no-referrer. Codes/tokens are never placed in paths/query strings, analytics or ordinary logs. Error handlers omit private exception details. Scoped status responses exclude secret hashes and raw location. No screenshot blocking is claimed; screenshots remain copyable, with authorization/expiry/one-time checks supplying the boundary.

The equipment photo workflow is the existing decoded/re-encoded private evidence upload, with its existing size/count/type limits. No participant/stranger photographs are requested. Draft notes/checklists/serial remain in tab-local sessionStorage until saved or signed out; photos must be reselected after refresh. Confirmations are not silently restored as final server operations. Shared-device users should sign out and close the tab/private window; browser-managed sessionStorage is not encrypted and may participate in browser session restoration. A network error/expired code cannot finalize offline.

## API inventory and preview configuration

All endpoints require existing session authentication, derive participants from the Booking and use the existing hostile-origin protection. No administrator/general-user bypass is added. JSON is bounded to the existing 32 KiB parser limit.

| API | Purpose / important input |
| --- | --- |
| `GET /api/bookings/:id/meetup/status` | Participant-scoped enrollment, stage, check/fallback and challenge metadata; no raw secret |
| `POST …/enroll` | Owner opt-in before a handoff is recorded; both users must be explicitly allowlisted |
| `POST …/checkin` | `purpose`, stable `requestKey`, `mode:"location"` + numeric latitude/longitude/accuracy/timestamp OR `mode:"unavailable"` + supported reason |
| `POST …/fallback` | `purpose`, `acknowledged:true`, independent `reason` |
| `POST …/issue` | `purpose`, stable `requestKey`; correct issuer only; return raw QR/manual secret once |
| `POST …/verify` | `purpose`, `challengeId`, stable `requestKey`, exactly one `qrPayload` or `manualCode`; consume only |
| `POST …/receipt` | Owner return physical receipt: `meetupChallengeId`, `physicalReceipt:true`; enter existing INSPECTION |
| `POST …/assistance` | Structured LOCATION_PROBLEM / CHALLENGE_PROBLEM / MEETUP_PROBLEM / SAFETY_CONCERN; existing coordination case, no state change |
| Existing `POST /api/bookings/:id/handoff` | Borrower's own existing evidence plus `meetupChallengeId` and `physicalReceipt:true` for enrolled bookings |
| Existing `PATCH /api/bookings/:id {action:"inspect"}` | Enrolled return delegates to the same receipt service; legacy unenrolled behavior remains |
| Existing return, inspection, dispute, evidence, review endpoints | Existing authority and privacy remain; QR adds no payment/inspection bypass |

The JSON API can be reused by a future Expo client with an approved authentication design. No native client or new bearer-token system is introduced.

| Server variable | Default / bounds |
| --- | --- |
| `MEETUP_PREVIEW_USER_IDS` | Empty. Both actual participant IDs must be allowlisted for an Owner to enroll a CONFIRMED booking. No global public-on flag. |
| `MEETUP_CODE_SECRET` | Required for enrollment/preview; at least 32 characters, generated with a CSPRNG and retained securely across restarts. Do not commit or share it. |
| `MEETUP_CHALLENGE_TTL_SECONDS` | 180; integer 30–300 |
| `MEETUP_CHECKIN_TTL_SECONDS` | 600; integer 60–1800 |
| `MEETUP_STATION_RADIUS_M` | 200; 50–800 |
| `MEETUP_INTERCHANGE_RADIUS_M` | 350; 50–800 |
| `MEETUP_MAX_ACCURACY_M` | 100; 10–200 |
| `MEETUP_STATION_RADII_JSON` | `{}`; canonical station ID → numeric radius 50–800, unknown identities rejected |

Once a booking explicitly enrolls, removing preview IDs does not bypass its recorded receipt obligations; it can continue recovery/return through the approved flow. Do not use flag removal as a substitute for an approved cancellation or mediated recovery decision.

## Migration, preservation and local reproduction

New migration: `20261019210000_mrt_meetup_verification`, after `20261019180000_chat_shadow_analysis`. Adds MeetupSession, MeetupCheckIn, MeetupFallback, MeetupChallenge, MeetupEvent and MeetupRate, indexes/foreign keys, one-active constraint, immutable-evidence triggers and the enrolled-session Booking-version trigger. There is no Booking data backfill, station edit, historical enrollment or rewrite of existing handoff/return/dispute/evidence. Prisma adds only a Booking back relation and the new models. Historical migration SQL/checksums remain unchanged.

Apply schema changes only to a newly owned disposable `hustlen_test_*` database through the repository runner. The new tables are required before running this branch's rental routes/status reads. Regenerate Prisma Client using `npx prisma generate --config prisma7.config.ts`. No live migration is authorized or performed.

The migration-preservation test deploys the base migrations into a fresh owned database, populates historical rental/handoff/return/dispute/photo, chat/case/analysis and audit fixtures, snapshots **every existing table**, applies the new migration, compares every existing row and prior migration checksum, and verifies all new tables remain empty. These are explicitly historical SQL fixtures, not fabricated successful API flows. The acceptance suite separately uses actual registration/listing/booking/evidence APIs and two real authenticated browser contexts.

Prerequisites: pinned Node/npm dependencies, local PostgreSQL test role able to create/drop new databases, Chromium/Playwright and ffmpeg. In this cloud workspace npm's default cache path was unwritable; installation succeeded with `--cache /workspace/.npm-cache`, retaining TLS/integrity checks. New runtime dependencies are pinned `qrcode@1.5.4` and `@zxing/browser@0.1.5`; `@types/qrcode@1.5.6` is development-only.

```sh
npm ci --cache /workspace/.npm-cache
npx prisma generate --config prisma7.config.ts
export MRT_TEST_DATABASE_URL='postgresql://TEST_ROLE:TEST_PASSWORD@localhost:55433/hustlen_test_qr_review_01'
npm run test:meetup
npm run test:meetup-migration
```

Replace placeholder credentials and use a fresh unused test name. Do not point at `p2p_marketplace` or adopt/reset an existing database. The isolated runner creates/marks/migrates its own database, checks the exact app/test URL and run marker, and removes only its database/uploads after servers stop. The acceptance suite generates its own ephemeral server secret, retains it across tested restarts, and never prints it.

For a manual preview, use a separate clean local checkout and fresh owned demo fixtures, not the retained older `.test-artifacts/chat-demo` state. The existing `demo:chat init/info/start/down` launcher can provision fresh users/listing on the new schema. Set the two ordinary fixture user IDs from `info` in `MEETUP_PREVIEW_USER_IDS`, securely generate/set `MEETUP_CODE_SECRET`, and keep the same secret across restarts. Owner/Borrower log in in separate browser profiles, create/accept a fresh booking through the normal website, then Owner explicitly enrolls it. Follow the state mapping above. Stop the launcher before teardown; teardown must verify its ownership and never touch a pre-existing marketplace database. No existing retained demo was migrated/reset in this task.

HTTPS or localhost is needed for modern camera/geolocation and secure browser APIs. Recent iOS Safari/Android Chrome may require a user gesture, device permission and `playsInline`; camera denial/unavailable hardware uses the one-time code. A phone's localhost is not the developer laptop's localhost: physical-device testing needs a separately approved private trusted HTTPS setup. Do not disable browser security or expose this preview publicly. Desktop Chromium at a mobile viewport is not a physical iPhone/Android acceptance claim.

## Executed verification and screenshots

Final command outcomes, exact changed files and implementation fingerprints are recorded in [verification.json](qr/verification.json). The [five actual working-page screenshots](qr/SCREENSHOTS.md) cover pickup QR, independent Borrower receipt, reduced-assurance return, received-but-uninspected return and final completion. Earlier failed runs are distinguished there from the final results. Only executed checks may be marked passed.

All selected final local checks exited 0. The complete regression run was followed by the affected QR, preservation, types, lint, unit and build checks after the last fixes; the additional lost-response and wrong-booking assertions changed only their acceptance test and also passed.

| Executed check | Final result |
| --- | --- |
| Prisma validate / generate | Passed |
| TypeScript / lint | Passed; no final lint warnings |
| `npm run test:unit` | 35 passed |
| `npm run test:meetup` | 7 passed (parent plus six acceptance/security scenarios) |
| `npm run test:meetup-migration` | 1 passed |
| `npm run test:chat` | 14 passed |
| `npm run test:stability` | 8 passed |
| `npm run test:rental-api` | 13 passed |
| `npm run test:rental-browser` | 4 passed |
| `npm run test:integration` | MRT API/browser script passed |
| `npm run test:admin` | 7 passed |
| `npm run test:moderation` | 10 passed |
| `npm run test:migration` | MRT data/migration script passed |
| `npm run test:admin-migration` | 1 passed |
| `npm run test:mvp` | 11 passed |
| `npm run build:verify` | Production build passed on an isolated migrated database |

Total: **111 passing Node results**, including parent results, plus the MRT functional scripts and build. No final local suite failure/skip is hidden. GitHub Actions was updated to include both new suites but was not executed/verified; a feature-branch push alone is not a configured push trigger.

Earlier development runs were not passing acceptance: they exposed the stale Booking-action UI, unstable textarea label and manual-code metadata race, all repaired and regressed. Test-only fixes corrected photo-field selection, accounted for measured cold compilation, disconnected HMR clients before restart, and compared the full historical station snapshot rather than assuming the inserted fixture had not increased its count. See verification.json for failed-run phases. No business assertion was removed to make the workflow pass.

The browser suite uses actual login/evidence/receipt forms, separate Owner/Borrower sessions, a 390 px mobile viewport, emulated location/permission conditions and ffmpeg-generated QR camera frames decoded by ZXing. Camera denial is additionally simulated with a NotAllowedError before successfully using the return code. GPS accuracy is not a real onsite measurement. Screenshot fixture codes/QRs expire and the owned fixture database is removed; they confer no account access.

The accepted journey must show: GPS supporting check-ins, Owner condition/photos, actual pickup QR scan, no state change on scan, recoverable Borrower checklist draft after refresh, independent Borrower evidence/physical receipt, IN_USE, fresh return check-ins with explicitly reduced assurance, Borrower return evidence, Owner manual-code verification despite camera denial (including an intentionally lost response after server commit and an idempotent browser retry), application restart, separate physical return receipt, INSPECTION without accepted condition, independent inspection and COMPLETED. Negative API checks cover authorization/CSRF, forged/stale/inaccurate/outside readings, one-sided/stale fallback, old-purpose proof, rotation, request-key retries, Booking version changes at an identical timestamp, concurrent consumption/final retries, guesses, actual expiry and cancelled/disputed protection.

## Outstanding decisions before real-user enablement

1. Unblock authoritative coordinate retrieval, independently reconcile the missing eleven Circular Line points, verify all station centroids/exits and calibrate station-specific proximity/accuracy/freshness thresholds onsite. Review whether each station's underground conditions make GPS useful at all.
2. Approve the preview/rollout population and consent for adopting an enforced workflow. Existing/history bookings are not automatically opted in. Agree on a separately consented return location/amendment design if needed.
3. Approve reduced-assurance operating policy, staff ownership/response capacity, assisted recovery for participants unable to proceed and escalation/emergency instructions. No automatic no-show/refusal penalties, account sanctions or cancellation policy was invented.
4. Approve check-in/outcome, fallback-reason, challenge/receipt/event and draft retention/privacy notices. Raw GPS is minimized; metadata/immutable evidence retention has no automatic deletion policy. This is not end-to-end encryption or anonymous location attestation.
5. Arrange real iOS Safari/Android Chrome and onsite underground tests under private trusted HTTPS; validate denied permissions, device switching, camera focus, poor networks and accessibility. Those physical-device/onsite checks are unexecuted here.
6. Approve secret storage/rotation, monitoring/abuse budgets, deployment/migration/rollback and safe handling of already enrolled custody obligations before any real pilot. No production deployment/merge or live-data migration occurred.

Readiness is limited to the executed isolated evidence and source coverage. Neither QR nor GPS proves physical transfer, prevents screenshots/spoofing/collusion, accepts condition, resolves disputes or settles funds. The missing source access and real-device/operational approvals remain explicit review limitations.
