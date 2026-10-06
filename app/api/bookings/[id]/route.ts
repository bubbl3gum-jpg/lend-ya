import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePathId } from "@/lib/api-validation";

const bookingSelect = {
  id: true,
  listingId: true,
  ownerId: true,
  renterId: true,
  meetingStationId: true,
  startAt: true,
  endAt: true,
  status: true,
  totalPrice: true,
  deposit: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      type: true,
      price: true,
      deposit: true,
      status: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  },
  owner: { select: { id: true, name: true, email: true } },
  renter: { select: { id: true, name: true, email: true } },
  meetingStation: { select: { id: true, code: true, name: true } },
  handoff: {
    select: {
      id: true,
      performedBy: true,
      confirmedBy: true,
      timestamp: true,
      confirmedAt: true,
      serialNumber: true,
      conditionNotes: true,
      conditionConfirmed: true,
    },
  },
  return: {
    select: {
      id: true,
      initiatedBy: true,
      confirmedBy: true,
      timestamp: true,
      confirmedAt: true,
      conditionNotes: true,
      conditionConfirmed: true,
    },
  },
  dispute: {
    select: {
      id: true,
      openedBy: true,
      reason: true,
      description: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
    },
  },
} as const;

export async function GET(
  _request: Request,
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

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingSelect,
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }
    if (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id) {
      return apiError("You do not have access to this booking.", 403);
    }

    return Response.json({ booking });
  } catch (error) {
    return internalServerError("GET /api/bookings/[id]", error);
  }
}

export async function PATCH(
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

  try {
    const body = await readJsonObject(request);
    if (!body) {
      return apiError("Request body must be a valid JSON object.", 400);
    }
    const action = typeof body.action === "string" ? body.action : null;
    if (!action) {
      return apiError("Provide an action to update the booking.", 400);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        ownerId: true,
        renterId: true,
        status: true,
        return: { select: { id: true, confirmedBy: true } },
      },
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }

    const isOwner = booking.ownerId === currentUser.id;
    const isRenter = booking.renterId === currentUser.id;
    if (!isOwner && !isRenter) {
      return apiError("You do not have access to this booking.", 403);
    }

    let nextStatus: typeof booking.status | null = null;

    if (action === "accept") {
      if (!isOwner) {
        return apiError("Only the listing owner can accept this booking.", 403);
      }
      if (booking.status !== "PENDING") {
        return apiError("Only pending bookings can be accepted.", 409);
      }
      nextStatus = "CONFIRMED";
    } else if (action === "reject") {
      if (!isOwner) {
        return apiError("Only the listing owner can reject this booking.", 403);
      }
      if (booking.status !== "PENDING") {
        return apiError("Only pending bookings can be rejected.", 409);
      }
      nextStatus = "CANCELLED";
    } else if (action === "cancel") {
      if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
        return apiError("This booking cannot be cancelled at its current stage.", 409);
      }
      nextStatus = "CANCELLED";
    } else if (action === "inspect") {
      if (!isOwner) {
        return apiError("Only the listing owner can inspect a return.", 403);
      }
      if (booking.status !== "RETURN_PENDING" || !booking.return) {
        return apiError("Only bookings with a pending return can enter inspection.", 409);
      }
      nextStatus = "INSPECTION";
    } else if (action === "complete") {
      if (!isOwner) {
        return apiError("Only the listing owner can confirm a return.", 403);
      }
      if (booking.status !== "INSPECTION" || !booking.return || booking.return.confirmedBy) {
        return apiError("Only an unconfirmed return under inspection can be completed.", 409);
      }
      if (body.conditionConfirmed !== true) {
        return apiError("Confirm that the returned item condition has been inspected.", 400);
      }
      if (body.conditionNotes !== undefined && typeof body.conditionNotes !== "string") {
        return apiError("Condition notes must be text.", 400);
      }
      const conditionNotes = typeof body.conditionNotes === "string"
        ? body.conditionNotes.trim()
        : undefined;
      if (conditionNotes !== undefined && conditionNotes.length > 2000) {
        return apiError("Condition notes must be 2000 characters or fewer.", 400);
      }

      try {
        await prisma.$transaction(async (transaction) => {
          const returned = await transaction.return.updateMany({
            where: { bookingId, confirmedBy: null },
            data: {
              confirmedBy: currentUser.id,
              confirmedAt: new Date(),
              conditionConfirmed: true,
              ...(conditionNotes !== undefined ? { conditionNotes: conditionNotes || null } : {}),
            },
          });
          if (returned.count !== 1) {
            throw new Error("RETURN_CONFIRMATION_CONFLICT");
          }

          const completed = await transaction.booking.updateMany({
            where: { id: bookingId, status: "INSPECTION" },
            data: { status: "COMPLETED" },
          });
          if (completed.count !== 1) {
            throw new Error("BOOKING_TRANSITION_CONFLICT");
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message.endsWith("_CONFLICT")) {
          return apiError("The booking changed while you were confirming the return. Refresh and try again.", 409);
        }
        throw error;
      }

      const completedBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: bookingSelect,
      });
      return Response.json({ booking: completedBooking });
    } else {
      return apiError("Unsupported booking action.", 400);
    }

    const transition = await prisma.booking.updateMany({
      where: { id: bookingId, status: booking.status },
      data: { status: nextStatus },
    });
    if (transition.count !== 1) {
      return apiError("The booking changed while you were updating it. Refresh and try again.", 409);
    }

    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingSelect,
    });
    return Response.json({ booking: updated });
  } catch (error) {
    return internalServerError("PATCH /api/bookings/[id]", error);
  }
}
