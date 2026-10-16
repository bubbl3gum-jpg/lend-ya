import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

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
      startAt: "2035-01-01T10:00",
      endAt: "2035-01-02T10:01",
      notes: "test",
    };
    const create = (cookie = borrower.cookie, overrides = {}) =>
      api("/api/bookings", cookie, "POST", { ...input, ...overrides });
    await t.test("creation validation and authorization", async () => {
      assert.equal((await create("")).status, 401);
      assert.equal((await create(owner.cookie)).status, 409);
      for (const override of [
        { meetingStationId: 2147483647 },
        { startAt: "2020-01-01T10:00" },
        { endAt: input.startAt },
        { startAt: "2035-02-30T10:00" },
        { endAt: "2036-01-01T10:00" },
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
    const patch = (bookingId: number, cookie: string, action: string) =>
      api(`/api/bookings/${bookingId}`, cookie, "PATCH", {
        action,
        reason: "test reason",
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
          startAt: "2035-02-01T10:00",
          endAt: "2035-02-02T10:00",
        });
        assert.equal(later.status, 201);
        assert.equal(
          (await patch(later.result.booking.id, owner.cookie, "accept")).status,
          200,
        );
        await patch(later.result.booking.id, owner.cookie, "cancel");
        const pending = await create(borrower.cookie, {
          startAt: "2035-03-01T10:00",
          endAt: "2035-03-02T10:00",
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
        const stage = (id: number, action: string, cookie: string) =>
          api(`/api/bookings/${id}/${action}`, cookie, "POST", evidence);
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
          (await patch(first.result.booking.id, owner.cookie, "inspect"))
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
          startAt: "2035-04-01T10:00",
          endAt: "2035-04-02T10:00",
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
  } finally {
    if (listingId) {
      await pool.query(
        'DELETE FROM "Dispute" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "listingId"=$1)',
        [listingId],
      );
      await pool.query('DELETE FROM "ListingReport" WHERE "listingId"=$1', [
        listingId,
      ]);
      await pool.query('DELETE FROM "Booking" WHERE "listingId"=$1', [
        listingId,
      ]);
      await pool.query('DELETE FROM "Listing" WHERE id=$1', [listingId]);
    }
    if (users.length)
      await pool.query('DELETE FROM "User" WHERE id = ANY($1::int[])', [users]);
    await pool.end();
  }
});
