import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePathId } from "@/lib/api-validation";
import { apiError, internalServerError } from "@/lib/api-response";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  let response: Response;
  try {
    const user = await getCurrentUser();
    if (!user) response = apiError("Authentication required.", 401);
    else if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
      response = apiError("Active administrator required.", 403);
    else {
      const { id, photoId } = await params,
        caseId = parsePathId(id);
      if (
        !caseId ||
        !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(photoId)
      )
        response = apiError("Evidence not found.", 404);
      else {
        const dispute = await prisma.dispute.findUnique({
          where: { id: caseId },
          select: { bookingId: true },
        });
        const photo =
          dispute &&
          (await prisma.bookingEvidencePhoto.findFirst({
            where: { id: photoId, bookingId: dispute.bookingId },
            select: { data: true, mimeType: true },
          }));
        if (!photo) response = apiError("Evidence not found.", 404);
        else
          response = new Response(new Uint8Array(photo.data), {
            headers: {
              "Content-Type": photo.mimeType,
              "Content-Length": String(photo.data.byteLength),
              "X-Content-Type-Options": "nosniff",
              "Cross-Origin-Resource-Policy": "same-origin",
              "Content-Security-Policy": "default-src 'none'; sandbox",
            },
          });
      }
    }
  } catch (error) {
    response = internalServerError("Administrative dispute evidence", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
