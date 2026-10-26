import "server-only";
import { announcementAdmin } from "../announcements/service";
import { MAX_RENTAL_DAYS } from "../booking-time";
import { locationSettings } from "../meetup/location";
import {
  ttlSeconds,
  checkInTtlSeconds,
  confirmationTtlSeconds,
} from "../meetup/config";
import { retentionSettings } from "../chat/config";
import { announcementConfig } from "../announcements/config";
import { network } from "../mrt/network";
export type SettingRow = {
  id: string;
  label: string;
  value: string;
  source: string;
  type: string;
  impact: string;
  future: string;
};
export async function settingsInventory(): Promise<SettingRow[]> {
  await announcementAdmin();
  const safe = (f: () => unknown) => {
    try {
      return String(f());
    } catch {
      return "Unavailable: invalid or missing trusted configuration";
    }
  };
  const gate = (key: string, value: string) =>
    process.env.NODE_ENV === "development" && process.env[key] === value
      ? "Development gate configured; ownership, session and scope checks still required"
      : "Disabled";
  const rows: SettingRow[] = [];
  const add = (
    id: string,
    label: string,
    value: string,
    source: string,
    type: string,
    impact: string,
    future = "Independent approval / reviewed code migration",
  ) => rows.push({ id, label, value, source, type, impact, future });
  add(
    "rental.maxDays",
    "Maximum rental duration",
    String(MAX_RENTAL_DAYS),
    "lib/booking-time.ts:MAX_RENTAL_DAYS",
    "integer days",
    "Rental eligibility and price interval",
  );
  add(
    "rental.clock",
    "Rental display and unzoned input clock",
    "Asia/Taipei (UTC+08:00)",
    "lib/booking-time.ts:parseRentalTime / formatRentalTime",
    "IANA timezone",
    "UTC storage; explicit offsets honored",
  );
  add(
    "handoff.location",
    "Agreed handoff station",
    "Canonical + operational + offered station required for new listing / booking choices; agreed station preserved",
    "lib/mrt/station-validation.ts; app/api/bookings/route.ts; MrtStation.operational; ListingStation",
    "database booleans / relations",
    "Existing meetup verification does not suspend already-agreed handoffs based on operational alone",
  );
  add(
    "gps.standardRadius",
    "Standard station radius",
    safe(
      () =>
        locationSettings(
          network.stations.find((s) => Object.keys(s.codes).length === 1)!.id,
        ).radiusMeters,
    ) + " m (selected standard station; per-station overrides may apply)",
    "lib/meetup/location.ts; MEETUP_STATION_RADIUS_M; MEETUP_STATION_RADII_JSON",
    "number 50–800 m",
    "Geofence acceptance; default 200 m",
  );
  add(
    "gps.interchangeRadius",
    "Interchange radius",
    safe(
      () =>
        locationSettings(
          network.stations.find((s) => Object.keys(s.codes).length > 1)!.id,
        ).radiusMeters,
    ) + " m (selected interchange; per-station overrides may apply)",
    "lib/meetup/location.ts; MEETUP_INTERCHANGE_RADIUS_M; MEETUP_STATION_RADII_JSON",
    "number 50–800 m",
    "Geofence acceptance; default 350 m",
  );
  add(
    "gps.accuracy",
    "Maximum GPS accuracy",
    safe(() => locationSettings(network.stations[0].id).maxAccuracyMeters) +
      " m",
    "lib/meetup/location.ts; MEETUP_MAX_ACCURACY_M",
    "number 10–200 m",
    "Rejects inaccurate samples; distance + accuracy must fit radius",
  );
  add(
    "gps.freshness",
    "GPS freshness / future skew",
    "120 seconds / 5 seconds",
    "lib/meetup/location.ts:evaluateLocation",
    "fixed milliseconds",
    "Stale/future sample rejection; security invariant",
    "Not dashboard-editable",
  );
  add(
    "gps.coordinates",
    "Authoritative coordinates",
    `${network.stations.filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number").length} of ${network.stations.length} stations; missing remains unavailable`,
    "data/mrt/official-network.json",
    "immutable reviewed catalogue",
    "No inferred coordinates or test-centre substitution",
  );
  add(
    "meetup.challengeTTL",
    "QR challenge validity",
    safe(ttlSeconds) + " seconds",
    "lib/meetup/config.ts; MEETUP_CHALLENGE_TTL_SECONDS",
    "integer 30–300; default 180",
    "Replay / expiration boundary",
  );
  add(
    "meetup.checkInTTL",
    "Check-in validity",
    safe(checkInTtlSeconds) + " seconds",
    "lib/meetup/config.ts; MEETUP_CHECKIN_TTL_SECONDS",
    "integer 60–1800; default 600",
    "Location freshness across challenge issuance",
  );
  add(
    "meetup.confirmationTTL",
    "Physical receipt confirmation window",
    safe(confirmationTtlSeconds) + " seconds",
    "lib/meetup/config.ts; MEETUP_CONFIRMATION_TTL_SECONDS",
    "explicit integer 60–1800; no default",
    "Preview policy must be explicitly configured",
  );
  add(
    "evidence.requirements",
    "Evidence and camera safeguards",
    "Five checklist answers; physical receipt; participant authorization; QR camera and evidence validation preserved",
    "lib/booking-evidence.ts; lib/rental-checklist.ts; lib/meetup/service.ts",
    "code invariants",
    "Custody and dispute protections",
    "Not dashboard-editable",
  );
  add(
    "evidence.photoLimits",
    "Private photo upload limits",
    "8 images; 5 MiB each; 20 MiB total; JPEG / PNG / WebP",
    "lib/booking-evidence.ts:validatePrivatePhotos",
    "bounded bytes / MIME allowlist",
    "Private rental evidence processing",
  );
  add(
    "security.sessionTTL",
    "Authentication session lifetime",
    "7 days at creation; persisted expiry governs current session",
    "lib/auth.ts:newSessionCredential; AuthSession.expiresAt",
    "fixed seconds / database timestamp",
    "Session validity; current account rechecked",
    "Not dashboard-editable",
  );
  add(
    "security.authenticationRate",
    "Authentication rate limits",
    "Per-account: 10 login or 5 registration attempts in 15 minutes; persisted counters",
    "lib/auth-rate-limit.ts:authenticationLimit; AuthRateLimit",
    "fixed integer limits / expiry",
    "Not a substitute for approved trusted-ingress traffic limits",
    "Not dashboard-editable",
  );
  add(
    "security.accountState",
    "Account restriction policy",
    "Legacy ACTIVE / SUSPENDED moderation remains in force. Future 48-hour / 24-hour review / cumulative 72-hour restrictions are not activated.",
    "lib/admin/mutations.ts; User.accountStatus; docs/admin/ADMIN_PERMISSION_MATRIX.md",
    "persisted enum / existing guarded mutations",
    "No new suspension powers or future policy activation",
    "Independent approval / reviewed authorization cutover",
  );
  add(
    "meetup.testCentre",
    "Temporary location isolation",
    "Owned-development allowlists and participant consent; maximum 1 hour, earlier revocation; TEST_LOCATION only",
    "lib/meetup/test-location.ts; lib/geofencing-lab/store.ts; lib/geofencing-lab/config.ts",
    "immutable test boundary / bounded TTL",
    "No raw test coordinates in inventory; no production simulation",
    "Not dashboard-editable",
  );
  add(
    "meetup.rateLimits",
    "Meetup request throttles",
    "Check-in 5 / 60 seconds; issue 5 / 60 seconds; verify 10 / 900 seconds; return assistance 3 / 86400 seconds",
    "lib/meetup/service.ts:limit call sites",
    "fixed action-specific integer windows",
    "Abuse controls do not waive custody or evidence requirements",
    "Not dashboard-editable",
  );
  add(
    "security.roles",
    "Staff activation / approval execution",
    "Not activated by this batch; legacy ACTIVE Admin guards remain authoritative",
    "lib/admin/auth.ts; lib/authorization; prisma/migrations",
    "immutable guards / inactive membership constraints",
    "No ADMIN OR STAFF bypass",
    "Not dashboard-editable",
  );
  add(
    "security.passkeyPilot",
    "Passkey development pilot",
    gate("HUSTLEN_PASSKEY_PILOT", "owned-development-only"),
    "lib/passkey-pilot-config.ts; HUSTLEN_PASSKEY_PILOT",
    "exact development-only gate",
    "Owned DB and trusted origin required; not mandatory production MFA",
    "Not dashboard-editable",
  );
  for (const [id, key, value, source] of [
    [
      "tickets",
      "HUSTLEN_SUPPORT_TICKET_CANDIDATE",
      "owned-development-only",
      "lib/support/config.ts",
    ],
    [
      "channels",
      "HUSTLEN_SUPPORT_CHANNEL_CANDIDATE",
      "owned-requester-only",
      "lib/support/channel-config.ts",
    ],
    [
      "staff",
      "HUSTLEN_SUPPORT_STAFF_CANDIDATE",
      "owned-synthetic-only",
      "lib/support-staff-candidate/config.ts",
    ],
    [
      "lab",
      "HUSTLEN_GEOFENCING_LAB",
      "owned-self-only",
      "lib/geofencing-lab/config.ts",
    ],
    [
      "staffRead",
      "HUSTLEN_STAFF_READ_PILOT",
      "owned-synthetic-only",
      "lib/staff-read-pilot/config.ts",
    ],
  ])
    add(
      `candidate.${id}`,
      `${id} development availability`,
      gate(key, value),
      `${source}; ${key}`,
      "exact gate + owned DB + scoped authorization",
      "Production refused independently of flag",
      "Not dashboard-editable",
    );
  const retention = retentionSettings();
  add(
    "chat.availability",
    "Chat availability",
    process.env.CHAT_ENABLED === "true"
      ? "Global flag configured; participant authorization still required"
      : "Global disabled; explicit preview allowlist may apply",
    "lib/chat/config.ts; CHAT_ENABLED; CHAT_PREVIEW_USER_IDS",
    "boolean / bounded account allowlist",
    "Private conversations remain participant scoped",
  );
  add(
    "chat.retention",
    "Chat retention configuration",
    `Message days: ${retention.messageDays ?? "not configured"}; reported evidence days: ${retention.reportedEvidenceDays ?? "not configured"}; automatic deletion: disabled`,
    "lib/chat/config.ts; CHAT_MESSAGE_RETENTION_DAYS; CHAT_EVIDENCE_RETENTION_DAYS",
    "optional positive integer days",
    "Retention / holds need approved policy",
  );
  add(
    "chat.analysis",
    "Advisory analysis mode",
    process.env.CHAT_ANALYSIS_MODE === "mock-shadow"
      ? "Mock shadow configured"
      : "Disabled",
    "lib/chat/analysis/jobs.ts; CHAT_ANALYSIS_MODE",
    "exact mode",
    "No autonomous administrative authority",
    "Not dashboard-editable",
  );
  add(
    "announcement.candidate",
    "Announcement mutation configuration",
    safe(() => {
      announcementConfig();
      return "Owned-development candidate configured; current tester/DB marker still checked on each operation";
    }),
    "lib/announcements/config.ts; HUSTLEN_ANNOUNCEMENT_CANDIDATE",
    "exact gate + origin + allowlist + owned DB",
    "No production publication authority",
    "Not dashboard-editable",
  );
  add(
    "announcement.policy",
    "Candidate publication policy",
    "OWNED_TEST_ADMIN; plain text 120 / 4000 characters; 31-day maximum window; no external delivery",
    "lib/announcements/input.ts; service.ts",
    "fixed candidate policy",
    "Not product approval; routine/high-impact split unresolved",
  );
  add(
    "notifications.delivery",
    "Announcement notification delivery",
    "Not implemented; in-app test page only",
    "app/dev/announcements/page.tsx; lib/announcements/service.ts",
    "no provider / outbox",
    "No fabricated delivery counts",
    "Separate approved infrastructure and audience policy",
  );
  return rows;
}
