import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestCentre,
  currentTestCentre,
  revokeTestCentre,
  TEST_LOCATION_TTL,
  testLocationEnvironment,
  testLocationParticipant,
  testChecksMatch,
} from "../lib/meetup/test-location";
import { evaluateLocation, stationCoordinates } from "../lib/meetup/location";

test("temporary mode fails closed outside an explicitly designated local disposable dev database", () => {
  const url = "postgresql://demo:demo@localhost:55433/hustlen_test_local";
  const env = {
    NODE_ENV: "development",
    MEETUP_TEST_LOCATION_ENABLED: "true",
    DATABASE_URL: url,
    MRT_TEST_DATABASE_URL: url,
    MRT_TEST_RUN_ID: "a".repeat(24),
  };
  assert.equal(testLocationEnvironment(env), true);
  for (const patch of [
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { MEETUP_TEST_LOCATION_ENABLED: undefined },
    { MRT_TEST_RUN_ID: "wrong" },
    { MRT_TEST_DATABASE_URL: undefined },
    {
      DATABASE_URL: url.replace("hustlen_test_local", "production"),
      MRT_TEST_DATABASE_URL: url.replace("hustlen_test_local", "production"),
    },
    {
      DATABASE_URL: url.replace("localhost", "db.example.com"),
      MRT_TEST_DATABASE_URL: url.replace("localhost", "db.example.com"),
    },
  ])
    assert.equal(testLocationEnvironment({ ...env, ...patch }), false);
});
test("one-booking centre requires separate acknowledgements, expires after exactly one hour and is revocable", () => {
  const c = createTestCentre(913, 1, 22.1, 121.1);
  try {
    assert.equal(c.generation.length, 32);
    assert.deepEqual([...c.acknowledgements], [1]);
    assert.equal(currentTestCentre(914), undefined);
    assert.equal(currentTestCentre(913, c.expiresAt - 1), c);
    assert.equal(currentTestCentre(913, c.expiresAt), undefined);
    assert.equal(TEST_LOCATION_TTL, 3600000);
    const next = createTestCentre(913, 2, 23.1, 122.1);
    assert.notEqual(next.generation, c.generation);
    assert.deepEqual([...next.acknowledgements], [2]);
    revokeTestCentre(913);
    assert.equal(currentTestCentre(913), undefined);
  } finally {
    revokeTestCentre(913);
  }
});
test("temporary centre uses existing distance, accuracy and freshness policy without mutating official coordinates", () => {
  const before = JSON.stringify(stationCoordinates);
  const centre = { latitude: 22.1, longitude: 121.1 };
  const sample = { ...centre, accuracy: 10, timestamp: Date.now() };
  assert.equal(
    evaluateLocation("taipei-main", sample, sample.timestamp, centre).outcome,
    "VERIFIED",
  );
  assert.equal(
    evaluateLocation(
      "taipei-main",
      { ...sample, accuracy: 1000 },
      sample.timestamp,
      centre,
    ).outcome,
    "INACCURATE",
  );
  assert.equal(
    evaluateLocation(
      "taipei-main",
      { ...sample, latitude: 24 },
      sample.timestamp,
      centre,
    ).outcome,
    "OUTSIDE",
  );
  assert.throws(() =>
    evaluateLocation(
      "taipei-main",
      { ...sample, timestamp: sample.timestamp - 120001 },
      sample.timestamp,
      centre,
    ),
  );
  assert.equal(JSON.stringify(stationCoordinates), before);
});
test("demo allowlist is explicit and does not accept empty or malformed IDs", () => {
  const old = process.env.MEETUP_TEST_LOCATION_USER_IDS;
  try {
    process.env.MEETUP_TEST_LOCATION_USER_IDS = "1, 2, 0, 3x";
    assert.equal(testLocationParticipant(1), true);
    assert.equal(testLocationParticipant(2), true);
    assert.equal(testLocationParticipant(0), false);
    assert.equal(testLocationParticipant(3), false);
  } finally {
    if (old === undefined) delete process.env.MEETUP_TEST_LOCATION_USER_IDS;
    else process.env.MEETUP_TEST_LOCATION_USER_IDS = old;
  }
});

test("QR test checks cannot authorize issuance or redemption after expiry, revocation or replacement", () => {
  const c = createTestCentre(981, 1, 0, 0);
  const check = {
    outcome: "UNAVAILABLE",
    reason: "TEST_LOCATION",
    policyVersion: c.generation,
  };
  try {
    assert.equal(testChecksMatch(c, [check, check], c.expiresAt - 1), true);
    assert.equal(testChecksMatch(c, [check, check], c.expiresAt), false);
    assert.equal(testChecksMatch(c, [check]), false);
    assert.equal(
      testChecksMatch(c, [check, { ...check, policyVersion: "different" }]),
      false,
    );
    assert.equal(
      testChecksMatch(c, [check, { ...check, outcome: "VERIFIED" }]),
      false,
    );
    revokeTestCentre(981);
    assert.equal(
      testChecksMatch(currentTestCentre(981), [check, check]),
      false,
    );
  } finally {
    revokeTestCentre(981);
  }
});
