import {RentalError} from "@/lib/rental-errors";
import {activateNewBooking} from "@/lib/meetup/service";
import {issueDocumentationReview,bindDocumentationRequest,documentationFailure} from "@/lib/rental-documentation/service";
import {acknowledgement} from "@/lib/rental-documentation/contracts";
import {DocumentationError} from "@/lib/rental-documentation/service";
import { createHash } from "node:crypto";
import { isSerializationConflict } from "@/lib/database-conflicts";
import { stationSelect, eligibleStationWhere } from "@/lib/mrt/network";
import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import {
  parseRentalTime,
  rentalDays,
  parseBookingInstant,
} from "@/lib/booking-time";
import { resolveBookingPolicy, bookingPolicyError, BookingPolicyError } from "@/lib/booking-policy";
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
  meetingStation: { select: stationSelect },
} as const;

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

  const requestKey = request.headers.get("idempotency-key");
  if (requestKey !== null && !/^[A-Za-z0-9_-]{8,128}$/.test(requestKey))
    return apiError("Idempotency-Key must contain 8–128 letters, digits, underscores or hyphens.", 400);
  let requestHash: string | undefined;
  let expectedQuote: unknown;
  const replay = async () => {
    if (!requestKey || !requestHash) return null;
    const existing = await prisma.booking.findUnique({
      where: { renterId_requestKey: { renterId: currentUser.id, requestKey } },
      select: { ...bookingSelect, requestHash: true },
    });
    if (!existing) return null;
    if (existing.requestHash !== requestHash)
      return apiError("This idempotency key was already used for a different request.", 409);
    // Validate a supplied quote against the committed snapshot, not today's listing price.
    // Historical request hashes omit expectedQuote, so this also preserves old retries.
    if (expectedQuote !== undefined && expectedQuote !==
      `${existing.dailyPrice}:${existing.totalPrice}:${existing.deposit ?? "0"}`)
      return apiError("This idempotency key was already used for a different request.", 409);
    const { requestHash: _hash, ...booking } = existing;
    void _hash;
    return Response.json({ booking }, { status: 201 });
  };
  try {
    const body = await readJsonObject(request);
    if (!body) {
      return apiError("Request body must be a valid JSON object.", 400);
    }
    expectedQuote = body.expectedQuote;

    const listingId =
      typeof body.listingId === "number"
        ? parsePathId(String(body.listingId))
        : null;
    const strictStart = parseBookingInstant(body.startAt);
    const strictEnd = parseBookingInstant(body.endAt);
    // Legacy parsing may establish an authenticated stored replay ONLY. It must
    // never authorize a new operation, quote, or changed idempotency payload.
    const startAt = strictStart ?? parseRentalTime(body.startAt);
    const endAt = strictEnd ?? parseRentalTime(body.endAt);
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

    if (body.notes !== undefined && typeof body.notes !== "string")
      return apiError("Notes must be text.", 400);
    let normalizedDocumentation;
    if(body.documentation!==undefined){try{normalizedDocumentation=acknowledgement(body.documentation);}catch{throw new DocumentationError("DOCUMENTATION_ACK_REQUIRED",400);}}
    requestHash = body.quote === true ? undefined : createHash("sha256")
      .update(JSON.stringify({ listingId, startAt: startAt.toISOString(), endAt: endAt.toISOString(), meetingStationId, canonicalStationId: body.canonicalStationId ?? null, notes: notes || null, ...(body.documentation!==undefined?{documentation:normalizedDocumentation}:{}) }))
      .digest("hex");
    // Replays return the original persisted request even after acceptance or price changes.
    // No mutation is performed by replay; permission is still scoped to the authenticated actor.
    const repeated = await replay();
    if (repeated) return repeated;
    if (!strictStart || !strictEnd)
      return apiError("Booking timestamps require a valid explicit Z or numeric offset, with at most millisecond precision.", 400);
    const policy = resolveBookingPolicy(process.env);
    const invalid = bookingPolicyError(startAt, endAt, body.notes, policy, Date.now());
    if (invalid) return apiError(invalid, 400);
    return await prisma.$transaction(
      async (transaction) => {
        await requireActiveAccounts(transaction, [currentUser.id]);
        await transaction.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
        if (startAt.getTime() <= Date.now())
          throw new RentalError("Start time expired while waiting. Choose a future start.", 400);
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

        const station = await transaction.mrtStation.findUnique({
          where: { id: meetingStationId },
        });
        if (!station) return apiError("Meeting station does not exist.", 400);
        const eligible =
          station.operational &&
          station.canonicalId !== null &&
          eligibleStationWhere.canonicalId.in.includes(station.canonicalId);
        const supported = listing.supportedStations.some(
          (entry) => entry.stationId === meetingStationId,
        );
        if (
          !eligible ||
          !supported ||
          (body.canonicalStationId !== undefined &&
            body.canonicalStationId !== station.canonicalId)
        )
          return Response.json(
            {
              error:
                "This station is no longer available. Choose and confirm another meeting station.",
              code: "STATION_UNAVAILABLE",
            },
            { status: 409 },
          );
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

        const documentationTerms={listingId,borrowerId:currentUser.id,startAt:startAt.toISOString(),endAt:endAt.toISOString(),stationId:meetingStationId,dailyPrice:listing.price.toString(),totalPrice:totalPrice.toString(),deposit:listing.deposit?.toString()??null,notes:notes||null};
        if (body.quote === true) {
          const documentationReview=await issueDocumentationReview(transaction,currentUser.id,request,documentationTerms);
          return Response.json({
            ...(documentationReview?{documentationReview}:{}),
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
        }
        if (
          body.expectedQuote !== undefined &&
          body.expectedQuote !==
            `${listing.price}:${totalPrice}:${listing.deposit ?? "0"}`
        )
          return apiError(
            "The listing price changed. Review a new quotation before submitting.",
            409,
          );
        const documentationBinding=await bindDocumentationRequest(transaction,currentUser.id,request,documentationTerms,body.documentation,body);
        // Throw to roll back any documentation binding if time expired during
        // subsequent authorization/row-lock work, rather than committing it.
        if (startAt.getTime() <= Date.now())
          throw new RentalError("Start time expired while waiting. Choose a future start.", 400);
        const booking = await transaction.booking.create({
          data: {
            ...documentationBinding,
            listingId,
            ...(requestKey && requestHash ? { requestKey, requestHash } : {}),
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

        await activateNewBooking(transaction, {id:booking.id,ownerId:listing.ownerId,renterId:currentUser.id,meetingStationId});
        return Response.json({ booking }, { status: 201 });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof BookingPolicyError)
      return apiError("Booking policy configuration is invalid. Contact the marketplace operator.", 503);
    if(error instanceof RentalError) {
      // An identical operation may have committed while this request waited.
      const repeated = await replay();
      return repeated ?? apiError(error.message,error.status);
    }
    const documentationError=documentationFailure(error);if(documentationError)return documentationError;
    if (requestKey && (isSerializationConflict(error) ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"))) {
      const repeated = await replay();
      if (repeated) return repeated;
    }
    if (error instanceof Error && error.message === "BOOKING_OVERLAP") {
      return apiError(
        "This listing is already booked for part of the selected period.",
        409,
      );
    }
    if (isSerializationConflict(error))
      return Response.json(
        {
          error:
            "Listing availability changed. Choose and confirm your station again.",
          code: "STATION_UNAVAILABLE",
        },
        { status: 409 },
      );
    return internalServerError("POST /api/bookings", error);
  }
}
