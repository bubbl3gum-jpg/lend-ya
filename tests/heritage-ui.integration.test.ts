import { cataloguePlate } from "../lib/heritage/plates";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "playwright/test";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { connectTestDatabase } from "./support/test-database";

test(
  "R1 heritage: real marketplace, live System appearance, bounded tactile effects, opt-in audio and accessible sheet",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase();
    const browser = await launchBrowser();
    const base = process.env.TEST_BASE_URL!;
    const artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const errors: string[] = [];
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      colorScheme: "dark",
    });
    collectBrowserErrors(context, errors);
    try {
      // Observe the real native audio API. No mocked playback, navigation or authorization.
      await context.addInitScript({
        content: `window.__heritageAudio={created:0,started:0,stopped:0,closed:0};const NativeAudio=window.AudioContext;if(NativeAudio){window.AudioContext=class extends NativeAudio{constructor(...args){super(...args);window.__heritageAudio.created++;}createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);s.start=(...args)=>{window.__heritageAudio.started++;return start(...args);};s.stop=(...args)=>{window.__heritageAudio.stopped++;return stop(...args);};return s;}close(){window.__heritageAudio.closed++;return super.close();}};}`,
      });
      const response = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Heritage reader",
          email: randomUUID() + "@fixture.test",
          password: "Owned-heritage-fixture-93!",
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
      const ids: number[] = [];
      for (const category of [
        "Cameras",
        "Outdoor & Camping",
        "Tools",
        "Electronics",
      ]) {
        const inserted = await db.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,$2,'Owned design-development fixture, not a real product.',$3,100,'Synthetic fixture',now()) RETURNING id`,
          [user.id, `Design fixture — ${category}`, category],
        );
        const id = inserted.rows[0].id;
        ids.push(id);
        // Original illustration is explicitly a fixture image, not product photography.
        await db.query(
          `INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,'image/webp','PHOTO')`,
          [id, cataloguePlate(category)],
        );
      }
      const restricted = await db.query(
        `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt","adminRestricted") VALUES ($1,'Hidden private fixture','Never public','SECRET',100,'Synthetic',now(),true) RETURNING id`,
        [user.id],
      );
      await db.query(
        `INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,'/heritage/harvest-landscape.webp','image/webp','PHOTO')`,
        [restricted.rows[0].id],
      );
      const page = await context.newPage();
      await page.goto(base + "/account");
      await expect(page.getByLabel("Appearance", { exact: true })).toHaveValue(
        "system",
      );
      const root = page.locator(".heritage");
      const color = () =>
        root.evaluate((e) => getComputedStyle(e).backgroundColor);
      const dark = await color();
      await page.emulateMedia({ colorScheme: "light" });
      await expect.poll(color).not.toBe(dark);
      const light = await color();
      await page.emulateMedia({ colorScheme: "dark" });
      await expect.poll(color).toBe(dark);
      await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
      const html = await context.request.get(base + "/account");
      assert.ok((await html.text()).includes('data-theme="dark"'));
      // No custom inline bootstrap or CSP changes: the real server emits the saved preference.
      await page.reload();
      await expect(root).toHaveAttribute("data-theme", "dark");
      await page
        .getByRole("button", { name: "Account center · Heritage reader" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Account center · Heritage reader" }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Account center · Heritage reader" })
        .click();
      await page.mouse.click(5, 500);
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Account center · Heritage reader" })
        .click();
      const dialog = page.getByRole("dialog");
      await page.keyboard.press("Shift+Tab");
      assert.ok(
        await dialog.evaluate((d) => d.contains(document.activeElement)),
      );
      await page.screenshot({
        path: path.join(artifact, "account-sheet-mobile.png"),
        fullPage: false,
      });
      await dialog
        .getByRole("link", { name: "Account settings", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page
        .getByLabel("Display name", { exact: true })
        .fill("Heritage reader");
      const save = page.getByRole("button", { name: "Save settings" });
      await save.hover();
      await page.mouse.down();
      assert.notEqual(
        await save.evaluate((e) => getComputedStyle(e).transform),
        "none",
      );
      await page.screenshot({
        path: path.join(artifact, "account-press.png"),
        fullPage: true,
      });
      await page.mouse.up();
      await expect(page.getByRole("status")).toContainText("Settings saved.");
      const audio = () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __heritageAudio: {
                  created: number;
                  started: number;
                  stopped: number;
                  closed: number;
                };
              }
            ).__heritageAudio,
        );
      assert.equal((await audio()).created, 0);
      await page.goto(base + "/catalogue");
      await expect(
        page.getByRole("heading", { name: /Grow, together/ }),
      ).toBeVisible();
      assert.equal(await page.locator(".heritage-listings article").count(), 4);
      await expect(page.getByText("Hidden private fixture")).toHaveCount(0);
      await expect(page.getByText("SECRET", { exact: true })).toHaveCount(0);
      assert.equal(
        await page
          .getByRole("checkbox", { name: "Discovery sound" })
          .isChecked(),
        false,
      );
      for (const [size, width, height] of [
        ["desktop", 1440, 1100],
        ["tablet", 820, 1180],
        ["mobile", 390, 844],
      ] as const) {
        await page.setViewportSize({ width, height });
        for (const theme of ["dark", "light"]) {
          await page
            .getByLabel("Appearance", { exact: true })
            .selectOption(theme);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          await page.screenshot({
            path: path.join(artifact, `marketplace-${theme}-${size}.png`),
            fullPage: true,
          });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
      const explore = page.getByRole("link", { name: "Explore items" });
      await explore.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".soil-burst i")).toHaveCount(9);
      await page.evaluate(() =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a instanceof CSSAnimation && a.animationName === "soil-scatter",
          )
          .forEach((a) => {
            a.pause();
            a.currentTime = 110;
          }),
      );
      await page.screenshot({
        path: path.join(artifact, "soil-keyboard-frame.png"),
        fullPage: true,
      });
      await expect(page.locator(".soil-burst")).toHaveCount(0);
      assert.equal((await audio()).created, 0);
      await page.getByRole("checkbox", { name: "Discovery sound" }).check();
      assert.equal((await audio()).created, 0);
      await page
        .locator(".heritage-preferences")
        .screenshot({ path: path.join(artifact, "sound-opt-in.png") });
      await page.locator(".heritage-category").first().hover();
      await page
        .locator(".heritage-categories")
        .screenshot({ path: path.join(artifact, "category-hover.png") });
      await explore.click();
      await expect.poll(async () => (await audio()).started).toBe(1);
      await expect.poll(async () => (await audio()).closed).toBe(1);
      assert.equal((await audio()).stopped, 1);
      await expect(page.locator(".soil-burst")).toHaveCount(0);
      await page.getByRole("checkbox", { name: "Immersive effects" }).uncheck();
      await explore.click();
      assert.equal(await page.locator(".soil-burst").count(), 0);
      await expect.poll(async () => (await audio()).started).toBe(2);
      // Sound and motion preferences are independent; reduced motion suppresses particles, not opted-in sound.
      await page.getByRole("checkbox", { name: "Immersive effects" }).check();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await explore.click();
      assert.equal(await page.locator(".soil-burst").count(), 0);
      await expect.poll(async () => (await audio()).started).toBe(3);
      await page.getByRole("checkbox", { name: "Discovery sound" }).uncheck();
      await explore.click();
      assert.equal((await audio()).started, 3);
      await page.getByRole("checkbox", { name: "Discovery sound" }).check();
      await page.reload();
      await expect(
        page.getByRole("checkbox", { name: "Discovery sound" }),
      ).toBeChecked();
      assert.equal((await audio()).created, 0); // Persisted opt-in is not autoplay.
      await page.getByRole("checkbox", { name: "Discovery sound" }).uncheck();
      await page
        .locator(".heritage-category")
        .filter({ hasText: "Cameras" })
        .click();
      await expect(page).toHaveURL(/category=Cameras/);
      await expect(page.locator(".heritage-listings article")).toHaveCount(1);
      await expect(
        page.locator(".heritage-listings article").getByRole("link"),
      ).toHaveAttribute("href", `/listings/${ids[0]}`);
      await page.screenshot({
        path: path.join(artifact, "category-selected.png"),
        fullPage: true,
      });
      const texture = await page
        .locator(".heritage-how")
        .screenshot({ path: path.join(artifact, "paper-detail.png") });
      assert.ok(texture.length > 1000);
      await page.goto(base + "/catalogue?category=SECRET");
      await expect(page.getByText("Hidden private fixture")).toHaveCount(0);
      assert.equal(await page.locator(".heritage-listings article").count(), 4);
      const fallbackContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      collectBrowserErrors(fallbackContext, errors);
      await fallbackContext.addInitScript({
        content: `Object.defineProperty(window,'AudioContext',{value:undefined});Storage.prototype.getItem=function(){throw Error('Fixture storage unavailable');};Storage.prototype.setItem=function(){throw Error('Fixture storage unavailable');};`,
      });
      const fallbackPage = await fallbackContext.newPage();
      await fallbackPage.goto(base + "/catalogue");
      await fallbackPage
        .getByRole("checkbox", { name: "Discovery sound" })
        .check();
      await fallbackPage
        .getByLabel("Appearance", { exact: true })
        .selectOption("dark");
      await expect(fallbackPage.locator(".heritage")).toHaveAttribute(
        "data-theme",
        "dark",
      );
      const touch = fallbackPage.getByRole("link", { name: "Explore items" });
      await touch.tap();
      await expect(fallbackPage.locator(".soil-burst i")).toHaveCount(9);
      await expect(fallbackPage.locator(".soil-burst")).toHaveCount(0);
      await fallbackContext.close();
      assert.deepEqual(errors, []);
      await writeFile(
        path.join(artifact, "heritage-ux.json"),
        JSON.stringify(
          {
            liveSystem: { light, dark },
            savedDarkServerRendered: true,
            sheetEscapeOutsideFocusAndNavigation: true,
            noHorizontalOverflow: [1440, 820, 390],
            keyboardParticles: 9,
            particlesCleaned: true,
            audioDefaultOff: true,
            realNativeAudioStartStopAndClose: true,
            noAutoplay: true,
            independentMotionAndSound: true,
            realCategoryFiltering: true,
            restrictedListingExcluded: true,
            unmountNavigation: true,
            touchParticles: true,
            storageAndAudioUnavailableFallback: true,
            unexpectedBrowserErrors: errors,
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
