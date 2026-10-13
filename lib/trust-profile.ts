import "server-only";
import { prisma } from "@/lib/prisma";
export async function getTrustProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      identityVerified: true,
      trustScore: true,
      confidenceIndicator: true,
    },
  });
  if (!user) return null;
  const bookingRows = await prisma.booking.findMany({
    where: { OR: [{ renterId: userId }, { ownerId: userId }] },
    select: {
      id: true,
      ownerId: true,
      renterId: true,
      status: true,
      startAt: true,
      endAt: true,
      handoff: {
        select: {
          timestamp: true,
          confirmedAt: true,
          conditionConfirmed: true,
        },
      },
      return: {
        select: {
          timestamp: true,
          confirmedAt: true,
          conditionConfirmed: true,
        },
      },
      disputes: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { status: true, resolvedAt: true },
      },
    },
  });
  const bookings = bookingRows.map((b) => ({
    ...b,
    dispute: b.disputes[0] ?? null,
  }));
  const reviews = await prisma.verifiedReview.findMany({
    where: { subjectId: userId, booking: { status: "COMPLETED" } },
    select: { bookingId: true, rating: true },
  });
  const records = (role: "renter" | "owner") => {
    const own = bookings.filter((b) =>
      role === "renter" ? b.renterId === userId : b.ownerId === userId,
    );
    const completed = own.filter(
      (b) =>
        b.status === "COMPLETED" &&
        b.handoff?.confirmedAt &&
        b.handoff.conditionConfirmed &&
        b.return?.confirmedAt &&
        b.return.conditionConfirmed,
    );
    // Unconfirmed submissions never count as evidence. Pending disputes are withheld.
    const eligible = own.filter(
      (b) =>
        b.status !== "DISPUTED" &&
        (!b.dispute ||
          (b.dispute.status === "RESOLVED" && b.dispute.resolvedAt)),
    );
    const handoffs = eligible.filter(
      (b) => b.handoff?.confirmedAt && b.handoff.conditionConfirmed,
    );
    const returns = eligible.filter(
      (b) => b.return?.confirmedAt && b.return.conditionConfirmed,
    );
    const timed = role === "renter" ? returns : handoffs;
    const onTime = timed.filter((b) =>
      role === "renter"
        ? b.return!.timestamp <= b.endAt
        : b.handoff!.timestamp <= b.startAt,
    ).length;
    const roleReviews = reviews.filter((r) =>
      completed.some((b) => b.id === r.bookingId),
    );
    return {
      completedBookings: completed.length,
      cancelledBookings: own.filter((b) => b.status === "CANCELLED").length,
      handoffConfirmedCount: handoffs.length,
      conditionConfirmedCount: returns.length,
      onTimeCount: onTime,
      timedCount: timed.length,
      onTimeRate: timed.length
        ? Math.round((onTime / timed.length) * 100)
        : null,
      listingAccuracyRate: null,
      resolvedConcerns: own.filter(
        (b) => b.dispute?.status === "RESOLVED" && b.dispute.resolvedAt,
      ).length,
      reviewCount: roleReviews.length,
      reviewRating: roleReviews.length
        ? roleReviews.reduce((sum, r) => sum + r.rating, 0) / roleReviews.length
        : null,
    };
  };
  const received = await prisma.verifiedReview.findMany({
    where: { subjectId: userId, booking: { status: "COMPLETED" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });
  const renterStats = records("renter"),
    ownerStats = records("owner");
  return {
    ...user,
    receivedReviews: received.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    memberSince: user.createdAt.toISOString(),
    createdAt: undefined,
    renterStats,
    ownerStats,
    completedBookings:
      renterStats.completedBookings + ownerStats.completedBookings,
  };
}
export type TrustProfileData = NonNullable<
  Awaited<ReturnType<typeof getTrustProfile>>
>;
