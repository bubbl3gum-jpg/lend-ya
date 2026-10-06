import { Prisma } from "@prisma/client";
import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError("Authentication required.", 401);
  }

  const { id } = await params;
  const bookingId = parsePathId(id);
  if (bookingId === null) {
    return apiError("Booking id must be a positive integer.", 400);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return apiError("Request body must be a valid JSON object.", 400);
  }
  if (body.conditionNotes !== undefined && typeof body.conditionNotes !== "string") {
    return apiError("Condition notes must be text.", 400);
  }
  const conditionNotes = typeof body.conditionNotes === "string" ? body.conditionNotes.trim() : null;
  if ((conditionNotes?.length ?? 0) > 2000) {
    return apiError("Condition notes must be 2000 characters or fewer.", 400);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, ownerId: true, renterId: true },
    });
    if (!booking) {
      return apiError("Booking not found.", 404);
    }
    if (booking.renterId !== currentUser.id) {
      return apiError("Only the renter can initiate a return.", 403);
    }

    await prisma.$transaction(async (transaction) => {
      const returned = await transaction.return.create({
        data: {
          bookingId,
          initiatedBy: currentUser.id,
          conditionNotes,
        },
      });
      const changed = await transaction.booking.updateMany({
        where: { id: bookingId, renterId: currentUser.id, status: "IN_USE" },
        data: { status: "RETURN_PENDING" },
      });
      if (changed.count !== 1) {
        throw new Error("RETURN_STATE_CONFLICT");
      }
      return returned;
    });

    const updatedReturn = await prisma.return.findUnique({ where: { bookingId } });
    return Response.json({ return: updatedReturn, status: "RETURN_PENDING" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "RETURN_STATE_CONFLICT") {
      const current = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      });
      if (!current) {
        return apiError("Booking not found.", 404);
      }
      return apiError("Only an in-use booking without a prior return can begin the return process.", 409);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A return has already been recorded for this booking.", 409);
    }
    return internalServerError("POST /api/bookings/[id]/return", error);
  }
}