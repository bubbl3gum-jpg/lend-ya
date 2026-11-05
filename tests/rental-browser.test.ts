import { developmentNavigation } from "./support/dev-navigation";
import { browserDiagnostics } from "./support/browser-diagnostics";
import { nextDevBundlerArgs } from "./support/next-bundler";
import {browserMeetupFixture} from "./support/meetup-fixture";
import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { openSync, closeSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { Pool } from "pg";
import { checklistItems } from "../lib/rental-checklist";
import { formatRentalTime } from "../lib/booking-time";

// Owns its dev server, enabling a real process-restart persistence check.
test(
  "two-user browser rental workflow and application restart",
  // Includes cold dev compilation, full restarts, private image decoding and
  // all history/error cases. Per-operation and security deadlines stay unchanged.
  { timeout: 420000 },
  async (t) => {
    assert.ok(
      process.env.TEST_DATABASE_URL &&
        new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test"),
      "Use an isolated migrated _test database.",
    );
    const port = Number(process.env.TEST_BROWSER_PORT ?? 3002);
    const base = `http://localhost:${port}`;
    const log = openSync(path.join(process.env.MRT_TEST_ARTIFACT_DIR!, "lend-ya-browser-server.log"), "w");
    let server: ChildProcess | undefined;
    let serverInstance = 0;
    const stop = async () => {
      if (server && server.exitCode === null && server.signalCode === null) {
        // Preserve authenticated contexts but disconnect dev HMR before restart.
        // Otherwise an old page may reconnect and reload during the next navigation.
        for (const page of browser?.contexts().flatMap(context => context.pages()) ?? [])
          await page.goto("about:blank", {waitUntil:"commit"});
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        await exited;
      }
    };
    const start = async (settings: Record<string, string> = {}) => {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          ...nextDevBundlerArgs(),
          "--hostname",
          "localhost",
          "--port",
          String(port),
        ],
        {
          env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, TZ: "UTC", ...settings,
            MRT_TEST_SERVER_INSTANCE: String(++serverInstance) },
          stdio: ["ignore", log, log],
        },
      );
      for (let i = 0; i < 40; i++) {
        if (server.exitCode !== null)
          throw new Error(
            "Test Next server exited; inspect the run artifact browser-server log",
          );
        try {
          const response = await fetch(`${base}/api/listings`, {signal:AbortSignal.timeout(2000)});
          if (response.ok) return;
        } catch {
          /* readiness */
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Test server did not become ready.");
    };
    const ownedDatabase = await connectTestDatabase();
    await ownedDatabase.end();
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const tag = randomUUID();
    const userIds: number[] = [],
      listingIds: number[] = [],
      files: string[] = [];
    let stationId: number | undefined;
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const image = await sharp({
      create: { width: 20, height: 16, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    const diagnostics = browserDiagnostics(process.env.MRT_TEST_ARTIFACT_DIR!, "rental");
    const navigation = developmentNavigation();
    t.afterEach(async context => {
      diagnostics.caseResult(context.name, (context as typeof context & {error?: unknown}).error);
      await diagnostics.checkpoint();
    });
    let completedId = 0;
    let submittedRequest: { key: string; body: Record<string, unknown> } | undefined;
    try {
      await start();
      browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
      const ownerContext = await browser.newContext({
        timezoneId: "Pacific/Honolulu",
        viewport: { width: 1280, height: 900 },
      });
      const borrowerContext = await browser.newContext({
        timezoneId: "America/Los_Angeles",
        viewport: { width: 1280, height: 900 },
      });
      diagnostics.observeContext(ownerContext);
      navigation.observeContext(ownerContext);
      diagnostics.observeContext(borrowerContext);
      navigation.observeContext(borrowerContext);
      const owner = await ownerContext.newPage(),
        borrower = await borrowerContext.newPage();
      for (const page of [owner, borrower])
        page.on("dialog", (dialog) => dialog.accept());
      const login = async (page: Page, role: string) => {
        const email = `browser-${role}-${tag}@example.test`,
          password = `Test-${tag}`;
        const response = await page.request.post(`${base}/api/auth/register`, {
          data: { name: `Browser ${role}`, email, password },
        });
        assert.equal(response.status(), 201);
        userIds.push((await response.json()).user.id);
        await page.goto(`${base}/login`);
        await page.getByLabel("Email address").fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Log in", exact: true }).click();
        await page.waitForURL("**/dashboard");
      };
      await login(owner, "owner");
      await login(borrower, "borrower");
      const outsiderContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      diagnostics.observeContext(outsiderContext);
      navigation.observeContext(outsiderContext);
      const outsider = await outsiderContext.newPage();
      await login(outsider, "outsider");
      for (const page of [owner, borrower]) {
        await expect(page.getByText("No active rentals.", { exact: true })).toHaveCount(2);
        await expect(page.getByText("No rental history yet.", { exact: true })).toHaveCount(2);
        await page.setViewportSize({ width: 390, height: 844 });
      }
      const reopen = async (id: number, status: string) => {
        const group = ["COMPLETED", "CANCELLED", "ADMIN_CLOSED"].includes(status) ? "history" : "active";
        for (const [page, role] of [[owner, "owner"], [borrower, "borrower"]] as const) {
          // Streamed links may be visible before a prior document/RSC refresh ends.
          await navigation.settle(page);
          await page.getByRole("link", { name: "← Back to dashboard", exact: true }).click();
          await navigation.settle(page);
          const card = page.locator(`#${role}-${group}`).getByRole("article", { name: `Booking #${id}: ${status}`, exact: true });
          await expect(card).toBeVisible();
          await expect(card).toContainText("Asia/Taipei, UTC+08:00");
          await expect(page.locator(`a[href="/bookings/${id}"]`)).toHaveCount(1);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${status} dashboard fits viewport`);
          if (status === "PENDING") await page.screenshot({ path: path.join(process.env.MRT_TEST_ARTIFACT_DIR!, `r7-${role}-mobile-pending.png`), fullPage: true });
          await card.locator(`a[href="/bookings/${id}"]`).click();
          await navigation.settle(page);
          await expect(page).toHaveURL(`${base}/bookings/${id}`);
          await expect(page.getByText(status, { exact: true })).toBeVisible();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${status} detail fits viewport`);
        }
      };
      stationId = (
        await pool.query("SELECT id FROM \"MrtStation\" WHERE code='TPE'")
      ).rows[0].id;
      const bookViaUi = async () => {
        const listing = await owner.request.post(`${base}/api/listings`, {
          multipart: {
            title: "Browser test rental",
            description: "Physical camera with known scratch",
            category: "Cameras",
            condition: "Good",
            price: "12.34",
            deposit: "25.67",
            stationIds: JSON.stringify([stationId]),
            photos: { name: "item.png", mimeType: "image/png", buffer: image },
          },
        });
        assert.equal(listing.status(), 201);
        const data = (await listing.json()).listing;
        listingIds.push(data.id);
        data.media.forEach((media: { url: string }) =>
          files.push(
            path.join(
              process.cwd(),
              "storage/listings",
              path.basename(media.url),
            ),
          ),
        );
        await borrower.goto(`${base}/listings/${data.id}`);
        // Cold dev compilation can replace a loaded document. Settle the
        // observed transition before opening a stateful native station dialog.
        await navigation.settle(borrower);
        await expect(borrower.getByText(/Maximum \d+ days/)).toContainText(
          `Maximum ${process.env.BOOKING_MAX_DURATION_DAYS ?? "90"} days`,
        );
        await borrower
          .getByRole("button", { name: "Choose meeting station", exact: true })
          .click();
        await borrower
          .getByRole("dialog")
          .locator('[data-station-id="taipei-main"] .station-hit')
          .click();
        await borrower
          .getByRole("button", { name: "Confirm meeting station", exact: true })
          .click();
        await borrower.getByLabel("Start date").fill("2035-01-01T10:00");
        await borrower.getByLabel("End date").fill("2035-01-02T10:01");
        await borrower
          .getByRole("button", { name: "Review quotation" })
          .click();
        await expect(borrower.getByText(/Rental fee: \$24.68/)).toBeVisible();
        const submitted = borrower.waitForRequest((request) =>
          request.url() === `${base}/api/bookings` && request.method() === "POST" &&
          request.postDataJSON()?.quote === false,
        );
        let lostStatus: number | undefined;
        const loseResponse = !completedId;
        if (loseResponse) await borrower.route(`${base}/api/bookings`, async (route) => {
          if (route.request().method() === "POST" && route.request().postDataJSON()?.quote === false) {
            const committed = await route.fetch();
            lostStatus = committed.status();
            await route.abort("failed");
          } else await route.continue();
        });
        await borrower
          .getByRole("button", { name: "Confirm and submit request" })
          .click();
        const request = await submitted;
        if (!completedId) {
          const key = request.headers()["idempotency-key"];
          assert.ok(key);
          submittedRequest = { key, body: request.postDataJSON() };
        }
        if (loseResponse) {
          await expect.poll(() => lostStatus, { message: "Drop only the response of a real committed write." }).toBe(201);
          await expect(borrower.locator("form").filter({
            has: borrower.getByRole("heading", { name: "Request this rental", exact: true }),
          }).getByRole("alert")).toBeVisible();
          await borrower.unroute(`${base}/api/bookings`);
          assert.equal((await pool.query('SELECT count(*)::int n FROM "Booking" WHERE "listingId"=$1', [data.id])).rows[0].n, 1);
          const retried = borrower.waitForRequest(r => r.url() === `${base}/api/bookings` && r.method() === "POST");
          await borrower.getByRole("button", { name: "Confirm and submit request" }).click();
          const retry = await retried;
          assert.equal(retry.headers()["idempotency-key"], request.headers()["idempotency-key"]);
          assert.deepEqual(retry.postDataJSON(), request.postDataJSON(), "Lost-response retry must not become a new quotation.");
        }
        await borrower.waitForURL("**/bookings/*");
        const id = Number(new URL(borrower.url()).pathname.split("/").pop());
        assert.equal((await pool.query('SELECT count(*)::int n FROM "Booking" WHERE "listingId"=$1', [data.id])).rows[0].n, 1);
        await owner.goto(`${base}/bookings/${id}`);
        await reopen(id, "PENDING");
        await owner.getByRole("link", { name: "← Back to dashboard", exact: true }).click();
        const pendingCard = owner.getByRole("article", { name: `Booking #${id}: PENDING`, exact: true });
        // Dev compiles this mutation handler on first use; wait for its actual
        // successful response before measuring the refreshed dashboard state.
        const acceptance = owner.waitForResponse(response => new URL(response.url()).pathname === `/api/bookings/${id}` && response.request().method() === "PATCH");
        await pendingCard.getByRole("button", { name: "Accept request" }).click();
        assert.equal((await acceptance).status(), 200);
        const acceptedCard = owner.getByRole("article", { name: `Booking #${id}: CONFIRMED`, exact: true });
        await expect(acceptedCard).toBeVisible();
        await expect(acceptedCard.getByRole("button", { name: "Accept request" })).toHaveCount(0);
        await acceptedCard.getByRole("link").click();
        await reopen(id, "CONFIRMED");
        await expect(
          owner.getByRole("heading", { name: "Submit owner handoff" }),
        ).toBeVisible();
        await expect(owner.getByLabel("Condition notes", { exact: true })).toBeEnabled();
        return id;
      };
      const evidenceForm = async (
        page: Page,
        title: string,
        notes: string,
        acceptable?: boolean,
      ) => {
        const id=Number(new URL(page.url()).pathname.split("/").pop());
        const verification=await browserMeetupFixture(base,owner.context(),borrower.context());
        if(title==="Confirm receipt as borrower") { await verification.arrivals(id,"PICKUP"); await verification.scanPayload(id,"PICKUP"); }
        if(title==="Submit item return") await verification.arrivals(id,"RETURN");
        await page.getByRole("button",{name:"Refresh verification status",exact:true}).click();
        const form = page.locator("form").filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        });
        const button = form.getByRole("button", { name: title, exact: true });
        await expect(button).toBeDisabled();
        for (const [key, label] of Object.entries(checklistItems))
          await form
            .getByRole("combobox", { name: label, exact: true })
            .selectOption(key === "functionTested" ? "unknown" : "yes");
        await form.getByLabel("Condition notes", { exact: true }).fill(notes);
        if (title === "Submit owner handoff") await form.getByLabel("Serial number (optional)").fill("BROWSER-SERIAL-123");
        await form.getByLabel(/Condition photos \(optional\)/).setInputFiles({
          name: "condition.png",
          mimeType: "image/png",
          buffer: image,
        });
        if (acceptable !== undefined)
          await form
            .getByRole("combobox", { name: "Inspection decision", exact: true })
            .selectOption(acceptable ? "acceptable" : "problem");
        for(const checkbox of await form.getByRole("checkbox").all()) await checkbox.check();
        await expect(button).toBeEnabled();
        const action = title === "Submit item return" ? "return" : acceptable !== undefined ? "inspection" : "handoff";
        const submitted = page.waitForResponse(response => new URL(response.url()).pathname === `/api/bookings/${id}/${action}` && response.request().method() === "POST");
        await button.click();
        assert.equal((await submitted).status(),200);
        await expect(form).toHaveCount(0);
      };
      await t.test(
        "actual UI booking, explicit handoff, return, inspection and bilateral reviews",
        async () => {
          completedId = await bookViaUi();
          await evidenceForm(
            owner,
            "Submit owner handoff",
            "Owner: scratch documented",
          );
          assert.equal((await pool.query('SELECT count(*)::int n FROM "MeetupCheckIn" WHERE "bookingId"=$1', [completedId])).rows[0].n, 0);
          await owner.reload({waitUntil:"commit"});
          await expect(owner.getByText("Owner: scratch documented", { exact: true })).toBeVisible();
          await expect(owner.getByText("Serial number: BROWSER-SERIAL-123", { exact: true })).toBeVisible();
          await expect(owner.locator('img[alt*="condition photo"]')).toHaveCount(1);
          const early = (await pool.query('SELECT b.status,h."confirmedAt",h.checklist FROM "Booking" b JOIN "Handoff" h ON h."bookingId"=b.id WHERE b.id=$1', [completedId])).rows[0];
          assert.equal(early.status, "HANDOFF_PENDING");
          assert.equal(early.confirmedAt, null);
          assert.equal(early.checklist.functionTested, "unknown");
          await reopen(completedId, "HANDOFF_PENDING");
          await borrower.reload({waitUntil:"commit"});
          await expect(
            borrower.getByText("Owner: scratch documented", { exact: true }),
          ).toBeVisible();
          await evidenceForm(
            borrower,
            "Confirm receipt as borrower",
            "Borrower: scratch acknowledged",
          );
          await reopen(completedId, "IN_USE");
          await expect(
            borrower.getByRole("heading", { name: "Submit item return" }),
          ).toBeVisible();
          await evidenceForm(
            borrower,
            "Submit item return",
            "Borrower: returned unchanged",
          );
          await reopen(completedId, "RETURN_PENDING");
          await owner.reload({waitUntil:"commit"});
          await (await browserMeetupFixture(base,owner.context(),borrower.context())).scanPayload(Number(new URL(owner.url()).pathname.split("/").pop()),"RETURN");
          await owner.getByRole("button",{name:"Refresh verification status",exact:true}).click();
          await owner.getByLabel("I have physically received the returned equipment. This does not accept its condition.").check();
          await owner.getByRole("button",{name:"Acknowledge physical return and begin inspection",exact:true}).click();
          await expect(owner.getByText("INSPECTION", { exact: true })).toBeVisible();
          await reopen(completedId, "INSPECTION");
          await evidenceForm(
            owner,
            "Save owner inspection decision",
            "Owner: return accepted",
            true,
          );
          await expect(
            owner.getByText("COMPLETED", { exact: true }),
          ).toBeVisible();
          await borrower.reload({waitUntil:"commit"});
          await expect(
            borrower.getByText("COMPLETED", { exact: true }),
          ).toBeVisible();
          await reopen(completedId, "COMPLETED");
          for (const page of [owner, borrower]) {
            await page
              .getByLabel("Comment", { exact: true })
              .fill("Browser verified review");
            const reviewed = page.waitForResponse(response => new URL(response.url()).pathname === `/api/bookings/${completedId}/reviews` && response.request().method() === "POST");
            await page
              .getByRole("button", { name: "Submit verified review" })
              .click();
            assert.equal((await reviewed).status(),201);
            await expect(
              page
                .getByText("Browser verified review", { exact: true })
                .first(),
            ).toBeVisible();
            await expect(
              page.locator('img[alt*="condition photo"]'),
            ).toHaveCount(4);
          }
          const row = (
            await pool.query(
              'SELECT status,"totalPrice","deposit" FROM "Booking" WHERE id=$1',
              [completedId],
            )
          ).rows[0];
          assert.equal(row.status, "COMPLETED");
          assert.equal(row.totalPrice, "24.68");
          assert.equal(row.deposit, "25.67");
          await expect(owner.getByText(`${formatRentalTime("2035-01-01T02:00Z")} → ${formatRentalTime("2035-01-02T02:01Z")}`, { exact: true })).toBeVisible();
          await expect(owner.getByText(/\$12\.34 per day/)).toBeVisible();
          await expect(owner.getByText("$25.67", { exact: true })).toBeVisible();
        },
      );
      await t.test(
        "completed state, notes, reviews and private photos survive a full server restart",
        async () => {
          assert.ok(completedId);
          await stop();
          await start({ BOOKING_MAX_DURATION_DAYS: "1", BOOKING_MAX_NOTES_UNITS: "1" });
          try {
          const original = (await pool.query('SELECT "requestKey","listingId","totalPrice","dailyPrice","deposit" FROM "Booking" WHERE id=$1', [completedId])).rows[0];
          assert.ok(original.requestKey, "Browser creates a durable retry key");
          assert.ok(submittedRequest, "Capture the actual booking submission");
          assert.equal(submittedRequest.key, original.requestKey);
          assert.equal(submittedRequest.body.listingId, original.listingId);
          assert.equal(submittedRequest.body.startAt, "2035-01-01T02:00:00.000Z");
          assert.equal(submittedRequest.body.endAt, "2035-01-02T02:01:00.000Z");
          const stored = (await pool.query(`SELECT to_char("startAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS') instant FROM "Booking" WHERE id=$1`, [completedId])).rows[0];
          assert.equal(stored.instant, "2035-01-01T02:00:00.000");
          // Listing changes cannot change the committed price snapshot or invalidate a retry.
          await pool.query('UPDATE "Listing" SET price=99.99 WHERE id=$1', [original.listingId]);
          const replay = await borrower.request.post(`${base}/api/bookings`, {
            headers: { "Idempotency-Key": original.requestKey },
            data: submittedRequest.body,
          });
          assert.equal(replay.status(), 201);
          const replayed = (await replay.json()).booking;
          assert.equal(replayed.id, completedId);
          assert.equal(replayed.totalPrice, original.totalPrice);
          assert.equal(replayed.dailyPrice, original.dailyPrice);
          assert.equal(replayed.deposit, original.deposit);
          const legacyBody = { ...submittedRequest.body, startAt: "2035-01-01T10:00", endAt: "2035-01-02T10:01" };
          const legacyReplay = await borrower.request.post(`${base}/api/bookings`, {
            headers: { "Idempotency-Key": original.requestKey }, data: legacyBody,
          });
          assert.equal(legacyReplay.status(), 201, "Stored matching legacy terms survive restart and lower policy.");
          assert.equal((await legacyReplay.json()).booking.id, completedId);
          assert.equal((await borrower.request.post(`${base}/api/bookings`, {
            headers: { "Idempotency-Key": randomUUID() }, data: legacyBody,
          })).status(), 400, "Legacy fallback cannot create a new request.");
          for (const change of [
            { notes: "different request" },
            { startAt: "2035-01-01T11:00+08:00" },
            { meetingStationId: Number(submittedRequest.body.meetingStationId) + 1 },
            { canonicalStationId: "different-station" },
            { expectedQuote: "stale" },
          ]) {
            const conflictStatus: number = (await borrower.request.post(`${base}/api/bookings`, {
              headers: { "Idempotency-Key": original.requestKey },
              data: { ...submittedRequest.body, ...change },
            })).status();
            assert.equal(conflictStatus, 409);
          }
          assert.equal((await pool.query('SELECT count(*)::int n FROM "Booking" WHERE "listingId"=$1', [original.listingId])).rows[0].n, 1);
          for (const page of [owner, borrower]) {
            await page.goto(`${base}/bookings/${completedId}`);
            await expect(
              page.getByText("COMPLETED", { exact: true }),
            ).toBeVisible();
            for (const note of [
              "Owner: scratch documented",
              "Borrower: scratch acknowledged",
              "Borrower: returned unchanged",
              "Owner: return accepted",
            ])
              await expect(page.getByText(note, { exact: true })).toBeVisible();
            await expect(
              page.getByText("Browser verified review", { exact: true }),
            ).toHaveCount(2);
            for (const photo of await page
              .locator('img[alt*="condition photo"]')
              .all()) {
              await photo.scrollIntoViewIfNeeded();
              await expect
                .poll(() =>
                  photo.evaluate(
                    (image) =>
                      (image as HTMLImageElement).complete &&
                      (image as HTMLImageElement).naturalWidth > 0,
                  ),
                  {timeout:30000, message:"Actual private evidence bytes decode after server restart"},
                )
                .toBe(true);
            }
            assert.equal(
              (
                await page.request.get(`${base}/api/bookings/${completedId}`)
              ).status(),
              200,
            );
          }
          await owner.setViewportSize({ width: 390, height: 844 });
          await owner.screenshot({
            path: path.join(process.env.MRT_TEST_ARTIFACT_DIR!, "lend-ya-completed-mobile.png"),
            fullPage: true,
          });
          assert.ok(
            await owner.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
            "Completed page fits mobile viewport",
          );
          for (const page of [owner, borrower]) {
            await page.goto(`${base}/dashboard`);
            await expect(
              page.locator(`a[href="/bookings/${completedId}"]`),
            ).toBeVisible();
          }
          await owner.setViewportSize({ width: 1280, height: 900 });
          await stop();
          await start({ BOOKING_MAX_DURATION_DAYS: "NaN" });
          assert.equal((await borrower.request.post(`${base}/api/bookings`, {
            headers: { "Idempotency-Key": original.requestKey }, data: submittedRequest.body,
          })).status(), 201, "Malformed current policy cannot invalidate a committed retry.");
          assert.equal((await borrower.request.post(`${base}/api/bookings`, {
            data: { ...submittedRequest.body, quote: true },
          })).status(), 503, "Malformed policy must fail new quotations explicitly.");
          } catch (error) {
            await diagnostics.checkpoint();
            throw error;
          } finally {
            // A failed assertion must not leak the deliberately lowered/invalid
            // policy into subsequent independent browser cases.
            await stop();
            await start();
          }
        },
      );
      await t.test(
        "a rejected return stays incomplete and the dispute UI requests administrative review",
        async () => {
          const id = await bookViaUi();
          await evidenceForm(
            owner,
            "Submit owner handoff",
            "Owner: intact accessory",
          );
          await borrower.goto(`${base}/bookings/${id}`);
          await evidenceForm(
            borrower,
            "Confirm receipt as borrower",
            "Borrower: accessory received",
          );
          await evidenceForm(
            borrower,
            "Submit item return",
            "Borrower: accessory missing",
          );
          await owner.reload({waitUntil:"commit"});
          await (await browserMeetupFixture(base,owner.context(),borrower.context())).scanPayload(Number(new URL(owner.url()).pathname.split("/").pop()),"RETURN");
          await owner.getByRole("button",{name:"Refresh verification status",exact:true}).click();
          await owner.getByLabel("I have physically received the returned equipment. This does not accept its condition.").check();
          await owner.getByRole("button",{name:"Acknowledge physical return and begin inspection",exact:true}).click();
          await evidenceForm(
            owner,
            "Save owner inspection decision",
            "Owner: missing accessory",
            false,
          );
          await expect(
            owner.getByText("INSPECTION", { exact: true }),
          ).toBeVisible();
          await owner
            .getByRole("button", { name: "Open dispute", exact: true })
            .click();
          await owner
            .getByLabel("Dispute reason", { exact: true })
            .fill("Missing accessory");
          await owner
            .getByLabel("Concern details", { exact: true })
            .fill("The supplied accessory was not returned.");
          await owner.getByRole("button", { name: "Submit dispute" }).click();
          await expect(
            owner.getByText("DISPUTED", { exact: true }),
          ).toBeVisible();
          await borrower.reload({waitUntil:"commit"});
          await expect(
            borrower.getByText(/Administrative review is required/),
          ).toBeVisible();
          assert.equal(
            (await pool.query('SELECT status FROM "Booking" WHERE id=$1', [id]))
              .rows[0].status,
            "DISPUTED",
          );
          await reopen(id, "DISPUTED");
          // Distinct newly registered test actor, promoted only in this owned DB.
          // Participants do not gain moderation authority.
          const adminId = userIds[2];
          await pool.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [adminId]);
          const dispute = (await pool.query('SELECT id FROM "Dispute" WHERE "bookingId"=$1', [id])).rows[0].id;
          const closed = await outsider.request.post(`${base}/api/admin/disputes/${dispute}/resolve`, {
            headers: { Origin: base },
            data: { finding: "ISSUE_CONFIRMED", outcome: "CLOSE_RETURNED", reason: "Synthetic navigation fixture: returned equipment inspected; preserve evidence." },
          });
          assert.equal(closed.status(), 200, await closed.text());
          await owner.reload({waitUntil:"commit"}); await borrower.reload({waitUntil:"commit"});
          await reopen(id, "ADMIN_CLOSED");
          assert.equal((await pool.query('SELECT status FROM "Booking" WHERE id=$1', [id])).rows[0].status, "ADMIN_CLOSED");
        },
      );
      await t.test("dashboard rejection/cancellation refresh history, inactive privacy and locale survive navigation", async () => {
        const listing = listingIds[0];
        const terms = { listingId: listing, meetingStationId: stationId, startAt: "2044-01-01T10:00+08:00", endAt: "2044-01-02T10:00+08:00" };
        const created = await borrower.request.post(`${base}/api/bookings`, { data: terms });
        assert.equal(created.status(), 201);
        const rejected = (await created.json()).booking.id;
        await owner.goto(`${base}/dashboard`);
        const card = owner.getByRole("article", { name: `Booking #${rejected}: PENDING`, exact: true });
        // Controlled transport failure must preserve the card and provide a usable retry.
        await owner.route(`${base}/api/bookings/${rejected}`, r => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic temporary booking failure. Retry." }) }));
        await card.getByRole("button", { name: "Reject request" }).click();
        await expect(card.getByRole("alert")).toHaveText("Synthetic temporary booking failure. Retry.");
        await owner.unroute(`${base}/api/bookings/${rejected}`);
        const rejection = owner.waitForResponse(response => new URL(response.url()).pathname === `/api/bookings/${rejected}` && response.request().method() === "PATCH");
        await card.getByRole("button", { name: "Reject request" }).click();
        assert.equal((await rejection).status(),200);
        const history = owner.locator("#owner-history").getByRole("article", { name: `Booking #${rejected}: CANCELLED`, exact: true });
        await expect(history).toBeVisible();
        await expect(history.getByRole("button")).toHaveCount(0);
        await history.getByRole("link").click();
        await borrower.goto(`${base}/bookings/${rejected}`);
        await reopen(rejected, "CANCELLED");
        const second = await borrower.request.post(`${base}/api/bookings`, { data: terms });
        assert.equal(second.status(), 201);
        const cancelled = (await second.json()).booking.id;
        await borrower.goto(`${base}/bookings/${cancelled}`);
        await borrower.getByRole("button", { name: "Cancel booking", exact: true }).click();
        await expect(borrower.getByText("CANCELLED", { exact: true })).toBeVisible();
        await owner.goto(`${base}/bookings/${cancelled}`);
        await reopen(cancelled, "CANCELLED");
        assert.equal((await owner.request.patch(`${base}/api/listings/${listing}`, { data: { status: "INACTIVE" } })).status(), 200);
        await reopen(cancelled, "CANCELLED");
        await borrowerContext.addCookies([{ name: "hustlen_locale", value: "zh-TW", url: base }]);
        await reopen(cancelled, "CANCELLED");
        await expect(borrower.locator("header.catalogue-masthead")).toContainText("瀏覽物品");
        assert.equal((await borrowerContext.cookies()).find(c => c.name === "hustlen_locale")?.value, "zh-TW");
        await outsider.goto(`${base}/dashboard`);
        for (const id of [completedId, rejected, cancelled]) {
          await expect(outsider.locator(`a[href="/bookings/${id}"]`)).toHaveCount(0);
          assert.equal((await outsider.request.get(`${base}/api/bookings/${id}`)).status(), 403);
        }
        const denied = await outsider.goto(`${base}/bookings/${cancelled}`);
        // Next returns 200 for streamed notFound, 404 for an unstreamed response.
        assert.ok([200, 404].includes(denied?.status() ?? 0));
        await expect(outsider.getByRole("heading", { name: "404", exact: true })).toBeVisible();
        await expect(outsider.getByText("Browser test rental", { exact: true })).toHaveCount(0);
        assert.equal((await outsider.request.get(`${base}/api/listings/${listing}`)).status(), 404);
        await borrowerContext.clearCookies({ name: "hustlen_locale" });
      });
      await t.test("dashboard loading and load-error recovery remain usable", async () => {
        await outsider.goto(`${base}/account`);
        const blocker = await connectTestDatabase();
        let navigation: ReturnType<Page["goto"]> | undefined;
        try {
          await blocker.query("BEGIN");
          await blocker.query('LOCK TABLE "Booking" IN ACCESS EXCLUSIVE MODE');
          const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0].pid;
          navigation = outsider.goto(`${base}/dashboard`, { waitUntil: "commit" });
          await navigation;
          await expect(outsider.getByRole("status").filter({ hasText: "Loading bookings…" })).toBeVisible();
          await expect.poll(async () => (await pool.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND $1=ANY(pg_blocking_pids(pid)) AND query LIKE '%Booking%'", [pid])).rows[0].n).toBeGreaterThan(0);
          await blocker.query("COMMIT");
          await expect(outsider.getByRole("heading", { name: "My borrowings", exact: true })).toBeVisible();
        } finally {
          await blocker.query("ROLLBACK"); await blocker.end(); if (navigation) await navigation;
        }
        // Temporary relation unavailability in this owned fixture only. No row or constraint changes.
        await pool.query('ALTER TABLE "Booking" RENAME TO "R7_Booking_unavailable"');
        try {
          await outsider.reload({waitUntil:"commit"});
          await expect(outsider.getByText("Unable to load your bookings. Please try again.", { exact: true })).toBeVisible();
        } finally {
          await pool.query('ALTER TABLE "R7_Booking_unavailable" RENAME TO "Booking"');
        }
        await outsider.keyboard.press("Escape");
        await outsider.getByRole("button", { name: "Try again", exact: true }).click();
        await expect(outsider.getByRole("heading", { name: "My borrowings", exact: true })).toBeVisible();
        await expect(outsider.getByText("No active rentals.", { exact: true })).toHaveCount(2);
        await pool.query('ALTER TABLE "Booking" RENAME TO "R7_Booking_unavailable"');
        try {
          await borrower.goto(`${base}/bookings/${completedId}`);
          await expect(borrower.getByText("Unable to load your bookings. Please try again.", { exact: true })).toBeVisible();
        } finally {
          await pool.query('ALTER TABLE "R7_Booking_unavailable" RENAME TO "Booking"');
        }
        await borrower.keyboard.press("Escape");
        await borrower.getByRole("button", { name: "Try again", exact: true }).click();
        await expect(borrower.getByText("COMPLETED", { exact: true })).toBeVisible();
      });
      await t.test("historical Taipei DST, money boundaries and history displays preserve stored rows", async () => {
        assert.ok(completedId);
        const participants = (await pool.query('SELECT "ownerId","renterId" FROM "Booking" WHERE id=$1', [completedId])).rows[0];
        // New synthetic history only: do not amend any existing booking/evidence.
        const listing = (await pool.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,status,"updatedAt")
           VALUES ($1,'Synthetic historical display','Display fixture only','Cameras',9999999999.99,0,'Good','INACTIVE',NOW()) RETURNING id`,
          [participants.ownerId],
        )).rows[0].id;
        await pool.query('INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)', [listing, stationId]);
        const historical = (await pool.query(
          `INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice",deposit,notes,"createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,'1979-07-15 01:00','1979-07-16 01:00','COMPLETED',9999999999.99,9999999999.99,0,'Synthetic historic terms','1979-07-14 01:00','1979-07-16 01:03') RETURNING id`,
          [listing, participants.ownerId, participants.renterId, stationId],
        )).rows[0].id;
        await pool.query(
          `INSERT INTO "Handoff" ("bookingId","performedBy","confirmedBy","conditionConfirmed","ownerConditionConfirmed","conditionNotes","timestamp","confirmedAt","updatedAt")
           VALUES ($1,$2,$3,true,true,'Synthetic old handoff','1979-07-15 01:00','1979-07-15 01:02','1979-07-15 01:02')`,
          [historical, participants.ownerId, participants.renterId],
        );
        await pool.query(
          `INSERT INTO "Return" ("bookingId","initiatedBy","confirmedBy","conditionConfirmed","returnConfirmed","inspectedBy","inspectionAccepted","inspectionNotes","timestamp","confirmedAt","inspectedAt","updatedAt")
           VALUES ($1,$2,$3,true,true,$3,true,'Synthetic old inspection','1979-07-16 01:00','1979-07-16 01:02','1979-07-16 01:03','1979-07-16 01:03')`,
          [historical, participants.renterId, participants.ownerId],
        );
        const snapshot = async () => ({
          booking: (await pool.query('SELECT row_to_json(b)::text row FROM "Booking" b WHERE id=$1', [historical])).rows,
          handoff: (await pool.query('SELECT row_to_json(h)::text row FROM "Handoff" h WHERE "bookingId"=$1', [historical])).rows,
          returned: (await pool.query('SELECT row_to_json(r)::text row FROM "Return" r WHERE "bookingId"=$1', [historical])).rows,
          listing: (await pool.query('SELECT row_to_json(l)::text row FROM "Listing" l WHERE id=$1', [listing])).rows,
          stationLinks: (await pool.query('SELECT row_to_json(s)::text row FROM "ListingStation" s WHERE "listingId"=$1', [listing])).rows,
        });
        const before = await snapshot();
        const start = formatRentalTime("1979-07-15T01:00Z"), end = formatRentalTime("1979-07-16T01:00Z");
        assert.match(start, /10:00 AM.*UTC\+09:00/, "Fixture must exercise real Taipei DST, not a modern +08 shortcut.");
        for (const page of [owner, borrower]) {
          await page.goto(`${base}/bookings/${historical}`);
          await expect(page.getByText(`${start} → ${end}`, { exact: true })).toBeVisible();
          await expect(page.getByText("$9,999,999,999.99", { exact: true })).toBeVisible();
          await expect(page.getByText("$0.00", { exact: true })).toBeVisible();
          for (const [title, instant] of [["Owner handoff", "1979-07-15T01:00Z"],
            ["Borrower receipt", "1979-07-15T01:02Z"], ["Borrower return", "1979-07-16T01:00Z"],
            ["Owner return inspection", "1979-07-16T01:03Z"]]) {
            const evidence = page.getByRole("heading", { name: title, exact: true }).locator("..");
            await expect(evidence).toContainText(formatRentalTime(instant));
          }
          await page.goto(`${base}/dashboard`);
          await expect(page.locator(`a[href="/bookings/${historical}"]`)).toBeVisible();
          await expect(page.getByText(`${start} → ${end}`, { exact: true })).toBeVisible();
          await page.goto(`${base}/account/activity`);
          const entries = page.locator("li").filter({ has: page.locator(`a[href="/bookings/${historical}"]`) });
          await expect(entries.filter({ hasText: "Booking requested" })).toContainText(formatRentalTime("1979-07-14T01:00Z"));
          await expect(entries.filter({ hasText: "Handoff submitted" })).toContainText(start);
          await expect(entries.filter({ hasText: "Return submitted" })).toContainText(end);
          await expect(entries.filter({ hasText: "Return inspected and confirmed" })).toContainText(formatRentalTime("1979-07-16T01:02Z"));
        }
        assert.deepEqual(await snapshot(), before, "Rendering must not rewrite historical instants, amounts or relationships.");
      });
    } finally {
      if (browser) await browser.close();
      await stop();
      closeSync(log);
      // Leave immutable rows for the marked owned-database teardown.
      await Promise.all(files.map((file) => unlink(file)));
      await pool.end();
    }
  },
);
