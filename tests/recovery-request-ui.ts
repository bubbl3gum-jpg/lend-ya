import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { prisma } from "../lib/prisma";
import { launchBrowser } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { verifyApplicationDatabase } from "./support/application-database";

async function main() {
  const db = await connectTestDatabase();
  const browser = await launchBrowser();
  const baseURL = process.env.MRT_TEST_URL!;
  const artifactDir = process.env.MRT_TEST_ARTIFACT_DIR!;
  const screenshots = path.join(artifactDir, "screenshots");
  await mkdir(screenshots, { recursive: true });
  const checks: string[] = [];
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "hustlen_appearance", value: "light", url: baseURL }]);
  const page = await context.newPage();
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const capture = async (name: string) => {
    // Hide only Next's development toolbar, never application states or feedback.
    await page.addStyleTag({ content: "nextjs-portal { visibility: hidden; }" });
    return page.screenshot({ path: path.join(screenshots, name + ".png"), fullPage: true });
  };
  try {
    assert.equal(process.env.RECOVERY_EMAIL_MODE, "disabled");
    assert.equal(process.env.RESEND_API_KEY, "not-a-real-api-key");
    await verifyApplicationDatabase(browser, prisma, baseURL, process.env.MRT_TEST_RUN_ID!);
    await page.goto("/login");
    await page.locator('[data-auth-ready="true"]').waitFor();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await capture("login-desktop");
    await page.getByLabel("Email address", { exact: true }).fill("nonexistent-step1@example.test");
    await page.getByLabel("Password", { exact: true }).fill("IncorrectPassword1");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.locator(".auth-entry").getByRole("alert")).toHaveText("Invalid email or password.");
    await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
    assert.equal((await context.request.get("/api/auth/me")).status(), 401);
    checks.push("Real failed login preserves anonymous session, displays error, focuses feedback and restores submission.");
    await page.route("**/api/auth/login", route => route.abort());
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.locator(".auth-entry").getByRole("alert")).toContainText("Check your connection");
    await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
    await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("nonexistent-step1@example.test");
    await page.unroute("**/api/auth/login");
    checks.push("Login network failure has readable feedback, preserved input and an explicit retry.");
    await page.getByRole("link", { name: "Forgot your password?" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(baseURL + "/forgot-password");
    await page.locator('[data-recovery-ready="true"]').waitFor();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await capture("recovery-desktop");
    checks.push("Keyboard login link opens a dedicated, titled recovery page without modal focus trapping.");

    const submit = page.getByRole("button", { name: "Request recovery email", exact: false });
    await submit.click();
    await expect(page.getByLabel("Email address", { exact: true })).toBeFocused();
    await page.getByLabel("Email address", { exact: true }).fill("synthetic-step1@example.test");
    // Real disabled API: no outbox job or account lookup result is exposed.
    await submit.click();
    await expect(page.locator(".auth-entry").getByRole("alert")).toContainText("temporarily unavailable");
    await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
    await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("synthetic-step1@example.test");
    assert.equal(await prisma.emailOutbox.count(), 0);
    await capture("recovery-unavailable-desktop");
    checks.push("Native required-email validation and real disabled-delivery response; preserved email, focused error, zero queued email.");

    await page.route("**/api/auth/forgot-password", route => route.abort());
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator(".auth-entry").getByRole("alert")).toContainText("Check your connection");
    await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
    await page.unroute("**/api/auth/forgot-password");
    checks.push("Network failure offers an explicit retry and preserves input without claiming success.");

    for (const [status, message] of [[400, "Check your email address"], [429, "Please wait"], [500, "couldn’t process"]] as const) {
      await page.route("**/api/auth/forgot-password", route => route.fulfill({ status, body: "untrusted response must not be displayed" }));
      await page.getByRole("button", { name: "Try again" }).click();
      await expect(page.locator(".auth-entry").getByRole("alert")).toContainText(message);
      await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
      await expect(page.getByText("untrusted response must not be displayed")).toHaveCount(0);
      await page.unroute("**/api/auth/forgot-password");
    }
    checks.push("Malformed/rate-limited/server responses map to safe distinct UI feedback, never raw response content.");

    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    await page.route("**/api/auth/forgot-password", async route => {
      calls++;
      assert.deepEqual(route.request().postDataJSON(), { email: "synthetic-step1@example.test" });
      await held;
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ message: "neutral" }) });
    });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Requesting…", exact: false })).toBeDisabled();
    await page.keyboard.press("Enter");
    assert.equal(calls, 1);
    release();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.locator(".auth-received")).toBeFocused();
    await expect(page.locator(".auth-received")).toContainText("If an account matches");
    await capture("recovery-received-desktop");
    checks.push("Simulated neutral 202 and pending duplicate-submit protection; focused confirmation promises neither account existence nor delivery.");
    await page.getByRole("button", { name: "Check or change email" }).click();
    await expect(page.getByLabel("Email address", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("synthetic-step1@example.test");
    await expect(submit).toBeDisabled();
    await page.clock.runFor(61_000);
    await expect(submit).toBeEnabled();
    assert.equal(calls, 1);
    checks.push("Changing email restores input focus; one-minute local cooldown unlocks without automatic resubmission.");
    await page.unroute("**/api/auth/forgot-password");

    let finishTimeout!: () => void;
    const delayed = new Promise<void>(resolve => { finishTimeout = resolve; });
    await page.route("**/api/auth/forgot-password", async route => {
      await delayed;
      // The browser may have already cancelled the timed-out request.
      await route.fulfill({ status: 202, body: "{}" }).catch(() => {});
    });
    await submit.click();
    await page.clock.runFor(15_001);
    await expect(page.locator(".auth-entry").getByRole("alert")).toContainText("It may have been received");
    await expect(page.getByRole("button", { name: "Try again" })).toBeDisabled();
    await expect(page.locator(".auth-entry").getByRole("alert")).toBeFocused();
    finishTimeout();
    await page.unroute("**/api/auth/forgot-password");
    checks.push("Timed-out request reports an ambiguous outcome, restores focus and enforces a cooldown without replay.");

    for (const theme of ["light", "dark"] as const) {
      await context.addCookies([{ name: "hustlen_appearance", value: theme, url: baseURL }]);
      await page.setViewportSize({ width: 390, height: 844 });
      for (const route of ["/login", "/forgot-password"]) {
        await page.goto(route);
        await page.locator(route === "/login" ? '[data-auth-ready="true"]' : '[data-recovery-ready="true"]').waitFor();
        await expect(page.locator(".heritage")).toHaveAttribute("data-theme", theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const input = page.getByLabel("Email address", { exact: true });
        await expect(input).toHaveCSS("font-size", "16px");
        const button = page.getByRole("button", { name: route === "/login" ? "Log in" : "Request recovery email", exact: false });
        assert.ok((await button.boundingBox())!.height >= 44);
        await capture(`${route === "/login" ? "login" : "recovery"}-mobile-${theme}`);
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Skip to form" })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("main")).toBeFocused();
      }
    }
    checks.push("390px mobile light/dark routes have no horizontal overflow, 16px email fields and >=44px primary targets under reduced motion.");
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    // Email and password are never persisted by the UI to web storage.
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => String(value).includes("synthetic-step1"))), false);
    assert.equal((await context.request.get("/reset-password")).status(), 404);
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.locator(".auth-entry")).toHaveCount(0);
    assert.deepEqual(errors, []);
    checks.push("320px viewport, unchanged registration styling, no credential storage, no browser errors and Step 2 route remains unimplemented.");
    await writeFile(path.join(artifactDir, "recovery-request-ui.json"), JSON.stringify({ passed: true, checks, screenshots: "screenshots/", emailMode: "disabled", mockedAcceptance: true }, null, 2));
    console.log(JSON.stringify({ passed: true, checks }, null, 2));
  } finally {
    await context.close(); await browser.close(); await prisma.$disconnect(); await db.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
