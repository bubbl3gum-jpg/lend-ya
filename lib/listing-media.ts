import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import sharp from "sharp";
export type ListingMediaUpload = { file: File; kind: "PHOTO" | "VIDEO" };
export type StoredListingMedia = {
  url: string;
  mimeType: string;
  kind: "PHOTO" | "VIDEO";
  filePath: string;
};
export async function boundedListingForm(request: Request): Promise<FormData> {
  const maximum = 60 * 1024 * 1024 + 65536,
    reader = request.body?.getReader();
  if (!reader) throw new Error("Uploaded file submission is empty.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maximum) {
        await reader.cancel();
        throw new Error("Uploaded file submission exceeds 60 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new Error("Uploaded file multipart submission is malformed.");
  }
}
async function sanitizePhoto(file: File) {
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
        failOn: "warning",
        limitInputPixels: 16777216,
      }).timeout({ seconds: 5 }),
      meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      !meta.width ||
      !meta.height ||
      meta.width > 4096 ||
      meta.height > 4096 ||
      (meta.pages ?? 1) > 1 ||
      (file.type && file.type !== `image/${meta.format}`)
    )
      throw new Error("Invalid image");
    const bytes = await image
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(meta.format as "jpeg" | "png" | "webp")
      .toBuffer();
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Image exceeds limit");
    return {
      bytes,
      mimeType: `image/${meta.format}`,
      extension: meta.format === "jpeg" ? "jpg" : meta.format!,
    };
  } catch {
    throw new Error(
      "Uploaded file photo is malformed, animated, oversized or does not match JPEG/PNG/WebP content.",
    );
  }
}
async function inspectVideo(file: File) {
  if (!["video/mp4", "video/webm"].includes(file.type))
    throw new Error("Uploaded file video must be MP4 or WebM.");
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const output = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        "ffprobe",
        [
          "-v",
          "error",
          "-protocol_whitelist",
          "pipe",
          "-show_entries",
          "format=format_name:stream=codec_type,codec_name",
          "-of",
          "json",
          "pipe:0",
        ],
        { timeout: 5000, maxBuffer: 65536 },
        (error, stdout) => (error ? reject(error) : resolve(stdout)),
      );
      child.stdin?.on("error", () => {});
      child.stdin?.end(bytes);
    });
    const info = JSON.parse(output) as {
      format?: { format_name: string };
      streams?: { codec_type: string; codec_name: string }[];
    };
    const match =
      file.type === "video/mp4"
        ? info.format?.format_name.includes("mp4")
        : info.format?.format_name.includes("webm");
    if (
      !match ||
      !info.streams?.some(
        (s) =>
          s.codec_type === "video" &&
          ["h264", "hevc", "av1", "vp8", "vp9"].includes(s.codec_name),
      )
    )
      throw new Error("Unsupported video");
    return {
      bytes,
      mimeType: file.type,
      extension: file.type === "video/mp4" ? "mp4" : "webm",
    };
  } catch {
    throw new Error(
      "Uploaded file video is malformed or unsupported; MP4/WebM validation requires ffprobe.",
    );
  }
}
export async function validateListingMedia(
  photos: File[],
  video: File | null,
): Promise<string | null> {
  if (!photos.length)
    return "Upload at least one item photo before publishing.";
  if (photos.length > 8) return "Upload no more than 8 photos.";
  if (photos.some((f) => !f.size || f.size > 10 * 1024 * 1024))
    return "Each photo must be between 1 byte and 10 MB.";
  if (video && (!video.size || video.size > 30 * 1024 * 1024))
    return "The optional video must be between 1 byte and 30 MB.";
  if (photos.reduce((n, f) => n + f.size, video?.size ?? 0) > 60 * 1024 * 1024)
    return "The combined photo and video size must be 60 MB or smaller.";
  try {
    for (const f of photos) await sanitizePhoto(f);
    if (video) await inspectVideo(video);
  } catch (error) {
    return error instanceof Error ? error.message : "Uploaded file is invalid.";
  }
  return null;
}
export async function storeListingMedia(
  uploads: ListingMediaUpload[],
): Promise<StoredListingMedia[]> {
  const directory = path.join(process.cwd(), "storage", "listings");
  await mkdir(directory, { recursive: true });
  const stored: StoredListingMedia[] = [];
  try {
    for (const upload of uploads) {
      const media =
          upload.kind === "PHOTO"
            ? await sanitizePhoto(upload.file)
            : await inspectVideo(upload.file),
        filename = `${randomUUID()}.${media.extension}`,
        filePath = path.join(directory, filename);
      await writeFile(filePath, media.bytes, { flag: "wx" });
      stored.push({
        url: `/api/listing-media/${filename}`,
        mimeType: media.mimeType,
        kind: upload.kind,
        filePath,
      });
    }
    return stored;
  } catch (error) {
    await deleteStoredListingMedia(stored);
    throw error;
  }
}
export async function deleteStoredListingMedia(
  media: StoredListingMedia[],
): Promise<void> {
  await Promise.all(
    media.map((m) => unlink(m.filePath).catch(() => undefined)),
  );
}
