import { test } from "node:test";
import assert from "node:assert/strict";
import { geofencingLabConfig } from "../lib/geofencing-lab/config";
import {
  createLab,
  requireLab,
  setLabCentre,
  closeLab,
  labStatus,
  LAB_TTL,
  type Binding,
} from "../lib/geofencing-lab/store";
import { evaluateLocation, locationSettings } from "../lib/meetup/location";
import { pointFromMeters, plotPoint } from "../lib/geofencing-lab/geometry";
import official from "../data/mrt/official-network.json";
const binding: Binding = {
  userId: 1,
  sessionHash: "session",
  sessionBorn: "incarnation",
  deviceHash: "device",
};
test("Lab requires development, owned exact bindings, allowlist and safe PostgreSQL options", () => {
  const env = {
    NODE_ENV: "development",
    HUSTLEN_GEOFENCING_LAB: "owned-self-only",
    MRT_TEST_RUN_ID: "a".repeat(24),
    DATABASE_URL: "postgresql://localhost:55433/hustlen_test_lab",
    TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_lab",
    MRT_TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_lab",
    HUSTLEN_GEOFENCING_LAB_ORIGIN: "http://localhost:3456",
    HUSTLEN_GEOFENCING_LAB_ADMIN_IDS: "1,2",
  };
  assert.deepEqual(geofencingLabConfig(env).adminIds, [1, 2]);
  for (const change of [
    { NODE_ENV: "production" },
    { HUSTLEN_GEOFENCING_LAB: "" },
    { HUSTLEN_GEOFENCING_LAB_ADMIN_IDS: "1,forged" },
    { HUSTLEN_GEOFENCING_LAB_ORIGIN: "https://localhost:3456" },
    { PGOPTIONS: "-h evil.invalid" },
    { PGDATABASE: "production" },
    { TEST_DATABASE_URL: "postgresql://localhost:55433/existing" },
  ])
    assert.throws(() => geofencingLabConfig({ ...env, ...change }));
});
test("Lab binds exact account, session incarnation and private browser cookie; maximum one hour and revocation erases centre", () => {
  const now = Date.now(),
    lab = createLab(binding, 3600, now);
  assert.equal(lab.expiresAt - now, LAB_TTL);
  assert.throws(() => createLab(binding, 3601));
  for (const change of [
    { userId: 2 },
    { sessionHash: "other" },
    { sessionBorn: "replaced" },
    { deviceHash: "wrong" },
  ])
    assert.throws(() => requireLab(lab.id, { ...binding, ...change }, now));
  setLabCentre(lab, "map", { latitude: 25, longitude: 121 }, 30, now);
  assert.ok(lab.centre);
  assert.ok(!JSON.stringify(labStatus(lab)).includes("latitude"));
  closeLab(lab.id);
  assert.equal(lab.centre, undefined);
  assert.throws(() => requireLab(lab.id, binding, now));
});
test("Expired centres cannot silently become official-station checks; expired session and replacement remove coordinates", () => {
  const now = Date.now(),
    lab = createLab(binding, 20, now);
  setLabCentre(lab, "device", { latitude: 25, longitude: 121 }, 1, now);
  assert.equal(requireLab(lab.id, binding, now + 1001).centreMode, "expired");
  assert.equal(lab.centre, undefined);
  assert.throws(() => requireLab(lab.id, binding, now + 20000));
  const old = createLab(binding, 3600, now);
  setLabCentre(old, "map", { latitude: 25, longitude: 121 }, 3600, now);
  const replacement = createLab(binding, 1, now);
  assert.equal(old.centre, undefined);
  closeLab(replacement.id);
});
test("Existing strict geofence policy: near edges, exact accuracy/freshness limits, interchange and invalid samples", () => {
  const station = official.stations.find(
      (s) => Object.keys(s.codes).length === 1,
    )!,
    centre = { latitude: station.latitude!, longitude: station.longitude! },
    policy = locationSettings(station.id),
    now = Date.now();
  const sample = (offset: number, accuracy = 10, timestamp = now) => ({
    ...pointFromMeters(0, offset, centre),
    accuracy,
    timestamp,
  });
  assert.equal(
    evaluateLocation(station.id, sample(policy.radiusMeters - 10 - 0.02), now)
      .outcome,
    "VERIFIED",
  );
  assert.equal(
    evaluateLocation(station.id, sample(policy.radiusMeters - 10 + 0.02), now)
      .outcome,
    "OUTSIDE",
  );
  assert.equal(
    evaluateLocation(station.id, sample(0, policy.maxAccuracyMeters), now)
      .outcome,
    "VERIFIED",
  );
  assert.equal(
    evaluateLocation(
      station.id,
      sample(0, policy.maxAccuracyMeters + 0.01),
      now,
    ).outcome,
    "INACCURATE",
  );
  assert.doesNotThrow(() =>
    evaluateLocation(station.id, sample(0, 10, now - 120000), now),
  );
  assert.throws(() =>
    evaluateLocation(station.id, sample(0, 10, now - 120001), now),
  );
  assert.doesNotThrow(() =>
    evaluateLocation(station.id, sample(0, 10, now + 5000), now),
  );
  assert.throws(() =>
    evaluateLocation(station.id, sample(0, 10, now + 5001), now),
  );
  assert.throws(() =>
    evaluateLocation(station.id, { ...sample(0), latitude: 91 }, now),
  );
  const missing = official.stations.find((s) => typeof s.latitude !== "number");
  assert.ok(missing);
  assert.equal(
    evaluateLocation(missing.id, sample(0), now).outcome,
    "UNAVAILABLE",
  );
  const interchange = official.stations.find(
    (s) => Object.keys(s.codes).length > 1,
  )!;
  assert.equal(locationSettings(interchange.id).radiusMeters, 350);
  const p = pointFromMeters(123, -456, centre),
    projected = plotPoint(p, centre);
  assert.ok(
    Math.abs(projected.east - 123) < 1e-6 &&
      Math.abs(projected.north + 456) < 1e-6,
  );
});
