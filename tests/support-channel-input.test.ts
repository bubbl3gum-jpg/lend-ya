import { test } from "node:test";
import assert from "node:assert/strict";
import {
  channelMessageInput,
  messageCursor,
} from "../lib/support/channel-input";
import { channelCandidateConfig } from "../lib/support/channel-config";
const body = {
  content: "Own test message",
  requestKey: "00000000-0000-4000-8000-000000000001",
};
test("requester messages have fixed fields and bounded content/cursor, never identity or staff claims", () => {
  assert.equal(channelMessageInput(body).content, body.content);
  for (const extra of [
    { authorUserId: 1 },
    { role: "ADMIN" },
    { ticketId: "forged" },
    { assignedTo: 1 },
    { permission: true },
    { content: "" },
    { content: "x".repeat(2001) },
    { requestKey: "bad" },
  ])
    assert.throws(() => channelMessageInput({ ...body, ...extra }));
  for (const q of [
    "after=-1",
    "after=1&after=2",
    "actorId=1",
    "channelId=forged",
    "after=2147483648",
  ])
    assert.throws(() => messageCursor(new URLSearchParams(q)));
  assert.equal(messageCursor(new URLSearchParams()), 0);
});
test("channel flag cannot bypass production or base ticket ownership config", () => {
  const env = {
    NODE_ENV: "development",
    HUSTLEN_SUPPORT_TICKET_CANDIDATE: "owned-development-only",
    MRT_TEST_RUN_ID: "a".repeat(24),
    DATABASE_URL: "postgresql://localhost:5432/hustlen_test_candidate",
    TEST_DATABASE_URL: "postgresql://localhost:5432/hustlen_test_candidate",
    MRT_TEST_DATABASE_URL: "postgresql://localhost:5432/hustlen_test_candidate",
    HUSTLEN_SUPPORT_TICKET_ORIGIN: "http://localhost:3333",
    HUSTLEN_SUPPORT_TICKET_TEST_LIMIT: "2",
    HUSTLEN_SUPPORT_TICKET_REQUESTER_IDS: "1,2",
    HUSTLEN_SUPPORT_CHANNEL_CANDIDATE: "owned-requester-only",
    HUSTLEN_SUPPORT_CHANNEL_TEST_LIMIT: "20",
  };
  assert.equal(channelCandidateConfig(env).messageLimit, 20);
  for (const v of [
    { NODE_ENV: "production" },
    { HUSTLEN_SUPPORT_CHANNEL_CANDIDATE: "" },
    { HUSTLEN_SUPPORT_TICKET_CANDIDATE: "" },
    { HUSTLEN_SUPPORT_CHANNEL_TEST_LIMIT: "101" },
    { PGOPTIONS: "-h evil.invalid" },
  ])
    assert.throws(() => channelCandidateConfig({ ...env, ...v }));
});
