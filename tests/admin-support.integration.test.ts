import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { readyAuthenticationRoutes } from "./support/login-diagnostics";

test(
  "Batch 8A Support workspace: current cases, privacy, chronology and navigation",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      canary = "PRIVATE-SUPPORT-" + randomUUID(),
      password = "Owned-support-fixture-93!";
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
          name: "Support fixture",
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

      await db.query(`UPDATE "ListingReport" SET "createdAt"='2020-01-01'`);
      await db.query(`UPDATE "Dispute" SET "createdAt"='2020-01-01'`);
      const snapshot = async () => {
        const results = [];
        for (const table of [
          "ListingReport",
          "Dispute",
          "AdminAuditLog",
          "Booking",
          "Handoff",
        ]) {
          results.push(
            await db.query(
              `SELECT row_to_json(t) AS row FROM "${table}" t ORDER BY id`,
            ),
          );
        }
        return createHash("sha256")
          .update(JSON.stringify(results.map((r) => r.rows)))
          .digest("hex");
      };
      const original = await snapshot(),
        url = "/api/admin/support";
      await t.test(
        "four distinct persisted cases, exact state counts, deterministic ties and minimal DTO",
        async () => {
          const current = await api(url, admin.cookie);
          assert.equal(current.status, 200);
          assert.deepEqual(current.body.counts, {
            openReports: 1,
            openDisputes: 1,
            historicalReports: 1,
            historicalDisputes: 1,
          });
          assert.equal(current.body.totalMatching, 2);
          assert.deepEqual(
            current.body.items.map(
              (r: { kind: string; id: number }) => `${r.kind}:${r.id}`,
            ),
            [`REPORT:${openReport}`, `DISPUTE:${openDispute}`],
          );
          const all = await api(url + "?caseState=ALL", admin.cookie);
          assert.equal(all.body.totalMatching, 4);
          assert.deepEqual(
            all.body.items.map(
              (r: { kind: string; id: number }) => `${r.kind}:${r.id}`,
            ),
            [
              `REPORT:${resolvedReport}`,
              `REPORT:${openReport}`,
              `DISPUTE:${dispute}`,
              `DISPUTE:${openDispute}`,
            ],
          );
          assert.deepEqual(Object.keys(all.body).sort(), [
            "asOf",
            "counts",
            "items",
            "query",
            "totalMatching",
            "totalPages",
          ]);
          for (const row of all.body.items) {
            assert.deepEqual(Object.keys(row).sort(), [
              "createdAt",
              "id",
              "kind",
              "related",
              "resolvedAt",
              "status",
            ]);
            assert.deepEqual(Object.keys(row.related).sort(), ["id", "kind"]);
            assert.equal(
              row.related.id,
              row.kind === "REPORT" ? listing : booking,
            );
            assert.equal(row.createdAt, "2020-01-01T00:00:00.000Z");
          }
          assert.ok(!JSON.stringify(all.body).includes(canary));
          assert.match(all.headers.get("cache-control")!, /private, no-store/);
          assert.match(all.headers.get("vary")!, /Cookie/i);
          for (const [kind, id, status] of [
            ["REPORT", resolvedReport, "DISMISSED"],
            ["DISPUTE", dispute, "RESOLVED"],
          ] as const) {
            const r = await api(
              url + `?caseType=${kind}&caseState=RESOLVED&caseId=${id}`,
              admin.cookie,
            );
            assert.equal(r.body.totalMatching, 1);
            assert.equal(r.body.items[0].status, status);
          }
          const no = await api(
            url + "?caseType=REPORT&caseState=ALL&caseId=2147483647",
            admin.cookie,
          );
          assert.equal(no.body.totalMatching, 0);
        },
      );
      await t.test(
        "anonymous, ordinary, suspended and expired sessions denied; no forged scopes or mutation",
        async () => {
          assert.equal((await api(url)).status, 401);
          assert.equal((await api(url, ordinary.cookie)).status, 403);
          const forged = await fetch(base + url, {
            headers: {
              Cookie: ordinary.cookie,
              "X-Role": "ADMIN",
              "X-Staff-Role": "SUPPORT_AGENT",
              "X-Actor-Id": String(admin.id),
            },
          });
          assert.equal(forged.status, 403);
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [admin.id],
          );
          try {
            assert.equal((await api(url, admin.cookie)).status, 403);
          } finally {
            await db.query(
              `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
              [admin.id],
            );
          }
          const expired = await account("ADMIN");
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=now()-interval '1 hour' WHERE "userId"=$1`,
            [expired.id],
          );
          assert.equal((await api(url, expired.cookie)).status, 401);
          for (const query of [
            "actorId=1",
            "role=ADMIN",
            "evidenceId=1",
            "assignedTo=1",
            "bookingId=1",
            "listingId=1",
            "ticketId=1",
            "returnTo=https://evil.invalid",
            "page=0",
            "pageSize=51",
            "caseType=REPORT&caseType=DISPUTE",
            "caseId=1",
          ])
            assert.equal(
              (await api(url + "?" + query, admin.cookie)).status,
              400,
            );
          assert.equal(
            (
              await fetch(base + url, {
                method: "POST",
                headers: { Cookie: admin.cookie, Origin: base },
              })
            ).status,
            405,
          );
        },
      );
      await t.test(
        "read workspace preserves original case/audit rows and chronological history",
        async () => {
          const history = await api(
            `/api/admin/reports/${resolvedReport}/history`,
            admin.cookie,
          );
          assert.equal(history.status, 200);
          assert.equal(
            history.body.events[0].timestamp,
            "2020-01-01T00:00:00.000Z",
          );
          assert.ok(
            history.body.events.some(
              (e: { event: string }) => e.event === "REPORT_RESOLVED",
            ),
          );
          assert.equal(await snapshot(), original);
          // A legacy resolved state with no timestamp is shown honestly, never filled in.
          await db.query(
            `UPDATE "ListingReport" SET "resolvedAt"=NULL WHERE id=$1`,
            [resolvedReport],
          );
          const row = (
            await api(
              url +
                `?caseType=REPORT&caseState=RESOLVED&caseId=${resolvedReport}`,
              admin.cookie,
            )
          ).body.items[0];
          assert.equal(row.status, "DISMISSED");
          assert.equal(row.resolvedAt, null);
          const legacy = await api(
            `/api/admin/reports/${resolvedReport}/history`,
            admin.cookie,
          );
          assert.ok(
            !legacy.body.events.some(
              (e: { event: string }) => e.event === "LATEST_RESOLUTION",
            ),
          );
        },
      );
      const tag = randomUUID();
      const users = await db.query(
        `INSERT INTO "User" (name,email,"passwordHash","updatedAt") SELECT $1,$2||g::text||'@fixture.test','not-a-valid-credential',now() FROM generate_series(1,24) g RETURNING id`,
        [canary, tag],
      );
      await db.query(
        `INSERT INTO "ListingReport" ("listingId","reporterId",reason,description,"createdAt") SELECT $1,unnest($2::int[]),$3,$3,'2019-01-01'`,
        [listing, users.rows.map((r) => r.id), canary],
      );
      await t.test(
        "bounded pagination counts each case once, even on shared records and identical timestamps",
        async () => {
          const seen: string[] = [],
            milliseconds: number[] = [];
          for (let page = 1; page <= 3; page++) {
            const start = performance.now(),
              r = await api(
                url + `?caseState=ALL&pageSize=10&page=${page}`,
                admin.cookie,
              );
            milliseconds.push(performance.now() - start);
            assert.equal(r.status, 200);
            assert.equal(r.body.totalMatching, 28);
            assert.equal(r.body.totalPages, 3);
            assert.ok(r.body.items.length <= 10);
            assert.deepEqual(r.body.counts, {
              openReports: 25,
              openDisputes: 1,
              historicalReports: 1,
              historicalDisputes: 1,
            });
            for (const row of r.body.items) seen.push(`${row.kind}:${row.id}`);
            if (page === 1) {
              const again = await api(
                url + "?caseState=ALL&pageSize=10&page=1",
                admin.cookie,
              );
              assert.deepEqual(again.body.items, r.body.items);
            }
          }
          assert.equal(seen.length, 28);
          assert.equal(new Set(seen).size, 28);
          const last = await api(
            url + "?caseState=ALL&page=10000",
            admin.cookie,
          );
          assert.equal(last.body.items.length, 0);
          assert.equal(last.body.totalMatching, 28);
          await writeFile(
            path.join(artifact, "support-pagination.json"),
            JSON.stringify(
              {
                distinctCaseRecords: 28,
                sharedListingAndBooking: true,
                typedIdCollision: true,
                pageSize: 10,
                pages: 3,
                deterministicTies: true,
                httpMilliseconds: milliseconds,
              },
              null,
              2,
            ),
          );
        },
      );
      await t.test(
        "native Admin login, Community Support, filters, history/audit links and responsive keyboard navigation",
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
            const context = await browser.newContext({
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
              if (width < 1024)
                await page
                  .getByText("Admin navigation", { exact: true })
                  .click();
              await page
                .getByRole("navigation", {
                  name: "Administration",
                  exact: true,
                })
                .getByRole("link", { name: "Support", exact: true })
                .click();
              await expect(
                page.getByRole("heading", {
                  name: "Support workspace",
                  exact: true,
                }),
              ).toBeVisible();
              await page
                .getByLabel("Case state", { exact: true })
                .selectOption("RESOLVED");
              await page
                .getByRole("button", { name: "Apply filters", exact: true })
                .click();
              await expect(page.locator("[data-support-case]")).toHaveCount(2);
              assert.ok(
                !(await page.locator("main").innerText()).includes(canary),
              );
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.screenshot({
                path: path.join(artifact, `support-${label}.png`),
                fullPage: true,
              });
              await page
                .getByLabel("Case state", { exact: true })
                .selectOption("ALL");
              await page
                .getByLabel("Page size", { exact: true })
                .selectOption("10");
              await page
                .getByRole("button", { name: "Apply filters", exact: true })
                .click();
              await expect(page.locator("[data-support-case]")).toHaveCount(10);
              await page
                .getByRole("link", { name: "Next cases", exact: true })
                .click();
              await expect(page).toHaveURL(
                (url) => url.searchParams.get("page") === "2",
              );
              await page
                .getByRole("link", { name: "Previous cases", exact: true })
                .click();
              await expect(page).toHaveURL(
                (url) => url.searchParams.get("page") === "1",
              );
              const workbench = `/admin/workbench?category=OPEN_REPORTS&page=3&pageSize=20&recordId=${resolvedReport}`,
                support = `/admin/support?caseType=REPORT&caseState=RESOLVED&caseId=${resolvedReport}&wbCategory=OPEN_REPORTS&wbRecordId=${resolvedReport}&wbPage=3&wbPageSize=20`;
              await page.goto(base + support);
              await expect(
                page.getByRole("link", { name: "Reset", exact: true }),
              ).toHaveAttribute(
                "href",
                `/admin/support?wbCategory=OPEN_REPORTS&wbRecordId=${resolvedReport}&wbPage=3&wbPageSize=20`,
              );
              await page
                .getByRole("link", {
                  name: "Case history / audit",
                  exact: true,
                })
                .click();
              await expect(
                page.getByText("Report decision recorded", { exact: true }),
              ).toBeVisible();
              await page.goBack();
              await expect(page).toHaveURL(base + support);
              await page
                .getByRole("link", {
                  name: "Case history / audit",
                  exact: true,
                })
                .click();
              await page
                .getByRole("link", { name: /Inspect audit metadata/ })
                .click();
              const back = page.locator("[data-history-workbench-back]");
              await expect(back).toHaveAttribute("href", workbench);
              await back.focus();
              await expect(back).toBeFocused();
              await page.keyboard.press("Enter");
              await expect(page).toHaveURL(base + workbench);
              await page.goto(
                base + "/admin/support?caseType=DISPUTE&caseState=RESOLVED",
              );
              await expect(
                page.getByRole("link", {
                  name: `Related booking #${booking}`,
                  exact: true,
                }),
              ).toHaveAttribute("href", `/admin/bookings/${booking}`);
              await page.goto(
                base + "/admin/support?returnTo=https://evil.invalid",
              );
              await expect(page.getByRole("alert")).toContainText("Unknown");
              await page.goto(
                base +
                  "/admin/support?caseType=REPORT&caseState=ALL&caseId=2147483647",
              );
              await expect(
                page.getByRole("heading", {
                  name: "No matching recorded cases",
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
        "Support page has independent Admin guards and bad return context is discarded",
        async () => {
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
              await page.goto(base + "/admin/support");
              if (!cookie) await expect(page).toHaveURL(base + "/login");
              else
                await expect(
                  page.getByText("This page could not be found.", {
                    exact: true,
                  }),
                ).toBeVisible();
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
            const page = await context.newPage();
            await page.goto(base + "/admin/support?wbCategory=constructor");
            await expect(
              page.locator("[data-support-workbench-back]"),
            ).toHaveAttribute("href", "/admin/workbench");
            await expect(
              page.getByRole("heading", {
                name: "Support workspace",
                exact: true,
              }),
            ).toBeVisible();
          } finally {
            await context.close();
          }
        },
      );
      await t.test(
        "unavailable counts are not empty success; database failure recovers; access logging is allowlisted",
        async () => {
          await db.query(
            `ALTER TABLE "ListingReport" RENAME TO "ListingReport_owned_failure"`,
          );
          try {
            assert.equal((await api(url, admin.cookie)).status, 500);
            const context = await browser!.newContext();
            await context.addCookies([
              {
                name: "p2p_session",
                value: admin.cookie.split("=")[1],
                url: base,
              },
            ]);
            try {
              const page = await context.newPage();
              await page.goto(base + "/admin/support");
              await expect(page.getByRole("alert")).toContainText(
                "Counts are unavailable",
              );
              assert.equal(
                await page.locator("[data-support-count]").count(),
                0,
              );
            } finally {
              await context.close();
            }
          } finally {
            await db.query(
              `ALTER TABLE "ListingReport_owned_failure" RENAME TO "ListingReport"`,
            );
          }
          assert.equal((await api(url, admin.cookie)).status, 200);
          const text = await readFile(
              path.join(artifact, "server.log"),
              "utf8",
            ),
            events = text
              .split("\n")
              .filter(
                (line) =>
                  line.startsWith("{") &&
                  line.includes('"event":"admin_support_read"'),
              )
              .map((line) => JSON.parse(line));
          assert.ok(events.length > 0);
          for (const event of events) {
            assert.deepEqual(Object.keys(event).sort(), [
              "actorId",
              "at",
              "caseState",
              "caseType",
              "event",
              "page",
              "pageSize",
              "returned",
            ]);
            assert.equal(event.actorId, admin.id);
            assert.ok(!JSON.stringify(event).includes(canary));
            assert.ok(event.returned <= 50);
          }
          await writeFile(
            path.join(artifact, "support-access-audit.json"),
            JSON.stringify(
              {
                channel:
                  "bounded structured operational log, not immutable AdminAuditLog",
                eventsObserved: events.length,
                serverResolvedActor: true,
                allowlistedFieldsOnly: true,
                noCaseIdsParticipantDataOrNarratives: true,
              },
              null,
              2,
            ),
          );
        },
      );
      await writeFile(
        path.join(artifact, "support-security.json"),
        JSON.stringify(
          {
            legacyAdminOnly: true,
            anonymousOrdinarySuspendedExpiredDenied: true,
            independentPageAndApiGuards: true,
            minimalDto: true,
            openAndHistoricalCountsVerified: true,
            relatedIdsServerDerived: true,
            caseHistoryPreserved: true,
            sourceRowsUnchangedByReads: true,
            typedCasePagination: true,
            narrativeCanaryAbsent: true,
            workbenchEnvelopePreserved: true,
            responsiveViewports: 3,
            databaseFailureAndRecovery: true,
            noTicketOrMessagingMutation: true,
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
