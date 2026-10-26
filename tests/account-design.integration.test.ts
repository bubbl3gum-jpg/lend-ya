import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";

test(
  "account catalogue: actual saving, responsive themes, navigation and clean authorization boundary",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase();
    const browser = await launchBrowser();
    const base = process.env.TEST_BASE_URL!;
    const artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const errors: string[] = [];
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    collectBrowserErrors(context, errors);
    try {
      const anonymous = await fetch(base + "/account", { redirect: "manual" });
      assert.equal(anonymous.status, 307);
      const denied = await fetch(base + "/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ name: "forged" }),
      });
      assert.equal(denied.status, 401);
      const response = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({
          name: "Catalogue reader",
          email: randomUUID() + "@fixture.test",
          password: "Owned-catalogue-fixture-93!",
        }),
      });
      assert.equal(response.status, 201);
      const { user } = await response.json();
      const token = response.headers
        .get("set-cookie")!
        .match(/p2p_session=([^;]+)/)![1];
      await context.addCookies([
        { name: "p2p_session", value: token, url: base },
      ]);
      const page = await context.newPage();
      await page.goto(base + "/account");
      await expect(
        page.getByRole("heading", { name: "Your account", exact: true }),
      ).toBeVisible();
      const root = page.locator(".catalogue");
      await page
        .getByLabel("Appearance", { exact: true })
        .selectOption("light");
      await expect(root).toHaveAttribute("data-theme", "light");
      const name = page.getByLabel("Display name", { exact: true });
      await expect(name).toHaveValue("Catalogue reader");
      await page.screenshot({
        path: path.join(artifact, "account-light-desktop.png"),
        fullPage: true,
      });
      await name.fill("Garden neighbour");
      await expect(
        page.getByText("Unsaved changes", { exact: true }),
      ).toBeVisible();
      await name.focus();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Save settings" }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(name).toBeFocused();
      assert.notEqual(
        await name.evaluate((e) => getComputedStyle(e).outlineStyle),
        "none",
      );
      await page.screenshot({
        path: path.join(artifact, "account-focused-unsaved.png"),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("status")).toHaveText("Settings saved.");
      assert.equal(
        (await db.query('SELECT name FROM "User" WHERE id=$1', [user.id]))
          .rows[0].name,
        "Garden neighbour",
      );
      await page.getByLabel("Appearance", { exact: true }).focus();
      await page.keyboard.press("End");
      await expect(root).toHaveAttribute("data-theme", "dark");
      await page.screenshot({
        path: path.join(artifact, "account-dark-desktop.png"),
        fullPage: true,
      });
      await page.reload();
      await expect(root).toHaveAttribute("data-theme", "dark");
      await expect(name).toHaveValue("Garden neighbour");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await name.evaluate((e) => getComputedStyle(e).transitionDuration),
        "0s",
      );
      for (const [label, width, height] of [
        ["tablet", 820, 1180],
        ["mobile", 390, 844],
      ] as const) {
        await page.setViewportSize({ width, height });
        for (const theme of ["dark", "light"]) {
          if ((await root.getAttribute("data-theme")) !== theme)
            await page
              .getByLabel("Appearance", { exact: true })
              .selectOption(theme);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await page.screenshot({
            path: path.join(artifact, `account-${theme}-${label}.png`),
            fullPage: true,
          });
        }
      }
      await page
        .getByText("Account center · Garden neighbour", { exact: true })
        .click();
      await page.screenshot({
        path: path.join(artifact, "account-mobile-navigation.png"),
        fullPage: true,
      });
      await expect(
        page.getByRole("link", { name: "Public profile view" }),
      ).toBeVisible();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Activity logs", exact: true })
        .click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Activity logs" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: "Account sections" })
          .getByRole("link", { name: "Activity logs", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await page
        .getByRole("navigation", { name: "Account sections" })
        .getByRole("link", { name: "Trust & verification", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Trustworthiness & profile verification",
        }),
      ).toBeVisible();
      await page.goto(base + "/account");
      // Native browser constraint validation prevents empty input from reaching the API.
      await name.fill("");
      await page.getByRole("button", { name: "Save settings" }).click();
      assert.equal(
        await name.evaluate((e: HTMLInputElement) => e.validity.valueMissing),
        true,
      );
      await name.fill("Unsaved retry");
      // Transport outage is an explicit UI fixture, never a mock authorization success.
      await page.route("**/api/account", (route) =>
        route.abort("internetdisconnected"),
      );
      const before = errors.length;
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("Your changes are still here");
      await expect(name).toHaveValue("Unsaved retry");
      await page.screenshot({
        path: path.join(artifact, "account-save-error.png"),
        fullPage: true,
      });
      const expectedOutage = errors.splice(before);
      assert.ok(expectedOutage.length > 0);
      assert.ok(
        expectedOutage.every(
          (e) =>
            e.includes("/api/account") ||
            e.includes("ERR_INTERNET_DISCONNECTED"),
        ),
      );
      await page.unroute("**/api/account");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByRole("status")).toHaveText("Settings saved.");
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect(page).toHaveURL(base + "/login");
      assert.equal(await page.locator(".catalogue").count(), 0);
      assert.deepEqual(errors, []);
      await writeFile(
        path.join(artifact, "account-design.json"),
        JSON.stringify(
          {
            anonymousDenied: true,
            ownNamePersisted: true,
            themesPersisted: true,
            widths: [1440, 820, 390],
            keyboardFocus: true,
            reducedMotion: true,
            nativeValidation: true,
            outageRetainsInput: true,
            retrySaved: true,
            actualLogout: true,
            browserErrors: errors,
          },
          null,
          2,
        ),
      );
    } finally {
      await browser.close();
      await db.end();
    }
  },
);
