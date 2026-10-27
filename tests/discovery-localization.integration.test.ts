import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";

test(
  "11D actual bilingual discovery: eligibility, exact filters, raw data, preferences and connected account navigation",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
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
          password: "Owned-discovery-fixture-93!",
        }),
      });
      assert.equal(r.status, 201);
      return {
        id: (await r.json()).user.id,
        token: r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
      };
    };
    const owner = await actor("Discovery owner"),
      reader = await actor("Discovery reader"),
      suspended = await actor("Suspended fixture");
    await db.query(
      `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
      [suspended.id],
    );
    const station = (
      await db.query(
        `SELECT id,name FROM "MrtStation" WHERE operational AND "canonicalId" IS NOT NULL ORDER BY id LIMIT 1`,
      )
    ).rows[0];
    assert.ok(station);
    const make = async (
      title: string,
      category: string,
      ownerId = owner.id,
      status = "ACTIVE",
      restricted = false,
      photo = true,
    ) => {
      const id = (
        await db.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,"categoryDetails",status,"adminRestricted","updatedAt") VALUES ($1,$2,'Raw description <script>不翻譯</script>',$3,1234.50,80.25,'Raw condition',$4,$5,$6,now()) RETURNING id`,
          [
            ownerId,
            title,
            category,
            JSON.stringify({
              brandModel: "Raw Model <b>42</b>",
              customField: "Raw custom",
            }),
            status,
            restricted,
          ],
        )
      ).rows[0].id;
      if (photo)
        await db.query(
          `INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,'/heritage/plate-camera.webp','image/webp','PHOTO')`,
          [id],
        );
      await db.query(
        `INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)`,
        [id, station.id],
      );
      return id;
    };
    const camera = await make("Raw Camera <b>不翻譯</b>", "Cameras"),
      tool = await make("Raw Tool", "Tools"),
      custom = await make("Raw Custom", "Custom <b>分類</b>");
    const hidden = [
      await make("Hidden restricted", "Cameras", owner.id, "ACTIVE", true),
      await make("Hidden inactive", "Cameras", owner.id, "INACTIVE"),
      await make("Hidden suspended owner", "Cameras", suspended.id),
    ];
    assert.ok(custom > 0);
    const noPhoto = await make(
      "No photo fixture",
      "Cameras",
      owner.id,
      "ACTIVE",
      false,
      false,
    );
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        reducedMotion: "reduce",
      }),
      errors: string[] = [];
    collectBrowserErrors(context, errors);
    await context.addCookies([
      { name: "p2p_session", value: reader.token, url: base },
    ]);
    const page = await context.newPage();
    for (const locale of ["en", "zh-TW"] as const) {
      await context.addCookies([
        { name: "hustlen_locale", value: locale, url: base },
      ]);
      await page.goto(base + "/");
      await expect(page.locator(".heritage")).toHaveAttribute(
        "data-locale",
        locale,
      );
      const category = page
        .locator(".heritage-category-grid a")
        .filter({ hasText: locale === "en" ? "Cameras" : "相機" });
      await expect(
        page.getByRole("checkbox", {
          name: locale === "en" ? "Discovery sound" : "探索音效",
        }),
      ).not.toBeChecked();
      await category.click();
      await expect(page).toHaveURL(
        new RegExp("/listings\\?category=Cameras#marketplace-filters$"),
      );
      await expect(
        page.getByRole("heading", {
          name: locale === "en" ? "Browse listings" : "瀏覽物品",
          exact: true,
        }),
      ).toBeVisible();
      const categorySelect = page.getByLabel(
        locale === "en" ? "Category" : "物品分類",
        { exact: true },
      );
      await expect(categorySelect).toHaveValue("Cameras");
      await expect(page.locator("article")).toHaveCount(1);
      await expect(page.locator("article h2")).toHaveText(
        "Raw Camera <b>不翻譯</b>",
      );
      const search = page.getByLabel(
        locale === "en" ? "Search items" : "搜尋物品",
        { exact: true },
      );
      await search.fill("Raw Camera");
      await page
        .getByLabel(locale === "en" ? "Language" : "介面語言", { exact: true })
        .selectOption(locale === "en" ? "zh-TW" : "en");
      await expect(page.locator("#marketplace-filters input")).toHaveValue(
        "Raw Camera",
      );
      await expect(
        page.locator("#marketplace-filters select").first(),
      ).toHaveValue("Cameras");
      await page
        .locator(".heritage-preferences select")
        .first()
        .selectOption(locale);
      await search.fill("No matching fixture");
      await expect(
        page.getByText(
          locale === "en"
            ? "No listings match these filters."
            : "沒有符合篩選條件的物品。",
          { exact: true },
        ),
      ).toBeVisible();
      await search.fill("");
      await categorySelect.selectOption("Tools");
      await expect(page.locator("article h2")).toHaveText("Raw Tool");
      await categorySelect.selectOption("ALL");
      if (locale === "zh-TW") {
        await search.fill("相機");
        await expect(page.locator("article h2")).toHaveText(
          "Raw Camera <b>不翻譯</b>",
        );
        await search.fill("");
      }
      await expect(
        page.locator(`option[value="Custom <b>分類</b>"]`),
      ).toHaveText("Custom <b>分類</b>");
      await expect(page.locator("article")).toHaveCount(3);
      await page
        .getByLabel(locale === "en" ? "Pickup station" : "取件車站", {
          exact: true,
        })
        .selectOption(station.name);
      await expect(page.locator("article")).toHaveCount(3);
      await page
        .getByLabel(locale === "en" ? "Status" : "物品狀態", { exact: true })
        .selectOption("RENTED");
      await expect(page.locator("article")).toHaveCount(0);
      await page
        .locator("#marketplace-filters select")
        .nth(1)
        .selectOption("AVAILABLE");
      await expect(page.locator("article")).toHaveCount(3);
      await categorySelect.selectOption("Cameras");
      await page.locator("article a").first().focus();
      await expect(page.locator("article a").first()).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(base + "/listings/" + camera);
      await expect(
        page.getByRole("heading", {
          name: "Raw Camera <b>不翻譯</b>",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator("main h1 b,main script")).toHaveCount(0);
      assert.ok(
        (await page.locator("article").innerText()).includes(
          locale === "en" ? "$1,234.50" : "US$1,234.50",
        ),
      );
      await expect(
        page.getByText("Raw description <script>不翻譯</script>", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Raw Model <b>42</b>", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(locale === "en" ? "Brand and model" : "品牌與型號", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("customField", { exact: true }),
      ).toBeVisible();
      await expect(page.locator('div[lang="en"] form')).toBeVisible();
      // Existing rental form is explicitly English and remains mounted across discovery-language changes.
      const notes = page.locator('div[lang="en"] form textarea');
      await notes.fill("Unsaved rental notes 不變");
      await page
        .locator(".heritage-preferences select")
        .first()
        .selectOption(locale === "en" ? "zh-TW" : "en");
      await expect(notes).toHaveValue("Unsaved rental notes 不變");
      await page
        .locator(".heritage-preferences select")
        .first()
        .selectOption(locale);
      await page.reload();
      await expect(page.locator(".heritage")).toHaveAttribute(
        "data-locale",
        locale,
      );
      const html = await (
        await context.request.get(base + "/listings/" + camera)
      ).text();
      assert.ok(
        html.includes(locale === "en" ? "Pickup stations" : "取件車站"),
      );
      assert.ok(!html.includes(reader.token));
      await page.goto(base + "/account");
      await expect(
        page.getByLabel(locale === "en" ? "Display name" : "顯示名稱", {
          exact: true,
        }),
      ).toHaveValue("Discovery reader");
      for (const route of ["activity", "verification"]) {
        await page
          .locator('.catalogue-index a[href="/account/' + route + '"]')
          .click();
        await expect(page).toHaveURL(base + "/account/" + route);
        await expect(page.locator(".catalogue-scope-note")).toBeVisible();
        await expect(
          page.locator('.catalogue-index a[aria-current="page"]'),
        ).toHaveAttribute("href", "/account/" + route);
        await expect(
          page.locator('#account-content > div[lang="en"]'),
        ).toBeVisible();
      }
    }
    // Evidence matrix uses actual visible routes, not component fixtures.
    for (const [size, width, height] of [
      ["desktop", 1440, 1100],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const locale of ["en", "zh-TW"]) {
        await context.addCookies([
          { name: "hustlen_locale", value: locale, url: base },
        ]);
        for (const [surface, route] of [
          ["home", "/"],
          ["browse", "/listings"],
          ["detail", "/listings/" + camera],
        ]) {
          await page.goto(base + route);
          await expect(
            page.locator(".heritage-preferences select").first(),
          ).toBeEnabled();
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
            await expect
              .poll(async () => {
                const colors = await page.evaluate(() => ({
                  foreground: getComputedStyle(
                    document.querySelector(".heritage-header-logout button")!,
                  ).color,
                  background: getComputedStyle(
                    document.querySelector(".catalogue-masthead")!,
                  ).backgroundColor,
                }));
                const luminance = (color: string) => {
                  const c = (color.match(/[\d.]+/g) || [])
                    .slice(0, 3)
                    .map(Number)
                    .map((v) => {
                      const s = v / 255;
                      return s <= 0.04045
                        ? s / 12.92
                        : Math.pow((s + 0.055) / 1.055, 2.4);
                    });
                  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
                };
                const a = luminance(colors.foreground),
                  b = luminance(colors.background);
                return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
              })
              .toBeGreaterThanOrEqual(4.5);
            await page.screenshot({
              path: path.join(
                artifact,
                `${surface}-${locale}-${theme}-${size}.png`,
              ),
              fullPage: true,
              animations: "disabled",
            });
          }
        }
      }
    }
    const explore = page.getByRole("button", { name: "探索", exact: true });
    await explore.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(explore).toBeFocused();
    const accountMenu = page.getByRole("button", {
      name: "帳號選單・Discovery reader",
      exact: true,
    });
    await accountMenu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(accountMenu).toBeFocused();
    // Report UI translations preserve exact server reason values and typed description across locale changes.
    await page.goto(base + "/listings");
    await page
      .locator("article")
      .filter({ hasText: "Raw Tool" })
      .getByRole("button", { name: "檢舉", exact: true })
      .click();
    const report = page.locator("article").filter({ hasText: "Raw Tool" });
    await report.getByLabel("檢舉原因").selectOption("Inaccurate listing");
    await report.getByLabel("補充說明（選填）").fill("Raw report 不翻譯");
    await page.getByLabel("介面語言", { exact: true }).selectOption("en");
    await expect(report.getByLabel("Report reason")).toHaveValue(
      "Inaccurate listing",
    );
    await expect(report.getByLabel("Optional details")).toHaveValue(
      "Raw report 不翻譯",
    );
    await report
      .getByRole("button", { name: "Send report", exact: true })
      .click();
    await expect(
      report.getByText("Report received.", { exact: true }),
    ).toBeVisible();
    const saved = (
      await db.query(
        `SELECT reason,description FROM "ListingReport" WHERE "listingId"=$1`,
        [tool],
      )
    ).rows[0];
    assert.equal(saved.reason, "Inaccurate listing");
    assert.equal(saved.description, "Raw report 不翻譯");
    await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
    await report.getByRole("button", { name: "檢舉", exact: true }).click();
    const mark = errors.length;
    const duplicate = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api/listings/${tool}/report` &&
        r.request().method() === "POST",
    );
    await report.getByRole("button", { name: "送出檢舉", exact: true }).click();
    assert.equal((await duplicate).status(), 409);
    await expect(
      report.getByText("你已經檢舉過此物品。", { exact: true }),
    ).toBeVisible();
    const expectedDuplicate = errors.splice(mark);
    assert.ok(expectedDuplicate.length >= 1);
    assert.ok(
      expectedDuplicate.every(
        (e) =>
          e === `409 /api/listings/${tool}/report` ||
          /^Failed to load resource: the server responded with a status of 409/.test(
            e,
          ),
      ),
    );
    await page.getByLabel("介面語言", { exact: true }).selectOption("en");
    assert.deepEqual(errors, []);
    for (const id of hidden)
      assert.equal(
        (await context.request.get(base + "/listings/" + id)).status(),
        404,
      );
    // Missing-photo detail behavior predates this batch: public detail permitted, booking denied. Browse hides it.
    assert.equal(
      (await context.request.get(base + "/listings/" + noPhoto)).status(),
      200,
    );
    const invalid = await browser.newContext();
    await invalid.addCookies([
      { name: "hustlen_locale", value: "__proto__", url: base },
    ]);
    const ip = await invalid.newPage();
    await ip.goto(base + "/listings?category=__proto__");
    await expect(
      ip.getByRole("heading", { name: "Browse listings", exact: true }),
    ).toBeVisible();
    await expect(ip.getByLabel("Category", { exact: true })).toHaveValue("ALL");
    await invalid.close();
    const missing = await context.request.get(base + "/listings/2147483647");
    assert.equal(missing.status(), 404);
    const missingHtml = await missing.text();
    await writeFile(
      path.join(artifact, "notfound-observation.json"),
      JSON.stringify({
        status: missing.status(),
        english: missingHtml.includes("Listing not found"),
        chinese: missingHtml.includes("找不到物品"),
      }),
    );
    assert.ok(missingHtml.includes("Listing not found"));
    for (const locale of ["en", "zh-TW"]) {
      await context.addCookies([
        { name: "hustlen_locale", value: locale, url: base },
      ]);
      const mark = errors.length;
      const response = await page.goto(base + "/listings/2147483647");
      assert.equal(response!.status(), 404);
      await expect(
        page.getByRole("heading", {
          name: locale === "en" ? "Listing not found" : "找不到物品",
          exact: true,
        }),
      ).toBeVisible();
      const expectedMissing = errors.splice(mark);
      assert.ok(
        expectedMissing.every(
          (e) =>
            e === "404 /listings/2147483647" ||
            /^Failed to load resource: the server responded with a status of 404/.test(
              e,
            ),
        ),
      );
    }
    const raw = (
      await db.query(
        `SELECT title,description,category,price::text,deposit::text,"categoryDetails" FROM "Listing" WHERE id=$1`,
        [camera],
      )
    ).rows[0];
    assert.equal(raw.category, "Cameras");
    assert.equal(raw.price, "1234.50");
    assert.equal(raw.deposit, "80.25");
    assert.equal(raw.title, "Raw Camera <b>不翻譯</b>");
    await writeFile(
      path.join(artifact, "discovery-localization.json"),
      JSON.stringify(
        {
          locales: ["en", "zh-TW"],
          actualHomeBrowseDetailAccount: true,
          exactCategoryQueryPreserved: true,
          unknownCategoryRaw: true,
          eligibleBrowseCount: 3,
          hiddenDetail404: true,
          missingPhotoLegacyDetailPreserved: true,
          realReportPersisted: true,
          duplicateReport409Localized: true,
          actualNotFoundBothLocales404: true,
          rawListingUnchanged: true,
          usdUnchanged: true,
          independentLocaleAndTheme: true,
          rentalDraftSurvivesLanguageChange: true,
          activityTrustEnglishExplicit: true,
          invalidLocaleAndCategoryFallback: true,
          keyboardNavigation: true,
          mobileEscapeFocusReturn: true,
          mastheadTextContrastAtLeast4_5: true,
          reducedMotion: true,
          widths: [1440, 820, 390],
          screenshots: 36,
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
  },
);

test(
  "11D real discovery storage failure uses fixed localized error and successful retry",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    let renamed = false;
    try {
      const context = await browser.newContext();
      await context.addCookies([
        { name: "hustlen_locale", value: "zh-TW", url: base },
      ]);
      const expected: string[] = [];
      collectBrowserErrors(context, expected);
      const page = await context.newPage();
      await db.query('ALTER TABLE "Listing" RENAME TO "Owned11dUnavailable"');
      renamed = true;
      const response = await page.goto(base + "/listings");
      assert.equal(response!.status(), 500);
      await expect(
        page.getByRole("heading", {
          name: "無法載入此物品頁面，請再試一次。",
          exact: true,
        }),
      ).toBeVisible();
      assert.ok(
        !(await page.locator("body").innerText()).includes(
          "Owned11dUnavailable",
        ),
      );
      assert.ok(
        !(await page.locator("body").innerText()).includes("prisma.listing"),
      );
      await writeFile(
        path.join(artifact, "expected-fault-observations.json"),
        JSON.stringify(expected),
      );
      assert.equal(expected.length, 4);
      const boundedDatabaseDiagnostic = (value: string) =>
        /^%c%s%c \{"event":"operation_failed","errorId":"[a-f0-9-]{36}","context":"database.query","errorType":"Unknown","code":"UNCLASSIFIED"\} background:/.test(
          value,
        );
      assert.ok(
        expected.every(
          (e) =>
            e === "500 /listings" ||
            /^Failed to load resource: the server responded with a status of 500/.test(
              e,
            ) ||
            boundedDatabaseDiagnostic(e) ||
            (e.includes(".listing.findMany") && e.includes("Listing")),
        ),
      );
      await db.query('ALTER TABLE "Owned11dUnavailable" RENAME TO "Listing"');
      renamed = false;
      const mark = expected.length;
      await page.getByRole("button", { name: "再試一次", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "瀏覽物品", exact: true }),
      ).toBeVisible();
      assert.deepEqual(expected.slice(mark), []);
      await writeFile(
        path.join(artifact, "discovery-error-retry.json"),
        JSON.stringify(
          {
            realOwnedTableFault: true,
            response: 500,
            fixedChineseMessage: true,
            noRawErrorInUi: true,
            realRetryRestoresBrowse: true,
            expectedFaultObservations: expected.length,
            unexpectedRetryErrors: [],
          },
          null,
          2,
        ),
      );
    } finally {
      if (renamed)
        await db.query('ALTER TABLE "Owned11dUnavailable" RENAME TO "Listing"');
      await browser.close();
      await db.end();
    }
  },
);
