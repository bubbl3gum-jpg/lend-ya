import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { connectTestDatabase } from "./test-database";

type Actor = { id: number; cookie: string };

/** Called by the existing rental API suite, under its owned database/server. */
export async function reservationRegressions(
  t: TestContext,
  actors: { owner: Actor; borrower: Actor; outsider: Actor; stationId: number },
) {
  const { owner, borrower, outsider, stationId } = actors;
  const db = await connectTestDatabase();
  const base = process.env.TEST_BASE_URL!;
  const api = async (path: string, actor: Actor, method = "GET", body?: object, key?: string) => {
    const r = await fetch(base + path, {
      method,
      headers: { Cookie: actor.cookie, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  };
  async function listing() {
    const id: number = (await db.query(
      `INSERT INTO "Listing" ("ownerId",title,description,category,price,deposit,condition,"updatedAt")
       VALUES ($1,$2,'Owned R5 fixture','Electronics',12.34,0,'Good',NOW()) RETURNING id`,
      [owner.id, `reservation-${randomUUID()}`],
    )).rows[0].id;
    await db.query('INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)', [id, stationId]);
    await db.query(`INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,'/uploads/listings/reservation-test-fixture.png','image/png','PHOTO')`, [id]);
    return id;
  }
  const terms = (listingId: number, startAt = "2042-01-01T02:00:00.000Z", endAt = "2042-01-02T02:00:00.000Z") =>
    ({ listingId, meetingStationId: stationId, startAt, endAt });
  const create = (body: object, key = randomUUID(), actor = borrower) => api("/api/bookings", actor, "POST", body, key);
  const accept = (id: number) => api(`/api/bookings/${id}`, owner, "PATCH", { action: "accept" });
  async function pending(body: object) {
    const r = await create(body);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.booking.status, "PENDING");
    return r.body.booking.id as number;
  }
  // Complete rows detect lost writes as well as duplicate enrollment and partial evidence.
  const tables = ["Booking", "MeetupSession", "MeetupEvent", "DevDocReviewContext", "Handoff", "Return", "BookingEvidencePhoto"];
  async function snapshot() {
    const result: Record<string, unknown> = {};
    for (const table of tables) result[table] = (await db.query(`SELECT to_jsonb(t)::text AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    return result;
  }
  async function records(ids: number[]) {
    return (await db.query(`SELECT b.id,b.status,b."startAt",b."endAt",b."requestKey",b."requestHash",b."dailyPrice"::text,b."totalPrice"::text,
      to_jsonb(b)-'status'-'updatedAt' AS terms,
      (SELECT count(*)::int FROM "MeetupSession" s WHERE s."bookingId"=b.id) sessions,
      (SELECT count(*)::int FROM "MeetupEvent" e WHERE e."bookingId"=b.id AND e.kind='NEW_BOOKING_VERIFICATION') enrollments
      FROM "Booking" b WHERE b.id=ANY($1::int[]) ORDER BY b.id`, [ids])).rows;
  }
  async function assertStates(ids: number[], states: string[]) {
    const rows = await records(ids);
    const all = (await db.query(`SELECT id FROM "Booking" WHERE "listingId" IN
      (SELECT "listingId" FROM "Booking" WHERE id=ANY($1::int[])) ORDER BY id`, [ids])).rows;
    assert.deepEqual(all.map(r => r.id), [...ids].sort((a, b) => a - b), "No extra booking operation may persist for these fixture listings.");
    assert.deepEqual(rows.map(r => r.status).sort(), [...states].sort());
    for (const row of rows) {
      assert.equal(row.sessions, 1);
      assert.equal(row.enrollments, 1);
      assert.ok(row.requestKey && /^[a-f0-9]{64}$/.test(row.requestHash));
    }
    return rows;
  }
  /** Count real lock waits, including PostgreSQL's soft blocker queue, before releasing. */
  async function waiting(pid: number, count: number) {
    const until = performance.now() + 3000;
    do {
      const rows = (await db.query(`WITH RECURSIVE blocked AS (
        SELECT pid,query FROM pg_stat_activity WHERE datname=current_database() AND $1=ANY(pg_blocking_pids(pid))
        UNION
        SELECT a.pid,a.query FROM pg_stat_activity a JOIN blocked b ON b.pid=ANY(pg_blocking_pids(a.pid)) WHERE a.datname=current_database()
      ) SELECT DISTINCT pid,query FROM blocked WHERE query LIKE '%Listing%' AND query LIKE '%FOR UPDATE%'`, [pid])).rows;
      if (rows.length === count) {
        console.log(JSON.stringify({ case: "R5 observed listing lock waits", waiters: rows.length }));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    } while (performance.now() < until);
    assert.fail(`Did not observe ${count} API listing-lock waiter(s); race not established.`);
  }
  async function locked<T>(listingId: number, start: () => Promise<T>[]) {
    const blocker = await connectTestDatabase();
    let requests: Promise<T>[] = [];
    try {
      await blocker.query("BEGIN");
      await blocker.query('SELECT id FROM "Listing" WHERE id=$1 FOR UPDATE', [listingId]);
      const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0].pid;
      requests = start();
      await waiting(pid, requests.length);
      await blocker.query("COMMIT");
      return await Promise.all(requests);
    } finally {
      await blocker.query("ROLLBACK");
      await Promise.allSettled(requests);
      await blocker.end();
    }
  }
  try {
    await t.test("exact adjacency reserves both; equivalent offsets and 1ms overlap preserve losing pending rows", async () => {
      const id = await listing();
      const first = await pending(terms(id));
      const adjacent = await pending(terms(id, "2042-01-02T10:00:00.000+08:00", "2042-01-03T02:00:00.000Z"));
      const overlaps = [
        await pending(terms(id, "2042-01-02T01:59:59.999Z", "2042-01-02T02:00:00.001Z")),
        await pending(terms(id, "2042-01-02T09:59:59.999+08:00", "2042-01-01T21:00:00.001-05:00")),
      ];
      await assertStates([first, adjacent, ...overlaps], ["PENDING", "PENDING", "PENDING", "PENDING"]);
      assert.equal((await accept(first)).status, 200);
      assert.equal((await accept(adjacent)).status, 200);
      for (const overlap of overlaps) {
        const before = await snapshot();
        const denied = await accept(overlap);
        assert.equal(denied.status, 409);
        assert.match(denied.body.error, /already reserved/);
        assert.deepEqual(await snapshot(), before, "Reservation conflict must not partially mutate any lifecycle rows.");
      }
      const rows = await assertStates([first, adjacent, ...overlaps], ["CONFIRMED", "CONFIRMED", "PENDING", "PENDING"]);
      assert.equal(rows[0].endAt.getTime(), rows[1].startAt.getTime());
      assert.equal(rows[2].startAt.getTime(), rows[3].startAt.getTime());
      assert.equal(rows[2].endAt.getTime(), rows[3].endAt.getTime());
      assert.equal(rows[0].totalPrice, "12.34");
      const before = await snapshot();
      assert.equal((await create(terms(id, "2042-01-02T09:59:59.999+08:00", "2042-01-02T10:00:00.001+08:00"))).status, 409);
      assert.deepEqual(await snapshot(), before);
    });
    for (const conflicting of [true, false]) await t.test(`observed concurrent ${conflicting ? "conflicting" : "nonconflicting"} acceptances preserve both request histories`, async () => {
      const id = await listing();
      const first = await pending(terms(id));
      const second = await pending(conflicting ? terms(id) : terms(id, "2042-01-02T02:00:00.000Z", "2042-01-03T02:00:00.000Z"));
      const before = await records([first, second]);
      const results = await locked(id, () => [accept(first), accept(second)]);
      assert.deepEqual(results.map(r => r.status).sort(), conflicting ? [200, 409] : [200, 200]);
      const rows = await assertStates([first, second], conflicting ? ["CONFIRMED", "PENDING"] : ["CONFIRMED", "CONFIRMED"]);
      for (let i = 0; i < rows.length; i++) assert.deepEqual({ ...rows[i], status: before[i].status }, before[i], "Only status changes; no lost booking terms/enrollment.");
      if (conflicting) {
        const loser = rows.find(r => r.status === "PENDING")!;
        const denied = await accept(loser.id);
        assert.equal(denied.status, 409, "A business conflict remains a conflict on explicit retry.");
      }
    });
    await t.test("real MVCC abort rolls back; explicit same-key retry and equivalent-offset replay create one operation", async () => {
      const id = await listing(), key = randomUUID(), body = terms(id);
      const before = await snapshot();
      // The API already established a SERIALIZABLE snapshot before waiting on this row.
      // Commit a real new row version: PostgreSQL, not a trigger/exception mock, aborts it.
      const blocker = await connectTestDatabase();
      let request: ReturnType<typeof create> | undefined;
      try {
        await blocker.query("BEGIN");
        await blocker.query('SELECT id FROM "Listing" WHERE id=$1 FOR UPDATE', [id]);
        const pid = (await blocker.query("SELECT pg_backend_pid() pid")).rows[0].pid;
        request = create(body, key);
        await waiting(pid, 1);
        await blocker.query('UPDATE "Listing" SET price=13.37,"updatedAt"=NOW() WHERE id=$1', [id]);
        await blocker.query("COMMIT");
        const failed = await request;
        assert.equal(failed.status, 409);
        assert.equal(failed.body.code, "STATION_UNAVAILABLE");
        assert.deepEqual(await snapshot(), before, "Real transaction abort leaves no operation/enrollment/binding/evidence.");
      } finally {
        await blocker.query("ROLLBACK");
        if (request) await request;
        await blocker.end();
      }
      const created = await create(body, key);
      assert.equal(created.status, 201);
      const booking = created.body.booking.id;
      assert.equal(created.body.booking.totalPrice, "13.37", "Retry quotes the authoritative new listing value.");
      assert.equal((await accept(booking)).status, 200);
      const committed = await snapshot();
      const replay = await create({ ...body, startAt: "2042-01-01T10:00:00.000+08:00", endAt: "2042-01-01T21:00:00.000-05:00" }, key);
      assert.equal(replay.status, 201);
      assert.equal(replay.body.booking.id, booking);
      assert.equal(replay.body.booking.status, "CONFIRMED");
      assert.equal((await create({ ...body, notes: "altered" }, key)).status, 409);
      const foreign = await create(body, key, outsider);
      assert.equal(foreign.status, 409, "Other participant cannot replay this key; own new operation conflicts with reservation.");
      assert.equal((await api(`/api/bookings/${booking}`, outsider)).status, 403);
      assert.deepEqual(await snapshot(), committed, "Replays/denials never duplicate or change persisted history.");
      await assertStates([booking], ["CONFIRMED"]);
    });
    await t.test("failure after enrollment starts rolls back booking/session/event and permits same-key retry", async () => {
      const id = await listing(), key = randomUUID(), body = terms(id), before = await snapshot();
      await db.query(`CREATE FUNCTION r5_enrollment_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.kind='NEW_BOOKING_VERIFICATION' AND EXISTS(SELECT 1 FROM "Booking" WHERE id=NEW."bookingId" AND "listingId"=${id}) THEN
          RAISE EXCEPTION 'R5 synthetic post-enrollment failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER r5_enrollment_failure AFTER INSERT ON "MeetupEvent" FOR EACH ROW EXECUTE FUNCTION r5_enrollment_failure()`);
      try {
        assert.equal((await create(body, key)).status, 500);
        assert.deepEqual(await snapshot(), before, "Rollback includes Booking and its already-inserted MeetupSession/Event.");
      } finally {
        await db.query('DROP TRIGGER r5_enrollment_failure ON "MeetupEvent"; DROP FUNCTION r5_enrollment_failure()');
      }
      const created = await create(body, key);
      assert.equal(created.status, 201);
      const booking = created.body.booking.id;
      await assertStates([booking], ["PENDING"]);
      const committed = await snapshot();
      assert.equal((await create(body, key)).body.booking.id, booking);
      await db.query(`UPDATE "Listing" SET status='INACTIVE' WHERE id=$1`, [id]);
      for (const actor of [owner, borrower]) {
        assert.equal((await api(`/api/bookings/${booking}`, actor)).status, 200);
        const history = await api("/api/bookings", actor);
        assert.equal(history.status, 200);
        assert.ok(history.body.bookings.some((b: { id: number }) => b.id === booking));
      }
      assert.equal((await api(`/api/bookings/${booking}`, outsider)).status, 403);
      assert.equal((await api(`/api/listings/${id}`, owner)).status, 200);
      for (const actor of [borrower, outsider, { id: 0, cookie: "" }]) assert.equal((await api(`/api/listings/${id}`, actor)).status, 404);
      assert.equal((await accept(booking)).status, 409);
      assert.equal((await create(terms(id, "2043-01-01T02:00Z", "2043-01-02T02:00Z"))).status, 409);
      assert.deepEqual(await snapshot(), committed, "Visibility changes and rejected new actions preserve participant history.");
    });
  } finally { await db.end(); }
}
