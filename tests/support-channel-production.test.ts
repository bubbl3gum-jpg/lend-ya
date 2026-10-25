import { test } from "node:test";
import assert from "node:assert/strict";
import { connectTestDatabase } from "./support/test-database";
test(
  "production refuses requester channels with both candidate flags accidentally configured",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase();
    try {
      const base = process.env.TEST_BASE_URL!,
        id = "00000000-0000-4000-8000-000000000001";
      for (const route of [
        `/api/support/tickets/${id}/channel`,
        `/api/support/channels/${id}/messages`,
        `/customer-service/tickets/${id}/channel`,
      ]) {
        for (const method of ["GET", "POST"]) {
          if (method === "POST" && route.startsWith("/customer-service"))
            continue;
          const r = await fetch(base + route, {
            method,
            headers: { Origin: base, "Content-Type": "application/json" },
            ...(method === "POST" ? { body: "{}" } : {}),
          });
          assert.equal(r.status, 404);
          assert.match(r.headers.get("cache-control")!, /private, no-store/);
        }
      }
      assert.equal(
        (await db.query(`SELECT count(*)::int n FROM "SupportMessage"`)).rows[0]
          .n,
        0,
      );
      assert.equal(
        (
          await db.query(
            `SELECT count(*)::int n FROM "SupportParticipantChannel"`,
          )
        ).rows[0].n,
        0,
      );
    } finally {
      await db.end();
    }
  },
);
