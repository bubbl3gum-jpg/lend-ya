import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import { openSync, closeSync } from "node:fs";
import { unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";

const run = promisify(execFile);
test(
  "Milestone 4A: admin provisioning, database reads, authorization and desktop/mobile browser",
  { timeout: 180000 },
  async (t) => {
    const ownedDatabase = await connectTestDatabase();
    await ownedDatabase.end();
    const databaseUrl = process.env.TEST_DATABASE_URL;
    assert.ok(
      databaseUrl && new URL(databaseUrl).pathname.startsWith("/hustlen_test_"),
      "Use the separate disposable _admin_test database.",
    );
    const pool = new Pool({ connectionString: databaseUrl });
    assert.equal(
      (await pool.query('SELECT COUNT(*)::int AS count FROM "User"')).rows[0]
        .count,
      0,
      "Admin test database must start without user data; migrate it, do not seed first.",
    );
    const port = Number(process.env.TEST_ADMIN_PORT ?? 3003),
      base = `http://localhost:${port}`;
    const log = openSync("/tmp/lend-ya-admin-server.log", "w");
    let server: ChildProcess | undefined;
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const userIds: number[] = [],
      listingIds: number[] = [],
      stationIds: number[] = [],
      listingFiles: string[] = [];
    const tag = randomUUID(),
      password = `Test-${randomUUID()}`,
      adminEmail = `admin-${tag}@example.test`;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "development",
    };
    const script = (file: string, args: string[] = [], override = {}) =>
      run(process.execPath, ["node_modules/tsx/dist/cli.mjs", file, ...args], {
        env: { ...env, ...override },
      });
    type Payload = {
      user: { id: number; role: string };
      record: {
        id: number;
        status: string;
        name: string;
        _count: { listings: number };
      };
      items: Array<{
        id: number;
        name: string;
        role: string;
        status: string;
        category: string;
      }>;
      pagination: { total: number; pageSize: number };
      users: { total: number; admins: number; newLast30Days: number };
      listings: {
        total: number;
        active: number;
        inactive: number;
        withOpenReports: number;
      };
      bookings: {
        total: number;
        byStatus: Record<string, number>;
        activeRentals: number;
      };
      dashboard: {
        activeRentals: number;
        activeUsers: number;
        openCases: number;
        needsAttention: number;
        openReports: number;
        openDisputes: number;
        reportedListings: number;
        disputedBookings: number;
        activity: Array<{
          id: number;
          action: string;
          targetType: string;
          targetId: number;
          createdAt: string;
        }>;
      };
      listing: { id: number; media: Array<{ url: string }> };
    };
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object | FormData,
    ) => {
      const response = await fetch(`${base}${url}`, {
        method,
        headers: {
          Cookie: cookie,
          "X-Role": "ADMIN",
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(body
          ? { body: body instanceof FormData ? body : JSON.stringify(body) }
          : {}),
        redirect: "manual",
      });
      const text = await response.text();
      const json = (
        text &&
        response.headers.get("content-type")?.includes("application/json")
          ? JSON.parse(text)
          : {}
      ) as Payload;
      return {
        status: response.status,
        json,
        text,
        headers: response.headers,
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    };
    const register = async (name: string, email: string) => {
      const result = await api("/api/auth/register", "", "POST", {
        name,
        email,
        password,
        role: "ADMIN",
      });
      assert.equal(result.status, 201);
      assert.equal(
        result.json.user.role,
        "USER",
        "Public role spoofing must fail",
      );
      userIds.push(result.json.user.id);
      return { id: result.json.user.id, cookie: result.cookie, email };
    };
    let overviewExpected:
      | {
          users: number;
          admins: number;
          activeRentals: number;
          activeUsers: number;
        }
      | undefined;
    try {
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
      for (let i = 0; i < 40; i++) {
        if (server.exitCode !== null)
          throw new Error(
            "Admin test server failed; inspect /tmp/lend-ya-admin-server.log",
          );
        try {
          if ((await fetch(`${base}/api/listings`)).ok) break;
        } catch {
          /* readiness */
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const admin = await register("Admin test operator", adminEmail);
      const beforeHash = (
        await pool.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
          admin.id,
        ])
      ).rows[0].passwordHash;
      assert.equal(
        (await api("/api/admin/overview", admin.cookie)).status,
        403,
      );
      await script("scripts/create-admin.ts", [adminEmail]);
      assert.ok(
        beforeHash ===
          (
            await pool.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
              admin.id,
            ])
          ).rows[0].passwordHash,
        "Promotion does not replace a password",
      );
      await script("scripts/create-admin.ts", [adminEmail]);
      const adminLogin = await api("/api/auth/login", "", "POST", {
        email: adminEmail,
        password,
      });
      assert.equal(adminLogin.status, 200);
      assert.equal(adminLogin.json.user.role, "ADMIN");
      const adminCookie = adminLogin.cookie;
      await t.test(
        "empty marketplace stats are real zeros and admin sessions come from database roles",
        async () => {
          const result = await api("/api/admin/overview", adminCookie);
          assert.equal(result.status, 200);
          assert.equal(result.json.users.total, 1);
          assert.equal(result.json.users.admins, 1);
          assert.equal(result.json.users.newLast30Days, 1);
          assert.equal(result.json.listings.total, 0);
          assert.equal(result.json.bookings.total, 0);
          assert.equal(result.json.bookings.activeRentals, 0);
          assert.equal(result.json.dashboard.activeRentals, 0);
          assert.equal(result.json.dashboard.activeUsers, 1);
          assert.equal(result.json.dashboard.openCases, 0);
          assert.equal(result.json.dashboard.needsAttention, 0);
          assert.deepEqual(result.json.dashboard.activity, []);
          assert.ok(
            Object.values(result.json.bookings.byStatus).every(
              (count) => count === 0,
            ),
          );
          assert.equal(
            result.headers.get("cache-control"),
            "private, no-store",
          );
          assert.ok(
            result.headers
              .get("vary")
              ?.split(",")
              .some((value) => value.trim().toLowerCase() === "cookie"),
          );
          assert.equal(
            (await api("/api/admin/overview", admin.cookie)).status,
            200,
            "Previously issued session uses current DB role, not a client claim",
          );
        },
      );
      const viewer = await register(
        `Directory target ${tag}`,
        `viewer-${tag}@example.test`,
      );
      const borrower = await register(
        "Admin test borrower",
        `borrower-${tag}@example.test`,
      );
      await pool.query(
        'UPDATE "User" SET "createdAt"=NOW()-INTERVAL \'32 days\' WHERE id=$1',
        [viewer.id],
      );
      const alice = await register("Custom demo owner", "alice@example.test");
      await script("scripts/create-admin.ts", [alice.email]);
      const aliceHash = (
        await pool.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
          alice.id,
        ])
      ).rows[0].passwordHash;
      const oldStations = new Set(
        (await pool.query('SELECT id FROM "MrtStation"')).rows.map(
          (row) => row.id,
        ),
      );
      await script("prisma/seed.ts");
      const seededUsers = await pool.query(
        "SELECT id,email FROM \"User\" WHERE email IN ('bob@example.test','charlie@example.test')",
      );
      userIds.push(...seededUsers.rows.map((row) => row.id));
      stationIds.push(
        ...(await pool.query('SELECT id FROM "MrtStation"')).rows
          .map((row) => row.id)
          .filter((id) => !oldStations.has(id)),
      );
      listingIds.push(
        ...(await pool.query('SELECT id FROM "Listing"')).rows.map(
          (row) => row.id,
        ),
      );
      const station = (
        await pool.query("SELECT id FROM \"MrtStation\" WHERE code='TPE'")
      ).rows[0].id;
      const image = await sharp({
        create: { width: 10, height: 8, channels: 3, background: "purple" },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      for (const [key, value] of Object.entries({
        title: `Hidden admin fixture ${tag}`,
        description: "Private inactive listing test",
        category: "Electronics",
        condition: "Good",
        price: "9.99",
        deposit: "20",
        stationIds: JSON.stringify([station]),
      }))
        form.set(key, value);
      form.append(
        "photos",
        new File([image], "fixture.png", { type: "image/png" }),
      );
      const newListing = await api(
        "/api/listings",
        viewer.cookie,
        "POST",
        form,
      );
      assert.equal(newListing.status, 201);
      const inactiveId = newListing.json.listing.id;
      listingIds.push(inactiveId);
      newListing.json.listing.media.forEach((media) =>
        listingFiles.push(
          path.join(
            process.cwd(),
            "storage/listings",
            path.basename(media.url),
          ),
        ),
      );
      assert.equal(
        (
          await api(`/api/listings/${inactiveId}`, viewer.cookie, "PATCH", {
            status: "INACTIVE",
          })
        ).status,
        200,
      );
      // These are read-only monitoring fixtures, not evidence of successful lifecycle transitions.
      const statuses = [
        "PENDING",
        "CONFIRMED",
        "HANDOFF_PENDING",
        "IN_USE",
        "RETURN_PENDING",
        "INSPECTION",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ];
      const bookingIds: number[] = [];
      for (const status of statuses)
        bookingIds.push(
          (
            await pool.query(
              'INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice",deposit,"updatedAt") VALUES ($1,$2,$3,$4,\'2035-01-01\',\'2035-01-02\',$5::"BookingStatus",9.99,20,NOW()) RETURNING id',
              [inactiveId, viewer.id, borrower.id, station, status],
            )
          ).rows[0].id,
        );
      const photoId = randomUUID();
      await pool.query(
        'INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ($1,$2,$3,\'HANDOFF_OWNER\',\'image/png\',$4)',
        [photoId, bookingIds[0], viewer.id, image],
      );
      for (const [reporter, status] of [
        [admin.id, "OPEN"],
        [borrower.id, "OPEN"],
        [viewer.id, "REVIEWED"],
      ])
        await pool.query(
          'INSERT INTO "ListingReport" ("listingId","reporterId",reason,status) VALUES ($1,$2,\'Admin view fixture\',$3::"ListingReportStatus")',
          [listingIds[0], reporter, status],
        );
      await pool.query(
        `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description,status) VALUES ($1,$2,'Private reason sentinel','Private case sentinel','OPEN'),($1,$2,'Closed reason','Closed case','RESOLVED')`,
        [bookingIds[8], borrower.id],
      );
      await pool.query(
        `INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES ($1,'LISTING_RESTRICT','LISTING',$2,'Private audit sentinel','{"private":"snapshot sentinel"}','{}')`,
        [admin.id, listingIds[0]],
      );
      await pool.query(
        `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE email='charlie@example.test'`,
      );
      const endpoints = [
        "/api/admin/overview",
        "/api/admin/users",
        `/api/admin/users/${viewer.id}`,
        "/api/admin/listings",
        `/api/admin/listings/${inactiveId}`,
        "/api/admin/bookings",
        `/api/admin/bookings/${bookingIds[0]}`,
      ];
      await t.test(
        "all seven APIs independently deny anonymous, USER, expired and forged sessions",
        async () => {
          const expired = await api("/api/auth/login", "", "POST", {
            email: adminEmail,
            password,
          });
          const tokenHash = createHash("sha256")
            .update(expired.cookie.slice(expired.cookie.indexOf("=") + 1))
            .digest("hex");
          await pool.query(
            'UPDATE "AuthSession" SET "expiresAt"=NOW()-INTERVAL \'1 minute\' WHERE "tokenHash"=$1',
            [tokenHash],
          );
          for (const endpoint of endpoints) {
            assert.equal((await api(endpoint)).status, 401);
            assert.equal((await api(endpoint, viewer.cookie)).status, 403);
            assert.equal(
              (await api(endpoint, "p2p_session=forged-ADMIN")).status,
              401,
            );
            assert.equal((await api(endpoint, expired.cookie)).status, 401);
            const valid = await api(endpoint, adminCookie);
            assert.equal(valid.status, 200);
            assert.equal(
              valid.headers.get("cache-control"),
              "private, no-store",
            );
            const inspect = (value: unknown) => {
              if (value && typeof value === "object")
                for (const [key, child] of Object.entries(value)) {
                  assert.ok(
                    ![
                      "passwordHash",
                      "tokenHash",
                      "authSessions",
                      "evidencePhotos",
                      "photos",
                      "data",
                      "conditionNotes",
                      "borrowerConditionNotes",
                      "inspectionNotes",
                      "checklist",
                    ].includes(key),
                    `Unexpected sensitive field: ${key}`,
                  );
                  inspect(child);
                }
            };
            inspect(valid.json);
          }
          assert.equal(
            (
              await api("/api/account", viewer.cookie, "PATCH", {
                name: `Directory target ${tag}`,
                role: "ADMIN",
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await pool.query('SELECT role FROM "User" WHERE id=$1', [
                viewer.id,
              ])
            ).rows[0].role,
            "USER",
          );
          assert.equal(
            (await api("/api/admin/users?role=ADMIN", viewer.cookie)).status,
            403,
          );
          assert.equal(
            (await api(`/api/bookings/${bookingIds[0]}`, adminCookie)).status,
            403,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${bookingIds[0]}/evidence/${photoId}`,
                adminCookie,
              )
            ).status,
            403,
            "Admin foundation does not grant private evidence viewing",
          );
          const logout = await api("/api/auth/login", "", "POST", {
            email: adminEmail,
            password,
          });
          assert.equal(
            (await api("/api/auth/logout", logout.cookie, "POST")).status,
            200,
          );
          assert.equal(
            (await api("/api/admin/overview", logout.cookie)).status,
            401,
          );
        },
      );
      await t.test(
        "statistics match PostgreSQL aggregates, every rental status, and distinct reported listings",
        async () => {
          const stats = (await api("/api/admin/overview", adminCookie)).json;
          const users = (
            await pool.query(
              "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE role='ADMIN')::int AS admins, COUNT(*) FILTER (WHERE \"createdAt\">=NOW()-INTERVAL '30 days')::int AS new FROM \"User\"",
            )
          ).rows[0];
          assert.equal(stats.users.total, users.total);
          assert.equal(stats.users.admins, users.admins);
          assert.equal(stats.users.newLast30Days, users.new);
          assert.equal(stats.listings.total, 4);
          assert.equal(stats.listings.active, 3);
          assert.equal(stats.listings.inactive, 1);
          assert.equal(stats.listings.withOpenReports, 1);
          const groups = (
            await pool.query(
              'SELECT status,COUNT(*)::int AS count FROM "Booking" GROUP BY status',
            )
          ).rows;
          assert.equal(
            stats.bookings.total,
            groups.reduce((total, row) => total + row.count, 0),
          );
          for (const row of groups)
            assert.equal(stats.bookings.byStatus[row.status], row.count);
          assert.equal(stats.bookings.activeRentals, 4);
          const activeUsers = (
            await pool.query(
              `SELECT COUNT(*)::int AS count FROM "User" WHERE "accountStatus"='ACTIVE'`,
            )
          ).rows[0].count;
          assert.equal(
            stats.dashboard.activeRentals,
            1,
            "Only IN_USE; exclude pending handoff, return, inspection and disputes",
          );
          assert.equal(stats.dashboard.activeUsers, activeUsers);
          assert.equal(
            activeUsers,
            users.total - 1,
            "Suspended account excluded; registration age does not define activity",
          );
          assert.equal(
            stats.dashboard.openCases,
            3,
            "Two open reports and one open dispute; closed cases excluded",
          );
          assert.equal(
            stats.dashboard.needsAttention,
            2,
            "Repeated reports count as one affected listing, plus one booking",
          );
          assert.equal(stats.dashboard.openReports, 2);
          assert.equal(stats.dashboard.openDisputes, 1);
          assert.equal(stats.dashboard.reportedListings, 1);
          assert.equal(stats.dashboard.disputedBookings, 1);
          assert.deepEqual(
            Object.keys(stats.dashboard.activity[0]).sort(),
            ["id", "action", "targetType", "targetId", "createdAt"].sort(),
          );
          assert.ok(
            !JSON.stringify(stats.dashboard).includes("sentinel"),
            "No private case or audit snapshot contents in dashboard",
          );
          overviewExpected = {
            users: users.total,
            admins: users.admins,
            activeRentals: 1,
            activeUsers,
          };
        },
      );
      await t.test(
        "search, filtering, deterministic pagination, details and safe input validation",
        async () => {
          const search = await api(
            `/api/admin/users?q=${encodeURIComponent(tag)}&role=USER`,
            adminCookie,
          );
          assert.equal(search.json.items.length, 2);
          assert.ok(search.json.items.every((user) => user.role === "USER"));
          const first = await api(
              `/api/admin/users?q=${tag}&pageSize=1&page=1`,
              adminCookie,
            ),
            second = await api(
              `/api/admin/users?q=${tag}&pageSize=1&page=2`,
              adminCookie,
            );
          assert.equal(first.json.items.length, 1);
          assert.equal(first.json.pagination.total, 3);
          assert.notEqual(first.json.items[0].id, second.json.items[0].id);
          assert.deepEqual(
            (
              await api(
                `/api/admin/users?q=${tag}&pageSize=1&page=1`,
                adminCookie,
              )
            ).json.items,
            first.json.items,
          );
          assert.equal(
            (await api(`/api/admin/users/${viewer.id}`, adminCookie)).json
              .record._count.listings,
            1,
          );
          assert.equal(
            (
              await api(
                `/api/admin/listings?status=INACTIVE&category=Electronics&ownerId=${viewer.id}`,
                adminCookie,
              )
            ).json.items[0].id,
            inactiveId,
          );
          assert.equal(
            (
              await api(
                `/api/admin/listings?q=${encodeURIComponent("Hidden admin fixture")}`,
                adminCookie,
              )
            ).json.items[0].id,
            inactiveId,
          );
          assert.equal(
            (
              await api(
                `/api/admin/bookings?status=IN_USE&q=${bookingIds[3]}`,
                adminCookie,
              )
            ).json.items[0].id,
            bookingIds[3],
          );
          assert.equal(
            (
              await api(
                `/api/admin/bookings?ownerId=${viewer.id}&renterId=${borrower.id}&pageSize=2`,
                adminCookie,
              )
            ).json.pagination.total,
            9,
          );
          for (const endpoint of [
            "/api/admin/users?page=0",
            "/api/admin/users?pageSize=101",
            "/api/admin/users?role=ROOT",
            "/api/admin/users?q=x&q=y",
            "/api/admin/users?unknown=1",
            "/api/admin/listings?status=COMPLETED",
            "/api/admin/listings?ownerId=1.5",
            "/api/admin/bookings?status=INVALID",
            "/api/admin/users/2147483648",
            "/api/admin/bookings/abc",
          ])
            assert.equal((await api(endpoint, adminCookie)).status, 400);
          for (const kind of ["users", "listings", "bookings"])
            assert.equal(
              (await api(`/api/admin/${kind}/2147483647`, adminCookie)).status,
              404,
            );
        },
      );
      await t.test(
        "reads never mutate rentals, inactive public privacy holds, and seeds preserve admins/passwords/data",
        async () => {
          const before = (
            await pool.query(
              'SELECT id,status,"updatedAt","totalPrice",deposit FROM "Booking" ORDER BY id',
            )
          ).rows;
          for (const endpoint of endpoints) {
            await api(endpoint, adminCookie);
            assert.equal(
              (
                await api(endpoint, adminCookie, "POST", {
                  status: "COMPLETED",
                })
              ).status,
              405,
            );
            assert.equal(
              (await api(endpoint, adminCookie, "PATCH", { role: "ADMIN" }))
                .status,
              405,
            );
            assert.equal(
              (await api(endpoint, adminCookie, "DELETE")).status,
              405,
            );
          }
          assert.deepEqual(
            (
              await pool.query(
                'SELECT id,status,"updatedAt","totalPrice",deposit FROM "Booking" ORDER BY id',
              )
            ).rows,
            before,
          );
          assert.equal((await api(`/api/listings/${inactiveId}`)).status, 404);
          assert.equal(
            (await api(`/api/listings/${inactiveId}`, borrower.cookie)).status,
            404,
          );
          assert.equal(
            (await api(`/api/listings/${inactiveId}`, viewer.cookie)).status,
            200,
          );
          const publicListings = (await api("/api/listings")).text;
          assert.ok(!publicListings.includes(`Hidden admin fixture ${tag}`));
          await script("prisma/seed.ts");
          const retained = (
            await pool.query(
              'SELECT role,name,"passwordHash" FROM "User" WHERE id=$1',
              [alice.id],
            )
          ).rows[0];
          assert.equal(retained.role, "ADMIN");
          assert.equal(retained.name, "Custom demo owner");
          assert.ok(
            retained.passwordHash === aliceHash,
            "Seed preserves an existing admin password",
          );
          assert.deepEqual(
            (
              await pool.query(
                'SELECT id,status,"updatedAt","totalPrice",deposit FROM "Booking" ORDER BY id',
              )
            ).rows,
            before,
          );
          await assert.rejects(
            script("scripts/create-admin.ts", [viewer.email], {
              NODE_ENV: "production",
            }),
          );
          await assert.rejects(
            script("scripts/create-admin.ts", [viewer.email], {
              DATABASE_URL: "postgresql://localhost.invalid/lend_ya_admin_test",
            }),
          );
          assert.equal(
            (
              await pool.query('SELECT role FROM "User" WHERE id=$1', [
                viewer.id,
              ])
            ).rows[0].role,
            "USER",
          );
        },
      );
      await t.test(
        "real admin login, all navigation/details, search, pagination, mobile and logout",
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
          page.setDefaultTimeout(12000);
          await page.goto(`${base}/login`);
          await page.getByLabel("Email address").fill(adminEmail);
          await page.getByLabel("Password", { exact: true }).fill(password);
          await page
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          await page.waitForURL("**/admin");
          await expect(page.locator('[data-stat="Active users"]')).toHaveText(
            String(overviewExpected?.activeUsers),
          );
          await expect(page.locator('[data-stat="Active rentals"]')).toHaveText(
            String(overviewExpected?.activeRentals),
          );
          await expect(page.locator('[data-stat="Open cases"]')).toHaveText(
            "3",
          );
          await expect(
            page.locator('[data-stat="Needs attention"]'),
          ).toHaveText("2");
          await expect(
            page.getByRole("heading", { name: "Requires Attention" }),
          ).toBeVisible();
          assert.ok(
            !(await page.locator("main").innerText()).includes("sentinel"),
          );
          const screenshotDir = path.join(
            process.env.MRT_TEST_ARTIFACT_DIR!,
            "screenshots",
          );
          await mkdir(screenshotDir, { recursive: true });
          const screenshot = async (name: string) =>
            page.screenshot({
              path: path.join(screenshotDir, `${name}.png`),
              fullPage: true,
              style: "nextjs-portal { display: none !important; }",
            });
          for (const viewport of [
            { width: 1440, height: 1000 },
            { width: 820, height: 1180 },
            { width: 390, height: 844 },
          ]) {
            await page.setViewportSize(viewport);
            if (viewport.width < 1024) {
              await page.locator("summary").focus();
              await page.keyboard.press("Enter");
              await expect(page.locator("details")).toHaveAttribute("open", "");
            }
            const navigation = page
              .getByRole("navigation", { name: "Administration", exact: true })
              .filter({ visible: true });
            for (const group of [
              "General",
              "Operations",
              "Community",
              "System",
            ])
              await expect(
                navigation.getByText(group, { exact: true }),
              ).toBeVisible();
            assert.deepEqual(
              await navigation
                .getByRole("link")
                .evaluateAll((links) =>
                  links.map((link) => link.getAttribute("href")),
                ),
              [
                "/admin",
                "/admin/bookings",
                "/admin/disputes",
                "/admin/listings",
                "/admin/reports",
                "/admin/users",
                "/admin/chat",
                "/admin/audit-logs",
              ],
            );
            await expect(
              navigation.locator('[aria-current="page"]'),
            ).toHaveText("Overview");
            await navigation
              .getByRole("link", { name: "Overview", exact: true })
              .focus();
            await expect(
              navigation.getByRole("link", { name: "Overview", exact: true }),
            ).toBeFocused();
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              ),
              `Overview overflow at ${viewport.width}`,
            );
            await screenshot(`admin-${viewport.width}-navigation`);
            if (viewport.width < 1024)
              await page.locator("details").evaluate((element) => {
                (element as HTMLDetailsElement).open = false;
              });
            await screenshot(`admin-${viewport.width}`);
          }
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.screenshot({
            path: "/tmp/lend-ya-admin-overview.png",
            fullPage: true,
            style: "nextjs-portal { display: none !important; }",
          });
          await page
            .getByRole("navigation", { name: "Administration", exact: true })
            .getByRole("link", { name: "Users", exact: true })
            .click();
          await expect(
            page.getByRole("heading", { name: "Users", exact: true }),
          ).toBeVisible();
          await page
            .getByRole("textbox", { name: "Search", exact: true })
            .fill(`Directory target ${tag}`);
          await page.getByRole("button", { name: "Apply filters" }).click();
          await expect(
            page.getByText(`Directory target ${tag}`, { exact: true }),
          ).toBeVisible();
          await page
            .getByRole("link", { name: `#${viewer.id}`, exact: true })
            .click();
          await expect(
            page.getByRole("heading", {
              name: `User #${viewer.id} · Directory target ${tag}`,
            }),
          ).toBeVisible();
          await page.goto(`${base}/admin/users?pageSize=1`);
          await page
            .getByRole("navigation", { name: "Pagination" })
            .getByRole("link", { name: "Next", exact: true })
            .click();
          await page.waitForURL(/page=2/);
          await page.screenshot({
            path: "/tmp/lend-ya-admin-users.png",
            fullPage: true,
            style: "nextjs-portal { display: none !important; }",
          });
          await page
            .getByRole("navigation", { name: "Administration", exact: true })
            .getByRole("link", { name: "Listings", exact: true })
            .click();
          await page
            .getByRole("combobox", { name: "Status", exact: true })
            .selectOption("INACTIVE");
          await page.getByRole("button", { name: "Apply filters" }).click();
          await expect(
            page
              .getByText(`Hidden admin fixture ${tag}`, { exact: false })
              .first(),
          ).toBeVisible();
          await page
            .getByRole("link", {
              name: `#${inactiveId} · Hidden admin fixture ${tag}`,
              exact: true,
            })
            .click();
          await expect(
            page.getByRole("heading", {
              name: `Listing #${inactiveId} · Hidden admin fixture ${tag}`,
            }),
          ).toBeVisible();
          await page
            .getByRole("navigation", { name: "Administration", exact: true })
            .getByRole("link", { name: "Bookings", exact: true })
            .click();
          await page
            .getByRole("combobox", { name: "Status", exact: true })
            .selectOption("IN_USE");
          await page.getByRole("button", { name: "Apply filters" }).click();
          await page
            .getByRole("link", { name: `#${bookingIds[3]}`, exact: true })
            .click();
          await expect(
            page.getByRole("heading", {
              name: `Booking #${bookingIds[3]} · Hidden admin fixture ${tag}`,
            }),
          ).toBeVisible();
          assert.equal(
            (
              await api(`/api/listings/${inactiveId}`, viewer.cookie, "PATCH", {
                title: "L".repeat(200),
              })
            ).status,
            200,
          );
          for (const viewport of [
            { width: 820, height: 1180 },
            { width: 390, height: 844 },
          ]) {
            await page.setViewportSize(viewport);
            for (const target of [
              "/admin",
              "/admin/users",
              `/admin/users/${viewer.id}`,
              "/admin/listings",
              `/admin/listings/${inactiveId}`,
              "/admin/bookings",
              `/admin/bookings/${bookingIds[3]}`,
              "/admin/reports",
              "/admin/disputes",
              "/admin/chat",
              "/admin/audit-logs",
            ]) {
              await page.goto(`${base}${target}`);
              assert.ok(
                await page.evaluate(
                  () =>
                    document.documentElement.scrollWidth <= window.innerWidth,
                ),
                `Overflow at ${viewport.width}: ${target}`,
              );
            }
          }
          await page.getByText("Admin navigation", { exact: true }).click();
          await page
            .getByRole("navigation", { name: "Administration", exact: true })
            .getByRole("link", { name: "Overview", exact: true })
            .click();
          await page.screenshot({
            path: "/tmp/lend-ya-admin-mobile.png",
            fullPage: true,
            style: "nextjs-portal { display: none !important; }",
          });
          const normalContext = await browser.newContext(),
            normal = await normalContext.newPage();
          await normal.goto(`${base}/login`);
          await normal.getByLabel("Email address").fill(viewer.email);
          await normal.getByLabel("Password", { exact: true }).fill(password);
          await normal
            .getByRole("button", { name: "Log in", exact: true })
            .click();
          await normal.waitForURL("**/dashboard");
          for (const target of [
            "/admin",
            "/admin/users",
            `/admin/users/${viewer.id}`,
            "/admin/listings",
            `/admin/listings/${inactiveId}`,
            "/admin/bookings",
            `/admin/bookings/${bookingIds[0]}`,
          ]) {
            const response = await normal.goto(`${base}${target}`);
            assert.equal(response?.status(), 404);
            assert.ok(
              !(await normal.content()).includes("Read-only administration"),
            );
          }
          const anonymous = await browser.newContext();
          assert.equal(
            (
              await anonymous.request.get(`${base}/admin`, { maxRedirects: 0 })
            ).status(),
            307,
          );
          await page.getByRole("button", { name: "Sign out" }).click();
          await page.waitForURL("**/login");
          assert.equal(
            (await context.request.get(`${base}/api/admin/overview`)).status(),
            401,
          );
        },
      );
    } finally {
      if (browser) await browser.close();
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        await exited;
      }
      closeSync(log);
      if (listingIds.length) {
        await pool.query(
          'DELETE FROM "Dispute" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=ANY($1::int[]))',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "ListingReport" WHERE "listingId"=ANY($1::int[])',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "VerifiedReview" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=ANY($1::int[]))',
          [listingIds],
        );
        await pool.query(
          'DELETE FROM "Booking" WHERE "listingId"=ANY($1::int[])',
          [listingIds],
        );
        await pool.query('DELETE FROM "Listing" WHERE id=ANY($1::int[])', [
          listingIds,
        ]);
      }
      await Promise.all(listingFiles.map((file) => unlink(file)));
      // Preserve immutable audit fixtures and their actor until the owned database
      // is dropped by run-isolated.ts. Never bypass evidence triggers for cleanup.
      if (userIds.length)
        await pool.query(
          'DELETE FROM "User" WHERE id=ANY($1::int[]) AND NOT EXISTS (SELECT 1 FROM "AdminAuditLog" WHERE "adminId"="User".id)',
          [userIds],
        );
      if (stationIds.length)
        await pool.query('DELETE FROM "MrtStation" WHERE id=ANY($1::int[])', [
          stationIds,
        ]);
      await pool.end();
    }
  },
);
