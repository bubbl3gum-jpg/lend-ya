import "server-only";
import { prisma } from "@/lib/prisma";
import { AdminInputError } from "@/lib/admin/auth";

export async function readDisputeEvidence(adminId: number, caseId: number, photoId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${adminId} FOR SHARE`;
    const actor = await tx.user.findUnique({ where: { id: adminId }, select: { role: true, accountStatus: true } });
    if (actor?.role !== "ADMIN" || actor.accountStatus !== "ACTIVE")
      throw new AdminInputError("Active administrator required.", 403);
    const dispute = await tx.dispute.findUnique({ where: { id: caseId }, select: { bookingId: true } });
    if (!dispute) return null;
    const photo = await tx.bookingEvidencePhoto.findFirst({ where: { id: photoId, bookingId: dispute.bookingId }, select: { data: true, mimeType: true } });
    if (!photo) return null;
    // Commit the access record before releasing bytes. Never log image content or session tokens.
    await tx.adminAuditLog.create({
      data: {
        adminId, action: "EVIDENCE_VIEWED", targetType: "DISPUTE", targetId: caseId,
        reason: `Review private evidence for dispute ${caseId}`,
        previousState: {}, newState: { photoId, bookingId: dispute.bookingId },
      }
    });
    return photo;
  });
}
