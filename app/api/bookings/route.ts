import { isSerializationConflict } from "@/lib/database-conflicts";
import { eligibleStationWhere, stationSelect } from "@/lib/mrt/network";
import { Prisma } from "@prisma/client";
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
      owner: { select: { id: true, name: true, email: true } },
    },
  },
  owner: { select: { id: true, name: true, email: true } },
  renter: { select: { id: true, name: true, email: true } },
  meetingStation: { select: stationSelect },
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
    const notes =
      typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!listingId || !startAt || !endAt || !meetingStationId) {
      return apiError(
        "Provide a valid listing, dates, and meeting station.",
        400,
      );
    }
    if (startAt >= endAt) {
      return apiError(
        "The booking end date must be after the start date.",
        400,
      );
    }

    const booking = await prisma.$transaction(
      async (transaction) => {
        // Same row lock as availability edits. Serializable isolation also protects overlap reads.
        await transaction.$queryRaw`SELECT "id" FROM "Listing" WHERE "id" = ${listingId} FOR UPDATE`;
        const listing = await transaction.listing.findUnique({
          where: { id: listingId },
          select: {
            id: true,
            title: true,
            ownerId: true,
            status: true,
            price: true,
            deposit: true,
            supportedStations: { select: { stationId: true } },
            reports: {
              where: { status: "OPEN" },
              select: { id: true },
              take: 1,
            },
            bookings: {
              where: { status: "DISPUTED" },
              select: { id: true },
              take: 1,
            },
          },
        });

        if (!listing) {
          throw new Error("LISTING_NOT_FOUND");
        }
        if (listing.status !== "ACTIVE") {
          throw new Error("LISTING_INACTIVE");
        }
        if (listing.reports.length > 0 || listing.bookings.length > 0) {
          throw new Error("LISTING_FLAGGED");
        }
        if (listing.ownerId === currentUser.id) {
          throw new Error("OWN_LISTING");
        }

        const stationIds = listing.supportedStations.map(
          (entry) => entry.stationId,
        );
        if (!stationIds.includes(meetingStationId)) {
          throw new Error("STATION_UNAVAILABLE");
        }

        const station = await transaction.mrtStation.findFirst({
          where: { id: meetingStationId, ...eligibleStationWhere },
        });
        if (
          !station ||
          (body.canonicalStationId !== undefined &&
            body.canonicalStationId !== station.canonicalId)
        )
          throw new Error("STATION_UNAVAILABLE");
        const totalDays = dateRangeDays(startAt, endAt);
        const totalPrice = listing.price.mul(new Prisma.Decimal(totalDays));

        const existingOverlap = await transaction.booking.findFirst({
          where: {
            listingId,
            status: { notIn: ["CANCELLED", "COMPLETED"] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
          select: { id: true },
        });

        if (existingOverlap) {
          throw new Error("BOOKING_OVERLAP");
        }

        return transaction.booking.create({
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "STATION_UNAVAILABLE")
        return Response.json(
          {
            error:
              "This station is no longer available. Choose and confirm another meeting station.",
            code: "STATION_UNAVAILABLE",
          },
          { status: 409 },
        );
      if (error.message === "LISTING_NOT_FOUND")
        return apiError("Listing not found.", 404);
      if (error.message === "LISTING_INACTIVE")
        return apiError("This listing is inactive.", 409);
      if (error.message === "LISTING_FLAGGED")
        return apiError(
          "This listing is flagged and cannot receive bookings.",
          409,
        );
      if (error.message === "OWN_LISTING")
        return apiError("You cannot book your own listing.", 409);
    }
    if (error instanceof Error && error.message === "BOOKING_OVERLAP") {
      return apiError(
        "This listing is already booked for part of the selected period.",
        409,
      );
    }
    if (isSerializationConflict(error)) {
      return Response.json(
        {
          error:
            "Listing availability changed during your request. Choose and confirm your station again.",
          code: "STATION_UNAVAILABLE",
        },
        { status: 409 },
      );
    }
    return internalServerError("POST /api/bookings", error);
  }
}
