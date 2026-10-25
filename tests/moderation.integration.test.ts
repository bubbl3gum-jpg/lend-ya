import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { openSync, closeSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
import { checklistItems } from "../lib/rental-checklist";
const run = promisify(execFile);
type User = { id: number; cookie: string; email: string };
type Booking = {
  disputes: Record<string, unknown>[];
  id: number;
  listingId: number;
  status: string;
  handoff: Record<string, unknown>;
  return: Record<string, unknown> | null;
  evidencePhotos: { id: string; stage: string }[];
  dispute: Record<string, unknown>;
};
type Payload = {
  listings: { id: number }[];
  error: string;
  user: { id: number; role: string };
  listing: { id: number; media: { url: string }[] };
  booking: Booking;
  dispute: { id: number; status: string };
  report: { id: number; status: string };
  record: Record<string, unknown>;
  items: Record<string, unknown>[];
  pagination: { total: number };
  users: { total: number };
  bookings: { total: number; byStatus: Record<string, number> };
  bookingStatus: string;
  auditLogId: number;
  accountStatus: string;
  status: string;
};
test(
  "Milestone 4B: persisted moderation, case resolution, immutable audits and full browser scenario",
  { timeout: 240000 },
  async (t) => {
    const ownedDatabase = await connectTestDatabase();
    await ownedDatabase.end();
    const databaseUrl = process.env.TEST_DATABASE_URL;
    assert.ok(
      databaseUrl && new URL(databaseUrl).pathname.startsWith("/hustlen_test_"),
      "Use an empty isolated _moderation_test database.",
    );
    const pool = new Pool({ connectionString: databaseUrl });
    assert.equal(
      (await pool.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n,
      0,
      "Dedicated database must start empty.",
    );
    const port = Number(process.env.TEST_MODERATION_PORT ?? 3005),
      base = `http://localhost:${port}`,
      env = {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "development" as const,
      };
    const tag = randomUUID(),
      password = `Test-${randomUUID()}`,
      files: string[] = [];
    const log = openSync("/tmp/lend-ya-moderation-server.log", "w");
    let server: ChildProcess | undefined,
      browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object | FormData,
      extra: Record<string, string> = {},
    ) => {
      const response = await fetch(base + url, {
        method,
        headers: {
          Cookie: cookie,
          "X-Role": "ADMIN",
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...extra,
        },
        ...(body
          ? { body: body instanceof FormData ? body : JSON.stringify(body) }
          : {}),
        redirect: "manual",
      });
      const text = await response.text();
      return {
        status: response.status,
        json: (response.headers
          .get("content-type")
          ?.includes("application/json")
          ? JSON.parse(text)
          : {}) as Payload,
        text,
        headers: response.headers,
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    };
    const account = async (name: string): Promise<User> => {
      const email = `4b-${name}-${tag}@example.test`,
        r = await api("/api/auth/register", "", "POST", {
          name,
          email,
          password,
          role: "ADMIN",
          accountStatus: "ACTIVE",
        });
      assert.equal(r.status, 201, r.text);
      assert.equal(r.json.user.role, "USER");
      return { id: r.json.user.id, cookie: r.cookie, email };
    };
    const image = new Uint8Array(
      await sharp({
        create: { width: 12, height: 8, channels: 3, background: "blue" },
      })
        .png()
        .toBuffer(),
    );
    let stationId: number;
    let admin: User, owner: User, borrower: User, outsider: User;
    const createListing = async (
      who = owner,
      title = `Moderation item ${tag}`,
    ) => {
      const form = new FormData();
      for (const [k, v] of Object.entries({
        title,
        description: "Real API moderation scenario",
        category: "Electronics",
        condition: "Good",
        price: "12.34",
        deposit: "25.67",
        stationIds: JSON.stringify([stationId]),
      }))
        form.set(k, v);
      form.append(
        "photos",
        new File([image], "item.png", { type: "image/png" }),
      );
      const r = await api("/api/listings", who.cookie, "POST", form);
      if (r.status === 201)
        r.json.listing.media.forEach((m) =>
          files.push(
            path.join(process.cwd(), "storage/listings", path.basename(m.url)),
          ),
        );
      return r;
    };
    const requestBooking = (listingId: number, who = borrower) =>
      api("/api/bookings", who.cookie, "POST", {
        listingId,
        meetingStationId: stationId,
        startAt: "2035-01-01T10:00",
        endAt: "2035-01-02T10:01",
      });
    const patch = (id: number, action: string, who = owner) =>
      api(`/api/bookings/${id}`, who.cookie, "PATCH", { action });
    const stage = (id: number, action: string, who: User, extra = {}) => {
      const form = new FormData();
      form.set(
        "payload",
        JSON.stringify({
          checklist: Object.fromEntries(
            Object.keys(checklistItems).map((k) => [k, "yes"]),
          ),
          conditionNotes: `${who === owner ? "Owner" : "Borrower"} ${action} original evidence`,
          conditionConfirmed: true,
          returnConfirmed: true,
          ...extra,
        }),
      );
      form.append(
        "photos",
        new File([image], "condition.png", { type: "image/png" }),
      );
      return api(`/api/bookings/${id}/${action}`, who.cookie, "POST", form);
    };
    const inUse = async () => {
      const l = await createListing();
      assert.equal(l.status, 201, l.text);
      const b = await requestBooking(l.json.listing.id);
      assert.equal(b.status, 201, b.text);
      const id = b.json.booking.id;
      assert.equal((await patch(id, "accept")).status, 200);
      assert.equal((await stage(id, "handoff", owner)).status, 200);
      assert.equal((await stage(id, "handoff", borrower)).status, 200);
      return { id, listingId: l.json.listing.id };
    };
    const dispute = async (id: number) => {
      const r = await api(
        `/api/bookings/${id}/dispute`,
        borrower.cookie,
        "POST",
        {
          reason: "Condition concern",
          description: "Original participant allegation, not a proven fact",
        },
      );
      assert.equal(r.status, 201, r.text);
      return r.json.dispute.id;
    };
    const statusUser = (
      who: User,
      status: string,
      expectedStatus: string,
      reason = "Required account moderation reason",
    ) =>
      api(`/api/admin/users/${who.id}/status`, admin.cookie, "PATCH", {
        status,
        expectedStatus,
        reason,
      });
    const statusListing = (
      id: number,
      restricted: boolean,
      expectedRestricted: boolean,
    ) =>
      api(`/api/admin/listings/${id}/moderation`, admin.cookie, "PATCH", {
        restricted,
        expectedRestricted,
        reason: "Review listing restriction",
      });
    const resolve = (
      id: number,
      outcome: string,
      finding = "INSUFFICIENT_EVIDENCE",
    ) =>
      api(`/api/admin/disputes/${id}/resolve`, admin.cookie, "POST", {
        finding,
        outcome,
        reason: "Participant-visible reviewed decision",
        adminNotes: "Confidential investigation note",
      });
    const detail = async (id: number) => {
      const r = await api(`/api/bookings/${id}`, borrower.cookie);
      assert.equal(r.status, 200);
      return r.json.booking;
    };
    try {
      await run(
        process.execPath,
        [
          "node_modules/prisma/build/index.js",
          "migrate",
          "deploy",
          "--config",
          "prisma7.config.ts",
        ],
        { env },
      );
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          String(port),
        ],
        { env, stdio: ["ignore", log, log] },
      );
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (server.exitCode !== null)
          throw new Error("Test server stopped; see moderation server log");
        try {
          if ((await fetch(base + "/api/listings")).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(ready);
      admin = await account("Administrator");
      owner = await account("Owner");
      borrower = await account("Borrower");
      outsider = await account("Outsider");
      await run(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/create-admin.ts",
          admin.email,
        ],
        { env },
      );
      const login = await api("/api/auth/login", "", "POST", {
        email: admin.email,
        password,
      });
      assert.equal(login.status, 200);
      admin.cookie = login.cookie;
      stationId = (
        await pool.query("SELECT id FROM \"MrtStation\" WHERE code='TPE'")
      ).rows[0].id;
      await t.test(
        "every new admin API authenticates, rejects spoofing/cross-origin/invalid input, and never logs failure",
        async () => {
          const routes: [
            [string, string, object?],
            ...Array<[string, string, object?]>,
          ] = [
            [
              `/api/admin/users/${owner.id}/status`,
              "PATCH",
              { status: "SUSPENDED", expectedStatus: "ACTIVE", reason: "Test" },
            ],
            [
              `/api/admin/listings/1/moderation`,
              "PATCH",
              { restricted: true, expectedRestricted: false, reason: "Test" },
            ],
            [
              "/api/admin/reports/1/resolve",
              "POST",
              { decision: "UPHOLD", reason: "Test" },
            ],
            [
              "/api/admin/disputes/1/resolve",
              "POST",
              {
                finding: "ISSUE_CONFIRMED",
                outcome: "CLOSE_RETURNED",
                reason: "Test",
              },
            ],
            ["/api/admin/reports", "GET"],
            ["/api/admin/reports/1", "GET"],
            ["/api/admin/disputes", "GET"],
            ["/api/admin/disputes/1", "GET"],
            ["/api/admin/audit-logs", "GET"],
            [`/api/admin/disputes/1/evidence/${randomUUID()}`, "GET"],
          ];
          for (const [url, method, body] of routes) {
            assert.equal((await api(url, "", method, body)).status, 401, url);
            assert.equal(
              (await api(url, owner.cookie, method, body)).status,
              403,
              url,
            );
            assert.equal(
              (await api(url, "p2p_session=forged", method, body)).status,
              401,
              url,
            );
          }
          const url = `/api/admin/users/${owner.id}/status`,
            valid = {
              status: "SUSPENDED",
              expectedStatus: "ACTIVE",
              reason: "Test",
            };
          for (const headers of [
            { Origin: "https://attacker.example" },
            { "Sec-Fetch-Site": "cross-site" },
          ] as Record<string, string>[])
            assert.equal(
              (await api(url, admin.cookie, "PATCH", valid, headers)).status,
              403,
            );
          assert.equal(
            (
              await api(url, admin.cookie, "PATCH", {
                ...valid,
                adminId: owner.id,
              })
            ).status,
            400,
          );
          assert.equal(
            (await api(url, admin.cookie, "PATCH", { ...valid, reason: "  " }))
              .status,
            400,
          );
          assert.equal(
            (
              await api(url, admin.cookie, "PATCH", valid, {
                "Content-Type": "text/plain",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await api(url, admin.cookie, "PATCH", {
                ...valid,
                reason: "a".repeat(9000),
              })
            ).status,
            413,
          );
          assert.equal(
            (await statusUser(admin, "SUSPENDED", "ACTIVE")).status,
            403,
          );
          const another = await account("SecondAdmin");
          await run(
            process.execPath,
            [
              "node_modules/tsx/dist/cli.mjs",
              "scripts/create-admin.ts",
              another.email,
            ],
            { env },
          );
          assert.equal(
            (await statusUser(another, "SUSPENDED", "ACTIVE")).status,
            403,
          );
          assert.equal(
            (
              await api("/api/account", owner.cookie, "PATCH", {
                name: "Owner",
                role: "ADMIN",
                accountStatus: "SUSPENDED",
              })
            ).status,
            200,
          );
          assert.deepEqual(
            (
              await pool.query(
                'SELECT role,"accountStatus" FROM "User" WHERE id=$1',
                [owner.id],
              )
            ).rows[0],
            { role: "USER", accountStatus: "ACTIVE" },
          );
          const expired = await account("ExpiredSession");
          await pool.query(
            'UPDATE "AuthSession" SET "expiresAt"=NOW()-INTERVAL \'1 second\' WHERE "userId"=$1',
            [expired.id],
          );
          assert.equal(
            (await api(url, expired.cookie, "PATCH", valid)).status,
            401,
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int AS n FROM "AdminAuditLog"'))
              .rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "suspension uses current persisted state, blocks new activity and preserves legitimate return/inspection obligations",
        async () => {
          const rental = await inUse(),
            pendingListing = await createListing();
          assert.equal(pendingListing.status, 201);
          const pending = await requestBooking(pendingListing.json.listing.id);
          assert.equal(pending.status, 201);
          assert.equal(
            (await statusUser(owner, "SUSPENDED", "ACTIVE")).status,
            200,
          );
          assert.equal((await createListing()).status, 403);
          const suspendedDirectory = await api(
            "/api/admin/users?accountStatus=SUSPENDED",
            admin.cookie,
          );
          assert.equal(suspendedDirectory.status, 200);
          assert.ok(
            suspendedDirectory.json.items.some((u) => u.id === owner.id),
          );
          assert.equal(
            (await requestBooking(pendingListing.json.listing.id)).status,
            409,
          );
          assert.equal(
            (await patch(pending.json.booking.id, "accept")).status,
            403,
          );
          assert.equal(
            (
              await api(
                `/api/listings/${pendingListing.json.listing.id}`,
                owner.cookie,
                "PATCH",
                { status: "ACTIVE" },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(
                `/api/listings/${pendingListing.json.listing.id}`,
                owner.cookie,
                "DELETE",
              )
            ).status,
            403,
          );
          assert.equal(
            (await api(`/api/listings/${pendingListing.json.listing.id}`))
              .status,
            404,
          );
          assert.equal(
            (
              await api(
                `/api/listings/${pendingListing.json.listing.id}`,
                owner.cookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (await statusUser(borrower, "SUSPENDED", "ACTIVE")).status,
            200,
          );
          assert.equal(
            (await requestBooking(pendingListing.json.listing.id)).status,
            403,
          );
          assert.equal(
            (await stage(rental.id, "return", borrower)).status,
            200,
          );
          assert.equal((await patch(rental.id, "inspect")).status, 200);
          assert.equal(
            (await stage(rental.id, "inspection", owner, { acceptable: true }))
              .status,
            200,
          );
          const b = await detail(rental.id);
          assert.equal(b.status, "COMPLETED");
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/reviews`,
                borrower.cookie,
                "POST",
                { rating: 5 },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/evidence/${b.evidencePhotos[0].id}`,
                borrower.cookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (await statusUser(owner, "ACTIVE", "SUSPENDED")).status,
            200,
          );
          assert.equal(
            (await statusUser(borrower, "ACTIVE", "SUSPENDED")).status,
            200,
          );
          assert.equal(
            (await patch(pending.json.booking.id, "accept")).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/reviews`,
                borrower.cookie,
                "POST",
                { rating: 5 },
              )
            ).status,
            201,
          );
          const concurrent = await Promise.all([
            statusUser(outsider, "SUSPENDED", "ACTIVE"),
            statusUser(outsider, "SUSPENDED", "ACTIVE"),
          ]);
          assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            (await statusUser(outsider, "ACTIVE", "SUSPENDED")).status,
            200,
          );
        },
      );
      await t.test(
        "separate listing restrictions cannot be bypassed and restoration preserves owner inactivity, suspension, reports and media eligibility",
        async () => {
          const l = await createListing();
          assert.equal(l.status, 201);
          const id = l.json.listing.id,
            pending = await requestBooking(id);
          assert.equal(pending.status, 201);
          assert.equal((await statusListing(id, true, false)).status, 200);
          const restrictedDirectory = await api(
            "/api/admin/listings?restricted=true",
            admin.cookie,
          );
          assert.equal(restrictedDirectory.status, 200);
          assert.ok(restrictedDirectory.json.items.some((l) => l.id === id));
          assert.equal((await requestBooking(id)).status, 409);
          assert.equal(
            (await patch(pending.json.booking.id, "accept")).status,
            409,
          );
          for (const body of [
            { status: "ACTIVE" },
            { adminRestricted: false },
            { title: "Conceal the original evidence" },
          ])
            assert.equal(
              (await api(`/api/listings/${id}`, owner.cookie, "PATCH", body))
                .status,
              body.title || body.status ? 409 : 400,
            );
          assert.equal(
            (await api(`/api/listings/${id}`, owner.cookie, "DELETE")).status,
            409,
          );
          assert.equal((await api(`/api/listings/${id}`)).status, 404);
          assert.equal(
            (await api(`/api/listings/${id}`, owner.cookie)).status,
            200,
          );
          assert.equal((await statusListing(id, false, true)).status, 200);
          assert.equal(
            (await patch(pending.json.booking.id, "accept")).status,
            200,
          );
          const inactive = await createListing();
          const iid = inactive.json.listing.id;
          assert.equal(
            (
              await api(`/api/listings/${iid}`, owner.cookie, "PATCH", {
                status: "INACTIVE",
              })
            ).status,
            200,
          );
          assert.equal((await statusListing(iid, true, false)).status, 200);
          assert.equal((await statusListing(iid, false, true)).status, 200);
          assert.equal((await requestBooking(iid)).status, 409);
          assert.equal(
            (await statusUser(owner, "SUSPENDED", "ACTIVE")).status,
            200,
          );
          assert.equal((await statusListing(id, true, false)).status, 200);
          assert.equal((await statusListing(id, false, true)).status, 200);
          assert.equal((await requestBooking(id)).status, 409);
          assert.equal(
            (await statusUser(owner, "ACTIVE", "SUSPENDED")).status,
            200,
          );
          const before = (
            await pool.query('SELECT * FROM "Booking" WHERE id=$1', [
              pending.json.booking.id,
            ])
          ).rows[0];
          assert.equal(before.status, "CONFIRMED");
          const race = await Promise.all([
            statusListing(iid, true, false),
            statusListing(iid, true, false),
          ]);
          assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
        },
      );
      let reportListingId: number,
        upheldReportId: number,
        closedCaseId: number,
        closedBookingId: number,
        closedPhotoId: string;
      await t.test(
        "real safety reports are dismissed/upheld independently, listing remains restricted, and conflicting resolutions serialize",
        async () => {
          const l = await createListing();
          assert.equal(l.status, 201);
          reportListingId = l.json.listing.id;
          const report1 = await api(
              `/api/listings/${reportListingId}/report`,
              borrower.cookie,
              "POST",
              {
                reason: "First safety allegation",
                description: "Preserve this original description",
              },
            ),
            report2 = await api(
              `/api/listings/${reportListingId}/report`,
              outsider.cookie,
              "POST",
              { reason: "Independent second allegation" },
            );
          assert.equal(report1.status, 201);
          assert.equal(report2.status, 201);
          assert.equal((await requestBooking(reportListingId)).status, 409);
          const dismissed = await api(
            `/api/admin/reports/${report1.json.report.id}/resolve`,
            admin.cookie,
            "POST",
            { decision: "DISMISS", reason: "First report lacks support" },
          );
          assert.equal(dismissed.status, 200);
          assert.equal(
            (await statusListing(reportListingId, true, false)).status,
            200,
          );
          assert.equal(
            (await statusListing(reportListingId, false, true)).status,
            200,
          );
          assert.equal(
            (await requestBooking(reportListingId)).status,
            409,
            "Second OPEN report still blocks",
          );
          upheldReportId = report2.json.report.id;
          const race = await Promise.all([
            api(
              `/api/admin/reports/${upheldReportId}/resolve`,
              admin.cookie,
              "POST",
              { decision: "UPHOLD", reason: "Confirmed safety restriction" },
            ),
            api(
              `/api/admin/reports/${upheldReportId}/resolve`,
              admin.cookie,
              "POST",
              { decision: "DISMISS", reason: "Competing stale decision" },
            ),
          ]);
          assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
          // The winner is deliberately scheduling-independent. Ensure an upheld case exists through a third authenticated report if dismissal won.
          const state = (
            await pool.query('SELECT status FROM "ListingReport" WHERE id=$1', [
              upheldReportId,
            ])
          ).rows[0].status;
          if (state === "DISMISSED") {
            const reporter = await account("AdditionalReporter");
            const r = await api(
              `/api/listings/${reportListingId}/report`,
              reporter.cookie,
              "POST",
              { reason: "Verified safety issue" },
            );
            assert.equal(r.status, 201);
            upheldReportId = r.json.report.id;
            assert.equal(
              (
                await api(
                  `/api/admin/reports/${upheldReportId}/resolve`,
                  admin.cookie,
                  "POST",
                  {
                    decision: "UPHOLD",
                    reason: "Confirmed safety restriction",
                  },
                )
              ).status,
              200,
            );
          }
          assert.equal((await requestBooking(reportListingId)).status, 409);
          assert.equal(
            (
              await api(
                `/api/listings/${reportListingId}`,
                owner.cookie,
                "PATCH",
                { status: "ACTIVE" },
              )
            ).status,
            409,
          );
          assert.equal(
            (await statusListing(reportListingId, false, true)).status,
            200,
          );
          assert.equal((await requestBooking(reportListingId)).status, 201);
          const original = (
            await pool.query(
              'SELECT reason,description,status,"resolvedBy","resolvedAt" FROM "ListingReport" WHERE id=$1',
              [report1.json.report.id],
            )
          ).rows[0];
          assert.equal(
            original.description,
            "Preserve this original description",
          );
          assert.equal(original.status, "DISMISSED");
          assert.equal(original.resolvedBy, admin.id);
          assert.ok(original.resolvedAt);
          const dir = await api(
            "/api/admin/reports?status=DISMISSED&pageSize=1",
            admin.cookie,
          );
          assert.equal(dir.status, 200);
          assert.equal(dir.json.items.length, 1);
          assert.ok(dir.json.pagination.total >= 1);
          assert.equal(
            (await api("/api/admin/reports?status=bogus", admin.cookie)).status,
            400,
          );
          assert.equal(
            (await api("/api/admin/audit-logs?targetId=0", admin.cookie))
              .status,
            400,
          );
        },
      );
      await t.test(
        "disputes without a return resume obligations without false completion; valid uninspected return resumes inspection",
        async () => {
          const rental = await inUse(),
            id = await dispute(rental.id);
          assert.equal((await resolve(id, "CLOSE_RETURNED")).status, 409);
          assert.equal((await resolve(id, "RESUME_INSPECTION")).status, 409);
          assert.equal((await resolve(id, "CONTINUE_RETURN")).status, 200);
          let b = await detail(rental.id);
          assert.equal(b.status, "IN_USE");
          assert.equal(b.return, null);
          assert.equal(b.dispute.status, "RESOLVED");
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/reviews`,
                borrower.cookie,
                "POST",
                { rating: 4 },
              )
            ).status,
            409,
          );
          assert.equal(
            (await stage(rental.id, "return", borrower)).status,
            200,
          );
          assert.equal((await patch(rental.id, "inspect")).status, 200);
          assert.equal(
            (await stage(rental.id, "inspection", owner, { acceptable: true }))
              .status,
            200,
          );
          const reopened = await inUse();
          await stage(reopened.id, "return", borrower);
          const firstCase = await dispute(reopened.id);
          assert.equal(
            (await resolve(firstCase, "RESUME_INSPECTION")).status,
            200,
          );
          await patch(reopened.id, "inspect");
          await stage(reopened.id, "inspection", owner, { acceptable: false });
          const nextCase = await dispute(reopened.id);
          assert.notEqual(firstCase, nextCase);
          assert.equal((await resolve(nextCase, "CLOSE_RETURNED")).status, 200);
          const history = await detail(reopened.id);
          assert.equal(history.disputes.length, 2);
          assert.ok(history.disputes.every((d) => d.status === "RESOLVED"));
          assert.equal(
            (await resolve(firstCase, "CLOSE_RETURNED")).status,
            409,
          );
          const second = await inUse();
          assert.equal(
            (await stage(second.id, "return", borrower)).status,
            200,
          );
          const secondCase = await dispute(second.id);
          assert.equal(
            (await resolve(secondCase, "CLOSE_RETURNED")).status,
            409,
          );
          assert.equal(
            (
              await resolve(
                secondCase,
                "RESUME_INSPECTION",
                "NO_ACTIONABLE_ISSUE",
              )
            ).status,
            200,
          );
          b = await detail(second.id);
          assert.equal(b.status, "RETURN_PENDING");
          assert.equal(b.return?.confirmedAt, null);
          assert.equal((await patch(second.id, "inspect")).status, 200);
          assert.equal(
            (await stage(second.id, "inspection", owner, { acceptable: true }))
              .status,
            200,
          );
        },
      );
      await t.test(
        "owner-inspected returned disputes close explicitly, preserve all evidence, reject repeats and serialize conflicting findings",
        async () => {
          const rental = await inUse();
          closedBookingId = rental.id;
          assert.equal(
            (await stage(rental.id, "return", borrower)).status,
            200,
          );
          assert.equal((await patch(rental.id, "inspect")).status, 200);
          assert.equal(
            (await stage(rental.id, "inspection", owner, { acceptable: false }))
              .status,
            200,
          );
          closedCaseId = await dispute(rental.id);
          const before = await detail(rental.id);
          closedPhotoId = before.evidencePhotos[0].id;
          const caseRead = await api(
            `/api/admin/disputes/${closedCaseId}`,
            admin.cookie,
          );
          assert.equal(caseRead.status, 200);
          assert.ok(caseRead.text.includes("Owner handoff original evidence"));
          assert.ok(
            caseRead.text.includes("Borrower return original evidence"),
          );
          assert.ok(!caseRead.text.includes("passwordHash"));
          assert.ok(!caseRead.text.includes('"data":'));
          const imageResponse = await api(
            `/api/admin/disputes/${closedCaseId}/evidence/${closedPhotoId}`,
            admin.cookie,
          );
          assert.equal(imageResponse.status, 200);
          assert.equal(
            imageResponse.headers.get("cache-control"),
            "private, no-store",
          );
          assert.equal(
            imageResponse.headers.get("x-content-type-options"),
            "nosniff",
          );
          assert.equal(
            (
              await api(
                `/api/admin/disputes/${closedCaseId}/evidence/${randomUUID()}`,
                admin.cookie,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/evidence/${closedPhotoId}`,
                outsider.cookie,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(`/api/bookings/${rental.id}`, owner.cookie, "PATCH", {
                action: "complete",
                acceptable: true,
              })
            ).status,
            409,
          );
          assert.equal(
            (await resolve(closedCaseId, "RESUME_INSPECTION")).status,
            409,
          );
          const race = await Promise.all([
            resolve(closedCaseId, "CLOSE_RETURNED", "ISSUE_CONFIRMED"),
            resolve(closedCaseId, "CLOSE_RETURNED", "NO_ACTIONABLE_ISSUE"),
          ]);
          assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            (await resolve(closedCaseId, "CLOSE_RETURNED")).status,
            409,
          );
          const after = await detail(rental.id);
          assert.equal(after.status, "ADMIN_CLOSED");
          assert.equal(after.dispute.status, "RESOLVED");
          assert.deepEqual(after.handoff, before.handoff);
          assert.deepEqual(after.return, before.return);
          assert.deepEqual(after.evidencePhotos, before.evidencePhotos);
          assert.equal(after.return?.inspectionAccepted, false);
          assert.equal(after.return?.confirmedAt, null);
          assert.ok(
            !JSON.stringify(after).includes("Confidential investigation note"),
          );
          assert.ok(
            JSON.stringify(after).includes(
              "Participant-visible reviewed decision",
            ),
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental.id}/reviews`,
                borrower.cookie,
                "POST",
                { rating: 5 },
              )
            ).status,
            409,
          );
          assert.equal((await requestBooking(rental.listingId)).status, 201);
          assert.equal(
            (
              await api(
                `/api/admin/disputes/${closedCaseId}/evidence/${closedPhotoId}`,
                admin.cookie,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/admin/disputes/${closedCaseId + 1000}/evidence/${closedPhotoId}`,
                admin.cookie,
              )
            ).status,
            404,
          );
          const otherCase = (
            await pool.query('SELECT id FROM "Dispute" WHERE id<>$1 LIMIT 1', [
              closedCaseId,
            ])
          ).rows[0].id;
          assert.equal(
            (
              await api(
                `/api/admin/disputes/${otherCase}/evidence/${closedPhotoId}`,
                admin.cookie,
              )
            ).status,
            404,
          );
        },
      );
      await t.test(
        "restoration respects missing legacy photos and reactivation preserves admin restrictions",
        async () => {
          // This is a legacy eligibility fixture, not a simulated successful listing or rental workflow.
          const legacyId = (
            await pool.query(
              `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'Legacy without media','Migration fixture','Electronics',10,'Unknown',NOW()) RETURNING id`,
              [owner.id],
            )
          ).rows[0].id;
          assert.equal(
            (await statusListing(legacyId, true, false)).status,
            200,
          );
          assert.equal(
            (await statusListing(legacyId, false, true)).status,
            200,
          );
          assert.equal((await requestBooking(legacyId)).status, 409);
          assert.ok(
            !(await api("/api/listings")).json.listings.some(
              (l) => l.id === legacyId,
            ),
          );
          assert.equal(
            (await statusListing(legacyId, true, false)).status,
            200,
          );
          const bookingsBefore = (
            await pool.query(
              'SELECT id,status,"totalPrice",deposit,"updatedAt" FROM "Booking" ORDER BY id',
            )
          ).rows;
          assert.equal(
            (await statusUser(owner, "SUSPENDED", "ACTIVE")).status,
            200,
          );
          assert.equal(
            (await statusUser(owner, "ACTIVE", "SUSPENDED")).status,
            200,
          );
          const record = await api(
            `/api/admin/listings/${legacyId}`,
            admin.cookie,
          );
          assert.equal(record.status, 200);
          assert.equal(record.json.record.adminRestricted, true);
          assert.deepEqual(
            (
              await pool.query(
                'SELECT id,status,"totalPrice",deposit,"updatedAt" FROM "Booking" ORDER BY id',
              )
            ).rows,
            bookingsBefore,
          );
        },
      );
      await t.test(
        "audits match persisted actors/reasons/states; failed actions create no success logs; immutable history survives suspension",
        async () => {
          const logs = (
            await pool.query('SELECT * FROM "AdminAuditLog" ORDER BY id')
          ).rows;
          assert.ok(logs.length >= 15);
          for (const row of logs) {
            assert.equal(row.adminId, admin.id);
            assert.ok(row.reason.trim());
            assert.ok(row.createdAt);
            assert.ok(row.previousState);
            assert.ok(row.newState);
            assert.ok(
              !JSON.stringify(row).match(
                /passwordHash|tokenHash|Confidential investigation note/,
              ),
            );
          }
          assert.equal(
            logs.filter(
              (row) =>
                row.action === "DISPUTE_RESOLVED" &&
                row.targetId === closedCaseId,
            ).length,
            1,
          );
          await assert.rejects(
            pool.query(
              "UPDATE \"AdminAuditLog\" SET reason='rewritten' WHERE id=$1",
              [logs[0].id],
            ),
            /immutable/,
          );
          await assert.rejects(
            pool.query('DELETE FROM "AdminAuditLog" WHERE id=$1', [logs[0].id]),
            /immutable/,
          );
          assert.equal(
            (
              await api("/api/admin/audit-logs", admin.cookie, "POST", {
                reason: "Forgery",
              })
            ).status,
            405,
          );
          // Deliberate isolated fault injection proves required audit writes are part of the transaction.
          await pool.query(
            `CREATE FUNCTION test_fail_required_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason='Injected audit failure' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_required_audit BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION test_fail_required_audit();`,
          );
          try {
            const failed = await statusUser(
              owner,
              "SUSPENDED",
              "ACTIVE",
              "Injected audit failure",
            );
            assert.equal(failed.status, 500);
            assert.equal(failed.json.error, "Internal server error");
            assert.equal(
              (
                await pool.query(
                  'SELECT "accountStatus" FROM "User" WHERE id=$1',
                  [owner.id],
                )
              ).rows[0].accountStatus,
              "ACTIVE",
            );
            assert.equal(
              (
                await pool.query(
                  'SELECT count(*)::int AS n FROM "AdminAuditLog"',
                )
              ).rows[0].n,
              logs.length,
            );
          } finally {
            await pool.query(
              'DROP TRIGGER test_required_audit ON "AdminAuditLog"; DROP FUNCTION test_fail_required_audit()',
            );
          }
          const before = logs.length;
          assert.equal(
            (
              await api(
                `/api/admin/users/${owner.id}/status`,
                admin.cookie,
                "PATCH",
                { status: "SUSPENDED", expectedStatus: "ACTIVE", reason: "" },
              )
            ).status,
            400,
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int AS n FROM "AdminAuditLog"'))
              .rows[0].n,
            before,
          );
          assert.equal(
            (await statusUser(owner, "SUSPENDED", "ACTIVE")).status,
            200,
          );
          const filtered = await api(
            `/api/admin/audit-logs?targetType=USER&targetId=${owner.id}&pageSize=1`,
            admin.cookie,
          );
          assert.equal(filtered.status, 200);
          assert.equal(filtered.json.items.length, 1);
          assert.ok(filtered.json.pagination.total >= 3);
          assert.equal(
            (await statusUser(owner, "ACTIVE", "SUSPENDED")).status,
            200,
          );
          const overview = await api("/api/admin/overview", admin.cookie);
          assert.equal(overview.status, 200);
          assert.equal(
            overview.json.users.total,
            (await pool.query('SELECT count(*)::int AS n FROM "User"')).rows[0]
              .n,
          );
          assert.equal(overview.json.bookings.byStatus.ADMIN_CLOSED, 2);
        },
      );
      await t.test(
        "desktop/mobile controls perform real suspension, restoration, report review and dispute resolution with explicit confirmation",
        async () => {
          browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          });
          const context = await browser.newContext({
              viewport: { width: 1440, height: 1000 },
            }),
            page = await context.newPage();
          page.setDefaultTimeout(15000);
          await page.goto(base + "/login");
          await page.getByLabel("Email address").fill(admin.email);
          await page.getByLabel("Password", { exact: true }).fill(password);
          await page
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          await page.waitForURL("**/admin");
          const confirm = async () => {
            page.once("dialog", (d) => d.accept());
            const result = page.waitForResponse(
              (r) =>
                r.url().includes("/api/admin/") &&
                ["PATCH", "POST"].includes(r.request().method()),
            );
            await page
              .getByRole("button", { name: "Confirm decision", exact: true })
              .click();
            const response = await result;
            assert.equal(response.status(), 200, await response.text());
          };
          await page.goto(`${base}/admin/users/${outsider.id}`);
          await page
            .getByLabel("Required administrative reason")
            .fill("Browser suspension reason");
          await confirm();
          await expect(
            page.getByRole("combobox", { name: "Decision" }),
          ).toHaveValue("ACTIVE");
          const userContext = await browser.newContext();
          await userContext.addCookies([
            {
              name: "p2p_session",
              value: outsider.cookie.split("=")[1],
              url: base,
            },
          ]);
          const userPage = await userContext.newPage();
          await userPage.goto(base + "/dashboard");
          await expect(
            userPage
              .getByRole("status")
              .filter({ hasText: "Your account is suspended" }),
          ).toBeVisible();
          await page
            .getByLabel("Required administrative reason")
            .fill("Browser reactivation reason");
          await confirm();
          await expect(
            page.getByRole("combobox", { name: "Decision" }),
          ).toHaveValue("SUSPENDED");
          await page.goto(`${base}/admin/listings/${reportListingId}`);
          await page
            .getByLabel("Required administrative reason")
            .fill("Browser listing restriction");
          await confirm();
          await expect(
            page.getByRole("combobox", { name: "Decision" }),
          ).toHaveValue("false");
          await page
            .getByLabel("Required administrative reason")
            .fill("Browser listing restoration");
          await confirm();
          await expect(
            page.getByRole("combobox", { name: "Decision" }),
          ).toHaveValue("true");
          const l = await createListing();
          const report = await api(
            `/api/listings/${l.json.listing.id}/report`,
            borrower.cookie,
            "POST",
            { reason: "Browser case allegation" },
          );
          assert.equal(report.status, 201);
          await page.goto(`${base}/admin/reports/${report.json.report.id}`);
          await page
            .getByRole("combobox", { name: "Decision" })
            .selectOption("UPHOLD");
          await page
            .getByLabel("Required administrative reason")
            .fill("Browser upheld safety reason");
          await confirm();
          await expect(
            page.getByRole("button", { name: "Confirm decision", exact: true }),
          ).toHaveCount(0);
          const rental = await inUse();
          await stage(rental.id, "return", borrower);
          await patch(rental.id, "inspect");
          await stage(rental.id, "inspection", owner, { acceptable: false });
          const caseId = await dispute(rental.id);
          await page.goto(`${base}/admin/disputes/${caseId}`);
          await expect(
            page.getByRole("heading", { name: "Owner handoff statement" }),
          ).toBeVisible();
          for (const img of await page
            .locator('img[src*="/api/admin/disputes/"]')
            .all()) {
            await img.scrollIntoViewIfNeeded();
            await expect
              .poll(() =>
                img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
              )
              .toBeGreaterThan(0);
          }
          await page
            .getByRole("combobox", { name: "Decision" })
            .selectOption("ISSUE_CONFIRMED");
          await page
            .getByLabel("Booking consequence")
            .selectOption("CLOSE_RETURNED");
          await page
            .getByLabel("Participant-visible decision explanation")
            .fill("Browser confirmed returned item closure");
          await page
            .getByLabel("Confidential internal notes")
            .fill("Only investigators see this note");
          await confirm();
          await expect(
            page.getByRole("button", { name: "Confirm decision", exact: true }),
          ).toHaveCount(0);
          assert.equal((await detail(rental.id)).status, "ADMIN_CLOSED");
          await page.screenshot({
            path: "/tmp/lend-ya-dispute-desktop.png",
            fullPage: true,
            style: "nextjs-portal{display:none!important}",
          });
          for (const route of ["reports", "disputes", "audit-logs"]) {
            await page.goto(`${base}/admin/${route}?pageSize=1`);
            await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
            await page
              .getByLabel("Search", { exact: true })
              .fill(route === "reports" ? "Browser" : "");
            await page.getByRole("button", { name: "Apply filters" }).click();
            if (route === "audit-logs") {
              await page
                .getByRole("link", { name: "Next", exact: true })
                .click();
              await page.waitForURL(/page=2/);
            }
          }
          await page.setViewportSize({ width: 390, height: 844 });
          for (const route of [
            "reports",
            `reports/${upheldReportId}`,
            "disputes",
            `disputes/${caseId}`,
            "audit-logs",
          ]) {
            await page.goto(`${base}/admin/${route}`);
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              route,
            );
          }
          await page.screenshot({
            path: "/tmp/lend-ya-moderation-mobile.png",
            fullPage: true,
            style: "nextjs-portal{display:none!important}",
          });
          for (const route of [
            "reports",
            `reports/${upheldReportId}`,
            "disputes",
            `disputes/${closedCaseId}`,
            "audit-logs",
          ]) {
            assert.equal(
              (await userPage.goto(`${base}/admin/${route}`))?.status(),
              404,
            );
            assert.equal((await api(`/admin/${route}`)).status, 307);
          }
          await userContext.clearCookies();
          await userContext.addCookies([
            {
              name: "p2p_session",
              value: borrower.cookie.split("=")[1],
              url: base,
            },
          ]);
          await userPage.goto(`${base}/bookings/${closedBookingId}`);
          await expect(
            userPage.getByText(/Participant-visible reviewed decision/),
          ).toBeVisible();
          await expect(
            userPage.getByText("Confidential investigation note"),
          ).toHaveCount(0);
          await userContext.close();
          await context.close();
        },
      );
    } finally {
      await browser?.close();
      if (server && server.exitCode === null) {
        const stopped = once(server, "exit");
        server.kill("SIGTERM");
        await stopped;
      }
      closeSync(log);
      // The verified ownership harness drops this entire disposable database.
      // Do not cascade TRUNCATE through append-only ticket/event tables.
      await pool.end();
      await Promise.all(files.map((file) => unlink(file).catch(() => {})));
    }
  },
);
