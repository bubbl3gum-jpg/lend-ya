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

// Owns its dev server, enabling a real process-restart persistence check.
test(
  "two-user browser rental workflow and application restart",
  { timeout: 120000 },
  async (t) => {
    assert.ok(
      process.env.TEST_DATABASE_URL &&
        new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test"),
      "Use an isolated migrated _test database.",
    );
    const port = Number(process.env.TEST_BROWSER_PORT ?? 3002);
    const base = `http://localhost:${port}`;
    const log = openSync("/tmp/lend-ya-browser-server.log", "w");
    let server: ChildProcess | undefined;
    const stop = async () => {
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        await exited;
      }
    };
    const start = async () => {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          String(port),
        ],
        {
          env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
          stdio: ["ignore", log, log],
        },
      );
      for (let i = 0; i < 40; i++) {
        if (server.exitCode !== null)
          throw new Error(
            "Test Next server exited; inspect /tmp/lend-ya-browser-server.log",
          );
        try {
          const response = await fetch(`${base}/api/listings`);
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
    let completedId = 0;
    try {
      await start();
      browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
      const ownerContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const borrowerContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
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
        await borrower
          .getByRole("button", { name: "Confirm and submit request" })
          .click();
        await borrower.waitForURL("**/bookings/*");
        const id = Number(new URL(borrower.url()).pathname.split("/").pop());
        await owner.goto(`${base}/bookings/${id}`);
        await owner.getByRole("button", { name: "Accept request" }).click();
        await expect(
          owner.getByRole("heading", { name: "Submit owner handoff" }),
        ).toBeVisible();
        return id;
      };
      const evidenceForm = async (
        page: Page,
        title: string,
        notes: string,
        acceptable?: boolean,
      ) => {
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
        await form.getByLabel(/Condition photos \(optional\)/).setInputFiles({
          name: "condition.png",
          mimeType: "image/png",
          buffer: image,
        });
        if (acceptable !== undefined)
          await form
            .getByRole("combobox", { name: "Inspection decision", exact: true })
            .selectOption(acceptable ? "acceptable" : "problem");
        await form.getByRole("checkbox").check();
        await expect(button).toBeEnabled();
        await button.click();
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
          await borrower.reload();
          await expect(
            borrower.getByText("Owner: scratch documented", { exact: true }),
          ).toBeVisible();
          await evidenceForm(
            borrower,
            "Confirm receipt as borrower",
            "Borrower: scratch acknowledged",
          );
          await expect(
            borrower.getByRole("heading", { name: "Submit item return" }),
          ).toBeVisible();
          await evidenceForm(
            borrower,
            "Submit item return",
            "Borrower: returned unchanged",
          );
          await owner.reload();
          await owner
            .getByRole("button", { name: "Begin return inspection" })
            .click();
          await evidenceForm(
            owner,
            "Save owner inspection decision",
            "Owner: return accepted",
            true,
          );
          await expect(
            owner.getByText("COMPLETED", { exact: true }),
          ).toBeVisible();
          await borrower.reload();
          await expect(
            borrower.getByText("COMPLETED", { exact: true }),
          ).toBeVisible();
          for (const page of [owner, borrower]) {
            await page
              .getByLabel("Comment", { exact: true })
              .fill("Browser verified review");
            await page
              .getByRole("button", { name: "Submit verified review" })
              .click();
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
        },
      );
      await t.test(
        "completed state, notes, reviews and private photos survive a full server restart",
        async () => {
          assert.ok(completedId);
          await stop();
          await start();
          const original = (await pool.query('SELECT "requestKey","listingId","meetingStationId","startAt","endAt",notes FROM "Booking" WHERE id=$1', [completedId])).rows[0];
          assert.ok(original.requestKey, "Browser creates a durable retry key");
          const replay = await borrower.request.post(`${base}/api/bookings`, {
            headers: { "Idempotency-Key": original.requestKey },
            data: { listingId: original.listingId, meetingStationId: original.meetingStationId, canonicalStationId: "taipei-main", startAt: original.startAt.toISOString(), endAt: original.endAt.toISOString(), notes: original.notes ?? "" },
          });
          assert.equal(replay.status(), 201);
          assert.equal((await replay.json()).booking.id, completedId);
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
            path: "/tmp/lend-ya-completed-mobile.png",
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
          await owner.reload();
          await owner
            .getByRole("button", { name: "Begin return inspection" })
            .click();
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
          await borrower.reload();
          await expect(
            borrower.getByText(/Administrative review is required/),
          ).toBeVisible();
          assert.equal(
            (await pool.query('SELECT status FROM "Booking" WHERE id=$1', [id]))
              .rows[0].status,
            "DISPUTED",
          );
        },
      );
    } finally {
      if (browser) await browser.close();
      await stop();
      closeSync(log);
      if (listingIds.length) {
        await pool.query(
          'DELETE FROM "Dispute" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=ANY($1::int[]))',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "ListingReport" WHERE "listingId"=ANY($1::int[])',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "VerifiedReview" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=ANY($1::int[]))',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "Booking" WHERE "listingId"=ANY($1::int[])',
          [listingIds],
        );
        await pool.query('DELETE FROM "Listing" WHERE id=ANY($1::int[])', [
          listingIds,
        ]);
      }
      await Promise.all(files.map((file) => unlink(file)));
      if (userIds.length)
        await pool.query('DELETE FROM "User" WHERE id=ANY($1::int[])', [
          userIds,
        ]);
      await pool.end();
    }
  },
);
