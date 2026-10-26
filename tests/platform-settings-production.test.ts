import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectTestDatabase } from "./support/test-database";
test(
  "production read-only settings inventory; accidental settings flag cannot enable mutation",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!;
    try {
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Production fixture",
          email: randomUUID() + "@fixture.test",
          password: "Owned-prod-fixture-93!",
        }),
      });
      assert.equal(r.status, 201);
      const { user } = await r.json(),
        cookie = r.headers.get("set-cookie")!.match(/p2p_session=[^;]+/)![0];
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      for (const url of ["/admin/announcements", "/admin/settings"]) {
        const a = await fetch(base + url, { headers: { Cookie: cookie } });
        assert.equal(a.status, 200);
        assert.match(a.headers.get("cache-control")!, /no-store/);
      }
      assert.equal(
        (
          await fetch(base + "/dev/announcements", {
            headers: { Cookie: cookie },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await fetch(base + "/api/admin/platform-settings", {
            headers: { Cookie: cookie },
          })
        ).status,
        404,
      );
      const post = await fetch(base + "/api/admin/platform-settings", {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "SET",
          key: "dev.announcements.visible",
          expectedVersion: 0,
          value: false,
          requestId: randomUUID(),
        }),
      });
      assert.equal(post.status, 404);
      assert.equal(
        (await db.query(`SELECT count(*)::int n FROM "DevDisplaySetting"`))
          .rows[0].n,
        0,
      );
    } finally {
      await db.end();
    }
  },
);
