import { digest, requireMeetupReceipt, replayReceipt } from "@/lib/meetup/service";
import { requireActiveAccounts } from "@/lib/marketplace-permissions";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RentalSubmission } from "@/lib/booking-evidence";
import { RentalError } from "@/lib/rental-errors";

export async function submitRentalStage(
  bookingId: number,
  userId: number,
  action: "handoff" | "return" | "inspection",
  submission: RentalSubmission,
) {
  return prisma.$transaction(async (transaction) => {
    // All lifecycle writers coordinate on the authoritative Booking row.
    await transaction.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await transaction.booking.findUnique({
      where: { id: bookingId },
      include: {
        handoff: true,
        return: true,
        disputes: { where: { status: "OPEN" }, take: 1 },
      },
    });
    if (!booking) throw new RentalError("Booking not found.", 404);
    if (userId !== booking.ownerId && userId !== booking.renterId)
      throw new RentalError("Participants only.", 403);
    const completionHash=digest(JSON.stringify({...submission,photos:submission.photos.map(p=>({mimeType:p.mimeType,hash:digest(Buffer.from(p.data).toString("base64"))}))}));
    if(action==="handoff"&&await replayReceipt(transaction,booking,userId,"PICKUP",submission.meetupChallengeId,completionHash))return {status:booking.status,replayed:true};
    const savePhotos = async (stage: string) => {
      const urls: string[] = [];
      for (const photo of submission.photos) {
        const saved = await transaction.bookingEvidencePhoto.create({
          data: {
            bookingId,
            uploaderId: userId,
            stage,
            mimeType: photo.mimeType,
            data: photo.data,
          },
          select: { id: true },
        });
        urls.push(`/api/bookings/${bookingId}/evidence/${saved.id}`);
      }
      return urls;
    };
    const checklist = submission.checklist as Prisma.InputJsonValue;
    if (action === "handoff") {
      if (booking.status === "CONFIRMED")
        await requireActiveAccounts(transaction, [
          booking.ownerId,
          booking.renterId,
        ]);
      if (booking.status === "CONFIRMED")
        await transaction.$queryRaw`SELECT id FROM "Listing" WHERE id = ${booking.listingId} FOR UPDATE`;
      const listing = await transaction.listing.findUnique({
        where: { id: booking.listingId },
        select: { adminRestricted: true },
      });
      if (booking.status === "CONFIRMED" && listing?.adminRestricted)
        throw new RentalError(
          "This listing is administratively restricted; no new handoff is permitted.",
          409,
        );
      if (!submission.conditionConfirmed)
        throw new RentalError(
          "Explicitly acknowledge the recorded item condition.",
          400,
        );
      if (booking.status === "CONFIRMED") {
        if (userId !== booking.ownerId)
          throw new RentalError("Only the owner can submit the handoff.", 403);
        if (booking.handoff)
          throw new RentalError("A handoff has already been recorded.");
        const photos = await savePhotos("HANDOFF_OWNER");
        await transaction.handoff.create({
          data: {
            bookingId,
            performedBy: userId,
            ownerConditionConfirmed: true,
            conditionNotes: submission.conditionNotes,
            serialNumber: submission.serialNumber,
            checklist,
            photos,
          },
        });
        await transaction.booking.update({
          where: { id: bookingId },
          data: { status: "HANDOFF_PENDING" },
        });
        return { status: "HANDOFF_PENDING" };
      }
      if (userId !== booking.renterId)
        throw new RentalError("Only the borrower can confirm receipt.", 403);
      if (booking.status !== "HANDOFF_PENDING")
        throw new RentalError(
          "Receipt can only be confirmed for a pending handoff.",
        );
      const handoff = booking.handoff;
      if (
        !handoff ||
        handoff.performedBy !== booking.ownerId ||
        !handoff.ownerConditionConfirmed ||
        handoff.confirmedBy !== null
      )
        throw new RentalError(
          "The handoff is missing a valid owner confirmation or is already confirmed.",
        );
      await requireMeetupReceipt(transaction,booking,userId,"PICKUP",submission,completionHash);
      const photos = await savePhotos("HANDOFF_BORROWER");
      await transaction.handoff.update({
        where: { bookingId },
        data: {
          confirmedBy: userId,
          confirmedAt: new Date(),
          conditionConfirmed: true,
          borrowerConditionNotes: submission.conditionNotes,
          borrowerChecklist: checklist,
          borrowerPhotos: photos,
        },
      });
      await transaction.booking.update({
        where: { id: bookingId },
        data: { status: "IN_USE" },
      });
      return { status: "IN_USE" };
    }
    const handoff = booking.handoff;
    const bilateralHandoff =
      handoff &&
      handoff.performedBy === booking.ownerId &&
      handoff.confirmedBy === booking.renterId &&
      handoff.ownerConditionConfirmed &&
      handoff.conditionConfirmed &&
      handoff.confirmedAt;
    if (action === "return") {
      if (userId !== booking.renterId)
        throw new RentalError("Only the borrower can initiate a return.", 403);
      if (!submission.returnConfirmed)
        throw new RentalError(
          "Explicitly confirm that you are returning the item.",
          400,
        );
      if (booking.status !== "IN_USE" || booking.return || !bilateralHandoff)
        throw new RentalError(
          "Only an in-use booking with a confirmed bilateral handoff can begin a return.",
        );
      const photos = await savePhotos("RETURN_BORROWER");
      await transaction.return.create({
        data: {
          bookingId,
          initiatedBy: userId,
          returnConfirmed: true,
          conditionNotes: submission.conditionNotes,
          checklist,
          photos,
        },
      });
      await transaction.booking.update({
        where: { id: bookingId },
        data: { status: "RETURN_PENDING" },
      });
      return { status: "RETURN_PENDING" };
    }
    if (userId !== booking.ownerId)
      throw new RentalError("Only the owner can inspect the return.", 403);
    if (
      booking.status !== "INSPECTION" ||
      !booking.return ||
      booking.return.initiatedBy !== booking.renterId ||
      !booking.return.returnConfirmed ||
      !bilateralHandoff ||
      booking.disputes.length > 0
    )
      throw new RentalError(
        "Inspection requires a submitted return with valid handoff confirmations and no open dispute.",
      );
    if (
      !submission.conditionConfirmed ||
      typeof submission.acceptable !== "boolean"
    )
      throw new RentalError(
        "Explicitly acknowledge inspection and select acceptable or problem found.",
        400,
      );
    if (booking.return.inspectedAt || booking.return.confirmedBy)
      throw new RentalError(
        "This inspection decision has already been recorded. Open a dispute if a problem was found.",
      );
    const photos = await savePhotos("INSPECTION_OWNER");
    const inspectedAt = new Date();
    await transaction.return.update({
      where: { bookingId },
      data: {
        inspectedBy: userId,
        inspectedAt,
        inspectionAccepted: submission.acceptable,
        inspectionNotes: submission.conditionNotes,
        inspectionChecklist: checklist,
        inspectionPhotos: photos,
        ...(submission.acceptable
          ? {
              confirmedBy: userId,
              confirmedAt: inspectedAt,
              conditionConfirmed: true,
            }
          : {}),
      },
    });
    if (submission.acceptable)
      await transaction.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" },
      });
    return {
      status: submission.acceptable ? "COMPLETED" : "INSPECTION",
      inspectionAccepted: submission.acceptable,
    };
  });
}
