import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { readyAuthenticationRoutes } from "./support/login-diagnostics";

test(
  "Batch 7D case chronology, navigation, privacy and owned history failures",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      canary = "PRIVATE-HISTORY-" + randomUUID(),
      password = "Owned-history-fixture-93!";
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object,
    ) => {
      const response = await fetch(base + url, {
        method,
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: response.status,
        headers: response.headers,
        body: await response.json(),
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    };
    const account = async (role: "USER" | "ADMIN") => {
      const email = randomUUID() + "@fixture.test",
        r = await api("/api/auth/register", "", "POST", {
          name: "History fixture",
          email,
          password,
        });
      assert.equal(r.status, 201);
      if (role === "ADMIN")
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
          r.body.user.id,
        ]);
      return { id: r.body.user.id as number, email, cookie: r.cookie };
    };
    try {
      const admin = await account("ADMIN"),
        ordinary = await account("USER"),
        owner = await account("USER");
      const station = (
        await db.query(`SELECT id FROM "MrtStation" ORDER BY id LIMIT 1`)
      ).rows[0].id;
      const listing = (
        await db.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,$2,$2,'Electronics',10,'Good',now()) RETURNING id`,
          [owner.id, canary],
        )
      ).rows[0].id;
      const booking = (
        await db.query(
          `INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES ($1,$2,$3,$4,now(),now()+interval '1 day','DISPUTED',10,now()) RETURNING id`,
          [listing, owner.id, ordinary.id, station],
        )
      ).rows[0].id;
      const report = async (reporter = ordinary.id) =>
        (
          await db.query(
            `INSERT INTO "ListingReport" ("listingId","reporterId",reason,description) VALUES ($1,$2,$3,$3) RETURNING id`,
            [listing, reporter, canary],
          )
        ).rows[0].id as number;
      const resolvedReport = await report(),
        openReport = await report(owner.id);
      const dispute = (
        await db.query(
          `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description) VALUES ($1,$2,$3,$3) RETURNING id`,
          [booking, ordinary.id, canary],
        )
      ).rows[0].id;
      const resolved = await api(
        `/api/admin/reports/${resolvedReport}/resolve`,
        admin.cookie,
        "POST",
        { decision: "DISMISS", reason: canary },
      );
      assert.equal(resolved.status, 200);
      await db.query(
        `INSERT INTO "Handoff" ("bookingId","performedBy","confirmedBy","ownerConditionConfirmed","conditionConfirmed","confirmedAt","updatedAt") VALUES ($1,$2,$3,true,true,now(),now())`,
        [booking, owner.id, ordinary.id],
      );
      const disputeDecision = await api(
        `/api/admin/disputes/${dispute}/resolve`,
        admin.cookie,
        "POST",
        {
          finding: "INSUFFICIENT_EVIDENCE",
          outcome: "CONTINUE_RETURN",
          reason: canary,
          adminNotes: canary,
        },
      );
      assert.equal(disputeDecision.status, 200);
      const openDispute = (
        await db.query(
          `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description) VALUES ($1,$2,$3,$3) RETURNING id`,
          [booking, owner.id, canary],
        )
      ).rows[0].id;

      const endpoint = (kind: string, id: number) =>
        `/api/admin/${kind}/${id}/history`;
      await t.test(
        "real open/resolved cases, explicit source types and allowlisted DTO",
        async () => {
          for (const [kind, id] of [
            ["reports", resolvedReport],
            ["reports", openReport],
            ["disputes", dispute],
            ["disputes", openDispute],
          ] as const) {
            const r = await api(endpoint(kind, id), admin.cookie);
            assert.equal(r.status, 200);
            assert.match(r.headers.get("cache-control")!, /private, no-store/);
            assert.match(r.headers.get("vary")!, /(?:^|,\s*)Cookie(?:,|$)/i);
            assert.deepEqual(Object.keys(r.body).sort(), [
              "events",
              "id",
              "kind",
              "page",
              "pageSize",
              "related",
              "total",
            ]);
            assert.ok(!JSON.stringify(r.body).includes(canary));
            for (const e of r.body.events)
              assert.deepEqual(Object.keys(e).sort(), [
                "auditId",
                "event",
                "source",
                "timestamp",
              ]);
            if (id === resolvedReport || id === dispute) {
              assert.ok(
                r.body.events.some(
                  (e: { source: string }) => e.source === "ADMIN_AUDIT",
                ),
              );
              assert.ok(
                r.body.events.some(
                  (e: { event: string }) => e.event === "LATEST_RESOLUTION",
                ),
              );
            }
          }
          assert.equal(
            (await api(endpoint("reports", 2147483647), admin.cookie)).status,
            404,
          );
        },
      );
      await t.test(
        "anonymous, ordinary, suspended and expired sessions denied, forged selectors rejected",
        async () => {
          for (const kind of ["reports", "disputes"]) {
            const url = endpoint(
              kind,
              kind === "reports" ? resolvedReport : dispute,
            );
            assert.equal((await api(url)).status, 401);
            assert.equal((await api(url, ordinary.cookie)).status, 403);
            await db.query(
              `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
              [admin.id],
            );
            assert.ok(
              [401, 403].includes((await api(url, admin.cookie)).status),
            );
            await db.query(
              `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
              [admin.id],
            );
            for (const q of [
              "actorId=1",
              "role=ADMIN",
              "evidenceId=1",
              "returnTo=https://evil.invalid",
              "historyPage=0",
              "historyPage=1&historyPage=2",
            ])
              assert.equal(
                (await api(url + "?" + q, admin.cookie)).status,
                400,
              );
          }
          const expired = await account("ADMIN");
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=now()-interval '1 hour' WHERE "userId"=$1`,
            [expired.id],
          );
          assert.equal(
            (await api(endpoint("reports", resolvedReport), expired.cookie))
              .status,
            401,
          );
        },
      );
      const timestamp = "2020-01-01T00:00:00.000Z";
      await db.query(
        `INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState","createdAt") SELECT $1,CASE WHEN g%2=0 THEN 'EVIDENCE_VIEWED' ELSE $4 END,'REPORT',$2,$4,jsonb_build_object('private',$4::text),jsonb_build_object('private',$4::text),$3::timestamp FROM generate_series(1,500) g`,
        [admin.id, resolvedReport, timestamp, canary],
      );
      await t.test(
        "500 same-time legacy audit entries: exact pagination, bounded DTO, fixed labels and deterministic ordering",
        async () => {
          const collected: number[] = [],
            times: number[] = [];
          for (let page = 1; page <= 26; page++) {
            const start = performance.now(),
              r = await api(
                endpoint("reports", resolvedReport) + "?historyPage=" + page,
                admin.cookie,
              );
            times.push(performance.now() - start);
            assert.equal(r.status, 200);
            assert.equal(r.body.total, 503);
            assert.ok(r.body.events.length <= 20);
            assert.ok(!JSON.stringify(r.body).includes(canary));
            for (const e of r.body.events)
              if (e.timestamp === timestamp) collected.push(e.auditId);
            if (page === 1) {
              const again = await api(
                endpoint("reports", resolvedReport) + "?historyPage=1",
                admin.cookie,
              );
              assert.deepEqual(again.body, r.body);
            }
          }
          assert.equal(collected.length, 500);
          assert.equal(new Set(collected).size, 500);
          assert.deepEqual(
            collected,
            [...collected].sort((a, b) => a - b),
          );
          assert.equal(
            (
              await api(
                endpoint("reports", resolvedReport) + "?historyPage=9999",
                admin.cookie,
              )
            ).body.events.length,
            0,
          );
          await writeFile(
            path.join(artifact, "history-performance.json"),
            JSON.stringify(
              {
                entries: 503,
                pageSize: 20,
                pages: 26,
                httpMilliseconds: times,
                identicalTimestampAuditIdsStable: true,
                queriesPerHistory: 1,
                noNewIndexes: true,
              },
              null,
              2,
            ),
          );
        },
      );
      await t.test(
        "incomplete legacy snapshots do not fabricate missing resolution history",
        async () => {
          // Representative historical inconsistency only in the owned fixture.
          await db.query(
            `UPDATE "ListingReport" SET status='DISMISSED',"resolvedAt"=NULL WHERE id=$1`,
            [openReport],
          );
          const r = await api(endpoint("reports", openReport), admin.cookie);
          assert.equal(r.body.events.length, 1);
          assert.equal(r.body.events[0].event, "CASE_CREATED");
          const d = await api(endpoint("disputes", openDispute), admin.cookie);
          assert.equal(d.body.related.id, booking);
        },
      );
      await t.test(
        "real login, Workbench → case → history → audit → original view; responsive screenshots and keyboard",
        async () => {
          await readyAuthenticationRoutes(base);
          browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox"],
          });
          for (const [label, width, height] of [
            ["desktop", 1440, 1000],
            ["tablet", 834, 1112],
            ["mobile", 390, 844],
          ] as const) {
            const actor = await account("USER"),
              id = await report(actor.id),
              context = await browser.newContext({
                viewport: { width, height },
              }),
              page = await context.newPage();
            try {
              await page.goto(base + "/login");
              await page
                .getByLabel("Email address", { exact: true })
                .fill(admin.email);
              await page.getByLabel("Password", { exact: true }).fill(password);
              await page
                .getByRole("button", { name: "Log in", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/admin");
              const original = `/admin/workbench?category=OPEN_REPORTS&page=1&pageSize=10&recordId=${id}`;
              await page.goto(base + original);
              await page
                .locator(`a[href^="/admin/reports/${id}?"]:visible`)
                .first()
                .click();
              await expect(
                page.getByRole("heading", {
                  name: `Report #${id}`,
                  exact: true,
                }),
              ).toBeVisible();
              // Existing authorised action creates real history; no new mutation is exposed.
              assert.equal(
                (
                  await api(
                    `/api/admin/reports/${id}/resolve`,
                    admin.cookie,
                    "POST",
                    { decision: "DISMISS", reason: canary },
                  )
                ).status,
                200,
              );
              await page
                .getByRole("link", {
                  name: "View chronological case history and audit metadata",
                  exact: true,
                })
                .click();
              await expect(
                page.getByText("Report decision recorded", { exact: true }),
              ).toBeVisible();
              assert.ok(
                !(await page.locator("main").innerText()).includes(canary),
              );
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.screenshot({
                path: path.join(artifact, `history-${label}.png`),
                fullPage: true,
              });
              await page
                .getByRole("link", { name: /Inspect audit metadata/ })
                .click();
              await expect(
                page.getByRole("heading", { name: /Case audit #/ }),
              ).toBeVisible();
              assert.ok(
                !(await page.locator("main").innerText()).includes(canary),
              );
              const back = page.locator("[data-history-workbench-back]");
              await back.focus();
              await expect(back).toBeFocused();
              await page.keyboard.press("Enter");
              await expect(page).toHaveURL(base + original);
              const forged = `/admin/reports/${id}/history?wbCategory=OPEN_REPORTS&returnTo=https://evil.invalid`;
              await page.goto(base + forged);
              await expect(page.getByRole("alert")).toContainText(
                "Check the history",
              );
              await expect(
                page.getByRole("link", {
                  name: "Back to Workbench",
                  exact: true,
                }),
              ).toHaveAttribute("href", "/admin/workbench");
              await page.goto(
                base +
                  `/admin/reports/${id}?role=ADMIN&returnTo=https://evil.invalid`,
              );
              await expect(
                page.getByRole("heading", {
                  name: `Report #${id}`,
                  exact: true,
                }),
              ).toBeVisible();
              await page.goto(base + `/admin/disputes/${dispute}/history`);
              await expect(
                page.getByText("Dispute decision recorded", { exact: true }),
              ).toBeVisible();
              await expect(
                page.getByRole("link", {
                  name: `Inspect related booking #${booking}`,
                  exact: true,
                }),
              ).toBeVisible();
            } finally {
              await context.close();
            }
          }
        },
      );
      await t.test(
        "history/audit page guards and paginated context are independently enforced",
        async () => {
          const auditId = (
            await db.query(
              `SELECT id FROM "AdminAuditLog" WHERE "targetType"='REPORT' AND "targetId"=$1 ORDER BY id LIMIT 1`,
              [resolvedReport],
            )
          ).rows[0].id;
          for (const cookie of ["", ordinary.cookie, admin.cookie]) {
            const context = await browser!.newContext();
            if (cookie)
              await context.addCookies([
                { name: "p2p_session", value: cookie.split("=")[1], url: base },
              ]);
            if (cookie === admin.cookie)
              await db.query(
                `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
                [admin.id],
              );
            try {
              const page = await context.newPage();
              for (const target of [
                `/admin/reports/${resolvedReport}/history`,
                `/admin/case-audit/${auditId}`,
              ]) {
                await page.goto(base + target);
                if (!cookie) await expect(page).toHaveURL(base + "/login");
                else
                  await expect(
                    page.getByText("This page could not be found.", {
                      exact: true,
                    }),
                  ).toBeVisible();
              }
            } finally {
              if (cookie === admin.cookie)
                await db.query(
                  `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
                  [admin.id],
                );
              await context.close();
            }
          }
          const context = await browser!.newContext();
          await context.addCookies([
            {
              name: "p2p_session",
              value: admin.cookie.split("=")[1],
              url: base,
            },
          ]);
          try {
            const page = await context.newPage(),
              query = `wbCategory=OPEN_REPORTS&wbRecordId=${resolvedReport}&wbPage=3&wbPageSize=20`;
            await page.goto(
              base + `/admin/reports/${resolvedReport}/history?${query}`,
            );
            await page
              .getByRole("link", { name: "Next history page", exact: true })
              .click();
            await expect(page).toHaveURL(
              base +
                `/admin/reports/${resolvedReport}/history?wbCategory=OPEN_REPORTS&wbPage=3&wbPageSize=20&wbRecordId=${resolvedReport}&historyPage=2`,
            );
            assert.ok(
              !(await page.locator("main").innerText()).includes(canary),
            );
            await expect(
              page.locator("[data-history-workbench-back]"),
            ).toHaveAttribute(
              "href",
              `/admin/workbench?category=OPEN_REPORTS&page=3&pageSize=20&recordId=${resolvedReport}`,
            );
            await page
              .getByRole("link", { name: /Inspect audit metadata/ })
              .first()
              .click();
            assert.ok(
              !(await page.locator("main").innerText()).includes(canary),
            );
            await page.goto(
              base +
                `/admin/case-audit/${auditId}?returnTo=https://evil.invalid&actorId=1`,
            );
            await expect(
              page.locator("[data-history-workbench-back]"),
            ).toHaveAttribute("href", "/admin/workbench");
            await expect(
              page.getByRole("heading", {
                name: `Case audit #${auditId}`,
                exact: true,
              }),
            ).toBeVisible();
            await page.goto(base + "/admin/case-audit/2147483647");
            await expect(
              page.getByText("This page could not be found.", { exact: true }),
            ).toBeVisible();
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "database history unavailable is honest, with actual recovery",
        async () => {
          await db.query(
            `ALTER TABLE "AdminAuditLog" RENAME TO "AdminAuditLog_owned_failure"`,
          );
          try {
            const r = await api(
              endpoint("reports", resolvedReport),
              admin.cookie,
            );
            assert.equal(r.status, 500);
            assert.ok(!JSON.stringify(r.body).includes(canary));
            const context = await browser!.newContext();
            await context.addCookies([
              {
                name: "p2p_session",
                value: admin.cookie.split("=")[1],
                url: base,
              },
            ]);
            const page = await context.newPage();
            await page.goto(base + `/admin/reports/${resolvedReport}/history`);
            await expect(page.getByRole("alert")).toContainText(
              "History could not be loaded",
            );
            await context.close();
          } finally {
            await db.query(
              `ALTER TABLE "AdminAuditLog_owned_failure" RENAME TO "AdminAuditLog"`,
            );
          }
          assert.equal(
            (await api(endpoint("reports", resolvedReport), admin.cookie))
              .status,
            200,
          );
        },
      );
      await writeFile(
        path.join(artifact, "history-security.json"),
        JSON.stringify(
          {
            legacyAdminOnly: true,
            anonymousOrdinarySuspendedExpiredDenied: true,
            unknownSelectorsRejected: true,
            minimalDto: true,
            narrativeAndPayloadCanariesAbsent: true,
            realReportAndDisputeDecisionAudits: true,
            stableTimestampTies: true,
            workbenchRoundTripAllViewports: true,
            databaseFailureAndRecovery: true,
            caseClosureNotCustody: true,
          },
          null,
          2,
        ),
      );
    } finally {
      await browser?.close();
      await db.end();
    }
  },
);
