import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { readyAuthenticationRoutes } from "./support/login-diagnostics";
test(
  "Batch 8B owned candidate: requester privacy, atomic history, idempotency and real browser intake",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      secret = "PRIVATE-TICKET-" + randomUUID(),
      password = "Owned-ticket-test-93!";
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object,
      headers: Record<string, string> = {},
    ) => {
      const r = await fetch(base + url, {
        method,
        headers: {
          Cookie: cookie,
          Origin: base,
          "Content-Type": "application/json",
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: r.status,
        headers: r.headers,
        body: await r.json(),
        cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    };
    const actor = async () => {
      const email = randomUUID() + "@fixture.test",
        r = await api("/api/auth/register", "", "POST", {
          name: "Ticket fixture",
          email,
          password,
        });
      assert.equal(r.status, 201);
      return { id: r.body.user.id as number, email, cookie: r.cookie };
    };
    const payload = (extra = {}) => ({
      categoryCode: "ACCOUNT_HELP",
      subject: "Own help request",
      description: secret,
      requestKey: randomUUID(),
      ...extra,
    });
    try {
      const owner = await actor(),
        borrower = await actor(),
        stranger = await actor(),
        admin = await actor();
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [admin.id]);
      const station = (
        await db.query(`SELECT id FROM "MrtStation" ORDER BY id LIMIT 1`)
      ).rows[0].id;
      const listing = (
        await db.query(
          `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'Fixture item','Uncopied narrative','Other',10,'Good',now()) RETURNING id`,
          [owner.id],
        )
      ).rows[0].id;
      const booking = (
        await db.query(
          `INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES ($1,$2,$3,$4,now(),now()+interval '1 day','IN_USE',10,now()) RETURNING id`,
          [listing, owner.id, borrower.id, station],
        )
      ).rows[0].id;
      const report = (
        await db.query(
          `INSERT INTO "ListingReport" ("listingId","reporterId",reason,description) VALUES($1,$2,'Safety','Original report') RETURNING id`,
          [listing, borrower.id],
        )
      ).rows[0].id;
      const dispute = (
        await db.query(
          `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description) VALUES($1,$2,'Issue','Original dispute') RETURNING id`,
          [booking, borrower.id],
        )
      ).rows[0].id;
      const snapshots = async () => {
        const rows = [];
        for (const table of [
          "User",
          "AuthSession",
          "Listing",
          "Booking",
          "ListingReport",
          "Dispute",
          "Handoff",
          "Return",
          "BookingEvidencePhoto",
          "Conversation",
          "AdminAuditLog",
        ])
          rows.push(
            (
              await db.query(
                `SELECT to_jsonb(t) row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
              )
            ).rows,
          );
        return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      };
      const beforeSnapshot = await snapshots(),
        url = "/api/support/tickets",
        body = payload({ bookingId: booking }),
        created = await api(url, owner.cookie, "POST", body);
      assert.equal(created.status, 201);
      const id = created.body.ticket.id;
      await t.test(
        "atomic initial event, same-key concurrency and content-bound replay",
        async () => {
          const results = await Promise.all([
            api(url, owner.cookie, "POST", body),
            api(url, owner.cookie, "POST", body),
          ]);
          assert.ok(results.every((r) => r.status === 200 && r.body.replayed));
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "SupportTicket" WHERE id=$1`,
                [id],
              )
            ).rows[0].n,
            1,
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "SupportTicketEvent" WHERE "ticketId"=$1`,
                [id],
              )
            ).rows[0].n,
            1,
          );
          const duplicate = payload(),
            first = await Promise.all([
              api(url, owner.cookie, "POST", duplicate),
              api(url, owner.cookie, "POST", duplicate),
            ]);
          assert.deepEqual(first.map((r) => r.status).sort(), [200, 201]);
          assert.equal(first[0].body.ticket.id, first[1].body.ticket.id);
          assert.equal(
            (
              await api(url, owner.cookie, "POST", {
                ...body,
                subject: "Changed content",
              })
            ).status,
            409,
          );
          const r = await api(url + "/" + id, owner.cookie);
          assert.equal(r.status, 200);
          assert.equal(r.body.description, secret);
          assert.equal(r.body.currentState, "RECEIVED");
          assert.equal(r.body.events.length, 1);
          assert.deepEqual(Object.keys(r.body.events[0]).sort(), [
            "createdAt",
            "eventType",
            "sequence",
          ]);
          assert.ok(!("requesterUserId" in r.body));
          assert.ok(!("requestHash" in r.body));
          assert.match(r.headers.get("cache-control")!, /private, no-store/);
        },
      );
      await t.test(
        "owner-only reads, no counterparty/Admin shortcut, forged actors/links/state and CSRF denied",
        async () => {
          for (const other of [borrower, stranger, admin]) {
            assert.equal((await api(url + "/" + id, other.cookie)).status, 404);
            assert.ok(
              !JSON.stringify((await api(url, other.cookie)).body).includes(
                secret,
              ),
            );
          }
          assert.equal((await api(url, "", "POST", payload())).status, 401);
          for (const extra of [
            { requesterUserId: borrower.id },
            { role: "ADMIN" },
            { currentState: "CLOSED" },
            { categoryCode: "INVALID" },
            { subject: "" },
            { description: "x".repeat(2001) },
            { bookingId: 2147483647 },
            { bookingId: booking, listingId: listing },
          ])
            assert.ok(
              [400, 404].includes(
                (await api(url, owner.cookie, "POST", payload(extra))).status,
              ),
            );
          assert.equal(
            (
              await api(
                url,
                stranger.cookie,
                "POST",
                payload({ bookingId: booking }),
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await api(
                url,
                borrower.cookie,
                "POST",
                payload({ listingId: listing }),
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await api(
                url,
                owner.cookie,
                "POST",
                payload({ reportId: report }),
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await api(
                url,
                owner.cookie,
                "POST",
                payload({ disputeId: dispute }),
              )
            ).status,
            404,
          );
          for (const link of [{ listingId: listing }, { bookingId: booking }])
            assert.equal(
              (await api(url, owner.cookie, "POST", payload(link))).status,
              201,
            );
          for (const link of [{ reportId: report }, { disputeId: dispute }])
            assert.equal(
              (await api(url, borrower.cookie, "POST", payload(link))).status,
              201,
            );
          assert.equal(
            (
              await api(url, owner.cookie, "POST", payload(), {
                Origin: "http://evil.invalid",
              })
            ).status,
            403,
          );
          assert.equal(
            (await api(url, owner.cookie, "POST", payload(), { Origin: "" }))
              .status,
            403,
          );
          const malformed = await fetch(base + url, {
            method: "POST",
            headers: {
              Cookie: owner.cookie,
              Origin: base,
              "Content-Type": "application/json",
            },
            body: "{bad",
          });
          assert.equal(malformed.status, 400);
          assert.equal(
            (await api(url + "?requesterUserId=" + owner.id, borrower.cookie))
              .status,
            400,
          );
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [owner.id],
          );
          try {
            assert.equal((await api(url + "/" + id, owner.cookie)).status, 403);
            assert.equal(
              (await api(url, owner.cookie, "POST", payload())).status,
              403,
            );
            assert.equal(
              (
                await fetch(base + "/customer-service", {
                  headers: { Cookie: owner.cookie },
                })
              ).status,
              200,
            );
          } finally {
            await db.query(
              `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
              [owner.id],
            );
          }
        },
      );
      await t.test(
        "DB append-only constraints, missing initial event and event failure roll back atomically",
        async () => {
          for (const sql of [
            `UPDATE "SupportTicket" SET "currentState"='CLOSED' WHERE id='${id}'`,
            `DELETE FROM "SupportTicketEvent" WHERE "ticketId"='${id}'`,
            `TRUNCATE "SupportTicketEvent" CASCADE`,
          ])
            await assert.rejects(db.query(sql));
          const metadata = (
            await db.query(
              `SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`,
            )
          ).rows[0];
          assert.match(metadata.name, /^hustlen_test_[a-z0-9_]+$/);
          assert.match(metadata.marker, /^hustlen-mrt-test:[a-f0-9]{24}$/);
          await db.query(
            `COMMENT ON DATABASE "${metadata.name}" IS 'owned-invalid-marker-test'`,
          );
          try {
            assert.equal(
              (await api(url, owner.cookie, "POST", payload())).status,
              404,
            );
            await assert.rejects(
              db.query(
                `INSERT INTO "SupportTicket" (id,"requesterUserId","categoryCode","policyVersion",subject,description,"currentState","lifecycleVersion","requestKey","requestHash","initialEventId") VALUES($1,$2,'ACCOUNT_HELP','support-owned-candidate-8b-v1','Test','Test','RECEIVED',1,$3,repeat('a',64),$4)`,
                [randomUUID(), owner.id, randomUUID(), randomUUID()],
              ),
              (error: unknown) =>
                !!error &&
                typeof error === "object" &&
                "code" in error &&
                error.code === "23514",
            );
          } finally {
            await db.query(
              `COMMENT ON DATABASE "${metadata.name}" IS '${metadata.marker}'`,
            );
          }
          await assert.rejects(
            db.query(
              `INSERT INTO "SupportTicket" (id,"requesterUserId","categoryCode","policyVersion",subject,description,"currentState","lifecycleVersion","requestKey","requestHash","initialEventId","bookingId") VALUES($1,$2,'ACCOUNT_HELP','support-owned-candidate-8b-v1','Test','Test','RECEIVED',1,$3,repeat('a',64),$4,$5)`,
              [randomUUID(), stranger.id, randomUUID(), randomUUID(), booking],
            ),
          );
          const count = async () =>
              (await db.query(`SELECT count(*)::int n FROM "SupportTicket"`))
                .rows[0].n,
            before = await count();
          await db.query(
            `CREATE FUNCTION owned_ticket_event_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Owned event failure'; END $$; CREATE TRIGGER owned_ticket_event_failure BEFORE INSERT ON "SupportTicketEvent" FOR EACH ROW EXECUTE FUNCTION owned_ticket_event_failure()`,
          );
          try {
            assert.equal(
              (await api(url, borrower.cookie, "POST", payload())).status,
              500,
            );
            assert.equal(await count(), before);
          } finally {
            await db.query(
              `DROP TRIGGER owned_ticket_event_failure ON "SupportTicketEvent"; DROP FUNCTION owned_ticket_event_failure()`,
            );
          }
          await db.query("BEGIN");
          try {
            await db.query(
              `INSERT INTO "SupportTicket" (id,"requesterUserId","categoryCode","policyVersion",subject,description,"currentState","lifecycleVersion","requestKey","requestHash","initialEventId") VALUES($1,$2,'ACCOUNT_HELP','support-owned-candidate-8b-v1','Test','Test','RECEIVED',1,$3,repeat('a',64),$4)`,
              [randomUUID(), owner.id, randomUUID(), randomUUID()],
            );
            await assert.rejects(db.query("COMMIT"));
          } finally {
            await db.query("ROLLBACK");
          }
          assert.equal(await count(), before);
          assert.equal(await snapshots(), beforeSnapshot);
        },
      );
      await t.test(
        "real browser creation/list/detail and cross-user privacy at desktop/tablet/mobile",
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
            const ctx = await browser.newContext({
                viewport: { width, height },
              }),
              page = await ctx.newPage();
            try {
              await page.goto(base + "/login");
              await page
                .getByLabel("Email address", { exact: true })
                .fill(owner.email);
              await page.getByLabel("Password", { exact: true }).fill(password);
              await page
                .getByRole("button", { name: "Log in", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/dashboard");
              await page.goto(base + "/customer-service");
              await page
                .getByRole("link", { name: "Create ticket", exact: true })
                .click();
              await page
                .getByLabel("Subject", { exact: true })
                .fill("Browser test " + label);
              await page
                .getByLabel("Description", { exact: true })
                .fill("Synthetic requester text only.");
              await page
                .getByRole("button", { name: "Submit ticket", exact: true })
                .click();
              await expect(page).toHaveURL(
                /\/customer-service\/tickets\/[a-f0-9-]{36}$/,
              );
              await expect(page.getByRole("status")).toContainText("RECEIVED");
              await page.screenshot({
                path: path.join(artifact, "ticket-" + label + ".png"),
                fullPage: true,
              });
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page
                .getByRole("link", { name: "My tickets", exact: true })
                .click();
              await expect(
                page.getByRole("link", {
                  name: "Browser test " + label,
                  exact: true,
                }),
              ).toBeVisible();
            } finally {
              await ctx.close();
            }
          }
          const other = await browser.newContext();
          await other.addCookies([
            {
              name: "p2p_session",
              value: borrower.cookie.split("=")[1],
              url: base,
            },
          ]);
          try {
            const p = await other.newPage();
            await p.goto(base + "/customer-service/tickets/" + id);
            await expect(
              p.getByText("This page could not be found.", { exact: true }),
            ).toBeVisible();
          } finally {
            await other.close();
          }
        },
      );
      await t.test(
        "bounded own pagination, development quota, unavailable database and recovery",
        async () => {
          for (let n = 0; n < 15; n++) {
            const r = await api(url, borrower.cookie, "POST", payload());
            if (r.status === 429) break;
            assert.equal(r.status, 201);
          }
          assert.equal(
            (await api(url, borrower.cookie, "POST", payload())).status,
            429,
          );
          const a = await api(url, borrower.cookie),
            b = await api(url + "?page=2", borrower.cookie);
          assert.equal(a.body.items.length, 10);
          assert.equal(b.body.items.length, 2);
          assert.ok(!a.body.items.some((row: { id: string }) => row.id === id));
          await db.query(
            `ALTER TABLE "SupportTicket" RENAME TO "SupportTicket_owned_failure"`,
          );
          try {
            assert.equal((await api(url, owner.cookie)).status, 500);
            const context = await browser!.newContext();
            await context.addCookies([
              {
                name: "p2p_session",
                value: owner.cookie.split("=")[1],
                url: base,
              },
            ]);
            try {
              const page = await context.newPage();
              await page.goto(base + "/customer-service/tickets");
              await expect(page.locator("main").getByRole("alert")).toContainText(
                "No status conclusion",
              );
              assert.ok(
                !(await page.locator("body").innerText()).includes(secret),
              );
            } finally {
              await context.close();
            }
          } finally {
            await db.query(
              `ALTER TABLE "SupportTicket_owned_failure" RENAME TO "SupportTicket"`,
            );
          }
          assert.equal((await api(url, owner.cookie)).status, 200);
          const source = await readFile(
            path.join(artifact, "server.log"),
            "utf8",
          );
          assert.ok(!source.includes(secret));
        },
      );
      await writeFile(
        path.join(artifact, "ticket-security.json"),
        JSON.stringify(
          {
            candidateOnly: true,
            ownerScopedQueries: true,
            counterpartyAndLegacyAdminDenied: true,
            atomicInitialEvent: true,
            appendOnly: true,
            concurrentIdempotency: true,
            csrf: true,
            noSourceRecordMutation: true,
            quotaIsTestOnly: true,
            viewports: 3,
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
