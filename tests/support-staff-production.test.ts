import { test } from "node:test";
import assert from "node:assert/strict";
import { connectTestDatabase } from "./support/test-database";
test(
  "production refuses all Support assignment/reply candidate surfaces despite configured development flag",
  { timeout: 30000 },
  async () => {
    const db = await connectTestDatabase();
    try {
      for (const route of [
        "/api/dev/support-agent",
        "/api/dev/support-requester",
        "/dev/support-agent",
        "/dev/support-requester",
        "/dev/support-companion",
        "/api/dev/support-companion",
        "/api/dev/support-companion/local",
        "/api/dev/inspection",
        "/dev/inspection",
      ])
        for (const method of ["GET", "POST"]) {
          if (method === "POST" && route.startsWith("/dev")) continue;
          const r = await fetch(process.env.TEST_BASE_URL + route, {
            method,
            headers: {
              Origin: process.env.TEST_BASE_URL!,
              "Content-Type": "application/json",
            },
            ...(method === "POST"
              ? {
                  body: JSON.stringify({
                    action: "reply",
                    role: "SUPPORT",
                    assurance: true,
                  }),
                }
              : {}),
          });
          assert.equal(r.status, 404);
          assert.match(r.headers.get("cache-control")!, /private, no-store/);
        }
      for (const table of [
        "configuration",
        "member",
        "assignment",
        "channel_grant",
        "binding",
        "audit",
        "reply",
      ])
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int n FROM hustlen_support_candidate.${table}`,
            )
          ).rows[0].n,
          0,
        );
      assert.equal(
        (
          await db.query(
            `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
          )
        ).rows[0].n,
        0,
      );
    } finally {
      await db.end();
    }
  },
);
