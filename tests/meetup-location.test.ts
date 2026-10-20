import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceMeters,
  evaluateLocation,
  stationCoordinates,
  locationSettings,
} from "../lib/meetup/location";
import {
  previewParticipant,
  ttlSeconds,
  confirmationTtlSeconds,
} from "../lib/meetup/config";
test("MRT location coverage is explicit: 109 sourced points, 11 unavailable; no invented coordinates", () => {
  assert.equal(stationCoordinates.length, 120);
  assert.equal(new Set(stationCoordinates.map((s) => s.id)).size, 120);
  const present = stationCoordinates.filter(
    (s) => s.latitude !== undefined && s.longitude !== undefined,
  );
  assert.equal(present.length, 109);
  for (const s of present) {
    assert.ok(s.latitude! > 24.8 && s.latitude! < 25.3);
    assert.ok(s.longitude! > 121.2 && s.longitude! < 121.8);
  }
  for (const s of stationCoordinates.filter((s) => s.latitude === undefined))
    assert.equal(
      evaluateLocation(s.id, {
        latitude: 25,
        longitude: 121.5,
        accuracy: 10,
        timestamp: Date.now(),
      }).outcome,
      "UNAVAILABLE",
    );
});
test("server distance, accuracy envelope and sample freshness fail safely", () => {
  const s = stationCoordinates.find((s) => s.latitude !== undefined)!;
  const sample = {
    latitude: s.latitude!,
    longitude: s.longitude!,
    accuracy: 10,
    timestamp: Date.now(),
  };
  assert.equal(evaluateLocation(s.id, sample).outcome, "VERIFIED");
  assert.equal(
    evaluateLocation(s.id, { ...sample, accuracy: 500 }).outcome,
    "INACCURATE",
  );
  assert.equal(
    evaluateLocation(s.id, { ...sample, latitude: 24 }).outcome,
    "OUTSIDE",
  );
  assert.ok(distanceMeters(25, 121, 25.001, 121) > 100);
  assert.equal(distanceMeters(25, 121, 25, 121), 0);
  for (const input of [
    { ...sample, latitude: 999 },
    { ...sample, timestamp: Date.now() - 121000 },
    { ...sample, timestamp: Date.now() + 6000 },
    { ...sample, accuracy: -1 },
  ])
    assert.throws(() => evaluateLocation(s.id, input));
});
test("preview defaults off and station overrides are validated and bounded", () => {
  const names = [
      "MEETUP_PREVIEW_USER_IDS",
      "MEETUP_STATION_RADII_JSON",
      "MEETUP_CHALLENGE_TTL_SECONDS",
    ],
    old = names.map((n) => process.env[n]);
  try {
    names.forEach((n) => delete process.env[n]);
    assert.equal(previewParticipant(1), false);
    assert.equal(ttlSeconds(), 180);
    const s = stationCoordinates[0];
    process.env.MEETUP_STATION_RADII_JSON = JSON.stringify({ [s.id]: 275 });
    assert.equal(locationSettings(s.id).radiusMeters, 275);
    process.env.MEETUP_STATION_RADII_JSON = '{"invented":200}';
    assert.throws(() => locationSettings(s.id));
    process.env.MEETUP_CHALLENGE_TTL_SECONDS = "99999";
    assert.throws(ttlSeconds);
  } finally {
    names.forEach((n, i) => {
      if (old[i] === undefined) delete process.env[n];
      else process.env[n] = old[i];
    });
  }
});

test("confirmation window requires an explicit bounded preview choice", () => {
  const old = process.env.MEETUP_CONFIRMATION_TTL_SECONDS;
  try {
    delete process.env.MEETUP_CONFIRMATION_TTL_SECONDS;
    assert.throws(confirmationTtlSeconds);
    for (const invalid of ["", "59", "1801", "900.5", "NaN"]) {
      process.env.MEETUP_CONFIRMATION_TTL_SECONDS = invalid;
      assert.throws(confirmationTtlSeconds);
    }
    for (const valid of [60, 900, 1800]) {
      process.env.MEETUP_CONFIRMATION_TTL_SECONDS = String(valid);
      assert.equal(confirmationTtlSeconds(), valid);
    }
  } finally {
    if (old === undefined) delete process.env.MEETUP_CONFIRMATION_TTL_SECONDS;
    else process.env.MEETUP_CONFIRMATION_TTL_SECONDS = old;
  }
});
