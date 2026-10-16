import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { openSync, closeSync } from "node:fs";
import { writeFile, unlink, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import sharp from "sharp";
import { chromium, expect } from "@playwright/test";
import { checklistItems } from "../lib/rental-checklist";
import { boundedListingForm } from "../lib/listing-media";
const run = promisify(execFile);
type User = { id: number; cookie: string; email: string };
type Payload = {
  error: string;
  user: { id: number; role: string; name: string };
  listing: {
    id: number;
    category: string;
    categoryDetails: Record<string, string>;
    media: { url: string }[];
    supportedStations: { station: { id: number } }[];
  };
  listings: { id: number }[];
  booking: {
    id: number;
    totalPrice: string;
    deposit: string;
    meetingStation: { id: number };
    status: string;
  };
  report: { id: number };
};
test(
  "Milestone 5: authentication, listing editing/upload privacy, CSRF, profiles and responsive marketplace",
  { timeout: 240000 },
  async (t) => {
    const ownedDatabase = await connectTestDatabase();
    await ownedDatabase.end();
    const db = process.env.TEST_DATABASE_URL;
    assert.ok(
      db && new URL(db).pathname.startsWith("/hustlen_test_"),
      "Use a separate disposable _mvp_test database.",
    );
    const pool = new Pool({ connectionString: db });
    const env = {
        ...process.env,
        DATABASE_URL: db,
        NODE_ENV: "development" as const,
      },
      port = Number(process.env.TEST_MVP_PORT ?? 3006),
      base = `http://localhost:${port}`,
      tag = randomUUID(),
      password = `Test-${randomUUID()}`,
      files: string[] = [];
    const log = openSync(
      process.env.TEST_MVP_LOG ?? "/tmp/lend-ya-m5-server.log",
      "w",
    );
    let ownsFixtures = false;
    let server: ChildProcess | undefined,
      browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const stop = async () => {
      if (server && server.exitCode === null && server.signalCode === null) {
        const end = once(server, "exit");
        server.kill("SIGTERM");
        await end;
      }
    };
    const start = async (production = false) => {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          production ? "start" : "dev",
          "--hostname",
          "localhost",
          "--port",
          String(port),
        ],
        {
          env: { ...env, NODE_ENV: production ? "production" : "development" },
          stdio: ["ignore", log, log],
        },
      );
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (server.exitCode !== null)
          throw new Error("MVP server stopped; see server log");
        try {
          if ((await fetch(base + "/api/listings")).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(ready);
    };
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object | FormData,
      headers: Record<string, string> = {},
    ) => {
      const response = await fetch(base + url, {
          method,
          headers: {
            Cookie: cookie,
            ...(body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
            ...headers,
          },
          ...(body
            ? { body: body instanceof FormData ? body : JSON.stringify(body) }
            : {}),
          redirect: "manual",
        }),
        text = await response.text();
      return {
        status: response.status,
        text,
        json: (response.headers
          .get("content-type")
          ?.includes("application/json")
          ? JSON.parse(text)
          : {}) as Payload,
        headers: response.headers,
        cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
      };
    };
    const account = async (name: string) => {
      const email = `m5-${name}-${tag}@example.test`,
        r = await api("/api/auth/register", "", "POST", {
          name,
          email,
          password,
          role: "ADMIN",
          identityVerified: true,
        });
      assert.equal(r.status, 201, r.text);
      assert.equal(r.json.user.role, "USER");
      return { id: r.json.user.id, cookie: r.cookie, email };
    };
    const image = new Uint8Array(
      await sharp({
        create: { width: 20, height: 14, channels: 3, background: "green" },
      })
        .withMetadata()
        .png()
        .toBuffer(),
    );
    let stations: number[],
      owner: User,
      borrower: User,
      outsider: User,
      admin: User,
      listingId: number;
    let completedBookingId: number;
    const form = (
      photos = [new File([image], "item.png", { type: "image/png" })],
      video?: File,
    ) => {
      const f = new FormData();
      for (const [k, v] of Object.entries({
        title: `MVP item ${tag}`,
        description: "University demonstration item",
        category: "Electronics",
        condition: "Good",
        price: "12.34",
        deposit: "25.67",
        stationIds: JSON.stringify([stations[0]]),
      }))
        f.set(k, v);
      for (const photo of photos) f.append("photos", photo);
      if (video) f.set("video", video);
      return f;
    };
    const createListing = async (f = form()) => {
      const r = await api("/api/listings", owner.cookie, "POST", f);
      if (r.status === 201)
        r.json.listing.media.forEach((m) =>
          files.push(
            path.join(process.cwd(), "storage/listings", path.basename(m.url)),
          ),
        );
      return r;
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
      assert.equal(
        (await pool.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n,
        0,
        "Dedicated MVP fixture database must start empty",
      );
      ownsFixtures = true;
      await start();
      owner = await account("owner");
      borrower = await account("borrower");
      outsider = await account("outsider");
      admin = await account("admin");
      await run(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "scripts/create-admin.ts",
          admin.email,
        ],
        { env },
      );
      stations = [];
      for (const n of [1, 2])
        stations.push(
          (
            await pool.query('SELECT id FROM "MrtStation" WHERE code=$1', [
              n === 1 ? "TPE" : "XIM",
            ])
          ).rows[0].id,
        );
      await t.test(
        "test runner refuses pre-existing data without clearing records",
        async () => {
          const before = (
            await pool.query(
              'SELECT id,name,role,"passwordHash" FROM "User" ORDER BY id',
            )
          ).rows;
          await assert.rejects(
            run(
              process.execPath,
              [
                "node_modules/tsx/dist/cli.mjs",
                "--test",
                "tests/mvp-security.test.ts",
              ],
              {
                env: {
                  ...env,
                  TEST_DATABASE_URL: db,
                  NODE_TEST_CONTEXT: undefined,
                  TEST_MVP_LOG: "/tmp/lend-ya-m5-refusal.log",
                },
              },
            ),
          );
          assert.deepEqual(
            (
              await pool.query(
                'SELECT id,name,role,"passwordHash" FROM "User" ORDER BY id',
              )
            ).rows,
            before,
          );
        },
      );
      await t.test(
        "registration, profile authorization, salted passwords, cookie/session hashing, expiry and isolated logout",
        async () => {
          assert.equal(
            (
              await api("/api/auth/register", "", "POST", {
                name: "Duplicate",
                email: owner.email.toUpperCase(),
                password,
              })
            ).status,
            409,
          );
          for (const body of [
            { name: "", email: "wrong", password: "short" },
            { name: "Test", email: "bad", password },
            { name: "Test", email: "valid@example.test", password: "short" },
          ])
            assert.equal(
              (await api("/api/auth/register", "", "POST", body)).status,
              400,
            );
          const users = (
            await pool.query(
              'SELECT id,role,"passwordHash","identityVerified" FROM "User" WHERE id=ANY($1::int[])',
              [[owner.id, borrower.id]],
            )
          ).rows;
          assert.ok(
            users.every(
              (u) =>
                u.role === "USER" &&
                !u.identityVerified &&
                /^scrypt\$/.test(u.passwordHash) &&
                !u.passwordHash.includes(password),
            ),
          );
          assert.notEqual(users[0].passwordHash, users[1].passwordHash);
          const login = await api("/api/auth/login", "", "POST", {
            email: owner.email,
            password,
          });
          assert.equal(login.status, 200);
          const cookie = login.headers.get("set-cookie")!;
          assert.match(cookie, /HttpOnly/i);
          assert.match(cookie, /SameSite=Lax/i);
          assert.equal(login.headers.get("cache-control"), "private, no-store");
          const token = login.cookie.split("=")[1],
            hash = createHash("sha256").update(token).digest("hex"),
            rows = (
              await pool.query(
                'SELECT "tokenHash" FROM "AuthSession" WHERE "userId"=$1',
                [owner.id],
              )
            ).rows;
          assert.ok(rows.some((r) => r.tokenHash === hash));
          assert.ok(rows.every((r) => r.tokenHash !== token));
          assert.equal(
            (
              await api("/api/auth/login", "", "POST", {
                email: owner.email,
                password: "Wrong password",
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await api("/api/account", owner.cookie, "PATCH", {
                name: "Owner updated",
                userId: borrower.id,
                role: "ADMIN",
                identityVerified: true,
                trustScore: 100,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await pool.query('SELECT name FROM "User" WHERE id=$1', [
                borrower.id,
              ])
            ).rows[0].name,
            "borrower",
          );
          assert.equal(
            (
              await pool.query(
                'SELECT role,"identityVerified","trustScore" FROM "User" WHERE id=$1',
                [owner.id],
              )
            ).rows[0].role,
            "USER",
          );
          assert.equal(
            (await api("/api/auth/logout", login.cookie, "POST")).status,
            200,
          );
          assert.equal((await api("/api/auth/me", login.cookie)).status, 401);
          assert.equal(
            (await api("/api/auth/me", owner.cookie)).status,
            200,
            "Other session retained",
          );
          const expiry = await api("/api/auth/login", "", "POST", {
            email: owner.email,
            password,
          });
          const expiryHash = createHash("sha256")
            .update(expiry.cookie.split("=")[1])
            .digest("hex");
          await pool.query(
            'UPDATE "AuthSession" SET "expiresAt"=NOW()-INTERVAL \'1 second\' WHERE "tokenHash"=$1',
            [expiryHash],
          );
          assert.equal((await api("/api/auth/me", expiry.cookie)).status, 401);
        },
      );
      await t.test(
        "authentication counters reject concurrent brute-force attempts and survive persisted state",
        async () => {
          const email = `unknown-${tag}@example.test`;
          const r = await Promise.all(
            Array.from({ length: 11 }, () =>
              api("/api/auth/login", "", "POST", { email, password: "wrong" }),
            ),
          );
          assert.equal(r.filter((x) => x.status === 401).length, 10);
          assert.equal(r.filter((x) => x.status === 429).length, 1);
          assert.equal(
            r.find((x) => x.status === 429)!.headers.get("retry-after"),
            "900",
          );
          assert.equal(
            (
              await api(
                "/api/auth/login",
                "",
                "POST",
                { email, password: "wrong" },
                { "X-Forwarded-For": "203.0.113.1" },
              )
            ).status,
            429,
          );
          const repeated = `repeat-${tag}@example.test`;
          for (let n = 0; n < 5; n++)
            assert.equal(
              (
                await api("/api/auth/register", "", "POST", {
                  name: "Repeated",
                  email: repeated,
                  password,
                })
              ).status,
              n ? 409 : 201,
            );
          assert.equal(
            (
              await api("/api/auth/register", "", "POST", {
                name: "Repeated",
                email: repeated,
                password,
              })
            ).status,
            429,
          );
        },
      );
      await t.test(
        "actual image decoding, size/dimension/type rejection, bounded bodies and valid video containers",
        async () => {
          const forged = new File(
            [new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0, 0, 0, 0, 0])],
            "fake.png",
            { type: "image/png" },
          );
          assert.equal((await createListing(form([forged]))).status, 400);
          assert.equal(
            (
              await createListing(
                form([
                  new File(["<svg>bad</svg>"], "bad.svg", {
                    type: "image/svg+xml",
                  }),
                ]),
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await createListing(
                form([
                  new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.png", {
                    type: "image/png",
                  }),
                ]),
              )
            ).status,
            400,
          );
          const big = new Uint8Array(
            await sharp({
              create: {
                width: 4100,
                height: 1,
                channels: 3,
                background: "blue",
              },
            })
              .png()
              .toBuffer(),
          );
          assert.equal(
            (
              await createListing(
                form([new File([big], "wide.png", { type: "image/png" })]),
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await createListing(
                form(
                  Array.from(
                    { length: 9 },
                    () => new File([image], "item.png", { type: "image/png" }),
                  ),
                ),
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await createListing(
                form(
                  undefined,
                  new File(
                    [
                      new Uint8Array([
                        0, 0, 0, 0, 102, 116, 121, 112, 0, 0, 0, 0,
                      ]),
                    ],
                    "fake.mp4",
                    { type: "video/mp4" },
                  ),
                ),
              )
            ).status,
            400,
          );
          let chunks = 0;
          const stream = new ReadableStream<Uint8Array>({
            pull(c) {
              chunks++;
              c.enqueue(new Uint8Array(1024 * 1024));
            },
          });
          await assert.rejects(
            boundedListingForm(
              new Request(base + "/api/listings", {
                method: "POST",
                body: stream,
                duplex: "half",
                headers: {
                  "Content-Type": "multipart/form-data; boundary=test",
                },
              } as RequestInit),
            ),
            /exceeds/,
          );
          assert.ok(chunks <= 63);
          const videoPath = `/tmp/lend-ya-m5-${tag}.mp4`;
          await run("ffmpeg", [
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=32x32:d=0.2",
            "-c:v",
            "libx264",
            "-movflags",
            "+faststart",
            "-y",
            videoPath,
          ]);
          try {
            const r = await createListing(
              form(
                undefined,
                new File(
                  [new Uint8Array(await readFile(videoPath))],
                  "valid.mp4",
                  { type: "video/mp4" },
                ),
              ),
            );
            assert.equal(r.status, 201, r.text);
          } finally {
            await unlink(videoPath);
          }
          const r = await createListing();
          assert.equal(r.status, 201, r.text);
          listingId = r.json.listing.id;
          const response = await fetch(base + r.json.listing.media[0].url);
          const meta = await sharp(
            Buffer.from(await response.arrayBuffer()),
          ).metadata();
          assert.equal(meta.width, 20);
          assert.equal(meta.exif, undefined, "Listing image metadata stripped");
        },
      );
      await t.test(
        "category/station/price editing persists while booking snapshots remain immutable and ownership is enforced",
        async () => {
          const b = await api("/api/bookings", borrower.cookie, "POST", {
            listingId,
            meetingStationId: stations[0],
            startAt: "2035-01-01T10:00",
            endAt: "2035-01-02T10:01",
          });
          assert.equal(b.status, 201);
          assert.equal(
            (
              await api(
                `/api/listings/${listingId}`,
                outsider.cookie,
                "PATCH",
                { title: "Hijack" },
              )
            ).status,
            403,
          );
          assert.equal(
            (await api(`/api/listings/${listingId}`, outsider.cookie, "DELETE"))
              .status,
            403,
          );
          for (const body of [
            { category: "Services" },
            { stationIds: [] },
            { stationIds: [stations[0], "bad"] },
            { stationIds: [2147483647] },
            { categoryDetails: { unrecognized: "value" } },
          ])
            assert.equal(
              (
                await api(
                  `/api/listings/${listingId}`,
                  owner.cookie,
                  "PATCH",
                  body,
                )
              ).status,
              400,
            );
          const changed = await api(
            `/api/listings/${listingId}`,
            owner.cookie,
            "PATCH",
            {
              category: "Cameras",
              categoryDetails: {
                brandModel: "Verified camera",
                includedAccessories: "Bag",
              },
              stationIds: [stations[1]],
              price: 45.67,
              deposit: 99.99,
            },
          );
          assert.equal(changed.status, 200, changed.text);
          assert.equal(changed.json.listing.category, "Cameras");
          assert.deepEqual(
            changed.json.listing.supportedStations.map((s) => s.station.id),
            [stations[1]],
          );
          const old = await api(
            `/api/bookings/${b.json.booking.id}`,
            borrower.cookie,
          );
          assert.equal(old.json.booking.totalPrice, "24.68");
          assert.equal(old.json.booking.deposit, "25.67");
          assert.equal(old.json.booking.meetingStation.id, stations[0]);
          assert.equal(
            (await api(`/api/listings/${listingId}`, owner.cookie, "DELETE"))
              .status,
            409,
          );
          const publicResponse = await api(`/api/listings/${listingId}`);
          assert.equal(publicResponse.status, 200);
          assert.ok(!publicResponse.text.includes(owner.email));
          assert.ok(
            !publicResponse.text.match(/passwordHash|tokenHash|accountStatus/),
          );
        },
      );
      await t.test(
        "listing media honors current visibility, administrative investigation, legacy rewrites and deleted/orphan records",
        async () => {
          const r = await createListing();
          assert.equal(r.status, 201);
          const id = r.json.listing.id,
            url = r.json.listing.media[0].url,
            filename = path.basename(url);
          assert.equal((await api(url)).status, 200);
          assert.equal(
            (await api(`/uploads/listings/${filename}`)).status,
            200,
          );
          assert.equal(
            (
              await api(`/api/listings/${id}`, owner.cookie, "PATCH", {
                status: "INACTIVE",
              })
            ).status,
            200,
          );
          assert.equal((await api(url)).status, 404);
          assert.equal((await api(url, outsider.cookie)).status, 404);
          assert.equal((await api(url, owner.cookie)).status, 200);
          assert.equal((await api(url, admin.cookie)).status, 200);
          assert.equal(
            (await api(`/uploads/listings/${filename}`)).status,
            404,
          );
          const optimized = await fetch(
            `${base}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`,
          );
          assert.ok(
            optimized.status >= 400,
            "Optimizer cannot cache a private listing image",
          );
          assert.equal(
            (await api(`/api/listings/${id}`, owner.cookie, "DELETE")).status,
            200,
          );
          assert.equal((await api(url, owner.cookie)).status, 404);
          assert.equal(
            (await api(`/uploads/listings/${filename}`, owner.cookie)).status,
            404,
          );
          const orphan = randomUUID() + ".png",
            orphanPath = path.join(
              process.cwd(),
              "public/uploads/listings",
              orphan,
            );
          await mkdir(path.dirname(orphanPath), { recursive: true });
          await writeFile(orphanPath, image);
          try {
            assert.equal(
              (await api(`/api/listing-media/${orphan}`)).status,
              404,
            );
            assert.equal(
              (await api(`/uploads/listings/${orphan}`)).status,
              404,
            );
          } finally {
            await unlink(orphanPath);
          }
          assert.ok(
            (await api("/api/listing-media/%2e%2e%2f.env")).status >= 400,
          );
        },
      );
      await t.test(
        "all marketplace mutations reject hostile browser origins and JSON streams are bounded",
        async () => {
          for (const [url, method, body] of [
            ["/api/auth/login", "POST", { email: owner.email, password }],
            [
              "/api/auth/register",
              "POST",
              { name: "Forged", email: `forged-${tag}@example.test`, password },
            ],
            ["/api/account", "PATCH", { name: "Forged" }],
            [`/api/listings/${listingId}`, "PATCH", { title: "Forged" }],
            ["/api/bookings", "POST", {}],
            [`/api/listings/${listingId}/report`, "POST", { reason: "Forged" }],
          ] as [string, string, object][]) {
            assert.equal(
              (
                await api(url, owner.cookie, method, body, {
                  Origin: "https://attacker.example",
                })
              ).status,
              403,
              url,
            );
            assert.equal(
              (
                await api(url, owner.cookie, method, body, {
                  "Sec-Fetch-Site": "cross-site",
                })
              ).status,
              403,
              url,
            );
          }
          assert.equal(
            (
              await api(
                "/api/account",
                owner.cookie,
                "PATCH",
                { name: "Owner updated" },
                { Origin: base },
              )
            ).status,
            200,
          );
          const stream = new ReadableStream<Uint8Array>({
            start(c) {
              c.enqueue(
                new TextEncoder().encode(
                  JSON.stringify({ name: "a".repeat(40000) }),
                ),
              );
              c.close();
            },
          });
          const r = await fetch(base + "/api/account", {
            method: "PATCH",
            headers: {
              Cookie: owner.cookie,
              "Content-Type": "application/json",
            },
            body: stream,
            duplex: "half",
          } as RequestInit);
          assert.equal(r.status, 400);
        },
      );
      await t.test(
        "bilateral reviews appear on the correct public profiles without private participant fields",
        async () => {
          const l = await createListing(),
            b = await api("/api/bookings", borrower.cookie, "POST", {
              listingId: l.json.listing.id,
              meetingStationId: stations[0],
              startAt: "2035-02-01T10:00",
              endAt: "2035-02-02T10:00",
            }),
            id = b.json.booking.id;
          assert.equal(b.status, 201);
          assert.equal(
            (
              await api(`/api/bookings/${id}`, owner.cookie, "PATCH", {
                action: "accept",
              })
            ).status,
            200,
          );
          completedBookingId = id;
          const evidence = {
            checklist: Object.fromEntries(
              Object.keys(checklistItems).map((k) => [k, "yes"]),
            ),
            conditionConfirmed: true,
            returnConfirmed: true,
            conditionNotes: "Verified profile fixture evidence",
          };
          for (const [action, who] of [
            ["handoff", owner],
            ["handoff", borrower],
            ["return", borrower],
          ] as const)
            assert.equal(
              (
                await api(
                  `/api/bookings/${id}/${action}`,
                  who.cookie,
                  "POST",
                  evidence,
                )
              ).status,
              200,
            );
          assert.equal(
            (
              await api(`/api/bookings/${id}`, owner.cookie, "PATCH", {
                action: "inspect",
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${id}/inspection`,
                owner.cookie,
                "POST",
                { ...evidence, acceptable: true },
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${id}/reviews`,
                borrower.cookie,
                "POST",
                { rating: 5, comment: "Excellent owner verified review" },
              )
            ).status,
            201,
          );
          assert.equal(
            (
              await api(`/api/bookings/${id}/reviews`, owner.cookie, "POST", {
                rating: 4,
                comment: "Careful borrower verified review",
              })
            ).status,
            201,
          );
          const op = await api(`/profile/${owner.id}`),
            bp = await api(`/profile/${borrower.id}`);
          assert.ok(op.text.includes("Excellent owner verified review"));
          assert.ok(!op.text.includes("Careful borrower verified review"));
          assert.ok(bp.text.includes("Careful borrower verified review"));
          assert.ok(!op.text.includes(owner.email));
        },
      );
      await t.test(
        "real account, listing create/edit, browse filters, reporting and keyboard navigation at mobile/tablet/desktop",
        async () => {
          browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          });
          const context = await browser.newContext({
              viewport: { width: 1440, height: 1000 },
            }),
            page = await context.newPage(),
            errors: string[] = [];
          page.setDefaultTimeout(15000);
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("response", (r) => {
            if (r.url().startsWith(base) && r.status() >= 500)
              errors.push(`HTTP ${r.status()} ${r.url()}`);
          });
          await page.goto(base + "/register");
          await page.getByLabel("Full name").fill("Browser student");
          await page
            .getByLabel("Email address")
            .fill(`browser-${tag}@example.test`);
          await page.getByLabel("Password", { exact: true }).fill(password);
          await page
            .getByRole("button", { name: "Create account", exact: true })
            .click();
          await page.waitForURL("**/dashboard");
          await page.reload();
          await expect(
            page.getByRole("heading", { name: "Welcome, Browser student" }),
          ).toBeVisible();
          await page.goto(base + "/account");
          await page.getByLabel("Display name").fill("Browser student updated");
          await page.getByRole("button", { name: "Save settings" }).click();
          await expect(
            page.getByRole("status").filter({ hasText: "Settings saved" }),
          ).toBeVisible();
          // Use the owner's actual existing session for listing management; no database role or lifecycle manipulation.
          await context.clearCookies();
          await context.addCookies([
            {
              name: "p2p_session",
              value: owner.cookie.split("=")[1],
              url: base,
            },
          ]);
          await page.goto(base + "/listings/new");
          await page
            .getByLabel("Listing title")
            .fill(`Browser-created item ${tag}`);
          await page
            .getByRole("combobox", { name: "Category", exact: true })
            .selectOption("Electronics");
          await page.getByLabel("Price", { exact: true }).fill("0.50");
          await page.getByLabel("Deposit", { exact: true }).fill("40");
          await page
            .getByRole("textbox", { name: /^Description/ })
            .fill("Browser-created physical item");
          await page.getByLabel("Condition", { exact: true }).fill("Good");
          await page.getByLabel(/Item photos/).setInputFiles({
            name: "photo.png",
            mimeType: "image/png",
            buffer: Buffer.from(image),
          });
          await page
            .getByRole("button", {
              name: "Choose pickup stations",
              exact: true,
            })
            .click();
          await page
            .getByRole("dialog")
            .locator('[data-station-id="taipei-main"] .station-hit')
            .click();
          await page
            .getByRole("button", { name: "Confirm availability", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Publish listing", exact: true })
            .click();
          await page.waitForURL(/\/listings\/\d+$/);
          const browserId = Number(
            new URL(page.url()).pathname.split("/").pop(),
          );
          const stored = await api(`/api/listings/${browserId}`, owner.cookie);
          stored.json.listing.media.forEach((m) =>
            files.push(
              path.join(
                process.cwd(),
                "storage/listings",
                path.basename(m.url),
              ),
            ),
          );
          await page.goto(`${base}/listings/${browserId}/edit`);
          await page
            .getByRole("combobox", { name: "Category", exact: true })
            .selectOption("Cameras");
          await page
            .getByLabel("Brand and model")
            .fill("Browser verified camera");
          await page
            .getByRole("button", {
              name: "Choose pickup stations",
              exact: true,
            })
            .click();
          await page
            .getByRole("dialog")
            .locator('[data-station-id="taipei-main"] .station-hit')
            .click();
          await page
            .getByRole("dialog")
            .locator('[data-station-id="ximen"] .station-hit')
            .click();
          await page
            .getByRole("button", { name: "Confirm availability", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Save listing", exact: true })
            .click();
          await page.waitForURL(/\/listings\/\d+$/);
          await expect(
            page.getByText("Browser verified camera", { exact: true }),
          ).toBeVisible();
          await context.clearCookies();
          await context.addCookies([
            {
              name: "p2p_session",
              value: borrower.cookie.split("=")[1],
              url: base,
            },
          ]);
          await page.goto(base + "/listings");
          await page
            .getByLabel("Search items")
            .fill(`Browser-created item ${tag}`);
          await page
            .getByRole("combobox", { name: "Category", exact: true })
            .selectOption("Cameras");
          await page
            .getByRole("combobox", { name: "Pickup station", exact: true })
            .selectOption(
              (
                await pool.query('SELECT name FROM "MrtStation" WHERE id=$1', [
                  stations[1],
                ])
              ).rows[0].name,
            );
          await expect(
            page.getByText("1 listing", { exact: true }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "Report", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Send report", exact: true })
            .click();
          await expect(page.getByText("Report received.")).toBeVisible();
          for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            for (const route of [
              "/",
              "/listings",
              `/listings/${browserId}`,
              "/dashboard",
              "/account",
              "/account/activity",
              "/account/verification",
              `/profile/${borrower.id}`,
              `/bookings/${completedBookingId}`,
              "/customer-service",
            ]) {
              await page.goto(base + route);
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth + 1,
                ),
                `${width}px ${route}`,
              );
            }
          }
          await context.clearCookies();
          await context.addCookies([
            {
              name: "p2p_session",
              value: owner.cookie.split("=")[1],
              url: base,
            },
          ]);
          for (const width of [390, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            for (const route of [
              "/listings/new",
              `/listings/${browserId}/edit`,
            ]) {
              await page.goto(base + route);
              assert.ok(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth + 1,
                ),
                `${width}px ${route}`,
              );
            }
          }
          await context.clearCookies();
          await context.addCookies([
            {
              name: "p2p_session",
              value: admin.cookie.split("=")[1],
              url: base,
            },
          ]);
          await page.setViewportSize({ width: 768, height: 1024 });
          for (const route of [
            "/admin",
            "/admin/users",
            `/admin/users/${owner.id}`,
            "/admin/listings",
            `/admin/listings/${browserId}`,
            "/admin/bookings",
            `/admin/bookings/${completedBookingId}`,
            "/admin/reports",
            "/admin/disputes",
            "/admin/audit-logs",
          ]) {
            const response = await page.goto(base + route);
            assert.equal(response?.status(), 200, route);
            assert.ok(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `768px ${route}`,
            );
          }
          await page.screenshot({
            path: "/tmp/lend-ya-m5-admin-tablet.png",
            fullPage: true,
            style: "nextjs-portal{display:none!important}",
          });
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.goto(base + "/listings");
          await page.keyboard.press("Tab");
          assert.ok(
            await page.evaluate(
              () => document.activeElement?.tagName !== "BODY",
            ),
          );
          await page.screenshot({
            path: "/tmp/lend-ya-m5-marketplace-desktop.png",
            fullPage: true,
            style: "nextjs-portal{display:none!important}",
          });
          await page.setViewportSize({ width: 768, height: 1024 });
          await page.goto(`${base}/profile/${owner.id}`);
          await page.screenshot({
            path: "/tmp/lend-ya-m5-profile-tablet.png",
            fullPage: true,
            style: "nextjs-portal{display:none!important}",
          });
          assert.deepEqual(errors, []);
          await context.close();
        },
      );
      await t.test(
        "production cookies are Secure and persisted authentication throttles survive full server restart",
        async () => {
          await browser?.close();
          browser = undefined;
          await stop();
          await start(true);
          const r = await api("/api/auth/login", "", "POST", {
            email: borrower.email,
            password,
          });
          assert.equal(r.status, 200);
          assert.match(r.headers.get("set-cookie")!, /Secure/i);
          assert.match(r.headers.get("set-cookie")!, /HttpOnly/i);
          assert.equal(
            (
              await api("/api/auth/login", "", "POST", {
                email: `unknown-${tag}@example.test`,
                password: "wrong",
              })
            ).status,
            429,
          );
          assert.equal(
            (await api("/api/auth/me", borrower.cookie)).status,
            200,
          );
        },
      );
    } finally {
      await browser?.close();
      await stop();
      closeSync(log);
      if (ownsFixtures)
        await pool.query(
          'TRUNCATE "User","MrtStation","AdminAuditLog","AuthRateLimit" RESTART IDENTITY CASCADE',
        );
      await pool.end();
      await Promise.all(files.map((f) => unlink(f).catch(() => {})));
    }
  },
);
