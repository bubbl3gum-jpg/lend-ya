import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import {
  readyAuthenticationRoutes,
  loginDiagnostics,
} from "./support/login-diagnostics";
import { checklistItems } from "../lib/rental-checklist";

test(
  "Operations workbench persisted eligibility, privacy, pagination and browser acceptance",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      password = "Owned-workbench-fixture-93!",
      canary = "PRIVATE-CASE-" + randomUUID();
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object | FormData,
    ) => {
      const r = await fetch(base + url, {
        method,
        headers: {
          Cookie: cookie,
          Origin: base,
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(body
          ? { body: body instanceof FormData ? body : JSON.stringify(body) }
          : {}),
      });
      return {
        status: r.status,
        cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "",
        body: await r.json(),
      };
    };
    const account = async (role: "ADMIN" | "USER") => {
      const email = randomUUID() + "@fixture.test",
        a = await api("/api/auth/register", "", "POST", {
          name: "Workbench fixture",
          email,
          password,
        });
      assert.equal(a.status, 201);
      if (role === "ADMIN")
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
          a.body.user.id,
        ]);
      return { id: a.body.user.id as number, email, cookie: a.cookie };
    };
    const admin = await account("ADMIN"),
      owner = await account("USER"),
      renter = await account("USER");
    const image = new Uint8Array(
      await sharp({
        create: { width: 8, height: 6, channels: 3, background: "blue" },
      })
        .png()
        .toBuffer(),
    );
    const station = (
      await db.query(`SELECT id FROM "MrtStation" WHERE code='TPE'`)
    ).rows[0].id;
    const listing = async () => {
      const form = new FormData();
      for (const [k, v] of Object.entries({
        title: canary,
        description: canary,
        category: "Electronics",
        condition: "Good",
        price: "10",
        deposit: "20",
        stationIds: JSON.stringify([station]),
      }))
        form.set(k, v);
      form.append(
        "photos",
        new File([image], "item.png", { type: "image/png" }),
      );
      const r = await api("/api/listings", owner.cookie, "POST", form);
      assert.equal(r.status, 201);
      return r.body.listing.id as number;
    };
    const stage = async (
      id: number,
      action: string,
      cookie: string,
      extra = {},
    ) => {
      const f = new FormData();
      f.set(
        "payload",
        JSON.stringify({
          checklist: Object.fromEntries(
            Object.keys(checklistItems).map((k) => [k, "yes"]),
          ),
          conditionNotes: canary,
          conditionConfirmed: true,
          returnConfirmed: true,
          ...extra,
        }),
      );
      f.append(
        "photos",
        new File([image], "condition.png", { type: "image/png" }),
      );
      const r = await api(`/api/bookings/${id}/${action}`, cookie, "POST", f);
      assert.equal(
        r.status,
        200,
        `Fixture stage ${action} must pass actual participant/evidence validation`,
      );
      return r.body;
    };
    const booking = async (
      state:
        | "PENDING"
        | "CONFIRMED"
        | "HANDOFF_PENDING"
        | "IN_USE"
        | "INSPECTION"
        | "COMPLETED",
    ) => {
      const listingId = await listing();
      let r = await api("/api/bookings", renter.cookie, "POST", {
        listingId,
        meetingStationId: station,
        startAt: "2035-01-01T10:00",
        endAt: "2035-01-02T10:00",
        notes: canary,
      });
      assert.equal(r.status, 201);
      const id = r.body.booking.id as number;
      if (state !== "PENDING") {
        r = await api(`/api/bookings/${id}`, owner.cookie, "PATCH", {
          action: "accept",
        });
        assert.equal(r.status, 200);
      }
      if (!["PENDING", "CONFIRMED"].includes(state))
        await stage(id, "handoff", owner.cookie);
      if (["IN_USE", "INSPECTION", "COMPLETED"].includes(state))
        await stage(id, "handoff", renter.cookie);
      if (["INSPECTION", "COMPLETED"].includes(state)) {
        await stage(id, "return", renter.cookie);
        r = await api(`/api/bookings/${id}`, owner.cookie, "PATCH", {
          action: "inspect",
        });
        assert.equal(r.status, 200);
      }
      if (state === "COMPLETED")
        assert.equal(
          (await stage(id, "inspection", owner.cookie, { acceptable: true }))
            .status,
          "COMPLETED",
        );
      return { id, listingId };
    };
    const query = async (category: string, extra = "") => {
      const r = await api(
        "/api/admin/workbench?category=" + category + extra,
        admin.cookie,
      );
      assert.equal(r.status, 200);
      return r.body;
    };
    try {
      // Valid custody fixtures go through actual existing participant/evidence routes.
      // Explicit legacy anomalies below are never labelled legally verified transitions.
      await booking("PENDING");
      const confirmed = await booking("CONFIRMED");
      await booking("HANDOFF_PENDING");
      const active = await booking("IN_USE"),
        past = await booking("IN_USE");
      await booking("INSPECTION");
      const completed = await booking("COMPLETED");
      await db.query(
        `UPDATE "Booking" SET "startAt"=NOW()-interval '2 days',"endAt"=NOW()-interval '1 day' WHERE id=$1`,
        [past.id],
      );
      const anomaly = await booking("PENDING"),
        closed = await booking("PENDING");
      await db.query(`UPDATE "Booking" SET status='COMPLETED' WHERE id=$1`, [
        anomaly.id,
      ]);
      await db.query(`UPDATE "Booking" SET status='ADMIN_CLOSED' WHERE id=$1`, [
        closed.id,
      ]);
      const dispute = async (id: number, status: string) =>
        (
          await db.query(
            `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description,status) VALUES ($1,$2,$3,$3,$4::"DisputeStatus") RETURNING id`,
            [id, renter.id, canary, status],
          )
        ).rows[0].id;
      await db.query(`UPDATE "Booking" SET status='DISPUTED' WHERE id=$1`, [
        active.id,
      ]);
      const openDisputes = [
        await dispute(past.id, "OPEN"),
        await dispute(active.id, "OPEN"),
      ];
      const resolvedDispute = await dispute(completed.id, "RESOLVED");
      await dispute(closed.id, "RESOLVED");
      const report = async (
        listingId: number,
        reporter: number,
        status: string,
      ) =>
        (
          await db.query(
            `INSERT INTO "ListingReport" ("listingId","reporterId",reason,description,status) VALUES ($1,$2,$3,$3,$4::"ListingReportStatus") RETURNING id`,
            [listingId, reporter, canary, status],
          )
        ).rows[0].id;
      const openReports = [
        await report(active.listingId, renter.id, "OPEN"),
        await report(active.listingId, admin.id, "OPEN"),
      ];
      await report(completed.listingId, renter.id, "REVIEWED");
      const resolvedReport = await report(
        confirmed.listingId,
        renter.id,
        "OPEN",
      );
      assert.equal(
        (
          await api(
            `/api/admin/reports/${resolvedReport}/resolve`,
            admin.cookie,
            "POST",
            { decision: "DISMISS", reason: canary },
          )
        ).status,
        200,
      );
      await db.query(
        `UPDATE "ListingReport" SET "createdAt"='2025-01-01' WHERE status='OPEN'`,
      );
      assert.equal(
        (
          await api(
            `/api/admin/listings/${confirmed.listingId}/moderation`,
            admin.cookie,
            "PATCH",
            { restricted: true, expectedRestricted: false, reason: canary },
          )
        ).status,
        200,
      );
      await db.query(`UPDATE "Listing" SET status='INACTIVE' WHERE id=$1`, [
        completed.listingId,
      ]);
      const fingerprint = async () =>
        JSON.stringify(
          (
            await db.query(
              `SELECT (SELECT md5(string_agg(md5(row_to_json(b)::text),'|' ORDER BY id)) FROM "Booking" b) booking_digest,(SELECT md5(string_agg(md5(row_to_json(h)::text),'|' ORDER BY id)) FROM "Handoff" h) handoff_digest,(SELECT md5(string_agg(md5(row_to_json(r)::text),'|' ORDER BY id)) FROM "Return" r) return_digest,(SELECT count(*) FROM "Booking") bookings,(SELECT count(*) FROM "Handoff") handoffs,(SELECT count(*) FROM "Return") returns,(SELECT count(*) FROM "BookingEvidencePhoto") photos,(SELECT count(*) FROM "AdminAuditLog") audits,(SELECT count(*) FROM "StaffMembership" WHERE state='ACTIVE') active_staff`,
            )
          ).rows[0],
        );
      const before = await fingerprint();
      await t.test(
        "exact queue eligibility and overlap; pending/normal inspection/completed states are not invented tasks",
        async () => {
          const expectations = {
            BOOKING_CASES: [active.id, past.id],
            RENTAL_END_PASSED: [past.id],
            CUSTODY_REVIEW: [anomaly.id, closed.id],
            LISTING_REVIEW: [confirmed.listingId, active.listingId],
            OPEN_REPORTS: openReports,
            OPEN_DISPUTES: openDisputes,
          };
          for (const [category, ids] of Object.entries(expectations)) {
            const r = await query(category);
            assert.deepEqual(
              r.items
                .map((i: { id: number }) => i.id)
                .sort((a: number, b: number) => a - b),
              [...ids].sort((a, b) => a - b),
              category,
            );
            assert.equal(r.totalMatching, ids.length);
            assert.equal(
              r.queues.find(
                (q: { category: string }) => q.category === category,
              ).count,
              ids.length,
            );
            for (const item of r.items) {
              assert.deepEqual(Object.keys(item).sort(), [
                "category",
                "endAt",
                "href",
                "id",
                "kind",
                "reasons",
                "recordedAt",
                "relatedId",
                "status",
              ]);
              assert.ok(item.reasons.length);
              assert.match(
                item.href,
                /^\/admin\/(bookings|listings|reports|disputes)\/[1-9]\d*\?wbCategory=/,
              );
            }
            assert.ok(!JSON.stringify(r).includes(canary));
            assert.deepEqual(
              r.activity
                .map((a: { targetType: string }) => a.targetType)
                .sort(),
              ["LISTING", "REPORT"],
            );
            for (const event of r.activity)
              assert.deepEqual(Object.keys(event).sort(), [
                "createdAt",
                "id",
                "targetId",
                "targetType",
              ]);
          }
          const custody = await query("CUSTODY_REVIEW");
          assert.ok(
            custody.items
              .find((i: { id: number }) => i.id === closed.id)
              .reasons.includes("ADMIN_CLOSED_RETURN_UNCONFIRMED"),
          );
          await writeFile(
            path.join(artifact, "queue-contract-evidence.json"),
            JSON.stringify(
              {
                expectedCounts: Object.fromEntries(
                  Object.entries(expectations).map(([k, v]) => [k, v.length]),
                ),
                pendingExcluded: true,
                normalInspectionExcluded: true,
                completedWithRealParticipantEvidenceExcluded: true,
                resolvedCaseDoesNotCloseCustody: true,
                optionalHandoffMissingFlagged: true,
                privateCanariesAbsent: true,
                categoryOverlapExplicit: true,
              },
              null,
              2,
            ),
          );
        },
      );
      await t.test(
        "detail context re-evaluates the same queue criteria and custody checkpoints without trusting navigation",
        async () => {
          const html = async (kind: string, id: number, context = "") => {
            const r = await fetch(base + `/admin/${kind}/${id}` + context, {
              headers: { Cookie: admin.cookie },
            });
            assert.equal(r.status, 200);
            const body = await r.text();
            const section = body.match(
              /<section[^>]*aria-label="Investigation context"[\s\S]*?<\/section>/,
            )?.[0];
            assert.ok(section, "Guarded detail must render its context panel");
            assert.ok(!section.includes(canary));
            assert.ok(!section.includes(owner.email));
            return section;
          };
          const normal = await html(
            "bookings",
            past.id,
            "?wbCategory=RENTAL_END_PASSED&wbPage=2&wbPageSize=1",
          );
          assert.ok(normal.includes('data-selected-queue-match="true"'));
          assert.ok(normal.includes('data-checkpoint="handoff"'));
          assert.ok(normal.includes('data-current-queue="RENTAL_END_PASSED"'));
          const done = await html("bookings", completed.id);
          assert.ok(done.includes("No current Batch 7A queue criteria"));
          assert.ok(done.includes('data-checkpoint="accepted-inspection"'));
          assert.ok(done.includes("Recorded via owner confirmation"));
          const missing = await html(
            "bookings",
            anomaly.id,
            "?wbCategory=CUSTODY_REVIEW",
          );

          assert.ok(
            missing.includes(
              "Completed state has incomplete accepted inspection",
            ),
          );
          assert.ok(missing.includes("Not established by current records"));
          const closure = await html("bookings", closed.id);
          assert.ok(closure.includes("1 resolved"));
          assert.ok(closure.includes("does not prove physical return"));
          const open = await html(
            "reports",
            openReports[0],
            "?wbCategory=OPEN_REPORTS",
          );
          assert.ok(open.includes('data-selected-queue-match="true"'));
          assert.ok(open.includes("Current open listing reports"));
          const resolved = await html(
            "disputes",
            resolvedDispute,
            "?wbCategory=OPEN_DISPUTES",
          );
          assert.ok(resolved.includes('data-selected-queue-match="false"'));
          const forgedFilter = await html(
            "reports",
            openReports[0],
            "?wbCategory=OPEN_REPORTS&wbRecordId=" + resolvedReport,
          );
          assert.ok(forgedFilter.includes('data-selected-queue-match="true"'));
          const reportClosed = await html(
            "reports",
            resolvedReport,
            "?wbCategory=OPEN_REPORTS",
          );
          assert.ok(reportClosed.includes('data-selected-queue-match="false"'));
          const disputed = await html(
            "disputes",
            openDisputes[0],
            "?wbCategory=OPEN_DISPUTES",
          );
          assert.ok(disputed.includes("Custody checkpoints"));
          assert.ok(disputed.includes('data-selected-queue-match="true"'));
          const parentId = (
            await db.query(`SELECT "bookingId" FROM "Dispute" WHERE id=$1`, [
              openDisputes[0],
            ])
          ).rows[0].bookingId;
          assert.ok(
            disputed.includes(
              `/admin/bookings/${parentId}?wbCategory=OPEN_DISPUTES`,
            ),
          );
          const parent = await html(
            "bookings",
            parentId,
            "?wbCategory=OPEN_DISPUTES&wbPage=2&wbPageSize=1",
          );
          assert.ok(
            parent.includes('data-selected-queue-match="not-applicable"'),
          );
          assert.ok(parent.includes("preserved only as your return view"));

          // A separate reversible fixture transition changes the predicate after a valid queue link.
          await db.query(
            `UPDATE "Listing" SET "adminRestricted"=false WHERE id=$1`,
            [confirmed.listingId],
          );
          try {
            const changed = await html(
              "listings",
              confirmed.listingId,
              "?wbCategory=LISTING_REVIEW&wbPage=3&wbPageSize=1&wbRecordId=" +
                confirmed.listingId,
            );
            assert.ok(changed.includes('data-selected-queue-match="false"'));
            assert.ok(changed.includes("Not currently in the selected queue"));
          } finally {
            await db.query(
              `UPDATE "Listing" SET "adminRestricted"=true WHERE id=$1`,
              [confirmed.listingId],
            );
          }
          for (const query of [
            "?returnTo=https://evil.invalid/private",
            "?wbCategory=__proto__",
            "?wbCategory=OPEN_REPORTS&role=ADMIN",
            "?wbCategory=OPEN_REPORTS&wbPage=10001",
          ]) {
            const safe = await html("reports", openReports[0], query);
            assert.ok(safe.includes("Navigation context was invalid"));
            assert.ok(safe.includes('href="/admin/workbench"'));
            assert.ok(!safe.includes("evil.invalid"));
          }
          for (const kind of ["bookings", "listings", "reports", "disputes"]) {
            const id =
              kind === "bookings"
                ? past.id
                : kind === "listings"
                  ? confirmed.listingId
                  : kind === "reports"
                    ? openReports[0]
                    : openDisputes[0];
            for (const cookie of ["", owner.cookie]) {
              const r = await fetch(base + `/admin/${kind}/${id}`, {
                headers: { Cookie: cookie },
                redirect: "manual",
              });
              assert.ok(!(await r.text()).includes("data-checkpoint="));
            }
          }
          await writeFile(
            path.join(artifact, "investigation-evidence.json"),
            JSON.stringify(
              {
                sharedPredicates: true,
                liveListingChangeReevaluated: true,
                completedWithMissingHistoricalCheckpointsFlagged: true,
                resolvedDisputeDoesNotProveReturn: true,
                ownerAcceptedCompletionRecorded: true,
                caseAndRelatedResourceContext: true,
                invalidNavigationDiscarded: true,
                noPrivateCanariesInPanel: true,
              },
              null,
              2,
            ),
          );
        },
      );
      await t.test(
        "stable ties, bounded pages, exact ID filtering and honest empty results",
        async () => {
          const a = await query("OPEN_REPORTS", "&pageSize=1"),
            b = await query("OPEN_REPORTS", "&pageSize=1&page=2");
          assert.equal(a.items[0].id, openReports[0]);
          assert.equal(b.items[0].id, openReports[1]);
          assert.equal(a.totalPages, 2);
          assert.equal(
            (await query("OPEN_REPORTS", "&recordId=" + openReports[1]))
              .items[0].id,
            openReports[1],
          );
          assert.equal(
            (await query("OPEN_REPORTS", "&recordId=2147483647")).totalMatching,
            0,
          );
          assert.deepEqual(
            (await query("OPEN_REPORTS", "&page=10000")).items,
            [],
          );
        },
      );
      await t.test(
        "legacy authentication, suspension, selectors and mutation denials",
        async () => {
          for (const [cookie, status] of [
            ["", 401],
            [owner.cookie, 403],
          ])
            assert.equal(
              (await api("/api/admin/workbench", cookie as string)).status,
              status,
            );
          for (const [cookie, anonymous] of [
            ["", true],
            [owner.cookie, false],
          ] as const) {
            const r = await fetch(base + "/admin/workbench", {
              headers: { Cookie: cookie },
              redirect: "manual",
            });
            const body = await r.text();
            assert.ok(
              anonymous
                ? r.status === 307 ||
                    (r.status === 200 && body.includes("NEXT_REDIRECT"))
                : r.status === 404 ||
                    (r.status === 200 &&
                      body.includes("NEXT_HTTP_ERROR_FALLBACK;404")),
            );
            assert.ok(!body.includes("data-queue-count"));
            assert.ok(!body.includes(canary));
          }
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [admin.id],
          );
          assert.equal(
            (await api("/api/admin/workbench", admin.cookie)).status,
            403,
          );
          for (const [kind, id] of [
            ["bookings", past.id],
            ["listings", confirmed.listingId],
            ["reports", openReports[0]],
            ["disputes", openDisputes[0]],
          ] as const) {
            const denied = await fetch(
              base + `/admin/${kind}/${id}?wbCategory=OPEN_REPORTS`,
              { headers: { Cookie: admin.cookie }, redirect: "manual" },
            );
            const deniedHtml = await denied.text();
            assert.ok(!deniedHtml.includes("data-checkpoint="));
            assert.ok(
              !deniedHtml.includes('aria-label="Investigation context"'),
            );
          }
          const deniedPage = await fetch(base + "/admin/workbench", {
            headers: { Cookie: admin.cookie },
            redirect: "manual",
          });
          const deniedBody = await deniedPage.text();
          assert.ok(
            deniedPage.status === 404 ||
              (deniedPage.status === 200 &&
                deniedBody.includes("NEXT_HTTP_ERROR_FALLBACK;404")),
          );
          assert.ok(!deniedBody.includes("data-queue-count"));
          await db.query(
            `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
            [admin.id],
          );
          for (const filter of [
            "category=__proto__",
            "category=constructor",
            "category=OPEN_REPORTS%27%3BDROP%20TABLE%20%22User%22",
            "page=-1",
            "page=10001",
            "pageSize=51",
            "recordId=1%20OR%201=1",
            "include=passwordHash",
            "role=ADMIN",
            "category=OPEN_REPORTS&category=OPEN_REPORTS",
            "orderBy=description",
            "q=" + canary,
          ])
            assert.equal(
              (await api("/api/admin/workbench?" + filter, admin.cookie))
                .status,
              400,
              filter,
            );
          const r = await fetch(base + "/api/admin/workbench", {
            headers: { Cookie: admin.cookie },
          });
          assert.equal(r.status, 200);
          assert.match(
            r.headers.get("cache-control") ?? "",
            /private, no-store/,
          );
          assert.match(r.headers.get("vary") ?? "", /cookie/i);
          const body = await r.text();
          for (const term of [
            canary,
            owner.email,
            renter.email,
            "tokenHash",
            "passwordHash",
            "description",
            "conditionNotes",
            "inspectionNotes",
            "photos",
          ])
            assert.ok(!body.includes(term));
          assert.equal(
            (
              await fetch(base + "/api/admin/workbench", {
                method: "POST",
                headers: { Cookie: admin.cookie, Origin: base },
              })
            ).status,
            405,
          );
        },
      );
      await t.test(
        "actual native login, queue filters/detail links and responsive keyboard navigation",
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
              page = await context.newPage(),
              save = await loginDiagnostics(page, db, "workbench-" + label);
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
                .getByRole("link", { name: "Workbench", exact: true })
                .click({ noWaitAfter: true });
              await expect(
                page.getByRole("heading", {
                  name: "Operations workbench",
                  exact: true,
                }),
              ).toBeVisible();
              await page
                .getByRole("combobox", { name: "Queue", exact: true })
                .selectOption("OPEN_REPORTS");
              await page
                .getByLabel("Queue record ID", { exact: true })
                .fill(String(openReports[0]));
              await page
                .getByRole("button", { name: "Apply filters", exact: true })
                .click({ noWaitAfter: true });
              await expect(
                page.getByRole("link", {
                  name: "report #" + openReports[0],
                  exact: true,
                }),
              ).toBeVisible();
              assert.equal(
                await page.locator("[data-workbench-entry]:visible").count(),
                1,
              );
              await page
                .getByRole("link", {
                  name: "report #" + openReports[0],
                  exact: true,
                })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(
                base +
                  "/admin/reports/" +
                  openReports[0] +
                  "?wbCategory=OPEN_REPORTS&wbPage=1&wbPageSize=10&wbRecordId=" +
                  openReports[0],
              );
              await page.goto(
                base + "/admin/workbench?category=CUSTODY_REVIEW",
              );
              await expect(
                page.getByRole("heading", {
                  name: "Custody records to check",
                  exact: true,
                }),
              ).toBeVisible();
              await expect(
                page.locator("[data-workbench-entry]:visible"),
              ).toHaveCount(2);
              await page.keyboard.press("Tab");
              await expect(
                page.getByRole("link", { name: "Skip to main content" }),
              ).toBeFocused();
              await page.keyboard.press("Enter");
              await expect(page.locator("#admin-content")).toBeFocused();
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
              await page.screenshot({
                path: path.join(artifact, "workbench-" + label + ".png"),
                fullPage: true,
                style: "nextjs-portal { display:none !important; }",
              });
              await page.goto(
                base +
                  "/admin/workbench?category=CUSTODY_REVIEW&page=2&pageSize=1",
              );
              await page
                .getByRole("link", {
                  name: "booking #" + closed.id,
                  exact: true,
                })
                .click({ noWaitAfter: true });
              const panel = page.getByRole("region", {
                name: "Investigation context",
                exact: true,
              });
              await expect(
                panel.getByText("Currently matches the selected queue.", {
                  exact: true,
                }),
              ).toBeVisible();
              await expect(
                panel.locator('[data-checkpoint="physical-return"]'),
              ).toHaveText("Not established by current records");
              await expect(
                panel.locator('[data-checkpoint="disputes"]'),
              ).toHaveText("0 open · 1 resolved");
              await panel.screenshot({
                path: path.join(artifact, "investigation-" + label + ".png"),
                style: "nextjs-portal { display: none !important; }",
              });
              await panel
                .getByRole("link", { name: "Back to Workbench", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(
                base +
                  "/admin/workbench?category=CUSTODY_REVIEW&page=2&pageSize=1",
              );
              await expect(
                page.getByRole("link", {
                  name: "booking #" + closed.id,
                  exact: true,
                }),
              ).toBeVisible();
              await save("passed-workbench-login-filter-detail");
              await page
                .getByRole("button", { name: "Sign out", exact: true })
                .click({ noWaitAfter: true });
              await expect(page).toHaveURL(base + "/login");
              assert.equal(
                (
                  await context.request.get(base + "/api/admin/workbench")
                ).status(),
                401,
              );
            } catch (error) {
              await save("failed");
              throw error;
            } finally {
              await context.close();
            }
          }
        },
      );
      await t.test(
        "unavailable data fails safely and read-only workbench preserves existing records",
        async () => {
          const context = await browser!.newContext();
          await context.addCookies([
            {
              name: "p2p_session",
              value: admin.cookie.slice("p2p_session=".length),
              url: base,
            },
          ]);
          const page = await context.newPage();
          await db.query(
            `ALTER TABLE "ListingReport" RENAME TO "ListingReport_owned_failure"`,
          );
          try {
            const r = await api("/api/admin/workbench", admin.cookie);
            assert.equal(r.status, 500);
            assert.ok(!JSON.stringify(r.body).includes(canary));
            assert.deepEqual(Object.keys(r.body).sort(), ["error"]);
            const unavailable = await fetch(
              base + `/admin/bookings/${closed.id}?wbCategory=CUSTODY_REVIEW`,
              { headers: { Cookie: admin.cookie } },
            );
            assert.equal(unavailable.status, 200);
            const unavailableHtml = await unavailable.text();
            assert.ok(
              unavailableHtml.includes(
                "Current investigation checks are unavailable",
              ),
            );
            assert.ok(
              !unavailableHtml.includes('data-checkpoint="physical-return"'),
            );
            await page.goto(base + "/admin/workbench");
            await expect(
              page.getByRole("heading", {
                name: "Operations queues unavailable",
                exact: true,
              }),
            ).toBeVisible();
          } finally {
            await db.query(
              `ALTER TABLE "ListingReport_owned_failure" RENAME TO "ListingReport"`,
            );
          }
          await page
            .getByRole("button", { name: "Try again", exact: true })
            .click({ noWaitAfter: true });
          await expect(
            page.getByRole("heading", {
              name: "Operations workbench",
              exact: true,
            }),
          ).toBeVisible();
          await context.close();
          assert.equal((await query("OPEN_REPORTS")).totalMatching, 2);
          assert.equal(await fingerprint(), before);
        },
      );
    } finally {
      await browser?.close();
      await db.end();
    }
  },
);
