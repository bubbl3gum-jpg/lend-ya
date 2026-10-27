import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordChangeInput } from "../lib/password-change/input";
import { passwordChangeConfig } from "../lib/password-change/config";
test("closed raw password schema preserves bytes and rejects forged selectors", () => {
  const value = {
    currentPassword: " old password ",
    newPassword: " new password ",
    confirmPassword: " new password ",
  };
  assert.deepEqual(passwordChangeInput(value), value);
  for (const raw of [
    null,
    {},
    { ...value, userId: 1 },
    { ...value, role: "ADMIN" },
    { ...value, assurance: "VERIFIED" },
    { ...value, newPassword: "short" },
    { ...value, confirmPassword: "different password" },
    { ...value, currentPassword: "x".repeat(129) },
    {
      ...value,
      newPassword: value.currentPassword,
      confirmPassword: value.currentPassword,
    },
  ])
    assert.equal(passwordChangeInput(raw), null);
});
test("password candidate fails closed for production, target/driver overrides, missing binding and mixed worker configuration", () => {
  const url =
      "postgresql://owned:fixture@localhost:55433/hustlen_test_11e_config",
    env = {
      NODE_ENV: "development",
      HUSTLEN_PASSWORD_CHANGE_CANDIDATE: "owned-password-only",
      HUSTLEN_PASSWORD_CHANGE_ORIGIN: "http://localhost:3100",
      HUSTLEN_PASSWORD_CHANGE_USER_IDS: "1",
      DATABASE_URL: url,
      TEST_DATABASE_URL: url,
      MRT_TEST_DATABASE_URL: url,
      MRT_TEST_RUN_ID: "a".repeat(24),
    };
  assert.deepEqual(passwordChangeConfig(env).adminIds, [1]);
  for (const extra of [
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { HUSTLEN_PASSWORD_CHANGE_CANDIDATE: "true" },
    { HUSTLEN_PASSWORD_CHANGE_USER_IDS: "" },
    { HUSTLEN_PASSWORD_CHANGE_ORIGIN: "https://example.com" },
    { HUSTLEN_SUPPORT_STAFF_CANDIDATE: "owned-synthetic-only" },
    { PGHOST: "unexpected.invalid" },
    { PGDATABASE: "real" },
    { PGOPTIONS: "-c dbname=real" },
    { DATABASE_URL: url + "?host=evil.invalid" },
    { TEST_DATABASE_URL: url + "_other" },
    { MRT_TEST_RUN_ID: "invalid" },
  ])
    assert.throws(() => passwordChangeConfig({ ...env, ...extra }));
});
