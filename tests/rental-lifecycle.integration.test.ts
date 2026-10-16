import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Pool } from "pg";
import { checklistItems } from "../lib/rental-checklist";

type PhotoDto = { id: string; stage: string; uploaderId: number };
type StageDto = {
  conditionNotes: string;
  checklist: Record<string, string>;
  confirmedBy: number | null;
  confirmedAt: string | null;
  borrowerConditionNotes: string;
  borrowerChecklist: Record<string, string>;
  ownerConditionConfirmed: boolean;
  conditionConfirmed: boolean;
  timestamp: string;
  performedBy: number;
  returnConfirmed: boolean;
  initiatedBy: number;
  inspectedBy: number | null;
  inspectedAt: string | null;
  inspectionAccepted: boolean | null;
  inspectionNotes: string | null;
  inspectionChecklist: Record<string, string>;
};
type BookingDto = {
  id: number;
  status: string;
  ownerId: number;
  renterId: number;
  totalPrice: string;
  deposit: string;
  handoff: StageDto;
  return: StageDto;
  evidencePhotos: PhotoDto[];
  dispute: { status: string } | null;
};
type Payload = {
  error?: string;
  user: { id: number };
  listing: { id: number; media: { url: string }[] };
  booking: BookingDto;
  bookings: BookingDto[];
  status: string;
  review: { subjectId: number; authorId: number };
};

