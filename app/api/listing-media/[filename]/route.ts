import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiError, internalServerError } from "@/lib/api-response";

const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await params;
  if (!/^[\da-f-]{36}\.(jpg|png|webp|mp4|webm)$/.test(filename)) {
    return apiError("Media file not found.", 404);
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "listings", filename);
    const content = await readFile(filePath);
    const extension = path.extname(filename).slice(1);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": mediaTypes[extension],
        "Content-Length": String(content.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return apiError("Media file not found.", 404);
    }
    return internalServerError("GET /api/listing-media/[filename]", error);
  }
}