import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import {
  parseRentalTime,
  rentalDays,
  MAX_RENTAL_DAYS,
} from "@/lib/booking-time";
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
  dailyPrice: true,
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
} as const;

function isSerializationConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }

  if (
    error instanceof Error &&
    typeof error.cause === "object" &&
    error.cause !== null
  ) {
    return (
      "originalCode" in error.cause && error.cause.originalCode === "40001"
    );
  }

  return false;
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

    const listingId =
      typeof body.listingId === "number"
        ? parsePathId(String(body.listingId))
        : null;
    const startAt = parseRentalTime(body.startAt);
    const endAt = parseRentalTime(body.endAt);
    const meetingStationId =
      typeof body.meetingStationId === "number"
        ? parsePathId(String(body.meetingStationId))
        : null;
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

    if (startAt <= new Date())
      return apiError("Start time must be in the future.", 400);
    if (endAt.getTime() - startAt.getTime() > MAX_RENTAL_DAYS * 86400000)
      return apiError("Maximum rental duration is 90 days.", 400);
    if (
      body.notes !== undefined &&
      (typeof body.notes !== "string" || body.notes.length > 2000)
    )
      return apiError("Notes must be text of at most 2000 characters.", 400);
    return await prisma.$transaction(async (transaction) => {
      await requireActiveAccounts(transaction, [currentUser.id]);
      await transaction.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          title: true,
          ownerId: true,
          status: true,
          adminRestricted: true,
          owner: { select: { accountStatus: true } },
          media: { where: { kind: "PHOTO" }, select: { id: true }, take: 1 },
          price: true,
          deposit: true,
          supportedStations: { select: { stationId: true } },
          reports: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
          bookings: {
            where: { status: "DISPUTED" },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!listing) {
        return apiError("Listing not found.", 404);
      }
      if (
        listing.status !== "ACTIVE" ||
        listing.adminRestricted ||
        !listing.media.length ||
        listing.owner.accountStatus !== "ACTIVE"
      ) {
        return apiError(
          "This listing is unavailable due to its status, moderation, owner account or missing photos.",
          409,
        );
      }
      if (listing.reports.length > 0 || listing.bookings.length > 0) {
        return apiError(
          "This listing is flagged and cannot receive bookings.",
          409,
        );
      }
      await requireActiveAccounts(transaction, [listing.ownerId]);
      if (listing.ownerId === currentUser.id) {
        return apiError("You cannot book your own listing.", 409);
      }

      const stationIds = listing.supportedStations.map(
        (entry) => entry.stationId,
      );
      if (!stationIds.includes(meetingStationId)) {
        return apiError(
          "The selected meeting station is not supported for this listing.",
          400,
        );
      }

      const totalDays = rentalDays(startAt, endAt);
      const totalPrice = listing.price.mul(new Prisma.Decimal(totalDays));

      if (
        !listing.price.isFinite() ||
        listing.price.lte(0) ||
        !totalPrice.isFinite() ||
        totalPrice.gt("9999999999.99") ||
        (listing.deposit !== null &&
          (!listing.deposit.isFinite() || listing.deposit.isNegative()))
      )
        return apiError("Listing price is outside the supported range.", 400);
      const existingOverlap = await transaction.booking.findFirst({
        where: {
          listingId,
          OR: [
            {
              status: {
                in: [
                  "HANDOFF_PENDING",
                  "IN_USE",
                  "RETURN_PENDING",
                  "INSPECTION",
                  "DISPUTED",
                ],
              },
            },
            {
              status: "CONFIRMED",
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          ],
        },
        select: { id: true },
      });

      if (existingOverlap) {
        throw new Error("BOOKING_OVERLAP");
      }

      if (body.quote === true)
        return Response.json({
          quote: {
            title: listing.title,
            startAt,
            endAt,
            days: totalDays,
            dailyPrice: listing.price,
            totalPrice,
            deposit: listing.deposit ?? "0",
            meetingStationId,
          },
        });
      if (
        body.expectedQuote !== undefined &&
        body.expectedQuote !==
          `${listing.price}:${totalPrice}:${listing.deposit ?? "0"}`
      )
        return apiError(
          "The listing price changed. Review a new quotation before submitting.",
          409,
        );
      const booking = await transaction.booking.create({
        data: {
          listingId,
          ownerId: listing.ownerId,
          renterId: currentUser.id,
          meetingStationId,
          startAt,
          endAt,
          status: "PENDING",
          totalPrice,
          dailyPrice: listing.price,
          deposit: listing.deposit ?? null,
          notes: notes && notes.length > 0 ? notes : null,
        },
        select: bookingSelect,
      });

      return Response.json({ booking }, { status: 201 });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_OVERLAP") {
      return apiError(
        "This listing is already booked for part of the selected period.",
        409,
      );
    }
    if (isSerializationConflict(error)) {
      return apiError(
        "This listing is already booked for part of the selected period.",
        409,
      );
    }
    return internalServerError("POST /api/bookings", error);
  }
}
