import { Prisma } from "@prisma/client";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { parsePathId, parseRequiredString } from "@/lib/api-validation";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return apiError("Authentication required.", 401);
  }

  const { id: rawId } = await params;
  const listingId = parsePathId(rawId);
  if (listingId === null) {
    return apiError("Listing id must be a positive integer.", 400);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return apiError("Request body must be a valid JSON object.", 400);
  }
  const reason = parseRequiredString(body.reason, 120);
  const description =
    body.description === undefined
      ? null
      : typeof body.description === "string" &&
          body.description.trim().length <= 1000
        ? body.description.trim() || null
        : undefined;
  if (!reason || description === undefined) {
    return apiError("Provide a report reason and valid optional details.", 400);
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true, status: true },
    });
    if (!listing || listing.status !== "ACTIVE") {
      return apiError("Listing not found.", 404);
    }
    if (listing.ownerId === currentUser.id) {
      return apiError("You cannot report your own listing.", 403);
    }

    const report = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
      const current = await tx.listing.findUniqueOrThrow({
        where: { id: listingId },
      });
      if (current.status !== "ACTIVE") throw new Error("REPORT_UNAVAILABLE");
      return tx.listingReport.create({
        data: {
          listingId,
          reporterId: currentUser.id,
          reason,
          description,
        },
        select: { id: true, listingId: true, status: true, createdAt: true },
      });
    });
    return Response.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_UNAVAILABLE")
      return apiError("Listing is no longer available for reporting.", 409);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("You have already reported this listing.", 409);
    }
    return internalServerError("POST /api/listings/[id]/report", error);
  }
}
