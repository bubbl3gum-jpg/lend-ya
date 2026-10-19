import sharp from "sharp";
import { parseChecklist, type RentalChecklist } from "@/lib/rental-checklist";
import { RentalError } from "@/lib/rental-errors";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_PHOTO_BYTES = 20 * 1024 * 1024;
export type PrivatePhoto = { data: Uint8Array<ArrayBuffer>; mimeType: string };
export type RentalSubmission = {
  conditionConfirmed: boolean;
  returnConfirmed: boolean;
  acceptable?: boolean;
  conditionNotes: string | null;
  serialNumber: string | null;
  checklist: RentalChecklist;
  photos: PrivatePhoto[];
  meetupChallengeId?: string;
  physicalReceipt?: boolean;
};

export function parseEvidence(
  body: Record<string, unknown>,
): Omit<RentalSubmission, "photos"> {
  const checklist = parseChecklist(body.checklist);
  if (!checklist)
    throw new RentalError(
      "Answer all five checklist questions with yes, no, not applicable, or unknown.",
      400,
    );
  for (const [field, maximum] of [
    ["conditionNotes", 2000],
    ["serialNumber", 120],
  ] as const) {
    if (
      body[field] !== undefined &&
      (typeof body[field] !== "string" || body[field].length > maximum)
    )
      throw new RentalError(
        `${field} must be text of at most ${maximum} characters.`,
        400,
      );
  }
  if (body.acceptable !== undefined && typeof body.acceptable !== "boolean")
    throw new RentalError("Provide an explicit inspection decision.", 400);
  if (
    body.photos !== undefined &&
    (!Array.isArray(body.photos) || body.photos.length)
  )
    throw new RentalError(
      "Attach photos as image files; external photo URLs are not accepted.",
      400,
    );
  if(body.meetupChallengeId!==undefined&&(typeof body.meetupChallengeId!=="string"||! /^[a-f0-9-]{36}$/.test(body.meetupChallengeId)))throw new RentalError("Invalid meetup challenge reference.",400);
  if(body.physicalReceipt!==undefined&&typeof body.physicalReceipt!=="boolean")throw new RentalError("Provide an explicit physical receipt acknowledgement.",400);
  return {
    ...(typeof body.meetupChallengeId==="string"?{meetupChallengeId:body.meetupChallengeId}:{}),
    ...(typeof body.physicalReceipt==="boolean"?{physicalReceipt:body.physicalReceipt}:{}),
    checklist,
    conditionConfirmed: body.conditionConfirmed === true,
    returnConfirmed: body.returnConfirmed === true,
    ...(typeof body.acceptable === "boolean"
      ? { acceptable: body.acceptable }
      : {}),
    conditionNotes:
      typeof body.conditionNotes === "string"
        ? body.conditionNotes.trim() || null
        : null,
    serialNumber:
      typeof body.serialNumber === "string"
        ? body.serialNumber.trim() || null
        : null,
  };
}

export async function validatePrivatePhotos(
  files: File[],
): Promise<PrivatePhoto[]> {
  if (
    files.length > 8 ||
    files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_PHOTO_BYTES
  )
    throw new RentalError(
      "Attach at most eight photos, totaling at most 20 MB.",
      413,
    );
  const result: PrivatePhoto[] = [];
  for (const file of files) {
    if (!file.size || file.size > MAX_PHOTO_BYTES)
      throw new RentalError("Each photo must be between 1 byte and 5 MB.", 413);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new RentalError("Photos must be JPEG, PNG, or WebP.", 400);
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const image = sharp(input, {
        failOn: "warning",
        limitInputPixels: 16777216,
      }).timeout({ seconds: 5 });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
        `image/${metadata.format}` !== file.type ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > 4096 ||
        metadata.height > 4096 ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Invalid image.");
      // Decode/re-encode instead of trusting a filename or magic prefix. Strip metadata.
      const data = await image
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFormat(metadata.format as "jpeg" | "png" | "webp")
        .toBuffer();
      if (data.length > MAX_PHOTO_BYTES) throw new Error("Image too large.");
      result.push({ data: new Uint8Array(data), mimeType: file.type });
    } catch {
      throw new RentalError(
        "A photo is malformed, animated, too large, or does not match its image type.",
        400,
      );
    }
  }
  return result;
}

async function boundedBody(
  request: Request,
  maximum: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declared) || declared < 0 || declared > maximum)
    throw new RentalError("Evidence submission is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RentalError("Provide an evidence submission.", 400);
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new RentalError("Evidence submission is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Uint8Array(Buffer.concat(chunks));
}

export async function readRentalSubmission(
  request: Request,
): Promise<RentalSubmission> {
  const contentType = request.headers.get("content-type") ?? "";
  const multipart = contentType.startsWith("multipart/form-data;");
  const bytes = await boundedBody(
    request,
    multipart ? MAX_TOTAL_PHOTO_BYTES + 65536 : 32768,
  );
  let body: unknown;
  let files: File[] = [];
  try {
    if (multipart) {
      const form = await new Response(bytes, {
        headers: { "Content-Type": contentType },
      }).formData();
      const payload = form.get("payload");
      if (
        typeof payload !== "string" ||
        payload.length > 32768 ||
        form.getAll("payload").length !== 1
      )
        throw new Error("Invalid payload.");
      body = JSON.parse(payload);
      const photos = form.getAll("photos");
      if (photos.some((file) => !(file instanceof File)))
        throw new Error("Invalid photo field.");
      files = photos as File[];
      for (const [key] of form)
        if (key !== "payload" && key !== "photos")
          throw new Error("Unexpected upload field.");
    } else {
      if (!contentType.startsWith("application/json"))
        throw new RentalError(
          "Use JSON or multipart evidence submission.",
          415,
        );
      body = JSON.parse(new TextDecoder().decode(bytes));
    }
  } catch (error) {
    if (error instanceof RentalError) throw error;
    throw new RentalError("Provide a valid evidence submission.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new RentalError("Provide a JSON object.", 400);
  return {
    ...parseEvidence(body as Record<string, unknown>),
    photos: await validatePrivatePhotos(files),
  };
}
