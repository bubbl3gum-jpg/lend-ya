import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import { parseEvidence } from "@/lib/booking-evidence";
import { submitRentalStage } from "@/lib/rental-lifecycle";
import { rentalFailure } from "@/lib/rental-route";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
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
  dailyPrice: true,
  cancelledBy: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      deposit: true,
      status: true,
      owner: { select: { id: true, name: true } },
    },
  },
  owner: { select: { id: true, name: true } },
  renter: { select: { id: true, name: true } },
  meetingStation: { select: { id: true, code: true, name: true } },
  handoff: {
    select: {
      id: true,
      performedBy: true,
      ownerConditionConfirmed: true,
      borrowerConditionNotes: true,
      borrowerChecklist: true,
      checklist: true,
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
      returnConfirmed: true,
      inspectedBy: true,
      inspectedAt: true,
      inspectionAccepted: true,
      inspectionNotes: true,
      inspectionChecklist: true,
      checklist: true,
      confirmedBy: true,
      timestamp: true,
      confirmedAt: true,
      conditionNotes: true,
      conditionConfirmed: true,
    },
  },
  evidencePhotos: {
    select: {
      id: true,
      stage: true,
      mimeType: true,
      uploaderId: true,
      createdAt: true,
    },
  },
  disputes: {
    orderBy: { id: "desc" },
    select: {
      id: true,
      openedBy: true,
      reason: true,
      description: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      finding: true,
      bookingOutcome: true,
      decisionSummary: true,
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
    if (
      booking.ownerId !== currentUser.id &&
      booking.renterId !== currentUser.id
    ) {
      return apiError("You do not have access to this booking.", 403);
    }

    return Response.json({
      booking: { ...booking, dispute: booking.disputes[0] ?? null },
    });
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
    if (
      body.reason !== undefined &&
      (typeof body.reason !== "string" || body.reason.length > 2000)
    )
      return apiError(
        "Cancellation reason must be text of at most 2000 characters.",
        400,
      );
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
        return apiError(
          "This booking cannot be cancelled at its current stage.",
          409,
        );
      }
      nextStatus = "CANCELLED";
    } else if (action === "inspect") {
      if (!isOwner) {
        return apiError("Only the listing owner can inspect a return.", 403);
      }
      if (booking.status !== "RETURN_PENDING" || !booking.return) {
        return apiError(
          "Only bookings with a pending return can enter inspection.",
          409,
        );
      }
      nextStatus = "INSPECTION";
    } else if (action === "complete") {
      if (!isOwner) {
        return apiError("Only the listing owner can confirm a return.", 403);
      }
      if (
        booking.status !== "INSPECTION" ||
        !booking.return ||
        booking.return.confirmedBy
      ) {
        return apiError(
          "Only an unconfirmed return under inspection can be completed.",
          409,
        );
      }
      if (body.acceptable !== true)
        return apiError(
          "Completion requires an explicitly acceptable inspection. Use the inspection form to record concerns.",
          400,
        );
      try {
        const submission = { ...parseEvidence(body), photos: [] };
        await submitRentalStage(
          bookingId,
          currentUser.id,
          "inspection",
          submission,
        );
        const updated = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: bookingSelect,
        });
        return Response.json({
          booking: updated
            ? { ...updated, dispute: updated.disputes[0] ?? null }
            : null,
        });
      } catch (error) {
        return rentalFailure(error, "PATCH complete booking");
      }
    } else {
      return apiError("Unsupported booking action.", 400);
    }

    const transition = await prisma.$transaction(async (transaction) => {
      // Coordinate inspection entry with handoff, return, inspection and disputes.
      await transaction.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
      const record = await transaction.booking.findUniqueOrThrow({
        where: { id: bookingId },
      });
      await transaction.$queryRaw`SELECT id FROM "Listing" WHERE id = ${record.listingId} FOR UPDATE`;
      if (action === "accept") {
        await requireActiveAccounts(transaction, [
          record.ownerId,
          record.renterId,
        ]);
        const listing = await transaction.listing.findUniqueOrThrow({
          where: { id: record.listingId },
          include: {
            reports: { where: { status: "OPEN" } },
            media: { where: { kind: "PHOTO" }, take: 1 },
          },
        });
        if (
          record.startAt <= new Date() ||
          listing.status !== "ACTIVE" ||
          listing.adminRestricted ||
          !listing.media.length ||
          listing.reports.length
        )
          throw new Error("RESERVATION_CONFLICT");
        const conflict = await transaction.booking.findFirst({
          where: {
            listingId: record.listingId,
            id: { not: bookingId },
            OR: [
              { status: "DISPUTED" },
              {
                status: {
                  in: [
                    "HANDOFF_PENDING",
                    "IN_USE",
                    "RETURN_PENDING",
                    "INSPECTION",
                  ],
                },
              },
              {
                status: "CONFIRMED",
                startAt: { lt: record.endAt },
                endAt: { gt: record.startAt },
              },
            ],
          },
        });
        if (conflict) throw new Error("RESERVATION_CONFLICT");
      }
      return transaction.booking.updateMany({
        where: { id: bookingId, status: booking.status },
        data: {
          status: nextStatus!,
          ...(nextStatus === "CANCELLED"
            ? {
                cancelledBy: currentUser.id,
                cancelledAt: new Date(),
                cancellationReason:
                  typeof body.reason === "string"
                    ? body.reason.trim() || action
                    : action,
              }
            : {}),
        },
      });
    });
    if (transition.count !== 1) {
      return apiError(
        "The booking changed while you were updating it. Refresh and try again.",
        409,
      );
    }

    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingSelect,
    });
    return Response.json({
      booking: updated
        ? { ...updated, dispute: updated.disputes[0] ?? null }
        : null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RESERVATION_CONFLICT")
      return apiError(
        "This item is unavailable or already reserved. Refresh and choose another period.",
        409,
      );
    return internalServerError("PATCH /api/bookings/[id]", error);
  }
}
