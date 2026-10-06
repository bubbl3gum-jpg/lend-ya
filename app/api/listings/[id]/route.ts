import { prisma } from "@/lib/prisma";
import { apiError, internalServerError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";

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
    const body = await request.json();
    const status = body?.status;
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return apiError("status must be ACTIVE or INACTIVE.", 400);
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return apiError("Listing not found.", 404);
    }
    if (listing.ownerId !== currentUser.id) {
      return apiError("Only the listing owner can update this listing.", 403);
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { status },
      select: listingSelect,
    });

    return Response.json({ listing: updated });
  } catch (error) {
    return internalServerError("PATCH /api/listings/[id]", error);
  }
}