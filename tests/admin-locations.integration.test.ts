import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import official from "../data/mrt/official-network.json";
import { pointFromMeters } from "../lib/geofencing-lab/geometry";
test(
  "Batch 9A official Locations and consented owned-browser Lab",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      password = "Owned-locations-fixture-93!";
    const actor = async (role: "ADMIN" | "USER") => {
      const email = randomUUID() + "@fixture.test",
        r = await fetch(base + "/api/auth/register", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Locations fixture", email, password }),
        });
      assert.equal(r.status, 201);
      const { user } = await r.json(),
        token = r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1];
      if (role === "ADMIN")
        await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [user.id]);
      return {
        id: user.id as number,
        email,
        token,
        cookie: "p2p_session=" + token,
      };
    };
    const admin = await actor("ADMIN"),
      ordinary = await actor("USER"),
      otherAdmin = await actor("ADMIN");
    assert.equal(admin.id, 1);
    const read = (a?: typeof admin, suffix = "") =>
      fetch(base + "/api/admin/locations" + suffix, {
        headers: a ? { Cookie: a.cookie } : {},
      });
    let device = "";
    const api = async (
      op: string,
      body: object,
      a: typeof admin | undefined = admin,
      cookie: string | undefined = device,
      headers: Record<string, string> = {},
    ) => {
      const r = await fetch(base + "/api/admin/locations/lab/" + op, {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          ...(a
            ? {
                Cookie:
                  a.cookie +
                  (cookie ? "; hustlen_geofencing_lab_browser=" + cookie : ""),
              }
            : {}),
          ...headers,
        },
        body: JSON.stringify(body),
      });
      return {
        status: r.status,
        body: await r.json(),
        headers: r.headers,
        device: r.headers
          .get("set-cookie")
          ?.match(/hustlen_geofencing_lab_browser=([^;]+)/)?.[1],
      };
    };
    const start = async (seconds = 600) => {
      const r = await api("start", { consent: true, durationSeconds: seconds });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.ok(r.device);
      device = r.device!;
      return r.body as { labId: string; expiresAt: string };
    };
    const station = official.stations.find(
        (s) => Object.keys(s.codes).length > 1,
      )!,
      single = official.stations.find(
        (s) => Object.keys(s.codes).length === 1,
      )!,
      sample = (s = station) => ({
        latitude: s.latitude,
        longitude: s.longitude,
        accuracy: 10,
        timestamp: Date.now(),
      });
    const listingId = (
      await db.query(
        `INSERT INTO "Listing"("ownerId",title,description,category,price,condition,status,"updatedAt")VALUES($1,'Synthetic MRT quote listing','Owned fixture','Cameras',10,'Good','ACTIVE',NOW())RETURNING id`,
        [ordinary.id],
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO "ListingMedia"("listingId",url,"mimeType",kind)VALUES($1,'/uploads/synthetic-location-quote.jpg','image/jpeg','PHOTO')`,
      [listingId],
    );
    await db.query(
      `INSERT INTO "ListingStation"("listingId","stationId")SELECT $1,id FROM "MrtStation" WHERE "canonicalId"=$2`,
      [listingId, single.id],
    );
    assert.ok(
      typeof station.latitude === "number" &&
        typeof station.longitude === "number",
    );
    const stationPoint = {
      latitude: station.latitude!,
      longitude: station.longitude!,
    };
    const protectedTables = [
      "MrtStation",
      "Listing",
      "ListingMedia",
      "ListingStation",
      "Booking",
      "Handoff",
      "Return",
      "BookingEvidencePhoto",
      "MeetupSession",
      "MeetupCheckIn",
      "MeetupChallenge",
      "MeetupFallback",
      "MeetupEvent",
      "SupportTicket",
      "SupportMessage",
      "StaffMembership",
      "StaffCapabilityGrant",
    ];
    const snapshot = async () => {
      const result: Record<string, unknown> = {};
      for (const n of protectedTables)
        result[n] = (
          await db.query(
            `SELECT to_jsonb(t) row FROM "${n}" t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      return result;
    };
    const before = await snapshot();
    try {
      await t.test(
        "official identifiers, all six lines, interchanges, real operational flag and bounded privacy DTO",
        async () => {
          const r = await read(admin);
          assert.equal(r.status, 200);
          assert.match(r.headers.get("cache-control")!, /private, no-store/);
          const data = await r.json();
          assert.equal(data.stations.length, official.stations.length);
          assert.deepEqual(
            data.lines.map((l: { id: string }) => l.id),
            official.lines.map((l) => l.id),
          );
          const exact = data.stations.find(
            (s: { id: string }) => s.id === station.id,
          );
          assert.deepEqual(exact.codes, station.codes);
          assert.equal(exact.operational, true);
          assert.equal(exact.policy.radiusMeters, 350);
          assert.deepEqual(
            Object.keys(exact).sort(),
            [
              "id",
              "nameEn",
              "nameZh",
              "codes",
              "latitude",
              "longitude",
              "databaseId",
              "operational",
              "globalHandoffEligible",
              "policy",
            ].sort(),
          );
          const line = Object.keys(station.codes)[0],
            filtered = await (await read(admin, "?line=" + line)).json();
          assert.ok(
            filtered.stations.every((s: { codes: Record<string, string> }) =>
              Object.hasOwn(s.codes, line),
            ),
          );
          const exactRedCode = await (await read(admin, "?q=R05")).json();
          assert.deepEqual(
            exactRedCode.stations.map((s: { id: string }) => s.id),
            ["daan"],
          );
          assert.equal((await read(admin, "?line=forged")).status, 400);
          assert.equal((await read(admin, "?bookingId=1")).status, 400);
          assert.equal((await read(admin, "?line=R&line=BR")).status, 400);
          assert.equal((await read()).status, 401);
          assert.equal((await read(ordinary)).status, 403);
          assert.equal((await read(otherAdmin)).status, 200);
          await db.query(
            `UPDATE "MrtStation" SET operational=false WHERE "canonicalId"=$1`,
            [single.id],
          );
          try {
            const changed = await (
              await read(admin, "?station=" + single.id)
            ).json();
            assert.equal(changed.stations[0].operational, false);
            assert.equal(changed.stations[0].globalHandoffEligible, false);
          } finally {
            await db.query(
              `UPDATE "MrtStation" SET operational=true WHERE "canonicalId"=$1`,
              [single.id],
            );
          }
        },
      );
      await t.test(
        "explicit consent, exact Origin, allowlist, session incarnation and private browser cookie",
        async () => {
          assert.equal(
            (await api("start", { consent: false, durationSeconds: 600 }))
              .status,
            400,
          );
          assert.equal(
            (await api("start", { consent: true, durationSeconds: 3601 }))
              .status,
            400,
          );
          assert.equal(
            (
              await api("start", {
                consent: true,
                durationSeconds: 600,
                role: "ADMIN",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await api(
                "start",
                { consent: true, durationSeconds: 600 },
                ordinary,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(
                "start",
                { consent: true, durationSeconds: 600 },
                otherAdmin,
              )
            ).status,
            403,
          );
          const anonymous = await fetch(
            base + "/api/admin/locations/lab/start",
            {
              method: "POST",
              headers: { Origin: base, "Content-Type": "application/json" },
              body: "{}",
            },
          );
          assert.equal(anonymous.status, 401);
          const lab = await start();
          assert.match(
            (await api("status", { labId: lab.labId })).headers.get(
              "cache-control",
            )!,
            /private, no-store/,
          );
          assert.equal(
            (await api("status", { labId: lab.labId }, admin, "")).status,
            404,
          );
          assert.equal(
            (await api("status", { labId: lab.labId }, admin, "wrong-device"))
              .status,
            404,
          );
          assert.equal(
            (await api("status", { labId: randomUUID() })).status,
            404,
          );
          for (const extra of [
            { Origin: "http://evil.invalid" },
            { Origin: "" },
            { "sec-fetch-site": "cross-site" },
          ] as Record<string, string>[])
            assert.equal(
              (await api("status", { labId: lab.labId }, admin, device, extra))
                .status,
              403,
            );
          const login = await fetch(base + "/api/auth/login", {
            method: "POST",
            headers: { Origin: base, "Content-Type": "application/json" },
            body: JSON.stringify({ email: admin.email, password }),
          });
          assert.equal(login.status, 200);
          const token = login.headers
              .get("set-cookie")!
              .match(/p2p_session=([^;]+)/)![1],
            replacement = { ...admin, token, cookie: "p2p_session=" + token };
          assert.equal(
            (await api("status", { labId: lab.labId }, replacement)).status,
            404,
          );
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE "tokenHash"=$1`,
            [createHash("sha256").update(token).digest("hex")],
          );
          assert.equal(
            (await api("status", { labId: lab.labId }, replacement)).status,
            401,
          );
          await db.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [admin.id],
          );
          try {
            assert.equal((await read(admin)).status, 403);
            assert.equal(
              (await api("status", { labId: lab.labId })).status,
              403,
            );
          } finally {
            await db.query(
              `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
              [admin.id],
            );
          }
          await api("revoke", { labId: lab.labId });
        },
      );
      await t.test(
        "existing strict distance/accuracy/freshness rules, temporary centre, expiry and revocation never yield arrival",
        async () => {
          const lab = await start(),
            evaluate = (s: object) =>
              api("evaluate", {
                labId: lab.labId,
                stationId: station.id,
                sample: s,
              });
          let r = await evaluate(sample());
          assert.equal(r.status, 200);
          assert.equal(r.body.sampleOutcome, "PASS");
          assert.equal(r.body.classification, "TEST_LOCATION");
          assert.equal(r.body.arrivalVerified, false);
          assert.ok(!JSON.stringify(r.body).includes("latitude"));
          for (const [offset, outcome] of [
            [340 - 0.02, "PASS"],
            [340 + 0.02, "OUTSIDE"],
          ] as const) {
            r = await evaluate({
              ...pointFromMeters(0, offset, stationPoint),
              accuracy: 10,
              timestamp: Date.now(),
            });
            assert.equal(r.body.sampleOutcome, outcome);
          }
          assert.equal(
            (await evaluate({ ...sample(), accuracy: 101 })).body.sampleOutcome,
            "INACCURATE",
          );
          assert.equal(
            (await evaluate({ ...sample(), timestamp: Date.now() - 120001 }))
              .status,
            400,
          );
          assert.equal(
            (await evaluate({ ...sample(), timestamp: Date.now() + 6000 }))
              .status,
            400,
          );
          const centre = pointFromMeters(2000, 2000, stationPoint);
          r = await api("centre", {
            labId: lab.labId,
            mode: "map",
            ...centre,
            consent: true,
            durationSeconds: 1,
          });
          assert.equal(r.status, 200);
          assert.equal(
            (await evaluate({ ...centre, accuracy: 10, timestamp: Date.now() }))
              .body.sampleOutcome,
            "PASS",
          );
          await new Promise((r) => setTimeout(r, 1100));
          assert.equal(
            (await api("status", { labId: lab.labId })).body.centreMode,
            "expired",
          );
          assert.equal((await evaluate(sample())).status, 409);
          await api("revoke", { labId: lab.labId });
          assert.equal((await evaluate(sample())).status, 404);
          const short = await start(1);
          await new Promise((r) => setTimeout(r, 1100));
          assert.equal(
            (await api("status", { labId: short.labId })).status,
            404,
          );
        },
      );
      await t.test(
        "audit failure denies new location use, while revocation still removes private state",
        async () => {
          const lab = await start();
          await db.query(
            `CREATE FUNCTION owned_lab_audit_failure()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action LIKE 'MRT_LAB_%' THEN RAISE EXCEPTION 'Owned audit failure';END IF;RETURN NEW;END$$;CREATE TRIGGER owned_lab_audit_failure BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION owned_lab_audit_failure()`,
          );
          try {
            assert.equal(
              (
                await api("centre", {
                  labId: lab.labId,
                  mode: "device",
                  latitude: station.latitude,
                  longitude: station.longitude,
                  consent: true,
                  durationSeconds: 600,
                })
              ).status,
              500,
            );
            assert.equal(
              (await api("status", { labId: lab.labId })).body.centreMode,
              "station",
            );
            assert.equal(
              (
                await api("evaluate", {
                  labId: lab.labId,
                  stationId: station.id,
                  sample: sample(),
                })
              ).status,
              500,
            );
            assert.equal(
              (await api("revoke", { labId: lab.labId })).status,
              500,
            );
            assert.equal(
              (await api("status", { labId: lab.labId })).status,
              404,
            );
          } finally {
            await db.query(
              `DROP TRIGGER owned_lab_audit_failure ON "AdminAuditLog";DROP FUNCTION owned_lab_audit_failure()`,
            );
          }
        },
      );
      await t.test(
        "desktop/tablet/mobile official map, explicit GPS denial/permission, synthetic centre and consent withdrawal",
        async () => {
          const browser = await chromium.launch({
              executablePath: process.env.CHROMIUM_PATH,
              headless: true,
              args: ["--no-sandbox", "--disable-dev-shm-usage"],
            }),
            context = await browser.newContext({
              viewport: { width: 1440, height: 1000 },
              geolocation: {
                latitude: stationPoint.latitude,
                longitude: stationPoint.longitude,
                accuracy: 12,
              },
            }),
            page = await context.newPage();
          await context.addInitScript(() => {
            const original = navigator.geolocation.getCurrentPosition.bind(
              navigator.geolocation,
            );
            (
              window as unknown as { labLocationRequests: number }
            ).labLocationRequests = 0;
            navigator.geolocation.getCurrentPosition = (
              ...args: Parameters<Geolocation["getCurrentPosition"]>
            ) => {
              (window as unknown as { labLocationRequests: number })
                .labLocationRequests++;
              return original(...args);
            };
          });
          try {
            await page.goto(base + "/login");
            await page.getByLabel("Email address").fill(admin.email);
            await page.getByLabel("Password", { exact: true }).fill(password);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click();
            await expect(page).not.toHaveURL(/\/login$/);
            await page.goto(base + "/admin/locations?station=" + station.id);
            await expect(
              page.getByRole("heading", { name: "MRT Locations", exact: true }),
            ).toBeVisible();
            await expect(
              page
                .getByRole("navigation", { name: "Administration" })
                .getByRole("link", { name: "Locations", exact: true }),
            ).toHaveAttribute("aria-current", "page");
            await page.locator('[data-station-id="dongmen"]').press("Enter");
            await expect(
              page.getByRole("heading", {
                name: "Dongmen · 東門",
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("MRT line", { exact: true })
              .selectOption("R");
            await page
              .getByLabel("Station name or code", { exact: true })
              .fill("BR09");
            const directory = page
              .getByRole("heading", { name: "Station directory", exact: true })
              .locator("..");
            await expect(directory.getByRole("button")).toHaveCount(1);
            await directory.getByRole("button").click();
            await expect(
              page.getByRole("heading", {
                name: station.nameEn + " · " + station.nameZh,
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("Station name or code", { exact: true })
              .fill("no-such-official-station");
            await expect(
              page.getByText("No stations match these filters.", {
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("Station name or code", { exact: true })
              .fill("");
            for (const [name, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await page.setViewportSize({ width, height });
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
              await page.screenshot({
                path: path.join(artifact, `locations-${name}.png`),
                fullPage: true,
                style: "nextjs-portal { display: none !important; }",
              });
            }
            await page.goto(
              base + "/admin/locations/lab?station=" + station.id,
            );
            assert.equal(
              await page.evaluate(
                () =>
                  (window as unknown as { labLocationRequests: number })
                    .labLocationRequests,
              ),
              0,
            );
            await expect(
              page.getByRole("button", {
                name: "Start consented Lab",
                exact: true,
              }),
            ).toBeDisabled();
            await page.getByRole("checkbox").check();
            await page
              .getByRole("button", { name: "Start consented Lab", exact: true })
              .click();
            await expect(
              page.getByText("Consented TEST_LOCATION session started.", {
                exact: false,
              }),
            ).toBeVisible();
            assert.equal(
              await page.evaluate(
                () =>
                  (window as unknown as { labLocationRequests: number })
                    .labLocationRequests,
              ),
              0,
            );
            const cdp = await context.newCDPSession(page);
            await cdp.send("Browser.setPermission", {
              permission: { name: "geolocation" },
              setting: "denied",
              origin: base,
            });
            await page
              .getByRole("button", {
                name: "Capture my current sample",
                exact: true,
              })
              .click();
            await expect(page.locator("main").getByRole("alert")).toContainText(
              "denied or unavailable",
            );
            await context.grantPermissions(["geolocation"], { origin: base });
            await page
              .getByRole("button", {
                name: "Use my current location as temporary test centre",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("Temporary TEST_LOCATION centre set", {
                exact: false,
              }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: "Capture my current sample",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("Self-device sample captured on demand.", {
                exact: false,
              }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: "Evaluate TEST_LOCATION sample",
                exact: true,
              })
              .click();
            await expect(
              page.getByRole("heading", {
                name: "TEST_LOCATION · PASS",
                exact: true,
              }),
            ).toBeVisible();
            await page
              .getByLabel("Map selection", { exact: true })
              .selectOption("centre");
            const plot = page.getByRole("img", {
              name: "Geographic geofence plot",
              exact: true,
            });
            await plot.click({ position: { x: 100, y: 110 } });
            await expect(
              page.getByText("Temporary TEST_LOCATION centre set", {
                exact: false,
              }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: "Place sample at centre",
                exact: true,
              })
              .click();
            await page
              .getByRole("button", {
                name: "Evaluate TEST_LOCATION sample",
                exact: true,
              })
              .click();
            await expect(
              page.getByRole("heading", {
                name: "TEST_LOCATION · PASS",
                exact: true,
              }),
            ).toBeVisible();
            for (const [name, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await page.setViewportSize({ width, height });
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
              await page
                .getByRole("button", { name: "Revoke and clear", exact: true })
                .focus();
              await expect(
                page.getByRole("button", {
                  name: "Revoke and clear",
                  exact: true,
                }),
              ).toBeFocused();
              await page.screenshot({
                path: path.join(artifact, `lab-${name}.png`),
                fullPage: true,
                style: "nextjs-portal { display: none !important; }",
              });
            }
            const ids = await page.evaluate(async () => {
              const r = await fetch("/api/admin/locations/lab/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ labId: "wrong" }),
              });
              return r.status;
            });
            assert.equal(ids, 404);
            await page.getByRole("checkbox").uncheck();
            await expect(
              page.getByText("Consent withdrawn. Local samples cleared.", {
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              page.getByRole("button", {
                name: "Evaluate TEST_LOCATION sample",
                exact: true,
              }),
            ).toBeDisabled();
            await expect(
              page.locator('[data-testid="lab-sample-marker"]'),
            ).toHaveCount(0);
            await page
              .getByRole("button", { name: "Sign out", exact: true })
              .click();
            await expect(page).toHaveURL(/\/login$/);
          } finally {
            await browser.close();
          }
        },
      );
      await t.test(
        "Lab cannot change the listing station offering or quote an unsupported/ineligible booking station",
        async () => {
          const request = async (
            stationId: number,
            canonicalStationId: string,
            labId: string,
          ) => {
            const r = await fetch(base + "/api/bookings", {
              method: "POST",
              headers: {
                Origin: base,
                "Content-Type": "application/json",
                Cookie: otherAdmin.cookie,
              },
              body: JSON.stringify({
                listingId,
                meetingStationId: stationId,
                canonicalStationId,
                startAt: "2035-01-01T10:00",
                endAt: "2035-01-02T10:00",
                quote: true,
                labId,
                classification: "TEST_LOCATION",
              }),
            });
            return { status: r.status, body: await r.json() };
          };
          const lab = await start(),
            allowed = (
              await db.query(
                `SELECT id FROM "MrtStation" WHERE "canonicalId"=$1`,
                [single.id],
              )
            ).rows[0].id,
            unoffered = (
              await db.query(
                `SELECT id FROM "MrtStation" WHERE "canonicalId"=$1`,
                [station.id],
              )
            ).rows[0].id;
          assert.equal(
            (await request(allowed, single.id, lab.labId)).status,
            200,
          );
          const bad = await request(unoffered, station.id, lab.labId);
          assert.equal(bad.status, 409);
          assert.equal(bad.body.code, "STATION_UNAVAILABLE");
          await db.query(
            `UPDATE "MrtStation" SET operational=false WHERE id=$1`,
            [allowed],
          );
          try {
            assert.equal(
              (await request(allowed, single.id, lab.labId)).status,
              409,
            );
          } finally {
            await db.query(
              `UPDATE "MrtStation" SET operational=true WHERE id=$1`,
              [allowed],
            );
          }
          await api("revoke", { labId: lab.labId });
        },
      );
      assert.deepEqual(await snapshot(), before);
      const audits = (
        await db.query(
          `SELECT action,"newState" FROM "AdminAuditLog" WHERE "targetType"='GEOFENCING_LAB' ORDER BY id`,
        )
      ).rows;
      assert.ok(audits.length >= 10);
      for (const row of audits) {
        const text = JSON.stringify(row);
        for (const key of [
          "latitude",
          "longitude",
          "deviceHash",
          "sessionHash",
          "token",
          "sample",
        ])
          assert.ok(!text.includes('"' + key + '"'));
        assert.equal(row.newState.classification, "TEST_LOCATION");
      }
      const logs = await readFile(path.join(artifact, "server.log"), "utf8");
      assert.ok(!logs.includes(admin.token));
      assert.ok(!logs.includes('"latitude"'));
      assert.ok(!logs.includes('"longitude"'));
      await writeFile(
        path.join(artifact, "locations-lab-security.json"),
        JSON.stringify(
          {
            officialStations: official.stations.length,
            officialLines: official.lines.length,
            interchangesPreserved: true,
            readOnlyOperationalFlag: true,
            noLiveClosureClaims: true,
            legacyActiveAdminOnly: true,
            labAdditionalAllowlist: true,
            explicitConsentAndNativeGpsOnDemand: true,
            devicePermissionDenial: true,
            exactBrowserSessionBinding: true,
            wrongBrowserAndReplacedSessionDenied: true,
            accuracyFreshnessBoundaryPreserved: true,
            centreAndSessionExpiry: true,
            earlyRevocation: true,
            withdrawalClearsSamples: true,
            auditFailureDeniesUseButDoesNotPreventRevocation: true,
            noPreciseCoordinatesPersistedOrLogged: true,
            testLocationNeverArrival: true,
            noBookingOfferingBypass: true,
            protectedDataUnchanged: true,
            responsiveViewports: 3,
          },
          null,
          2,
        ),
      );
      await writeFile(
        path.join(artifact, "lab-audit-sample.json"),
        JSON.stringify(audits.slice(0, 8), null, 2),
      );
    } finally {
      await db.end();
    }
  },
);
