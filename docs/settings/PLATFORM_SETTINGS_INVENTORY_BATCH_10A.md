# Existing announcement and configuration audit — Batch 10A

Baseline `87010119026af1d04fa0fd63f378f10c90d2011a`. Repository inspection found no Announcement model, announcement UI/API or publication/notification delivery pipeline. Admin grouped navigation and the safe settings read patterns existed, but no Platform Settings workspace or mutable configuration registry existed. New routes reuse legacy Admin guards and the existing responsive shell. Existing marketplace pages are unchanged. Existing auth/account settings concern the signed-in user; they are not a platform-policy editor.

## Safe read-only inventory

`app/admin/settings/page.tsx` requires current ACTIVE legacy ADMIN. `lib/admin/settings.ts:settingsInventory` returns an allowlisted projection, never enumerates environment values or secret records, and uses existing validated helpers where available. Invalid/missing helper configuration displays unavailable rather than a relaxed fallback or raw exception. Dynamic no-store server page, no POST/action endpoint. The effective fixture snapshot and responsive images are in the closeout evidence. Database per-station operational values remain in the preserved Locations workspace; this page explains the actual eligibility semantics rather than implying a global station suspension engine exists.

| Identifier / UI label | Source | Type | Operational impact | Proposed future change |
| --- | --- | --- | --- | --- |
| `rental.maxDays` / Maximum rental duration ([read adapter](../../lib/admin/settings.ts#L45)) | lib/booking-time.ts:MAX_RENTAL_DAYS | integer days | Rental eligibility and price interval | Independent approval / reviewed code migration |
| `rental.clock` / Rental display and unzoned input clock ([read adapter](../../lib/admin/settings.ts#L53)) | lib/booking-time.ts:parseRentalTime / formatRentalTime | IANA timezone | UTC storage; explicit offsets honored | Independent approval / reviewed code migration |
| `handoff.location` / Agreed handoff station ([read adapter](../../lib/admin/settings.ts#L61)) | lib/mrt/station-validation.ts; app/api/bookings/route.ts; MrtStation.operational; ListingStation | database booleans / relations | Existing meetup verification does not suspend already-agreed handoffs based on operational alone | Independent approval / reviewed code migration |
| `gps.standardRadius` / Standard station radius ([read adapter](../../lib/admin/settings.ts#L69)) | lib/meetup/location.ts; MEETUP_STATION_RADIUS_M; MEETUP_STATION_RADII_JSON | number 50–800 m | Geofence acceptance; default 200 m | Independent approval / reviewed code migration |
| `gps.interchangeRadius` / Interchange radius ([read adapter](../../lib/admin/settings.ts#L82)) | lib/meetup/location.ts; MEETUP_INTERCHANGE_RADIUS_M; MEETUP_STATION_RADII_JSON | number 50–800 m | Geofence acceptance; default 350 m | Independent approval / reviewed code migration |
| `gps.accuracy` / Maximum GPS accuracy ([read adapter](../../lib/admin/settings.ts#L95)) | lib/meetup/location.ts; MEETUP_MAX_ACCURACY_M | number 10–200 m | Rejects inaccurate samples; distance + accuracy must fit radius | Independent approval / reviewed code migration |
| `gps.freshness` / GPS freshness / future skew ([read adapter](../../lib/admin/settings.ts#L104)) | lib/meetup/location.ts:evaluateLocation | fixed milliseconds | Stale/future sample rejection; security invariant | Not dashboard-editable |
| `gps.coordinates` / Authoritative coordinates ([read adapter](../../lib/admin/settings.ts#L113)) | data/mrt/official-network.json | immutable reviewed catalogue | No inferred coordinates or test-centre substitution | Independent approval / reviewed code migration |
| `meetup.challengeTTL` / QR challenge validity ([read adapter](../../lib/admin/settings.ts#L121)) | lib/meetup/config.ts; MEETUP_CHALLENGE_TTL_SECONDS | integer 30–300; default 180 | Replay / expiration boundary | Independent approval / reviewed code migration |
| `meetup.checkInTTL` / Check-in validity ([read adapter](../../lib/admin/settings.ts#L129)) | lib/meetup/config.ts; MEETUP_CHECKIN_TTL_SECONDS | integer 60–1800; default 600 | Location freshness across challenge issuance | Independent approval / reviewed code migration |
| `meetup.confirmationTTL` / Physical receipt confirmation window ([read adapter](../../lib/admin/settings.ts#L137)) | lib/meetup/config.ts; MEETUP_CONFIRMATION_TTL_SECONDS | explicit integer 60–1800; no default | Preview policy must be explicitly configured | Independent approval / reviewed code migration |
| `evidence.requirements` / Evidence and camera safeguards ([read adapter](../../lib/admin/settings.ts#L145)) | lib/booking-evidence.ts; lib/rental-checklist.ts; lib/meetup/service.ts | code invariants | Custody and dispute protections | Not dashboard-editable |
| `evidence.photoLimits` / Private photo upload limits ([read adapter](../../lib/admin/settings.ts#L154)) | lib/booking-evidence.ts:validatePrivatePhotos | bounded bytes / MIME allowlist | Private rental evidence processing | Independent approval / reviewed code migration |
| `security.sessionTTL` / Authentication session lifetime ([read adapter](../../lib/admin/settings.ts#L162)) | lib/auth.ts:newSessionCredential; AuthSession.expiresAt | fixed seconds / database timestamp | Session validity; current account rechecked | Not dashboard-editable |
| `security.authenticationRate` / Authentication rate limits ([read adapter](../../lib/admin/settings.ts#L171)) | lib/auth-rate-limit.ts:authenticationLimit; AuthRateLimit | fixed integer limits / expiry | Not a substitute for approved trusted-ingress traffic limits | Not dashboard-editable |
| `security.accountState` / Account restriction policy ([read adapter](../../lib/admin/settings.ts#L180)) | lib/admin/mutations.ts; User.accountStatus; docs/admin/ADMIN_PERMISSION_MATRIX.md | persisted enum / existing guarded mutations | No new suspension powers or future policy activation | Independent approval / reviewed authorization cutover |
| `meetup.testCentre` / Temporary location isolation ([read adapter](../../lib/admin/settings.ts#L189)) | lib/meetup/test-location.ts; lib/geofencing-lab/store.ts; lib/geofencing-lab/config.ts | immutable test boundary / bounded TTL | No raw test coordinates in inventory; no production simulation | Not dashboard-editable |
| `meetup.rateLimits` / Meetup request throttles ([read adapter](../../lib/admin/settings.ts#L198)) | lib/meetup/service.ts:limit call sites | fixed action-specific integer windows | Abuse controls do not waive custody or evidence requirements | Not dashboard-editable |
| `security.roles` / Staff activation / approval execution ([read adapter](../../lib/admin/settings.ts#L207)) | lib/admin/auth.ts; lib/authorization; prisma/migrations | immutable guards / inactive membership constraints | No ADMIN OR STAFF bypass | Not dashboard-editable |
| `security.passkeyPilot` / Passkey development pilot ([read adapter](../../lib/admin/settings.ts#L216)) | lib/passkey-pilot-config.ts; HUSTLEN_PASSKEY_PILOT | exact development-only gate | Owned DB and trusted origin required; not mandatory production MFA | Not dashboard-editable |
| `chat.availability` / Chat availability ([read adapter](../../lib/admin/settings.ts#L267)) | lib/chat/config.ts; CHAT_ENABLED; CHAT_PREVIEW_USER_IDS | boolean / bounded account allowlist | Private conversations remain participant scoped | Independent approval / reviewed code migration |
| `chat.retention` / Chat retention configuration ([read adapter](../../lib/admin/settings.ts#L277)) | lib/chat/config.ts; CHAT_MESSAGE_RETENTION_DAYS; CHAT_EVIDENCE_RETENTION_DAYS | optional positive integer days | Retention / holds need approved policy | Independent approval / reviewed code migration |
| `chat.analysis` / Advisory analysis mode ([read adapter](../../lib/admin/settings.ts#L285)) | lib/chat/analysis/jobs.ts; CHAT_ANALYSIS_MODE | exact mode | No autonomous administrative authority | Not dashboard-editable |
| `announcement.candidate` / Announcement mutation configuration ([read adapter](../../lib/admin/settings.ts#L296)) | lib/announcements/config.ts; HUSTLEN_ANNOUNCEMENT_CANDIDATE | exact gate + origin + allowlist + owned DB | No production publication authority | Not dashboard-editable |
| `announcement.policy` / Candidate publication policy ([read adapter](../../lib/admin/settings.ts#L308)) | lib/announcements/input.ts; service.ts | fixed candidate policy | Not product approval; routine/high-impact split unresolved | Independent approval / reviewed code migration |
| `notifications.delivery` / Announcement notification delivery ([read adapter](../../lib/admin/settings.ts#L316)) | app/dev/announcements/page.tsx; lib/announcements/service.ts | no provider / outbox | No fabricated delivery counts | Separate approved infrastructure and audience policy |

The five generated `candidate.*` rows additionally cover tickets, channels, synthetic Support staff, Geofencing Lab and scoped staff-read pilot; exact keys and source modules are in the adapter's fixed tuple list. A configured development flag is labelled only a configured gate: all DB ownership, exact origin, account, session and scope checks still apply. No claim of live availability is inferred from a single boolean.

All operational mutation risks above are proposed classifications for future review. No existing runtime policy is made editable. Security-critical invariants are never routine settings. Current code has no clearly approved low-risk operational-edit identifier; any future display-only preference must be separately named and approved.

## Configuration-source index (names only)

This source-derived index records environment identifiers and exact use sites, not their values. It includes tooling/development controls as well as runtime policy, to prevent mistaking a test flag for production authorization. Literal computed keys such as CHAT_MESSAGE_RETENTION_DAYS / CHAT_EVIDENCE_RETENTION_DAYS are additionally covered by the inventory above; generic framework environment handling and third-party internals are excluded. Security infrastructure values/URLs, token material, credential contents and actual allowlists are never read into this document or displayed.

| Identifier | Exact source | Handling |
| --- | --- | --- |
| `CHAT_ANALYSIS_MODE` | `lib/admin/settings.ts:288` | Operational flag / policy; separately classified before editing |
| `CHAT_ANALYSIS_MODE` | `lib/chat/analysis/jobs.ts:4` | Operational flag / policy; separately classified before editing |
| `CHAT_DEMO_PORT` | `scripts/chat-demo.ts:44` | Operational flag / policy; separately classified before editing |
| `CHAT_ENABLED` | `lib/admin/settings.ts:270` | Operational flag / policy; separately classified before editing |
| `CHAT_ENABLED` | `lib/chat/config.ts:2` | Operational flag / policy; separately classified before editing |
| `CHAT_PREVIEW_USER_IDS` | `lib/chat/config.ts:2` | Identity allowlist: values excluded |
| `CHAT_SYNTHETIC_CLOUD_API_KEY` | `scripts/analyze-synthetic.ts:11` | Secret or infrastructure binding: no raw value display |
| `CHAT_SYNTHETIC_CLOUD_ENABLED` | `scripts/analyze-synthetic.ts:11` | Operational flag / policy; separately classified before editing |
| `CHAT_SYNTHETIC_CLOUD_ENDPOINT` | `scripts/analyze-synthetic.ts:11` | Operational flag / policy; separately classified before editing |
| `CHAT_SYNTHETIC_CLOUD_MODEL` | `scripts/analyze-synthetic.ts:11` | Operational flag / policy; separately classified before editing |
| `DATABASE_URL` | `lib/announcements/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/announcements/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/announcements/config.ts:14` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/authorization/scoped/session-audit.ts:275` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/geofencing-lab/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/geofencing-lab/config.ts:13` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/geofencing-lab/config.ts:9` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/meetup/service.ts:48` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/meetup/test-location.ts:50` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/meetup/test-location.ts:54` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/passkey-pilot-config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/passkey-pilot-config.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/passkey-pilot-config.ts:14` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/prisma.ts:6` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/staff-read-pilot/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/staff-read-pilot/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/staff-read-pilot/config.ts:14` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support-staff-candidate/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support-staff-candidate/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support-staff-candidate/config.ts:14` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `lib/support/config.ts:14` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/chat-demo.ts:18` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/chat-demo.ts:43` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/create-admin.ts:40` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/db-preflight.ts:11` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/db-preflight.ts:15` | Secret or infrastructure binding: no raw value display |
| `DATABASE_URL` | `scripts/local-meetup-demo.ts:18` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_ANNOUNCEMENT_ADMIN_IDS` | `lib/announcements/config.ts:18` | Identity allowlist: values excluded |
| `HUSTLEN_ANNOUNCEMENT_CANDIDATE` | `lib/announcements/config.ts:8` | Owned-development / preview control; not production authority |
| `HUSTLEN_ANNOUNCEMENT_CANDIDATE` | `proxy.ts:3` | Owned-development / preview control; not production authority |
| `HUSTLEN_ANNOUNCEMENT_ORIGIN` | `lib/announcements/config.ts:15` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_GEOFENCING_LAB` | `lib/geofencing-lab/config.ts:7` | Owned-development / preview control; not production authority |
| `HUSTLEN_GEOFENCING_LAB` | `proxy.ts:5` | Owned-development / preview control; not production authority |
| `HUSTLEN_GEOFENCING_LAB_ADMIN_IDS` | `lib/geofencing-lab/config.ts:15` | Identity allowlist: values excluded |
| `HUSTLEN_GEOFENCING_LAB_ORIGIN` | `lib/geofencing-lab/config.ts:14` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_PASSKEY_PILOT` | `lib/passkey-pilot-config.ts:8` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_PASSKEY_PILOT` | `proxy.ts:19` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_PASSKEY_PILOT_ORIGIN` | `lib/passkey-pilot-config.ts:15` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_STAFF_READ_CHANNEL_KEY` | `lib/staff-read-pilot/bridge.ts:82` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_STAFF_READ_ORIGIN` | `lib/staff-read-pilot/config.ts:15` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_STAFF_READ_PILOT` | `lib/staff-read-pilot/config.ts:8` | Owned-development / preview control; not production authority |
| `HUSTLEN_STAFF_READ_PILOT` | `proxy.ts:14` | Owned-development / preview control; not production authority |
| `HUSTLEN_STAFF_READ_SOCKET` | `lib/staff-read-pilot/bridge.ts:83` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_SUPPORT_CHANNEL_CANDIDATE` | `lib/support/channel-config.ts:9` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_CHANNEL_CANDIDATE` | `proxy.ts:9` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_CHANNEL_TEST_LIMIT` | `lib/support/channel-config.ts:7` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_STAFF_CANDIDATE` | `app/api/auth/login/route.ts:52` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_STAFF_CANDIDATE` | `lib/support-staff-candidate/config.ts:8` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_STAFF_CANDIDATE` | `proxy.ts:7` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY` | `lib/support-staff-candidate/bridge.ts:37` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_SUPPORT_STAFF_ORIGIN` | `lib/support-staff-candidate/config.ts:15` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_SUPPORT_STAFF_SOCKET` | `lib/support-staff-candidate/bridge.ts:38` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_SUPPORT_TICKET_CANDIDATE` | `lib/support/config.ts:8` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_TICKET_CANDIDATE` | `proxy.ts:11` | Owned-development / preview control; not production authority |
| `HUSTLEN_SUPPORT_TICKET_ORIGIN` | `lib/support/config.ts:15` | Secret or infrastructure binding: no raw value display |
| `HUSTLEN_SUPPORT_TICKET_REQUESTER_IDS` | `lib/support/config.ts:30` | Identity allowlist: values excluded |
| `HUSTLEN_SUPPORT_TICKET_TEST_LIMIT` | `lib/support/config.ts:27` | Owned-development / preview control; not production authority |
| `MEETUP_CHALLENGE_TTL_SECONDS` | `lib/meetup/config.ts:17` | Operational flag / policy; separately classified before editing |
| `MEETUP_CHECKIN_TTL_SECONDS` | `lib/meetup/config.ts:23` | Operational flag / policy; separately classified before editing |
| `MEETUP_CODE_SECRET` | `lib/meetup/config.ts:9` | Secret or infrastructure binding: no raw value display |
| `MEETUP_CONFIRMATION_TTL_SECONDS` | `lib/meetup/config.ts:31` | Operational flag / policy; separately classified before editing |
| `MEETUP_INTERCHANGE_RADIUS_M` | `lib/meetup/location.ts:48` | Operational flag / policy; separately classified before editing |
| `MEETUP_MAX_ACCURACY_M` | `lib/meetup/location.ts:56` | Operational flag / policy; separately classified before editing |
| `MEETUP_PREVIEW_USER_IDS` | `lib/meetup/config.ts:2` | Identity allowlist: values excluded |
| `MEETUP_STATION_RADII_JSON` | `lib/meetup/location.ts:29` | Operational flag / policy; separately classified before editing |
| `MEETUP_STATION_RADIUS_M` | `lib/meetup/location.ts:49` | Operational flag / policy; separately classified before editing |
| `MEETUP_TEST_LOCATION_ENABLED` | `lib/meetup/test-location.ts:53` | Owned-development / preview control; not production authority |
| `MEETUP_TEST_LOCATION_USER_IDS` | `lib/meetup/test-location.ts:62` | Identity allowlist: values excluded |
| `MRT_BROWSER_PATH` | `scripts/chat-demo-acceptance.ts:13` | Operational flag / policy; separately classified before editing |
| `MRT_TEST_DATABASE_URL` | `lib/announcements/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/geofencing-lab/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/meetup/test-location.ts:54` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/passkey-pilot-config.ts:11` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/prisma.ts:14` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/staff-read-pilot/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/support-staff-candidate/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `lib/support/config.ts:11` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `scripts/chat-demo.ts:43` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_DATABASE_URL` | `scripts/local-meetup-demo.ts:17` | Secret or infrastructure binding: no raw value display |
| `MRT_TEST_RUN_ID` | `lib/announcements/config.ts:41` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/announcements/config.ts:9` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/authorization/scoped/session-audit.ts:271` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/geofencing-lab/config.ts:34` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/geofencing-lab/config.ts:8` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/meetup/service.ts:49` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/meetup/test-location.ts:55` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/passkey-pilot-config.ts:29` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/passkey-pilot-config.ts:9` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/prisma.ts:14` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/staff-read-pilot/config.ts:29` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/staff-read-pilot/config.ts:9` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/support-staff-candidate/config.ts:30` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/support-staff-candidate/config.ts:9` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/support/config.ts:42` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `lib/support/config.ts:9` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `next.config.ts:5` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `next.config.ts:7` | Owned-development / preview control; not production authority |
| `MRT_TEST_RUN_ID` | `next.config.ts:9` | Owned-development / preview control; not production authority |
| `NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS` | `lib/camera-diagnostics.ts:42` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `app/api/auth/login/route.ts:52` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/admin/settings.ts:32` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/announcements/config.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/auth.ts:71` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/authorization/mfa/config.ts:24` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/authorization/scoped/session-audit.ts:273` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/camera-diagnostics.ts:41` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/geofencing-lab/config.ts:6` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/meetup/test-location.ts:52` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/passkey-pilot-config.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/prisma.ts:41` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/staff-read-pilot/config.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/support-staff-candidate/config.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `lib/support/config.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `next.config.ts:4` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:11` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:14` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:19` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:3` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:5` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:7` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `proxy.ts:9` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `scripts/chat-demo.ts:37` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `scripts/chat-reviewer.ts:5` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `scripts/create-admin.ts:36` | Operational flag / policy; separately classified before editing |
| `NODE_ENV` | `scripts/local-meetup-demo.ts:15` | Operational flag / policy; separately classified before editing |
| `NODE_PG_FORCE_NATIVE` | `lib/disposable-database-url.ts:38` | Operational flag / policy; separately classified before editing |
| `TEST_DATABASE_URL` | `lib/announcements/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/authorization/scoped/session-audit.ts:275` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/authorization/scoped/session-audit.ts:280` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/geofencing-lab/config.ts:9` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/passkey-pilot-config.ts:10` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/staff-read-pilot/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/support-staff-candidate/config.ts:10` | Secret or infrastructure binding: no raw value display |
| `TEST_DATABASE_URL` | `lib/support/config.ts:10` | Secret or infrastructure binding: no raw value display |

## Existing data-policy / constant sources

- `prisma/schema.prisma`, `prisma/migrations/`: UserRole/account state, AuthSession expiry, ChatReviewer grant/revocation, fixed inactive staff/grant constraints, append-only audits/evidence and candidate-only Support principals. These are authority/integrity rules, not arbitrary configuration keys.
- `lib/rental-lifecycle.ts`, `lib/booking-evidence.ts`, `lib/rental-checklist.ts`, `lib/meetup/service.ts`: booking state machine, photo limits/MIME/decoding, participant/checklist/receipt/QR/consent guards and action-specific throttles; no edits in this batch.
- `lib/mrt/network.ts`, `lib/mrt/station-validation.ts`, `data/mrt/official-network.json`, MrtStation/ListingStation: canonical station catalogue, actual persisted operational choice eligibility and offered-station relation. Official source and existing data unchanged; 11 missing-coordinate stations stay unavailable.
- `lib/auth-rate-limit.ts`, `lib/auth.ts`, `proxy.ts`: persisted per-account attempt windows, session incarnation/expiry, production secure HttpOnly cookie, CSRF; no auth-policy changes.
- `lib/chat/policy.ts`, `lib/chat/analysis/jobs.ts`: versioned deterministic moderation and advisory mock-shadow configuration; not autonomous administration.
- `lib/authorization/registry.ts`, `policy.ts`, `scoped/`, `approvals/`, `mfa/`: capability/identity/approval/MFA foundations remain non-activated. Proposed future allocation is not current authority.
- `lib/announcements/input.ts`, `config.ts`, `service.ts`: fixed informational fixture audience, bounded plain-text/schema/window/quota, SQL server-clock visibility and exact owned gate. No notification delivery or production publisher exists.

No public/homepage, email, SMS, push, delivery statistics or external scheduler was introduced. Accurate time-window visibility needs no background worker. External notification delivery is separate product/infrastructure scope. See [10B plan](BATCH_10B_CONFIGURATION_PLAN.md).
