import { prisma } from "@/lib/prisma";
import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
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
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  media: {
    select: { id: true, url: true, mimeType: true, kind: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
  supportedStations: {
    select: {
      station: { select: { id: true, code: true, name: true } },
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

    return Response.json({ listing });
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
        return apiError("Upload at least one item photo before publishing this listing.", 409);
      }
    }

    const data: { status?: "ACTIVE" | "INACTIVE"; title?: string; description?: string; condition?: string; price?: number; deposit?: number | null } = {};
    if (status === "ACTIVE" || status === "INACTIVE") data.status = status;
    for (const key of ["title", "description", "condition"] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > (key === "description" ? 5000 : 200)) return apiError(`Invalid ${key}.`, 400);
        data[key] = body[key].trim();
      }
    }
    for (const key of ["price", "deposit"] as const) {
      if (body[key] !== undefined) {
        if (key === "deposit" && body[key] === null) { data.deposit = null; continue; }
        const value = body[key];
        if (typeof value !== "number" || !Number.isFinite(value) || value < (key === "price" ? 0.01 : 0) || value > 9999999999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 0.001) return apiError(`Invalid ${key}.`, 400);
        data[key] = value;
      }
    }
    if (!Object.keys(data).length) return apiError("No editable fields supplied.", 400);
    const updated = await prisma.listing.update({
      where: { id },
      data,
      select: listingSelect,
    });

    return Response.json({ listing: updated });
  } catch (error) {
    return internalServerError("PATCH /api/listings/[id]", error);
  }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
 const user = await getCurrentUser();
 if (!user) return apiError("Authentication required.", 401);
 const id = parsePathId((await params).id);
 if (id === null) return apiError("Invalid listing id.", 400);
 try {
  const listing = await prisma.listing.findUnique({ where: { id }, select: { ownerId: true, _count: { select: { bookings: true } } } });
  if (!listing) return apiError("Listing not found.", 404);
  if (listing.ownerId !== user.id) return apiError("Only the owner may delete this listing.", 403);
  if (listing._count.bookings) return apiError("This listing has booking history. Deactivate it from Edit listing instead.", 409);
  await prisma.listing.delete({ where: { id, ownerId: user.id } });
  return Response.json({ deleted: true });
 } catch (error) {
  // The restrictive booking foreign key also protects concurrent booking creation.
  if (error instanceof Error && "code" in error && error.code === "P2003") return apiError("Listing now has booking history; deactivate it instead.", 409);
  return internalServerError("DELETE /api/listings/[id]", error);
 }
}
