import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";
import { apiError, internalServerError } from "@/lib/api-response";
import { readRentalSubmission } from "@/lib/booking-evidence";
import { RentalError } from "@/lib/rental-errors";
import { submitRentalStage } from "@/lib/rental-lifecycle";
import { prisma } from "@/lib/prisma";

export function rentalFailure(error: unknown, context: string): Response {
  if (error instanceof RentalError)
    return apiError(error.message, error.status);
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2034"].includes(error.code)
  )
    return apiError("The rental record changed. Refresh and try again.", 409);
  return internalServerError(context, error);
}
export async function rentalStageRoute(
  request: Request,
  params: Promise<{ id: string }>,
  action: "handoff" | "return" | "inspection",
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);
    const id = parsePathId((await params).id);
    if (id === null) return apiError("Invalid booking ID.", 400);
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { ownerId: true, renterId: true },
    });
    if (!booking) return apiError("Booking not found.", 404);
    if (user.id !== booking.ownerId && user.id !== booking.renterId)
      return apiError("Participants only.", 403);
    const submission = await readRentalSubmission(request);
    const result = await submitRentalStage(id, user.id, action, submission);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return rentalFailure(error, `POST rental ${action}`);
  }
}
