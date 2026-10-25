import { test } from "node:test";
import assert from "node:assert/strict";
import { connectTestDatabase } from "./support/test-database";
test(
  "production refuses candidate even when development feature flag is configured",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase();
    try {
      const base = process.env.TEST_BASE_URL!;
      for (const route of [
        "/api/support/tickets",
        "/api/support/tickets/00000000-0000-4000-8000-000000000001",
        "/customer-service/tickets",
        "/customer-service/tickets/new",
      ]) {
        const r = await fetch(base + route, { redirect: "manual" });
        assert.equal(r.status, 404);
        assert.match(r.headers.get("cache-control")!, /private, no-store/);
      }
      const post = await fetch(base + "/api/support/tickets", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(post.status, 404);
      const help = await fetch(base + "/customer-service");
      assert.equal(help.status, 200);
      assert.ok(
        !(await help.text()).includes("Isolated development ticket pilot"),
      );
      assert.equal(
        (await db.query(`SELECT count(*)::int n FROM "SupportTicket"`)).rows[0]
          .n,
        0,
      );
    } finally {
      await db.end();
    }
  },
);
