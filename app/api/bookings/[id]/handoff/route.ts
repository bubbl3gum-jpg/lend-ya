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
  if (!body || body.conditionConfirmed !== true) {
    return apiError("Confirm the item condition to record the handoff.", 400);
  }
  if (
    (body.serialNumber !== undefined && typeof body.serialNumber !== "string") ||
    (body.conditionNotes !== undefined && typeof body.conditionNotes !== "string")
  ) {
    return apiError("Serial number and condition notes must be text.", 400);
  }

  const serialNumber = typeof body.serialNumber === "string" ? body.serialNumber.trim() : null;
  const conditionNotes = typeof body.conditionNotes === "string" ? body.conditionNotes.trim() : null;
  if ((serialNumber?.length ?? 0) > 120 || (conditionNotes?.length ?? 0) > 2000) {
    return apiError("Serial number or condition notes exceed the allowed length.", 400);
  }

  try {
    const participantBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, ownerId: true, renterId: true },
    });
    if (!participantBooking) {
      return apiError("Booking not found.", 404);
    }
    if (participantBooking.ownerId !== currentUser.id && participantBooking.renterId !== currentUser.id) {
      return apiError("You do not have access to this booking.", 403);
    }

    const handoff = await prisma.$transaction(async (transaction) => {
      const booking = await transaction.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, ownerId: true, renterId: true },
      });
      if (!booking || (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id)) {
        throw new Error("BOOKING_UNAVAILABLE");
      }

      if (booking.status === "CONFIRMED") {
        const created = await transaction.handoff.create({
          data: {
            bookingId,
            performedBy: currentUser.id,
            serialNumber,
            conditionNotes,
          },
        });
        const changed = await transaction.booking.updateMany({
          where: { id: bookingId, status: "CONFIRMED" },
          data: { status: "HANDOFF_PENDING" },
        });
        if (changed.count !== 1) {
          throw new Error("HANDOFF_CONFLICT");
        }
        return created;
      }

      if (booking.status !== "HANDOFF_PENDING") {
        throw new Error("HANDOFF_STATE_INVALID");
      }

      const existing = await transaction.handoff.findUnique({ where: { bookingId } });
      if (!existing || existing.confirmedBy !== null || existing.performedBy === currentUser.id) {
        throw new Error("HANDOFF_CONFLICT");
      }

      const confirmed = await transaction.handoff.updateMany({
        where: { bookingId, confirmedBy: null },
        data: {
          confirmedBy: currentUser.id,
          confirmedAt: new Date(),
          conditionConfirmed: true,
          ...(existing.serialNumber === null && serialNumber ? { serialNumber } : {}),
          ...(existing.conditionNotes === null && conditionNotes ? { conditionNotes } : {}),
        },
      });
      if (confirmed.count !== 1) {
        throw new Error("HANDOFF_CONFLICT");
      }

      const changed = await transaction.booking.updateMany({
        where: { id: bookingId, status: "HANDOFF_PENDING" },
        data: { status: "IN_USE" },
      });
      if (changed.count !== 1) {
        throw new Error("HANDOFF_CONFLICT");
      }
      return transaction.handoff.findUniqueOrThrow({ where: { bookingId } });
    });

    return Response.json({ handoff, status: handoff.conditionConfirmed ? "IN_USE" : "HANDOFF_PENDING" });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_UNAVAILABLE") {
      return apiError("Booking not found or access denied.", 404);
    }
    if (error instanceof Error && error.message === "HANDOFF_STATE_INVALID") {
      return apiError("A handoff can only be started for a confirmed booking.", 409);
    }
    if (
      error instanceof Error && error.message === "HANDOFF_CONFLICT"
    ) {
      return apiError("This handoff was already recorded or confirmed. Refresh and try again.", 409);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("A handoff has already been recorded for this booking.", 409);
    }
    return internalServerError("POST /api/bookings/[id]/handoff", error);
  }
}