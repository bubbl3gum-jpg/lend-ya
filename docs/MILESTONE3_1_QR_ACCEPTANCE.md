# Milestone 3.1 — QR timing and physical-device readiness

Base: `feature/qr-mrt-handoff-return` (`74c726e`).
Work branch: `fix/qr-meetup-acceptance-hardening`.

## Verified defect and smallest fix

The previous final-receipt validator reused `MeetupChallenge.expiresAt` and fresh
arrival checks after redemption. A rightful participant could scan within three
minutes, inspect the equipment, then lose the ability to submit their checklist
when the original QR or location check expired. No custody had changed, leaving
participants needing replacement challenges despite a successful scan.

QR redemption still requires a live unused challenge (180 seconds by default),
fresh independently accepted location checks/fallback, correct participant,
Booking state/version/timestamp and no open dispute. Successful redemption now
atomically persists `confirmationExpiresAt` alongside `consumedAt` under the
existing Booking lock. Only the saved deadline governs subsequent confirmation.
Time expiry of the original arrival/fallback snapshot does not shorten it; a new
check-in, replacement/revocation, changed participant, Booking mutation/state or
open dispute still invalidates the proof. Physical receipt, independent condition
evidence, inspection and lifecycle guards remain mandatory. Scanning never
changes custody. The return window gates physical receipt; after receipt, the
existing independent condition inspection has no new deadline imposed by this
change.

The server requires explicit `MEETUP_CONFIRMATION_TTL_SECONDS` for issuance and
redemption, an integer from 60–1800. **Proposed initial pilot value: 900 seconds
(15 minutes), pending product review. There is no runtime/public policy default.**
Tests explicitly select 900 or shortened bounded windows. This is a proposed
preview setting, not approval to enable public QR. Deadline starts at successful
server redemption, not issuance. Configuration changes/retries/restarts do not
extend already saved deadlines. After expiry request a replacement with fresh
required checks; condition drafts remain available. No penalty is introduced.

Identical successful scan retries return the same proof/deadline without a second
consumption. Final receipt retries retain existing payload fingerprints. A
changed request, another actor, replacement or ineligible Booking cannot use the
window to bypass authorization. Status exposes server-calculated eligibility;
the UI separately labels QR scanning deadline and remaining confirmation seconds.

## Additive migration requirements

`20261020090000_meetup_confirmation_window` must follow all prior migrations,
including `20261019210000_mrt_meetup_verification`. It adds one nullable timestamp
to MeetupChallenge, a database bound of 60–1800 seconds relative to consumption,
and updates the evidence-protection function so a recorded deadline is immutable.
New redemption transitions require a deadline. No historical migration is edited,
no Booking/evidence row is backfilled, and no old challenge is granted extra
validity. Previously consumed challenges with NULL deadline fail closed and must
be replaced; completed receipt retries retain their existing behavior. Regenerate
Prisma Client after the schema update. Code/schema must be kept together.

Only the isolated runner applies this migration to new owned `hustlen_test_*`
databases for these checks. This report does not authorize migrating the existing
marketplace or any retained demo. Do not roll back the timestamp/schema beneath
active enrolled custody without a separately reviewed recovery plan.

## Verification evidence

Final current-tree test outcomes are recorded below after execution. Automated
browser tests use actual authenticated Chromium mobile-sized contexts and
synthetic camera/geolocation input; they are not physical-phone/onsite results.
The timing regression uses real waits with a configured 30-second redemption
window, 120-second confirmation window and 60-second location window, exercising
the same validators as the default 180-second QR. It does not wait 15 minutes or
claim a real-world 15-minute field test. Participant changes, retained-timestamp
Booking writes and selected dispute/state invalidations use controlled SQL in
owned fixtures to simulate concurrent privileged changes; no participant-editing
product workflow is added. Actual response loss is injected in the browser;
delayed same-key retries are additionally exercised through the real API.

## Coordinates and devices

See [coordinate audit](qr/COORDINATE_AUDIT_3_1.md): 109/120 sourced points remain;
11 Circular Line coordinates remain unavailable. Both original official sources
and two official catalogue discovery hosts returned proxy CONNECT HTTP 403 in this task. No values were fabricated or identities
changed. Required action is official-source allowlist access or an independently
documented official export, followed by identity/provenance review.

See [private HTTPS physical-device guide](qr/PHYSICAL_DEVICE_TESTING.md) for private
LAN/approved certificate/proxy prerequisites, separate phones/roles, network loss,
permissions, delayed checklist and return acceptance, and teardown. No proxy,
certificate trust, firewall change, public tunnel, deployment or onsite test was
performed by preparing the guide.

## Remaining product and operational decisions

- Review the proposed 15-minute confirmation period and permitted configuration
  bounds for any eventual rollout. No automatic public enablement or penalties.
- Agree reduced-assurance handling, support ownership/escalation and mediated
  recovery when a valid proof expires while equipment is physically held.
- Obtain missing official coordinates and calibrate all station radii/exits onsite.
- Execute actual iOS Safari/Android Chrome acceptance under approved private HTTPS,
  including real underground/weak-network/camera/GPS conditions. GPS remains a
  supporting signal, not protection against spoofing or collusion.
- Approve retention/privacy, secret management and any separate return-station
  design before widening deployment. Existing policy decisions remain unresolved.

No `p2p_marketplace` operation, public QR enablement, deployment or merge was done.
This prepares controlled device testing; it is not a real-user rollout approval.

