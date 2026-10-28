import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import type { Simulation } from "../lib/identity/simulation";
test("13C real sessions, isolated synthetic transitions, forged success refusal, booking challenge and bilingual browser", { timeout: 120000 }, async t => {
 const db = await connectTestDatabase(), base = process.env.TEST_BASE_URL!, art = process.env.MRT_TEST_ARTIFACT_DIR!;
 t.after(async () => { await db.end(); });
 if (process.env.NODE_ENV === "production") {
  for (const route of ["/account/identity", "/api/dev/identity"]) for (const method of ["GET", "POST"]) {
   const r = await fetch(base + route, { method, headers: { Origin: base, "Content-Type": "application/json", "X-Hustlen-Identity": "1" }, ...(method === "POST" ? { body: JSON.stringify({ verified: true, provider: "forged" }) } : {}) });
   assert.equal(r.status, 404); assert.match(r.headers.get("cache-control")!, /private, no-store/);
  }
  return;
 }
 const actors = [];
 for (const name of ["Synthetic identity owner", "Synthetic identity borrower", "Synthetic unrelated account"]) {
  const email = randomUUID() + "@fixture.test", password = "Owned-identity-13c!";
  const r = await fetch(base + "/api/auth/register", { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
  assert.equal(r.status, 201); actors.push({ id: (await r.json()).user.id, token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1], email, password });
 }
 const [owner, borrower, other] = actors;
 const read = (token?: string, query = "") => fetch(base + "/api/dev/identity" + query, { headers: token ? { Cookie: "p2p_session=" + token } : {} });
 const post = (token: string, body: unknown, overrides: Record<string, string> = {}) => fetch(base + "/api/dev/identity", { method: "POST", headers: { Cookie: "p2p_session=" + token, Origin: base, "Content-Type": "application/json", "X-Hustlen-Identity": "1", ...overrides }, body: JSON.stringify(body) });
 const dbName = (await db.query("SELECT current_database() n")).rows[0].n as string;
 assert.match(dbName, /^hustlen_test_[a-z0-9_]+$/);
 const marker = `hustlen-mrt-test:${process.env.MRT_TEST_RUN_ID}`;
 try {
  await db.query(`COMMENT ON DATABASE "${dbName}" IS 'not-this-run'`);
  assert.equal((await read(owner.token)).status, 404);
 } finally { await db.query(`COMMENT ON DATABASE "${dbName}" IS '${marker}'`); }
 assert.equal((await read()).status, 401); assert.equal((await read("invalid")).status, 401); assert.equal((await read(owner.token, "?userId=" + other.id)).status, 400);
 let s: Simulation = await (await read(owner.token)).json(); assert.equal(s.state, "NOT_STARTED");
 const begin = { action: "BEGIN", expectedVersion: 0, documentType: "TW_ARC", scenario: "SUCCESS" };
 for (const forged of [{ ...begin, verified: true }, { ...begin, userId: other.id }, { action: "CALLBACK", expectedVersion: 0, signature: "forged" }, { ...begin, image: "not-a-document" }]) assert.equal((await post(owner.token, forged)).status, 400);
 assert.equal((await post(owner.token, begin, { Origin: "https://attacker.invalid" })).status, 403);
 assert.equal((await post(owner.token, begin, { "X-Hustlen-Identity": "" })).status, 403);
 assert.equal((await post(owner.token, begin, { Origin: "" })).status, 403);
 assert.equal((await post(owner.token, { ...begin, scenario: "x".repeat(33000) })).status, 400);
 s = await (await post(owner.token, begin)).json();
 assert.equal((await post(owner.token, begin)).status, 409);
 const concurrent = await Promise.all([post(owner.token, { action: "ADVANCE", expectedVersion: s.version }), post(owner.token, { action: "ADVANCE", expectedVersion: s.version })]);
 assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
 s = await (await read(owner.token)).json();
 while (s.state === "PENDING") s = await (await post(owner.token, { action: "ADVANCE", expectedVersion: s.version })).json();
 assert.equal(s.state, "VERIFIED"); assert.equal(s.realEligibility, false);
 assert.equal((await (await read(borrower.token)).json()).state, "NOT_STARTED");
 // Every scripted outcome is exercised through real authenticated routes as well as pure boundary tests.
 for (const scenario of ["DOCUMENT_RETRY", "LIVENESS_RETRY", "MATCH_RETRY", "MANUAL_REVIEW", "REJECTED", "SUCCESS"]) {
  let b: Simulation = await (await read(borrower.token)).json();
  b = await (await post(borrower.token, { action: "BEGIN", expectedVersion: b.version, documentType: "TW_NATIONAL_ID", scenario })).json();
  while (b.state === "PENDING") b = await (await post(borrower.token, { action: "ADVANCE", expectedVersion: b.version })).json();
  assert.equal(b.state, scenario === "SUCCESS" ? "VERIFIED" : ["MANUAL_REVIEW", "REJECTED"].includes(scenario) ? scenario : "RETRY_REQUIRED");
 }
 const userBefore = (await db.query('SELECT "identityVerified","verificationStatus" FROM "User" WHERE id=$1', [owner.id])).rows[0];
 assert.equal(userBefore.identityVerified, false); assert.equal(userBefore.verificationStatus, "UNVERIFIED");
 const station = (await db.query('INSERT INTO "MrtStation"(code,name) VALUES($1,$2) RETURNING id', ["SYN13C", "Synthetic challenge station"])).rows[0].id;
 const listing = (await db.query(`INSERT INTO "Listing"("ownerId",title,description,category,price,condition,status,"updatedAt") VALUES($1,'Synthetic challenge item','Not an actual product','Cameras',10,'Good','ACTIVE',NOW()) RETURNING id`, [owner.id])).rows[0].id;
 const booking = (await db.query(`INSERT INTO "Booking"("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt") VALUES($1,$2,$3,$4,'2027-01-01','2027-01-02','HANDOFF_PENDING',10,10,NOW()) RETURNING id`, [listing, owner.id, borrower.id, station])).rows[0].id;
 let unrelated: Simulation = await (await read(other.token)).json();
 unrelated = await (await post(other.token, { action: "BEGIN", expectedVersion: unrelated.version, documentType: "TW_ARC", scenario: "SUCCESS" })).json();
 for (let i = 0; i < 3; i++) unrelated = await (await post(other.token, { action: "ADVANCE", expectedVersion: unrelated.version })).json();
 assert.equal((await post(other.token, { action: "CHALLENGE", expectedVersion: unrelated.version, bookingId: booking })).status, 404);
 s = await (await post(owner.token, { action: "CHALLENGE", expectedVersion: s.version, bookingId: booking })).json(); assert.equal(s.challenge!.purpose, "PICKUP");
 assert.equal((await post(borrower.token, { action: "COMPLETE_CHALLENGE", expectedVersion: (await (await read(borrower.token)).json()).version, challengeId: s.challenge!.id })).status, 409);
 s = await (await post(owner.token, { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id })).json(); assert(s.challenge!.consumed);
 assert.equal((await post(owner.token, { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id })).status, 409);
 assert.equal((await db.query('SELECT status FROM "Booking" WHERE id=$1', [booking])).rows[0].status, "HANDOFF_PENDING");
 assert.equal(Number((await db.query('SELECT count(*) n FROM "MeetupEvent"')).rows[0].n), 0);
 // No synthetic challenge bypasses lifecycle prerequisites or manufactures handoff evidence.
 const forbiddenHandoff = await fetch(base + `/api/bookings/${booking}/handoff`, { method: "POST", headers: { Cookie: "p2p_session=" + owner.token, Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm" }) }); assert.notEqual(forbiddenHandoff.status, 200);
 await db.query('UPDATE "Booking" SET status=\'IN_USE\' WHERE id=$1', [booking]);
 assert.equal((await post(owner.token, { action: "CHALLENGE", expectedVersion: s.version, bookingId: booking })).status, 409);
 await db.query('UPDATE "Booking" SET status=\'RETURN_PENDING\' WHERE id=$1', [booking]);
 s = await (await post(owner.token, { action: "CHALLENGE", expectedVersion: s.version, bookingId: booking })).json(); assert.equal(s.challenge!.purpose, "RETURN");
 s = await (await post(owner.token, { action: "REVOKE", expectedVersion: s.version })).json(); assert.equal(s.state, "REVOKED"); assert.equal(s.challenge, null);
 // Positive browser context never receives intentionally negative HTTP tests; collector remains strict.
 const browser = await launchBrowser(); t.after(async () => { await browser.close(); });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
 const errors: string[] = [], external: string[] = []; collectBrowserErrors(context, errors);
 context.on("request", r => { if (new URL(r.url()).origin !== base) external.push(new URL(r.url()).origin); });
 const page = await context.newPage();
 await page.goto(base + "/login"); await page.getByLabel("Email address", { exact: true }).fill(owner.email); await page.getByLabel("Password", { exact: true }).fill(owner.password);
 await page.getByRole("button", { name: "Log in", exact: true }).click(); await expect(page).not.toHaveURL(/\/login$/);
 await page.goto(base + "/account/verification"); await page.getByRole("link", { name: /Identity assurance simulation/ }).click(); await expect(page.locator('[data-testid="identity-state"]')).toHaveText("Not started");
 await page.getByRole("button", { name: "Begin synthetic attempt", exact: true }).click();
 for (let i = 0; i < 3; i++) { await expect(page.getByRole("button", { name: "Run next scripted step", exact: true })).toBeEnabled(); await page.getByRole("button", { name: "Run next scripted step", exact: true }).click(); }
 await expect(page.locator('[data-testid="identity-state"]')).toHaveText(/Simulated verified/);
 for (const [name, width, height, locale] of [["desktop-en",1440,1000,"en"],["tablet-zh",820,1100,"zh-TW"],["mobile-zh",390,844,"zh-TW"]] as const) {
  await context.addCookies([{ name: "hustlen_locale", value: locale, url: base }]); await page.setViewportSize({ width, height }); await page.reload();
  await expect(page.locator('[data-testid="identity-state"]')).toHaveText(locale === "en" ? /Simulated verified/ : /模擬已通過/);
  await expect(page.locator("#experience-preferences")).toHaveAttribute("aria-busy", "false");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(art, `identity-${name}.png`), fullPage: true });
 }
 await page.keyboard.press("Tab"); assert(await page.evaluate(() => document.activeElement !== document.body));
 assert.deepEqual(errors, []); assert.deepEqual(external, []);
 await writeFile(path.join(art, "identity-browser.json"), JSON.stringify({ actualNativeLogin: true, isolatedNewSession: true, scriptedEnrollmentNotRealVerification: true, bilingual: true, viewports: [1440,820,390], noOverflow: true, keyboardFocus: true, browserErrors: errors, externalOrigins: external }, null, 2));
 await context.close();
 await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1', [owner.id]); assert.equal((await read(owner.token)).status, 403);
 await db.query('UPDATE "User" SET "accountStatus"=\'ACTIVE\' WHERE id=$1', [owner.id]);
 await db.query('UPDATE "AuthSession" SET "expiresAt"=NOW()-interval \'1 minute\' WHERE "tokenHash"=$1', [createHash("sha256").update(other.token).digest("hex")]); assert.equal((await read(other.token)).status, 401);
 assert.equal((await fetch(base + "/api/auth/logout", { method: "POST", headers: { Cookie: "p2p_session=" + owner.token, Origin: base } })).status, 200); assert.equal((await read(owner.token)).status, 401);
 assert.equal((await fetch(base + "/api/listings")).status, 200); // Unverified anonymous browse remains available.
 assert.deepEqual((await db.query('SELECT "identityVerified","verificationStatus" FROM "User" WHERE id=$1', [owner.id])).rows[0], userBefore);
});
