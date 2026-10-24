import { test } from "node:test";
import assert from "node:assert/strict";
import { staffReadPilotConfig } from "../lib/staff-read-pilot/config";
test("staff read fixture cannot become production or select an unowned/overridden target", () => {
  const safe = {
    NODE_ENV: "development",
    HUSTLEN_STAFF_READ_PILOT: "owned-synthetic-only",
    HUSTLEN_STAFF_READ_ORIGIN: "http://localhost:4319",
    MRT_TEST_RUN_ID: "a".repeat(24),
    DATABASE_URL: "postgresql://localhost:55433/hustlen_test_staff",
    TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_staff",
    MRT_TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_staff",
  };
  assert.equal(staffReadPilotConfig(safe).realm.rpId, "localhost");
  for (const bad of [
    { NODE_ENV: "production" },
    { HUSTLEN_STAFF_READ_PILOT: "true" },
    { HUSTLEN_STAFF_READ_ORIGIN: "https://staff.example" },
    { MRT_TEST_RUN_ID: "invalid" },
    { PGHOST: "evil.example" },
    { PGOPTIONS: "-c dbname=production" },
    { TEST_DATABASE_URL: "postgresql://localhost/production" },
  ])
    assert.throws(() => staffReadPilotConfig({ ...safe, ...bad }));
});
