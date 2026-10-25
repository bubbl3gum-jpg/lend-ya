import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { principalFixture } from "./support/database-principals";
import { readyAuthenticationRoutes } from "./support/login-diagnostics";
test(
  "Batch 8C requester channels: isolation, ordering, immutability, browser and database boundary",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      secret = "PRIVATE-CHANNEL-" + randomUUID(),
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
      await db.query(
        `INSERT INTO "Conversation" (id,"listingId","ownerId","borrowerId",version) VALUES (1,$1,$2,$3,1)`,
        [listing, owner.id, borrower.id],
      );
      await db.query(
        `INSERT INTO "ConversationParticipant" ("conversationId","userId") VALUES (1,$1),(1,$2)`,
        [owner.id, borrower.id],
      );
      await db.query(
        `INSERT INTO "ChatMessage" ("conversationId","senderId","clientMessageId","requestHash","contentHash","normalizedHash",body,sequence,"updatedSequence","deliverySequence",status,categories,"ruleCodes","policyVersion") VALUES (1,$1,'source-message',repeat('a',64),repeat('b',64),repeat('c',64),$2,1,1,1,'FLAGGED',ARRAY['LINK_RISK'],ARRAY['EXTERNAL_LINK_REVIEW'],'deterministic-mvp-1')`,
        [owner.id, "MARKETPLACE-" + secret],
      );
      await db.query(
        `INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ($1,$2,$3,'HANDOFF_OWNER','image/png',decode('010203','hex'))`,
        [randomUUID(), booking, owner.id],
      );
      await db.query(
        `INSERT INTO "ChatReviewer" ("userId",enabled) VALUES ($1,true)`,
        [admin.id],
      );
      const ticket = async (
        cookie: string,
        extra = {},
        subject = "Own channel fixture",
      ) => {
        const r = await api("/api/support/tickets", cookie, "POST", {
          categoryCode: "OTHER_SUPPORT",
          subject,
          description: "Synthetic request only",
          requestKey: randomUUID(),
          ...extra,
        });
        assert.equal(r.status, 201);
        return r.body.ticket.id as string;
      };
      const ownerTicket = await ticket(owner.cookie, { bookingId: booking }),
        borrowerTicket = await ticket(borrower.cookie, { bookingId: booking }),
        accountTicket = await ticket(stranger.cookie);
      const root = (id: string) => `/api/support/tickets/${id}/channel`,
        messages = (id: string) => `/api/support/channels/${id}/messages`,
        payload = (content = secret) => ({ content, requestKey: randomUUID() });
      const a = await api(root(ownerTicket), owner.cookie, "POST", {}),
        b = await api(root(borrowerTicket), borrower.cookie, "POST", {});
      assert.equal(a.status, 201);
      assert.equal(b.status, 201);
      const ownerChannel = a.body.channel.id as string,
        borrowerChannel = b.body.channel.id as string;
      const frozen = async () => {
        const rows = [];
        for (const table of [
          "Booking",
          "Listing",
          "ListingReport",
          "Dispute",
          "Handoff",
          "Return",
          "BookingEvidencePhoto",
          "Conversation",
          "ChatMessage",
          "ChatOutboxEvent",
          "SupportTicket",
          "SupportTicketEvent",
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
      const before = await frozen();
      await t.test(
        "independent Owner/Borrower ticket channels, no shared booking/ADMIN/reviewer access or metadata",
        async () => {
          assert.equal(a.body.channel.relationshipSide, "BOOKING_OWNER");
          assert.equal(b.body.channel.relationshipSide, "BOOKING_BORROWER");
          assert.notEqual(ownerChannel, borrowerChannel);
          const one = await api(
            messages(ownerChannel),
            owner.cookie,
            "POST",
            payload(),
          );
          assert.equal(one.status, 201);
          const two = await api(
            messages(borrowerChannel),
            borrower.cookie,
            "POST",
            payload("BORROWER-PRIVATE-" + secret),
          );
          assert.equal(two.status, 201);
          for (const [actor, ticketId, channelId] of [
            [owner, borrowerTicket, borrowerChannel],
            [borrower, ownerTicket, ownerChannel],
            [stranger, ownerTicket, ownerChannel],
            [admin, ownerTicket, ownerChannel],
          ] as const) {
            for (const [url, method, body] of [
              [root(ticketId), "GET", undefined],
              [root(ticketId), "POST", {}],
              [messages(channelId), "GET", undefined],
              [messages(channelId), "POST", payload()],
            ] as const) {
              const r = await api(url, actor.cookie, method, body);
              assert.equal(r.status, 404);
              assert.deepEqual(Object.keys(r.body), ["error"]);
              assert.ok(!JSON.stringify(r.body).includes(secret));
              assert.match(
                r.headers.get("cache-control")!,
                /private, no-store/,
              );
            }
          }
          const missing = await api(messages(randomUUID()), owner.cookie);
          assert.deepEqual(
            missing.body,
            (await api(messages(borrowerChannel), owner.cookie)).body,
          );
          assert.equal(
            (await api(root(accountTicket), stranger.cookie)).body.channel,
            null,
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "SupportParticipantChannel" WHERE "ticketId"=$1`,
                [accountTicket],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "atomic idempotent channel creation and deterministic concurrent message sequence",
        async () => {
          const creates = await Promise.all([
            api(root(ownerTicket), owner.cookie, "POST", {}),
            api(root(ownerTicket), owner.cookie, "POST", {}),
          ]);
          assert.ok(
            creates.every(
              (r) => r.status === 200 && r.body.channel.id === ownerChannel,
            ),
          );
          const same = payload("Repeated requester text"),
            dups = await Promise.all([
              api(messages(ownerChannel), owner.cookie, "POST", same),
              api(messages(ownerChannel), owner.cookie, "POST", same),
            ]);
          assert.deepEqual(dups.map((r) => r.status).sort(), [200, 201]);
          assert.equal(dups[0].body.message.id, dups[1].body.message.id);
          assert.equal(
            (
              await api(messages(ownerChannel), owner.cookie, "POST", {
                ...same,
                content: "Changed",
              })
            ).status,
            409,
          );
          const created = await Promise.all(
            Array.from({ length: 6 }, (_, i) =>
              api(
                messages(ownerChannel),
                owner.cookie,
                "POST",
                payload("Concurrent " + i),
              ),
            ),
          );
          assert.ok(created.every((r) => r.status === 201));
          assert.deepEqual(
            created.map((r) => r.body.message.sequence).sort((x, y) => x - y),
            [3, 4, 5, 6, 7, 8],
          );
          const r = await api(messages(ownerChannel), owner.cookie);
          assert.equal(r.status, 200);
          assert.deepEqual(
            r.body.items.map((m: { sequence: number }) => m.sequence),
            [1, 2, 3, 4, 5, 6, 7, 8],
          );
          assert.deepEqual(Object.keys(r.body).sort(), [
            "channel",
            "hasMore",
            "items",
            "nextAfter",
          ]);
          for (const m of r.body.items)
            assert.deepEqual(Object.keys(m).sort(), [
              "content",
              "createdAt",
              "id",
              "sequence",
            ]);
          assert.ok(!("participantUserId" in r.body.channel));
          assert.ok(!JSON.stringify(r.body).includes("BORROWER-PRIVATE"));
          assert.equal(await frozen(), before);
        },
      );
      await t.test(
        "anonymous/expired/deleted/forged sessions, identity claims, selectors, invalid text and CSRF denied",
        async () => {
          assert.equal((await api(messages(ownerChannel))).status, 401);
          assert.equal(
            (await api(messages(ownerChannel), "p2p_session=forged")).status,
            401,
          );
          for (const extra of [
            { authorUserId: owner.id },
            { role: "ADMIN" },
            { ticketId: ownerTicket },
            { assignedTo: owner.id },
            { permission: true },
            { content: "" },
            { content: "x".repeat(2001) },
            { requestKey: "fake" },
          ])
            assert.equal(
              (
                await api(messages(ownerChannel), owner.cookie, "POST", {
                  ...payload(),
                  ...extra,
                })
              ).status,
              400,
            );
          assert.equal(
            (
              await api(root(ownerTicket), owner.cookie, "POST", {
                participantUserId: owner.id,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await api(
                messages(ownerChannel) + "?authorUserId=1",
                owner.cookie,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await api(
                messages(ownerChannel) + "?after=0&after=1",
                owner.cookie,
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await api(
                messages(ownerChannel),
                owner.cookie,
                "POST",
                payload(),
                { Origin: "http://evil.invalid" },
              )
            ).status,
            403,
          );
          const malformed = await fetch(base + messages(ownerChannel), {
            method: "POST",
            headers: {
              Cookie: owner.cookie,
              Origin: base,
              "Content-Type": "application/json",
            },
            body: "{bad",
          });
          assert.equal(malformed.status, 400);
          const expired = await actor(),
            revoked = await actor();
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=now()-interval '1 hour' WHERE "userId"=$1`,
            [expired.id],
          );
          await db.query(`DELETE FROM "AuthSession" WHERE "userId"=$1`, [
            revoked.id,
          ]);
          assert.equal(
            (await api(messages(ownerChannel), expired.cookie)).status,
            401,
          );
          assert.equal(
            (await api(messages(ownerChannel), revoked.cookie)).status,
            401,
          );
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [owner.id],
          );
          try {
            assert.equal(
              (await api(messages(ownerChannel), owner.cookie)).status,
              403,
            );
            assert.equal(
              (
                await api(
                  messages(ownerChannel),
                  owner.cookie,
                  "POST",
                  payload(),
                )
              ).status,
              403,
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
        "general-account channels and conservative ambiguous relationship blocking",
        async () => {
          for (const [who, link, expected] of [
            [owner, { listingId: listing }, "LISTING_OWNER"],
            [borrower, { reportId: report }, "REPORTER"],
            [borrower, { disputeId: dispute }, "BOOKING_BORROWER"],
          ] as const) {
            const id = await ticket(who.cookie, link),
              result = await api(root(id), who.cookie, "POST", {});
            assert.equal(result.status, 201);
            assert.equal(result.body.channel.relationshipSide, expected);
          }
          const general = await api(
            root(accountTicket),
            stranger.cookie,
            "POST",
            {},
          );
          assert.equal(general.status, 201);
          assert.equal(general.body.channel.relationshipSide, "REQUESTER");
          const ambiguous = (
            await db.query(
              `INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES ($1,$2,$2,$3,now(),now()+interval '1 day','IN_USE',10,now()) RETURNING id`,
              [listing, owner.id, station],
            )
          ).rows[0].id;
          const ambiguousTicket = await ticket(owner.cookie, {
            bookingId: ambiguous,
          });
          assert.equal(
            (await api(root(ambiguousTicket), owner.cookie, "POST", {})).status,
            404,
          );
          const selfReport = (
            await db.query(
              `INSERT INTO "ListingReport" ("listingId","reporterId",reason) VALUES ($1,$2,'Legacy self report') RETURNING id`,
              [listing, owner.id],
            )
          ).rows[0].id;
          const reportTicket = await ticket(owner.cookie, {
            reportId: selfReport,
          });
          assert.equal(
            (await api(root(reportTicket), owner.cookie, "POST", {})).status,
            404,
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "SupportParticipantChannel" WHERE "ticketId"=ANY($1::uuid[])`,
                [[ambiguousTicket, reportTicket]],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "SQL attribution/order immutability, failed insert rollback and database recovery",
        async () => {
          const first = (
            await db.query(
              `SELECT id FROM "SupportMessage" WHERE "channelId"=$1 ORDER BY sequence LIMIT 1`,
              [ownerChannel],
            )
          ).rows[0].id;
          for (const sql of [
            `UPDATE "SupportMessage" SET content='changed' WHERE id='${first}'`,
            `DELETE FROM "SupportParticipantChannel" WHERE id='${ownerChannel}'`,
            `TRUNCATE "SupportMessage" CASCADE`,
          ])
            await assert.rejects(db.query(sql));
          await assert.rejects(
            db.query(
              `INSERT INTO "SupportMessage" (id,"channelId","ticketId","authorUserId","requestKey","requestHash",content,sequence) VALUES ($1,$2,$3,$4,$5,repeat('a',64),'Forged author',9)`,
              [
                randomUUID(),
                ownerChannel,
                ownerTicket,
                borrower.id,
                randomUUID(),
              ],
            ),
          );
          const count = async () =>
              (
                await db.query(
                  `SELECT count(*)::int n FROM "SupportMessage" WHERE "channelId"=$1`,
                  [ownerChannel],
                )
              ).rows[0].n,
            n = await count();
          await db.query(
            `CREATE FUNCTION owned_message_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Owned failure'; END $$; CREATE TRIGGER owned_message_failure BEFORE INSERT ON "SupportMessage" FOR EACH ROW EXECUTE FUNCTION owned_message_failure()`,
          );
          try {
            assert.equal(
              (
                await api(
                  messages(ownerChannel),
                  owner.cookie,
                  "POST",
                  payload(),
                )
              ).status,
              500,
            );
            assert.equal(await count(), n);
          } finally {
            await db.query(
              `DROP TRIGGER owned_message_failure ON "SupportMessage"; DROP FUNCTION owned_message_failure()`,
            );
          }
          const recovered = await api(
            messages(ownerChannel),
            owner.cookie,
            "POST",
            payload("After failure"),
          );
          assert.equal(recovered.status, 201);
          assert.equal(recovered.body.message.sequence, n + 1);
          await db.query(
            `ALTER TABLE "SupportMessage" RENAME TO "SupportMessage_owned_failure"`,
          );
          try {
            assert.equal(
              (await api(messages(ownerChannel), owner.cookie)).status,
              500,
            );
          } finally {
            await db.query(
              `ALTER TABLE "SupportMessage_owned_failure" RENAME TO "SupportMessage"`,
            );
          }
          assert.equal(
            (await api(messages(ownerChannel), owner.cookie)).status,
            200,
          );
        },
      );
      await t.test(
        "native requester session navigation, channel creation and real message submission at three viewports",
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
            const id = await ticket(owner.cookie, {}, "Channel demo " + label),
              ctx = await browser.newContext({ viewport: { width, height } }),
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
              await page.goto(base + "/customer-service/tickets");
              await page
                .getByRole("link", {
                  name: "Channel demo " + label,
                  exact: true,
                })
                .click();
              await expect(page).toHaveURL(
                base + "/customer-service/tickets/" + id,
              );
              await page
                .getByRole("link", {
                  name: "Requester-only test channel",
                  exact: true,
                })
                .click();
              await page
                .getByRole("button", {
                  name: "Create my requester-only test channel",
                  exact: true,
                })
                .click();
              await expect(page.getByRole("status")).toContainText("ready");
              await page
                .getByLabel("Test message", { exact: true })
                .fill("Public synthetic requester message " + label);
              await page
                .getByRole("button", {
                  name: "Save requester test message",
                  exact: true,
                })
                .click();
              await expect(page.getByRole("status")).toContainText("recorded");
              await expect(
                page.getByText("Public synthetic requester message " + label, {
                  exact: true,
                }),
              ).toBeVisible();
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              );
              await page.screenshot({
                path: path.join(artifact, "channel-" + label + ".png"),
                fullPage: true,
              });
              const help = page.getByRole("link", {
                name: "Help guidance",
                exact: true,
              });
              await help.focus();
              await expect(help).toBeFocused();
            } finally {
              await ctx.close();
            }
          }
          for (const [who, id] of [
            [owner, borrowerTicket],
            [borrower, ownerTicket],
            [admin, ownerTicket],
          ] as const) {
            const ctx = await browser.newContext();
            await ctx.addCookies([
              {
                name: "p2p_session",
                value: who.cookie.split("=")[1],
                url: base,
              },
            ]);
            try {
              const page = await ctx.newPage();
              await page.goto(base + `/customer-service/tickets/${id}/channel`);
              await expect(
                page.getByText("This page could not be found.", {
                  exact: true,
                }),
              ).toBeVisible();
              assert.ok(
                !(await page.locator("body").innerText()).includes(secret),
              );
            } finally {
              await ctx.close();
            }
          }
        },
      );
      await t.test(
        "bounded own cursor pagination and candidate-only quota; no private content in logs",
        async () => {
          for (let i = 0; i < 25; i++) {
            const r = await api(
              messages(ownerChannel),
              owner.cookie,
              "POST",
              payload("Bounded synthetic message " + i),
            );
            if (r.status === 429) break;
            assert.equal(r.status, 201);
          }
          assert.equal(
            (await api(messages(ownerChannel), owner.cookie, "POST", payload()))
              .status,
            429,
          );
          const first = await api(messages(ownerChannel), owner.cookie),
            second = await api(
              messages(ownerChannel) + "?after=" + first.body.nextAfter,
              owner.cookie,
            );
          assert.equal(first.body.items.length, 10);
          assert.equal(second.body.items.length, 10);
          assert.equal(second.body.hasMore, false);
          assert.equal(
            new Set(
              [...first.body.items, ...second.body.items].map(
                (m: { id: string }) => m.id,
              ),
            ).size,
            20,
          );
          const log = await readFile(path.join(artifact, "server.log"), "utf8");
          assert.ok(!log.includes(secret));
          assert.ok(!log.includes(ownerChannel));
          assert.ok(!log.includes(borrowerChannel));
        },
      );
      await t.test(
        "real PostgreSQL restricted principals denied private tables/functions; privileged owner is not requester RLS",
        async () => {
          const count = (
            await db.query(`SELECT count(*)::int n FROM "SupportMessage"`)
          ).rows[0].n;
          assert.ok(count > 0);
          const profile = await principalFixture(db);
          try {
            for (const kind of [
              "runtime",
              "mfa",
              "authorization",
              "inspection",
            ] as const) {
              const c = await profile.connect(kind);
              for (const table of [
                "SupportTicket",
                "SupportParticipantChannel",
                "SupportMessage",
              ])
                await assert.rejects(
                  c.query(`SELECT * FROM "${table}"`),
                  (e: unknown) =>
                    !!e &&
                    typeof e === "object" &&
                    "code" in e &&
                    e.code === "42501",
                );
              await assert.rejects(
                c.query(
                  `SELECT support_channel_candidate_side($1::uuid,$2::int)`,
                  [ownerTicket, owner.id],
                ),
              );
              await assert.rejects(
                c.query(`INSERT INTO "SupportMessage" (id) VALUES ($1)`, [
                  randomUUID(),
                ]),
              );
            }
            await writeFile(
              path.join(artifact, "channel-database-boundary.json"),
              JSON.stringify(
                {
                  testedRealPrincipals: [
                    "runtime",
                    "mfa",
                    "authorization",
                    "inspection",
                  ],
                  selectAndDmlDenied: true,
                  sideFunctionExecuteDenied: true,
                  privilegedOwnerCanReadAll: true,
                  perRequesterRlsNotDeployed: true,
                  staffReadWriteGate: "BLOCKED",
                  durableStaffDisclosureAuditNotImplemented: true,
                },
                null,
                2,
              ),
            );
          } finally {
            await profile.cleanup();
          }
        },
      );
      await writeFile(
        path.join(artifact, "channel-security.json"),
        JSON.stringify(
          {
            ownerBorrowerSeparateTickets: true,
            noAutomaticOppositeChannel: true,
            foreignMetadata404: true,
            legacyAdminReviewerDenied: true,
            ownBoundedQueries: true,
            serverDerivedSideAndAuthor: true,
            sameAccountAndSelfReportBlocked: true,
            concurrentSequenceAndIdempotency: true,
            immutableAttribution: true,
            noSequenceConsumedOnFailure: true,
            sessionRevocationDenied: true,
            noTranscriptOrEvidenceImport: true,
            sourceTranscriptCanaryTested: true,
            realBrowserViewports: 3,
            candidateOnly: true,
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
