import { prisma } from "@/lib/prisma";
import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parseCurrency, parseRequiredString } from "@/lib/api-validation";

const listingStatuses = ["ACTIVE", "INACTIVE"] as const;
const listingTypes = ["RENTAL", "SERVICE"] as const;

const listingSelect = {
  id: true,
  ownerId: true,
  title: true,
  description: true,
  category: true,
  type: true,
  price: true,
  deposit: true,
  condition: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  supportedStations: {
    select: {
      station: { select: { id: true, code: true, name: true } },
    },
  },
} as const;

function normalizeStationIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value
    .map((entry) => (typeof entry === "number" ? entry : Number(entry)))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  return ids.length ? [...new Set(ids)] : null;
}

export async function GET(): Promise<Response> {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: listingSelect,
    });

    return Response.json({ listings });
  } catch (error) {
    return internalServerError("GET /api/listings", error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return apiError("Authentication required.", 401);
    }

    const body = await readJsonObject(request);
    if (!body) {
      return apiError("Request body must be a valid JSON object.", 400);
    }

    const title = parseRequiredString(body.title, 120);
    const description = parseRequiredString(body.description, 2000);
    const category = parseRequiredString(body.category, 80);
    const condition = parseRequiredString(body.condition, 100);
    const price = parseCurrency(body.price, false);
    const deposit = body.deposit === undefined ? null : parseCurrency(body.deposit, true);
    const type = typeof body.type === "string" && listingTypes.includes(body.type as (typeof listingTypes)[number])
      ? (body.type as (typeof listingTypes)[number])
      : null;
    const statusInput = body.status !== undefined
      ? typeof body.status === "string" && listingStatuses.includes(body.status as (typeof listingStatuses)[number])
        ? (body.status as (typeof listingStatuses)[number])
        : null
      : "ACTIVE";

    const stationIds = normalizeStationIds(body.stationIds);

    if (
      title === null ||
      description === null ||
      category === null ||
      condition === null ||
      price === null ||
      type === null ||
      statusInput === null ||
      (type === "RENTAL" && (!stationIds || stationIds.length === 0))
    ) {
      return apiError(
        "Provide valid listing data, including title, description, category, condition, price, type, and at least one MRT station for rental listings.",
        400,
      );
    }

    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          title,
          description,
          category,
          type,
          price,
          deposit,
          condition,
          status: statusInput,
          owner: { connect: { id: currentUser.id } },
        },
        select: listingSelect,
      });

      if (stationIds && stationIds.length > 0) {
        const validStations = await tx.mrtStation.findMany({
          where: { id: { in: stationIds } },
          select: { id: true },
        });

        if (validStations.length !== stationIds.length) {
          throw new Error("Invalid MRT station selection.");
        }

        await Promise.all(
          stationIds.map((stationId) =>
            tx.listingStation.create({
              data: {
                listingId: created.id,
                stationId,
              },
            }),
          ),
        );
      }

      return tx.listing.findUniqueOrThrow({
        where: { id: created.id },
        select: listingSelect,
      });
    });

    return Response.json({ listing }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid MRT station selection.") {
      return apiError("One or more MRT stations are invalid.", 400);
    }
    return internalServerError("POST /api/listings", error);
  }
}