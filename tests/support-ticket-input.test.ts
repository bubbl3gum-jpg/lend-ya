import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketInput } from "../lib/support/input";
import { supportCandidateConfig } from "../lib/support/config";
const body = {
  categoryCode: "ACCOUNT_HELP",
  subject: "Help",
  description: "Own request",
  requestKey: "00000000-0000-4000-8000-000000000001",
};
test("ticket candidate strictly validates text, category, idempotency and one typed link", () => {
  assert.equal(ticketInput(body).subject, "Help");
  for (const extra of [
    { requesterUserId: 1 },
    { actor: 1 },
    { role: "ADMIN" },
    { currentState: "CLOSED" },
    { categoryCode: "OTHER" },
    { subject: " " },
    { subject: "x".repeat(121) },
    { description: "x".repeat(2001) },
    { bookingId: 0 },
    { bookingId: 1, listingId: 1 },
    { requestKey: "forged" },
  ])
    assert.throws(() => ticketInput({ ...body, ...extra }));
});
test("candidate cannot operate with production, inherited connection overrides or unapproved live defaults", () => {
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
  };
  assert.equal(supportCandidateConfig(env).limit, 2);
  for (const change of [
    { NODE_ENV: "production" },
    { HUSTLEN_SUPPORT_TICKET_CANDIDATE: "" },
    { PGOPTIONS: "-h evil.invalid" },
    { HUSTLEN_SUPPORT_TICKET_TEST_LIMIT: "" },
    { HUSTLEN_SUPPORT_TICKET_REQUESTER_IDS: "" },
    { HUSTLEN_SUPPORT_TICKET_ORIGIN: "https://production.invalid" },
    { DATABASE_URL: "postgresql://localhost/application" },
  ])
    assert.throws(() => supportCandidateConfig({ ...env, ...change }));
});
