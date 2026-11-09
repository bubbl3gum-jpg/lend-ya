import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { launchBrowser } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { verifyApplicationDatabase } from "./support/application-database";
import { readEmailConfig } from "../lib/email/config";
import { decryptEmail } from "../lib/email/crypto";
import { emailWorkerHeartbeat, processNextEmail, purgeExpiredEmails } from "../lib/email/worker";
import { queueRecoveryRequest, emailDeliveryAvailable } from "../lib/email/outbox";
import { sendWithResend } from "../lib/email/resend";
import { verifyPassword } from "../lib/password";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const accepted = async () => ({ outcome: "accepted" as const, providerId: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });

async function main() {
  const connection = await connectTestDatabase();
  const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const second = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const browser = await launchBrowser().catch(async (error) => {
    await Promise.all([connection.end(), database.$disconnect(), second.$disconnect()]);
    throw error;
  });
  const config = readEmailConfig()!;
  assert.equal(config.apiKey, "not-a-real-api-key");
  const baseURL = process.env.MRT_TEST_URL!;
  const client = await browser.newContext({ baseURL });
  const otherSession = await browser.newContext({ baseURL });
  const email = config.testRecipient!;
  const checks: string[] = [];
  const artifacts = process.env.MRT_TEST_ARTIFACT_DIR!;
  async function requestRecovery(value = email) {
    return client.request.post("/api/auth/forgot-password", {
      data: { email: value }, headers: { "x-forwarded-for": "198.51.100.99", "x-real-ip": "203.0.113.99" },
    });
  }
  async function jobForUser(userId: number) {
    return database.emailOutbox.findFirstOrThrow({ where: { userId, kind: "RECOVERY" }, orderBy: { createdAt: "desc" } });
  }
  async function allowResend() {
    await database.passwordRecoveryRequest.updateMany({ where: { emailHash: sha(`email:${email}`) }, data: { createdAt: new Date(Date.now() - 61_000) } });
  }
  async function clearPause() {
    await database.emailDeliveryHealth.update({ where: { id: "resend" }, data: { pausedUntil: null } });
  }
  try {
    await verifyApplicationDatabase(browser, database, baseURL, process.env.MRT_TEST_RUN_ID!);
    const registered = await client.request.post("/api/auth/register", { data: { name: "Delivery owner", email, password: "OriginalPassword1" } });
    assert.equal(registered.status(), 201);
    const user = (await registered.json()).user;
    assert.equal((await otherSession.request.post("/api/auth/login", { data: { email, password: "OriginalPassword1" } })).status(), 200);
    const originalHash = (await database.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash;
    const offlineKnown = await requestRecovery(), offlineUnknown = await requestRecovery("absent@example.test");
    assert.equal(offlineKnown.status(), 503);
    assert.equal(offlineUnknown.status(), 503);
    assert.deepEqual(await offlineKnown.json(), await offlineUnknown.json());
    assert.equal(await database.passwordRecovery.count(), 0);
    await emailWorkerHeartbeat(database);
    assert.equal(await emailDeliveryAvailable(database), true);
    const valid = await requestRecovery(), unknown = await requestRecovery("absent@example.test"), throttled = await requestRecovery();
    assert.equal(valid.status(), 202);
    assert.equal(unknown.status(), 202);
    assert.equal(throttled.status(), 202);
    assert.deepEqual(await valid.json(), await unknown.json());
    assert.deepEqual(await unknown.json(), await throttled.json());
    assert.equal(valid.headers()["cache-control"], "no-store");
    const first = await jobForUser(user.id);
    const recovery = await database.passwordRecovery.findUniqueOrThrow({ where: { userId: user.id } });
    const message = decryptEmail(first.encryptedPayload!, config.encryptionKey, first.id);
    const token = /#token=([A-Za-z0-9_-]+)/.exec(message.text)![1];
    assert.equal(sha(token), recovery.tokenHash);
    assert.equal(first.recoveryTokenHash, recovery.tokenHash);
    assert.equal(first.expiresAt.getTime(), recovery.expiresAt.getTime());
    assert.equal(first.encryptedPayload!.includes(token), false);
    assert.equal(first.encryptedPayload!.includes(email), false);
    assert.equal((await database.passwordRecoveryRequest.findFirstOrThrow()).ipHash, sha("ip:127.0.0.1"));
    assert.equal(await database.emailOutbox.count(), 1);
    checks.push("Offline delivery fails equally for all addresses; healthy requests/unknown accounts/throttles share a neutral 202; trusted local bucket ignores spoofed IP headers; queued link is encrypted and matches hashed token");

    // Verify the new migration against a populated old schema without touching shared data.
    const migration = "20261109100000_recovery_email_outbox";
    await connection.query("CREATE SCHEMA email_legacy; SET search_path TO email_legacy");
    try {
      for (const name of (await readdir("prisma/migrations")).filter((name) => /^\d/.test(name) && name !== migration).sort()) {
        await connection.query(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
      }
      for (const table of ["User", "AuthSession", "PasswordRecovery", "PasswordRecoveryRequest"]) {
        await connection.query(`INSERT INTO email_legacy."${table}" SELECT (json_populate_record(NULL::email_legacy."${table}", row_to_json(source))).* FROM public."${table}" source`);
      }
      const before = (await connection.query('SELECT row_to_json(u) AS record FROM "User" u ORDER BY id')).rows;
      const tokensBefore = (await connection.query('SELECT * FROM "PasswordRecovery" ORDER BY "userId"')).rows;
      await connection.query(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
      assert.deepEqual((await connection.query('SELECT row_to_json(u) AS record FROM "User" u ORDER BY id')).rows, before);
      assert.deepEqual((await connection.query('SELECT * FROM "PasswordRecovery" ORDER BY "userId"')).rows, tokensBefore);
    } finally { await connection.query("SET search_path TO public"); }
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code", "--config", "prisma7.config.ts"], { env: process.env, stdio: "pipe" });
    checks.push("Fresh migrations and populated forward upgrade preserve account and existing recovery data; schema diff is empty");

    await mkdir(path.join(artifacts, "email-previews"), { recursive: true });
    await writeFile(path.join(artifacts, "email-previews", "recovery.html"), message.html.replaceAll(token, "preview-not-a-real-token"));
    const preview = await browser.newPage({ viewport: { width: 700, height: 1000 } });
    await preview.setContent(message.html.replaceAll(token, "preview-not-a-real-token"));
    assert.equal(await preview.getByRole("heading", { level: 1 }).textContent(), "A fresh start, securely.");
    await preview.screenshot({ path: path.join(artifacts, "email-previews", "recovery-desktop.png"), fullPage: true });
    await preview.setViewportSize({ width: 375, height: 900 });
    assert.equal(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await preview.screenshot({ path: path.join(artifacts, "email-previews", "recovery-mobile.png"), fullPage: true });
    checks.push("Branded HTML preview rendered in Chromium at desktop and mobile sizes without horizontal overflow");

    const attempts: { id: string; body: string }[] = [];
    const fakeResend: typeof sendWithResend = async (key, id, mail) => sendWithResend(key, id, mail, async (_url, init) => {
      attempts.push({ id: new Headers(init!.headers).get("Idempotency-Key")!, body: String(init!.body) });
      return attempts.length === 1 ? Response.json({ name: "service_unavailable", message: "private error" }, { status: 503 })
        : Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
    });
    assert.equal(await processNextEmail(database, config, fakeResend), "retry");
    const retried = await database.emailOutbox.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(retried.status, "PENDING");
    assert.ok(retried.encryptedPayload);
    assert.equal(retried.attempts, 1);
    assert.ok(retried.nextAttemptAt.getTime() > Date.now());
    assert.equal((await requestRecovery()).status(), 503);
    assert.equal((await requestRecovery("absent-again@example.test")).status(), 503);
    await clearPause();
    await database.emailOutbox.update({ where: { id: first.id }, data: { nextAttemptAt: new Date(0) } });
    assert.equal(await processNextEmail(second, config, fakeResend), "accepted");
    assert.deepEqual(attempts[0], attempts[1]);
    const acceptedJob = await database.emailOutbox.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(acceptedJob.encryptedPayload, null);
    assert.equal(acceptedJob.attempts, 2);
    assert.equal(acceptedJob.status, "ACCEPTED");
    checks.push("Temporary provider outage pauses all requests uniformly; retry survives a separate DB client and reuses identical payload/idempotency key; acceptance purges payload without claiming inbox delivery");

    await allowResend();
    assert.equal((await requestRecovery()).status(), 202);
    const rejected = await jobForUser(user.id);
    assert.equal(await processNextEmail(database, config, async () => ({ outcome: "permanent", code: "PROVIDER_REJECTED" })), "failed");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: rejected.id } })).encryptedPayload, null);
    assert.equal(await emailDeliveryAvailable(database), true);
    assert.equal((await database.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, originalHash);
    assert.equal(await database.authSession.count({ where: { userId: user.id } }), 2);
    checks.push("Permanent recipient failure is not retried, purges content, does not reveal account status or change passwords/sessions");

    await allowResend();
    await requestRecovery();
    const superseded = await jobForUser(user.id);
    await allowResend();
    await requestRecovery();
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: superseded.id } })).status, "CANCELLED");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: superseded.id } })).encryptedPayload, null);
    const resetJob = await jobForUser(user.id);
    const resetMessage = decryptEmail(resetJob.encryptedPayload!, config.encryptionKey, resetJob.id);
    const resetToken = /#token=([A-Za-z0-9_-]+)/.exec(resetMessage.text)![1];

    // Outbox persistence is part of reset, not an unreliable after-response callback.
    await connection.query(`CREATE FUNCTION email_test_reject_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind = 'PASSWORD_CHANGED' THEN RAISE EXCEPTION 'notification persistence test'; END IF; RETURN NEW; END $$`);
    await connection.query('CREATE TRIGGER email_test_reject_notification BEFORE INSERT ON "EmailOutbox" FOR EACH ROW EXECUTE FUNCTION email_test_reject_notification()');
    const resetBody = { token: resetToken, password: "ChangedPassword2", confirmPassword: "ChangedPassword2" };
    try {
      assert.equal((await client.request.post("/api/auth/reset-password", { data: resetBody })).status(), 500);
      assert.equal((await database.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, originalHash);
      assert.equal(await database.authSession.count({ where: { userId: user.id } }), 2);
      assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: resetJob.id } })).status, "PENDING");
    } finally {
      await connection.query('DROP TRIGGER email_test_reject_notification ON "EmailOutbox"');
      await connection.query('DROP FUNCTION email_test_reject_notification()');
    }
    assert.equal((await client.request.post("/api/auth/reset-password", { data: resetBody })).status(), 200);
    assert.equal((await otherSession.request.get("/api/auth/me")).status(), 401);
    const notification = await database.emailOutbox.findFirstOrThrow({ where: { userId: user.id, kind: "PASSWORD_CHANGED" } });
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: resetJob.id } })).status, "CANCELLED");
    assert.equal(await database.passwordRecovery.count({ where: { userId: user.id } }), 0);
    const noticeMessage = decryptEmail(notification.encryptedPayload!, config.encryptionKey, notification.id);
    await writeFile(path.join(artifacts, "email-previews", "password-changed.html"), noticeMessage.html);
    await preview.setContent(noticeMessage.html);
    await preview.screenshot({ path: path.join(artifacts, "email-previews", "password-changed-mobile.png"), fullPage: true });
    assert.equal(await processNextEmail(database, config, async () => ({ outcome: "temporary", code: "PROVIDER_BUSY" })), "retry");
    assert.equal(await verifyPassword("ChangedPassword2", (await database.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash), true);
    await database.emailOutbox.update({ where: { id: notification.id }, data: { nextAttemptAt: new Date(0) } });
    await processNextEmail(second, config, accepted);
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: notification.id } })).status, "ACCEPTED");
    checks.push("Reset/notification enqueue are atomic under injected persistence failure; successful reset cancels pending recovery mail and revokes sessions; notification delivery failure never reverses the reset");

    // Fresh requests for subsequent independent worker cases use an owned fixture and one-hour-old quota.
    async function freshJob() {
      await database.passwordRecoveryRequest.updateMany({ data: { createdAt: new Date(Date.now() - 3_600_001) } });
      await queueRecoveryRequest(database, config, { email, ipAddress: "127.0.0.1" });
      return jobForUser(user.id);
    }
    const leased = await freshJob();
    // Simulate death after the durable lease and provider acceptance but before acknowledgement.
    await database.emailOutbox.update({ where: { id: leased.id }, data: {
      status: "PROCESSING", attempts: 1, leaseToken: "dead-worker", leaseUntil: new Date(Date.now() - 1),
    } });
    let leaseSendCount = 0;
    const outcomes = await Promise.all([
      processNextEmail(database, config, async () => { leaseSendCount++; return accepted(); }),
      processNextEmail(second, config, async () => { leaseSendCount++; return accepted(); }),
    ]);
    assert.equal(outcomes.filter((result) => result === "accepted").length, 1);
    assert.equal(leaseSendCount, 1);
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: leased.id } })).attempts, 2);
    checks.push("Expired worker leases are recoverable; competing workers claim/send a pending job only once");

    const ambiguous = await freshJob();
    let providerSubmissions = 0, providerDeliveries = 0;
    const deduplicated = new Set<string>();
    const lostAcknowledgement: typeof sendWithResend = async (key, id, mail) => sendWithResend(key, id, mail, async (_url, init) => {
      const identity = new Headers(init!.headers).get("Idempotency-Key")!;
      providerSubmissions++;
      if (!deduplicated.has(identity)) { deduplicated.add(identity); providerDeliveries++; }
      if (providerSubmissions === 1) throw new Error("Connection lost after provider acceptance.");
      return Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });
    });
    assert.equal(await processNextEmail(database, config, lostAcknowledgement), "retry");
    await clearPause();
    await database.emailOutbox.update({ where: { id: ambiguous.id }, data: { nextAttemptAt: new Date(0) } });
    assert.equal(await processNextEmail(second, config, lostAcknowledgement), "accepted");
    assert.equal(providerSubmissions, 2);
    assert.equal(providerDeliveries, 1);
    checks.push("A simulated lost provider acknowledgement retries with the original idempotency key and does not create a second provider delivery");

    const exhausted = await freshJob();
    await database.emailOutbox.update({ where: { id: exhausted.id }, data: { attempts: 7 } });
    assert.equal(await processNextEmail(database, config, async () => ({ outcome: "temporary", code: "PROVIDER_BUSY" })), "failed");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: exhausted.id } })).lastErrorCode, "RETRY_EXHAUSTED");
    const deadline = await freshJob();
    assert.equal(await processNextEmail(database, config, async () => ({ outcome: "temporary", code: "PROVIDER_BUSY", retryAfterMs: 3_600_000 })), "cancelled");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: deadline.id } })).lastErrorCode, "RETRY_DEADLINE");
    checks.push("Retries stop at eight attempts and respect provider Retry-After without extending link expiry");

    const corrupt = await freshJob();
    await database.emailOutbox.update({ where: { id: corrupt.id }, data: { encryptedPayload: "corrupted" } });
    let prohibitedSends = 0;
    const mustNotSend = async () => { prohibitedSends++; return accepted(); };
    assert.equal(await processNextEmail(database, config, mustNotSend), "failed");
    const expired = await freshJob();
    await database.emailOutbox.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    await purgeExpiredEmails(database);
    await processNextEmail(database, config, mustNotSend);
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: expired.id } })).encryptedPayload, null);
    const changedCredential = await freshJob();
    await database.passwordRecovery.deleteMany({ where: { userId: user.id } });
    assert.equal(await processNextEmail(database, config, mustNotSend), "cancelled");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: changedCredential.id } })).encryptedPayload, null);
    assert.equal(prohibitedSends, 0);
    checks.push("Corrupt, expired, consumed and superseded credentials are never sent by later worker attempts; ciphertext is purged");

    const restricted = await freshJob();
    assert.equal(await processNextEmail(database, { ...config, testRecipient: "another@example.test" }, mustNotSend), "cancelled");
    assert.equal((await database.emailOutbox.findUniqueOrThrow({ where: { id: restricted.id } })).encryptedPayload, null);
    assert.equal(prohibitedSends, 0);
    await database.emailDeliveryHealth.update({ where: { id: "resend" }, data: { heartbeatAt: new Date(Date.now() - 31_000) } });
    assert.equal((await requestRecovery()).status(), 503);
    checks.push("Test mode never redirects or sends account email to an unapproved recipient; stale worker heartbeat closes public requests");

    const report = { passed: true, realEmailsSent: 0, checks };
    await writeFile(path.join(artifacts, "email-validation.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await Promise.all([connection.end(), database.$disconnect(), second.$disconnect()]);
  }
}

main().catch((error) => {
  // Do not print assertion objects that could contain decrypted email credentials.
  console.error(error instanceof Error ? `Email integration failed: ${error.message.split("\n")[0]}` : "Email integration failed.");
  process.exitCode = 1;
});
