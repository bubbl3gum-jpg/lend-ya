import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { parseCommand, displayState } from "../lib/announcements/input";
import { announcementConfig } from "../lib/announcements/config";
test("announcement command contract rejects markup, forged authority, invalid selectors and windows", () => {
  const c = {
    action: "CREATE",
    requestId: randomUUID(),
    title: "Routine fixture",
    body: "Plain text & punctuation",
  };
  assert.equal(parseCommand(c).action, "CREATE");
  for (const patch of [
    { role: "ADMIN" },
    { risk: "LOW" },
    { audience: "PUBLIC" },
    { id: randomUUID() },
    { title: "<img src=x>" },
    { body: "\u0000" },
    { body: "x".repeat(4001) },
    { action: "EMERGENCY" },
    { action: ["CREATE"] },
    { requestId: "bad" },
  ])
    assert.throws(() => parseCommand({ ...c, ...patch }));
  const p = {
    action: "PUBLISH",
    requestId: randomUUID(),
    id: randomUUID(),
    version: 1,
    startsAt: "2026-10-26T00:00:00Z",
    expiresAt: "2026-10-27T00:00:00Z",
  };
  assert.equal(parseCommand(p).action, "PUBLISH");
  for (const patch of [
    { version: 0 },
    { startsAt: "0000-01-01T00:00:00Z" },
    { startsAt: "2026-02-30T00:00:00Z" },
    { startsAt: "2026-10-26T08:00" },
    { expiresAt: p.startsAt },
    { expiresAt: "2027-01-01T00:00:00Z" },
  ])
    assert.throws(() => parseCommand({ ...p, ...patch }));
});
test("half-open schedule boundary states", () => {
  const startsAt = new Date(1000),
    expiresAt = new Date(2000),
    r = { state: "PUBLISHED", startsAt, expiresAt };
  assert.equal(displayState(r, new Date(999)), "SCHEDULED");
  assert.equal(displayState(r, startsAt), "ACTIVE");
  assert.equal(displayState(r, expiresAt), "EXPIRED");
  assert.equal(displayState({ ...r, state: "DRAFT" }, startsAt), "DRAFT");
});
test("announcement gate fails closed including production with accidental flags and connection overrides", () => {
  const env = {
    NODE_ENV: "development",
    HUSTLEN_ANNOUNCEMENT_CANDIDATE: "owned-informational-only",
    MRT_TEST_RUN_ID: "a".repeat(24),
    DATABASE_URL:
      "postgresql://fixture:fixture@localhost:5432/hustlen_test_unit",
    TEST_DATABASE_URL:
      "postgresql://fixture:fixture@localhost:5432/hustlen_test_unit",
    MRT_TEST_DATABASE_URL:
      "postgresql://fixture:fixture@localhost:5432/hustlen_test_unit",
    HUSTLEN_ANNOUNCEMENT_ORIGIN: "http://localhost:4321",
    HUSTLEN_ANNOUNCEMENT_ADMIN_IDS: "1",
  };
  assert.equal(announcementConfig(env).adminIds[0], 1);
  for (const patch of [
    { NODE_ENV: "production" },
    { DATABASE_URL: "postgresql://fixture@localhost:5432/app" },
    { HUSTLEN_ANNOUNCEMENT_ORIGIN: "https://localhost:4321" },
    { HUSTLEN_ANNOUNCEMENT_ADMIN_IDS: "1,ALL" },
    { PGHOST: "foreign" },
  ])
    assert.throws(() => announcementConfig({ ...env, ...patch }));
  for (const suffix of [
    "?host=foreign",
    "?dbname=production",
    "?options=-csearch_path=other",
  ]) {
    const u = env.DATABASE_URL + suffix;
    assert.throws(() =>
      announcementConfig({
        ...env,
        DATABASE_URL: u,
        TEST_DATABASE_URL: u,
        MRT_TEST_DATABASE_URL: u,
      }),
    );
  }
});
