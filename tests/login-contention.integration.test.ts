import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium, expect } from "@playwright/test";
import { browserLaunchOptions } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { loginDiagnostics } from "./support/login-diagnostics";
test(
  "11F cold/warm document login under recorded overlapping workload, unchanged five-second assertion",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase(),
      browser = await chromium.launch(
        browserLaunchOptions(process.env.MRT_BROWSER_PATH),
      ),
      base = process.env.TEST_BASE_URL!,
      art = process.env.MRT_TEST_ARTIFACT_DIR!,
      email = randomUUID() + "@fixture.test",
      password = "Owned-login-load-11f!";
    const r = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Login timing fixture", email, password }),
    });
    assert.equal(r.status, 201);
    const results: object[] = [];
    try {
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext(),
          errors: string[] = [];
        context.on("page", (page) => {
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("console", (m) => {
            if (m.type() === "error") errors.push(m.text());
          });
          page.on("response", (r) => {
            if (r.status() >= 400)
              errors.push(`${r.status()} ${new URL(r.url()).pathname}`);
          });
          page.on("requestfailed", (r) => {
            if (r.failure()?.errorText !== "net::ERR_ABORTED")
              errors.push(
                `${r.method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`,
              );
          });
        });
        const page = await context.newPage(),
          finish = await loginDiagnostics(page, db, "contention-" + i);
        let outcome = "failed";
        const pageStart = Date.now();
        let clickStart: number | undefined;
        try {
          await page.goto(base + "/login");
          await expect(
            page.getByRole("button", { name: "Log in", exact: true }),
          ).toBeEnabled();
          const ready = await page
            .locator("form[data-auth-ready]")
            .getAttribute("data-auth-ready");
          assert.equal(ready, "true");
          await page.getByLabel("Email address", { exact: true }).fill(email);
          await page.getByLabel("Password", { exact: true }).fill(password);
          clickStart = Date.now();
          await page
            .getByRole("button", { name: "Log in", exact: true })
            .click({ noWaitAfter: true });
          await expect(page).not.toHaveURL(/\/login$/, { timeout: 5000 });
          outcome = "passed";
          assert.deepEqual(errors, []);
        } finally {
          const evidence = await finish(outcome);
          results.push({
            index: i,
            phase: i === 0 ? "cold login/dashboard paths" : "warm paths",
            outcome,
            elapsedToHydrationAndFillMs:
              clickStart === undefined ? null : clickStart - pageStart,
            clickToObservationMs:
              clickStart === undefined ? null : Date.now() - clickStart,
            cookiePresent: evidence.cookiePresent,
            hostLoadAverage: os.loadavg(),
            cpuCount: os.cpus().length,
            unexpectedBrowserErrors: errors.length,
          });
          await context.close();
        }
      }
    } finally {
      const log = await readFile(path.join(art, "server.log"), "utf8");
      const lines = log
        .split("\n")
        .map((line) => line.trim())
        .filter((line) =>
          /^(?:GET \/(?:dashboard|login)|POST \/api\/auth\/login) \d{3} in /.test(
            line,
          ),
        )
        .slice(-16)
        .map((line) => line.slice(0, 240));
      await writeFile(
        path.join(art, "login-contention.json"),
        JSON.stringify(
          {
            assertionMs: 5000,
            anonymousDestinationWarming: false,
            syntheticAuthResponse: false,
            attempts: results,
            serverTimingLines: lines,
            workload: process.env.HUSTLEN_REVIEW_WORKLOAD ?? "unspecified",
            conclusion:
              "This bounded trial does not by itself establish or close the historical intermittence root cause.",
          },
          null,
          2,
        ),
      );
      await browser.close();
      await db.end();
    }
  },
);
