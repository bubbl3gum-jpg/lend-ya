import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";
import { cataloguePlate } from "../lib/heritage/plates";

test(
  "11B actual homepage: eligible data, real browse/category/listing/MRT navigation, shared preferences and protected sessions",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase(),
      browser = await launchBrowser();
    const base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    const errors: string[] = [];
    collectBrowserErrors(context, errors);
    try {
      await context.addInitScript({
        content: `window.__homeAudio={created:0,closed:0};const A=window.AudioContext;if(A)window.AudioContext=class extends A{constructor(...args){super(...args);window.__homeAudio.created++;}close(){window.__homeAudio.closed++;return super.close();}};`,
      });
      const page = await context.newPage();
      await page.goto(base + "/");
      await expect(
        page.getByText("No active item listings yet."),
      ).toBeVisible();
      await expect(
        page.getByText("No eligible categories yet.", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Account center/ }),
      ).toHaveCount(0);
      assert.equal(
        (
          await context.request.get(base + "/account", { maxRedirects: 0 })
        ).status(),
        307,
      );
      assert.equal(
        (
          await context.request.get(base + "/api/admin/account-security")
        ).status(),
        401,
      );
      async function actor(name: string) {
        const response = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: randomUUID() + "@fixture.test",
            password: "Owned-home-fixture-93!",
          }),
        });
        assert.equal(response.status, 201);
        const { user } = await response.json();
        return {
          id: user.id as number,
          token: response.headers
            .get("set-cookie")!
            .match(/p2p_session=([^;]+)/)![1],
        };
      }
      const owner = await actor("Home fixture owner"),
        renter = await actor("Home reader"),
        suspended = await actor("Restricted fixture owner");
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
      const visible: number[] = [];
      for (const [category, ownerId, status, restricted, media] of [
        ["Cameras", owner.id, "ACTIVE", false, true],
        ["Tools", owner.id, "ACTIVE", false, true],
        ["Outdoor & Camping", owner.id, "ACTIVE", false, true],
        ["Electronics", owner.id, "ACTIVE", false, true],
        ["Hidden restricted", owner.id, "ACTIVE", true, true],
        ["Hidden inactive", owner.id, "INACTIVE", false, true],
        ["Hidden owner", suspended.id, "ACTIVE", false, true],
        ["Hidden missing photo", owner.id, "ACTIVE", false, false],
        ["Hidden video", owner.id, "ACTIVE", false, true],
      ] as const) {
        const id = (
          await db.query(
            `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,status,"adminRestricted","updatedAt") VALUES ($1,$2,'Owned development fixture; not a real product.',$3,100,'Synthetic fixture',$4,$5,now()) RETURNING id`,
            [
              ownerId,
              `Design fixture — ${category}`,
              category,
              status,
              restricted,
            ],
          )
        ).rows[0].id;
        if (media)
          await db.query(
            `INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,$3,$4)`,
            [
              id,
              category === "Hidden video"
                ? "/nonpublic-video-fixture.webm"
                : (cataloguePlate(category) ?? "/heritage/plate-tool.webp"),
              category === "Hidden video" ? "video/webm" : "image/webp",
              category === "Hidden video" ? "VIDEO" : "PHOTO",
            ],
          );
        if (!category.startsWith("Hidden")) {
          visible.push(id);
          await db.query(
            `INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)`,
            [id, station.id],
          );
        }
      }
      await page.reload();
      await expect(
        page
          .getByRole("navigation", {
            name: "Marketplace sections",
            exact: true,
          })
          .getByRole("link", { name: "Home", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".heritage-listings article")).toHaveCount(4);
      await expect(page.locator(".heritage-category")).toHaveCount(4);
      await expect(page.getByText(/Design fixture — Hidden/)).toHaveCount(0);
      await expect(
        page.getByText(
          "Design study · Real marketplace records · Provisional appearance",
        ),
      ).toHaveCount(0);
      await page
        .locator(".heritage-category")
        .filter({ hasText: "Cameras" })
        .click();
      await expect(page).toHaveURL(
        /\/listings\?category=Cameras#marketplace-filters$/,
      );
      await expect(
        page.getByRole("combobox", { name: "Category", exact: true }),
      ).toHaveValue("Cameras");
      await expect(page.locator("article")).toHaveCount(1);
      await page.locator("article").getByRole("link").click();
      await expect(page).toHaveURL(base + "/listings/" + visible[0]);
      await expect(
        page.getByRole("heading", {
          name: "Design fixture — Cameras",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Login to book" }),
      ).toBeVisible();
      await page.goto(base + "/");
      await page
        .getByRole("link", { name: "Browse by MRT pickup station" })
        .click();
      await expect(
        page.getByRole("combobox", { name: "Pickup station", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("combobox", { name: "Pickup station", exact: true })
        .selectOption(station.name);
      await expect(page.locator("article")).toHaveCount(4);
      await page.goto(base + "/listings?category=Hidden%20owner");
      await expect(
        page.getByRole("combobox", { name: "Category", exact: true }),
      ).toHaveValue("ALL");
      await expect(page.locator("article")).toHaveCount(4);
      await context.addCookies([
        { name: "p2p_session", value: renter.token, url: base },
      ]);
      await page.goto(base + "/");
      await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
      for (const [label, width, height] of [
        ["desktop", 1440, 1100],
        ["tablet", 820, 1180],
        ["mobile", 390, 844],
      ] as const) {
        await page.setViewportSize({ width, height });
        for (const mode of ["light", "dark"]) {
          await page
            .getByLabel("Appearance", { exact: true })
            .selectOption(mode);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          await page.screenshot({
            path: path.join(artifact, `homepage-${mode}-${label}.png`),
            fullPage: true,
          });
        }
      }
      await page.getByRole("button", { name: "Explore", exact: true }).click();
      const menu = page.getByRole("dialog");
      await expect(menu).toBeVisible();
      await page.screenshot({
        path: path.join(artifact, "marketplace-menu-mobile.png"),
      });
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Explore", exact: true }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Explore", exact: true }).click();
      await menu.getByRole("link", { name: "Browse", exact: true }).click();
      await expect(page).toHaveURL(base + "/listings");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(page.locator(".heritage")).toHaveAttribute(
        "data-theme",
        "dark",
      );
      await page.screenshot({
        path: path.join(artifact, "browse-dark-mobile.png"),
        fullPage: true,
      });
      await page.goto(base + "/listings/" + visible[0]);
      await page
        .getByRole("button", { name: "Choose meeting station", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", {
          name: "Choose meeting station",
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Close station map", exact: true })
        .click();
      await page.goto(base + "/");
      await page.getByRole("checkbox", { name: "Discovery sound" }).check();
      await page.getByRole("checkbox", { name: "Immersive effects" }).uncheck();
      await page
        .getByRole("button", { name: "Account center · Home reader" })
        .click();
      const account = page.getByRole("dialog");
      await expect(
        account.getByRole("link", { name: "Admin Desktop", exact: true }),
      ).toHaveCount(0);
      await expect(
        account.getByRole("link", { name: "My listings", exact: true }),
      ).toHaveAttribute("href", "/dashboard#listings");
      await expect(
        account.getByRole("link", {
          name: "My borrowings · active & historical",
          exact: true,
        }),
      ).toHaveAttribute("href", "/dashboard#borrowings");
      await account
        .getByRole("link", { name: "Account settings", exact: true })
        .click();
      await expect(page).toHaveURL(base + "/account");
      await expect(
        page.getByRole("checkbox", { name: "Discovery sound" }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: "Immersive effects" }),
      ).not.toBeChecked();
      await page.getByRole("checkbox", { name: "Immersive effects" }).check();
      await expect(page.getByLabel("Appearance", { exact: true })).toHaveValue(
        "dark",
      );
      await page
        .getByLabel("Appearance", { exact: true })
        .selectOption("system");
      await page.emulateMedia({ colorScheme: "light" });
      const color = () =>
        page
          .locator(".heritage")
          .evaluate((e) => getComputedStyle(e).backgroundColor);
      const light = await color();
      await page.emulateMedia({ colorScheme: "dark" });
      await expect.poll(color).not.toBe(light);
      await page.goto(base + "/");
      await expect(page.getByLabel("Appearance", { exact: true })).toHaveValue(
        "system",
      );
      const audio = () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __homeAudio: { created: number; closed: number };
              }
            ).__homeAudio,
        );
      const explore = page.getByRole("link", { name: "Explore items" });
      await expect(
        page.getByRole("checkbox", { name: "Discovery sound" }),
      ).toBeChecked();
      await expect(
        page.getByRole("checkbox", { name: "Immersive effects" }),
      ).toBeChecked();
      assert.equal((await audio()).created, 0);
      await explore.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".soil-burst i")).toHaveCount(9);
      await expect(page.locator(".soil-burst")).toHaveCount(0);
      await expect.poll(async () => (await audio()).closed).toBe(1);
      await page.getByRole("checkbox", { name: "Immersive effects" }).uncheck();
      await explore.click();
      assert.equal(await page.locator(".soil-burst").count(), 0);
      await expect.poll(async () => (await audio()).closed).toBe(2);
      await page.getByRole("checkbox", { name: "Discovery sound" }).uncheck();
      await page.getByRole("checkbox", { name: "Immersive effects" }).check();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await explore.click();
      assert.equal(await page.locator(".soil-burst").count(), 0);
      assert.equal((await audio()).created, 2);
      await page.goto(base + "/account");
      await expect(
        page.getByRole("checkbox", { name: "Discovery sound" }),
      ).not.toBeChecked();
      await page.goto(base + "/dashboard#borrowings");
      await expect(
        page.getByRole("heading", { name: "Welcome, Home reader" }),
      ).toBeVisible();
      await db.query(
        `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
        [renter.id],
      );
      await page.goto(base + "/listings/" + visible[0]);
      await expect(
        page.getByRole("button", {
          name: "Choose meeting station",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText("This listing or your account is restricted", {
          exact: false,
        }),
      ).toBeVisible();
      const denied = await context.request.post(base + "/api/bookings", {
        data: {
          listingId: visible[0],
          meetingStationId: station.id,
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 172800000).toISOString(),
        },
      });
      assert.equal(denied.status(), 403);
      await page
        .getByRole("button", { name: "Account center · Home reader" })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Sign out", exact: true })
        .click();
      await expect(page).toHaveURL(base + "/login");
      assert.equal(
        (await context.request.get(base + "/api/auth/me")).status(),
        401,
      );
      const nativeContext = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 1440, height: 1100 },
      });
      const nativeErrors: string[] = [];
      collectBrowserErrors(nativeContext, nativeErrors);
      const nativePage = await nativeContext.newPage();
      await nativePage.goto(base + "/");
      await expect(
        nativePage.getByRole("combobox", { name: "Appearance", exact: true }),
      ).toBeDisabled();
      await expect(
        nativePage.getByRole("checkbox", { name: "Discovery sound" }),
      ).toBeDisabled();
      await nativePage
        .locator(".heritage-category")
        .filter({ hasText: "Cameras" })
        .click();
      await expect(nativePage).toHaveURL(/category=Cameras/);
      await expect(nativePage.locator("article")).toHaveCount(1);
      await nativeContext.close();
      // Explicit JS-disabled fixture: only its blocked development HMR script is expected.
      // Keep the shared collector and normal browser errors completely strict.
      assert.ok(nativeErrors.length <= 2);
      assert.ok(
        nativeErrors.every((error) =>
          /^GET \/_next\/static\/chunks\/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_[a-zA-Z0-9_.-]+\.js: csp$/.test(
            error,
          ),
        ),
      );
      assert.deepEqual(errors, []);
      await writeFile(
        path.join(artifact, "homepage-navigation.json"),
        JSON.stringify(
          {
            actualHomepage: true,
            truthfulEmptyState: true,
            eligibleListings: 4,
            excludedRestrictionsAndMissingMedia: true,
            categoryToRealBrowse: true,
            detailAndExistingStationMap: true,
            mobileMenuFocusAndDismissal: true,
            accountAndRentalNavigation: true,
            sharedSystemTheme: true,
            sharedMute: true,
            nondefaultSoundEffectsSharedWithAccount: true,
            videoOnlyExcluded: true,
            activeNavigation: true,
            serverPreferenceControlsWaitForHydration: true,
            nativeCategoryNavigationWithoutJavaScript: true,
            expectedBlockedDevScriptReads: nativeErrors.length,
            keyboardParticles: 9,
            realOptionalAudioClosed: true,
            reducedMotion: true,
            ordinaryNoAdminLink: true,
            suspendedBookingDenied: true,
            realLogout: true,
            unexpectedErrors: errors,
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
