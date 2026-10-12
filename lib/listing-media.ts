import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const maxPhotoSize = 10 * 1024 * 1024;
const maxVideoSize = 30 * 1024 * 1024;
const maxPhotos = 8;
const maxTotalSize = 60 * 1024 * 1024;

export type ListingMediaUpload = {
  file: File;
  kind: "PHOTO" | "VIDEO";
};

export type StoredListingMedia = {
  url: string;
  mimeType: string;
  kind: "PHOTO" | "VIDEO";
  filePath: string;
};

function identifyMedia(bytes: Uint8Array, kind: ListingMediaUpload["kind"]): { mimeType: string; extension: string } | null {
  if (kind === "PHOTO") {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { mimeType: "image/jpeg", extension: ".jpg" };
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { mimeType: "image/png", extension: ".png" };
    }
    if (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    ) {
      return { mimeType: "image/webp", extension: ".webp" };
    }
    return null;
  }

  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    return { mimeType: "video/mp4", extension: ".mp4" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mimeType: "video/webm", extension: ".webm" };
  }
  return null;
}

export async function validateListingMedia(photos: File[], video: File | null): Promise<string | null> {
  if (photos.length === 0) {
    return "Upload at least one item photo before publishing.";
  }
  if (photos.length > maxPhotos) {
    return `Upload no more than ${maxPhotos} photos.`;
  }
  if (video && video.size > maxVideoSize) {
    return "The optional video must be 30 MB or smaller.";
  }

  const files = [
    ...photos.map((file) => ({ file, kind: "PHOTO" as const })),
    ...(video ? [{ file: video, kind: "VIDEO" as const }] : []),
  ];
  if (files.reduce((total, entry) => total + entry.file.size, 0) > maxTotalSize) {
    return "The combined photo and video size must be 60 MB or smaller.";
  }

  for (const entry of files) {
    if (entry.kind === "PHOTO" && entry.file.size > maxPhotoSize) {
      return "Each photo must be 10 MB or smaller.";
    }
    const bytes = new Uint8Array(await entry.file.slice(0, 12).arrayBuffer());
    const signature = identifyMedia(bytes, entry.kind);
    if (!signature || (entry.file.type && entry.file.type !== signature.mimeType)) {
      return "Upload valid JPEG, PNG, or WebP photos and an optional MP4 or WebM video.";
    }
  }

  return null;
}

export async function storeListingMedia(uploads: ListingMediaUpload[]): Promise<StoredListingMedia[]> {
  const directory = path.join(process.cwd(), "public", "uploads", "listings");
  await mkdir(directory, { recursive: true });

  const stored: StoredListingMedia[] = [];
  try {
    for (const upload of uploads) {
      const bytes = new Uint8Array(await upload.file.arrayBuffer());
      const identified = identifyMedia(bytes, upload.kind);
      if (!identified) {
        throw new Error("Uploaded file content does not match an allowed media type.");
      }
      if (upload.file.type && upload.file.type !== identified.mimeType) {
        throw new Error("Uploaded file content does not match its declared media type.");
      }

      const filename = `${randomUUID()}${identified.extension}`;
      const filePath = path.join(directory, filename);
      await writeFile(filePath, bytes, { flag: "wx" });
      stored.push({
        url: `/api/listing-media/${filename}`,
        mimeType: identified.mimeType,
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

export async function deleteStoredListingMedia(media: StoredListingMedia[]): Promise<void> {
  await Promise.all(media.map((entry) => unlink(entry.filePath).catch(() => undefined)));
}