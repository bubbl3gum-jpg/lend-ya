import { test } from "node:test";
import assert from "node:assert/strict";
import { supportCommand } from "../lib/support-staff-candidate/commands";
import { supportStaffConfig } from "../lib/support-staff-candidate/config";
const id = "00000000-0000-4000-8000-000000000001";
test("Support candidate closed capabilities reject browser authority and unknown operations", () => {
  for (const action of [
    "assign",
    "activate",
    "close",
    "custody.override",
    "sanction",
    "recover",
    "ai.reply",
    "__proto__",
  ])
    assert.throws(() => supportCommand({ action }, "staff"));
  for (const claims of [
    { role: "SUPPORT" },
    { personId: id },
    { assignmentId: id },
    { assurance: true },
    { risk: "LOW" },
  ])
    assert.throws(() =>
      supportCommand(
        { action: "read", ticketId: id, channelId: id, ...claims },
        "staff",
      ),
    );
  assert.throws(() =>
    supportCommand(
      {
        action: "reply",
        ticketId: id,
        channelId: id,
        content: "x",
        requestKey: id,
      },
      "requester",
    ),
  );
  assert.throws(() =>
    supportCommand({ action: "login", email: "x", password: "x" }, "staff"),
  );
});
test("Support content, selector and cursor contracts remain bounded", () => {
  const b = {
    action: "reply",
    ticketId: id,
    channelId: id,
    content: " Text ",
    requestKey: id,
  };
  assert.equal(supportCommand(b, "staff").content, "Text");
  for (const overrides of [
    { content: "" },
    { content: "x".repeat(2001) },
    { authorId: 1 },
    { channelId: "bad" },
    { requestKey: "bad" },
  ])
    assert.throws(() => supportCommand({ ...b, ...overrides }, "staff"));
  for (const after of [-1, 2147483648, "0", Infinity])
    assert.throws(() =>
      supportCommand(
        { action: "read", ticketId: id, channelId: id, after },
        "staff",
      ),
    );
});
test("Support candidate cannot enable production, remote targets or PostgreSQL overrides", () => {
  const env = {
    NODE_ENV: "development",
    HUSTLEN_SUPPORT_STAFF_CANDIDATE: "owned-synthetic-only",
    MRT_TEST_RUN_ID: "a".repeat(24),
    DATABASE_URL: "postgresql://localhost:55433/hustlen_test_8d",
    TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_8d",
    MRT_TEST_DATABASE_URL: "postgresql://localhost:55433/hustlen_test_8d",
    HUSTLEN_SUPPORT_STAFF_ORIGIN: "http://localhost:3456",
  };
  assert.equal(
    supportStaffConfig(env).origin,
    env.HUSTLEN_SUPPORT_STAFF_ORIGIN,
  );
  for (const override of [
    { NODE_ENV: "production" },
    { HUSTLEN_SUPPORT_STAFF_CANDIDATE: "" },
    { HUSTLEN_SUPPORT_STAFF_ORIGIN: "https://localhost:3456" },
    { PGOPTIONS: "-h evil.invalid" },
    { PGDATABASE: "production" },
    { TEST_DATABASE_URL: "postgresql://localhost:55433/existing" },
  ])
    assert.throws(() => supportStaffConfig({ ...env, ...override }));
});
