import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { loginDiagnostics } from "./support/login-diagnostics";
test(
  "real login delayed-hydration reproduction and repeat navigation/cookie evidence",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      email = randomUUID() + "@fixture.test",
      password = "Owned-login-fixture-93!";
    const register = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Login fixture", email, password }),
    });
    assert.equal(register.status, 201);
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });
    try {
      const context = await browser.newContext(),
        page = await context.newPage();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = 0;
      await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
        held++;
        await gate;
        await route.continue();
      });
      const finish = await loginDiagnostics(page, db, "delayed-hydration");
      await page.goto(base + "/login", { waitUntil: "commit" });
      const submit = page.getByRole("button", { name: "Log in", exact: true });
      await expect(submit).toBeVisible();
      if (process.env.AUTH_READINESS_EXPECT === "baseline") {
        await page.getByLabel("Email address", { exact: true }).fill(email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await expect(submit).toBeEnabled();
        const navigation = page.waitForRequest(
          (r) =>
            r.isNavigationRequest() && new URL(r.url()).pathname === "/login",
        );
        await submit.click({ noWaitAfter: true });
        await navigation;
        const evidence = await finish(
          "baseline-native-reload-without-login-post",
        );
        assert.equal(evidence.cookiePresent, false);
        assert.equal(
          evidence.events.some(
            (e) =>
              (e as { method?: string; path?: string }).method === "POST" &&
              (e as { path?: string }).path === "/api/auth/login",
          ),
          false,
        );
        release();
        return;
      }
      await expect(submit).toBeDisabled();
      await expect(
        page.getByLabel("Email address", { exact: true }),
      ).toBeDisabled();
      assert.ok(held > 0);
      release();
      await expect(submit).toBeEnabled();
      await page.getByLabel("Email address", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await submit.click({ noWaitAfter: true });
      await expect(page).not.toHaveURL(/\/login$/);
      const evidence = await finish("fixed-delayed-hydration-login");
      assert.equal(evidence.cookiePresent, true);
      assert.ok(
        evidence.events.some(
          (e) =>
            (e as { status?: number; path?: string }).status === 200 &&
            (e as { path?: string }).path === "/api/auth/login",
        ),
      );
      for (let n = 0; n < 6; n++) {
        const c = await browser.newContext(),
          p = await c.newPage(),
          save = await loginDiagnostics(p, db, "repeat-" + n);
        await p.goto(base + "/login");
        await p.getByLabel("Email address", { exact: true }).fill(email);
        await p.getByLabel("Password", { exact: true }).fill(password);
        await p
          .getByRole("button", { name: "Log in", exact: true })
          .click({ noWaitAfter: true });
        await expect(p).not.toHaveURL(/\/login$/);
        const saved = await save("passed");
        assert.equal(saved.cookiePresent, true);
        await c.close();
      }
    } finally {
      await browser.close();
      await db.end();
    }
  },
);
