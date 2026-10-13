import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";
import { apiError, internalServerError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);
    const { id, photoId } = await params;
    const bookingId = parsePathId(id);
    if (
      !bookingId ||
      !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(photoId)
    )
      return apiError("Evidence not found.", 404);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { ownerId: true, renterId: true },
    });
    if (!booking) return apiError("Booking not found.", 404);
    // Future admin access must be explicit and audited; roles alone do not bypass this check.
    if (booking.ownerId !== user.id && booking.renterId !== user.id)
      return apiError("Participants only.", 403);
    const photo = await prisma.bookingEvidencePhoto.findFirst({
      where: { id: photoId, bookingId },
      select: { data: true, mimeType: true },
    });
    if (!photo) return apiError("Evidence not found.", 404);
    return new Response(new Uint8Array(photo.data), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(photo.data.byteLength),
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return internalServerError("GET private booking evidence", error);
  }
}
