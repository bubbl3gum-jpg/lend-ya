import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  KEYS,
  encode,
  decode,
  defaultEncoded,
  parseSettingCommand,
  keyOf,
} from "../lib/platform-settings/registry";
import { settingsConfig } from "../lib/platform-settings/config";
test("exact two display keys, strict values and default contracts", () => {
  assert.equal(KEYS.length, 2);
  assert.equal(defaultEncoded(KEYS[0]), 1);
  assert.equal(defaultEncoded(KEYS[1]), 100);
  assert.equal(decode(KEYS[0], 0), false);
  for (const v of ["true", 1, 0, null, {}, []])
    assert.throws(() => encode(KEYS[0], v));
  for (const v of [0, 101, 1.5, "2", null, NaN, Infinity])
    assert.throws(() => encode(KEYS[1], v));
  for (const k of [
    "gps.radius",
    "security.sessionTTL",
    "staff.role",
    "__proto__",
    "dev.announcements.visible.extra",
    {},
    null,
  ])
    assert.throws(() => keyOf(k));
  assert.throws(() => decode(KEYS[0], 2));
});
test("fixed commands reject actors, scope, risk, replay ambiguity and unsafe rollback", () => {
  const c = {
    action: "SET",
    key: KEYS[0],
    value: false,
    expectedVersion: 0,
    requestId: randomUUID(),
  };
  assert.equal(parseSettingCommand(c).value, 0);
  for (const patch of [
    { actorId: 1 },
    { role: "ADMIN" },
    { risk: "LOW" },
    { policy: "forged" },
    { action: ["SET"] },
    { expectedVersion: -1 },
    { value: "false" },
    { requestId: "bad" },
    { targetVersion: 0 },
  ])
    assert.throws(() => parseSettingCommand({ ...c, ...patch }));
  assert.equal(
    parseSettingCommand({
      action: "ROLLBACK",
      key: KEYS[0],
      expectedVersion: 2,
      targetVersion: 0,
      requestId: randomUUID(),
    }).targetVersion,
    0,
  );
  for (const targetVersion of [-1, 2, 3, 1.2, "0"])
    assert.throws(() =>
      parseSettingCommand({
        action: "ROLLBACK",
        key: KEYS[0],
        expectedVersion: 2,
        targetVersion,
        requestId: randomUUID(),
      }),
    );
});
test("independent owned gate cannot enable production or inherit announcement actor/origin settings", () => {
  const u =
      "postgresql://fixture:fixture@localhost:5432/hustlen_test_settings_unit",
    env = {
      NODE_ENV: "development",
      DATABASE_URL: u,
      TEST_DATABASE_URL: u,
      MRT_TEST_DATABASE_URL: u,
      MRT_TEST_RUN_ID: "a".repeat(24),
      HUSTLEN_SETTINGS_CANDIDATE: "owned-display-only",
      HUSTLEN_SETTINGS_ORIGIN: "http://localhost:4321",
      HUSTLEN_SETTINGS_ADMIN_IDS: "1",
    };
  assert.equal(settingsConfig(env).adminIds[0], 1);
  for (const patch of [
    { NODE_ENV: "production" },
    {
      HUSTLEN_SETTINGS_ADMIN_IDS: undefined,
      HUSTLEN_ANNOUNCEMENT_ADMIN_IDS: "1",
    },
    {
      HUSTLEN_SETTINGS_ORIGIN: undefined,
      HUSTLEN_ANNOUNCEMENT_ORIGIN: "http://localhost:4321",
    },
    {
      HUSTLEN_SETTINGS_CANDIDATE: undefined,
      HUSTLEN_ANNOUNCEMENT_CANDIDATE: "owned-informational-only",
    },
    { PGHOST: "foreign" },
  ])
    assert.throws(() => settingsConfig({ ...env, ...patch }));
  for (const suffix of [
    "?host=foreign",
    "?dbname=application",
    "?options=-csearch_path=private",
  ]) {
    const value = u + suffix;
    assert.throws(() =>
      settingsConfig({
        ...env,
        DATABASE_URL: value,
        TEST_DATABASE_URL: value,
        MRT_TEST_DATABASE_URL: value,
      }),
    );
  }
});
