import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readEmailConfig } from "../lib/email/config";
import { encryptEmail, decryptEmail } from "../lib/email/crypto";
import { recoveryEmail, passwordChangedEmail } from "../lib/email/templates";
import { sendWithResend } from "../lib/email/resend";

const validEnv = () => ({
  RECOVERY_EMAIL_MODE: "resend-test", RESEND_API_KEY: "test-not-real",
  RECOVERY_EMAIL_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  RECOVERY_APP_ORIGIN: "http://localhost:3000", RECOVERY_EMAIL_FROM: "onboarding@resend.dev",
  RECOVERY_EMAIL_TEST_RECIPIENT: "owner@example.test",
});
const message = () => recoveryEmail("Hustlen' <onboarding@resend.dev>", "owner@example.test", "http://localhost:3000", randomBytes(32).toString("base64url"), new Date("2026-11-09T12:30:00Z"));

test("email stays disabled by default; invalid configuration fails without leaking values", () => {
  assert.equal(readEmailConfig({}), null);
  const env = validEnv();
  assert.equal(readEmailConfig(env)?.origin, "http://localhost:3000");
  assert.equal(readEmailConfig(env)?.from, "Hustlen' <onboarding@resend.dev>");
  assert.equal(readEmailConfig({ ...env, RESEND_API_KEY: "" }, false)?.apiKey, "");
  for (const overrides of [
    { RECOVERY_EMAIL_MODE: "other" }, { RESEND_API_KEY: "" }, { RECOVERY_EMAIL_ENCRYPTION_KEY: "invalid-secret" },
    { RECOVERY_APP_ORIGIN: "https://user:secret@example.com" }, { RECOVERY_APP_ORIGIN: "https://example.com/path" },
    { RECOVERY_APP_ORIGIN: "http://example.com" }, { RECOVERY_APP_ORIGIN: "https://example.com?token=secret" },
    { RECOVERY_APP_ORIGIN: "https://example.com#token=secret" }, { RECOVERY_EMAIL_TEST_RECIPIENT: "" },
    { RECOVERY_EMAIL_FROM: "User <email@example.com>" }, { RECOVERY_TRUSTED_IP_HEADER: "x-forwarded-for" },
    { RECOVERY_EMAIL_MODE: "resend-production" },
  ]) {
    assert.throws(() => readEmailConfig({ ...env, ...overrides }), { message: "Recovery email configuration is invalid." });
  }
  assert.ok(readEmailConfig({ ...env, RECOVERY_EMAIL_MODE: "resend-production", RECOVERY_APP_ORIGIN: "https://hustlen.example", RECOVERY_EMAIL_FROM: "security@hustlen.example", RECOVERY_TRUSTED_IP_HEADER: "x-real-ip" }));
});

test("email payload encryption is randomized, authenticated and bound to its job", () => {
  const key = randomBytes(32), id = randomUUID(), mail = message();
  const one = encryptEmail(mail, key, id), two = encryptEmail(mail, key, id);
  assert.notEqual(one, two);
  assert.deepEqual(decryptEmail(one, key, id), mail);
  assert.equal(one.includes(mail.to[0]), false);
  assert.equal(one.includes("#token="), false);
  for (const attempt of [
    () => decryptEmail(one, randomBytes(32), id), () => decryptEmail(one, key, randomUUID()),
    () => decryptEmail(one.slice(0, -10) + "corrupted!", key, id), () => decryptEmail("plaintext", key, id),
  ]) assert.throws(attempt, { message: "Encrypted email payload is invalid." });
});

test("Hustlen' templates include both formats, exact safe links and no remote tracking content", () => {
  const mail = message();
  assert.equal(mail.subject, "Reset your Hustlen' password");
  assert.match(mail.html, /Hustlen'/);
  assert.match(mail.text, /30 minutes/);
  assert.match(mail.text, /can be used once/);
  assert.match(mail.text, /newer link/);
  assert.match(mail.text, /Didn't request this/);
  const link = /http:\/\/localhost:3000\/reset-password#token=[A-Za-z0-9_-]+/.exec(mail.text)![0];
  assert.equal(new URL(link).search, "");
  assert.equal(new URL(link).hash.startsWith("#token="), true);
  assert.equal(mail.html.includes(link), true);
  assert.doesNotMatch(mail.html, /<img|<script|<iframe|fonts\.google|utm_/i);
  const notification = passwordChangedEmail(mail.from, mail.to[0], "https://hustlen.example", new Date("2026-11-09T12:00:00Z"));
  assert.equal(notification.subject, "Your Hustlen' password was changed");
  assert.match(notification.text, /All existing sessions were signed out/);
  assert.match(notification.text, /didn't make this change/);
  assert.doesNotMatch(notification.text, /#token=/);
});

test("Resend requests use a fixed endpoint, stable body/key and never follow redirects", async () => {
  const id = randomUUID(), mail = message();
  const calls: RequestInit[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    calls.push(init!);
    return Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
  };
  assert.equal((await sendWithResend("secret-key", id, mail, fetcher)).outcome, "accepted");
  await sendWithResend("secret-key", id, mail, fetcher);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(new Headers(calls[0].headers).get("Idempotency-Key"), `hustlen-email/${id}`);
  assert.equal(calls[0].redirect, "error");
  assert.ok(calls[0].signal);
});

test("provider errors become safe operational codes with correct retry classification", async () => {
  const id = randomUUID(), mail = message();
  for (const [status, name, outcome] of [
    [422, "validation_error", "permanent"], [403, "validation_error", "permanent"],
    [401, "missing_api_key", "unavailable"], [403, "restricted_api_key", "unavailable"],
    [429, "rate_limit_exceeded", "unavailable"], [503, "service_unavailable", "unavailable"],
    [409, "concurrent_idempotent_requests", "temporary"], [409, "invalid_idempotent_request", "permanent"],
    [408, "timeout", "temporary"],
  ] as const) {
    const result = await sendWithResend("secret-key", id, mail, async () => Response.json({ name, message: `private-recipient@example.test ${mail.text}` }, { status, headers: { "retry-after": "120" } }));
    assert.equal(result.outcome, outcome);
    assert.equal(JSON.stringify(result).includes("private-recipient"), false);
    assert.equal(JSON.stringify(result).includes("#token="), false);
    if (status === 429) assert.equal(result.retryAfterMs, 120_000);
  }
  assert.equal((await sendWithResend("key", id, mail, async () => { throw new Error("sensitive network error"); })).outcome, "unavailable");
  assert.equal((await sendWithResend("key", id, mail, async () => Response.json({ noId: true }))).outcome, "temporary");
});
