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
      assert.equal((await fetch(base+"/api/dev/staff-listing-read",{method:"POST",headers:{Origin:base,"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify({action:"read",listingId:"1",bindingId:"11111111-1111-4111-8111-111111111111"})})).status,404);
    assert.equal((await fetch(base+"/dev/staff-listing-inspection",{headers:{Cookie:cookie}})).status,404);
    const security = await fetch(base + "/admin/security", {
        headers: { Cookie: cookie },
      });
      assert.equal(security.status, 404);
      const overview = await fetch(base + "/admin", {
        headers: { Cookie: cookie },
      });
      assert.equal(overview.status, 200);
      assert.ok(!(await overview.text()).includes('href="/admin/security"'));
      // The production-safe read route is separate from every pilot surface.
      const own = await fetch(base + "/api/admin/account-security", { headers: { Cookie: cookie } });
      assert.equal(own.status, 200);
      assert.match(own.headers.get("cache-control") ?? "", /private, no-store/);
      const ownSummary = await own.json();
      assert.deepEqual(Object.keys(ownSummary).sort(), ["createdAt", "expiresAt", "passkeyStatus", "status"]);
      assert.equal(ownSummary.passkeyStatus, "UNAVAILABLE");
      const ownPage = await fetch(base + "/admin/account-security", { headers: { Cookie: cookie } });
      assert.equal(ownPage.status, 200);
      assert.match(ownPage.headers.get("cache-control") ?? "", /no-store/);
      if (process.env.NODE_ENV === "production") assert.match(ownPage.headers.get("cache-control") ?? "", /private/);
      assert.ok((await ownPage.text()).includes("Passkey status unavailable here"));
      const workbench = await fetch(base + "/api/admin/workbench", { headers: { Cookie: cookie } });
      assert.equal(workbench.status, 200);
      assert.match(workbench.headers.get("cache-control") ?? "", /private, no-store/);
      const workbenchData = await workbench.json();
      assert.equal(workbenchData.queues.length, 6);
      assert.ok(workbenchData.queues.every((q: {count:number}) => q.count === 0));
      const workbenchPage = await fetch(base + "/admin/workbench", { headers: { Cookie: cookie } });
      assert.equal(workbenchPage.status, 200);
      assert.match(workbenchPage.headers.get("cache-control") ?? "", /no-store/);
      if (process.env.NODE_ENV === "production") assert.match(workbenchPage.headers.get("cache-control") ?? "", /private/);
      assert.ok((await workbenchPage.text()).includes("No records match this queue and filter."));
      const listingId=(await db.query(`INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'Owned production context fixture','Synthetic metadata only','Electronics',10,'Good',NOW()) RETURNING id`,[actor.userId])).rows[0].id;
      const detail = await fetch(base+`/admin/listings/${listingId}?wbCategory=LISTING_REVIEW&wbPage=2&wbPageSize=1`, {headers:{Cookie:cookie}});
      assert.equal(detail.status,200);
      assert.match(detail.headers.get("cache-control")??"",/no-store/);
      if(process.env.NODE_ENV==="production")assert.match(detail.headers.get("cache-control")??"",/private/);
      const detailHtml=await detail.text();
      assert.ok(detailHtml.includes('data-selected-queue-match="false"'));
      assert.ok(detailHtml.includes('category=LISTING_REVIEW&amp;page=2&amp;pageSize=1'));
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
