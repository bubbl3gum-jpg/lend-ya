import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
const visibleKey = "dev.announcements.visible",
  maxKey = "dev.announcements.maxVisible";
test(
  "Batch 10B exact display configuration, immutable revisions, real consumer and responsive editor",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      dir = process.env.MRT_TEST_ARTIFACT_DIR!;
    const actor = async (admin: boolean) => {
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Settings fixture",
          email: randomUUID() + "@fixture.test",
          password: "Owned-settings-93!",
        }),
      });
      assert.equal(r.status, 201);
      const { user } = await r.json();
      if (admin)
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      return {
        id: user.id,
        cookie: r.headers.get("set-cookie")!.match(/p2p_session=[^;]+/)![0],
      };
    };
    const admin = await actor(true),
      ordinary = await actor(false),
      unlisted = await actor(true);
    assert.equal(admin.id, 1);
    const command = (
      key = visibleKey,
      value: boolean | number = false,
      expectedVersion = 0,
    ) => ({
      key,
      value,
      expectedVersion,
      action: "SET",
      requestId: randomUUID(),
    });
    const post = async (
      body: object,
      cookie = admin.cookie,
      extra: Record<string, string> = {},
    ) => {
      const r = await fetch(base + "/api/admin/platform-settings", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
          ...extra,
        },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    const get = async (q = "", cookie = admin.cookie) => {
      const r = await fetch(base + "/api/admin/platform-settings" + q, {
        headers: { Cookie: cookie },
      });
      return { status: r.status, body: await r.json(), headers: r.headers };
    };
    const demo = async (cookie = admin.cookie) => {
      const r = await fetch(base + "/dev/announcements", {
        headers: { Cookie: cookie },
      });
      return { status: r.status, body: await r.text() };
    };
    try {
      await t.test(
        "default values, independent authorization, strict commands and CSRF",
        async () => {
          const initial = await get();
          assert.equal(initial.status, 200);
          assert.match(
            initial.headers.get("cache-control")!,
            /private, no-store/,
          );
          assert.deepEqual(
            initial.body.settings.map(
              (r: { value: unknown; version: number }) => [r.value, r.version],
            ),
            [
              [true, 0],
              [100, 0],
            ],
          );
          for (const [cookie, status] of [
            ["", 401],
            [ordinary.cookie, 403],
            [unlisted.cookie, 403],
          ] as const) {
            assert.equal((await get("", cookie)).status, status);
            assert.equal((await post(command(), cookie)).status, status);
          }
          for (const extra of [
            { Origin: "http://evil.test" },
            { Origin: "" },
            { "Sec-Fetch-Site": "cross-site" },
            { "Content-Type": "text/plain" },
          ] as Record<string, string>[])
            assert.equal(
              (await post(command(), admin.cookie, extra)).status,
              403,
            );
          for (const patch of [
            { key: "gps.radius" },
            { key: "security.sessionTTL" },
            { actorId: ordinary.id },
            { risk: "LOW" },
            { role: "SUPER_ADMIN" },
            { policy: "forged" },
            { value: "false" },
            { value: 2 },
            { expectedVersion: -1 },
            { action: ["SET"] },
          ])
            assert.equal((await post({ ...command(), ...patch })).status, 400);
          for (const value of [0, 101, 1.5, "2", null])
            assert.equal(
              (await post({ ...command(maxKey, 1), value })).status,
              400,
            );
          for (const q of [
            "?key=gps.radius",
            "?before=2",
            "?key=" + maxKey + "&key=" + visibleKey,
            "?key=" + maxKey + "&before=NaN",
            "?key=" + maxKey + "&before=9999999999",
            "?actorId=1",
          ])
            assert.equal((await get(q)).status, 400);
        },
      );
      await t.test(
        "first stored revision also rolls back if its event cannot be written",
        async () => {
          await db.query(
            `CREATE FUNCTION first_display_event_fault() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Synthetic initial event unavailable';END$$;CREATE TRIGGER first_display_event_fault BEFORE INSERT ON "DevDisplaySettingEvent" FOR EACH ROW EXECUTE FUNCTION first_display_event_fault()`,
          );
          try {
            assert.equal((await post(command())).status, 500);
            assert.equal(
              (
                await db.query(
                  `SELECT count(*)::int n FROM "DevDisplaySetting"`,
                )
              ).rows[0].n,
              0,
            );
            assert.equal((await get()).body.settings[0].version, 0);
          } finally {
            await db.query(
              `DROP TRIGGER first_display_event_fault ON "DevDisplaySettingEvent";DROP FUNCTION first_display_event_fault()`,
            );
          }
        },
      );
      await t.test(
        "persisted eligible notices remain protected while display consumers refresh",
        async () => {
          for (const [title, kind] of [
            ["Active A", "active"],
            ["Active B", "active"],
            ["Private draft", "draft"],
            ["Future hidden", "future"],
            ["Expired hidden", "expired"],
          ]) {
            const create = await fetch(base + "/api/admin/announcements", {
              method: "POST",
              headers: {
                Cookie: admin.cookie,
                Origin: base,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "CREATE",
                requestId: randomUUID(),
                title,
                body: title + " body",
              }),
            });
            assert.equal(create.status, 200);
            const row = await create.json();
            if (kind !== "draft") {
              const now = Date.now(),
                startsAt = new Date(
                  now + (kind === "future" ? 3600000 : -120000),
                ).toISOString(),
                expiresAt = new Date(
                  now + (kind === "expired" ? -60000 : 7200000),
                ).toISOString();
              const p = await fetch(base + "/api/admin/announcements", {
                method: "POST",
                headers: {
                  Cookie: admin.cookie,
                  Origin: base,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  action: "PUBLISH",
                  requestId: randomUUID(),
                  id: row.id,
                  version: 1,
                  startsAt,
                  expiresAt,
                }),
              });
              assert.equal(p.status, 200);
            }
          }
          const initial = await demo();
          assert.equal(initial.status, 200);
          assert.ok(
            initial.body.includes("Active A body") &&
              initial.body.includes("Active B body"),
          );
          for (const title of [
            "Private draft body",
            "Future hidden body",
            "Expired hidden body",
          ])
            assert.ok(!initial.body.includes(title));
          assert.equal((await post(command(maxKey, 1))).status, 200);
          const limited = await demo();
          assert.equal(
            Number(limited.body.includes("Active A body")) +
              Number(limited.body.includes("Active B body")),
            1,
          );
          assert.equal(
            (await demo(unlisted.cookie)).status,
            200,
            "Announcement reader need not hold the settings writer allowlist",
          );
          assert.equal((await post(command())).status, 200);
          assert.ok(!(await demo()).body.includes("Active A body"));
          assert.ok((await demo()).body.includes("display is disabled"));
          assert.equal((await demo(ordinary.cookie)).status, 404);
        },
      );
      await t.test(
        "concurrent edits, bounded idempotency and validated rollback create new versions",
        async () => {
          const same = command(visibleKey, true, 1),
            pair = await Promise.all([post(same), post(same)]);
          assert.deepEqual(
            pair.map((x) => x.status),
            [200, 200],
          );
          assert.deepEqual(
            pair.map((x) => x.body.version),
            [2, 2],
          );
          assert.equal((await post({ ...same, value: false })).status, 409);
          const conflict = await Promise.all([
            post(command(maxKey, 2, 1)),
            post(command(maxKey, 3, 1)),
          ]);
          assert.deepEqual(conflict.map((x) => x.status).sort(), [200, 409]);
          assert.equal(
            (
              await post({
                key: maxKey,
                action: "ROLLBACK",
                targetVersion: 0,
                expectedVersion: 2,
                requestId: randomUUID(),
              })
            ).status,
            200,
          );
          assert.equal(
            (await get()).body.settings.find(
              (r: { key: string }) => r.key === maxKey,
            ).value,
            100,
          );
          assert.ok((await demo()).body.includes("Active A body"));
          assert.equal(
            (
              await post({
                key: maxKey,
                action: "ROLLBACK",
                targetVersion: 3,
                expectedVersion: 3,
                requestId: randomUUID(),
              })
            ).status,
            400,
          );
          const history = await get("?key=" + maxKey);
          assert.equal(history.body.events[0].action, "ROLLBACK");
          assert.equal(history.body.events[0].rollbackVersion, 0);
          assert.equal(history.body.events[0].version, 3);
          assert.equal(history.body.events[0].actorId, admin.id);
          assert.equal(
            (await get("?key=" + maxKey + "&before=3")).body.events[0].version,
            2,
          );
        },
      );
      await t.test(
        "immutable events, audit rollback, unavailable storage and invalid data fail closed",
        async () => {
          for (const sql of [
            `UPDATE "DevDisplaySettingEvent" SET value=1`,
            `DELETE FROM "DevDisplaySettingEvent"`,
            `TRUNCATE "DevDisplaySettingEvent"`,
            `DELETE FROM "DevDisplaySetting"`,
            `UPDATE "DevDisplaySetting" SET value=2 WHERE key='${maxKey}'`,
          ])
            await assert.rejects(db.query(sql));
          await db.query(
            `CREATE FUNCTION fail_display_event() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Synthetic event unavailable';END$$; CREATE TRIGGER fail_display_event BEFORE INSERT ON "DevDisplaySettingEvent" FOR EACH ROW EXECUTE FUNCTION fail_display_event()`,
          );
          try {
            assert.equal((await post(command(maxKey, 4, 3))).status, 500);
            assert.equal(
              (await get()).body.settings.find(
                (r: { key: string }) => r.key === maxKey,
              ).version,
              3,
            );
          } finally {
            await db.query(
              `DROP TRIGGER fail_display_event ON "DevDisplaySettingEvent";DROP FUNCTION fail_display_event()`,
            );
          }
          await db.query(
            `ALTER TABLE "DevDisplaySetting" RENAME TO "DevDisplaySettingUnavailable"`,
          );
          try {
            assert.equal((await get()).status, 500);
            const page = await demo();
            assert.equal(page.status, 200);
            assert.ok(page.body.includes("display is unavailable"));
            assert.ok(!page.body.includes("Active A body"));
            assert.equal((await post(command(maxKey, 5, 3))).status, 500);
          } finally {
            await db.query(
              `ALTER TABLE "DevDisplaySettingUnavailable" RENAME TO "DevDisplaySetting"`,
            );
          }
          // Corruption injection affects only this new table in the ownership-verified fixture.
          const check = (
            await db.query(
              `SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='"DevDisplaySetting"'::regclass AND conname='DevDisplaySetting_policy_check'`,
            )
          ).rows[0];
          assert.ok(check);
          await db.query(
            `ALTER TABLE "DevDisplaySetting" DROP CONSTRAINT "DevDisplaySetting_policy_check";ALTER TABLE "DevDisplaySetting" DISABLE TRIGGER USER`,
          );
          try {
            await db.query(
              `UPDATE "DevDisplaySetting" SET policy='invalid-fixture' WHERE key=$1`,
              [maxKey],
            );
            await db.query(
              `ALTER TABLE "DevDisplaySetting" ENABLE TRIGGER USER`,
            );
            assert.equal((await get()).status, 500);
            assert.ok((await demo()).body.includes("display is unavailable"));
          } finally {
            await db.query(
              `ALTER TABLE "DevDisplaySetting" DISABLE TRIGGER USER`,
            );
            await db.query(
              `UPDATE "DevDisplaySetting" SET policy='owned-display-10b-v1' WHERE key=$1`,
              [maxKey],
            );
            await db.query(
              `ALTER TABLE "DevDisplaySetting" ENABLE TRIGGER USER;ALTER TABLE "DevDisplaySetting" ADD CONSTRAINT "DevDisplaySetting_policy_check" ${check.definition}`,
            );
          }
          assert.ok((await demo()).body.includes("Active A body"));
        },
      );
      await t.test(
        "suspended, expired and wrong marker actors cannot mutate; safe projections",
        async () => {
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [admin.id],
          );
          assert.equal((await post(command(maxKey, 5, 3))).status, 403);
          await db.query(
            `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
            [admin.id],
          );
          const hash = createHash("sha256")
            .update(admin.cookie.split("=")[1])
            .digest("hex");
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE "tokenHash"=$1`,
            [hash],
          );
          assert.equal((await post(command(maxKey, 5, 3))).status, 401);
          await db.query(
            `INSERT INTO "AuthSession"("userId","tokenHash","expiresAt")VALUES($1,$2,NOW()+interval '1 hour')`,
            [admin.id, hash],
          );
          const meta = (
            await db.query(
              `SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`,
            )
          ).rows[0];
          await db.query(
            `COMMENT ON DATABASE "${meta.name}" IS 'invalid-owned-fixture'`,
          );
          try {
            assert.equal((await post(command(maxKey, 5, 3))).status, 404);
          } finally {
            await db.query(
              `COMMENT ON DATABASE "${meta.name}" IS '${meta.marker}'`,
            );
          }
          const r = await get("?key=" + maxKey),
            text = JSON.stringify(r.body);
          assert.ok(
            !text.includes("requestHash") &&
              !text.includes("tokenHash") &&
              !text.includes(process.env.DATABASE_URL!),
          );
        },
      );
      await t.test(
        "responsive actual browser editor, search, unsaved feedback, history and consumer refresh",
        async () => {
          const browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH,
            headless: true,
          });
          try {
            const context = await browser.newContext();
            await context.addCookies([
              {
                name: "p2p_session",
                value: admin.cookie.split("=")[1],
                url: base,
              },
            ]);
            const page = await context.newPage();
            await page.goto(base + "/admin/settings");
            const card = page.getByRole("article", {
              name: "Maximum development notices",
              exact: true,
            });
            await card
              .getByLabel("Maximum development notices value", { exact: true })
              .fill("1");
            await expect(card).toContainText("Unsaved change");
            await card
              .getByRole("button", {
                name: "Save maximum development notices",
                exact: true,
              })
              .click();
            await expect(card).toContainText("Recorded version 4");
            await expect(card).toContainText("SET");
            await expect(card).toContainText("Asia/Taipei");
            const preview = await context.newPage();
            await preview.goto(base + "/dev/announcements");
            assert.equal(await preview.locator("article").count(), 1);
            await preview.close();
            assert.equal((await post(command(maxKey, 2, 4))).status, 200);
            await card
              .getByLabel("Maximum development notices value", { exact: true })
              .fill("3");
            await card
              .getByRole("button", {
                name: "Save maximum development notices",
                exact: true,
              })
              .click();
            await expect(card).toContainText(
              "Setting changed; reload before retrying.",
            );
            page.once("dialog", (d) => d.accept());
            await card
              .getByRole("button", { name: "Reload current version" })
              .click();
            await expect(card).toContainText("version 5");
            page.once("dialog", (d) => d.accept());
            await card.getByRole("button", { name: "Record rollback" }).click();
            await expect(card).toContainText("Recorded version 6");
            await expect(card).toContainText("ROLLBACK");

            for (const [name, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await page.setViewportSize({ width, height });
              await card
                .getByLabel("Maximum development notices value", {
                  exact: true,
                })
                .fill("99");
              await expect(card).toContainText("Unsaved change");
              await card
                .getByLabel("Maximum development notices value", {
                  exact: true,
                })
                .fill("100");
              await expect(card).toContainText(
                "Matches the current effective value.",
              );

              await page
                .getByLabel("Search safe values and sources")
                .fill("gps");
              await expect(
                page.getByLabel("Read-only operational inventory"),
              ).toContainText("Maximum GPS accuracy");
              await page.getByLabel("Search safe values and sources").fill("");
              await expect(
                page
                  .getByLabel("Read-only operational inventory")
                  .locator("article"),
              ).toHaveCount(31);
              if (name === "desktop")
                await writeFile(
                  path.join(dir, "operational-settings-effective.json"),
                  JSON.stringify(
                    await page
                      .getByLabel("Read-only operational inventory")
                      .locator("article")
                      .evaluateAll((items) =>
                        items.map((item) => ({
                          label: item.querySelector("h3")?.textContent,
                          value: item.querySelector("p")?.textContent,
                          metadata: Array.from(item.querySelectorAll("dd")).map(
                            (x) => x.textContent,
                          ),
                        })),
                      ),
                    null,
                    2,
                  ),
                );
              await page.evaluate(() => window.scrollTo(0, 0));
              await page.screenshot({
                path: path.join(dir, "settings-controls-" + name + ".png"),
                fullPage: false,
                caret: "initial",
                style: "nextjs-portal{display:none!important}",
              });
              await page.screenshot({
                path: path.join(dir, "settings-editor-" + name + ".png"),
                fullPage: true,
                caret: "initial",
                style: "nextjs-portal{display:none!important}",
              });
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
            }
            await page.keyboard.press("Tab");
            assert.ok(
              await page.evaluate(
                () => document.activeElement?.tagName !== "BODY",
              ),
            );
            await context.close();
          } finally {
            await browser.close();
          }
        },
      );
      await writeFile(
        path.join(dir, "settings-contract-evidence.json"),
        JSON.stringify(
          {
            effective: (await get()).body,
            history: (await get("?key=" + maxKey)).body,
            realConsumerVerified: true,
            readonlyEntriesPreserved: 31,
          },
          null,
          2,
        ),
      );
    } finally {
      await db.end();
    }
  },
);
