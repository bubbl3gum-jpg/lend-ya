import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { prisma } from "../lib/prisma";
import { preparePasswordRecovery } from "../lib/password-recovery";
import { hashPassword, verifyPassword } from "../lib/password";
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
  const credentials: string[] = [];
  let leakedURL = false, leakedConsole = false, resetCalls = 0;
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (credentials.some(value => message.text().includes(value))) leakedConsole = true; });
  page.on("request", request => {
    if (credentials.some(value => request.url().includes(value))) leakedURL = true;
    if (new URL(request.url()).pathname === "/api/auth/reset-password") resetCalls++;
  });
  const state = (value: string) => expect(page.locator(".auth-reset")).toHaveAttribute("data-reset-state", value);
  const submit = () => page.getByRole("button", { name: "Update password", exact: true }).click();
  const newPassword = " NewPassword2 " + randomBytes(8).toString("hex");
  credentials.push(newPassword);
  const fill = async () => {
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  };
  const open = async (token?: string) => {
    if (token) credentials.push(token);
    await page.goto(baseURL + "/reset-password" + (token ? `#token=${token}` : ""));
    await state(token ? "form" : "invalid");
    assert.equal(page.url() === baseURL + "/reset-password", true, "Recovery URL was not cleared");
  };
  const capture = async (name: string) => {
    await page.addStyleTag({ content: "nextjs-portal { visibility: hidden; }" });
    await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
  };
  let fixtureCount = 0;
  async function fixture() {
    fixtureCount++;
    const user = await prisma.user.create({ data: {
      name: "Synthetic reset-screen fixture", email: `reset-screen-${fixtureCount}-${process.env.MRT_TEST_RUN_ID}@example.test`,
      passwordHash: await hashPassword("OriginalPassword1"),
    } });
    const recovery = await preparePasswordRecovery(prisma, { email: user.email, ipAddress: "192.0.2.77" });
    assert.ok(recovery, "Owned fixture credential was not prepared");
    credentials.push(recovery.token);
    return { user, token: recovery.token };
  }
  try {
    assert.equal(process.env.RECOVERY_EMAIL_MODE, "disabled");
    assert.equal(process.env.RESEND_API_KEY, "not-a-real-api-key");
    await verifyApplicationDatabase(browser, prisma, baseURL, process.env.MRT_TEST_RUN_ID!);
    const response = await context.request.get("/reset-password");
    assert.equal(response.status(), 200);
    assert.equal(response.headers()["referrer-policy"], "no-referrer");
    assert.match(response.headers()["cache-control"], /no-store/);
    assert.match(response.headers()["x-robots-tag"], /noindex/);
    await open();
    await expect(page.locator(".auth-feedback")).toBeFocused();
    await expect(page.getByRole("link", { name: "Request a new recovery link" })).toBeVisible();
    assert.equal(resetCalls, 0);
    await capture("reset-invalid-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture("reset-invalid-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(baseURL + "/reset-password#token=malformed"); await state("invalid");
    await page.goto(baseURL + "/reset-password?token=query-credentials-not-accepted"); await state("invalid");
    assert.equal(page.url() === baseURL + "/reset-password", true);
    checks.push("Missing/malformed/query-only links never submit; URL is scrubbed, feedback focused and reset response is no-store/no-referrer/noindex.");

    const first = await fixture();
    await open(first.token);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeFocused();
    assert.equal(await page.evaluate(value => JSON.stringify({ html: document.documentElement.outerHTML, local: { ...localStorage }, session: { ...sessionStorage }, history: history.state }).includes(value), first.token), false);
    await capture("reset-form-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture("reset-form-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(resetCalls, 0);
    await submit();
    await expect(page.getByLabel("New password", { exact: true })).toBeFocused();
    await expect(page.locator("#reset-password-error")).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("lowercase1"); await submit();
    await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("New password", { exact: true }).fill("A1" + "x".repeat(127)); await submit();
    await expect(page.locator("#reset-password-error")).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill("DifferentPassword3"); await submit();
    await expect(page.getByLabel("Confirm new password", { exact: true })).toBeFocused();
    await expect(page.locator("#reset-confirmation-error")).toBeVisible();
    assert.equal(resetCalls, 0);
    await fill();
    await page.getByRole("button", { name: "Show new password", exact: true }).click();
    await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide new password", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Hide new password", exact: true }).click();
    await page.getByRole("button", { name: "Show confirmation", exact: true }).click();
    await expect(page.getByLabel("Confirm new password", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide confirmation", exact: true }).click();
    checks.push("Canonical token is memory-only and not consumed on opening; raw password policy, length, confirmation, focus and independent visibility controls are enforced before POST.");

    const sessions = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
    await prisma.authSession.createMany({ data: sessions.map(value => ({ userId: first.user.id,
      tokenHash: createHash("sha256").update(value).digest("hex"), expiresAt: new Date(Date.now() + 600_000) })) });
    await context.addCookies([{ name: "p2p_session", value: sessions[0], url: baseURL, httpOnly: true, sameSite: "Lax" }]);
    await submit(); await state("success");
    assert.equal(resetCalls, 1);
    assert.equal(await verifyPassword(newPassword, (await prisma.user.findUniqueOrThrow({ where: { id: first.user.id } })).passwordHash), true);
    assert.equal(await prisma.passwordRecovery.count({ where: { userId: first.user.id } }), 0);
    assert.equal(await prisma.authSession.count({ where: { userId: first.user.id } }), 0);
    assert.equal((await context.request.get("/api/auth/me")).status(), 401);
    assert.equal(await prisma.emailOutbox.count(), 0);
    await expect(page.locator(".auth-feedback")).toBeFocused();
    await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
    await capture("reset-success-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture("reset-success-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("link", { name: "Back to sign in", exact: true }).click();
    await expect(page).toHaveURL(baseURL + "/login");
    checks.push("Real existing API consumes token, preserves exact password including spaces, revokes sessions and clears cookie; focused success clears fields and returns explicitly to sign-in without auto-login or queued mail.");

    await open(first.token); await fill(); await submit(); await state("invalid");
    const expired = await fixture();
    await prisma.passwordRecovery.update({ where: { userId: expired.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await open(expired.token); await fill(); await submit(); await state("invalid");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: expired.user.id } })).passwordHash === expired.user.passwordHash, true);
    checks.push("Used and expired valid-looking credentials produce the same invalid-link UI on submission; expiry failure does not change the password.");

    const refresh = await fixture(); await open(refresh.token);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.reload(); await state("invalid");
    await open(refresh.token);
    await expect(page.getByLabel("New password", { exact: true })).toHaveValue("");
    await page.goto(baseURL + "/login"); await page.goBack(); await state("invalid");
    await open(refresh.token);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    await state("invalid");
    checks.push("Reload/back/cache restoration loses sensitive state safely; reopening the original unconsumed email fragment works, with empty password fields.");

    const beforePending = resetCalls;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/auth/reset-password", async route => { await gate; await route.fulfill({ status: 403, body: "untrusted" }); });
    await open(refresh.token); await fill(); await submit(); await state("pending");
    await expect(page.getByLabel("New password", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Show new password", exact: true })).toBeDisabled();
    await page.keyboard.press("Enter");
    assert.equal(resetCalls, beforePending + 1);
    release(); await state("unavailable");
    await expect(page.locator(".auth-feedback")).toBeFocused();
    await expect(page.getByRole("button", { name: "Update password", exact: true })).toHaveCount(0);
    await page.unroute("**/api/auth/reset-password");
    checks.push("Pending fence prevents duplicate submissions, disables fields/toggles, and maps a refused request to focused safe feedback without raw error text.");

    for (const response of ["network", "503", "unreadable"] as const) {
      await page.route("**/api/auth/reset-password", route => response === "network" ? route.abort() : route.fulfill({ status: response === "503" ? 503 : 200, body: "not JSON; never show this" }));
      await open(refresh.token); await fill(); const before: number = resetCalls; await submit(); await state("uncertain");
      await expect(page.locator(".auth-feedback")).toBeFocused();
      await expect(page.locator(".auth-feedback")).toContainText("may have changed");
      await expect(page.getByRole("button", { name: "Update password", exact: true })).toHaveCount(0);
      await page.keyboard.press("Enter");
      assert.equal(resetCalls, before + 1);
      await page.unroute("**/api/auth/reset-password");
    }
    checks.push("Network/503/unreadable-success responses clear fields and token, explain uncertainty and offer sign-in/new-link actions with no replay.");

    // Exercise a real committed reset whose response never reaches the browser.
    const lost = await fixture();
    let committed!: () => void, finish!: () => void;
    const committedGate = new Promise<void>(resolve => { committed = resolve; });
    const finishGate = new Promise<void>(resolve => { finish = resolve; });
    await page.route("**/api/auth/reset-password", async route => {
      const response = await route.fetch();
      assert.equal(response.status(), 200, "Owned lost-response fixture did not commit");
      committed(); await finishGate; await route.abort().catch(() => {});
    });
    await open(lost.token); await fill(); const beforeLost = resetCalls; await submit();
    await committedGate;
    await page.clock.runFor(15_001); await state("uncertain");
    assert.equal(resetCalls, beforeLost + 1);
    assert.equal(await verifyPassword(newPassword, (await prisma.user.findUniqueOrThrow({ where: { id: lost.user.id } })).passwordHash), true);
    assert.equal(await prisma.passwordRecovery.count({ where: { userId: lost.user.id } }), 0);
    await capture("reset-uncertain-desktop");
    await page.setViewportSize({ width: 390, height: 844 }); await capture("reset-uncertain-mobile");
    finish(); await page.unroute("**/api/auth/reset-password");
    checks.push("Real reset committed behind a deliberately lost response: timeout shows uncertainty, never claims failure/unchanged password and performs exactly one browser submission.");

    for (const theme of ["light", "dark"] as const) {
      await context.addCookies([{ name: "hustlen_appearance", value: theme, url: baseURL }]);
      await page.goto(baseURL + "/login"); // Appearance is read on a new document, not a fragment navigation.
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await open(refresh.token);
        await expect(page.locator(".heritage")).toHaveAttribute("data-theme", theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await expect(page.getByLabel("New password", { exact: true })).toHaveCSS("font-size", "16px");
        assert.ok((await page.getByRole("button", { name: "Update password", exact: true }).boundingBox())!.height >= 44);
        await page.getByRole("button", { name: "Show new password", exact: true }).focus(); await page.keyboard.press("Enter");
        await expect(page.getByLabel("New password", { exact: true })).toHaveAttribute("type", "text");
        await page.getByRole("button", { name: "Hide new password", exact: true }).click();
        if (theme === "dark" && width !== 320) await capture(`reset-form-${width === 1440 ? "desktop" : "mobile"}-dark`);
      }
    }
    assert.equal(leakedURL, false); assert.equal(leakedConsole, false);
    assert.equal(await page.evaluate(values => values.some(value => JSON.stringify({ html: document.documentElement.outerHTML, local: { ...localStorage }, session: { ...sessionStorage }, history: history.state }).includes(value)), credentials), false);
    const serverLog = await readFile(path.join(artifactDir, "server.log"), "utf8");
    assert.equal(credentials.some(value => serverLog.includes(value)), false);
    assert.equal(await prisma.emailOutbox.count(), 0);
    assert.deepEqual(errors, []);
    checks.push("Light/dark, 1440/390/320px, keyboard visibility toggles and reduced motion; no horizontal overflow, browser exceptions, credential URLs/DOM/storage/history/console/server logs or outbound email jobs.");
    await writeFile(path.join(artifactDir, "password-reset-ui.json"), JSON.stringify({ passed: true, checks, screenshots: "screenshots/", emailMode: "disabled", fixtureTokens: "internal preparation only; no request/email E2E" }, null, 2));
    console.log(JSON.stringify({ passed: true, checks }, null, 2));
  } finally {
    await context.close(); await browser.close(); await prisma.$disconnect(); await db.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
