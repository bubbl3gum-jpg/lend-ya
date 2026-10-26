import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectTestDatabase } from "./support/test-database";
test(
  "production permits authorized read-only Locations but refuses the Lab even with its flag configured",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!;
    try {
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Production refusal fixture",
          email: randomUUID() + "@fixture.test",
          password: "Owned-production-fixture-93!",
        }),
      });
      assert.equal(r.status, 201);
      const { user } = await r.json(),
        cookie = r.headers.get("set-cookie")!.match(/p2p_session=[^;]+/)![0];
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      const read = await fetch(base + "/api/admin/locations", {
        headers: { Cookie: cookie },
      });
      assert.equal(read.status, 200);
      assert.match(read.headers.get("cache-control")!, /private, no-store/);
      assert.equal((await read.json()).stations.length, 120);
      const page = await fetch(base + "/admin/locations", {
        headers: { Cookie: cookie },
      });
      assert.equal(page.status, 200);
      assert.match(page.headers.get("cache-control")!, /no-store/);
      for (const url of [
        "/admin/locations/lab",
        "/api/admin/locations/lab/start",
        "/api/admin/locations/lab/evaluate",
      ])
        for (const method of ["GET", "POST"]) {
          if (method === "POST" && url.startsWith("/admin")) continue;
          const refused = await fetch(base + url, {
            method,
            headers: {
              Cookie: cookie,
              Origin: base,
              "Content-Type": "application/json",
            },
            ...(method === "POST"
              ? {
                  body: JSON.stringify({
                    consent: true,
                    durationSeconds: 3600,
                  }),
                }
              : {}),
          });
          assert.equal(refused.status, 404);
          assert.match(
            refused.headers.get("cache-control")!,
            /private, no-store/,
          );
        }
      assert.equal(
        (
          await db.query(
            `SELECT count(*)::int n FROM "AdminAuditLog" WHERE action LIKE 'MRT_LAB_%'`,
          )
        ).rows[0].n,
        0,
      );
    } finally {
      await db.end();
    }
  },
);
