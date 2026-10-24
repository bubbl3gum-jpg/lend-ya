import { test } from "node:test";
import assert from "node:assert/strict";
import { passkeyPilotConfiguration } from "../lib/passkey-pilot-config";
const safe = {
  NODE_ENV: "development",
  HUSTLEN_PASSKEY_PILOT: "owned-development-only",
  MRT_TEST_RUN_ID: "a".repeat(24),
  HUSTLEN_PASSKEY_PILOT_ORIGIN: "http://localhost:4321",
  DATABASE_URL: "postgresql://localhost:55433/hustlen_test_pilot_config",
  TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_pilot_config",
  MRT_TEST_DATABASE_URL:
    "postgresql://localhost:55433/hustlen_test_pilot_config",
};
test("passkey pilot requires exact development config and refuses production despite an enabled flag", () => {
  assert.equal(
    passkeyPilotConfiguration(safe).realm.origin,
    safe.HUSTLEN_PASSKEY_PILOT_ORIGIN,
  );
  for (const patch of [
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { HUSTLEN_PASSKEY_PILOT: "true" },
    { HUSTLEN_PASSKEY_PILOT_ORIGIN: "https://admin.example" },
    { HUSTLEN_PASSKEY_PILOT_ORIGIN: "http://localhost:4321/" },
    { HUSTLEN_PASSKEY_PILOT_ORIGIN: "http://localhost.evil:4321" },
    { MRT_TEST_RUN_ID: "fake" },
    { TEST_DATABASE_URL: "postgresql://localhost/real" },
    { DATABASE_URL: "postgresql://localhost/production" },
    { PGHOST: "evil.example" },
    { PGOPTIONS: "-c search_path=evil" },
    { NODE_PG_FORCE_NATIVE: "1" },
  ])
    assert.throws(() => passkeyPilotConfiguration({ ...safe, ...patch }));
  for (const override of [
    "?host=evil.example",
    "?database=real",
    "?options=-c%20dbname=real",
    "?sslmode=require",
  ]) {
    const value = safe.DATABASE_URL + override;
    assert.throws(() =>
      passkeyPilotConfiguration({
        ...safe,
        DATABASE_URL: value,
        TEST_DATABASE_URL: value,
        MRT_TEST_DATABASE_URL: value,
      }),
    );
  }
});
