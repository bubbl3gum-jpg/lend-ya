import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePathId } from "@/lib/api-validation";
import {
  apiError,
  readJsonObject,
  internalServerError,
} from "@/lib/api-response";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  if (user.accountStatus !== "ACTIVE")
    return apiError(
      "Your account is suspended; new reviews are restricted.",
      403,
    );
  const id = parsePathId((await params).id);
  if (id === null) return apiError("Invalid booking id.", 400);
  const body = await readJsonObject(request);
  if (
    !body ||
    typeof body.rating !== "number" ||
    !Number.isInteger(body.rating) ||
    body.rating < 1 ||
    body.rating > 5 ||
    (body.comment !== undefined &&
      (typeof body.comment !== "string" || body.comment.length > 2000))
  )
    return apiError(
      "Rating must be 1–5 and comment at most 2000 characters.",
      400,
    );
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { handoff: true, return: true },
    });
    if (!booking) return apiError("Booking not found.", 404);
    if (booking.ownerId !== user.id && booking.renterId !== user.id)
      return apiError("Participants only.", 403);
    if (
      booking.status !== "COMPLETED" ||
      !booking.handoff?.confirmedAt ||
      !booking.handoff.conditionConfirmed ||
      !booking.return?.confirmedAt ||
      !booking.return.conditionConfirmed
    )
      return apiError(
        "Reviews require a confirmed handoff and inspected, confirmed return.",
        409,
      );
    const subjectId =
      booking.ownerId === user.id ? booking.renterId : booking.ownerId;
    if (
      subjectId === user.id ||
      (body.subjectId !== undefined && body.subjectId !== subjectId) ||
      (body.authorId !== undefined && body.authorId !== user.id)
    )
      return apiError(
        "Reviews must be authored by you for the opposite participant.",
        400,
      );
    const review = await prisma.$transaction(async (tx) => {
      await requireActiveAccounts(tx, [user.id]);
      return tx.verifiedReview.create({
        data: {
          bookingId: id,
          authorId: user.id,
          subjectId,
          rating: body.rating as number,
          comment:
            typeof body.comment === "string" ? body.comment.trim() : null,
        },
      });
    });
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return apiError("You have already reviewed this booking.", 409);
    return internalServerError("POST booking review", error);
  }
}
