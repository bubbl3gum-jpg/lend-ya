import { test } from "node:test";
import assert from "node:assert/strict";
import { connectTestDatabase } from "./support/test-database";
import { mfaActorFixture } from "./support/mfa-fixtures";
test(
  "unavailable pilot refuses actual routes, hides Security and leaves all MFA tables empty",
  { timeout: 60000 },
  async () => {
    const db = await connectTestDatabase();
    try {
      const actor = await mfaActorFixture(db);
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
        actor.userId,
      ]);
      const base = process.env.TEST_BASE_URL!,
        cookie = `p2p_session=${actor.token}`;
      for (const withCookie of [false, true])
        for (const method of ["GET", "POST"]) {
          const r = await fetch(base + "/api/auth/admin-passkeys", {
            method,
            headers: {
              Origin: base,
              "Content-Type": "application/json",
              ...(withCookie ? { Cookie: cookie } : {}),
            },
            ...(method === "POST"
              ? {
                  body: JSON.stringify({
                    action: "enrollment.begin",
                    password: "irrelevant",
                  }),
                }
              : {}),
          });
          assert.equal(r.status, 404);
        }
      const security = await fetch(base + "/admin/security", {
        headers: { Cookie: cookie },
      });
      assert.equal(security.status, 404);
      const overview = await fetch(base + "/admin", {
        headers: { Cookie: cookie },
      });
      assert.equal(overview.status, 200);
      assert.ok(!(await overview.text()).includes('href="/admin/security"'));
      for (const table of [
        "StaffMfaCredential",
        "StaffMfaChallenge",
        "StaffMfaAssurance",
        "StaffMfaEvent",
        "StaffMfaVersion",
        "StaffMfaRateLimit",
      ])
        assert.equal(
          (await db.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n,
          0,
        );
    } finally {
      await db.end();
    }
  },
);
