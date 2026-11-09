import "dotenv/config";
import { utcPostgresUrl } from "../lib/postgres-utc";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { APIRequestContext } from "playwright";
import { launchBrowser } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { verifyApplicationDatabase } from "./support/application-database";
import { hashPassword, verifyPassword } from "../lib/password";
import { preparePasswordRecovery, resetRecoveredPassword, recoveryLifetimeMs } from "../lib/password-recovery";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const emailHash = (email: string) => sha(`email:${email}`);
const oldPassword = "OriginalPassword1", newPassword = "NewPassword2";

async function main() {
  const connection = await connectTestDatabase(); // Explicit ownership check before all fixtures.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: utcPostgresUrl(process.env.DATABASE_URL!) }) });
  const second = new PrismaClient({ adapter: new PrismaPg({ connectionString: utcPostgresUrl(process.env.DATABASE_URL!) }) });
  const browser = await launchBrowser().catch(async (error) => {
    await Promise.all([prisma.$disconnect(), second.$disconnect(), connection.end()]);
    throw error;
  });
  const baseURL = process.env.MRT_TEST_URL!;
  const checks: string[] = [];
  const context = () => browser.newContext({ baseURL });
  const owner = await context(), anotherSession = await context(), stranger = await context();
  async function register(client: APIRequestContext, email: string) {
    const response = await client.post("/api/auth/register", {
      data: { name: "Recovery test", email, password: oldPassword },
    });
    assert.equal(response.status(), 201);
    return (await response.json()).user as { id: number; email: string };
  }
  async function ageCooldown(email: string) {
    await prisma.passwordRecoveryRequest.updateMany({
      where: { emailHash: emailHash(email) },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
  }
  async function issue(email: string, ipAddress = "192.0.2.1") {
    const issued = await preparePasswordRecovery(prisma, { email, ipAddress });
    assert.ok(issued, "Expected a recovery credential for this owned fixture.");
    return issued;
  }
  async function waitingForQuery(part: string) {
    for (let attempt = 0; attempt < 150; attempt++) {
      // This observer may own the blocking transaction; refresh its statistics snapshot.
      await connection.query("SELECT pg_stat_clear_snapshot()");
      const { rows } = await connection.query(
        "SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND position($1 in query)>0",
        [part],
      );
      if (rows.length) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Concurrency test never reached the expected account lock.");
  }
  try {
    await verifyApplicationDatabase(browser, prisma, baseURL, process.env.MRT_TEST_RUN_ID!);
    const user = await register(owner.request, "recovery-owner@example.test");
    const unrelated = await register(stranger.request, "recovery-other@example.test");
    assert.equal((await anotherSession.request.post("/api/auth/login", {
      data: { email: user.email, password: oldPassword },
    })).status(), 200);
    await prisma.user.update({ where: { id: user.id }, data: {
      identityVerified: true, verificationStatus: "VERIFIED", trustScore: 92,
    } });
    const listing = await prisma.listing.create({ data: {
      ownerId: user.id, title: "Preserved item", description: "Existing rental listing",
      category: "Cameras", price: 50, condition: "Good",
    } });
    const station = await prisma.mrtStation.findFirstOrThrow();
    const booking = await prisma.booking.create({ data: {
      ownerId: user.id, renterId: unrelated.id, listingId: listing.id,
      meetingStationId: station.id, startAt: new Date("2026-10-01"), endAt: new Date("2026-10-02"),
      status: "COMPLETED", totalPrice: 50,
    } });
    await prisma.handoff.create({ data: {
      bookingId: booking.id, performedBy: user.id, confirmedBy: unrelated.id,
      confirmedAt: new Date(), conditionConfirmed: true,
    } });
    await prisma.return.create({ data: {
      bookingId: booking.id, initiatedBy: unrelated.id, confirmedBy: user.id,
      confirmedAt: new Date(), conditionConfirmed: true,
    } });
    await prisma.verifiedReview.create({ data: {
      bookingId: booking.id, authorId: unrelated.id, subjectId: user.id, rating: 5, comment: "Existing review",
    } });
    const profileBefore = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    async function rentalSnapshot() {
      return JSON.stringify({
        listings: await prisma.listing.findMany(), bookings: await prisma.booking.findMany(),
        reviews: await prisma.verifiedReview.findMany(), stations: await prisma.mrtStation.findMany(),
        handoffs: await prisma.handoff.findMany(), returns: await prisma.return.findMany(),
      });
    }
    const rentalsBefore = await rentalSnapshot();

    execFileSync(process.execPath, [
      "node_modules/prisma/build/index.js", "migrate", "diff", "--from-config-datasource",
      "--to-schema", "prisma/schema.prisma", "--exit-code", "--config", "prisma7.config.ts",
    ], { env: process.env, stdio: "pipe" });
    checks.push("Fresh migration chain agrees with the integrated Prisma schema; populated upgrades are exercised by test:recovery-migration");

    const first = await issue(`  ${user.email.toUpperCase()}  `);
    const stored = await prisma.passwordRecovery.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(stored.tokenHash, sha(first.token));
    assert.notEqual(stored.tokenHash.length, first.token.length);
    assert.equal(stored.expiresAt.getTime() - stored.createdAt.getTime(), recoveryLifetimeMs);
    assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 2);
    assert.equal(await preparePasswordRecovery(second, { email: user.email, ipAddress: "192.0.2.2" }), null);
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { emailHash: emailHash(user.email) } }), 1);
    checks.push("256-bit token stored only as a hash; exact 30-minute expiry; requests preserve password/sessions; cooldown persists across clients");

    assert.equal((await owner.request.get("/api/auth/reset-password")).status(), 405);
    const resetData = { token: first.token, password: newPassword, confirmPassword: newPassword };
    for (const data of [null, [], { ...resetData, password: "lowercase1", confirmPassword: "lowercase1" },
      { ...resetData, confirmPassword: "DifferentPassword3" }, { ...resetData, token: "malformed" },
      { ...resetData, token: randomBytes(32).toString("base64url") }]) {
      assert.equal((await owner.request.post("/api/auth/reset-password", { data })).status(), 400);
    }
    assert.equal(await prisma.passwordRecovery.count({ where: { userId: user.id } }), 1);
    assert.equal((await owner.request.get("/api/auth/me")).status(), 200);
    checks.push("GET cannot consume credentials; malformed, missing, unknown-token, weak-password and confirmation errors leave account and token intact");

    await prisma.passwordRecovery.update({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    assert.equal((await owner.request.post("/api/auth/reset-password", { data: resetData })).status(), 400);
    assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 2);
    await ageCooldown(user.email);
    const latest = await issue(user.email);
    assert.equal(await resetRecoveredPassword(prisma, first.token, newPassword), null);
    checks.push("Expired and superseded links cannot reset passwords or revoke sessions");

    // A failure after consuming the token/password update must roll back all three operations.
    const beforeFailure = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await connection.query(`CREATE FUNCTION recovery_test_reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."userId" = ${user.id} THEN RAISE EXCEPTION 'recovery rollback test'; END IF; RETURN OLD; END $$`);
    await connection.query('CREATE TRIGGER recovery_test_reject_delete BEFORE DELETE ON "AuthSession" FOR EACH ROW EXECUTE FUNCTION recovery_test_reject_delete()');
    try {
      await assert.rejects(resetRecoveredPassword(prisma, latest.token, newPassword));
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, beforeFailure.passwordHash);
      assert.equal(await prisma.passwordRecovery.count({ where: { userId: user.id } }), 1);
      assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 2);
    } finally {
      await connection.query('DROP TRIGGER recovery_test_reject_delete ON "AuthSession"');
      await connection.query('DROP FUNCTION recovery_test_reject_delete()');
    }
    checks.push("Injected database failure rolls back token consumption, password update and session revocation together");

    const response = await owner.request.post("/api/auth/reset-password", {
      data: { ...resetData, token: latest.token },
    });
    assert.equal(response.status(), 200);
    assert.match(response.headers()["cache-control"], /(?:^|,\s*)no-store(?:,|$)/);
    assert.equal(response.headers()["set-cookie"]?.includes("p2p_session="), true);
    assert.equal(JSON.stringify(await response.json()).includes(latest.token), false);
    assert.equal(await prisma.authSession.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.passwordRecovery.count({ where: { userId: user.id } }), 0);
    assert.equal((await anotherSession.request.get("/api/auth/me")).status(), 401);
    assert.equal((await owner.request.get("/api/auth/me")).status(), 401);
    assert.equal((await stranger.request.get("/api/auth/me")).status(), 200);
    assert.equal((await owner.request.post("/api/auth/reset-password", {
      data: { ...resetData, token: latest.token },
    })).status(), 400);
    assert.equal((await owner.request.post("/api/auth/login", { data: { email: user.email, password: oldPassword } })).status(), 401);
    assert.equal((await owner.request.post("/api/auth/login", { data: { email: user.email, password: newPassword } })).status(), 200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const { passwordHash: beforeHash, updatedAt: beforeUpdated, ...beforeProfile } = profileBefore;
    const { passwordHash: afterHash, updatedAt: afterUpdated, ...afterProfile } = after;
    assert.ok(beforeHash && beforeUpdated && afterHash && afterUpdated);
    assert.deepEqual(afterProfile, beforeProfile);
    assert.equal(await verifyPassword(newPassword, after.passwordHash), true);
    assert.equal(await rentalSnapshot(), rentalsBefore);
    checks.push("Ordinary account reset via HTTP consumes link once, clears cookie, revokes every account session, preserves unrelated sessions/profile/listings/bookings/reviews/stations; only new password logs in");

    const legacy = await prisma.user.create({ data: { name: "Legacy credential", email: "legacy-login@example.test", passwordHash: await hashPassword("legacy-only-password") } });
    assert.equal((await stranger.request.post("/api/auth/login", { data: { email: legacy.email, password: "legacy-only-password" } })).status(), 200);
    checks.push("Legacy passwords still authenticate without applying new-password policy at login");

    const concurrentEmail = "recovery-race@example.test";
    const raceUser = await prisma.user.create({ data: { name: "Race", email: concurrentEmail, passwordHash: await hashPassword(oldPassword) } });
    const concurrent = await issue(concurrentEmail, "192.0.2.30");
    const outcomes = await Promise.all([
      resetRecoveredPassword(prisma, concurrent.token, "ConcurrentOne1"),
      resetRecoveredPassword(second, concurrent.token, "ConcurrentTwo2"),
    ]);
    assert.equal(outcomes.filter(Boolean).length, 1);
    const winningHash = (await prisma.user.findUniqueOrThrow({ where: { id: raceUser.id } })).passwordHash;
    assert.equal(await verifyPassword(outcomes[0] ? "ConcurrentOne1" : "ConcurrentTwo2", winningHash), true);
    checks.push("Concurrent submissions from independent database clients produce exactly one successful reset");

    // Reset locks the account first; a login that already verified the old hash must fail afterwards.
    await prisma.user.update({ where: { id: raceUser.id }, data: { passwordHash: await hashPassword(oldPassword) } });
    await ageCooldown(concurrentEmail);
    const raceCredential = await issue(concurrentEmail, "192.0.2.30");
    const blocker = await connectTestDatabase();
    const raceLogin = await context();
    let resetting: ReturnType<typeof resetRecoveredPassword> | undefined;
    let loggingIn: ReturnType<APIRequestContext["post"]> | undefined;
    try {
      await blocker.query("BEGIN");
      await blocker.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE', [raceUser.id]);
      resetting = resetRecoveredPassword(prisma, raceCredential.token, newPassword);
      await waitingForQuery('SELECT id, email FROM "User"');
      loggingIn = raceLogin.request.post("/api/auth/login", { data: { email: concurrentEmail, password: oldPassword } });
      await waitingForQuery('pg_advisory_xact_lock(1105001');
      await blocker.query("COMMIT");
      assert.ok(await resetting);
      assert.equal((await loggingIn).status(), 401);
      assert.equal(await prisma.authSession.count({ where: { userId: raceUser.id } }), 0);
    } finally {
      await blocker.query("ROLLBACK");
      await Promise.allSettled([resetting, loggingIn]);
      await blocker.end();
      await raceLogin.close();
    }
    checks.push("Deterministic reset/login race rejects a login that verified the old password before reset committed");

    const changingAddress = await prisma.user.create({ data: {
      name: "Address race fixture", email: "address-before@example.test", passwordHash: await hashPassword(oldPassword),
    } });
    let pendingIssuance: ReturnType<typeof preparePasswordRecovery> | undefined;
    try {
      await connection.query("BEGIN");
      await connection.query("SELECT pg_advisory_xact_lock(1105001,$1)", [changingAddress.id]);
      pendingIssuance = preparePasswordRecovery(prisma, { email: changingAddress.email, ipAddress: "192.0.2.81" });
      await waitingForQuery("pg_advisory_xact_lock(1105001");
      await connection.query('UPDATE "User" SET email=$1 WHERE id=$2', ["address-after@example.test", changingAddress.id]);
      await connection.query("COMMIT");
      assert.equal(await pendingIssuance, null);
      assert.equal(await prisma.passwordRecovery.count({ where: { userId: changingAddress.id } }), 0);
    } finally {
      await connection.query("ROLLBACK");
      await Promise.allSettled([pendingIssuance]);
    }
    checks.push("Issuance rechecks the locked account address and never issues to an email changed while waiting");

    for (const kind of ["ADMIN", "REVIEWER", "STAFF"] as const) {
      const guarded = await prisma.user.create({ data: {
        name: "Excluded recovery fixture", email: `excluded-${kind.toLowerCase()}@example.test`, passwordHash: await hashPassword(oldPassword),
      } });
      const credential = await issue(guarded.email, "192.0.2.80");
      if (kind === "ADMIN") await prisma.user.update({ where: { id: guarded.id }, data: { role: "ADMIN" } });
      if (kind === "REVIEWER") await prisma.chatReviewer.create({ data: { userId: guarded.id, enabled: false } });
      if (kind === "STAFF") {
        const person = await prisma.staffPerson.create({ data: {} });
        await prisma.staffAccountAssociation.create({ data: { userId: guarded.id, personId: person.id, provenanceRef: randomUUID(), state: "PENDING" } });
      }
      await ageCooldown(guarded.email);
      assert.equal(await preparePasswordRecovery(prisma, { email: guarded.email, ipAddress: "192.0.2.80" }), null);
      assert.equal(await resetRecoveredPassword(prisma, credential.token, newPassword), null);
      assert.equal(await verifyPassword(oldPassword, (await prisma.user.findUniqueOrThrow({ where: { id: guarded.id } })).passwordHash), true);
    }
    checks.push("Administrator, staff-associated and reviewer accounts cannot obtain or consume recovery credentials, including tokens issued before elevation");

    const limitedEmail = "recovery-limits@example.test";
    const limitedUser = await prisma.user.create({ data: { name: "Limits", email: limitedEmail, passwordHash: await hashPassword(oldPassword) } });
    await issue(limitedEmail, "192.0.2.40");
    for (let i = 1; i < 5; i++) {
      await ageCooldown(limitedEmail);
      await issue(limitedEmail, `192.0.2.${40 + i}`);
    }
    await ageCooldown(limitedEmail);
    const beforeLimit = await prisma.passwordRecovery.findUniqueOrThrow({ where: { userId: limitedUser.id } });
    assert.equal(await preparePasswordRecovery(second, { email: limitedEmail.toUpperCase(), ipAddress: "192.0.2.99" }), null);
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { emailHash: emailHash(limitedEmail) } }), 5);
    assert.deepEqual(await prisma.passwordRecovery.findUniqueOrThrow({ where: { userId: limitedUser.id } }), beforeLimit);
    // Rolling windows release expired events without sleeping or changing shared/development data.
    await prisma.passwordRecoveryRequest.updateMany({ where: { emailHash: emailHash(limitedEmail) }, data: { createdAt: new Date(Date.now() - 3_600_001) } });
    await issue(limitedEmail, "192.0.2.99");
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { emailHash: emailHash(limitedEmail) } }), 1);
    checks.push("Five requests per rolling hour per normalized email across IPs; throttled requests preserve latest link; quota renews after an hour");

    for (let i = 0; i < 20; i++) {
      assert.equal(await preparePasswordRecovery(prisma, { email: `missing-${i}@example.test`, ipAddress: "2001:db8::1" }), null);
    }
    const beforeIpLimit = await prisma.passwordRecoveryRequest.count();
    assert.equal(await preparePasswordRecovery(second, { email: "missing-extra@example.test", ipAddress: "2001:0DB8:0:0:0:0:0:1" }), null);
    assert.equal(await prisma.passwordRecoveryRequest.count(), beforeIpLimit);
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { ipHash: sha("ip:2001:db8::1") } }), 20);
    checks.push("Twenty requests per rolling hour per canonical IP across emails; unknown accounts consume quota without issuing a token");

    const simultaneousEmail = "recovery-simultaneous@example.test";
    await prisma.user.create({ data: { name: "Simultaneous", email: simultaneousEmail, passwordHash: await hashPassword(oldPassword) } });
    const simultaneous = await Promise.all(Array.from({ length: 8 }, (_, i) => preparePasswordRecovery(i % 2 ? second : prisma, {
      email: simultaneousEmail, ipAddress: `198.51.100.${i + 1}`,
    })));
    assert.equal(simultaneous.filter(Boolean).length, 1);
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { emailHash: emailHash(simultaneousEmail) } }), 1);
    const ipBefore = await prisma.passwordRecoveryRequest.count({ where: { ipHash: sha("ip:203.0.113.1") } });
    await Promise.all(Array.from({ length: 24 }, (_, i) => preparePasswordRecovery(i % 2 ? second : prisma, {
      email: `missing-concurrent-${i}@example.test`, ipAddress: "203.0.113.1",
    })));
    assert.equal(await prisma.passwordRecoveryRequest.count({ where: { ipHash: sha("ip:203.0.113.1") } }) - ipBefore, 20);
    checks.push("Parallel requests cannot bypass email cooldown or shared-IP quota");

    const knownRequest = await owner.request.post("/api/auth/forgot-password", { data: { email: user.email } });
    const missingRequest = await owner.request.post("/api/auth/forgot-password", { data: { email: "absent@example.test" } });
    assert.equal(knownRequest.status(), 503);
    assert.equal(missingRequest.status(), 503);
    assert.deepEqual(await knownRequest.json(), await missingRequest.json());
    assert.equal((await owner.request.post("/api/auth/forgot-password", { data: { contact: "+886912345678" } })).status(), 400);
    const registerWeak = await owner.request.post("/api/auth/register", { data: { name: "Weak", email: "weak@example.test", password: "lowercase1" } });
    assert.equal(registerWeak.status(), 400);
    assert.equal(await prisma.user.count({ where: { email: "weak@example.test" } }), 0);
    checks.push("Unconfigured delivery returns identical honest errors for known/unknown emails; phone recovery rejected; registration enforces approved password policy");

    const report = { passed: true, checks };
    await writeFile(path.join(process.env.MRT_TEST_ARTIFACT_DIR!, "recovery-validation.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await Promise.all([prisma.$disconnect(), second.$disconnect(), connection.end()]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
