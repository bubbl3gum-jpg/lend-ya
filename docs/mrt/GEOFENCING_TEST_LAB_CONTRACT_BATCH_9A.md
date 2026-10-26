# Geofencing Test Lab contract — Batch 9A

The Lab is an expressly isolated calculation environment, not a GPS attestation or booking simulator. Every successful response carries `classification: TEST_LOCATION` and `arrivalVerified: false`. A passing sample is called PASS, never verified arrival. It cannot issue QR challenges, check in participants, write booking evidence or change custody.

## Authorization and environment

`lib/geofencing-lab/config.ts` requires NODE_ENV=development, explicit `HUSTLEN_GEOFENCING_LAB=owned-self-only`, identical DATABASE_URL/TEST_DATABASE_URL/MRT_TEST_DATABASE_URL bindings, a validated local disposable `hustlen_test_*` target, a 24-hex run ID, exact localhost origin and explicit bounded Admin tester allowlist. Existing PostgreSQL option/ambient override guards apply. `service.ts:labContext` checks the effective driver target, actual database name and exact owned comment, then resolves the current authenticated ACTIVE legacy ADMIN and tester allowlist.

The production/default proxy refusal covers both `/admin/locations/lab` and `/api/admin/locations/lab/*` before streaming or database access. Service/config checks are independent. An accidentally configured feature flag cannot enable the Lab in production or a non-owned database. No new staff-role path or ADMIN OR Operations fallback exists.

Each Lab binds the current account, session-token hash, exact persisted session creation incarnation and a new random private HttpOnly/SameSite=Strict browser cookie. No browser-provided actor, role, session identity, risk, policy or permission is accepted. Missing/wrong browser cookie, another user/session and a replaced session cannot select an existing Lab. This is browser credential binding, not hardware identity/fingerprinting or attested GPS. It deliberately cannot prove that browser coordinates came from a trusted physical GPS device.

## Consent and operations

All API operations are POST JSON with the exact pinned Origin/Host and same-origin conditions; unknown fields, query selectors, operations, station IDs and unbounded durations are rejected. A sample contains only latitude, longitude, accuracy and timestamp; those values are validated by the existing authoritative location evaluator.

| Operation | Scope and effect |
| --- | --- |
| start | Explicit self-device TEST_LOCATION consent and 1–3600-second duration; server mints browser cookie and opaque Lab ID, no GPS request or point capture |
| status | Exact own Lab binding; minimal expiry/centre-mode metadata, no coordinates |
| centre | Explicit consent; choose official station mode or a temporary synthetic map/self-device centre, with bounded duration capped by original Lab expiry |
| evaluate | Official canonical station and an exact own active Lab; current configured radius/accuracy/freshness policy, optionally temporary centre; coarse result only |
| revoke | Exact own binding; remove coordinates/state immediately, clear cookie, then audit; an audit failure is reported but does not retain private state |

Actual geolocation is requested only by the labelled native-browser buttons, after consent and an active Lab. No watchPosition, automatic prompt, background tracking, third-party map tiles or coordinate-bearing URLs are used. A denied/unavailable request produces an error and retains no sample. Synthetic map/offset/accuracy/age controls are explicitly test data; they are not evidence about another participant.

Withdrawal clears local samples and requests server revocation. In-flight GPS/results are ignored after withdrawal or unmount. pagehide/unmount requests best-effort revocation; server expiry remains authoritative if the browser cannot send it. A single browser request cannot spoof or invite another booking participant; the Lab has no participant audience or booking ID input.

## Exact policy and display

The Lab calls existing `lib/meetup/location.ts:evaluateLocation`, `locationSettings`, and Haversine distance without modifying them. Distance + reported accuracy must be ≤ the station radius; accuracy must be ≤ the configured maximum; timestamps must not be older than 120000 ms or more than 5000 ms in the future. Existing station/interchange radius overrides remain server-owned and read-only. Missing validated official coordinates yield UNAVAILABLE in station mode; the catalogue is not patched to make a test pass.

The geographic plot is a local, north-up metric projection, not a map tile service or an acceptance algorithm. Haversine evaluation is authoritative at boundaries. Pointer selection and keyboard-accessible synthetic offsets are available. The official network schematic is separate and reuses `components/mrt/MRTMap.tsx` without changing borrower/owner selection behaviour. Displayed times use Asia/Taipei; technical evidence timestamps use UTC.

## Expiry, retention and audit

`lib/geofencing-lab/store.ts` retains at most one active Lab per allowlisted tester, no more than 20 process-wide. Coordinates are process-local only. Session and centre lifetimes are bounded to one hour, and centre expiry is capped by original session expiry. Replacement/revocation cancels timers and removes old coordinate references. Timer callbacks capture identifiers, not coordinate objects. Expired temporary centres become explicitly expired and cannot silently fall back to station calculations. Restart/different worker loses state and fails closed; this candidate requires one development server.

The client keeps current consenting points only in React memory, clears them on withdrawal/expiry/end, and uses no browser storage for location. The server never returns precise temporary coordinates. Evaluation results contain TEST_LOCATION, false arrival, coarse accuracy/distance band, reason, applicable public policy and expiry. Public station catalogue coordinates remain public data and are distinct from personal samples.

Existing AdminAuditLog records fixed actions MRT_LAB_STARTED/CENTRE_SET/EVALUATED/REVOKED, trusted Admin ID, public station reference where applicable, mode, duration/consent and coarse policy outcome. Message bodies, samples, exact personal coordinates, token/device/session hashes and credentials are excluded. New use/evaluation is denied if the required audit fails. A revoke first erases state, then reports any audit failure through existing bounded structured logging. No operational console event is represented as durable success audit.

Development framework access logging excludes Lab routes; request bodies and coordinates are never logged by application code. Proxy/upstream/APM policies still require separate operational review before any production release. No temporary test coordinate, private token, QR secret, evidence photo or personal map image is committed. Screenshots use synthetic self-device coordinates at a public official station and relative metric plots.

## Setup, cleanup and limitations

Use `npm run test:locations` or `npm run test:locations-production` through `tests/run-isolated.ts`, with an absent owned local disposable target and installed Chromium. The harness creates and verifies ownership before migrations/data changes, pins origin/tester configuration, runs actual routes/native browser permission tests, and removes its owned database/uploads. No migration is added in 9A; historical migrations are unchanged.

Revoke/end the Lab to clear process memory. Stop its owned dev server after tests; process-local state does not survive. For an interrupted test, use the harness's exact ownership marker/manifest to dispose only that run, never prefix-only destructive cleanup. The closeout includes read-only checks for remaining batch databases and owned temporary principals.

Limitations: synthetic browser GPS is not hardware attestation; no physical-device acceptance certification; process-local state is single-worker and intentionally unrecoverable; browser close revocation is best effort with server TTL backstop; exit-specific station calibration and 11 missing official coordinate records remain unresolved. None of these may be worked around through real-user GPS simulation or weakened QR/consent/evidence requirements.
