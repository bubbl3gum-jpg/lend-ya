import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  chromium,
  type BrowserContext,
  type Page,
  type Route,
} from "playwright";
import { expect } from "playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { collectBrowserErrors } from "./support/browser";
import { mrtPollTrace } from "./support/mrt-poll-trace";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
test(
  "MRT status session loss, stale responses, navigation cleanup and strict error observation",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      password = "Owned-session-lifecycle-93!",
      title = "Owned session lifecycle fixture";
    const actor = async () => {
      const email = randomUUID() + "@fixture.test",
        r = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Session fixture", email, password }),
        });
      assert.equal(r.status, 201);
      const { user } = await r.json();
      return {
        id: user.id as number,
        email,
        token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
      };
    };
    const owner = await actor(),
      borrower = await actor();
    const station = (
      await db.query(
        `SELECT id FROM "MrtStation" WHERE "canonicalId"='taipei-main'`,
      )
    ).rows[0].id;
    const listing = (
      await db.query(
        `INSERT INTO "Listing"("ownerId",title,description,category,price,condition,status,"updatedAt")VALUES($1,$2,'Owned non-private synthetic fixture','Cameras',10,'Good','ACTIVE',NOW())RETURNING id`,
        [owner.id, title],
      )
    ).rows[0].id;
    const booking = (
      await db.query(
        `INSERT INTO "Booking"("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt")VALUES($1,$2,$3,$4,'2027-01-01','2027-01-02','CONFIRMED',10,10,NOW())RETURNING id`,
        [listing, owner.id, borrower.id, station],
      )
    ).rows[0].id;
    const statusPath = `/api/bookings/${booking}/meetup/status`,
      bookingPath = `/bookings/${booking}`;
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH,
        headless: true,
      }),
      evidence: Record<string, unknown> = {};
    const contexts: BrowserContext[] = [];
    const context = async (token?: string) => {
      const c = await browser.newContext();
      contexts.push(c);
      if (token)
        await c.addCookies([{ name: "p2p_session", value: token, url: base }]);
      return c;
    };
    const ready = async (page: Page) => {
      const r = page.waitForResponse(
        (r) => new URL(r.url()).pathname === statusPath && r.status() === 200,
      );
      await page.goto(base + bookingPath);
      await r;
      await expect(
        page.getByText(title, { exact: true }).first(),
      ).toBeVisible();
    };
    const expected401 = (errors: string[], path: string) => {
      assert.equal(errors.filter((x) => x === `401 ${path}`).length, 1);
      const other = errors.filter((x) => x !== `401 ${path}`);
      assert.ok(
        other.length <= 1 &&
          other.every(
            (x) =>
              x ===
              "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
          ),
        "Only the designated negative response and its native browser diagnostic are expected",
      );
    };
    let loggedIn: BrowserContext,
      loggedPage: Page,
      loggedTrace: Awaited<ReturnType<typeof mrtPollTrace>>;
    const loggedErrors: string[] = [];
    let loginErrorCount = 0;
    try {
      await t.test(
        "real API logout invalidates session; one observed 401 stops polling and replaces protected document",
        async () => {
          const c = await context(borrower.token),
            trace = await mrtPollTrace(c),
            errors: string[] = [];
          collectBrowserErrors(c, errors);
          const page = await c.newPage();
          await ready(page);
          trace.mark("LOGOUT_BEGIN");
          assert.equal(
            (await c.request.post(base + "/api/auth/logout")).status(),
            200,
          );
          trace.mark("LOGGED_OUT");
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "AuthSession" WHERE "tokenHash"=$1`,
                [digest(borrower.token)],
              )
            ).rows[0].n,
            0,
          );
          assert.equal((await c.request.get(base + statusPath)).status(), 401);
          await expect(page).toHaveURL(base + "/login");
          assert.ok(!(await page.locator("body").innerText()).includes(title));
          expected401(errors, statusPath);
          assert.throws(() => assert.deepEqual(errors, []));
          evidence.apiLogout = {
            sessionDeleted: true,
            protectedApi401: true,
            protectedContentCleared: true,
            expectedNegativeResponse401: 1,
            strictCollectorWouldFail: true,
            trace: trace.events,
          };
        },
      );
      await t.test(
        "wrong native login is rejected; a new valid session authorizes a fresh document and polling",
        async () => {
          loggedIn = await context();
          const trace = await mrtPollTrace(loggedIn),
            errors: string[] = [];
          loggedTrace = trace;
          collectBrowserErrors(loggedIn, errors);
          collectBrowserErrors(loggedIn, loggedErrors);
          loggedPage = await loggedIn.newPage();
          await loggedPage.goto(base + "/login");
          await loggedPage
            .getByLabel("Email address", { exact: true })
            .fill(borrower.email);
          await loggedPage
            .getByLabel("Password", { exact: true })
            .fill("Wrong-owned-password");
          trace.mark("WRONG_LOGIN");
          const wrong = loggedPage.waitForResponse(
            (r) => new URL(r.url()).pathname === "/api/auth/login",
          );
          await loggedPage
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          assert.equal((await wrong).status(), 401);
          await expect(
            loggedPage.getByText("Invalid email or password.", { exact: true }),
          ).toBeVisible();
          await loggedPage
            .getByLabel("Password", { exact: true })
            .fill(password);
          const good = loggedPage.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === "/api/auth/login" &&
              r.status() === 200,
          );
          await loggedPage
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          await good;
          await expect(loggedPage).toHaveURL(base + "/dashboard");
          trace.mark("NEW_LOGIN");
          const token = (await loggedIn.cookies()).find(
            (c) => c.name === "p2p_session",
          )!.value;
          assert.notEqual(token, borrower.token);
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "AuthSession" WHERE "tokenHash"=$1 AND "expiresAt">NOW()`,
                [digest(token)],
              )
            ).rows[0].n,
            1,
          );
          assert.equal(
            (
              await fetch(base + statusPath, {
                headers: { Cookie: "p2p_session=" + borrower.token },
              })
            ).status,
            401,
          );
          await ready(loggedPage);
          expected401(errors, "/api/auth/login");
          loginErrorCount = loggedErrors.length;
          evidence.newLogin = {
            wrongCredentials401: true,
            newSessionPersisted: true,
            oldSessionStill401: true,
            poll200: true,
            trace: trace.events,
          };
        },
      );
      async function heldStatus(page: Page) {
        let release!: () => void,
          arrived!: () => void,
          done!: () => void,
          completed = false,
          aborted = false;
        const gate = new Promise<void>((r) => (release = r)),
          ready = new Promise<void>((r) => (arrived = r)),
          finished = new Promise<void>((r) => (done = r));
        let intercepted = false;
        const handler = async (route: Route) => {
          if (intercepted) {
            await route.continue();
            return;
          }
          intercepted = true;
          const response = await route.fetch();
          assert.equal(
            response.status(),
            200,
            "Held data must come from a real authorized server response",
          );
          arrived();
          await gate;
          try {
            await route.fulfill({ response });
            completed = true;
          } catch {
            assert.ok(
              !new URL(page.url()).pathname.startsWith("/bookings/"),
              "Only cancellation after leaving the booking document may reject late delivery",
            );
            aborted = true;
          } finally {
            done();
          }
        };
        await page.route(base + statusPath, handler);
        await ready;
        return {
          release: async () => {
            release();
            await finished;
            await page.unroute(base + statusPath, handler);
            return { completed, aborted };
          },
        };
      }
      await t.test(
        "SPA unmount clears timer and cancels an in-flight real 200 before delivery",
        async () => {
          const trace = loggedTrace;
          await ready(loggedPage);
          const held = await heldStatus(loggedPage);
          const cleanupStart = trace.events.length;
          trace.mark("NAVIGATE_PUBLIC");
          await loggedPage
            .getByRole("link", { name: "Browse", exact: true })
            .click();
          await expect(loggedPage).toHaveURL(base + "/listings");
          const delivery = await held.release();
          const before = trace.events.filter(
            (e) => (e as { kind: string }).kind === "poll-start",
          ).length;
          await loggedPage.waitForTimeout(3300);
          assert.equal(
            trace.events.filter(
              (e) => (e as { kind: string }).kind === "poll-start",
            ).length,
            before,
          );
          assert.ok(
            trace.events
              .slice(cleanupStart)
              .some((e) => (e as { kind: string }).kind === "timer-stop"),
          );
          assert.ok(
            trace.events
              .slice(cleanupStart)
              .some((e) => (e as { kind: string }).kind === "poll-aborted"),
          );
          assert.ok(
            !(await loggedPage.locator("body").innerText()).includes(title),
          );
          assert.deepEqual(loggedErrors.slice(loginErrorCount), []);
          evidence.unmount = {
            real200Held: true,
            pollAborted: true,
            noPollAfterOneInterval: true,
            privateDocumentNotResurrected: true,
            delivery,
            trace: trace.events,
          };
        },
      );
      await t.test(
        "native logout navigation cannot be resurrected by a delayed authorized status response",
        async () => {
          await ready(loggedPage);
          const held = await heldStatus(loggedPage);
          await loggedPage.getByText(/Account center ·/).click();
          const logout = loggedPage.waitForResponse(
            (r) => new URL(r.url()).pathname === "/api/auth/logout",
          );
          await loggedPage
            .getByRole("button", { name: "Sign out", exact: true })
            .click();
          assert.equal((await logout).status(), 200);
          await expect(loggedPage).toHaveURL(base + "/login");
          const delivery = await held.release();
          assert.ok(
            !(await loggedPage.locator("body").innerText()).includes(title),
          );
          assert.equal(
            (await loggedIn.request.get(base + statusPath)).status(),
            401,
          );
          await loggedPage.waitForTimeout(3300);
          await expect(loggedPage).toHaveURL(base + "/login");
          assert.deepEqual(loggedErrors.slice(loginErrorCount), []);
          evidence.inflightLogout = {
            real200Held: true,
            nativeLogout200: true,
            protectedApi401: true,
            noResurrection: true,
            delivery,
          };
        },
      );
      await t.test(
        "unexpected 401 in the default authenticated observation still makes the strict collector fail",
        async () => {
          const login = await fetch(base + "/api/auth/login", {
            method: "POST",
            headers: { Origin: base, "Content-Type": "application/json" },
            body: JSON.stringify({ email: borrower.email, password }),
          });
          assert.equal(login.status, 200);
          const token = login.headers
            .get("set-cookie")!
            .match(/p2p_session=([^;]+)/)![1];
          const c = await context(token),
            trace = await mrtPollTrace(c),
            errors: string[] = [];
          collectBrowserErrors(c, errors);
          const page = await c.newPage();
          await ready(page);
          // A real credential-omitting request is unexpected in an authenticated phase.
          // The server denies it, while the independent current session remains valid.
          assert.equal(
            await page.evaluate(
              async (path) =>
                (await fetch(path, { credentials: "omit" })).status,
              statusPath,
            ),
            401,
          );
          assert.equal((await c.request.get(base + statusPath)).status(), 200);
          assert.ok(errors.includes(`401 ${statusPath}`));
          assert.throws(() => assert.deepEqual(errors, []));
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE "tokenHash"=$1`,
            [digest(token)],
          );
          await expect(page).toHaveURL(base + "/login");
          assert.ok(errors.includes(`401 ${statusPath}`));
          assert.throws(() => assert.deepEqual(errors, []));
          assert.ok(!(await page.locator("body").innerText()).includes(title));
          assert.equal(
            errors.filter((e) => e === `401 ${statusPath}`).length,
            2,
          );
          assert.ok(
            errors.every(
              (e) =>
                e === `401 ${statusPath}` ||
                e ===
                  "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
            ),
          );
          evidence.unexpected401 = {
            requestWithoutCredentials401: true,
            currentSessionIndependently200: true,
            detected: true,
            strictEmptyErrorAssertionFails: true,
            sessionExpired: true,
            trace: trace.events,
          };
        },
      );
    } finally {
      await writeFile(
        path.join(artifact, "meetup-session-lifecycle.json"),
        JSON.stringify(evidence, null, 2),
      );
      for (const c of contexts) await c.close();
      await browser.close();
      await db.end();
    }
  },
);
