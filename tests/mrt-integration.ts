import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type APIResponse } from "playwright";
import { prisma } from "../lib/prisma";
import { network } from "../lib/mrt/network";
import { legacyCanonicalIds } from "../lib/mrt/station-mapping";
import { importMrt } from "../lib/mrt/import";
const baseURL = process.env.MRT_TEST_URL ?? "http://127.0.0.1:3000";
if (
  !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname) ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL!).hostname,
  )
)
  throw Error("Integration test requires local development app/database");
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.MRT_BROWSER_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const checks: string[] = [];
  async function check(response: APIResponse, status = 200) {
    assert.equal(response.status(), status, await response.text());
    return response.json();
  }
  async function register(name: string) {
    const context = await browser.newContext({ baseURL });
    await check(
      await context.request.post("/api/auth/register", {
        data: {
          name,
          email: `mrt-${name}-${Date.now()}@example.test`,
          password: "IntegrationTest123!",
        },
      }),
      201,
    );
    return context;
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDCcAAAAASUVORK5CYII=",
    "base64",
  );
  try {
    await mkdir("docs/mrt/screenshots", { recursive: true });
    const before = await prisma.mrtStation.findMany();
    const history = await prisma.booking.findMany({
      select: { id: true, meetingStationId: true },
    });
    await importMrt();
    await importMrt();
    for (const s of network.stations) {
      const db = await prisma.mrtStation.findUniqueOrThrow({
        where: { canonicalId: s.id },
      });
      assert.equal(db.nameZh, s.nameZh);
      assert.deepEqual(new Set(db.lineCodes), new Set(Object.values(s.codes)));
    }
    for (const [code, id] of Object.entries(legacyCanonicalIds)) {
      const db = await prisma.mrtStation.findUniqueOrThrow({ where: { code } });
      assert.equal(db.id, before.find((s) => s.code === code)!.id);
      assert.equal(db.canonicalId, id);
    }
    for (const b of history)
      assert.equal(
        (await prisma.booking.findUniqueOrThrow({ where: { id: b.id } }))
          .meetingStationId,
        b.meetingStationId,
      );
    checks.push(
      "120 canonical mappings, idempotent import, five legacy IDs and historical booking foreign keys",
    );
    const owner = await register("owner"),
      borrower = await register("borrower"),
      other = await register("other");
    const page = await owner.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/listings/new");
    await page
      .getByRole("button", { name: "Choose pickup stations", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    assert.equal(await dialog.locator("[data-station-id]").count(), 120);
    await dialog
      .locator('[data-station-id="taipei-main"] .station-hit')
      .click();
    await dialog.locator('[data-station-id="zhongshan"] .station-hit').click();
    const transform = dialog.getByTestId("map-transform");
    const initial = await transform.getAttribute("transform");
    await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.notEqual(await transform.getAttribute("transform"), initial);
    await dialog.getByRole("button", { name: "Reset map view" }).click();
    assert.equal(await transform.getAttribute("transform"), initial);
    await page.screenshot({
      path: "docs/mrt/screenshots/desktop-owner.png",
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "Confirm availability" }).click();
    await page
      .getByLabel("Listing title", { exact: true })
      .fill("MRT integration camera " + Date.now());
    await page.getByLabel("Condition", { exact: true }).fill("Excellent");
    await page
      .getByLabel("Description", { exact: false })
      .fill("Integration camera with lens and charger.");
    await page.locator("input[type=file]").first().setInputFiles({
      name: "camera.png",
      mimeType: "image/png",
      buffer: png,
    });
    const videoBytes = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      const result = new Promise<number[]>((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = async () =>
          resolve(
            Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())),
          );
      });
      recorder.start();
      canvas.getContext("2d")!.fillRect(0, 0, 64, 64);
      await new Promise((resolve) => setTimeout(resolve, 200));
      recorder.stop();
      const bytes = await result;
      stream.getTracks().forEach((track) => track.stop());
      return bytes;
    });
    await page
      .locator("input[type=file]")
      .nth(1)
      .setInputFiles({
        name: "item.webm",
        mimeType: "video/webm",
        buffer: Buffer.from(videoBytes),
      });
    await page
      .getByRole("button", { name: "Publish listing", exact: true })
      .click();
    await page.waitForURL(/\/listings\/\d+$/);
    const listingId = Number(page.url().split("/").at(-1));
    const taipei = await prisma.mrtStation.findUniqueOrThrow({
      where: { canonicalId: "taipei-main" },
    });
    const zhongshan = await prisma.mrtStation.findUniqueOrThrow({
      where: { canonicalId: "zhongshan" },
    });
    const ximen = await prisma.mrtStation.findUniqueOrThrow({
      where: { canonicalId: "ximen" },
    });
    assert.deepEqual(
      new Set(
        (await prisma.listingStation.findMany({ where: { listingId } })).map(
          (s) => s.stationId,
        ),
      ),
      new Set([taipei.id, zhongshan.id]),
    );
    const media = await prisma.listingMedia.findMany({ where: { listingId } });
    assert.deepEqual(
      new Set(media.map((item) => item.kind)),
      new Set(["PHOTO", "VIDEO"]),
    );
    for (const item of media)
      assert.equal((await owner.request.get(item.url)).status(), 200);
    checks.push(
      "Owner creates listing through map, multipart photo/video upload and PostgreSQL persistence",
    );
    await page.goto(`/listings/${listingId}/edit`);
    await page
      .getByRole("button", { name: "Choose pickup stations", exact: true })
      .click();
    await dialog.locator('[data-station-id="ximen"] .station-hit').click();
    await dialog.getByRole("button", { name: "Confirm availability" }).click();
    await page
      .getByRole("button", { name: "Save listing", exact: true })
      .click();
    await page.waitForURL(new RegExp(`/listings/${listingId}$`));
    await check(
      await other.request.patch(`/api/listings/${listingId}`, {
        data: { stationIds: [ximen.id] },
      }),
      403,
    );
    for (const stationIds of [
      [],
      [taipei.id, -1],
      [99999999],
      [String(taipei.id)],
    ])
      await check(
        await owner.request.patch(`/api/listings/${listingId}`, {
          data: { stationIds },
        }),
        400,
      );
    checks.push(
      "Owner edits availability; unauthorized and manipulated updates rejected",
    );
    const bp = await borrower.newPage();
    await bp.goto(`/listings/${listingId}`);
    assert.match(
      await bp.locator("body").innerText(),
      /No station is selected yet/,
    );
    await bp
      .getByRole("button", { name: "Choose meeting station", exact: true })
      .click();
    const bd = bp.getByRole("dialog");
    assert.equal(
      await bd
        .locator('[data-station-id="banqiao"]')
        .getAttribute("aria-disabled"),
      "true",
    );
    await bd
      .locator('[data-station-id="banqiao"] .station-hit')
      .click({ force: true });
    assert.equal(
      await bd
        .getByRole("button", { name: "Confirm meeting station" })
        .isDisabled(),
      true,
    );
    await bd.getByRole("textbox", { name: "Search stations" }).fill("BL12");
    await bd
      .getByRole("button", { name: "Locate Taipei Main Station", exact: true })
      .click();
    await bp.waitForFunction(() =>
      document
        .querySelector("[data-testid=map-transform]")
        ?.getAttribute("transform")
        ?.includes("scale(3.2)"),
    );
    await bd.getByRole("button", { name: "Zoom in", exact: true }).click();
    const svg = bd.locator("svg");
    const box = (await svg.boundingBox())!;
    const oldPan = await bd
      .getByTestId("map-transform")
      .getAttribute("transform");
    await bp.mouse.move(box.x + 25, box.y + box.height - 70);
    await bp.mouse.down();
    await bp.mouse.move(box.x + 75, box.y + box.height - 90);
    await bp.mouse.up();
    assert.notEqual(
      await bd.getByTestId("map-transform").getAttribute("transform"),
      oldPan,
    );
    await bd.getByRole("button", { name: "Reset map view" }).click();
    await bd.locator('[data-station-id="taipei-main"] .station-hit').click();
    await bp.screenshot({
      path: "docs/mrt/screenshots/desktop-borrower.png",
      fullPage: true,
    });
    await bd.getByRole("button", { name: "Confirm meeting station" }).click();
    await bp.getByLabel("Start date", { exact: true }).fill("2027-01-02T10:00");
    await bp.getByLabel("End date", { exact: true }).fill("2027-01-03T10:00");
    await bp
      .getByLabel("Notes", { exact: true })
      .fill("Agree on the exact exit before handoff.");
    await bp
      .getByRole("button", { name: "Submit request", exact: true })
      .click();
    await bp.waitForURL(/\/bookings\/\d+$/);
    const bookingId = Number(bp.url().split("/").at(-1));
    assert.equal(
      (await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }))
        .meetingStationId,
      taipei.id,
    );
    assert.match(await bp.locator("body").innerText(), /台北車站/);
    assert.match(await bp.locator("body").innerText(), /R10 \/ BL12/);
    await bp.screenshot({
      path: "docs/mrt/screenshots/booking-confirmation.png",
      fullPage: true,
    });
    await page.goto(`/bookings/${bookingId}`);
    assert.match(await page.locator("body").innerText(), /台北車站/);
    checks.push(
      "Borrower explicit selection, disabled stations, search/zoom/pan, bilingual booking and integer station FK",
    );
    await check(
      await borrower.request.post("/api/bookings", {
        data: {
          listingId,
          meetingStationId: taipei.id,
          startAt: "2027-01-02T10:00:00Z",
          endAt: "2027-01-03T10:00:00Z",
        },
      }),
      409,
    );
    const bookingData = {
      listingId,
      meetingStationId: taipei.id,
      startAt: "2027-02-02T10:00:00Z",
      endAt: "2027-02-03T10:00:00Z",
    };
    await check(
      await owner.request.post("/api/bookings", { data: bookingData }),
      409,
    );
    await check(
      await borrower.request.post("/api/bookings", {
        data: { ...bookingData, canonicalStationId: "ximen" },
      }),
      409,
    );
    await check(await other.request.get(`/api/bookings/${bookingId}`), 403);
    await check(
      await owner.request.patch(`/api/listings/${listingId}`, {
        data: { stationIds: [ximen.id] },
      }),
    );
    assert.equal(
      (await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }))
        .meetingStationId,
      taipei.id,
    );
    await check(
      await borrower.request.post("/api/bookings", { data: bookingData }),
      409,
    );
    checks.push(
      "Removed or mismatched station requests rejected; historical meeting station unchanged",
    );
    // Force an availability edit to hold the same listing row while a booking is in flight.
    await check(
      await owner.request.patch(`/api/listings/${listingId}`, {
        data: { stationIds: [taipei.id, ximen.id] },
      }),
    );
    let unlock!: () => void;
    let locked!: () => void;
    const ready = new Promise<void>((r) => (locked = r));
    const gate = new Promise<void>((r) => (unlock = r));
    const edit = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Listing" WHERE "id"=${listingId} FOR UPDATE`;
        await tx.listingStation.deleteMany({
          where: { listingId, stationId: taipei.id },
        });
        await tx.listing.update({
          where: { id: listingId },
          data: { updatedAt: new Date() },
        });
        locked();
        await gate;
      },
      { timeout: 10000 },
    );
    await ready;
    const pending = borrower.request.post("/api/bookings", {
      data: bookingData,
    });
    let waiting = false;
    try {
      for (let i = 0; i < 100; i++) {
        const locks = await prisma.$queryRaw<
          Array<{ waiting: boolean }>
        >`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FOR UPDATE%') AS waiting`;
        if (locks[0].waiting) {
          waiting = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 30));
      }
    } finally {
      unlock();
    }
    await edit;
    assert.equal(
      waiting,
      true,
      "Booking must actually wait on availability edit lock",
    );
    await check(await pending, 409);
    assert.equal(
      await prisma.booking.count({
        where: { listingId, startAt: new Date(bookingData.startAt) },
      }),
      0,
    );
    checks.push(
      "Concurrent station removal wins before blocked booking; no stale booking persisted",
    );
    const mobile = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      storageState: await borrower.storageState(),
    });
    const mp = await mobile.newPage();
    await mp.goto(`/listings/${listingId}`);
    await mp
      .getByRole("button", { name: "Choose meeting station", exact: true })
      .click();
    const md = mp.getByRole("dialog");
    await md.locator('[data-station-id="ximen"] .station-hit').tap();
    assert.equal(
      await md
        .getByRole("button", { name: "Confirm meeting station" })
        .isEnabled(),
      true,
    );
    await md.getByRole("button", { name: "Zoom in", exact: true }).tap();
    await md.getByRole("button", { name: "Reset map view" }).tap();
    assert.ok(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await mp.screenshot({
      path: "docs/mrt/screenshots/mobile-borrower.png",
      fullPage: false,
    });
    await md.getByRole("button", { name: "Confirm meeting station" }).tap();
    checks.push(
      "Mobile fullscreen modal, touch selection, zoom/reset, no horizontal overflow",
    );
    // Existing lifecycle and evidence/authorization continue through the original API.
    await check(
      await borrower.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: "accept" },
      }),
      403,
    );
    await check(
      await owner.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: "accept" },
      }),
    );
    const evidence = {
      conditionConfirmed: true,
      photos: ["https://example.test/item.jpg"],
      checklist: { charger: true },
    };
    await check(
      await owner.request.post(`/api/bookings/${bookingId}/handoff`, {
        data: evidence,
      }),
    );
    await check(
      await borrower.request.post(`/api/bookings/${bookingId}/handoff`, {
        data: evidence,
      }),
    );
    await check(
      await borrower.request.post(`/api/bookings/${bookingId}/return`, {
        data: evidence,
      }),
      201,
    );
    await check(
      await owner.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: "inspect" },
      }),
    );
    await check(
      await owner.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: "complete", conditionConfirmed: true },
      }),
    );
    assert.equal(
      (await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }))
        .status,
      "COMPLETED",
    );
    assert.equal(
      (await prisma.handoff.findUniqueOrThrow({ where: { bookingId } }))
        .confirmedBy !== null,
      true,
    );
    checks.push(
      "Original accept → dual handoff → return → inspection → completed lifecycle and evidence",
    );
    const disputeData = {
      listingId,
      meetingStationId: ximen.id,
      startAt: "2027-04-02T10:00:00Z",
      endAt: "2027-04-03T10:00:00Z",
    };
    const disputedBooking = (
      await check(
        await borrower.request.post("/api/bookings", { data: disputeData }),
        201,
      )
    ).booking.id;
    await check(
      await owner.request.patch(`/api/bookings/${disputedBooking}`, {
        data: { action: "accept" },
      }),
    );
    await check(
      await owner.request.post(`/api/bookings/${disputedBooking}/handoff`, {
        data: evidence,
      }),
    );
    await check(
      await borrower.request.post(`/api/bookings/${disputedBooking}/handoff`, {
        data: evidence,
      }),
    );
    await check(
      await borrower.request.post(`/api/bookings/${disputedBooking}/return`, {
        data: evidence,
      }),
      201,
    );
    await check(
      await other.request.post(`/api/bookings/${disputedBooking}/dispute`, {
        data: {
          reason: "Damage",
          description: "Unrelated user must not dispute",
        },
      }),
      403,
    );
    await check(
      await borrower.request.post(`/api/bookings/${disputedBooking}/dispute`, {
        data: {
          reason: "Condition disagreement",
          description: "Test dispute preserves existing workflow",
        },
      }),
      201,
    );
    assert.equal(
      (
        await prisma.booking.findUniqueOrThrow({
          where: { id: disputedBooking },
        })
      ).status,
      "DISPUTED",
    );
    const email = (await check(await borrower.request.get("/api/auth/me"))).user
      .email;
    await check(await borrower.request.post("/api/auth/logout"));
    await check(
      await borrower.request.post("/api/bookings", { data: bookingData }),
      401,
    );
    await check(
      await borrower.request.post("/api/auth/login", {
        data: { email, password: "wrong" },
      }),
      401,
    );
    await check(
      await borrower.request.post("/api/auth/login", {
        data: { email, password: "IntegrationTest123!" },
      }),
    );
    checks.push(
      "Existing dispute authorization, authentication, logout and login",
    );
    assert.deepEqual(errors, []);
    const report = {
      at: new Date().toISOString(),
      listingId,
      bookingId,
      checks,
      browserErrors: errors,
    };
    await writeFile(
      "docs/mrt/validation.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
