import { Prisma } from "@prisma/client";
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
} as const;

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateRangeDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export async function GET(): Promise<Response> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError("Authentication required.", 401);
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ renterId: currentUser.id }, { ownerId: currentUser.id }],
      },
      orderBy: { startAt: "asc" },
      select: bookingSelect,
    });

    return Response.json({ bookings });
  } catch (error) {
    return internalServerError("GET /api/bookings", error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError("Authentication required.", 401);
  }

  try {
    const body = await readJsonObject(request);
    if (!body) {
      return apiError("Request body must be a valid JSON object.", 400);
    }

    const listingId = parsePathId(String(body.listingId ?? ""));
    const startAt = parseDateTime(body.startAt);
    const endAt = parseDateTime(body.endAt);
    const meetingStationId = parsePathId(String(body.meetingStationId ?? ""));
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!listingId || !startAt || !endAt || !meetingStationId) {
      return apiError("Provide a valid listing, dates, and meeting station.", 400);
    }
    if (startAt >= endAt) {
      return apiError("The booking end date must be after the start date.", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        ownerId: true,
        type: true,
        status: true,
        price: true,
        deposit: true,
        supportedStations: { select: { stationId: true } },
      },
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }
    if (listing.status !== "ACTIVE") {
      return apiError("This listing is inactive.", 409);
    }
    if (listing.ownerId === currentUser.id) {
      return apiError("You cannot book your own listing.", 409);
    }

    const stationIds = listing.supportedStations.map((entry) => entry.stationId);
    if (!stationIds.includes(meetingStationId)) {
      return apiError("The selected meeting station is not supported for this listing.", 400);
    }

    const existingOverlap = await prisma.booking.findFirst({
      where: {
        listingId,
        status: { in: ["PENDING", "CONFIRMED", "IN_USE", "RETURN_PENDING"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });

    if (existingOverlap) {
      return apiError("This listing is already booked for part of the selected period.", 409);
    }

    const totalDays = dateRangeDays(startAt, endAt);
    const totalPrice = listing.type === "SERVICE"
      ? listing.price
      : listing.price.mul(new Prisma.Decimal(totalDays));

    const booking = await prisma.booking.create({
      data: {
        listingId,
        ownerId: listing.ownerId,
        renterId: currentUser.id,
        meetingStationId,
        startAt,
        endAt,
        status: "PENDING",
        totalPrice,
        deposit: listing.deposit ?? null,
        notes: notes && notes.length > 0 ? notes : null,
      },
      select: bookingSelect,
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    return internalServerError("POST /api/bookings", error);
  }
}
