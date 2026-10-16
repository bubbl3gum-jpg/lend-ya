import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, internalServerError } from "@/lib/api-response";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
): Promise<Response> {
  let response: Response;
  try {
    const { filename } = await params;
    if (
      !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\.(jpg|png|webp|mp4|webm)$/.test(
        filename,
      )
    )
      return apiError("Media file not found.", 404);
    const media = await prisma.listingMedia.findFirst({
      where: {
        url: {
          in: [
            `/api/listing-media/${filename}`,
            `/uploads/listings/${filename}`,
          ],
        },
      },
      select: {
        mimeType: true,
        listing: {
          select: {
            id: true,
            ownerId: true,
            status: true,
            adminRestricted: true,
            owner: { select: { accountStatus: true } },
          },
        },
      },
    });
    if (!media) return apiError("Media file not found.", 404);
    const listing = media.listing;
    if (
      listing.status !== "ACTIVE" ||
      listing.adminRestricted ||
      listing.owner.accountStatus !== "ACTIVE"
    ) {
      const user = await getCurrentUser();
      const authorized =
        user &&
        (user.id === listing.ownerId ||
          (user.role === "ADMIN" && user.accountStatus === "ACTIVE") ||
          (await prisma.booking.count({
            where: {
              listingId: listing.id,
              OR: [{ ownerId: user.id }, { renterId: user.id }],
            },
          })) > 0);
      if (!authorized) return apiError("Media file not found.", 404);
    }
    let content: Buffer;
    try {
      content = await readFile(
        path.join(process.cwd(), "storage", "listings", filename),
      );
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
      content = await readFile(
        path.join(process.cwd(), "public", "uploads", "listings", filename),
      );
    }
    response = new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(content.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    response =
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? apiError("Media file not found.", 404)
        : internalServerError("Listing media", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
