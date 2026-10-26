import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";

test(
  "11C real bilingual account/home: SSR locale, safe edits, failures, expiration and independent preferences",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
      }),
      errors: string[] = [];
    collectBrowserErrors(context, errors);
    let cleaned = false;
    const cleanup = async () => {
      if (cleaned) return;
      cleaned = true;
      await browser.close();
      await db.end();
    };
    t.after(cleanup);
    try {
      const actor = async (name: string) => {
        const email = randomUUID() + "@fixture.test";
        const r = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password: "Owned-localization-fixture-93!",
          }),
        });
        assert.equal(r.status, 201);
        return {
          user: (await r.json()).user,
          email,
          token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
        };
      };
      const owner = await actor("Localization reader"),
        foreign = await actor("Other fixture actor");
      assert.equal(
        (
          await context.request.patch(base + "/api/account", {
            data: { name: "No permission" },
          })
        ).status(),
        401,
      );
      const foreignReply = await fetch(
        base + "/api/account?userId=" + owner.user.id,
        {
          method: "PATCH",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            Cookie: "p2p_session=" + foreign.token,
          },
          body: JSON.stringify({
            name: "Other updated own name",
            id: owner.user.id,
            userId: owner.user.id,
            email: owner.email,
            role: "ADMIN",
          }),
        },
      );
      assert.equal(foreignReply.status, 200);
      assert.deepEqual(await foreignReply.json(), { saved: true });
      assert.equal(
        (
          await db.query('SELECT name,email,role FROM "User" WHERE id=$1', [
            owner.user.id,
          ])
        ).rows[0].name,
        "Localization reader",
      );
      assert.equal(
        (
          await db.query('SELECT name FROM "User" WHERE id=$1', [
            foreign.user.id,
          ])
        ).rows[0].name,
        "Other updated own name",
      );
      await context.addCookies([
        { name: "p2p_session", value: owner.token, url: base },
      ]);
      const page = await context.newPage();
      await page.goto(base + "/");
      await expect(page.getByLabel("Language", { exact: true })).toBeEnabled();
      await page.getByLabel("Language", { exact: true }).focus();
      await expect(page.getByLabel("Language", { exact: true })).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await expect(
        page.getByText("目前沒有上架中的物品。", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("介面語言", { exact: true })).toHaveValue(
        "zh-TW",
      );
      const id = (
        await db.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'Raw title <b>不翻譯</b>','Owned synthetic fixture','Cameras',1234.50,'Synthetic fixture',now()) RETURNING id`,
          [owner.user.id],
        )
      ).rows[0].id;
      await db.query(
        `INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,'/heritage/plate-camera.webp','image/webp','PHOTO')`,
        [id],
      );
      await page.reload();
      await expect(page.locator(".heritage")).toHaveAttribute(
        "data-locale",
        "zh-TW",
      );
      await expect(
        page.getByRole("heading", {
          name: "Raw title <b>不翻譯</b>",
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(await page.locator(".heritage-listings h3 b").count(), 0);
      assert.ok(
        (await page.locator(".heritage-listings article").innerText()).includes(
          "US$1,234.50",
        ),
      );
      const html = await (await context.request.get(base + "/")).text();
      assert.ok(html.includes('data-locale="zh-TW"'));
      assert.ok(html.includes("探索物品"));
      assert.ok(!html.includes(owner.token));
      const noScript = await browser.newContext({ javaScriptEnabled: false });
      await noScript.addCookies([
        { name: "hustlen_locale", value: "zh-TW", url: base },
      ]);
      const ssrErrors: string[] = [];
      collectBrowserErrors(noScript, ssrErrors);
      const ssr = await noScript.newPage();
      await ssr.goto(base + "/");
      await expect(
        ssr.getByRole("heading", { name: "探索物品分類", exact: true }),
      ).toBeVisible();
      await expect(ssr.getByLabel("介面語言", { exact: true })).toBeDisabled();
      await noScript.close();
      assert.ok(ssrErrors.length <= 1);
      assert.ok(
        ssrErrors.every((error) =>
          /^GET \/_next\/static\/chunks\/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_[a-zA-Z0-9_.-]+\.js: csp$/.test(
            error,
          ),
        ),
      );
      await page.goto(base + "/account?userId=" + foreign.user.id);
      await expect(
        page.getByRole("heading", { name: "你的帳號", exact: true }),
      ).toBeVisible();
      assert.ok(
        !(await page.locator("body").innerText()).includes(foreign.email),
      );
      await expect(page.getByLabel("顯示名稱", { exact: true })).toHaveValue(
        "Localization reader",
      );
      await page.getByLabel("顯示名稱", { exact: true }).fill("尚未儲存的名字");
      await page.getByLabel("介面語言", { exact: true }).selectOption("en");
      await expect(
        page.getByLabel("Display name", { exact: true }),
      ).toHaveValue("尚未儲存的名字");
      await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
      await page.getByRole("checkbox", { name: "Discovery sound" }).check();
      await page.getByRole("checkbox", { name: "Immersive effects" }).uncheck();
      await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
      await expect(page.getByLabel("顯示名稱", { exact: true })).toHaveValue(
        "尚未儲存的名字",
      );
      await expect(page.getByLabel("外觀", { exact: true })).toHaveValue(
        "dark",
      );
      await expect(
        page.getByRole("checkbox", { name: "探索音效" }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: "沉浸式互動效果" }),
      ).not.toBeChecked();
      const name = page.locator("#account-name");
      await name.fill("   ");
      await page.getByRole("button", { name: "儲存設定" }).click();
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("不可全部為空白");
      await expect(name).toBeFocused();
      await name.fill("台灣分享者");
      await name.press("Enter");
      await expect(page.locator(".catalogue-feedback[role=status]")).toHaveText(
        "設定已儲存。",
      );
      assert.equal(
        (await db.query('SELECT name FROM "User" WHERE id=$1', [owner.user.id]))
          .rows[0].name,
        "台灣分享者",
      );
      await db.query(
        `CREATE FUNCTION fixture_account_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='FAIL_LOCALIZATION_FIXTURE' THEN RAISE EXCEPTION 'Owned fixture failure'; END IF; RETURN NEW; END $$`,
      );
      await db.query(
        `CREATE TRIGGER fixture_account_failure BEFORE UPDATE OF name ON "User" FOR EACH ROW EXECUTE FUNCTION fixture_account_failure()`,
      );
      await name.fill("FAIL_LOCALIZATION_FIXTURE");
      let mark = errors.length;
      await page.getByRole("button", { name: "儲存設定" }).click();
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("無法儲存設定");
      await expect(name).toHaveValue("FAIL_LOCALIZATION_FIXTURE");
      await expect(page.getByText(/^參考編號：/)).toBeVisible();
      const failureErrors = errors.splice(mark);
      assert.ok(failureErrors.length >= 1);
      assert.ok(
        failureErrors.every(
          (e) =>
            e === "500 /api/account" ||
            /^Failed to load resource: the server responded with a status of 500/.test(
              e,
            ),
        ),
      );
      await page.getByLabel("介面語言", { exact: true }).selectOption("en");
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("Your changes are still here");
      await db.query('DROP TRIGGER fixture_account_failure ON "User"');
      await db.query("DROP FUNCTION fixture_account_failure()");
      await name.fill("Bilingual reader");
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.locator(".catalogue-feedback[role=status]")).toHaveText(
        "Settings saved.",
      );
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
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await page.screenshot({
              path: path.join(
                artifact,
                `account-${locale}-${theme}-${size}.png`,
              ),
              fullPage: true,
              animations: "disabled",
            });
          }
        }
      }
      await page.goto(base + "/");
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
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await page.screenshot({
              path: path.join(artifact, `home-${locale}-${theme}-${size}.png`),
              fullPage: true,
              animations: "disabled",
            });
          }
        }
      }
      await page.getByRole("button", { name: "探索", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "瀏覽物品", exact: true })
        .click();
      await expect(page).toHaveURL(base + "/listings");
      await expect(
        page.getByRole("heading", { name: "Browse listings", exact: true }),
      ).toBeVisible();
      await expect(page.locator("main")).toHaveAttribute("lang", "en");
      await page.goto(base + "/account");
      await expect(page.getByLabel("介面語言", { exact: true })).toHaveValue(
        "zh-TW",
      );
      await db.query(
        `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
        [owner.user.id],
      );
      await page.reload();
      await expect(
        page.getByText("已停權；仍可處理既有租借與歸還義務。", { exact: true }),
      ).toBeVisible();
      await name.fill("Suspended own profile");
      const savedRefresh = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/account" &&
          response.request().method() === "GET",
      );
      await page.getByRole("button", { name: "儲存設定" }).click();
      await expect(page.locator(".catalogue-feedback[role=status]")).toHaveText(
        "設定已儲存。",
      );
      const settled = await savedRefresh;
      assert.equal(settled.status(), 200);

      await expect(
        page.getByRole("button", {
          name: "帳號選單・Suspended own profile",
          exact: true,
        }),
      ).toBeVisible();
      await name.fill("保留到期草稿");
      await db.query(
        `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE "tokenHash"=$1`,
        [createHash("sha256").update(owner.token).digest("hex")],
      );
      mark = errors.length;
      await page.getByRole("button", { name: "儲存設定" }).click();
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("登入狀態已過期");
      await expect(name).toHaveValue("保留到期草稿");
      assert.ok(
        !(await page.locator("body").innerText()).includes(owner.email),
      );
      await name.fill("保留並繼續編輯的草稿");
      await expect(
        page.locator(".catalogue-feedback[role=alert]"),
      ).toContainText("登入狀態已過期");
      await expect(
        page.getByRole("link", { name: "登入", exact: true }),
      ).toBeVisible();
      const expiredErrors = errors.splice(mark);
      assert.ok(expiredErrors.length >= 1);
      assert.ok(
        expiredErrors.every(
          (e) =>
            e === "401 /api/account" ||
            /^Failed to load resource: the server responded with a status of 401/.test(
              e,
            ),
        ),
      );
      await page.screenshot({
        path: path.join(artifact, "expired-session-zh-TW.png"),
        fullPage: true,
        animations: "disabled",
      });
      await page.reload();
      await expect(page).toHaveURL(base + "/login");
      const invalidContext = await browser.newContext();
      collectBrowserErrors(invalidContext, errors);
      await invalidContext.addCookies([
        { name: "hustlen_locale", value: "__proto__", url: base },
      ]);
      const invalid = await invalidContext.newPage();
      await invalid.goto(base + "/");
      await expect(invalid.getByLabel("Language", { exact: true })).toHaveValue(
        "en",
      );
      await invalidContext.close();
      const blocked = await browser.newContext();
      collectBrowserErrors(blocked, errors);
      await blocked.addInitScript({
        content: `Object.defineProperty(document,'cookie',{get(){return ''},set(){throw Error('Fixture cookie blocked')}});Storage.prototype.setItem=function(){throw Error('Fixture storage blocked')};`,
      });
      const bp = await blocked.newPage();
      await bp.goto(base + "/");
      await bp.getByLabel("Language", { exact: true }).selectOption("zh-TW");
      await expect(
        bp.getByRole("heading", { name: "探索物品分類", exact: true }),
      ).toBeVisible();
      await blocked.close();
      assert.deepEqual(errors, []);
      await writeFile(
        path.join(artifact, "localization.json"),
        JSON.stringify(
          {
            serverChineseAndNoScript: true,
            keyboardLanguageSelection: true,
            expectedBlockedDevScriptReads: ssrErrors.length,
            immediateBothDirections: true,
            realOwnSave: true,
            foreignSelectorCannotEditOther: true,
            emailReadOnly: true,
            noRecoveryInvented: true,
            realDatabaseFailure500AndRetry: true,
            realExpiredSession401: true,
            precedingSaveRefreshCompletedBeforeInducedExpiry: true,
            expiredReadOnlyInfoHidden: true,
            unsavedRetained: true,
            suspendedOwnNamePolicyPreserved: true,
            themeMotionSoundIndependent: true,
            locales: ["en", "zh-TW"],
            themes: ["light", "dark"],
            widths: [1440, 820, 390],
            unsupportedPreferenceFallback: true,
            userContentUntouchedAndEscaped: true,
            usdValueUnchanged: true,
            outsideScopeEnglish: true,
            browserErrors: errors,
          },
          null,
          2,
        ),
      );
    } finally {
      await cleanup();
    }
  },
);
