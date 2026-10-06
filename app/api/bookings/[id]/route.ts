import { apiError, internalServerError } from "@/lib/api-response";
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
    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : null;
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
        listing: { select: { type: true } },
      },
    });

    if (!booking) {
      return apiError("Booking not found.", 404);
    }

    let nextStatus: "PENDING" | "CONFIRMED" | "IN_USE" | "RETURN_PENDING" | "COMPLETED" | "CANCELLED" | null = null;

    if (action === "accept") {
      if (booking.ownerId !== currentUser.id) {
        return apiError("Only the listing owner can accept this booking.", 403);
      }
      if (booking.status !== "PENDING") {
        return apiError("Only pending bookings can be accepted.", 409);
      }
      nextStatus = "CONFIRMED";
    } else if (action === "reject") {
      if (booking.ownerId !== currentUser.id) {
        return apiError("Only the listing owner can reject this booking.", 403);
      }
      if (booking.status !== "PENDING") {
        return apiError("Only pending bookings can be rejected.", 409);
      }
      nextStatus = "CANCELLED";
    } else if (action === "cancel") {
      if (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id) {
        return apiError("You are not allowed to cancel this booking.", 403);
      }
      if (!(["PENDING", "CONFIRMED"].includes(booking.status))) {
        return apiError("This booking cannot be cancelled at its current stage.", 409);
      }
      nextStatus = "CANCELLED";
    } else if (action === "start") {
      if (booking.ownerId !== currentUser.id) {
        return apiError("Only the listing owner can start this booking.", 403);
      }
      if (booking.status !== "CONFIRMED") {
        return apiError("Only confirmed bookings can begin.", 409);
      }
      nextStatus = "IN_USE";
    } else if (action === "return") {
      if (booking.renterId !== currentUser.id) {
        return apiError("Only the renter can mark this item as returned.", 403);
      }
      if (booking.status !== "IN_USE") {
        return apiError("Only bookings in use can be marked for return.", 409);
      }
      nextStatus = "RETURN_PENDING";
    } else if (action === "complete") {
      const isService = booking.listing.type === "SERVICE";
      const isAllowedState = isService ? booking.status === "CONFIRMED" : booking.status === "RETURN_PENDING";
      if (!isAllowedState) {
        return apiError("This booking cannot be marked complete in its current state.", 409);
      }
      if (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id) {
        return apiError("You do not have permission to complete this booking.", 403);
      }
      nextStatus = "COMPLETED";
    } else {
      return apiError("Unsupported booking action.", 400);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
      select: bookingSelect,
    });

    return Response.json({ booking: updated });
  } catch (error) {
    return internalServerError("PATCH /api/bookings/[id]", error);
  }
}
