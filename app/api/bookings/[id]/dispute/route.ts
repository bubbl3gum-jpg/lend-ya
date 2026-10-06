import { Prisma } from "@prisma/client";
import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId, parseRequiredString } from "@/lib/api-validation";
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
  const reason = parseRequiredString(body.reason, 120);
  const description = parseRequiredString(body.description, 2000);
  if (!reason || !description) {
    return apiError("Provide a reason (up to 120 characters) and description (up to 2000 characters).", 400);
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, ownerId: true, renterId: true, status: true },
    });
    if (!booking) {
      return apiError("Booking not found.", 404);
    }
    if (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id) {
      return apiError("You do not have access to this booking.", 403);
    }
    if (booking.status !== "RETURN_PENDING" && booking.status !== "INSPECTION") {
      return apiError("A dispute can only be opened while a return is pending or under inspection.", 409);
    }

    const dispute = await prisma.$transaction(async (transaction) => {
      const created = await transaction.dispute.create({
        data: {
          bookingId,
          openedBy: currentUser.id,
          reason,
          description,
        },
      });
      const changed = await transaction.booking.updateMany({
        where: {
          id: bookingId,
          status: { in: ["RETURN_PENDING", "INSPECTION"] },
        },
        data: { status: "DISPUTED" },
      });
      if (changed.count !== 1) {
        throw new Error("DISPUTE_STATE_CONFLICT");
      }
      return created;
    });

    return Response.json({ dispute, status: "DISPUTED" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DISPUTE_STATE_CONFLICT") {
      return apiError("The booking changed and can no longer be disputed in this state.", 409);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A dispute has already been opened for this booking.", 409);
    }
    return internalServerError("POST /api/bookings/[id]/dispute", error);
  }
}