## Behavior matrix and test mapping

| Behavior | Executable coverage | Physical/operational limitation |
|---|---|---|
| Valid unused QR must be redeemed before deadline | `test:meetup`: actual 30-second TTL wait, expired-unused rejection | Default 180-second field experience not timed onsite |
| Borrower delayed condition/physical receipt | Same suite: real delayed submission beyond QR/check-in/fallback expiry | Equipment/coordinates synthetic |
| Owner delayed return receipt, then inspection | Same suite: reversed role/purpose, separate condition inspection | No real physical transfer observed |
| Confirmation window bounded and explicit | `test:unit`: missing/invalid/60/900/1800 configuration; integration real expiry | Proposed 900 seconds needs review before rollout |
| No replay extension or duplicate custody | Same-key scan and final-receipt retries, concurrent proof/evidence tests | Network loss also injected in authenticated browser |
| Booking version/state/participants/dispute | Post-scan mutation, replacement, recheck, wrong actor and dispute rejection | No new no-show or mediated override policy |
| Restart persistence | Existing browser restart; delayed proof restart with a larger new period keeps old saved deadline | Same secret required; operator recovery policy pending |
| QR and confirmation time shown separately | Browser assertions on two time labels and saved-proof form | Real phone backgrounding/clock presentation unverified |
| Historical migration/evidence protection | Populated pre-M3 and M3 fixtures, exact snapshots/checksums, NULL legacy proof and immutable deadline, repeated deploy | Synthetic disposable databases only |
| Existing rental/chat/moderation/admin/MRT | Existing regression suites listed in final outcomes | No CI or real cloud moderation validation claimed |
| Missing 11 station coordinates | Coverage tests; official source retrieval blocked by proxy 403 | Requires official source access and onsite calibration |
| Private HTTPS iOS/Android | Operator setup/acceptance/teardown guide prepared | Guide and physical devices not executed here |

## Exact changed files

Application/schema:

- `components/meetup-verification.tsx`
- `lib/meetup/config.ts`
- `lib/meetup/service.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20261020090000_meetup_confirmation_window/migration.sql`

Regression tests:

- `tests/meetup-location.test.ts`
- `tests/meetup-migration.test.ts`
- `tests/meetup.integration.test.ts`

Documentation/evidence:

- `docs/MILESTONE3_1_QR_ACCEPTANCE.md`
- `docs/MILESTONE3_MRT_VERIFICATION.md` (follow-up link; historical report retained)
- `docs/qr/COORDINATE_AUDIT_3_1.md`
- `docs/qr/PHYSICAL_DEVICE_TESTING.md`
- `docs/qr/verification-3-1.json`

No dependency/lockfile, historical migration, station catalogue, Booking lifecycle,
chat/moderation implementation, generated Prisma client or secret file is changed.

## Final executed outcomes

113 passing Node results (including parent/subtest results), zero final failed,
skipped or cancelled results. MRT functional scripts and the isolated production
build passed in addition. Repeated suites are counted once.

| Command | Result | Passing Node results |
|---|---|---:|
| `npm run lint` | PASS (exit 0) | — |
| `npx tsc --noEmit` | PASS (exit 0) | — |
| `npm run test:unit` | PASS (exit 0) | 36 |
| `npm run test:meetup-migration` | PASS (exit 0) | 1 |
| `npm run test:meetup` | PASS (exit 0) | 8 |
| `npm run test:chat` | PASS (exit 0) | 14 |
| `npm run test:stability` | PASS (exit 0) | 8 |
| `npm run test:rental-api` | PASS (exit 0) | 13 |
| `npm run test:rental-browser` | PASS (exit 0) | 4 |
| `npm run test:admin` | PASS (exit 0) | 7 |
| `npm run test:moderation` | PASS (exit 0) | 10 |
| `npm run test:integration` | PASS (exit 0) | — |
| `npm run test:migration` | PASS (exit 0) | — |
| `npm run test:admin-migration` | PASS (exit 0) | 1 |
| `npm run test:mvp` | PASS (exit 0) | 11 |
| `npm run build:verify` | PASS (exit 0) | — |
| `node node_modules/prisma/build/index.js generate --config prisma7.config.ts` | PASS (exit 0) | — |
| `node node_modules/prisma/build/index.js validate --config prisma7.config.ts` | PASS (exit 0) | — |

The final additional timing assertions explicitly verify Owner condition inspection
after QR expiry, arrival/fallback time expiry, and restarting with a larger new
configuration without extending an already saved deadline. Only these test
assertions and clarification of the return countdown text changed after the full
run began. API, configuration, schema and migration code remained identical.
QR/browser acceptance, lint and types were rerun on the final source snapshot;
the production build executed after the final wording change. Source fingerprints,
commands, outcomes and the 19 unchanged historical migration files are recorded
in [verification evidence](qr/verification-3-1.json).

Earlier development failures are retained in that evidence: an initial TypeScript
union issue, a migration checksum comparison that needed to exclude the newly
applied migration, and a fake-camera run that never reached verification. The
scanner browser now starts after its actual QR video exists. Subsequent successful
camera runs still use ZXing, actual authenticated pages and server verification;
no camera assertion was bypassed or replaced with a direct API success.

The private device guide, real phones, onsite location accuracy and a real elapsed
15-minute trial remain unexecuted. GitHub Actions was not run or claimed passed.
No public rollout readiness is claimed.
