import assert from "node:assert/strict";
import type { APIRequestContext } from "playwright";
import type { PrismaClient } from "@prisma/client";
import { connectTestDatabase } from "./test-database";

export async function removalRace({
  owner,
  borrower,
  prisma,
  listingId,
  removedStationId,
  keptStationId,
  startAt,
  endAt,
  fullForm = false,
}: {
  owner: APIRequestContext;
  borrower: APIRequestContext;
  prisma: PrismaClient;
  listingId: number;
  removedStationId: number;
  keptStationId: number;
  startAt: string;
  endAt: string;
  fullForm?: boolean;
}) {
  const observer = await connectTestDatabase(),
    blocker = await connectTestDatabase();
  let patch: ReturnType<APIRequestContext["patch"]> | undefined,
    booking: ReturnType<APIRequestContext["post"]> | undefined;
  async function waitingFor(pid: number, queryPart: string) {
    for (let i = 0; i < 100; i++) {
      const { rows } = await observer.query(
        "SELECT pid,query FROM pg_stat_activity WHERE datname=current_database() AND $1 = ANY(pg_blocking_pids(pid))",
        [pid],
      );
      const row = rows.find((row) => String(row.query).includes(queryPart));
      if (row) return Number(row.pid);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw Error(
      `Expected request blocked on ${queryPart}; concurrency test did not reach intended lock.`,
    );
  }
  try {
    const before = await prisma.listing.findUniqueOrThrow({
      where: { id: listingId },
    });
    await blocker.query("BEGIN");
    await blocker.query(
      'SELECT id FROM "ListingStation" WHERE "listingId"=$1 FOR UPDATE',
      [listingId],
    );
    const blockerPid = Number(
      (await blocker.query("SELECT pg_backend_pid() AS pid")).rows[0].pid,
    );
    const data = fullForm
      ? {
          stationIds: [keptStationId],
          title: before.title,
          description: before.description,
          condition: before.condition,
          price: Number(before.price),
          deposit: before.deposit === null ? null : Number(before.deposit),
          status: before.status,
        }
      : { stationIds: [keptStationId] };
    // This is the real handler. The blocker delays only its membership DELETE; it never edits Listing.updatedAt.
    patch = owner.patch(`/api/listings/${listingId}`, { data });
    const patchPid = await waitingFor(blockerPid, "ListingStation");
    booking = borrower.post("/api/bookings", {
      data: { listingId, meetingStationId: removedStationId, startAt, endAt },
    });
    await waitingFor(patchPid, "FOR UPDATE");
    await blocker.query("COMMIT");
    const [edit, response] = await Promise.all([patch, booking]);
    assert.equal(edit.status(), 200, await edit.text());
    const after = await prisma.listing.findUniqueOrThrow({
      where: { id: listingId },
    });
    const body = await response.json();
    console.log(
      JSON.stringify({
        case: fullForm ? "full-form removal race" : "station-only removal race",
        editStatus: edit.status(),
        bookingStatus: response.status(),
        listingUpdatedAtChanged:
          before.updatedAt.getTime() !== after.updatedAt.getTime(),
        blockedOnActualPatch: true,
      }),
    );
    assert.equal(
      response.status(),
      409,
      `Removed station was persisted by a waiting booking: ${JSON.stringify(body)}`,
    );
    assert.ok(body && typeof body === "object" && "code" in body);
    assert.equal(body.code, "STATION_UNAVAILABLE");
    assert.equal(
      await prisma.booking.count({
        where: { listingId, startAt: new Date(startAt) },
      }),
      0,
    );
    assert.equal(
      await prisma.listingStation.count({
        where: { listingId, stationId: removedStationId },
      }),
      0,
    );
  } finally {
    await blocker.query("ROLLBACK");
    await Promise.allSettled([patch, booking].filter(Boolean));
    await blocker.end();
    await observer.end();
  }
}
