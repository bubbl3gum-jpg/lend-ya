import { isSerializationConflict } from "@/lib/database-conflicts";
import { stationSelect, eligibleStationWhere } from "@/lib/mrt/network";
import { Prisma } from "@prisma/client";
import { parseStationIds } from "@/lib/listing-input";
import {
  listingCategories,
  categoryDetailFields,
  type ListingCategory,
} from "@/lib/listing-options";
import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";

const listingSelect = {
  id: true,
  ownerId: true,
  title: true,
  description: true,
  category: true,
  categoryDetails: true,
  price: true,
  deposit: true,
  condition: true,
  status: true,
  adminRestricted: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, accountStatus: true } },
  media: {
    select: {
      id: true,
      url: true,
      mimeType: true,
      kind: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
  supportedStations: {
    select: {
      station: { select: stationSelect },
    },
  },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: rawId } = await params;
  const id = parsePathId(rawId);
  if (id === null) {
    return apiError("Listing id must be a positive integer.", 400);
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: listingSelect,
    });

    if (!listing) {
      return apiError("Listing not found.", 404);
    }

    if (
      listing.status !== "ACTIVE" ||
      listing.adminRestricted ||
      listing.owner.accountStatus !== "ACTIVE"
    ) {
      const currentUser = await getCurrentUser();
      if (listing.ownerId !== currentUser?.id)
        return apiError("Listing not found.", 404);
    }
    return Response.json({
      listing: {
        ...listing,
        owner: { id: listing.owner.id, name: listing.owner.name },
      },
    });
  } catch (error) {
    return internalServerError("GET /api/listings/[id]", error);
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

  const { id: rawId } = await params;
  const id = parsePathId(rawId);
  if (id === null) {
    return apiError("Listing id must be a positive integer.", 400);
  }

  try {
    if (currentUser.accountStatus !== "ACTIVE")
      return apiError(
        "Your account is suspended; listing changes are restricted.",
        403,
      );
    const body = await readJsonObject(request);
    if (!body) return apiError("Invalid JSON object.", 400);
    const status = body.status;
    if (status !== undefined && status !== "ACTIVE" && status !== "INACTIVE") {
      return apiError("status must be ACTIVE or INACTIVE.", 400);
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return apiError("Listing not found.", 404);
    }
    if (listing.ownerId !== currentUser.id) {
      return apiError("Only the listing owner can update this listing.", 403);
    }
    if (status === "ACTIVE") {
      const photoCount = await prisma.listingMedia.count({
        where: { listingId: id, kind: "PHOTO" },
      });
      if (photoCount === 0) {
        return apiError(
          "Upload at least one item photo before publishing this listing.",
          409,
        );
      }
    }

    const data: Prisma.ListingUpdateInput = {};
    if (status === "ACTIVE" || status === "INACTIVE") data.status = status;
    for (const key of ["title", "description", "condition"] as const) {
      if (body[key] !== undefined) {
        if (
          typeof body[key] !== "string" ||
          !body[key].trim() ||
          body[key].length > (key === "description" ? 5000 : 200)
        )
          return apiError(`Invalid ${key}.`, 400);
        data[key] = body[key].trim();
      }
    }
    for (const key of ["price", "deposit"] as const) {
      if (body[key] !== undefined) {
        if (key === "deposit" && body[key] === null) {
          data.deposit = null;
          continue;
        }
        const value = body[key];
        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < (key === "price" ? 0.01 : 0) ||
          value > 9999999999.99 ||
          Math.abs(value * 100 - Math.round(value * 100)) > 0.001
        )
          return apiError(`Invalid ${key}.`, 400);
        data[key] = value;
      }
    }
    if (body.category !== undefined) {
      if (
        typeof body.category !== "string" ||
        !listingCategories.includes(body.category as ListingCategory)
      )
        return apiError("Choose a supported category.", 400);
      data.category = body.category;
      if (body.category !== listing.category)
        data.categoryDetails = Prisma.JsonNull;
    }
    if (body.categoryDetails !== undefined) {
      const category = (body.category ?? listing.category) as ListingCategory,
        fields = categoryDetailFields[category];
      if (
        !fields ||
        !body.categoryDetails ||
        typeof body.categoryDetails !== "object" ||
        Array.isArray(body.categoryDetails)
      )
        return apiError("Invalid category details.", 400);
      const details = body.categoryDetails as Record<string, unknown>,
        clean: Record<string, string> = {};
      for (const [key, value] of Object.entries(details)) {
        if (
          !fields.some((f) => f.key === key) ||
          typeof value !== "string" ||
          value.length > 180
        )
          return apiError("Invalid category detail field.", 400);
        if (value.trim()) clean[key] = value.trim();
      }
      data.categoryDetails = clean;
    }
    const stationIds =
      body.stationIds === undefined
        ? undefined
        : parseStationIds(body.stationIds);
    if (stationIds === null)
      return apiError("Choose 1–120 valid pickup stations.", 400);
    if (stationIds) {
      data.updatedAt = new Date();
      data.supportedStations = {
        deleteMany: {},
        create: stationIds.map((stationId) => ({ stationId })),
      };
    }
    if (!Object.keys(data).length)
      return apiError("No editable fields supplied.", 400);
    const updated = await prisma.$transaction(
      async (tx) => {
        await requireActiveAccounts(tx, [currentUser.id]);
        await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
        if (
          stationIds &&
          (await tx.mrtStation.count({
            where: { id: { in: stationIds }, ...eligibleStationWhere },
          })) !== stationIds.length
        )
          throw new Error("INVALID_STATIONS");
        const latest = await tx.listing.findUniqueOrThrow({ where: { id } });
        if (latest.adminRestricted) throw new Error("LISTING_RESTRICTED");
        if (latest.ownerId !== currentUser.id) throw new Error("OWNER_CHANGED");
        return tx.listing.update({
          where: { id },
          data,
          select: listingSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return Response.json({ listing: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STATIONS")
      return apiError("One or more pickup stations are invalid.", 400);
    if (error instanceof Error && error.message === "LISTING_RESTRICTED")
      return apiError(
        "This listing is restricted by administration; owner edits cannot override it.",
        409,
      );
    if (error instanceof Error && error.message === "OWNER_CHANGED")
      return apiError("Only the listing owner can update availability.", 403);
    if (isSerializationConflict(error))
      return apiError(
        "Availability changed concurrently. Refresh and try again.",
        409,
      );
    return internalServerError("PATCH /api/listings/[id]", error);
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  const id = parsePathId((await params).id);
  if (id === null) return apiError("Invalid listing id.", 400);
  try {
    if (user.accountStatus !== "ACTIVE")
      return apiError("Suspended accounts cannot delete listings.", 403);
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: {
        ownerId: true,
        adminRestricted: true,
        _count: { select: { bookings: true, reports: true } },
      },
    });
    if (!listing) return apiError("Listing not found.", 404);
    if (listing.ownerId !== user.id)
      return apiError("Only the owner may delete this listing.", 403);
    if (
      listing.adminRestricted ||
      listing._count.reports ||
      listing._count.bookings
    )
      return apiError(
        "This listing has rental/report history or an administrative restriction. Its records must be preserved.",
        409,
      );
    await prisma.$transaction(async (tx) => {
      await requireActiveAccounts(tx, [user.id]);
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.listing.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { bookings: true, reports: true } } },
      });
      if (
        current.adminRestricted ||
        current._count.bookings ||
        current._count.reports
      )
        throw new Error("LISTING_RESTRICTED");
      await tx.listing.delete({ where: { id, ownerId: user.id } });
    });
    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof Error && error.message === "LISTING_RESTRICTED")
      return apiError("Listing history or moderation must be preserved.", 409);
    // The restrictive booking foreign key also protects concurrent booking creation.
    if (error instanceof Error && "code" in error && error.code === "P2003")
      return apiError(
        "Listing now has booking history; deactivate it instead.",
        409,
      );
    return internalServerError("DELETE /api/listings/[id]", error);
  }
}
