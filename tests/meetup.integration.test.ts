import { observeCamera } from "./support/camera-diagnostics";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { openSync, closeSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import QRCode from "qrcode";
import { chromium, expect, type Page } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { stationCoordinates } from "../lib/meetup/location";
import { checklistItems } from "../lib/rental-checklist";
type Actor = { id: number; cookie: string; email: string };
type Payload = {
  user: { id: number };
  listing: { id: number };
  booking: {
    id: number;
    status: string;
    return: { confirmedBy: number | null; inspectionAccepted: boolean | null };
  };
  status: string;
  error: string;
  enabled: boolean;
  assurance: string;
  temporaryLocation: { active: { generation: string } | null } | null;
  checkIn: { id: number; outcome: string };
  challengeId: string;
  expiresAt: string;
  qrPayload: string;
  manualCode: string;
  confirmationExpiresAt: string;
  verified: boolean;
  replayed: boolean;
  challenge: { id: string; consumedAt: string | null } | null;
  checks: {
    owner: { outcome: string } | null;
    borrower: { outcome: string } | null;
  };
};
test(
  "Milestone 3: isolated MRT pickup/return, secrets, custody, two-browser acceptance and restart",
  { timeout: 600000 },
  async (t) => {
    const db = await connectTestDatabase(),
      port = process.env.TEST_MEETUP_PORT!,
      base = `http://localhost:${port}`,
      tag = randomUUID(),
      password = "MeetupFixture123!",
      serverSecret = randomBytes(32).toString("hex"),
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
    const logPath = path.join(artifact, "meetup-server.log"),
      log = openSync(logPath, "a");
    let server: ChildProcess | undefined,
      browser: Awaited<ReturnType<typeof chromium.launch>> | undefined,
      cameraBrowser: Awaited<ReturnType<typeof chromium.launch>> | undefined,
      returnBrowser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    async function stop() {
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = once(server, "exit");
        server.kill("SIGTERM");
        const timeout = setTimeout(() => server?.kill("SIGKILL"), 5000);
        await exited;
        clearTimeout(timeout);
      }
    }
    async function start(
      ids: number[] = [],
      ttl = 180,
      confirmation = 900,
      checkTtl = 600,
      temporary = false,
    ) {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          port,
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: "development",
            HUSTLEN_INSPECTION_CANDIDATE:"owned-preview-only",
            HUSTLEN_INSPECTION_ORIGIN:base,
            NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS: "owned-test",
            MEETUP_TEST_LOCATION_ENABLED: temporary ? "true" : "false",
            MEETUP_TEST_LOCATION_USER_IDS: temporary ? ids.join(",") : "",
            MEETUP_PREVIEW_USER_IDS: ids.join(","),
            MEETUP_CODE_SECRET: serverSecret,
            MEETUP_CONFIRMATION_TTL_SECONDS: String(confirmation),
            MEETUP_CHECKIN_TTL_SECONDS: String(checkTtl),
            MEETUP_CHALLENGE_TTL_SECONDS: String(ttl),
            CHAT_ENABLED: "false",
            CHAT_PREVIEW_USER_IDS: "",
          },
          stdio: ["ignore", log, log],
        },
      );
      for (let n = 0; n < 150; n++) {
        if (server.exitCode !== null) throw Error("Meetup server stopped");
        try {
          if (
            (
              await fetch(base + "/api/listings", {
                signal: AbortSignal.timeout(2000),
              })
            ).ok
          )
            return;
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      throw Error("Meetup server failed readiness");
    }
    async function api(
      url: string,
      actor?: Actor,
      method = "GET",
      body?: object | FormData,
      headers: Record<string, string> = {},
    ) {
      const r = await fetch(base + url, {
        method,
        headers: {
          Cookie: actor?.cookie ?? "",
          ...(body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body
          ? { body: body instanceof FormData ? body : JSON.stringify(body) }
          : {}),
      });
      const raw = await r.text();
      let json = {} as Payload;
      try {
        json = JSON.parse(raw);
      } catch {}
      return {
        status: r.status,
        json,
        raw,
        cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "",
        cache: r.headers.get("cache-control"),
      };
    }
    async function register(name: string) {
      const email = `${name}-${tag}@example.test`,
        r = await api("/api/auth/register", undefined, "POST", {
          name,
          email,
          password,
        });
      assert.equal(r.status, 201);
      return { id: r.json.user.id, email, cookie: r.cookie };
    }
    const cameraSavers: (()=>Promise<unknown>)[]=[];
    let owner: Actor,
      borrower: Actor,
      outsider: Actor,
      stationId: number,
      point: { latitude: number; longitude: number },
      listingCounter = 0;
    const checklist = Object.fromEntries(
      Object.keys(checklistItems).map((k) => [k, "yes"]),
    );
    const evidence = {
      checklist,
      conditionConfirmed: true,
      returnConfirmed: true,
    };
    const photo = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#435f85" },
    })
      .png()
      .toBuffer();
    const op = (id: number, name: string, actor: Actor, body: object = {}) =>
      api(
        `/api/bookings/${id}/meetup/${name}`,
        actor,
        "POST",
        name === "issue" ? { requestKey: randomUUID(), ...body } : body,
      );
    const detail = (id: number) => api(`/api/bookings/${id}`, owner);
    const check = (
      id: number,
      actor: Actor,
      purpose = "PICKUP",
      extra: object = {},
    ) =>
      op(id, "checkin", actor, {
        purpose,
        requestKey: randomUUID(),
        mode: "location",
        ...point,
        accuracy: 10,
        timestamp: Date.now(),
        ...extra,
      });
    async function rental() {
      listingCounter++;
      const form = new FormData();
      for (const [k, v] of Object.entries({
        title: `QR camera ${listingCounter} ${tag}`,
        description: "Synthetic isolated equipment fixture",
        category: "Cameras",
        condition: "Good",
        price: "10",
        stationIds: JSON.stringify([stationId]),
      }))
        form.set(k, v);
      form.append(
        "photos",
        new File([new Uint8Array(photo)], "camera.png", { type: "image/png" }),
      );
      const l = await api("/api/listings", owner, "POST", form);
      assert.equal(l.status, 201);
      const b = await api("/api/bookings", borrower, "POST", {
        listingId: l.json.listing.id,
        meetingStationId: stationId,
        startAt: "2038-01-01T10:00",
        endAt: "2038-01-02T10:00",
      });
      assert.equal(b.status, 201);
      assert.equal(
        (
          await api(`/api/bookings/${b.json.booking.id}`, owner, "PATCH", {
            action: "accept",
          })
        ).status,
        200,
      );
      return { id: b.json.booking.id, listingId: l.json.listing.id };
    }
    async function prepare(id: number) {
      assert.equal((await op(id, "enroll", owner)).status, 200);
      assert.equal((await check(id, owner)).status, 200);
      assert.equal((await check(id, borrower)).status, 200);
      assert.equal(
        (await api(`/api/bookings/${id}/handoff`, owner, "POST", evidence))
          .status,
        200,
      );
    }
    try {
      await start();
      owner = await register("QROwner");
      borrower = await register("QRBorrower");
      outsider = await register("QROutsider");
      const investigationAdmin = await register("QRInvestigationAdmin");
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`,[investigationAdmin.id]);
      const station = (
        await db.query(
          'SELECT id,"canonicalId" FROM "MrtStation" WHERE code=\'TPE\'',
        )
      ).rows[0];
      stationId = station.id;
      const coords = stationCoordinates.find(
        (s) => s.id === station.canonicalId,
      )!;
      point = { latitude: coords.latitude!, longitude: coords.longitude! };
      const first = await rental(),
        ids = [owner.id, borrower.id];
      async function assertInvestigationReceipt(id:number, transport:"camera"|"manual-code") {
        const result=await fetch(base+`/admin/bookings/${id}?wbCategory=CUSTODY_REVIEW`,{headers:{Cookie:investigationAdmin.cookie}});
        assert.equal(result.status,200);
        const panel=(await result.text()).match(/<section[^>]*aria-label="Investigation context"[\s\S]*?<\/section>/)?.[0];
        assert.ok(panel);assert.ok(panel.includes("Recorded via completed QR receipt"));
        assert.match(panel,/data-checkpoint="accepted-inspection"[^>]*>Not established by current records/);
        assert.ok(panel.includes('data-selected-queue-match="false"'));
        await writeFile(path.join(artifact,"investigation-qr-receipt.json"),JSON.stringify({transport,actualChallengeVerificationAndExplicitPhysicalReceipt:true,physicalReturnRecordedViaQrChallenge:true,acceptedInspectionStillNotEstablished:true,normalInspectionNotCustodyAnomaly:true,cameraAcceptanceClaimed:transport==="camera"},null,2));
      }
      if(process.env.MRT_TEST_INVESTIGATION_RECEIPT_ONLY==="1") {
        await t.test("scoped investigation receipt: actual geofence/challenge/receipt API, independent of camera decoding",async()=>{
          await stop();await start(ids);await prepare(first.id);
          const pickup=(await op(first.id,"issue",owner,{purpose:"PICKUP"})).json;
          assert.equal((await op(first.id,"verify",borrower,{purpose:"PICKUP",challengeId:pickup.challengeId,manualCode:pickup.manualCode,requestKey:randomUUID()})).status,200);
          assert.equal((await api(`/api/bookings/${first.id}/handoff`,borrower,"POST",{...evidence,meetupChallengeId:pickup.challengeId,physicalReceipt:true})).status,200);
          assert.equal((await api(`/api/bookings/${first.id}/return`,borrower,"POST",evidence)).status,200);
          for(const actor of [owner,borrower])assert.equal((await check(first.id,actor,"RETURN")).json.checkIn.outcome,"VERIFIED");
          const returned=(await op(first.id,"issue",borrower,{purpose:"RETURN"})).json;
          assert.equal((await op(first.id,"verify",owner,{purpose:"RETURN",challengeId:returned.challengeId,manualCode:returned.manualCode,requestKey:randomUUID()})).status,200);
          assert.equal((await api(`/api/bookings/${first.id}`,owner,"PATCH",{action:"inspect",meetupChallengeId:returned.challengeId,physicalReceipt:true})).status,200);
          await assertInvestigationReceipt(first.id,"manual-code");
        });
        return;
      }
      let pickup: Payload;
      if(process.env.MRT_TEST_CAMERA_ONLY!=="1") {
      await t.test(
        "preview defaults off, explicit enrollment and participant/CSRF guards",
        async () => {
          assert.equal((await op(first.id, "enroll", owner)).status, 403);
          assert.equal(
            (await api(`/api/bookings/${first.id}/meetup/status`, owner)).json
              .enabled,
            false,
          );
          assert.equal(
            (await api(`/api/bookings/${first.id}/meetup/status`)).status,
            401,
          );
          assert.equal((await op(first.id, "enroll", outsider)).status, 403);
          await stop();
          await start(ids);
          assert.equal((await op(first.id, "enroll", borrower)).status, 403);
          assert.equal((await op(first.id, "enroll", owner)).status, 200);
          assert.equal(
            (
              await api(
                `/api/bookings/${first.id}/meetup/checkin`,
                owner,
                "POST",
                { purpose: "PICKUP" },
                { Origin: "https://evil.test", "Sec-Fetch-Site": "cross-site" },
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "temporary local mode: guards, bilateral consent, TEST_LOCATION, revocation and restart",
        async () => {
          const r = await rental();
          await op(r.id, "enroll", owner);
          const simulated = { latitude: 0, longitude: 0 }; // synthetic ocean point, never a device reading
          const proposal = () => ({
            action: "create",
            acknowledged: true,
            ...simulated,
            accuracy: 10,
            timestamp: Date.now(),
          });
          assert.equal(
            (await op(r.id, "test-location", owner, proposal())).status,
            403,
          );
          await stop();
          await start(ids, 180, 900, 600, true);
          const originalStation = (
            await db.query(
              'SELECT "meetingStationId" FROM "Booking" WHERE id=$1',
              [r.id],
            )
          ).rows[0].meetingStationId;
          assert.equal(
            (await op(r.id, "test-location", outsider, proposal())).status,
            403,
          );
          assert.equal(
            (
              await op(r.id, "test-location", owner, {
                ...proposal(),
                acknowledged: false,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await op(r.id, "test-location", owner, {
                ...proposal(),
                timestamp: Date.now() - 120001,
              })
            ).status,
            400,
          );
          assert.equal(
            (await op(r.id, "test-location", owner, proposal())).status,
            200,
          );
          assert.equal(
            (await check(r.id, owner, "PICKUP", simulated)).status,
            409,
          );
          const state = await api(
            `/api/bookings/${r.id}/meetup/status`,
            borrower,
          );
          assert.doesNotMatch(state.raw, /"latitude"|"longitude"/);
          const generation = state.json.temporaryLocation!.active!.generation;
          assert.equal(
            (
              await op(r.id, "test-location", borrower, {
                action: "acknowledge",
                acknowledged: true,
                generation: "wrong",
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await op(r.id, "test-location", borrower, {
                action: "acknowledge",
                acknowledged: true,
                generation,
              })
            ).status,
            200,
          );
          assert.equal(
            (await check(r.id, owner, "PICKUP", simulated)).json.checkIn
              .outcome,
            "TEST_LOCATION",
          );
          assert.equal(
            (await check(r.id, borrower, "PICKUP", simulated)).json.checkIn
              .outcome,
            "TEST_LOCATION",
          );
          assert.equal(
            (await op(r.id, "issue", owner, { purpose: "PICKUP" })).status,
            409,
          ); // checklist remains required
          assert.equal(
            (
              await api(
                `/api/bookings/${r.id}/handoff`,
                owner,
                "POST",
                evidence,
              )
            ).status,
            200,
          );
          const issued = await op(r.id, "issue", owner, { purpose: "PICKUP" });
          assert.equal(issued.status, 200);
          assert.equal(issued.json.assurance, "TEST_LOCATION");
          assert.equal(
            (await op(r.id, "test-location", borrower, { action: "revoke" }))
              .status,
            200,
          );
          assert.equal(
            (await op(r.id, "issue", owner, { purpose: "PICKUP" })).status,
            409,
          );
          assert.equal(
            (
              await op(r.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: issued.json.challengeId,
                manualCode: issued.json.manualCode,
                requestKey: randomUUID(),
              })
            ).status,
            409,
          );
          assert.equal(
            (await op(r.id, "test-location", owner, proposal())).status,
            200,
          );
          await stop();
          await start(ids, 180, 900, 600, true);
          assert.equal(
            (await api(`/api/bookings/${r.id}/meetup/status`, owner)).json
              .temporaryLocation!.active,
            null,
          );
          assert.equal(
            (await op(r.id, "issue", owner, { purpose: "PICKUP" })).status,
            409,
          );
          assert.equal(
            (
              await db.query(
                'SELECT "meetingStationId" FROM "Booking" WHERE id=$1',
                [r.id],
              )
            ).rows[0].meetingStationId,
            originalStation,
          );
          await stop();
          await start(ids);
        },
      );
      await t.test(
        "freshness, inaccurate/denied/outside readings, forged claims and independently acknowledged fallback",
        async () => {
          const support = await op(first.id, "assistance", owner, {
            reason: "LOCATION_PROBLEM",
          });
          assert.equal(support.status, 200);
          assert.equal((await api("/api/conversations", borrower)).status, 503);
          assert.match(support.raw, /caseId/);
          assert.equal(
            (
              await op(first.id, "assistance", outsider, {
                reason: "LOCATION_PROBLEM",
              })
            ).status,
            403,
          );
          assert.equal(
            (await detail(first.id)).json.booking.status,
            "CONFIRMED",
          );
          assert.equal(
            (await check(first.id, owner, "PICKUP", { verified: true })).status,
            400,
          );
          assert.equal(
            (
              await check(first.id, owner, "PICKUP", {
                timestamp: Date.now() - 121000,
              })
            ).status,
            400,
          );
          assert.equal(
            (await check(first.id, owner, "PICKUP", { accuracy: 900 })).json
              .checkIn.outcome,
            "INACCURATE",
          );
          assert.equal(
            (await check(first.id, borrower, "PICKUP", { latitude: 24 })).json
              .checkIn.outcome,
            "OUTSIDE",
          );
          assert.equal(
            (
              await op(first.id, "fallback", owner, {
                purpose: "PICKUP",
                reason: "Underground GPS unavailable",
                acknowledged: true,
              })
            ).status,
            409,
          );
          const unavailable = {
            purpose: "PICKUP",
            requestKey: randomUUID(),
            mode: "unavailable",
            reason: "DENIED",
          };
          const a = await op(first.id, "checkin", borrower, unavailable),
            b = await op(first.id, "checkin", borrower, unavailable);
          assert.equal(a.json.checkIn.id, b.json.checkIn.id);
          assert.equal(b.json.replayed, true);
          assert.equal(
            (
              await op(first.id, "fallback", owner, {
                purpose: "PICKUP",
                reason: "GPS is unreliable at the agreed exit",
                acknowledged: false,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await op(first.id, "fallback", owner, {
                purpose: "PICKUP",
                reason: "GPS is unreliable at the agreed exit",
                acknowledged: true,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${first.id}/handoff`,
                owner,
                "POST",
                evidence,
              )
            ).status,
            200,
          );
          assert.equal(
            (await op(first.id, "issue", owner, { purpose: "PICKUP" })).status,
            409,
          );
          assert.equal(
            (
              await op(first.id, "fallback", borrower, {
                purpose: "PICKUP",
                reason: "Permission denied; I agree to reduced assurance",
                acknowledged: true,
              })
            ).status,
            200,
          );
          // Valid numeric coordinates can be fabricated: browser GPS is not attested. Never claim spoof prevention.
          assert.equal(
            (await check(first.id, owner)).json.checkIn.outcome,
            "VERIFIED",
          );
          assert.equal(
            (await op(first.id, "issue", owner, { purpose: "PICKUP" })).status,
            409,
            "New checks invalidate old fallback acknowledgements",
          );
          for (const actor of [owner, borrower])
            assert.equal(
              (
                await op(first.id, "fallback", actor, {
                  purpose: "PICKUP",
                  reason:
                    "I acknowledge GPS is not verified for both participants",
                  acknowledged: true,
                })
              ).status,
              200,
            );
          const columns = (
            await db.query(
              "SELECT column_name FROM information_schema.columns WHERE table_name='MeetupCheckIn'",
            )
          ).rows.map((r) => r.column_name);
          assert.ok(
            !columns.includes("latitude") && !columns.includes("longitude"),
          );
        },
      );

      await t.test(
        "random hashed challenge, correct role/stage, rotation, concurrent single consumption and evidence gates",
        async () => {
          assert.equal(
            (await op(first.id, "issue", borrower, { purpose: "PICKUP" }))
              .status,
            403,
          );
          const issuanceKey = randomUUID(),
            oldResponse = await op(first.id, "issue", owner, {
              purpose: "PICKUP",
              requestKey: issuanceKey,
            }),
            old = oldResponse.json;
          const retried = await op(first.id, "issue", owner, {
            purpose: "PICKUP",
            requestKey: issuanceKey,
          });
          assert.equal(retried.json.challengeId, old.challengeId);
          assert.equal(retried.json.replayed, true);
          assert.equal(
            retried.json.qrPayload,
            undefined,
            "Lost raw secret is never recovered from storage",
          );
          // Even an identical timestamp cannot revive a challenge after another Booking write.
          await db.query(
            "UPDATE \"Booking\" SET notes='Version changed while timestamp retained' WHERE id=$1",
            [first.id],
          );
          assert.equal(
            (
              await op(first.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: old.challengeId,
                qrPayload: old.qrPayload,
                requestKey: randomUUID(),
              })
            ).status,
            409,
          );
          pickup = (await op(first.id, "issue", owner, { purpose: "PICKUP" }))
            .json;
          const verify = (actor: Actor, c: Payload, extra: object = {}) =>
            op(first.id, "verify", actor, {
              purpose: "PICKUP",
              challengeId: c.challengeId,
              qrPayload: c.qrPayload,
              requestKey: randomUUID(),
              ...extra,
            });
          assert.equal((await verify(borrower, old)).status, 409);
          assert.equal((await verify(outsider, pickup)).status, 403);
          assert.equal((await verify(owner, pickup)).status, 403);
          assert.equal(
            (await verify(borrower, pickup, { purpose: "RETURN" })).status,
            409,
          );
          const otherBooking = await rental();
          assert.equal(
            (await op(otherBooking.id, "enroll", owner)).status,
            200,
          );
          assert.equal(
            (
              await op(otherBooking.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: pickup.challengeId,
                qrPayload: pickup.qrPayload,
                requestKey: randomUUID(),
              })
            ).status,
            404,
          );
          const key = randomUUID();
          const results = await Promise.all([
            verify(borrower, pickup, { requestKey: key }),
            verify(borrower, pickup, { requestKey: key }),
          ]);
          results.forEach((r) => assert.equal(r.status, 200));
          assert.ok(results.some((r) => r.json.replayed));
          assert.equal((await verify(borrower, pickup)).status, 409);
          assert.equal(
            (await detail(first.id)).json.booking.status,
            "HANDOFF_PENDING",
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${first.id}/handoff`,
                borrower,
                "POST",
                evidence,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await api(`/api/bookings/${first.id}/handoff`, borrower, "POST", {
                ...evidence,
                meetupChallengeId: pickup.challengeId,
                physicalReceipt: false,
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await api(`/api/bookings/${first.id}/handoff`, borrower, "POST", {
                conditionConfirmed: true,
                meetupChallengeId: pickup.challengeId,
                physicalReceipt: true,
              })
            ).status,
            400,
          );
          const submission = {
            ...evidence,
            meetupChallengeId: pickup.challengeId,
            physicalReceipt: true,
          };
          assert.equal(
            (
              await api(`/api/bookings/${first.id}/handoff`, borrower, "POST", {
                ...submission,
                conditionConfirmed: false,
              })
            ).status,
            400,
          );
          const completed = await Promise.all([
            api(
              `/api/bookings/${first.id}/handoff`,
              borrower,
              "POST",
              submission,
            ),
            api(
              `/api/bookings/${first.id}/handoff`,
              borrower,
              "POST",
              submission,
            ),
          ]);
          completed.forEach((r) => assert.equal(r.status, 200));
          assert.ok(completed.some((r) => r.json.replayed));
          assert.equal(
            (
              await api(
                `/api/bookings/${first.id}/handoff`,
                borrower,
                "POST",
                submission,
              )
            ).json.replayed,
            true,
          );
          assert.equal(
            (
              await api(`/api/bookings/${first.id}/handoff`, borrower, "POST", {
                ...submission,
                conditionNotes: "changed payload",
              })
            ).status,
            409,
          );
          const row = (
            await db.query('SELECT * FROM "MeetupChallenge" WHERE id=$1', [
              pickup.challengeId,
            ])
          ).rows[0];
          assert.equal(row.tokenHash.length, 64);
          assert.equal(row.codeHash.length, 64);
          assert.notEqual(row.tokenHash, pickup.qrPayload.split(":").at(-1));
          assert.ok(row.completedAt);
          assert.equal(
            (
              await db.query(
                'SELECT count(*)::int n FROM "MeetupEvent" WHERE "challengeId"=$1 AND kind=\'CHALLENGE_VERIFIED\'',
                [pickup.challengeId],
              )
            ).rows[0].n,
            1,
          );
          await assert.rejects(
            db.query(
              'UPDATE "MeetupChallenge" SET "tokenHash"=\'rewritten\' WHERE id=$1',
              [pickup.challengeId],
            ),
            /immutable/,
          );
        },
      );
      await t.test(
        "fresh return checks, suspended custody obligations, independent receipt, inspection and completion",
        async () => {
          await db.query(
            'UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',
            [borrower.id],
          );
          await db.query(
            'UPDATE "Listing" SET "adminRestricted"=true WHERE id=$1',
            [first.listingId],
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${first.id}/return`,
                borrower,
                "POST",
                evidence,
              )
            ).status,
            200,
          );
          assert.equal(
            (await op(first.id, "issue", borrower, { purpose: "RETURN" }))
              .status,
            409,
          );
          for (const actor of [owner, borrower])
            assert.equal(
              (await check(first.id, actor, "RETURN")).json.checkIn.outcome,
              "VERIFIED",
            );
          const issued = (
            await op(first.id, "issue", borrower, { purpose: "RETURN" })
          ).json;
          assert.equal(
            (
              await api(`/api/bookings/${first.id}`, owner, "PATCH", {
                action: "inspect",
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await op(first.id, "verify", owner, {
                purpose: "RETURN",
                challengeId: issued.challengeId,
                manualCode: issued.manualCode,
                requestKey: randomUUID(),
              })
            ).status,
            200,
          );
          assert.equal(
            (await detail(first.id)).json.booking.status,
            "RETURN_PENDING",
          );
          const receipt = {
            action: "inspect",
            meetupChallengeId: issued.challengeId,
            physicalReceipt: true,
          };
          assert.equal(
            (await api(`/api/bookings/${first.id}`, owner, "PATCH", receipt))
              .status,
            200,
          );
          assert.equal(
            (await api(`/api/bookings/${first.id}`, owner, "PATCH", receipt))
              .json.replayed,
            true,
          );
          const returned = (await detail(first.id)).json.booking;
          assert.equal(returned.status, "INSPECTION");
          assert.equal(returned.return.inspectionAccepted, null);
          assert.equal(returned.return.confirmedBy, null);
          assert.equal(
            (
              await api(`/api/bookings/${first.id}/inspection`, owner, "POST", {
                ...evidence,
                acceptable: true,
              })
            ).status,
            200,
          );
          assert.equal(
            (await detail(first.id)).json.booking.status,
            "COMPLETED",
          );
          await db.query(
            'UPDATE "User" SET "accountStatus"=\'ACTIVE\' WHERE id=$1',
            [borrower.id],
          );
        },
      );
      await t.test("13B real return authority, inspection window, private evidence and unsent participant previews",async()=>{
        const sample=await rental();await op(sample.id,"enroll",owner);await check(sample.id,owner);await check(sample.id,borrower);
        const withPhoto=async(stage:string,a:Actor,extra:object={})=>{const form=new FormData();form.set("payload",JSON.stringify({...evidence,...extra}));form.append("photos",new File([new Uint8Array(photo)],"original.png",{type:"image/png"}));return api(`/api/bookings/${sample.id}/${stage}`,a,"POST",form);};
        assert.equal((await withPhoto("handoff",owner)).status,200);
        const read=async(a?:Actor)=>{const r=await fetch(base+`/api/dev/inspection?bookingId=${sample.id}`,{headers:a?{Cookie:a.cookie}:{}});return {status:r.status,value:await r.json()};};
        const draft={bookingId:sample.id,mode:"CLAIM",component:"Camera body",concern:"POSSIBLE_DIFFERENCE",description:"A possible surface difference requires human comparison.",evidenceIds:[] as string[],missingEvidence:true};
        const preview=async(body:object,a:Actor,headers:Record<string,string>={})=>api("/api/dev/inspection",a,"POST",body,{Origin:base,"X-Hustlen-Inspection":"1",...headers});
        assert.equal((await read()).status,401);assert.equal((await read(outsider)).status,404);assert.equal((await read(owner)).value.returnedAt,null);assert.equal((await preview(draft,owner)).status,409);
        const pickup=(await op(sample.id,"issue",owner,{purpose:"PICKUP"})).json;
        assert.equal((await op(sample.id,"verify",borrower,{purpose:"PICKUP",challengeId:pickup.challengeId,manualCode:pickup.manualCode,requestKey:randomUUID()})).status,200);
        assert.equal((await withPhoto("handoff",borrower,{meetupChallengeId:pickup.challengeId,physicalReceipt:true})).status,200);
        assert.equal((await withPhoto("return",borrower)).status,200);await check(sample.id,owner,"RETURN");await check(sample.id,borrower,"RETURN");
        const returned=(await op(sample.id,"issue",borrower,{purpose:"RETURN"})).json;
        assert.equal((await op(sample.id,"verify",owner,{purpose:"RETURN",challengeId:returned.challengeId,manualCode:returned.manualCode,requestKey:randomUUID()})).status,200);
        assert.equal((await read(owner)).value.returnedAt,null,"scan alone is not physical receipt");
        assert.equal((await api(`/api/bookings/${sample.id}`,owner,"PATCH",{action:"inspect",meetupChallengeId:returned.challengeId,physicalReceipt:true})).status,200);
        const state=(await read(owner)).value;
        assert.equal(state.physicalCustody,"RETURN_ACKNOWLEDGED");assert(state.inspectionOpen);assert.equal(Date.parse(state.inspectionDeadline)-Date.parse(state.returnedAt),24*3600000);assert.equal((await read(owner)).value.inspectionDeadline,state.inspectionDeadline);assert(state.evidence.length>=3);
        const before=(await db.query(`SELECT id,stage,"uploaderId","createdAt",md5(data) digest FROM "BookingEvidencePhoto" WHERE "bookingId"=$1 ORDER BY id`,[sample.id])).rows;
        draft.evidenceIds=[state.evidence[0].id];assert.equal((await preview(draft,borrower)).status,409);assert.equal((await preview(draft,owner,{Origin:"https://wrong.invalid"})).status,403);assert.equal((await preview({...draft,verified:true},owner)).status,400);assert.equal((await preview({...draft,evidenceIds:[randomUUID()]},owner)).status,403);
        const prepared=await preview(draft,owner);assert.equal(prepared.status,200);assert.match(prepared.raw,/"submitted":false/);assert.equal((await detail(sample.id)).json.booking.status,"INSPECTION");
        const evidenceUrl=`/api/bookings/${sample.id}/evidence/${state.evidence[0].id}`;
        assert.equal((await api(evidenceUrl,outsider)).status,403);assert.equal((await api(evidenceUrl,borrower)).status,200);
        const b=await chromium.launch({executablePath:process.env.MRT_BROWSER_PATH,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
        async function inspectBrowser(a:Actor,label:string){const ctx=await b.newContext();const page=await ctx.newPage();const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=400)errors.push(String(r.status())+" "+new URL(r.url()).pathname);});
          await page.goto(base+"/login");await page.getByLabel("Email address").fill(a.email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Log in",exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);
          await page.goto(base+"/dev/inspection");await page.getByLabel("Your booking ID",{exact:true}).fill(String(sample.id));await page.getByRole("button",{name:"Load permitted rental",exact:true}).click();await expect(page.getByText(/Physical return acknowledged/)).toBeVisible();
          await page.getByLabel("Factual description",{exact:true}).fill(label==="owner"?"A possible surface difference, not an established finding.":"I disagree; the accessory return needs clarification.");if(label==="owner")await page.getByLabel("Affected item or component",{exact:true}).fill("Camera body");
          for(const [name,width,height]of [["desktop",1440,1000],["tablet",820,1180],["mobile",390,844]] as const){await page.setViewportSize({width,height});await page.getByLabel("Factual description",{exact:true}).focus();await expect(page.getByLabel("Factual description",{exact:true})).toBeFocused();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(artifact,`inspection-${label}-${name}.png`),fullPage:true});}
          await page.getByRole("button",{name:"Validate unsent preview",exact:true}).click();await expect(page.getByRole("heading",{name:"Validated, NOT submitted",exact:true})).toBeVisible();assert.deepEqual(errors,[]);await ctx.close();}
        await inspectBrowser(owner,"owner");
        // Explicit existing participant operation creates a legacy TEST dispute, never the preview endpoint.
        const dispute=await api(`/api/bookings/${sample.id}/dispute`,owner,"POST",{reason:"Synthetic possible condition difference",description:"A participant allegation, not a finding."});assert.equal(dispute.status,201);
        const disputed=(await read(borrower)).value;assert.equal(disputed.physicalCustody,"RETURN_ACKNOWLEDGED");assert.equal(disputed.returnedAt,state.returnedAt);assert.equal(disputed.legacyStatus,"DISPUTED");assert.equal(disputed.responseDeadline,null);assert.equal((await preview(draft,owner)).status,409);
        const response={bookingId:sample.id,mode:"RESPONSE",description:"I disagree and ask for evidence clarification.",evidenceIds:draft.evidenceIds,accessoryState:"UNKNOWN",disagree:true,requestHuman:true};assert.equal((await preview(response,borrower)).status,200);assert.equal((await preview(response,owner)).status,409);
        await db.query(`UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,[borrower.id]);assert.equal((await read(borrower)).status,200);assert.equal((await preview(response,borrower)).status,200);await db.query(`UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,[borrower.id]);
        await inspectBrowser(borrower,"borrower");await b.close();
        const after=(await db.query(`SELECT id,stage,"uploaderId","createdAt",md5(data) digest FROM "BookingEvidencePhoto" WHERE "bookingId"=$1 ORDER BY id`,[sample.id])).rows;assert.deepEqual(after,before);
        const freshLogin=await api("/api/auth/login",undefined,"POST",{email:owner.email,password});assert.equal(freshLogin.status,200);
        const revoked={...owner,cookie:freshLogin.cookie};assert.equal((await read(revoked)).status,200);assert.equal((await api("/api/auth/logout",revoked,"POST",{})).status,200);assert.equal((await read(revoked)).status,401);
        const expired={...owner,cookie:"p2p_session=invalid-synthetic-session"};assert.equal((await read(expired)).status,401);
        const latest=(await read(owner)).value;assert.equal(latest.financialState,"NOT_IMPLEMENTED");assert.equal(latest.disputes.length,1);
        await writeFile(path.join(artifact,"inspection-browser-evidence.json"),JSON.stringify({actualLogin:true,realGeofenceQrAndPhysicalReceipt:true,manualCodeNotCameraClaim:true,window24Hours:true,reloadStable:true,scanAloneInsufficient:true,crossAccountDenied:true,evidenceAuthorization:true,originalEvidenceDigestPreserved:true,realLogoutSessionRevocation:true,suspendedParticipantObligationsPreserved:true,explicitLegacyDisputeOnly:true,disputeDoesNotReverseReturn:true,borrowerUnsentDisagreement:true,noNotificationDeadlineActivated:true,noFinancialAction:true,noExternalAI:true,responsiveViewports:3},null,2));
      });

      await t.test(
        "manual guessing limits and audit survive rotation; expired/replayed and cancelled/disputed paths fail closed",
        async () => {
          const rental2 = await rental();
          await prepare(rental2.id);
          let c = (await op(rental2.id, "issue", owner, { purpose: "PICKUP" }))
            .json;
          const bad = c.manualCode === "000000" ? "111111" : "000000";
          for (let n = 0; n < 5; n++)
            assert.equal(
              (
                await op(rental2.id, "verify", borrower, {
                  purpose: "PICKUP",
                  challengeId: c.challengeId,
                  manualCode: bad,
                  requestKey: randomUUID(),
                })
              ).status,
              400,
            );
          assert.equal(
            (
              await op(rental2.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: c.challengeId,
                manualCode: c.manualCode,
                requestKey: randomUUID(),
              })
            ).status,
            429,
          );
          assert.equal(
            (
              await db.query(
                'SELECT count(*)::int n FROM "MeetupEvent" WHERE "challengeId"=$1 AND kind=\'VERIFY_SECRET_FAILED\'',
                [c.challengeId],
              )
            ).rows[0].n,
            5,
          );
          c = (await op(rental2.id, "issue", owner, { purpose: "PICKUP" }))
            .json;
          assert.equal(
            (
              await op(rental2.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: c.challengeId,
                manualCode: c.manualCode,
                requestKey: randomUUID(),
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental2.id}/handoff`,
                borrower,
                "POST",
                {
                  ...evidence,
                  meetupChallengeId: c.challengeId,
                  physicalReceipt: true,
                },
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${rental2.id}/dispute`,
                borrower,
                "POST",
                {
                  reason: "Synthetic dispute",
                  description: "Evidence must remain unchanged by verification",
                },
              )
            ).status,
            201,
          );
          const before = (
            await db.query('SELECT * FROM "Booking" WHERE id=$1', [rental2.id])
          ).rows[0];
          for (const [name, body] of [
            [
              "checkin",
              {
                purpose: "RETURN",
                requestKey: randomUUID(),
                mode: "unavailable",
                reason: "UNAVAILABLE",
              },
            ],
            ["issue", { purpose: "RETURN" }],
            [
              "fallback",
              {
                purpose: "RETURN",
                reason: "Location is unavailable",
                acknowledged: true,
              },
            ],
            [
              "verify",
              {
                purpose: "PICKUP",
                challengeId: c.challengeId,
                manualCode: c.manualCode,
                requestKey: randomUUID(),
              },
            ],
          ] as [string, object][])
            assert.equal((await op(rental2.id, name, owner, body)).status, 409);
          assert.notEqual(
            (
              await op(rental2.id, "receipt", owner, {
                meetupChallengeId: c.challengeId,
                physicalReceipt: true,
              })
            ).status,
            200,
          );
          assert.deepEqual(
            (
              await db.query('SELECT * FROM "Booking" WHERE id=$1', [
                rental2.id,
              ])
            ).rows[0],
            before,
          );
          const cancel = await rental();
          await op(cancel.id, "enroll", owner);
          assert.equal(
            (
              await api(`/api/bookings/${cancel.id}`, owner, "PATCH", {
                action: "cancel",
              })
            ).status,
            200,
          );
          assert.equal((await check(cancel.id, owner)).status, 409);
          const expire = await rental();
          await prepare(expire.id);
          await stop();
          await start(ids, 30);
          const expired = (
            await op(expire.id, "issue", owner, { purpose: "PICKUP" })
          ).json;
          await new Promise((r) => setTimeout(r, 31000));
          assert.equal(
            (
              await op(expire.id, "verify", borrower, {
                purpose: "PICKUP",
                challengeId: expired.challengeId,
                manualCode: expired.manualCode,
                requestKey: randomUUID(),
              })
            ).status,
            409,
          );
          assert.equal(
            (await detail(expire.id)).json.booking.status,
            "HANDOFF_PENDING",
          );
          await stop();
          await start(ids);
        },
      );
      await t.test(
        "separate scan and confirmation clocks: delayed pickup/return, lost response, expiry and invalidation",
        async () => {
          await stop();
          await start(ids, 30, 120, 60);
          const fixtures = [];
          for (let n = 0; n < 8; n++) {
            const r = await rental();
            await prepare(r.id);
            if (n === 0) {
              assert.equal(
                (
                  await check(r.id, borrower, "PICKUP", {
                    mode: "unavailable",
                    reason: "DENIED",
                    latitude: undefined,
                    longitude: undefined,
                    accuracy: undefined,
                    timestamp: undefined,
                  })
                ).status,
                200,
              );
              for (const actor of [owner, borrower])
                assert.equal(
                  (
                    await op(r.id, "fallback", actor, {
                      purpose: "PICKUP",
                      reason: "Synthetic reduced-assurance timing test",
                      acknowledged: true,
                    })
                  ).status,
                  200,
                );
            }
            const issued = await op(r.id, "issue", owner, {
              purpose: "PICKUP",
            });
            assert.equal(issued.status, 200);
            const payload = {
              purpose: "PICKUP",
              challengeId: issued.json.challengeId,
              manualCode: issued.json.manualCode,
              requestKey: randomUUID(),
            };
            const verified = await op(r.id, "verify", borrower, payload);
            assert.equal(verified.status, 200);
            fixtures.push({
              r,
              c: issued.json,
              payload,
              deadline: verified.json.confirmationExpiresAt,
            });
          }
          const [
            delayed,
            timeout,
            replaced,
            changed,
            participant,
            recheck,
            disputed,
            returned,
          ] = fixtures;
          const submission = (f: typeof delayed) => ({
            ...evidence,
            meetupChallengeId: f.c.challengeId,
            physicalReceipt: true,
          });
          const finish = (f: typeof delayed) =>
            api(
              `/api/bookings/${f.r.id}/handoff`,
              borrower,
              "POST",
              submission(f),
            );
          // Create a return proof while the pickup proof is still valid.
          assert.equal((await finish(returned)).status, 200);
          assert.equal(
            (
              await api(
                `/api/bookings/${returned.r.id}/return`,
                borrower,
                "POST",
                evidence,
              )
            ).status,
            200,
          );
          for (const actor of [owner, borrower])
            assert.equal(
              (await check(returned.r.id, actor, "RETURN")).status,
              200,
            );
          const returnCode = (
            await op(returned.r.id, "issue", borrower, { purpose: "RETURN" })
          ).json;
          const returnPayload = {
            purpose: "RETURN",
            challengeId: returnCode.challengeId,
            manualCode: returnCode.manualCode,
            requestKey: randomUUID(),
          };
          assert.equal(
            (await op(returned.r.id, "verify", owner, returnPayload)).status,
            200,
          );
          const returnReceipt = {
            meetupChallengeId: returnCode.challengeId,
            physicalReceipt: true,
          };
          // Replacement revokes even an already scanned challenge.
          assert.equal(
            (await op(replaced.r.id, "issue", owner, { purpose: "PICKUP" }))
              .status,
            200,
          );
          assert.equal((await finish(replaced)).status, 409);
          // Same state and timestamp, new monotonic version: still invalidates proof.
          await db.query(
            `UPDATE "Booking" SET notes='changed after scan' WHERE id=$1`,
            [changed.r.id],
          );
          assert.equal((await finish(changed)).status, 409);
          await db.query('UPDATE "Booking" SET "renterId"=$1 WHERE id=$2', [
            outsider.id,
            participant.r.id,
          ]);
          assert.equal((await finish(participant)).status, 403);
          assert.equal(
            (
              await api(
                `/api/bookings/${participant.r.id}/handoff`,
                outsider,
                "POST",
                submission(participant),
              )
            ).status,
            409,
          );
          assert.equal((await check(recheck.r.id, borrower)).status, 200);
          assert.equal((await finish(recheck)).status, 409);
          await db.query(
            `INSERT INTO "Dispute" ("bookingId","openedBy",reason,description,status) VALUES ($1,$2,'Test','After valid scan','OPEN')`,
            [disputed.r.id, borrower.id],
          );
          assert.equal((await finish(disputed)).status, 409);
          await db.query(
            `UPDATE "Booking" SET status='CANCELLED' WHERE id=$1`,
            [changed.r.id],
          );
          assert.equal((await finish(changed)).status, 409);
          // Real elapsed time, no clock mocks or mutation of protected timestamps.
          await new Promise((r) => setTimeout(r, 31000));
          await new Promise((r) => setTimeout(r, 31000));
          assert.ok(Date.parse(delayed.c.expiresAt) < Date.now());
          assert.ok(Date.parse(delayed.deadline) > Date.now());
          // The saved proof survives restart; a larger new setting cannot extend it.
          await stop();
          await start(ids, 30, 900, 60);
          const checksExpired = await db.query(
            'SELECT "expiresAt" FROM "MeetupCheckIn" WHERE "bookingId"=$1',
            [delayed.r.id],
          );
          assert.ok(
            checksExpired.rows.every((r) => r.expiresAt.getTime() < Date.now()),
            "Saved arrival time expiry does not truncate confirmation",
          );
          const delayedStatus = await api(
            `/api/bookings/${delayed.r.id}/meetup/status`,
            borrower,
          );
          assert.equal(
            (
              delayedStatus.json.challenge as unknown as {
                confirmationEligible: boolean;
              }
            ).confirmationEligible,
            true,
          );
          const retry = await op(
            delayed.r.id,
            "verify",
            borrower,
            delayed.payload,
          );
          assert.equal(retry.status, 200);
          assert.equal(retry.json.replayed, true);
          assert.equal(
            retry.json.confirmationExpiresAt,
            delayed.deadline,
            "Retry cannot extend the window",
          );
          const before = await db.query(
            `SELECT count(*)::int n FROM "MeetupEvent" WHERE "challengeId"=$1 AND kind='CHALLENGE_VERIFIED'`,
            [delayed.c.challengeId],
          );
          assert.equal(before.rows[0].n, 1);
          assert.equal((await finish(delayed)).status, 200);
          assert.equal((await finish(delayed)).json.replayed, true);
          assert.equal(
            (await op(returned.r.id, "verify", owner, returnPayload)).json
              .replayed,
            true,
          );
          assert.equal(
            (await op(returned.r.id, "receipt", owner, returnReceipt)).status,
            200,
          );
          assert.equal(
            (await op(returned.r.id, "receipt", owner, returnReceipt)).json
              .replayed,
            true,
          );
          assert.equal(
            (await detail(returned.r.id)).json.booking.status,
            "INSPECTION",
          );
          assert.equal(
            (
              await api(
                `/api/bookings/${returned.r.id}/inspection`,
                owner,
                "POST",
                { ...evidence, acceptable: true },
              )
            ).status,
            200,
          );
          assert.equal(
            (await detail(returned.r.id)).json.booking.status,
            "COMPLETED",
          );
          // Allow original check-ins AND the saved confirmation window to expire.
          await new Promise((r) => setTimeout(r, 31000));
          await new Promise((r) => setTimeout(r, 31000));
          assert.equal((await finish(timeout)).status, 409);
          assert.equal(
            (await op(timeout.r.id, "verify", borrower, timeout.payload))
              .status,
            409,
          );
          assert.equal(
            (await detail(timeout.r.id)).json.booking.status,
            "HANDOFF_PENDING",
          );
          await assert.rejects(
            db.query(
              `UPDATE "MeetupChallenge" SET "confirmationExpiresAt"="confirmationExpiresAt"+interval '1 second' WHERE id=$1`,
              [timeout.c.challengeId],
            ),
            /immutable/,
          );
          await stop();
          await start(ids);
        },
      );
      } else { await stop(); await start(ids); }
      await t.test(
        "two real mobile browser sessions: GPS permission, actual camera QR, drafts, reduced return, restart and screenshots",
        async () => {
          const browserRental = await rental(),
            id = browserRental.id;
          const media = path.join(artifact, "pickup.y4m");
          // Initialize a valid fixture video; replace with this booking's QR before opening the camera.
          await writeFile(
            path.join(artifact, "qr.png"),
            await QRCode.toBuffer("placeholder"),
          );
          const encodeVideo = (target = media) =>
            execFileSync("ffmpeg", [
              "-y",
              "-loglevel",
              "error",
              "-loop",
              "1",
              "-i",
              path.join(artifact, "qr.png"),
              "-t",
              "2",
              "-vf",
              "scale=480:480,pad=640:480:80:0:white",
              "-r",
              "10",
              "-pix_fmt",
              "yuv420p",
              target,
            ]);
          encodeVideo();
          browser = await chromium.launch({
            executablePath: process.env.MRT_BROWSER_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: [
              "--use-fake-device-for-media-stream",
              `--use-file-for-fake-video-capture=${media}`,
              "--use-fake-ui-for-media-stream",
            ],
          });
          const ownerContext = await browser.newContext({
            timezoneId: "Asia/Taipei",
            viewport: { width: 390, height: 844 },
            geolocation: { ...point, accuracy: 10 },
            permissions: ["geolocation", "camera"],
          });
          let borrowerContext = await browser.newContext({
            timezoneId: "Asia/Taipei",
            viewport: { width: 390, height: 844 },
            geolocation: { ...point, accuracy: 10 },
            permissions: ["geolocation", "camera"],
          });
          let opage = await ownerContext.newPage();
          let bpage = await borrowerContext.newPage();
          for (const [page, actor] of [
            [opage, owner],
            [bpage, borrower],
          ] as [Page, Actor][]) {
            await page.goto(base + "/login");
            await page
              .getByLabel("Email address", { exact: true })
              .fill(actor.email);
            await page.getByLabel("Password", { exact: true }).fill(password);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click();
            await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
            await page.goto(`${base}/bookings/${id}`);
            page.on("dialog", (dialog) => void dialog.accept());
          }
          await opage
            .getByRole("button", {
              name: "Enable isolated meetup preview",
              exact: true,
            })
            .click();
          await expect(
            bpage.getByRole("button", { name: "I've Arrived", exact: true }),
          ).toBeVisible({ timeout: 15000 });
          for (const page of [opage, bpage])
            await page
              .getByRole("button", { name: "I've Arrived", exact: true })
              .click();
          await expect(opage.getByText(/Owner: Location verified/)).toBeVisible(
            { timeout: 15000 },
          );
          await expect(
            opage.getByText(/Borrower: Location verified/),
          ).toBeVisible({ timeout: 15000 });
          async function fillEvidence(page: Page, title: string) {
            const form = page.locator("form").filter({
              has: page.getByRole("heading", { name: title, exact: true }),
            });
            for (const select of await form.locator("select").all())
              await select.selectOption("yes");
            await form
              .getByLabel("Condition notes", { exact: true })
              .fill("Synthetic equipment inspected independently");
            await form.locator('input[type="file"]').setInputFiles({
              name: "camera.png",
              mimeType: "image/png",
              buffer: photo,
            });
            await form.locator('input[type="checkbox"]').last().check();
            return form;
          }
          await (await fillEvidence(opage, "Submit owner handoff"))
            .getByRole("button", { name: "Submit owner handoff", exact: true })
            .click();
          await expect(
            opage.getByText("HANDOFF_PENDING", { exact: true }),
          ).toBeVisible({ timeout: 15000 });
          const issuance = opage.waitForResponse(
            (r) =>
              r.url().endsWith(`/api/bookings/${id}/meetup/issue`) &&
              r.request().method() === "POST",
          );
          await opage
            .getByRole("button", { name: "Generate Pickup QR", exact: true })
            .click();
          const issued = (await (await issuance).json()) as Payload;
          if(process.env.MRT_TEST_CAMERA_ONLY==="1")pickup=issued;
          await writeFile(
            path.join(artifact, "qr.png"),
            await QRCode.toBuffer(issued.qrPayload, { width: 480, margin: 4 }),
          );
          encodeVideo();
          const screenshots = path.join(artifact, "screenshots");
          await mkdir(screenshots, { recursive: true });
          await expect(
            opage.getByAltText("Pickup one-time verification QR", {
              exact: true,
            }),
          ).toBeVisible();
          await opage.screenshot({
            path: path.join(screenshots, "00-owner-pickup-qr.png"),
            fullPage: true,
          });
          // Initialize the scanner process only after its real QR video exists.
          // Chromium may initialize/cache fake capture sources before getUserMedia.
          const borrowerLogin = await borrowerContext.storageState();
          await borrowerContext.close();
          cameraBrowser = await chromium.launch({
            executablePath: process.env.MRT_BROWSER_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: [
              "--use-fake-device-for-media-stream",
              `--use-file-for-fake-video-capture=${media}`,
              "--use-fake-ui-for-media-stream",
            ],
          });
          borrowerContext = await cameraBrowser.newContext({
            storageState: borrowerLogin,
            timezoneId: "Asia/Taipei",
            viewport: { width: 390, height: 844 },
            geolocation: { ...point, accuracy: 10 },
            permissions: ["geolocation", "camera"],
          });
          bpage = await borrowerContext.newPage();
          const savePickup=await observeCamera(bpage,"pickup");
          cameraSavers.push(savePickup);
          bpage.on("dialog", (dialog) => void dialog.accept());
          await bpage.goto(`${base}/bookings/${id}`);
          await bpage
            .getByRole("button", { name: "Scan Pickup QR", exact: true })
            .click();
          try { await expect(bpage.getByText(/Verified booking/)).toBeVisible({ timeout: 20000 }); }
          finally { await savePickup(); }
          assert.equal((await db.query(`SELECT count(*)::int n FROM "MeetupEvent" WHERE "challengeId"=$1 AND kind='CHALLENGE_VERIFIED'`,[issued.challengeId])).rows[0].n,1);
          assert.equal(await bpage.locator("video").evaluate(v=>!(v as HTMLVideoElement).srcObject || ((v as HTMLVideoElement).srcObject as MediaStream).getTracks().every(t=>t.readyState==="ended")),true);
          assert.equal(
            (await detail(id)).json.booking.status,
            "HANDOFF_PENDING",
          );
          const borrowerForm = await fillEvidence(
            bpage,
            "Confirm receipt as borrower",
          );
          await borrowerForm
            .getByLabel("Condition notes", { exact: true })
            .fill("Recoverable equipment draft after refresh");
          await bpage.reload();
          await expect(
            bpage.getByLabel("Condition notes", { exact: true }),
          ).toHaveValue("Recoverable equipment draft after refresh");
          const resumed = await fillEvidence(
            bpage,
            "Confirm receipt as borrower",
          );
          await resumed
            .getByLabel(
              "I have physically received the equipment after inspecting it.",
            )
            .check();
          await expect(bpage.getByText(/QR scanning deadline:/)).toBeVisible();
          await expect(
            bpage.getByText(
              /Complete physical receipt and required checklist within/,
            ),
          ).toBeVisible();
          await bpage.screenshot({
            path: path.join(screenshots, "01-pickup-verified.png"),
            fullPage: true,
          });
          await resumed
            .getByRole("button", {
              name: "Confirm receipt as borrower",
              exact: true,
            })
            .click();
          await expect(bpage.getByText("IN_USE", { exact: true })).toBeVisible({
            timeout: 15000,
          });
          await (await fillEvidence(bpage, "Submit item return"))
            .getByRole("button", { name: "Submit item return", exact: true })
            .click();
          await expect(
            bpage.getByText("RETURN_PENDING", { exact: true }),
          ).toBeVisible({ timeout: 15000 });
          await opage.reload();
          // Actual denied browser geolocation (no grant); the explicit unavailable path also covers timeout/device failure.
          await ownerContext.clearPermissions();
          await opage
            .getByRole("button", { name: "I've Arrived", exact: true })
            .click();
          await expect(
            opage.getByText(/Owner: Location unavailable/),
          ).toBeVisible({ timeout: 20000 });
          await bpage
            .getByRole("button", {
              name: "Location unavailable — record this honestly",
              exact: true,
            })
            .click();
          for (const page of [opage, bpage]) {
            await page
              .getByLabel("Fallback reason", { exact: true })
              .fill(
                "Underground GPS unavailable; reduced assurance acknowledged",
              );
            await page
              .getByLabel(
                "I acknowledge that location is not verified and want to proceed at reduced assurance.",
              )
              .check();
            await page
              .getByRole("button", {
                name: "Record my reduced-assurance acknowledgement",
                exact: true,
              })
              .click();
          }
          const returnIssuance=bpage.waitForResponse(r=>r.url().endsWith(`/api/bookings/${id}/meetup/issue`)&&r.request().method()==="POST");
          await bpage
            .getByRole("button", { name: "Generate Return QR", exact: true })
            .click();
          await expect(bpage.getByText(/One-time manual code:/)).toBeVisible();
          await bpage.screenshot({
            path: path.join(screenshots, "02-return-reduced-assurance.png"),
            fullPage: true,
          });
          await opage.evaluate(() => {
            navigator.mediaDevices.getUserMedia = async () => {
              throw new DOMException(
                "Test permission denial",
                "NotAllowedError",
              );
            };
          });
          await opage
            .getByRole("button", { name: "Scan Return QR", exact: true })
            .click();
          await expect(
            opage.getByText(
              "Camera unavailable or permission denied. Use the one-time manual code.",
              { exact: true },
            ),
          ).toBeVisible();
          const returnIssued=(await (await returnIssuance).json()) as Payload;
          const returnMedia=path.join(artifact,"return.y4m");
          await writeFile(path.join(artifact,"qr.png"),await QRCode.toBuffer(returnIssued.qrPayload,{width:480,margin:4}));
          encodeVideo(returnMedia);
          const ownerLogin=await ownerContext.storageState();await opage.close();
          returnBrowser=await chromium.launch({executablePath:process.env.MRT_BROWSER_PATH??"/usr/bin/chromium",headless:true,args:["--use-fake-device-for-media-stream",`--use-file-for-fake-video-capture=${returnMedia}`,"--use-fake-ui-for-media-stream"]});
          const returnContext=await returnBrowser.newContext({storageState:ownerLogin,timezoneId:"Asia/Taipei",viewport:{width:390,height:844},permissions:["camera"]});
          opage=await returnContext.newPage();const saveReturn=await observeCamera(opage,"return");cameraSavers.push(saveReturn);
          opage.on("dialog",dialog=>void dialog.accept());
          await opage.goto(`${base}/bookings/${id}`);
          const beforeScan=(await detail(id)).json.booking.status;assert.equal(beforeScan,"RETURN_PENDING");
          await opage.getByRole("button",{name:"Scan Return QR",exact:true}).click();
          try{await expect(opage.getByText(/Verified booking/)).toBeVisible({timeout:20000});}finally{await saveReturn();}
          assert.equal((await db.query(`SELECT count(*)::int n FROM "MeetupEvent" WHERE "challengeId"=$1 AND kind='CHALLENGE_VERIFIED'`,[returnIssued.challengeId])).rows[0].n,1);
          assert.equal((await detail(id)).json.booking.status,"RETURN_PENDING","Camera verification alone cannot record physical return");
          // Disconnect the dev-server HMR clients before restart; retain real authenticated browser contexts.
          await opage.goto("about:blank");
          await bpage.goto("about:blank");
          await stop();
          await start(ids);
          await opage.goto(`${base}/bookings/${id}`);
          await expect(
            opage.getByLabel(
              "I have physically received the returned equipment. This does not accept its condition.",
            ),
          ).toBeVisible();
          await opage
            .getByLabel(
              "I have physically received the returned equipment. This does not accept its condition.",
            )
            .check();
          await opage
            .getByRole("button", {
              name: "Acknowledge physical return and begin inspection",
              exact: true,
            })
            .click();
          await expect(
            opage.getByText("INSPECTION", { exact: true }),
          ).toBeVisible({ timeout: 15000 });
          // Genuine camera/QR/physical receipt has committed, before acceptance.
          await assertInvestigationReceipt(id,"camera");
          await opage.screenshot({
            path: path.join(screenshots, "03-return-received-inspection.png"),
            fullPage: true,
          });
          const inspection = opage.locator("form").filter({
            has: opage.getByRole("heading", {
              name: "Save owner inspection decision",
              exact: true,
            }),
          });
          for (const select of await inspection.locator("select").all()) {
            const label = await select.locator("option").allTextContents();
            await select.selectOption(
              label.some((s) => s.includes("Acceptable"))
                ? "acceptable"
                : "yes",
            );
          }
          await inspection.locator('input[type="checkbox"]').check();
          await inspection
            .getByRole("button", {
              name: "Save owner inspection decision",
              exact: true,
            })
            .click();
          await expect(
            opage.getByText("COMPLETED", { exact: true }),
          ).toBeVisible({ timeout: 15000 });
          await opage.screenshot({
            path: path.join(screenshots, "04-rental-completed.png"),
            fullPage: true,
          });
          const overflow = await opage.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          );
          assert.equal(overflow, false);
          assert.equal((await detail(id)).json.booking.status, "COMPLETED");
          await returnBrowser.close();returnBrowser=undefined;
          await cameraBrowser.close();
          cameraBrowser = undefined;
          await browser.close();
          browser = undefined;
        },
      );
      await t.test("manual-code browser response-loss recovery (separate from camera acceptance)",async()=>{
        const r=await rental(),id=r.id;await prepare(id);
        const pickup=(await op(id,"issue",owner,{purpose:"PICKUP"})).json;
        assert.equal((await op(id,"verify",borrower,{purpose:"PICKUP",challengeId:pickup.challengeId,manualCode:pickup.manualCode,requestKey:randomUUID()})).status,200);
        assert.equal((await api(`/api/bookings/${id}/handoff`,borrower,"POST",{...evidence,meetupChallengeId:pickup.challengeId,physicalReceipt:true})).status,200);
        assert.equal((await api(`/api/bookings/${id}/return`,borrower,"POST",evidence)).status,200);
        for(const actor of [owner,borrower])assert.equal((await check(id,actor,"RETURN")).json.checkIn.outcome,"VERIFIED");
        const returned=(await op(id,"issue",borrower,{purpose:"RETURN"})).json;
        browser=await chromium.launch({executablePath:process.env.MRT_BROWSER_PATH??"/usr/bin/chromium",headless:true});
        const ctx=await browser.newContext();await ctx.addCookies([{name:"p2p_session",value:owner.cookie.slice("p2p_session=".length),url:base}]);const opage=await ctx.newPage();
        await opage.goto(`${base}/bookings/${id}`);
          const manual=returned.manualCode;
          await opage
            .getByLabel("One-time return code", { exact: true })
            .fill(manual);
          // Lose the response after the real server commits. A retry must reuse the same browser request key.
          let droppedResponse = false;
          await opage.route(
            `**/api/bookings/${id}/meetup/verify`,
            async (route) => {
              if (!droppedResponse) {
                droppedResponse = true;
                const response = await route.fetch();
                assert.equal(response.status(), 200);
                await route.abort("connectionreset");
              } else await route.continue();
            },
          );
          await opage
            .getByRole("button", { name: "Verify return code", exact: true })
            .click();
          await expect(
            opage
              .getByRole("region", { name: "MRT meetup verification" })
              .getByRole("alert"),
          ).toContainText(/fetch|network|connection/i);
          const retryResponse = opage.waitForResponse(
            (r) =>
              r.url().endsWith(`/api/bookings/${id}/meetup/verify`) &&
              r.status() === 200,
          );
          await opage
            .getByRole("button", { name: "Verify return code", exact: true })
            .click();
          assert.equal((await (await retryResponse).json()).replayed, true);
          await opage.unroute(`**/api/bookings/${id}/meetup/verify`);
          await expect(opage.getByText(/Verified booking/)).toBeVisible();

        assert.equal((await detail(id)).json.booking.status,"RETURN_PENDING");
        await browser.close();browser=undefined;
      });
      await t.test("camera negatives: invalid content, initialization failure, interruption, cancellation and navigation cleanup",async()=>{
        const r=await rental(),id=r.id;await prepare(id);
        const invalid=path.join(artifact,"invalid-camera.y4m"),blank=path.join(artifact,"blank-camera.y4m"),png=path.join(artifact,"negative-camera.png");
        await writeFile(png,await QRCode.toBuffer("https://fixture.invalid/not-a-meetup",{width:480,margin:4}));
        execFileSync("ffmpeg",["-y","-loglevel","error","-loop","1","-i",png,"-t","2","-vf","scale=480:480,pad=640:480:80:0:white","-r","10","-pix_fmt","yuv420p",invalid]);
        execFileSync("ffmpeg",["-y","-loglevel","error","-f","lavfi","-i","color=white:size=640x480:rate=10","-t","2","-pix_fmt","yuv420p",blank]);
        const make=async(file:string,label:string)=>{
          const instance=await chromium.launch({executablePath:process.env.MRT_BROWSER_PATH??"/usr/bin/chromium",headless:true,args:["--use-fake-device-for-media-stream",`--use-file-for-fake-video-capture=${file}`,"--use-fake-ui-for-media-stream"]});
          const context=await instance.newContext({permissions:["camera"]});await context.addCookies([{name:"p2p_session",value:borrower.cookie.slice("p2p_session=".length),url:base}]);
          const page=await context.newPage();const save=await observeCamera(page,label);await page.goto(`${base}/bookings/${id}`);return {instance,page,save};
        };
        const bad=await make(invalid,"invalid-content");
        try{await bad.page.getByRole("button",{name:"Scan Pickup QR",exact:true}).click();await expect(bad.page.getByText("This QR does not match this booking and stage.",{exact:true})).toBeVisible();const diag=await bad.save();assert.ok(!(diag as {events:{operation?:string}[]}).events.some(e=>e.operation==="verify"));}finally{await bad.save();await bad.instance.close();}
        const live=await make(blank,"lifecycle");
        try{
          await live.page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;Object.assign(window,{__testCanvasContext:original});HTMLCanvasElement.prototype.getContext=(()=>null) as typeof original;});
          await live.page.getByRole("button",{name:"Scan Pickup QR",exact:true}).click();
          await expect(live.page.getByText("Camera unavailable or permission denied. Use the one-time manual code.",{exact:true})).toBeVisible();
          await live.page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=(window as unknown as {__testCanvasContext:typeof HTMLCanvasElement.prototype.getContext}).__testCanvasContext;});
          await live.page.getByRole("button",{name:"Scan Pickup QR",exact:true}).click();
          await expect.poll(()=>live.page.locator('video').evaluate(v=>((v as HTMLVideoElement).srcObject as MediaStream|null)?.getVideoTracks()[0]?.readyState)).toBe("live");
          await live.page.locator('video').evaluate(v=>{const tracks=((v as HTMLVideoElement).srcObject as MediaStream).getVideoTracks();for(const t of tracks){t.stop();t.dispatchEvent(new Event('ended'));}});
          await expect(live.page.getByText("Camera stopped. Restart scanning or use the one-time manual code.",{exact:true})).toBeVisible();
          await live.page.getByRole("button",{name:"Scan Pickup QR",exact:true}).click();
          await expect.poll(()=>live.page.locator('video').evaluate(v=>((v as HTMLVideoElement).srcObject as MediaStream|null)?.getVideoTracks()[0]?.readyState)).toBe("live");
          await live.page.getByRole("button",{name:"Stop camera",exact:true}).click();
          assert.equal(await live.page.locator('video').evaluate(v=>!(v as HTMLVideoElement).srcObject || ((v as HTMLVideoElement).srcObject as MediaStream).getTracks().every(t=>t.readyState==='ended')),true);
          await live.page.getByRole("button",{name:"Scan Pickup QR",exact:true}).click();
          await expect.poll(()=>live.page.locator('video').evaluate(v=>((v as HTMLVideoElement).srcObject as MediaStream|null)?.getVideoTracks()[0]?.readyState)).toBe("live");
          const track=await live.page.locator('video').evaluateHandle(v=>((v as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]);
          await live.page.getByRole('link',{name:'← Back to dashboard',exact:true}).click({noWaitAfter:true});await expect(live.page).toHaveURL(base+'/dashboard');
          try{assert.equal(await track.evaluate(t=>t.readyState),'ended');}catch(error){assert.match(String(error),/Execution context was destroyed|Cannot find context|JSHandle is disposed/);}
          const diag=await live.save();assert.ok(!(diag as {events:{operation?:string}[]}).events.some(e=>e.operation==='verify'));
        }finally{await live.save();await live.instance.close();}
        assert.equal((await detail(id)).json.booking.status,"HANDOFF_PENDING");
        await writeFile(path.join(artifact,"camera-negative-evidence.json"),JSON.stringify({invalidQrDeniedBeforeRequest:true,initializationFailureStopsStream:true,interruptedTrackReported:true,restartAndStopCleanup:true,navigationReleasesTrack:true,noVerificationOrCustodyMutation:true},null,2));
      });
      const logs = readFileSync(logPath, "utf8");
      assert.ok(!logs.includes(pickup!.qrPayload));
      assert.ok(!logs.includes(pickup!.qrPayload.split(":").at(-1)!));
      assert.ok(!logs.includes(serverSecret));
    } finally {
      for(const save of cameraSavers)await save().catch(()=>{});
      if (browser || cameraBrowser || returnBrowser) {
        let n = 0;
        // Include the separate synthetic-camera browser: otherwise a failed
        // borrower scan only preserves the owner's screen and hides the failure.
        for (const context of [browser, cameraBrowser,returnBrowser].flatMap((instance) => instance?.contexts() ?? []))
          for (const page of context.pages()) {
            await writeFile(path.join(artifact, `browser-diagnostics-${n}.json`), JSON.stringify(await page.evaluate(() => {
              const video = document.querySelector("video");
              return { video: video ? { readyState: video.readyState, networkState: video.networkState, width: video.videoWidth, height: video.videoHeight, paused: video.paused } : null };
            }).catch(() => ({ pageUnavailable: true })), null, 2), { mode: 0o600 });
            await page
              .screenshot({
                path: path.join(artifact, `browser-failure-${n}.png`),
                fullPage: true,
              })
              .catch(() => {});
            await writeFile(
              path.join(artifact, `browser-failure-${n++}.html`),
              await page.content(),
            ).catch(() => {});
          }
      }
      await cameraBrowser?.close();
      await returnBrowser?.close();
      await browser?.close();
      await stop();
      closeSync(log);
      await db.end();
    }
  },
);