test("Milestone 3: real participant lifecycle, protected evidence, reviews and disputes", async (t) => {
  assert.ok(
    process.env.TEST_DATABASE_URL &&
      new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test"),
    "Use an explicitly named disposable _test database.",
  );
  assert.ok(
    process.env.TEST_BASE_URL,
    "Set TEST_BASE_URL to a server using that same isolated database.",
  );
  const ownedDatabase = await connectTestDatabase();
  await ownedDatabase.end();
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const tag = randomUUID();
  const userIds: number[] = [],
    listingIds: number[] = [];
  const listingFiles: string[] = [];
  let stationId: number | undefined;
  const image = new Uint8Array(
    await sharp({
      create: { width: 8, height: 6, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer(),
  );
  const checklist = Object.fromEntries(
    Object.keys(checklistItems).map((key) => [key, "yes"]),
  );
  const evidence = {
    checklist: {
      ...checklist,
      functionTested: "unknown",
      accessoriesChecked: "not_applicable",
    },
    conditionNotes: "Owner: existing scratch",
    conditionConfirmed: true,
    returnConfirmed: true,
  };
  const api = async (
    url: string,
    cookie = "",
    method = "GET",
    body?: object | FormData,
  ) => {
    const response = await fetch(`${process.env.TEST_BASE_URL}${url}`, {
      method,
      headers: {
        Cookie: cookie,
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(body
        ? { body: body instanceof FormData ? body : JSON.stringify(body) }
        : {}),
    });
    const raw = await response.text();
    assert.ok(
      raw,
      `${method} ${url} returned HTTP ${response.status} without JSON`,
    );
    return {
      status: response.status,
      json: JSON.parse(raw) as Payload,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  const submit = (
    id: number,
    action: string,
    cookie: string,
    overrides = {},
    files = [new File([image], "condition.png", { type: "image/png" })],
  ) => {
    const form = new FormData();
    form.set("payload", JSON.stringify({ ...evidence, ...overrides }));
    files.forEach((file) => form.append("photos", file));
    return api(`/api/bookings/${id}/${action}`, cookie, "POST", form);
  };
  try {
    const account = async (role: string) => {
      const email = `m3-${role}-${tag}@example.test`,
        password = `Test-${tag}`;
      const registered = await api("/api/auth/register", "", "POST", {
        name: role,
        email,
        password,
      });
      assert.equal(registered.status, 201);
      userIds.push(registered.json.user.id);
      const login = await api("/api/auth/login", "", "POST", {
        email,
        password,
      });
      assert.equal(login.status, 200);
      assert.ok(login.cookie);
      return { id: registered.json.user.id, cookie: login.cookie };
    };
    const owner = await account("Owner"),
      borrower = await account("Borrower"),
      outsider = await account("Outsider");
    stationId = (
      await pool.query("SELECT id FROM \"MrtStation\" WHERE code='TPE'")
    ).rows[0].id;
    const patch = (id: number, cookie: string, action: string, extra = {}) =>
      api(`/api/bookings/${id}`, cookie, "PATCH", { action, ...extra });
    const detail = async (id: number, cookie = borrower.cookie) => {
      const r = await api(`/api/bookings/${id}`, cookie);
      assert.equal(r.status, 200);
      return r.json.booking;
    };
    const confirmed = async () => {
      const listing = new FormData();
      for (const [key, value] of Object.entries({
        title: `M3 item ${tag}`,
        description: "Isolated physical-item rental",
        category: "Electronics",
        condition: "Good with scratch",
        price: "12.34",
        deposit: "25.67",
        stationIds: JSON.stringify([stationId]),
      }))
        listing.set(key, value);
      listing.append(
        "photos",
        new File([image], "item.png", { type: "image/png" }),
      );
      const createdListing = await api(
        "/api/listings",
        owner.cookie,
        "POST",
        listing,
      );
      assert.equal(createdListing.status, 201);
      listingIds.push(createdListing.json.listing.id);
      createdListing.json.listing.media.forEach((media) =>
        listingFiles.push(
          path.join(
            process.cwd(),
            "storage/listings",
            path.basename(media.url),
          ),
        ),
      );
      const booking = await api("/api/bookings", borrower.cookie, "POST", {
        listingId: createdListing.json.listing.id,
        meetingStationId: stationId,
        startAt: "2035-01-01T10:00",
        endAt: "2035-01-02T10:01",
      });
      assert.equal(booking.status, 201);
      assert.equal(
        (await patch(booking.json.booking.id, owner.cookie, "accept")).status,
        200,
      );
      return booking.json.booking.id;
    };
    const inUse = async () => {
      const id = await confirmed();
      assert.equal((await submit(id, "handoff", owner.cookie)).status, 200);
      assert.equal(
        (
          await submit(id, "handoff", borrower.cookie, {
            conditionNotes: "Borrower: scratch reviewed",
          })
        ).status,
        200,
      );
      assert.equal((await detail(id)).status, "IN_USE");
      return id;
    };
    const inspection = async () => {
      const id = await inUse();
      assert.equal(
        (
          await submit(id, "return", borrower.cookie, {
            conditionNotes: "Borrower: item returned unchanged",
          })
        ).status,
        200,
      );
      assert.equal((await patch(id, owner.cookie, "inspect")).status, 200);
      return id;
    };
    await t.test(
      "owner-only handoff, explicit consent, borrower review and bilateral concurrency",
      async () => {
        const id = await confirmed();
        assert.equal((await submit(id, "handoff", "")).status, 401);
        assert.equal(
          (await submit(id, "handoff", outsider.cookie)).status,
          403,
        );
        assert.equal(
          (await submit(id, "handoff", borrower.cookie)).status,
          403,
        );
        assert.equal(
          (
            await submit(id, "handoff", owner.cookie, {
              conditionConfirmed: false,
            })
          ).status,
          400,
        );
        assert.equal(
          (await submit(id, "handoff", owner.cookie, { checklist: {} })).status,
          400,
        );
        assert.equal(
          (
            await patch(id, owner.cookie, "complete", {
              conditionConfirmed: true,
            })
          ).status,
          409,
        );
        assert.equal((await submit(id, "handoff", owner.cookie)).status, 200);
        let saved = await detail(id);
        assert.equal(saved.status, "HANDOFF_PENDING");
        assert.equal(saved.handoff.ownerConditionConfirmed, true);
        assert.equal(saved.handoff.conditionConfirmed, false);
        assert.equal(saved.handoff.performedBy, owner.id);
        assert.equal(saved.handoff.conditionNotes, evidence.conditionNotes);
        assert.deepEqual(saved.handoff.checklist, evidence.checklist);
        assert.equal((await submit(id, "handoff", owner.cookie)).status, 403);
        assert.equal(
          (
            await submit(id, "handoff", borrower.cookie, {
              conditionConfirmed: false,
            })
          ).status,
          400,
        );
        const results = await Promise.all([
          submit(id, "handoff", borrower.cookie, {
            conditionNotes: "Borrower: different observation",
          }),
          submit(id, "handoff", borrower.cookie, {
            conditionNotes: "Borrower: different observation",
          }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        saved = await detail(id);
        assert.equal(saved.status, "IN_USE");
        assert.equal(saved.handoff.confirmedBy, borrower.id);
        assert.ok(saved.handoff.confirmedAt);
        assert.equal(saved.handoff.conditionNotes, evidence.conditionNotes);
        assert.equal(
          saved.handoff.borrowerConditionNotes,
          "Borrower: different observation",
        );
        assert.equal(
          saved.evidencePhotos.length,
          2,
          "failed duplicate transaction creates no orphan photo",
        );
        const count = await pool.query(
          'SELECT COUNT(*)::int AS count FROM "Handoff" WHERE "bookingId"=$1',
          [id],
        );
        assert.equal(count.rows[0].count, 1);
      },
    );
    await t.test(
      "private photos: decoding, upload limits, cross-booking access and no URL injection",
      async () => {
        const id = await confirmed(),
          otherId = await confirmed();
        const malformed = new File(["fake PNG"], "x.png", {
          type: "image/png",
        });
        assert.equal(
          (await submit(id, "handoff", owner.cookie, {}, [malformed])).status,
          400,
        );
        assert.equal(
          (
            await submit(id, "handoff", owner.cookie, {}, [
              new File([image], "x.jpg", { type: "image/jpeg" }),
            ])
          ).status,
          400,
        );
        assert.equal(
          (
            await submit(id, "handoff", owner.cookie, {}, [
              new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
            ])
          ).status,
          400,
        );
        assert.equal(
          (
            await submit(
              id,
              "handoff",
              owner.cookie,
              {},
              Array.from(
                { length: 9 },
                () => new File([image], "x.png", { type: "image/png" }),
              ),
            )
          ).status,
          413,
        );
        assert.equal(
          (
            await submit(id, "handoff", owner.cookie, {}, [
              new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
                type: "image/png",
              }),
            ])
          ).status,
          413,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/handoff`, owner.cookie, "POST", {
              ...evidence,
              photos: ["https://example.com/private.png"],
            })
          ).status,
          400,
        );
        assert.equal((await detail(id)).evidencePhotos.length, 0);
        assert.equal((await submit(id, "handoff", owner.cookie)).status, 200);
        const photo = (await detail(id)).evidencePhotos[0];
        for (const participant of [owner, borrower]) {
          const response = await fetch(
            `${process.env.TEST_BASE_URL}/api/bookings/${id}/evidence/${photo.id}`,
            { headers: { Cookie: participant.cookie } },
          );
          assert.equal(response.status, 200);
          assert.equal(
            response.headers.get("cache-control"),
            "private, no-store",
          );
          assert.equal(response.headers.get("content-type"), "image/png");
          assert.equal(
            (await sharp(Buffer.from(await response.arrayBuffer())).metadata())
              .width,
            8,
          );
        }
        assert.equal(
          (
            await fetch(
              `${process.env.TEST_BASE_URL}/api/bookings/${id}/evidence/${photo.id}`,
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await api(
              `/api/bookings/${id}/evidence/${photo.id}`,
              outsider.cookie,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await api(
              `/api/bookings/${otherId}/evidence/${photo.id}`,
              borrower.cookie,
            )
          ).status,
          404,
        );
        assert.equal(
          (await api(`/api/bookings/${id}`, outsider.cookie)).status,
          403,
        );
      },
    );
    await t.test(
      "borrower-only return requires acknowledgement and persists without duplicates",
      async () => {
        const id = await inUse();
        assert.equal((await submit(id, "return", owner.cookie)).status, 403);
        assert.equal((await submit(id, "return", outsider.cookie)).status, 403);
        assert.equal(
          (
            await submit(id, "return", borrower.cookie, {
              returnConfirmed: false,
            })
          ).status,
          400,
        );
        const returned = {
          conditionNotes: "Borrower: new dent documented",
          checklist: { ...evidence.checklist, damageDocumented: "no" },
        };
        const responses = await Promise.all([
          submit(id, "return", borrower.cookie, returned),
          submit(id, "return", borrower.cookie, returned),
        ]);
        assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
        const saved = await detail(id);
        assert.equal(saved.status, "RETURN_PENDING");
        assert.equal(saved.return.initiatedBy, borrower.id);
        assert.equal(saved.return.returnConfirmed, true);
        assert.equal(saved.return.conditionNotes, returned.conditionNotes);
        assert.deepEqual(saved.return.checklist, returned.checklist);
        assert.ok(saved.return.timestamp);
        assert.equal(
          saved.evidencePhotos.filter(
            (photo) => photo.stage === "RETURN_BORROWER",
          ).length,
          1,
        );
        assert.equal((await patch(id, borrower.cookie, "inspect")).status, 403);
        assert.equal(
          (await submit(id, "inspection", owner.cookie, { acceptable: true }))
            .status,
          409,
          "cannot skip inspection entry",
        );
      },
    );
    await t.test(
      "full normal completion, immutable participant evidence, history, reviews and refresh",
      async () => {
        const id = await inspection();
        assert.equal(
          (
            await api(`/api/bookings/${id}/reviews`, borrower.cookie, "POST", {
              rating: 5,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await submit(id, "inspection", borrower.cookie, {
              acceptable: true,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await submit(id, "inspection", owner.cookie, {
              acceptable: true,
              conditionConfirmed: false,
            })
          ).status,
          400,
        );
        assert.equal(
          (await submit(id, "inspection", owner.cookie)).status,
          400,
        );
        const decisions = await Promise.all([
          submit(id, "inspection", owner.cookie, {
            acceptable: true,
            conditionNotes: "Owner: inspected and acceptable",
          }),
          submit(id, "inspection", owner.cookie, {
            acceptable: true,
            conditionNotes: "Owner: inspected and acceptable",
          }),
        ]);
        assert.deepEqual(decisions.map((r) => r.status).sort(), [200, 409]);
        const saved = await detail(id);
        assert.equal(saved.status, "COMPLETED");
        assert.equal(
          saved.return.conditionNotes,
          "Borrower: item returned unchanged",
        );
        assert.equal(saved.handoff.conditionNotes, evidence.conditionNotes);
        assert.equal(
          saved.handoff.borrowerConditionNotes,
          "Borrower: scratch reviewed",
        );
        assert.equal(
          saved.return.inspectionNotes,
          "Owner: inspected and acceptable",
        );
        assert.equal(saved.return.inspectedBy, owner.id);
        assert.ok(saved.return.inspectedAt);
        assert.equal(saved.return.inspectionAccepted, true);
        assert.equal(saved.return.confirmedBy, owner.id);
        assert.equal(saved.totalPrice, "24.68");
        assert.equal(saved.deposit, "25.67");
        assert.equal(saved.evidencePhotos.length, 4);
        for (const participant of [owner, borrower]) {
          const history = await api("/api/bookings", participant.cookie);
          assert.ok(
            history.json.bookings.some(
              (booking) => booking.id === id && booking.status === "COMPLETED",
            ),
          );
          const page = await fetch(
            `${process.env.TEST_BASE_URL}/bookings/${id}`,
            { headers: { Cookie: participant.cookie } },
          );
          assert.equal(page.status, 200);
          const html = await page.text();
          assert.ok(html.includes("Owner: inspected and acceptable"));
          assert.ok(html.includes("Borrower: item returned unchanged"));
          assert.ok(html.includes("Asia/Taipei"));
          const response = await fetch(
            `${process.env.TEST_BASE_URL}/api/bookings/${id}/evidence/${saved.evidencePhotos[0].id}`,
            { headers: { Cookie: participant.cookie } },
          );
          assert.equal(response.status, 200);
        }
        for (const action of ["inspect", "cancel", "accept", "reject"])
          assert.equal((await patch(id, owner.cookie, action)).status, 409);
        assert.equal(
          (await submit(id, "handoff", borrower.cookie)).status,
          409,
        );
        assert.equal((await submit(id, "return", borrower.cookie)).status, 409);
        assert.equal(
          (
            await api(`/api/bookings/${id}/reviews`, outsider.cookie, "POST", {
              rating: 5,
            })
          ).status,
          403,
        );
        for (const rating of [0, 6, 1.5, "5"])
          assert.equal(
            (
              await api(`/api/bookings/${id}/reviews`, owner.cookie, "POST", {
                rating,
              })
            ).status,
            400,
          );
        assert.equal(
          (
            await api(`/api/bookings/${id}/reviews`, owner.cookie, "POST", {
              rating: 5,
              comment: "x".repeat(2001),
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/reviews`, owner.cookie, "POST", {
              rating: 5,
              subjectId: owner.id,
            })
          ).status,
          400,
        );
        for (const participant of [owner, borrower]) {
          const review = await api(
            `/api/bookings/${id}/reviews`,
            participant.cookie,
            "POST",
            { rating: 5, comment: `Review by ${participant.id}` },
          );
          assert.equal(review.status, 201);
          assert.notEqual(review.json.review.subjectId, participant.id);
          assert.equal(review.json.review.authorId, participant.id);
          assert.equal(
            (
              await api(
                `/api/bookings/${id}/reviews`,
                participant.cookie,
                "POST",
                { rating: 4 },
              )
            ).status,
            409,
          );
        }
        const row = (
          await pool.query(
            'SELECT COUNT(*)::int AS count FROM "VerifiedReview" WHERE "bookingId"=$1',
            [id],
          )
        ).rows[0];
        assert.equal(row.count, 2);
        const page = await fetch(
          `${process.env.TEST_BASE_URL}/bookings/${id}`,
          { headers: { Cookie: borrower.cookie } },
        );
        assert.ok((await page.text()).includes(`Review by ${owner.id}`));
        assert.equal(
          (await detail(id, owner.cookie)).status,
          "COMPLETED",
          "read after new request preserves state",
        );
        await assert.rejects(
          pool.query(
            'INSERT INTO "VerifiedReview" ("bookingId","authorId","subjectId",rating) VALUES ($1,$2,$2,5)',
            [id, outsider.id],
          ),
        );
      },
    );
    await t.test(
      "failed inspection preserves concern, blocks completion and supports dispute",
      async () => {
        const id = await inspection();
        assert.equal(
          (
            await submit(id, "inspection", owner.cookie, {
              acceptable: false,
              conditionNotes: "Owner: missing accessory",
              checklist: { ...evidence.checklist, accessoriesChecked: "no" },
            })
          ).status,
          200,
        );
        const before = await detail(id);
        assert.equal(before.status, "INSPECTION");
        assert.equal(before.return.inspectionAccepted, false);
        assert.equal(before.return.confirmedBy, null);
        assert.equal(
          (await submit(id, "inspection", owner.cookie, { acceptable: true }))
            .status,
          409,
        );
        assert.equal(
          (
            await patch(id, owner.cookie, "complete", {
              ...evidence,
              acceptable: true,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/dispute`, outsider.cookie, "POST", {
              reason: "Damage",
              description: "Not my booking",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/dispute`, owner.cookie, "POST", {
              reason: " ",
              description: "Concern",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/dispute`, owner.cookie, "POST", {
              reason: "Missing accessory",
              description: "See return inspection evidence",
            })
          ).status,
          201,
        );
        const after = await detail(id);
        assert.equal(after.status, "DISPUTED");
        assert.equal(after.dispute?.status, "OPEN");
        assert.deepEqual(after.return, before.return);
        assert.deepEqual(after.evidencePhotos, before.evidencePhotos);
        assert.equal(
          (await submit(id, "inspection", owner.cookie, { acceptable: true }))
            .status,
          409,
        );
        assert.equal(
          (
            await patch(id, owner.cookie, "complete", {
              ...evidence,
              acceptable: true,
            })
          ).status,
          409,
        );
        assert.equal(
          (await patch(id, owner.cookie, "resolve", { status: "COMPLETED" }))
            .status,
          400,
        );
        assert.equal(
          (
            await api(`/api/bookings/${id}/reviews`, borrower.cookie, "POST", {
              rating: 5,
            })
          ).status,
          409,
        );
        const page = await fetch(
          `${process.env.TEST_BASE_URL}/bookings/${id}`,
          { headers: { Cookie: borrower.cookie } },
        );
        assert.ok((await page.text()).includes("Administrative review"));
        assert.equal(
          (
            await fetch(
              `${process.env.TEST_BASE_URL}/api/bookings/${id}/evidence/${after.evidencePhotos[0].id}`,
              { headers: { Cookie: borrower.cookie } },
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "inspection vs dispute races produce exactly one coherent outcome",
      async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const id = await inspection();
          const decisions = await Promise.all([
            submit(id, "inspection", owner.cookie, { acceptable: true }),
            api(`/api/bookings/${id}/dispute`, borrower.cookie, "POST", {
              reason: "Condition concern",
              description: "Race with completion",
            }),
          ]);
          assert.equal(
            decisions.filter(
              (result) => result.status === 200 || result.status === 201,
            ).length,
            1,
          );
          assert.equal(
            decisions.filter((result) => result.status === 409).length,
            1,
          );
          const saved = await detail(id);
          if (saved.status === "COMPLETED") {
            assert.equal(saved.dispute, null);
            assert.equal(saved.return.inspectionAccepted, true);
            assert.equal(saved.evidencePhotos.length, 4);
          } else {
            assert.equal(saved.status, "DISPUTED");
            assert.equal(saved.dispute?.status, "OPEN");
            assert.equal(saved.return.confirmedBy, null);
            assert.equal(saved.evidencePhotos.length, 3);
          }
        }
      },
    );
  } finally {
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
    if (userIds.length)
      await pool.query('DELETE FROM "User" WHERE id=ANY($1::int[])', [userIds]);
    await pool.end();
  }
});
