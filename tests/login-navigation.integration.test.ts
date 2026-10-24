import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium, expect, type Page } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import {
  loginDiagnostics,
  readyAuthenticationRoutes,
} from "./support/login-diagnostics";

test(
  "real authentication navigation, delayed RSC transport and repeat session boundaries",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      password = "Owned-navigation-fixture-93!";
    const register = async (role: "USER" | "ADMIN") => {
      const email = randomUUID() + "@fixture.test";
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Navigation fixture", email, password }),
      });
      assert.equal(r.status, 201);
      const { user } = await r.json();
      if (role === "ADMIN")
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      return { email, role };
    };
    const ordinary = await register("USER"),
      admin = await register("ADMIN");
    await readyAuthenticationRoutes(base);
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
      headless: true,
      args: ["--no-sandbox"],
    });
    const target = (actor: typeof ordinary) =>
      base + (actor.role === "ADMIN" ? "/admin" : "/dashboard");
    const login = async (page: Page, actor: typeof ordinary) => {
      await page.goto(base + "/login");
      await page.getByLabel("Email address", { exact: true }).fill(actor.email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Log in", exact: true })
        .click({ noWaitAfter: true });
    };
    const session = async (page: Page) => {
      const cookies = await page.context().cookies();
      assert.ok(
        cookies.some(
          (c) => c.name === "p2p_session" && c.httpOnly && c.sameSite === "Lax",
        ),
      );
      assert.equal(
        (await page.context().request.get(base + "/api/auth/me")).status(),
        200,
      );
    };
    try {
      await t.test(
        "controlled RSC timing distinguishes authenticated cookie success from committed navigation",
        async () => {
          const context = await browser.newContext(),
            page = await context.newPage(),
            save = await loginDiagnostics(page, db, "navigation-controlled");
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          let rscHeld = 0,
            documentTargets = 0;
          page.on("request", (r) => {
            if (
              r.isNavigationRequest() &&
              new URL(r.url()).pathname === "/dashboard"
            )
              documentTargets++;
          });
          await page.route("**/*", async (route) => {
            const r = route.request();
            if (
              r.headers()["rsc"] === "1" &&
              ["/dashboard", "/admin"].includes(new URL(r.url()).pathname)
            ) {
              rscHeld++;
              await gate;
              await route.continue().catch(() => {});
            } else await route.continue();
          });
          try {
            const response = page.waitForResponse(
              (r) =>
                new URL(r.url()).pathname === "/api/auth/login" &&
                r.request().method() === "POST",
            );
            await login(page, ordinary);
            assert.equal((await response).status(), 200);
            await session(page);
            if (process.env.LOGIN_NAV_EXPECT === "baseline") {
              await assert.rejects(() =>
                expect(page).not.toHaveURL(/\/login$/),
              );
              assert.ok(rscHeld > 0);
              assert.equal(documentTargets, 0);
              await save(
                "baseline-200-cookie-present-rsc-navigation-not-committed",
              );
            } else {
              await expect(page).toHaveURL(target(ordinary));
              assert.equal(documentTargets, 1);
              await session(page);
              await save("passed-document-navigation-with-rsc-stall");
              await page.reload();
              await expect(page).toHaveURL(target(ordinary));
              await session(page);
            }
          } finally {
            release();
            await context.close();
          }
        },
      );
      if (process.env.LOGIN_NAV_EXPECT === "baseline") return;
      await t.test(
        "legacy Admin uses the literal Admin target with fresh server-side session state",
        async () => {
          const context = await browser.newContext(),
            page = await context.newPage(),
            save = await loginDiagnostics(page, db, "navigation-admin");
          try {
            await login(page, admin);
            await expect(page).toHaveURL(target(admin));
            await expect(
              page.getByRole("heading", { name: "Overview", exact: true }),
            ).toBeVisible();
            await session(page);
            await page.reload();
            await expect(page).toHaveURL(target(admin));
            await save("passed-admin-reload");
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "logout clears authentication and a subsequent login establishes a new usable session",
        async () => {
          const context = await browser.newContext(),
            page = await context.newPage(),
            save = await loginDiagnostics(page, db, "navigation-logout-login");
          try {
            await login(page, ordinary);
            await expect(page).toHaveURL(target(ordinary));
            await session(page);
            const before = (await context.cookies()).find(
              (c) => c.name === "p2p_session",
            )!.value;
            await page
              .getByRole("button", { name: "Sign out", exact: true })
              .click();
            await expect(page).toHaveURL(base + "/login");
            assert.equal(
              (await context.request.get(base + "/api/auth/me")).status(),
              401,
            );
            await login(page, ordinary);
            await expect(page).toHaveURL(target(ordinary));
            await session(page);
            assert.notEqual(
              (await context.cookies()).find((c) => c.name === "p2p_session")!
                .value,
              before,
            );
            await save("passed-new-session-after-logout");
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "failed credentials stay on login and restore controls for a corrected explicit submission",
        async () => {
          const context = await browser.newContext(),
            page = await context.newPage();
          try {
            await page.goto(base + "/login");
            await page
              .getByLabel("Email address", { exact: true })
              .fill(ordinary.email);
            await page
              .getByLabel("Password", { exact: true })
              .fill("Incorrect-fixture-password");
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click({ noWaitAfter: true });
            await expect(
              page.getByText("Invalid email or password.", { exact: true }),
            ).toBeVisible();
            await expect(page).toHaveURL(base + "/login");
            await expect(
              page.getByRole("button", { name: "Log in", exact: true }),
            ).toBeEnabled();
            assert.equal(
              (await context.request.get(base + "/api/auth/me")).status(),
              401,
            );
            await page.getByLabel("Password", { exact: true }).fill(password);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click({ noWaitAfter: true });
            await expect(page).toHaveURL(target(ordinary));
            await session(page);
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "registration shares the same fresh-document authentication boundary",
        async () => {
          const context = await browser.newContext(),
            page = await context.newPage(),
            email = randomUUID() + "@fixture.test";
          try {
            await page.goto(base + "/register");
            await page
              .getByLabel("Full name", { exact: true })
              .fill("Registration navigation fixture");
            await page.getByLabel("Email address", { exact: true }).fill(email);
            await page.getByLabel("Password", { exact: true }).fill(password);
            await page
              .getByRole("button", { name: "Create account", exact: true })
              .click({ noWaitAfter: true });
            await expect(page).toHaveURL(base + "/dashboard");
            await session(page);
            const me = await page.context().request.get(base + "/api/auth/me");
            assert.equal((await me.json()).user.role, "USER");
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "six fresh browser contexts submit immediately when hydration permits and commit exact redirects",
        async () => {
          for (let n = 0; n < 6; n++) {
            const context = await browser.newContext(),
              page = await context.newPage(),
              actor = n % 2 ? admin : ordinary,
              save = await loginDiagnostics(page, db, "navigation-repeat-" + n);
            try {
              await login(page, actor);
              await expect(page).toHaveURL(target(actor));
              await session(page);
              await save("passed-fresh-context");
            } finally {
              await context.close();
            }
          }
        },
      );
    } finally {
      await browser.close();
      await db.end();
    }
  },
);
