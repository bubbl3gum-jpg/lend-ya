import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { parseChecklist, checklistItems } from "../lib/rental-checklist";
import {
  parseEvidence,
  readRentalSubmission,
  validatePrivatePhotos,
} from "../lib/booking-evidence";
const checklist = Object.fromEntries(
  Object.keys(checklistItems).map((key) => [key, "unknown"]),
);
test("checklist supports failures, uncertainty and not applicable, but requires all fields", () => {
  assert.ok(
    parseChecklist({
      ...checklist,
      matchesItem: "no",
      accessoriesChecked: "not_applicable",
    }),
  );
  for (const invalid of [
    null,
    [],
    {},
    { ...checklist, extra: "yes" },
    { ...checklist, functionTested: true },
    { ...checklist, visuallyInspected: "perfect" },
  ])
    assert.equal(parseChecklist(invalid), null);
});
test("evidence rejects external URLs, wrong text types and oversized notes; never infers consent", () => {
  assert.equal(parseEvidence({ checklist }).conditionConfirmed, false);
  assert.equal(parseEvidence({ checklist }).returnConfirmed, false);
  for (const invalid of [
    { photos: ["https://example.com/private.jpg"] },
    { conditionNotes: [] },
    { conditionNotes: "x".repeat(2001) },
    { serialNumber: "x".repeat(121) },
    { acceptable: "true" },
  ])
    assert.throws(() => parseEvidence({ checklist, ...invalid }));
});
test("still images are decoded and sanitized; forged image data and SVG are rejected", async () => {
  const source = await sharp({
    create: { width: 3, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const appended = Buffer.concat([
    source,
    Buffer.from("<script>alert(1)</script>"),
  ]);
  const [photo] = await validatePrivatePhotos([
    new File([appended], "untrusted-name.html", { type: "image/png" }),
  ]);
  assert.equal(photo.mimeType, "image/png");
  assert.equal((await sharp(photo.data).metadata()).width, 3);
  assert.equal(
    Buffer.from(photo.data).includes(Buffer.from("<script>")),
    false,
  );
  await assert.rejects(
    validatePrivatePhotos([
      new File(["not an image"], "x.png", { type: "image/png" }),
    ]),
  );
  await assert.rejects(
    validatePrivatePhotos([
      new File([source], "x.jpg", { type: "image/jpeg" }),
    ]),
  );
  await assert.rejects(
    validatePrivatePhotos([
      new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
    ]),
  );
});
test("submission limits are enforced even without Content-Length", async () => {
  const oversized = new Request("http://test/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checklist, conditionNotes: "x".repeat(40000) }),
  });
  await assert.rejects(readRentalSubmission(oversized), /too large/);
  const invalid = new Request("http://test/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "[1]",
  });
  await assert.rejects(readRentalSubmission(invalid), /JSON object/);
});
