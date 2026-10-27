import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
const current = "Owned-review-current-11f!",
  next = "Owned-review-next-11f!";
test(
  "11F account visibility, focus, audit refusal, concurrent limit and real authorization boundary",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser(),
      base = process.env.TEST_BASE_URL!,
      art = process.env.MRT_TEST_ARTIFACT_DIR!;
    t.after(async () => {
      await browser.close();
      await db.end();
    });
    const actor = async (name: string) => {
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: randomUUID() + "@fixture.test",
          password: current,
        }),
      });
      assert.equal(r.status, 201);
      return {
        id: (await r.json()).user.id,
        token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
      };
    };
    const owner = await actor("Account review reader"),
      boundary = await actor("Boundary reader"),
      limited = await actor("Concurrent limit reader");
    const headers = (token: string) => ({
      Origin: base,
      "Content-Type": "application/json",
      Cookie: "p2p_session=" + token,
      "X-Hustlen-Password-Change": "1",
    });
    const wrong = () =>
      fetch(base + "/api/account/password", {
        method: "POST",
        headers: headers(limited.token),
        body: JSON.stringify({
          currentPassword: next,
          newPassword: "Different-next-password!",
          confirmPassword: "Different-next-password!",
        }),
      });
    const attempts = await Promise.all(Array.from({ length: 6 }, wrong));
    assert.equal(attempts.filter((r) => r.status === 400).length, 5);
    assert.equal(attempts.filter((r) => r.status === 429).length, 1);
    const key = createHash("sha256")
      .update(`password-change:${limited.id}`)
      .digest("hex");
    assert.equal(
      (
        await db.query('SELECT attempts FROM "AuthRateLimit" WHERE key=$1', [
          key,
        ])
      ).rows[0].attempts,
      6,
    );
    // A harmless already-authorized name write can finish after logout; new requests cannot.
    await db.query("BEGIN");
    await db.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE', [
      boundary.id,
    ]);
    const queued = fetch(base + "/api/account", {
      method: "PATCH",
      headers: headers(boundary.token),
      body: JSON.stringify({ name: "Previously authorized name" }),
    });
    try {
      await expect
        .poll(async () => {
          await db.query("SELECT pg_stat_clear_snapshot()");
          return Number(
            (
              await db.query(
                `SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%UPDATE%' AND query LIKE '%User%'`,
              )
            ).rows[0].n,
          );
        })
        .toBeGreaterThan(0);
      assert.equal(
        (
          await fetch(base + "/api/auth/logout", {
            method: "POST",
            headers: headers(boundary.token),
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await fetch(base + "/api/account", {
            method: "PATCH",
            headers: headers(boundary.token),
            body: JSON.stringify({ name: "Must not write" }),
          })
        ).status,
        401,
      );
    } finally {
      await db.query("COMMIT");
    }
    assert.equal((await queued).status, 200);
    assert.equal(
      (await db.query('SELECT name FROM "User" WHERE id=$1', [boundary.id]))
        .rows[0].name,
      "Previously authorized name",
    );
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        reducedMotion: "reduce",
      }),
      errors: string[] = [];
    collectBrowserErrors(context, errors);
    await context.addCookies([
      { name: "p2p_session", value: owner.token, url: base },
    ]);
    const page = await context.newPage();
    await page.goto(base + "/account");
    await page.locator("#account-name").fill("Copyable review draft");
    const form = page.locator('form[aria-labelledby="password-title"]');
    await form
      .getByRole("button", { name: "Show current password", exact: true })
      .click();
    await expect(page.locator("#currentPassword")).toHaveAttribute(
      "type",
      "text",
    );
    await expect(
      form.getByRole("button", { name: "Hide current password", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#currentPassword").fill(current);
    await page.locator("#newPassword").fill(next);
    await page.locator("#confirmPassword").fill("Mismatching-confirmation!");
    await page.locator("#confirmPassword").press("Enter");
    await expect(page.locator("#confirmPassword")).toBeFocused();
    await expect(page.locator("#confirmPassword")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#currentPassword")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
    await expect(page.locator("#currentPassword")).toHaveValue(current);
    await expect(
      form.getByRole("button", { name: "隱藏目前密碼", exact: true }),
    ).toBeVisible();
    await form
      .getByRole("button", { name: "隱藏目前密碼", exact: true })
      .click();
    await page.locator("#confirmPassword").fill(next);
    await page.locator("#currentPassword").fill("Wrong-current-password!");
    let mark = errors.length;
    await page.locator("#confirmPassword").press("Enter");
    await expect(page.locator("#password-error")).toContainText(
      "目前密碼不正確",
    );
    await expect(page.locator("#password-error")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#currentPassword")).toBeFocused();
    await expect(page.locator("#currentPassword")).toHaveValue("");
    const expected400 = errors.splice(mark);
    assert.ok(
      expected400.length >= 1 &&
        expected400.every(
          (e) =>
            e === "400 /api/account/password" ||
            /^Failed to load resource: the server responded with a status of 400/.test(
              e,
            ),
        ),
    );
    const hash = (
      await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
        owner.id,
      ])
    ).rows[0].passwordHash;
    // No-op audit storage must abort just like a throwing audit writer.
    await db.query(
      `CREATE FUNCTION fixture_review_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`,
    );
    await db.query(
      `CREATE TRIGGER fixture_review_audit_failure BEFORE INSERT ON "AccountSecurityEvent" FOR EACH ROW WHEN (NEW."actorId"=${owner.id}) EXECUTE FUNCTION fixture_review_audit_failure()`,
    );
    try {
      await page.locator("#currentPassword").fill(current);
      await page.locator("#newPassword").fill(next);
      await page.locator("#confirmPassword").fill(next);
      mark = errors.length;
      await page.locator("#confirmPassword").press("Enter");
      await expect(page.locator("#password-error")).toContainText(
        "無法確認變更結果",
      );
      await expect(page.locator("#password-error")).toBeFocused();
      const expected500 = errors.splice(mark);
      assert.ok(
        expected500.length >= 1 &&
          expected500.every(
            (e) =>
              e === "500 /api/account/password" ||
              /^Failed to load resource: the server responded with a status of 500/.test(
                e,
              ),
          ),
      );
      assert.ok(
        (
          await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
            owner.id,
          ])
        ).rows[0].passwordHash === hash,
        "Credential changed despite audit refusal",
      );
      assert.equal(
        (
          await db.query(
            'SELECT count(*)::int n FROM "AuthSession" WHERE "userId"=$1',
            [owner.id],
          )
        ).rows[0].n,
        1,
      );
    } finally {
      await db.query(
        'DROP TRIGGER fixture_review_audit_failure ON "AccountSecurityEvent"',
      );
      await db.query("DROP FUNCTION fixture_review_audit_failure()");
    }
    for (const [size, width, height] of [
      ["desktop", 1440, 1100],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const locale of ["en", "zh-TW"]) {
        await page
          .locator(".heritage-preferences select")
          .first()
          .selectOption(locale);
        for (const theme of ["light", "dark"]) {
          await page
            .locator(".heritage-preferences select")
            .nth(1)
            .selectOption(theme);
          await page.locator("#currentPassword").focus();
          await expect(page.locator("#currentPassword")).toBeFocused();
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          for (const control of await form.locator("input,button").all()) {
            const box = await control.boundingBox();
            assert.ok(box && box.height >= 44 && box.width >= 44);
          }
          const colors = await form
            .getByRole("button", {
              name: locale === "en" ? "Show current password" : "顯示目前密碼",
              exact: true,
            })
            .evaluate((e) => ({
              fg: getComputedStyle(e).color,
              bg: getComputedStyle(e).backgroundColor,
            }));
          const luminance = (color: string) => {
            const v = (color.match(/[\d.]+/g) || [])
              .slice(0, 3)
              .map(Number)
              .map((n) => {
                const c = n / 255;
                return c <= 0.04045
                  ? c / 12.92
                  : Math.pow((c + 0.055) / 1.055, 2.4);
              });
            return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
          };
          const a = luminance(colors.fg),
            b = luminance(colors.bg);
          assert.ok(
            (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
            "Visibility control contrast must be >=4.5:1",
          );
          await page.screenshot({
            path: path.join(
              art,
              `account-review-${locale}-${theme}-${size}.png`,
            ),
            fullPage: true,
            animations: "disabled",
          });
        }
      }
    }
    // Browser reflow equivalent: halve CSS viewport from 1280 to 640 (not a Safari/OS zoom certification).
    await page.setViewportSize({ width: 640, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(art, "account-review-reflow-640.png"),
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole("button", {
      name: "帳號選單・Account review reader",
      exact: true,
    });
    await menu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await page.setViewportSize({ width: 820, height: 1180 });
    await menu.click();
    await page.mouse.click(2, 220);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(menu).toBeFocused();
    await page.locator("#currentPassword").fill(current);
    await page.locator("#newPassword").fill(next);
    await page.locator("#confirmPassword").fill(next);
    await form.getByRole("button", { name: "顯示新密碼", exact: true }).click();
    await page.locator("#confirmPassword").press("Enter");
    await expect(form.getByRole("status")).toContainText("密碼已變更");
    await expect(form.getByRole("status")).toBeFocused();
    await expect(page.locator("#newPassword")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(page.locator("#newPassword")).toHaveValue("");
    await expect(page.locator("#account-name")).toHaveValue(
      "Copyable review draft",
    );
    await expect(page.locator("#account-name")).toHaveJSProperty(
      "readOnly",
      true,
    );
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(art, "account-security-review.json"),
      JSON.stringify(
        {
          actualPasswordCommit: true,
          visibilityLocalAndReset: true,
          confirmationFocus: true,
          serverErrorFocus: true,
          successFocus: true,
          silentAuditFailureRollback: true,
          concurrentLimitFiveOfSix: true,
          alreadyAuthorizedNameMayFinish: true,
          newRequestAfterLogoutDenied: true,
          keyboardAndOutsideDismissal: true,
          touchTargets44: true,
          visibilityContrast4_5: true,
          errorToFirstFieldKeyboardFlow: true,
          noOverflowWidths: [1440, 820, 390, 640],
          reducedMotion: true,
          credentialValuesCleared: true,
          nameDraftRetained: true,
          screenReaderCertification: false,
          physicalSafariCertification: false,
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
  },
);
