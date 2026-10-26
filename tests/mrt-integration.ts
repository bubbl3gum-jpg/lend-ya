import sharp from "sharp";
import { checklistItems } from "../lib/rental-checklist";
import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { type APIResponse } from "playwright";
import path from "node:path";
import { connectTestDatabase } from "./support/test-database";
import {mrtPollTrace} from "./support/mrt-poll-trace";
import { launchBrowser, collectBrowserErrors } from "./support/browser";
import { verifyApplicationDatabase } from "./support/application-database";
import { removalRace } from "./support/concurrency";
import { prisma } from "../lib/prisma";
import { network } from "../lib/mrt/network";
import { legacyCanonicalIds } from "../lib/mrt/station-mapping";

const baseURL = process.env.MRT_TEST_URL!;
async function main() {
  const identity = await connectTestDatabase();
  await identity.end();
  const runId = process.env.MRT_TEST_RUN_ID!;
  const artifactDir = process.env.MRT_TEST_ARTIFACT_DIR!;
  if (!baseURL || new URL(baseURL).hostname !== "localhost" || !artifactDir)
    throw Error("Use the isolated test runner with its localhost app.");
  const browser = await launchBrowser();
  const errors: string[] = [];
  const checks: string[] = [];
  let browserWorkloadStartedAt:string|null=null;
  const traces: Awaited<ReturnType<typeof mrtPollTrace>>[]=[];
  async function check(response: APIResponse, status = 200) {
    assert.equal(response.status(), status, await response.text());
    return response.json();
  }
  async function register(name: string) {
    const context = await browser.newContext({ baseURL });
    traces.push(await mrtPollTrace(context));
    collectBrowserErrors(context, errors);
    await check(
      await context.request.post("/api/auth/register", {
        data: {
          name,
          email: `mrt-${runId}-${name}@example.test`,
          password: "IntegrationTest123!",
        },
      }),
      201,
    );
    return context;
  }
  const png = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  try {
    await mkdir(path.join(artifactDir, "screenshots"), { recursive: true });
    await verifyApplicationDatabase(browser, prisma, baseURL, runId);
    checks.push(
      "Random-session challenge verifies application and test client share the owned database",
    );
    const before = await prisma.mrtStation.findMany();
    const history = await prisma.booking.findMany({
      select: { id: true, meetingStationId: true },
    });
    // Inventory is provisioned only by migration deploy on the runner-owned fresh database.
    const stationSnapshot = JSON.stringify(before);
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
      "120 canonical mappings, five legacy IDs and historical booking foreign keys",
    );
    const owner = await register("owner"),
      borrower = await register("borrower"),
      other = await register("other");
    browserWorkloadStartedAt=new Date().toISOString();
    const page = await owner.newPage();

    await page.goto("/listings/new");
    await page
      .getByRole("button", { name: "Choose pickup stations", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
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
      path: path.join(artifactDir, "screenshots", "desktop-owner.png"),
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
    assert.doesNotMatch(
      (await bd.getByTestId("map-transform").getAttribute("transform"))!,
      /NaN|Infinity/,
      "Pan must retain finite SVG coordinates",
    );
    await bd.getByRole("button", { name: "Reset map view" }).click();
    await bd.locator('[data-station-id="taipei-main"] .station-hit').click();
    await bp.screenshot({
      path: path.join(artifactDir, "screenshots", "desktop-borrower.png"),
      fullPage: true,
    });
    await bd.getByRole("button", { name: "Confirm meeting station" }).click();
    await bp.getByLabel("Start date", { exact: true }).fill("2027-01-02T10:00");
    await bp.getByLabel("End date", { exact: true }).fill("2027-01-03T10:00");
    await bp
      .getByLabel("Notes", { exact: true })
      .fill("Agree on the exact exit before handoff.");
    await bp
      .getByRole("button", { name: "Review quotation", exact: true })
      .click();
    await bp
      .getByRole("button", { name: "Confirm and submit request", exact: true })
      .click();
    await bp.waitForURL(/\/bookings\/\d+$/);
    const bookingId = Number(bp.url().split("/").at(-1));
    assert.equal(
      (await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }))
        .meetingStationId,
      taipei.id,
    );
    await bp.waitForFunction(()=>document.body.innerText.includes("台北車站"));
    assert.match(await bp.locator("body").innerText(), /台北車站/);
    assert.match(await bp.locator("body").innerText(), /R10 \/ BL12/);
    await bp.screenshot({
      path: path.join(artifactDir, "screenshots", "booking-confirmation.png"),
      fullPage: true,
    });
    await page.goto(`/bookings/${bookingId}`);
    await page.waitForFunction(()=>document.body.innerText.includes("台北車站"));
    assert.match(await page.locator("body").innerText(), /台北車站/);
    checks.push(
      "Borrower explicit selection, disabled stations, search/zoom/pan, bilingual booking and integer station FK",
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
    for (const fullForm of [false, true]) {
      await check(
        await owner.request.patch(`/api/listings/${listingId}`, {
          data: { stationIds: [taipei.id, ximen.id] },
        }),
      );
      await removalRace({
        owner: owner.request,
        borrower: borrower.request,
        prisma,
        listingId,
        removedStationId: taipei.id,
        keptStationId: ximen.id,
        startAt: fullForm ? "2027-03-02T10:00:00Z" : "2027-02-02T10:00:00Z",
        endAt: fullForm ? "2027-03-03T10:00:00Z" : "2027-02-03T10:00:00Z",
        fullForm,
      });
    }
    assert.equal(
      (await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }))
        .meetingStationId,
      taipei.id,
    );
    const overlapData = {
      listingId,
      meetingStationId: ximen.id,
      startAt: "2027-05-02T10:00:00Z",
      endAt: "2027-05-03T10:00:00Z",
    };
    // Admin/MVP allows competing pending requests; only acceptance reserves dates.
    const overlapResponses = [
      await borrower.request.post("/api/bookings",{data:overlapData}),
      await other.request.post("/api/bookings",{data:overlapData}),
    ];
    for (const response of overlapResponses)
      assert.equal(response.status(), 201);
    const overlapBookings = await Promise.all(
      overlapResponses.map(
        async (response) =>
          ((await response.json()) as { booking: { id: number } }).booking.id,
      ),
    );
    const accepted = await Promise.all(
      overlapBookings.map((id) =>
        owner.request.patch(`/api/bookings/${id}`, {
          data: { action: "accept" },
        }),
      ),
    );
    assert.deepEqual(
      accepted.map((response) => response.status()).sort(),
      [200, 409],
    );
    assert.equal(
      await prisma.booking.count({
        where: {
          listingId,
          startAt: new Date(overlapData.startAt),
          status: "CONFIRMED",
        },
      }),
      1,
    );
    checks.push(
      "Real station-only and full-form PATCH races reject waiting stale bookings; historical locations and concurrent overlap protection preserved",
    );
    const mobile = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      storageState: await borrower.storageState(),
    });
    collectBrowserErrors(mobile, errors);
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
      path: path.join(artifactDir, "screenshots", "mobile-borrower.png"),
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
      returnConfirmed: true,
      checklist: Object.fromEntries(
        Object.keys(checklistItems).map((key) => [key, "yes"]),
      ),
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
      200,
    );
    await check(
      await owner.request.patch(`/api/bookings/${bookingId}`, {
        data: { action: "inspect" },
      }),
    );
    await check(
      await owner.request.post(`/api/bookings/${bookingId}/inspection`, {
        data: { ...evidence, acceptable: true },
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
      200,
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
    // Booking UI assertions are complete. End its polling lifecycle before this API-only
    // negative-auth phase; real open-page session loss is exercised separately.
    traces.forEach(t=>t.mark("NAVIGATE_PUBLIC"));
    for (const view of borrower.pages()) await view.goto("/login");
    traces.forEach(t=>t.mark("LOGOUT_BEGIN"));
    await check(await borrower.request.post("/api/auth/logout"));
    traces.forEach(t=>t.mark("LOGGED_OUT"));

    await check(
      await borrower.request.post("/api/bookings", { data: bookingData }),
      401,
    );
    traces.forEach(t=>t.mark("WRONG_LOGIN"));
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
    traces.forEach(t=>t.mark("NEW_LOGIN"));
    checks.push(
      "Existing dispute authorization, authentication, logout and login",
    );
    assert.equal(
      JSON.stringify(await prisma.mrtStation.findMany()),
      stationSnapshot,
      "Regression tests changed shared station metadata",
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
      path.join(artifactDir, "validation.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await writeFile(path.join(artifactDir,"logout-poll-trace.json"),JSON.stringify({browserWorkload:{startedAt:browserWorkloadStartedAt,endedAt:new Date().toISOString()},traces:traces.map(t=>t.events),browserErrors:errors.map(e=>e.startsWith("401 /api/bookings/")?"MEETUP_STATUS_401":e.includes("401")?"HTTP_401_CONSOLE":"UNEXPECTED_BROWSER_ERROR")},null,2));
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
