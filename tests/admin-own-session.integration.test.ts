import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import {
  loginDiagnostics,
  readyAuthenticationRoutes,
} from "./support/login-diagnostics";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
test(
  "Admin own-session overview: private projection, denial and real browser navigation",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!;
    const artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const password = "Owned-security-fixture-93!";
    const actor = async (role: "USER" | "ADMIN") => {
      const email = randomUUID() + "@fixture.test";
      const response = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Security overview fixture",
          email,
          password,
        }),
      });
      assert.equal(response.status, 201);
      const token = response.headers
        .get("set-cookie")!
        .match(/p2p_session=([^;]+)/)![1];
      const { user } = await response.json();
      if (role === "ADMIN")
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      return {
        id: user.id as number,
        email,
        token,
        cookie: "p2p_session=" + token,
      };
    };
    const admin = await actor("ADMIN"),
      ordinary = await actor("USER"),
      foreign = await actor("ADMIN");
    const read = (cookie?: string, suffix = "") =>
      fetch(base + "/api/admin/account-security" + suffix, {
        headers: cookie ? { Cookie: cookie } : {},
      });
    const pageRead = (cookie?: string, suffix = "") =>
      fetch(base + "/admin/account-security" + suffix, {
        redirect: "manual",
        headers: cookie ? { Cookie: cookie } : {},
      });
    const privateHeaders = (response: Response, html = false) => {
      // Next dev owns HTML Cache-Control and replaces it with no-store
      // (installed base-server.js). Actual production HTML is checked separately.
      if (!html)
        assert.match(response.headers.get("cache-control") ?? "", /private/);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      if (!html) assert.match(response.headers.get("vary") ?? "", /cookie/i);
    };
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      await t.test(
        "only the exact current session's persisted timestamps and explicit unavailable passkey state are returned",
        async () => {
          await db.query(
            `UPDATE "AuthSession" SET "createdAt"='2001-02-03T04:05:06Z' WHERE "tokenHash"=$1`,
            [digest(foreign.token)],
          );
          const expected = (
            await db.query(
              `SELECT "createdAt","expiresAt" FROM "AuthSession" WHERE "tokenHash"=$1`,
              [digest(admin.token)],
            )
          ).rows[0];
          const before = (
            await db.query(`SELECT count(*)::int n FROM "AuthSession"`)
          ).rows[0].n;
          const response = await read(admin.cookie);
          assert.equal(response.status, 200);
          privateHeaders(response);
          const summary = await response.json();
          assert.deepEqual(summary, {
            status: "AUTHENTICATED",
            createdAt: expected.createdAt.toISOString(),
            expiresAt: expected.expiresAt.toISOString(),
            passkeyStatus: "UNAVAILABLE",
          });
          const foreignResponse = await read(foreign.cookie);
          assert.equal(foreignResponse.status, 200);
          assert.equal(
            (await foreignResponse.json()).createdAt,
            "2001-02-03T04:05:06.000Z",
          );
          assert.deepEqual(await (await read(admin.cookie)).json(), summary);
          const page = await pageRead(admin.cookie);
          assert.equal(page.status, 200);
          privateHeaders(page, true);
          const html = await page.text();
          assert.ok(html.includes("Your current session"));
          for (const forbidden of [
            admin.token,
            digest(admin.token),
            foreign.token,
            digest(foreign.token),
            foreign.email,
            "2001-02-03",
            '"tokenHash"',
            '"credentialKey"',
          ])
            assert.ok(!html.includes(forbidden));
          for (const selector of [
            "userId=" + foreign.id,
            "sessionId=1",
            "role=SUPER_ADMIN",
            "assurance=WEBAUTHN_UV",
            "credentialId=forged",
          ]) {
            const rejected = await read(admin.cookie, "?" + selector);
            assert.equal(rejected.status, 400);
            privateHeaders(rejected);
          }
          const ignored = await pageRead(
            admin.cookie,
            "?userId=" + foreign.id + "&sessionId=1&assurance=WEBAUTHN_UV",
          );
          const ignoredBody = await ignored.text();
          assert.ok(!ignoredBody.includes("2001-02-03"));
          assert.ok(ignoredBody.includes("Passkey status unavailable here"));
          assert.equal(
            (await db.query(`SELECT count(*)::int n FROM "AuthSession"`))
              .rows[0].n,
            before,
          );
          const after = (
            await db.query(
              `SELECT "createdAt","expiresAt" FROM "AuthSession" WHERE "tokenHash"=$1`,
              [digest(admin.token)],
            )
          ).rows[0];
          assert.deepEqual(after, expected);
          await writeFile(
            path.join(artifact, "own-session-projection.json"),
            JSON.stringify(
              {
                fields: Object.keys(summary),
                status: summary.status,
                passkeyStatus: summary.passkeyStatus,
                foreignCanariesAbsent: true,
                sessionUnmodified: true,
                cachePrivateNoStore: true,
              },
              null,
              2,
            ),
          );
        },
      );
      await t.test(
        "anonymous, ordinary, expired, deleted and suspended identities cannot obtain session metadata",
        async () => {
          for (const [cookie, status] of [
            [undefined, 401],
            [ordinary.cookie, 403],
          ] as const) {
            const response = await read(cookie);
            assert.equal(response.status, status);
            privateHeaders(response);
            const page = await pageRead(cookie);
            assert.ok([307, 404].includes(page.status));
            privateHeaders(page, true);
            assert.ok(!(await page.text()).includes("Your current session"));
          }
          for (const state of ["expired", "deleted", "suspended"] as const) {
            const a = await actor("ADMIN");
            if (state === "expired")
              await db.query(
                `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 minute' WHERE "tokenHash"=$1`,
                [digest(a.token)],
              );
            if (state === "deleted")
              await db.query(`DELETE FROM "AuthSession" WHERE "tokenHash"=$1`, [
                digest(a.token),
              ]);
            if (state === "suspended")
              await db.query(
                `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
                [a.id],
              );
            const response = await read(a.cookie);
            assert.equal(response.status, state === "suspended" ? 403 : 401);
            privateHeaders(response);
            assert.deepEqual(Object.keys(await response.json()), ["error"]);
            const page = await pageRead(a.cookie);
            assert.ok([307, 404].includes(page.status));
            privateHeaders(page, true);
            assert.ok(!(await page.text()).includes("Your current session"));
          }
        },
      );
      await t.test(
        "read-only methods and cross-origin mutation protections remain closed",
        async () => {
          const post = await fetch(base + "/api/admin/account-security", {
            method: "POST",
            headers: {
              Cookie: admin.cookie,
              Origin: base,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: foreign.id }),
          });
          assert.equal(post.status, 405);
          const csrf = await fetch(base + "/api/admin/account-security", {
            method: "POST",
            headers: {
              Cookie: admin.cookie,
              Origin: "https://unexpected.invalid",
              "Content-Type": "application/json",
            },
            body: "{}",
          });
          assert.equal(csrf.status, 403);
          assert.equal(
            (
              await fetch(base + "/api/auth/admin-passkeys", {
                headers: { Cookie: admin.cookie },
              })
            ).status,
            404,
          );
          assert.equal(
            (
              await fetch(base + "/admin/security", {
                headers: { Cookie: admin.cookie },
              })
            ).status,
            404,
          );
        },
      );
      await t.test(
        "real Admin logins, responsive navigation, reload and logout preserve the current-session boundary",
        async () => {
          await readyAuthenticationRoutes(base);
          browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox"],
          });
          for (const [label, width, height] of [
            ["desktop", 1440, 1000],
            ["tablet", 834, 1112],
            ["mobile", 390, 844],
          ] as const) {
            const context = await browser.newContext({
                viewport: { width, height },
              }),
              page = await context.newPage();
            const save = await loginDiagnostics(
              page,
              db,
              "own-session-" + label,
            );
            try {
              await page.goto(base + "/login");
              await page
                .getByLabel("Email address", { exact: true })
                .fill(admin.email);
              await page.getByLabel("Password", { exact: true }).fill(password);
              await page
                .getByRole("button", { name: "Log in", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/admin");
              if (width < 1024)
                await page
                  .getByText("Admin navigation", { exact: true })
                  .click();
              await page
                .getByRole("navigation", {
                  name: "Administration",
                  exact: true,
                })
                .getByRole("link", { name: "Security overview", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/admin/account-security");
              await expect(
                page.getByRole("heading", {
                  name: "Security overview",
                  exact: true,
                }),
              ).toBeVisible();
              await expect(
                page.getByText("Passkey status unavailable here", {
                  exact: true,
                }),
              ).toBeVisible();
              await expect(page.locator("time")).toHaveCount(2);
              await page.reload();
              await expect(
                page.getByRole("heading", {
                  name: "Your current session",
                  exact: true,
                }),
              ).toBeVisible();
              await page.keyboard.press("Tab");
              await expect(
                page.getByRole("link", { name: "Skip to main content" }),
              ).toBeFocused();
              await page.keyboard.press("Enter");
              await expect(page.locator("#admin-content")).toBeFocused();
              if (width < 1024)
                await page
                  .getByText("Admin navigation", { exact: true })
                  .click();
              await expect(
                page
                  .getByRole("navigation", {
                    name: "Administration",
                    exact: true,
                  })
                  .getByRole("link", {
                    name: "Security overview",
                    exact: true,
                  }),
              ).toHaveAttribute("aria-current", "page");
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
              await page.screenshot({
                path: path.join(artifact, "own-session-" + label + ".png"),
                fullPage: true,
                style: "nextjs-portal { display: none !important; }",
              });
              const summary = await context.request.get(
                base + "/api/admin/account-security",
              );
              assert.equal(summary.status(), 200);
              assert.equal((await summary.json()).passkeyStatus, "UNAVAILABLE");
              await save("passed-admin-login-security-reload");
              await page
                .getByRole("button", { name: "Sign out", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/login");
              assert.equal(
                (
                  await context.request.get(
                    base + "/api/admin/account-security",
                  )
                ).status(),
                401,
              );
              await page.goto(base + "/admin/account-security");
              await expect(page).toHaveURL(base + "/login");
            } catch (error) {
              await save("failed");
              throw error;
            } finally {
              await context.close();
            }
          }
        },
      );
      await t.test(
        "overview does not create staff, MFA or approval authority",
        async () => {
          for (const table of [
            "StaffMembership",
            "StaffCapabilityGrant",
            "StaffSessionBinding",
            "StaffMfaCredential",
            "StaffMfaAssurance",
            "StaffChangeRequest",
            "StaffApprovalDecision",
          ]) {
            assert.equal(
              (await db.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
                .n,
              0,
            );
          }
        },
      );
    } finally {
      await browser?.close();
      await db.end();
    }
  },
);
