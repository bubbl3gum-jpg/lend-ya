import {meetupFixture} from "./support/meetup-fixture";
import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { resolveBookingPolicy } from "../lib/booking-policy";
import { Pool } from "pg";
import { reservationRegressions } from "./support/reservation-regressions";

// Run against a migrated, disposable test database and its matching Next server.
// Never points at DATABASE_URL implicitly: explicit test configuration is required.
test("real booking API: two-user persistence, validation, privacy, history and concurrent acceptance", async (t) => {
  assert.ok(
    process.env.TEST_DATABASE_URL &&
      new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test"),
    "Set TEST_DATABASE_URL to an isolated migrated database.",
  );
  assert.ok(
    process.env.TEST_BASE_URL,
    "Start Next against TEST_DATABASE_URL and set TEST_BASE_URL.",
  );
  const ownedDatabase = await connectTestDatabase();
  await ownedDatabase.end();
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const tag = randomUUID();
  const users: number[] = [];
  let listingId: number | undefined;
  let stationId: number | undefined;
  const api = async (
    path: string,
    cookie = "",
    method = "GET",
    body?: unknown,
  ) => {
    const response = await fetch(`${process.env.TEST_BASE_URL}${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    assert.ok(
      raw,
      `${method} ${path}: HTTP ${response.status} returned no JSON; inspect the Next server log.`,
    );
    const result = JSON.parse(raw);
    return {
      status: response.status,
      result,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  try {
    const register = async (role: string) => {
      const r = await api("/api/auth/register", "", "POST", {
        name: role,
        email: `${role}-${tag}@example.test`,
        password: "IsolatedTest123!",
      });
      assert.equal(r.status, 201);
      const row = await pool.query('SELECT id FROM "User" WHERE email=$1', [
        `${role}-${tag}@example.test`,
      ]);
      users.push(row.rows[0].id);
      assert.ok(r.cookie);
      return { id: row.rows[0].id as number, cookie: r.cookie };
    };
    const owner = await register("owner");
    const borrower = await register("borrower");
    const outsider = await register("outsider");
    stationId = (
      await pool.query("SELECT id FROM \"MrtStation\" WHERE code='TPE'")
    ).rows[0].id;
    listingId = (
      await pool.query(
        'INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,"updatedAt") VALUES ($1,$2,$2,\'Electronics\',12.34,25.67,\'Good\',NOW()) RETURNING id',
        [owner.id, tag],
      )
    ).rows[0].id;
    await pool.query(
      'INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)',
      [listingId, stationId],
    );
    await pool.query(
      'INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,\'image/png\',\'PHOTO\')',
      [listingId, "/uploads/listings/booking-test-fixture.png"],
    );
    const input = {
      listingId,
      meetingStationId: stationId,
      startAt: "2035-01-01T10:00+08:00",
      endAt: "2035-01-02T10:01+08:00",
      notes: "test",
    };
    const create = (cookie = borrower.cookie, overrides = {}) =>
      api("/api/bookings", cookie, "POST", { ...input, ...overrides });
    await t.test("creation validation and authorization", async () => {
      assert.equal((await create("")).status, 401);
      assert.equal((await create(owner.cookie)).status, 409);
      for (const override of [
        { meetingStationId: 2147483647 },
        { startAt: "2020-01-01T10:00+08:00" },
        { endAt: input.startAt },
        { startAt: "2035-02-30T10:00+08:00" },
        { endAt: "2036-01-01T10:00+08:00" },
        { notes: "a".repeat(2001) },
        { notes: {} },
      ])
        assert.equal((await create(borrower.cookie, override)).status, 400);
      await pool.query("UPDATE \"Listing\" SET status='INACTIVE' WHERE id=$1", [
        listingId,
      ]);
      assert.equal((await create()).status, 409);
      await pool.query("UPDATE \"Listing\" SET status='ACTIVE' WHERE id=$1", [
        listingId,
      ]);
    });
    await t.test(
      "server quotation, moderation, overflow and invalid identifiers",
      async () => {
        const quoted = await create(borrower.cookie, { quote: true });
        assert.equal(quoted.status, 200);
        assert.equal(quoted.result.quote.days, 2);
        assert.equal(quoted.result.quote.totalPrice, "24.68");
        assert.equal(
          (
            await pool.query(
              'SELECT COUNT(*)::int AS count FROM "Booking" WHERE "listingId"=$1',
              [listingId],
            )
          ).rows[0].count,
          0,
        );
        assert.equal(
          (await create(borrower.cookie, { expectedQuote: "stale" })).status,
          409,
        );
        await pool.query(
          'UPDATE "Listing" SET price=9999999999.99 WHERE id=$1',
          [listingId],
        );
        assert.equal((await create()).status, 400);
        await pool.query('UPDATE "Listing" SET price=12.34 WHERE id=$1', [
          listingId,
        ]);
        await pool.query(
          'INSERT INTO "ListingReport" ("listingId","reporterId",reason) VALUES ($1,$2,$3)',
          [listingId, outsider.id, "test"],
        );
        assert.equal((await create()).status, 409);
        await pool.query('DELETE FROM "ListingReport" WHERE "listingId"=$1', [
          listingId,
        ]);
        for (const id of ["abc", "2147483648", "0"])
          assert.equal(
            (await api(`/api/bookings/${id}`, borrower.cookie)).status,
            400,
          );
        assert.equal(
          (await api("/api/bookings/2147483647", borrower.cookie)).status,
          404,
        );
      },
    );
    const a = await create(borrower.cookie, {
      ownerId: outsider.id,
      renterId: outsider.id,
      status: "CONFIRMED",
      totalPrice: 0,
      deposit: 0,
    });
    const b = await create();
    assert.equal(a.status, 201);
    assert.equal(b.status, 201, "overlapping PENDING requests permitted");
    const id = a.result.booking.id;
    assert.equal(a.result.booking.ownerId, owner.id);
    assert.equal(a.result.booking.renterId, borrower.id);
    assert.equal(a.result.booking.status, "PENDING");
    assert.equal(a.result.booking.totalPrice, "24.68");
    assert.equal(a.result.booking.deposit, "25.67");
    assert.equal(a.result.booking.startAt, "2035-01-01T02:00:00.000Z");
    const patch = (bookingId: number, cookie: string, action: string, extra = {}) =>
      api(`/api/bookings/${bookingId}`, cookie, "PATCH", {
        action,
        ...(action==="inspect"?{}:{reason:"test reason"}),
        ...extra,
      });
    await t.test(
      "private detail, owner-only approval and concurrent reservation",
      async () => {
        assert.equal(
          (await api(`/api/bookings/${id}`, outsider.cookie)).status,
          403,
        );
        assert.equal((await patch(id, borrower.cookie, "accept")).status, 403);
        assert.equal((await patch(id, outsider.cookie, "cancel")).status, 403);
        const results = await Promise.all([
          patch(id, owner.cookie, "accept"),
          patch(b.result.booking.id, owner.cookie, "accept"),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        const reserved = await pool.query(
          'SELECT COUNT(*)::int AS count FROM "Booking" WHERE "listingId"=$1 AND status=\'CONFIRMED\'',
          [listingId],
        );
        assert.equal(reserved.rows[0].count, 1);
        assert.equal(
          (await create()).status,
          409,
          "confirmed overlap blocks creation",
        );
      },
    );
    await t.test(
      "history, immutable prices, cancellation and rejection",
      async () => {
        await pool.query(
          'UPDATE "Listing" SET price=99,deposit=100 WHERE id=$1',
          [listingId],
        );
        const detail = await api(`/api/bookings/${id}`, borrower.cookie);
        assert.equal(detail.status, 200);
        assert.equal(detail.result.booking.totalPrice, "24.68");
        assert.equal(detail.result.booking.deposit, "25.67");
        assert.ok(!JSON.stringify(detail.result).includes("passwordHash"));
        for (const person of [owner, borrower]) {
          const history = await api("/api/bookings", person.cookie);
          assert.ok(
            history.result.bookings.some((r: { id: number }) => r.id === id),
          );
        }
        const rows = (
          await pool.query(
            'SELECT id,status FROM "Booking" WHERE "listingId"=$1',
            [listingId],
          )
        ).rows;
        const confirmed = rows.find((r) => r.status === "CONFIRMED").id;
        const pending = rows.find((r) => r.status === "PENDING").id;
        assert.equal(
          (await patch(confirmed, borrower.cookie, "cancel")).status,
          200,
        );
        assert.equal(
          (await patch(pending, owner.cookie, "accept")).status,
          200,
          "cancellation releases reservation",
        );
        assert.equal(
          (await patch(pending, owner.cookie, "accept")).status,
          409,
        );
        const cancelled = (
          await pool.query('SELECT * FROM "Booking" WHERE id=$1', [confirmed])
        ).rows[0];
        assert.equal(cancelled.cancelledBy, borrower.id);
        assert.ok(cancelled.cancelledAt);
        assert.equal(
          (await patch(pending, owner.cookie, "cancel")).status,
          200,
        );
        const rejected = await create();
        assert.equal(rejected.status, 201);
        assert.equal(
          (await patch(rejected.result.booking.id, borrower.cookie, "reject"))
            .status,
          403,
        );
        assert.equal(
          (await patch(rejected.result.booking.id, owner.cookie, "reject"))
            .status,
          200,
        );
        assert.equal(
          (
            await api(
              `/api/bookings/${rejected.result.booking.id}`,
              borrower.cookie,
            )
          ).result.booking.status,
          "CANCELLED",
        );
      },
    );
    await t.test(
      "nonoverlap succeeds and active rentals protect overdue items",
      async () => {
        const first = await create();
        assert.equal(first.status, 201);
        assert.equal(
          (await patch(first.result.booking.id, owner.cookie, "accept")).status,
          200,
        );
        const later = await create(borrower.cookie, {
          startAt: "2035-02-01T10:00+08:00",
          endAt: "2035-02-02T10:00+08:00",
        });
        assert.equal(later.status, 201);
        assert.equal(
          (await patch(later.result.booking.id, owner.cookie, "accept")).status,
          200,
        );
        await patch(later.result.booking.id, owner.cookie, "cancel");
        const pending = await create(borrower.cookie, {
          startAt: "2035-03-01T10:00+08:00",
          endAt: "2035-03-02T10:00+08:00",
        });
        const evidence = {
          conditionConfirmed: true,
          returnConfirmed: true,
          checklist: {
            matchesItem: "yes",
            visuallyInspected: "yes",
            damageDocumented: "yes",
            accessoriesChecked: "not_applicable",
            functionTested: "unknown",
          },
        };
        const verification=meetupFixture(process.env.TEST_BASE_URL!,owner.cookie,borrower.cookie);
        const pickupProof=new Map<number,{meetupChallengeId:string;physicalReceipt:boolean}>(),returnProof=new Map<number,{meetupChallengeId:string;physicalReceipt:boolean}>();
        const stage = async (id: number, action: string, cookie: string) => {
          if(action==="handoff"&&cookie===owner.cookie) await verification.arrivals(id,"PICKUP");
          if(action==="return") await verification.arrivals(id,"RETURN");
          const result=await api(`/api/bookings/${id}/${action}`, cookie, "POST", {...evidence,...(action==="handoff"&&cookie===borrower.cookie?pickupProof.get(id):{})});
          if(result.status===200&&action==="handoff"&&cookie===owner.cookie) pickupProof.set(id,await verification.scanPayload(id,"PICKUP"));
          if(result.status===200&&action==="return") returnProof.set(id,await verification.scanPayload(id,"RETURN"));
          return result;
        };
        for (const [action, cookie] of [
          ["handoff", owner.cookie],
          ["handoff", borrower.cookie],
          ["return", borrower.cookie],
        ]) {
          assert.equal(
            (await stage(first.result.booking.id, action, cookie)).status,
            200,
          );
          assert.equal(
            (await patch(pending.result.booking.id, owner.cookie, "accept"))
              .status,
            409,
          );
        }
        assert.equal(
          (await patch(first.result.booking.id, owner.cookie, "inspect",returnProof.get(first.result.booking.id)))
            .status,
          200,
        );
        assert.equal(
          (await patch(pending.result.booking.id, owner.cookie, "accept"))
            .status,
          409,
        );
        assert.equal(
          (
            await api(
              `/api/bookings/${first.result.booking.id}/inspection`,
              owner.cookie,
              "POST",
              { ...evidence, acceptable: true },
            )
          ).status,
          200,
        );
        assert.equal(
          (await patch(pending.result.booking.id, owner.cookie, "accept"))
            .status,
          200,
        );
        const laterPending = await create(borrower.cookie, {
          startAt: "2035-04-01T10:00+08:00",
          endAt: "2035-04-02T10:00+08:00",
        });
        assert.equal(laterPending.status, 201);
        for (const [action, cookie] of [
          ["handoff", owner.cookie],
          ["handoff", borrower.cookie],
          ["return", borrower.cookie],
        ])
          assert.equal(
            (await stage(pending.result.booking.id, action, cookie)).status,
            200,
          );
        assert.equal(
          (
            await api(
              `/api/bookings/${pending.result.booking.id}/dispute`,
              owner.cookie,
              "POST",
              { reason: "Concern", description: "Actual disputed return" },
            )
          ).status,
          201,
        );
        assert.equal(
          (await patch(laterPending.result.booking.id, owner.cookie, "accept"))
            .status,
          409,
        );
      },
    );
    await t.test("strict instants, policy/Decimal boundaries, legacy replay and post-lock expiry", async () => {
      const policy = resolveBookingPolicy(process.env);
      const listing = (await pool.query(
        'INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,"updatedAt") VALUES ($1,$2,$2,\'Electronics\',12.34,25.67,\'Good\',NOW()) RETURNING id',
        [owner.id, `strict-${tag}`],
      )).rows[0].id;
      await pool.query('INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)', [listing, stationId]);
      await pool.query('INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,\'image/png\',\'PHOTO\')', [listing, "/uploads/listings/booking-test-fixture.png"]);
      const base = { ...input, listingId: listing, startAt: "2035-01-01T02:00:00.000Z", endAt: "2035-01-02T02:00:00.000Z" };
      const quote = (change = {}) => api("/api/bookings", borrower.cookie, "POST", { ...base, ...change, quote: true });
      const count = async () => (await pool.query('SELECT count(*)::int n FROM "Booking" WHERE "listingId"=$1', [listing])).rows[0].n;
      for (const change of [{ startAt: "2035-01-01T10:00" }, { startAt: "2035-02-30T10:00+08:00" },
        { startAt: "2035-01-01T02:00:00.0001Z" }, { startAt: "2035-01-01T02:00-00:00" },
        { endAt: base.startAt }, { notes: "😀".repeat(1001) }, { notes: " ".repeat(2001) }]) {
        assert.equal((await quote(change)).status, 400);
        assert.equal(await count(), 0);
      }
      const boundary = new Date(Date.parse(base.startAt) + policy.maxDurationDays * 86400000);
      assert.equal((await quote({ endAt: boundary.toISOString(), notes: "😀".repeat(1000) })).status, 200);
      assert.equal((await quote({ endAt: new Date(boundary.getTime() + 1).toISOString() })).status, 400);
      const offset = await quote({ startAt: "2035-01-01T10:00+08:00", endAt: "2035-01-01T21:00-05:00", totalPrice: "0.01", price: "0.01" });
      assert.equal(offset.status, 200);
      assert.equal(offset.result.quote.totalPrice, "12.34");
      assert.equal(offset.result.quote.startAt, base.startAt);
      assert.equal((await quote({ endAt: "2035-01-02T02:00:00.001Z" })).result.quote.totalPrice, "24.68");
      await pool.query('UPDATE "Listing" SET price=9999999999.99 WHERE id=$1', [listing]);
      assert.equal((await quote()).result.quote.totalPrice, "9999999999.99");
      assert.equal((await quote({ endAt: "2035-01-02T02:00:00.001Z" })).status, 400);
      await pool.query('UPDATE "Listing" SET price=4999999999.99 WHERE id=$1', [listing]);
      assert.equal((await quote({ endAt: "2035-01-03T02:00:00.000Z" })).result.quote.totalPrice, "9999999999.98");
      await pool.query('UPDATE "Listing" SET price=5000000000 WHERE id=$1', [listing]);
      assert.equal((await quote({ endAt: "2035-01-03T02:00:00.000Z" })).status, 400);
      await pool.query('UPDATE "Listing" SET price=12.34 WHERE id=$1', [listing]);
      assert.equal(await count(), 0, "Quotations/rejections must not persist bookings.");

      // Synthetic historical operation with the original canonical hash format.
      // No existing row/hash is rewritten, and its now-past 60-day window must
      // replay even when this suite is run with a configured 30-day maximum.
      const key = randomUUID();
      const legacy = { ...base, startAt: "2020-01-01T10:00", endAt: "2020-03-01T10:00", notes: " legacy notes " };
      const hash = createHash("sha256").update(JSON.stringify({ listingId: listing,
        startAt: "2020-01-01T02:00:00.000Z", endAt: "2020-03-01T02:00:00.000Z",
        meetingStationId: stationId, canonicalStationId: null, notes: "legacy notes" })).digest("hex");
      const historical = (await pool.query(
        'INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice",deposit,notes,"requestKey","requestHash","updatedAt") VALUES ($1,$2,$3,$4,\'2020-01-01 02:00\',\'2020-03-01 02:00\',\'CANCELLED\',12.34,740.40,25.67,\'legacy notes\',$5,$6,NOW()) RETURNING id',
        [listing, owner.id, borrower.id, stationId, key, hash],
      )).rows[0].id;
      const send = async (body: object, cookie = borrower.cookie, requestKey = key) => {
        const response = await fetch(`${process.env.TEST_BASE_URL}/api/bookings`, { method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json", "Idempotency-Key": requestKey }, body: JSON.stringify(body) });
        return { status: response.status, body: await response.json() };
      };
      const replay = await send(legacy);
      assert.equal(replay.status, 201);
      assert.equal(replay.body.booking.id, historical);
      assert.equal(replay.body.booking.totalPrice, "740.4");
      assert.equal((await send({ ...legacy, startAt: "2020-01-01T02:00Z", endAt: "2020-03-01T02:00Z" })).status, 201);
      assert.equal((await send({ ...legacy, notes: "altered" })).status, 409);
      assert.equal((await send({ ...legacy, expectedQuote: "wrong" })).status, 409);
      assert.equal((await send(legacy, outsider.cookie)).status, 400);
      assert.equal((await send(legacy, borrower.cookie, randomUUID())).status, 400);
      assert.equal((await send({ ...legacy, quote: true })).status, 400);
      assert.equal(await count(), 1);

      const blocker = await connectTestDatabase();
      let waiting: ReturnType<typeof send> | undefined;
      try {
        await blocker.query("BEGIN");
        await blocker.query('SELECT id FROM "Listing" WHERE id=$1 FOR UPDATE', [listing]);
        const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0].pid;
        const start = Date.now() + 2500;
        waiting = send({ ...base, startAt: new Date(start).toISOString(), endAt: new Date(start + 86400000).toISOString() }, borrower.cookie, randomUUID());
        let observed = false;
        for (let i = 0; i < 100; i++) {
          const rows = await pool.query("SELECT query FROM pg_stat_activity WHERE datname=current_database() AND $1=ANY(pg_blocking_pids(pid))", [pid]);
          if (rows.rows.some(r => String(r.query).includes("FOR UPDATE"))) { observed = true; break; }
          await new Promise(resolve => setTimeout(resolve, 15));
        }
        assert.ok(observed, "Must observe the real API waiting for the listing lock.");
        // Wait for the actual boundary, after deterministic lock observation.
        await new Promise(resolve => setTimeout(resolve, Math.max(0, start - Date.now() + 25)));
        await blocker.query("COMMIT");
        const expired = await waiting;
        assert.equal(expired.status, 400);
        assert.match(expired.body.error, /expired while waiting/);
        assert.equal(await count(), 1, "Expired lock wait must not insert a partial booking.");
        assert.equal((await pool.query('SELECT count(*)::int n FROM "MeetupSession" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=$1)', [listing])).rows[0].n, 0);
      } finally {
        await blocker.query("ROLLBACK"); await blocker.end();
        if (waiting) await waiting;
      }
    });
    await t.test("concurrent identical booking requests are durable and changed terms conflict", async () => {
      const key = randomUUID();
      const isolatedListing = (await pool.query(
        'INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,"updatedAt") VALUES ($1,$2,$2,\'Electronics\',12.34,25.67,\'Good\',NOW()) RETURNING id',
        [owner.id, `concurrency-${tag}`],
      )).rows[0].id;
      await pool.query('INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)', [isolatedListing, stationId]);
      await pool.query('INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,\'image/png\',\'PHOTO\')', [isolatedListing, "/uploads/listings/booking-test-fixture.png"]);
      const payload = { ...input, listingId: isolatedListing, startAt: "2041-01-01T10:00+08:00", endAt: "2041-01-02T10:00+08:00", canonicalStationId: "taipei-main" };
      const send = async (body: object, cookie = borrower.cookie) => {
        const response = await fetch(`${process.env.TEST_BASE_URL}/api/bookings`, {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.json() };
      };
      const results = await Promise.all([send(payload), send(payload)]);
      assert.deepEqual(results.map((result) => result.status), [201, 201]);
      assert.equal(results[0].body.booking.id, results[1].body.booking.id);
      const retry = await send({ ...payload, startAt: "2041-01-01T02:00:00.000Z", endAt: "2041-01-02T02:00:00.000Z", notes: " test " });
      assert.equal(retry.status, 201);
      assert.equal(retry.body.booking.id, results[0].body.booking.id);
      assert.equal((await send({ ...payload, notes: "changed" })).status, 409);
      assert.equal((await send({ ...payload, endAt: "2041-01-03T10:00+08:00" })).status, 409);
      assert.equal((await send({ ...payload, expectedQuote: "stale" })).status, 409);
      assert.equal((await send(payload, "")).status, 401);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM "Booking" WHERE "renterId"=$1 AND "requestKey"=$2', [borrower.id, key])).rows[0].n, 1);
    });
    await reservationRegressions(t, { owner, borrower, outsider, stationId: stationId! });
  } finally {
    // Immutable booking/meetup records are removed only by the owning harness database teardown.
    await pool.end();
  }
});
