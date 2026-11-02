# Mandatory rental meetup integration — review candidate

Baseline: `0d88f4cd1f1aadb44792da24496888174115668d`, integration/hustlen-product-consolidation-20261102. Isolated branch: `fix/mandatory-rental-meetup-integration`. This core-MVP implementation candidate is not deployed; release and physical-device acceptance remain separate.

## Confirmed root cause

The ordinary booking creation route did not create a MeetupSession. `lib/meetup/service.ts` permitted only explicit preview enrollment by an eligible owner before handoff. Its status DTO returned disabled for other bookings; `components/meetup-verification.tsx` rendered nothing. `requireMeetupReceipt` returned without enforcing a challenge when no session existed. PATCH inspection similarly retained a legacy non-meetup branch. Therefore the normal legacy workflow could advance without QR. This is an integration/activation gap, not evidence that the secure QR engine accepted an invalid challenge.

Booking #4 was reported by the owner; no existing database or that booking was inspected, changed, retroactively enrolled or assigned fabricated GPS/QR events.

## Core requirement and compatibility policy

**Every new application rental booking requires bilateral meetup verification.** This is not opt-in or an experimental feature. The earlier development-only creation proposal was superseded by the owner's explicit clarification during this task.

- Existing historical bookings retain their persisted workflow. No cutoff guessing, backfill, migration or invented verification events. Booking #4 is not modified.
- Existing explicitly enrolled historical preview bookings retain their existing challenge/receipt enforcement and legacy reduced-assurance exception behavior.
- Every new ordinary booking request creates an immutable MeetupSession and `NEW_BOOKING_VERIFICATION` event atomically with the Booking. Native API and new seed-fixture booking creation share `lib/meetup/enrollment.ts`. The event identifies required lifecycle policy; it is not proof of arrival or physical receipt.
- No development flag, optional panel activation, participant allowlist or client field controls this enrollment. The old preview allowlist is relevant only to explicit historical preview enrollment and separately protected TEST_LOCATION simulation.
- Trusted server `MEETUP_CODE_SECRET` (at least 32 characters) and explicit bounded `MEETUP_CONFIRMATION_TTL_SECONDS` are required; existing challenge/check-in/radius/accuracy validation remains. Missing verification configuration rejects creation with 503 and rolls back the booking. It never creates a legacy booking as fallback. No credentials are invented or committed.
- Enrollment and history are immutable and persist across restarts. No new schema migration is required.
- New bookings **cannot redeem manual codes**. No manual-code exception policy is approved for them, so the server denies such attempts and the UI offers camera scanning and assistance, not an automatic downgrade. GPS reduced-assurance fallback never waives QR or physical receipt.
- Historical manual-code UI is labeled as a legacy reduced-assurance exception and remains bound to participant, stage, arrivals, expiry, single use and physical receipt. It is not offered for new bookings.
- Code implements the normal lifecycle requirement in development and production builds. It has not been pushed, merged, deployed or executed against an existing application database. Release approval must ensure trusted server configuration, physical-device acceptance and support/recovery readiness before rollout. This does not authorize retrofitting ongoing rentals.

## Server and UI behavior

1. Owner accepts the request. Both independent GPS readings are checked for the agreed station radius, accuracy and freshness; their coordinates need not match.
2. New bookings require stage arrivals before the owner saves handoff evidence. Condition/camera evidence rules remain unchanged.
3. Owner generates a pickup QR only after evidence and arrivals; borrower scans under their own session. Scan alone does not advance custody.
4. Borrower supplies their own evidence/checklist and explicitly acknowledges actual receipt. The existing bound, single-use challenge is completed atomically with IN_USE.
5. Return requires fresh RETURN arrivals, not reused PICKUP arrivals, before borrower return evidence. Borrower generates return QR; owner scans and separately acknowledges physical return.
6. Physical receipt enters INSPECTION without accepting condition. The existing independent owner inspection decision remains necessary; a problem does not invent a financial transaction.

The booking page places the staged verification/actions near the beginning. A server-derived required-session prop prevents the initial loading interval from exposing an apparently optional receipt action. The panel explains stage, next actor, bilateral GPS, evidence, QR expiry and separate receipt. Issuer evidence forms remain disabled until readiness is available; authoritative server checks still apply to direct requests and expired readiness. Temporary TEST_LOCATION consent, one-hour expiry/revocation, labeling and owned-database authorization are unchanged. Existing reduced-assurance policy remains bilateral, reasoned and explicit; outside-area readings cannot use that fallback. QR/manual-code security, participant checks, session loss fencing, timers and cancellation are reused rather than replaced.

## Manual protected demo

Use real local PostgreSQL credentials and a NEW disposable target; do not paste literal placeholder credentials. Follow the guarded launcher setup in `docs/product/DEMO_RUNBOOK.md`, then run:

```sh
MRT_TEST_DATABASE_URL='<your new local hustlen_test_* target URL>' npm run demo:meetup:local
```

The launcher must verify ownership before migration/seed. Open two separate browser profiles/devices, sign in as the two synthetic demo participants, and create a new listing with an authorized item photograph and a new booking. Existing seed records are never retrofitted; only newly created seed bookings receive enrollment. Accept it. Confirm the mandatory panel exists without enrollment. For real station testing obtain actual device GPS at the agreed station. For at-home testing use the separately allowlisted temporary-location option and have **both** participants acknowledge TEST_LOCATION; it is not MRT arrival. Test pickup and return independently, with new temporary consent/centre after pickup cleanup if needed. Never use real customer/private evidence.

Camera/geolocation require a secure browser context. Localhost on the host is trustworthy; a phone accessing an ordinary LAN HTTP address may refuse permissions. Real phone HTTPS/certificate, camera focus, GPS accuracy and physical meetup acceptance remain separate device prerequisites. Two virtual-camera browser contexts are not proof of genuine phone acceptance. Ctrl+C removes only the launcher's marked database/processes; it must not stop PostgreSQL or unrelated services.

## Review and production blockers

Owner must inspect mobile/desktop stage clarity and independently perform real phone pickup/return. Retain calibrated MRT/exit guidance, GPS fallback policy approval, notification/Support availability and recovery procedures. Do not retrofit older rentals, change unrelated production settings, weaken security, merge or deploy from this candidate. No translation, Customer Service, Vision, financial or staff authority is added.
