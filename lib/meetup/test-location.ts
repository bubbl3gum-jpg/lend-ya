import { randomBytes } from "node:crypto";

export const TEST_LOCATION_TTL = 60 * 60 * 1000;
export type TestCentre = {
  generation: string;
  latitude: number;
  longitude: number;
  expiresAt: number;
  acknowledgements: Set<number>;
};
// Deliberately process-local: no disk, database, coordinates in DTOs, or restart recovery.
// A different worker/restart fails closed. Use a single dev server for this demo.
const centres = new Map<number, TestCentre>();
export function currentTestCentre(id: number, now = Date.now()) {
  const centre = centres.get(id);
  if (centre && centre.expiresAt <= now) {
    centres.delete(id);
    return undefined;
  }
  return centre;
}
export function revokeTestCentre(id: number) {
  centres.delete(id);
}
export function createTestCentre(
  id: number,
  uid: number,
  latitude: number,
  longitude: number,
) {
  const centre: TestCentre = {
    generation: randomBytes(16).toString("hex"),
    latitude,
    longitude,
    expiresAt: Date.now() + TEST_LOCATION_TTL,
    acknowledgements: new Set([uid]),
  };
  centres.set(id, centre);
  const generation = centre.generation;
  setTimeout(() => {
    if (centres.get(id)?.generation === generation) centres.delete(id);
  }, TEST_LOCATION_TTL).unref();
  return centre;
}
export function testLocationEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    return (
      env.NODE_ENV === "development" &&
      env.MEETUP_TEST_LOCATION_ENABLED === "true" &&
      env.DATABASE_URL === env.MRT_TEST_DATABASE_URL &&
      /^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") &&
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      /^hustlen_test_[a-z0-9_]+$/.test(url.pathname.slice(1)) &&
      url.pathname.length <= 64
    );
  } catch {
    return false;
  }
}
export function testLocationParticipant(uid: number) {
  return (process.env.MEETUP_TEST_LOCATION_USER_IDS ?? "")
    .split(",")
    .some((id) => /^[1-9][0-9]*$/.test(id.trim()) && Number(id.trim()) === uid);
}

/** Shared issuance/redemption gate. Old check-ins never resurrect a removed centre. */
export function testChecksMatch(
  centre: TestCentre | undefined,
  checks: Array<{ outcome: string; reason: string; policyVersion: string }>,
  now = Date.now(),
) {
  return (
    !!centre &&
    centre.expiresAt > now &&
    checks.length === 2 &&
    checks.every(
      (check) =>
        check.outcome === "UNAVAILABLE" &&
        check.reason === "TEST_LOCATION" &&
        check.policyVersion === centre.generation,
    )
  );
}
