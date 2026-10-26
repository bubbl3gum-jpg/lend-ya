import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
test(
  "Batch 10A persisted announcements, controlled audience, atomic history and responsive authoring",
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
          name: "Announcement fixture",
          email: randomUUID() + "@fixture.test",
          password: "Owned-announcement-93!",
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
    const call = async (
      body: object,
      cookie = admin.cookie,
      headers: Record<string, string> = {},
    ) => {
      const r = await fetch(base + "/api/admin/announcements", {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          Cookie: cookie,
          ...headers,
        },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    const create = () => ({
      action: "CREATE",
      requestId: randomUUID(),
      title: "Routine test notice",
      body: "Owned fixture; no reader delivery.",
    });
    const publish = async (
      id: string,
      version: number,
      start: number,
      end: number,
    ) =>
      call({
        action: "PUBLISH",
        requestId: randomUUID(),
        id,
        version,
        startsAt: new Date(start).toISOString(),
        expiresAt: new Date(end).toISOString(),
      });
    const visible = async (cookie = admin.cookie) => {
      const r = await fetch(base + "/dev/announcements", {
        headers: { Cookie: cookie },
      });
      return { status: r.status, text: await r.text() };
    };
    try {
      await t.test(
        "authorization, strict commands, Origin and selectors",
        async () => {
          for (const [cookie, status] of [
            ["", 401],
            [ordinary.cookie, 403],
            [unlisted.cookie, 403],
          ] as const)
            assert.equal((await call(create(), cookie)).status, status);
          assert.equal(
            (await call(create(), admin.cookie, { Origin: "http://evil.test" }))
              .status,
            403,
          );
          assert.equal(
            (await call(create(), admin.cookie, { Origin: "" })).status,
            403,
          );
          for (const patch of [
            { role: "SUPER_ADMIN" },
            { creatorId: ordinary.id },
            { risk: "LOW" },
            { audience: "PUBLIC" },
            { title: "<script>alert(1)</script>" },
            { body: "x".repeat(4001) },
          ])
            assert.equal((await call({ ...create(), ...patch })).status, 400);
          for (const q of [
            "?id=1",
            "?history=foreign",
            "?history=" + randomUUID() + "&history=" + randomUUID(),
          ])
            assert.equal(
              (
                await fetch(base + "/api/admin/announcements" + q, {
                  headers: { Cookie: admin.cookie },
                })
              ).status,
              400,
            );
          assert.equal((await visible(ordinary.cookie)).status, 404);
          assert.equal((await visible(unlisted.cookie)).status, 404);
        },
      );
      let id = "",
        version = 1;
      await t.test(
        "persisted draft, concurrent idempotency and conflicting edits",
        async () => {
          const c = create(),
            results = await Promise.all([call(c), call(c)]);
          assert.deepEqual(
            results.map((x) => x.status),
            [200, 200],
          );
          assert.equal(results[0].body.id, results[1].body.id);
          id = results[0].body.id;
          assert.equal(
            (await call({ ...c, title: "Changed payload" })).status,
            409,
          );
          assert.ok(!(await visible()).text.includes(c.body));
          const edits = await Promise.all([
            call({
              action: "EDIT",
              requestId: randomUUID(),
              id,
              version,
              title: "Scheduled fixture",
              body: "Future-only content",
            }),
            call({
              action: "EDIT",
              requestId: randomUUID(),
              id,
              version,
              title: "Scheduled fixture",
              body: "Future-only content",
            }),
          ]);
          assert.deepEqual(edits.map((x) => x.status).sort(), [200, 409]);
          version = 2;
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "AnnouncementEvent" WHERE "announcementId"=$1`,
                [id],
              )
            ).rows[0].n,
            2,
          );
        },
      );
      await t.test(
        "server scheduling, expiration, withdrawal and immutable events",
        async () => {
          const now = Date.now();
          assert.equal(
            (await publish(id, version, now + 3600000, now + 7200000)).status,
            200,
          );
          version++;
          assert.ok(!(await visible()).text.includes("Future-only content"));
          const active = await call({
            ...create(),
            title: "Active fixture",
            body: "Only active fixture content",
          });
          assert.equal(
            (await publish(active.body.id, 1, now - 60000, now + 3600000))
              .status,
            200,
          );
          assert.ok(
            (await visible()).text.includes("Only active fixture content"),
          );
          const expired = await call({
            ...create(),
            title: "Expired fixture",
            body: "Expired hidden content",
          });
          assert.equal(
            (await publish(expired.body.id, 1, now - 120000, now - 60000))
              .status,
            200,
          );
          assert.ok(!(await visible()).text.includes("Expired hidden content"));
          assert.equal(
            (
              await call({
                action: "WITHDRAW",
                requestId: randomUUID(),
                id: active.body.id,
                version: 2,
              })
            ).status,
            200,
          );
          assert.ok(
            !(await visible()).text.includes("Only active fixture content"),
          );
          for (const sql of [
            `UPDATE "AnnouncementEvent" SET action='EDIT'`,
            `DELETE FROM "AnnouncementEvent"`,
            `DELETE FROM "Announcement"`,
            `UPDATE "Announcement" SET title='Unlogged edit',version=version+1 WHERE id='${id}'`,
          ])
            await assert.rejects(db.query(sql));
          assert.equal(
            (
              await call({
                action: "EDIT",
                requestId: randomUUID(),
                id,
                version,
                title: "Unsafe replacement",
                body: "Cannot alter published content",
              })
            ).status,
            409,
          );
        },
      );
      await t.test(
        "actual server-clock transition and audience/time selector refusal",
        async () => {
          const draft = await call({
            ...create(),
            title: "Clock fixture",
            body: "Clock-bound visible fixture",
          });
          const now = Date.now();
          assert.equal(
            (await publish(draft.body.id, 1, now + 1500, now + 4000)).status,
            200,
          );
          assert.ok(
            !(await visible()).text.includes("Clock-bound visible fixture"),
          );
          await new Promise((r) => setTimeout(r, 1700));
          assert.ok(
            (await visible()).text.includes("Clock-bound visible fixture"),
          );
          await new Promise((r) => setTimeout(r, 2400));
          assert.ok(
            !(await visible()).text.includes("Clock-bound visible fixture"),
          );
          assert.equal(
            (
              await fetch(
                base + "/dev/announcements?audience=PUBLIC&now=2035-01-01",
                { headers: { Cookie: admin.cookie } },
              )
            ).status,
            404,
          );
        },
      );
      await t.test(
        "event failure rolls back create, edit and publish",
        async () => {
          const draft = await call({ ...create(), title: "Rollback draft" });
          await db.query(
            `CREATE FUNCTION fail_announcement_event() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Fixture audit unavailable';END$$; CREATE TRIGGER fail_announcement_event BEFORE INSERT ON "AnnouncementEvent" FOR EACH ROW EXECUTE FUNCTION fail_announcement_event()`,
          );
          try {
            const before = (
              await db.query(`SELECT count(*)::int n FROM "Announcement"`)
            ).rows[0].n;
            assert.equal((await call(create())).status, 500);
            assert.equal(
              (
                await call({
                  action: "EDIT",
                  requestId: randomUUID(),
                  id: draft.body.id,
                  version: 1,
                  title: "Must roll back",
                  body: "Must roll back",
                })
              ).status,
              500,
            );
            assert.equal(
              (
                await publish(
                  draft.body.id,
                  1,
                  Date.now() - 1000,
                  Date.now() + 60000,
                )
              ).status,
              500,
            );
            assert.equal(
              (await db.query(`SELECT count(*)::int n FROM "Announcement"`))
                .rows[0].n,
              before,
            );
            const row = (
              await db.query(
                `SELECT state,title,version FROM "Announcement" WHERE id=$1`,
                [draft.body.id],
              )
            ).rows[0];
            assert.deepEqual(row, {
              state: "DRAFT",
              title: "Rollback draft",
              version: 1,
            });
          } finally {
            await db.query(
              `DROP TRIGGER fail_announcement_event ON "AnnouncementEvent"; DROP FUNCTION fail_announcement_event()`,
            );
          }
        },
      );
      await t.test(
        "bounded history always retains a final withdrawal slot",
        async () => {
          const draft = await call({
            ...create(),
            title: "History-cap fixture",
          });
          assert.equal(draft.status, 200);
          await db.query("BEGIN");
          try {
            for (let v = 2; v <= 498; v++)
              await db.query(
                `WITH updated AS(UPDATE "Announcement" SET version=version+1 WHERE id=$1 RETURNING id) INSERT INTO "AnnouncementEvent"("announcementId","actorId",action,"previousVersion","resultingVersion","requestId","requestHash") SELECT id,$2,'EDIT',$3::int-1,$3::int,gen_random_uuid(),repeat('e',64) FROM updated`,
                [draft.body.id, admin.id, v],
              );
            await db.query(
              `WITH updated AS(UPDATE "Announcement" SET version=499,state='PUBLISHED',"startsAt"=NOW()-interval '1 minute',"expiresAt"=NOW()+interval '1 hour' WHERE id=$1 RETURNING id) INSERT INTO "AnnouncementEvent"("announcementId","actorId",action,"previousVersion","resultingVersion","requestId","requestHash")SELECT id,$2,'PUBLISH',498,499,gen_random_uuid(),repeat('e',64) FROM updated`,
              [draft.body.id, admin.id],
            );
            await db.query("COMMIT");
          } catch (e) {
            await db.query("ROLLBACK");
            throw e;
          }
          assert.equal(
            (
              await call({
                action: "WITHDRAW",
                requestId: randomUUID(),
                id: draft.body.id,
                version: 499,
              })
            ).status,
            200,
          );
          const history = await fetch(
            base + "/api/admin/announcements?history=" + draft.body.id,
            { headers: { Cookie: admin.cookie } },
          );
          const j = await history.json();
          assert.equal(j.events.length, 500);
          assert.equal(j.events[499].action, "WITHDRAW");
          assert.equal(j.events[499].resultingVersion, 500);
        },
      );
      await t.test(
        "account suspension, expiry and minimal history / settings",
        async () => {
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [admin.id],
          );
          assert.equal((await call(create())).status, 403);
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
          assert.equal((await call(create())).status, 401);
          await db.query(
            `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES($1,$2,NOW()+interval '1 hour') ON CONFLICT("tokenHash") DO UPDATE SET "expiresAt"=NOW()+interval '1 hour'`,
            [admin.id, hash],
          );
          const r = await fetch(
            base + "/api/admin/announcements?history=" + id,
            { headers: { Cookie: admin.cookie } },
          );
          assert.match(r.headers.get("cache-control")!, /private, no-store/);
          const j = await r.json();
          assert.ok(j.events.length);
          for (const e of j.events)
            assert.deepEqual(
              Object.keys(e).sort(),
              [
                "id",
                "announcementId",
                "actorId",
                "action",
                "previousVersion",
                "resultingVersion",
                "createdAt",
              ].sort(),
            );
          const settings = await fetch(base + "/admin/settings", {
            headers: { Cookie: admin.cookie },
          });
          assert.equal(settings.status, 200);
          const text = await settings.text();
          assert.ok(!text.includes(process.env.DATABASE_URL!));
          assert.ok(!text.includes("tokenHash"));
        },
      );
      await t.test(
        "desktop tablet mobile real browser authoring, preview, history, navigation and Taiwan time",
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
            await page.goto(base + "/admin/announcements");
            await page
              .getByRole("button", { name: "New announcement", exact: true })
              .click();
            await page
              .getByLabel("Title (120 characters)")
              .fill("Browser-authored fixture");
            await page
              .getByLabel("Body (4,000 characters, plain text)")
              .fill("Browser-authored persisted notice & safe punctuation.");
            await page
              .getByRole("button", { name: "Save draft", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Recorded version 1",
            );
            await page
              .getByRole("button", { name: "Preview text", exact: true })
              .click();
            await expect(
              page.getByRole("article", { name: "Text preview" }),
            ).toContainText("Browser-authored persisted notice");
            await page
              .getByLabel("Publication start", { exact: true })
              .fill("2026-10-27T09:00");
            await page
              .getByLabel("Expiration", { exact: true })
              .fill("2026-10-28T09:00");
            await page
              .getByRole("button", { name: "Publish / schedule test notice" })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Recorded version 2",
            );
            await expect(page.getByLabel("Change history")).toContainText(
              "PUBLISH",
            );
            await expect(page.getByLabel("Change history")).toContainText(
              "Asia/Taipei",
            );
            for (const [name, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await page.setViewportSize({ width, height });
              await page
                .getByRole("button", { name: /^Browser-authored fixture/ })
                .click();
              await expect(page.getByLabel("Change history")).toContainText(
                "PUBLISH",
              );
              await page
                .getByRole("button", { name: "Preview text", exact: true })
                .click();
              await page.screenshot({
                path: path.join(dir, "announcements-" + name + ".png"),
                fullPage: true,
                caret: "initial",
                style: "nextjs-portal { display:none !important }",
              });
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.goto(base + "/admin/settings");
              await expect(
                page.getByRole("heading", {
                  name: "Platform Settings",
                  exact: true,
                }),
              ).toBeVisible();
              if (name === "desktop")
                await writeFile(
                  path.join(dir, "settings-effective.json"),
                  JSON.stringify(
                    await page.locator("article").evaluateAll((items) =>
                      items.map((item) => ({
                        label: item.querySelector("h2,h3")?.textContent,
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
              await page.screenshot({
                path: path.join(dir, "settings-" + name + ".png"),
                fullPage: true,
                caret: "initial",
                style: "nextjs-portal { display:none !important }",
              });
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.goto(base + "/admin/announcements");
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
      const events = (
        await db.query(
          `SELECT action,"previousVersion","resultingVersion","createdAt" FROM "AnnouncementEvent" ORDER BY "createdAt"`,
        )
      ).rows;
      await writeFile(
        path.join(dir, "announcement-history.json"),
        JSON.stringify(
          { events, privateContentStoredInEvents: false },
          null,
          2,
        ),
      );
    } finally {
      await db.end();
    }
  },
);
