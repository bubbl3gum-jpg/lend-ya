import "server-only";
import { Prisma, BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePathId } from "@/lib/api-validation";
import type { AdminQuery, Directory } from "@/lib/admin/query";

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  accountStatus: true,
  createdAt: true,
  verificationStatus: true,
  identityVerified: true,
  trustScore: true,
  confidenceIndicator: true,
} satisfies Prisma.UserSelect;
export const participantSelect = { id: true, name: true, email: true } as const;
export const adminListingSelect = {
  id: true,
  title: true,
  ownerId: true,
  category: true,
  price: true,
  deposit: true,
  status: true,
  adminRestricted: true,
  createdAt: true,
  owner: { select: participantSelect },
} satisfies Prisma.ListingSelect;
export const adminBookingSelect = {
  id: true,
  listingId: true,
  ownerId: true,
  renterId: true,
  startAt: true,
  endAt: true,
  status: true,
  totalPrice: true,
  deposit: true,
  dailyPrice: true,
  createdAt: true,
  listing: { select: { id: true, title: true } },
  owner: { select: participantSelect },
  renter: { select: participantSelect },
} satisfies Prisma.BookingSelect;
const order = [{ createdAt: "desc" as const }, { id: "desc" as const }];
export const activeRentalStatuses: BookingStatus[] = [
  "HANDOFF_PENDING",
  "IN_USE",
  "RETURN_PENDING",
  "INSPECTION",
];

export async function getAdminOverview() {
  return prisma.$transaction(
    async (tx) => {
      const [
        totalUsers,
        newUsers,
        admins,
        listingGroups,
        reportedListings,
        bookingGroups,
        users,
        listings,
        bookings,
      ] = await Promise.all([
        tx.user.count(),
        tx.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        }),
        tx.user.count({ where: { role: "ADMIN" } }),
        tx.listing.groupBy({ by: ["status"], _count: true }),
        tx.listing.count({ where: { reports: { some: { status: "OPEN" } } } }),
        tx.booking.groupBy({ by: ["status"], _count: true }),
        tx.user.findMany({
          take: 5,
          orderBy: order,
          select: { id: true, name: true, createdAt: true },
        }),
        tx.listing.findMany({
          take: 5,
          orderBy: order,
          select: { id: true, title: true, createdAt: true },
        }),
        tx.booking.findMany({
          take: 5,
          orderBy: order,
          select: {
            id: true,
            status: true,
            createdAt: true,
            listing: { select: { title: true } },
          },
        }),
      ]);
      const listingCount = (status: string) =>
        listingGroups.find((group) => group.status === status)?._count ?? 0;
      const byStatus: Record<string, number> = Object.fromEntries(
        Object.values(BookingStatus).map((status) => [status, 0]),
      );
      for (const group of bookingGroups) byStatus[group.status] = group._count;
      return {
        users: { total: totalUsers, newLast30Days: newUsers, admins },
        listings: {
          total: listingGroups.reduce((sum, group) => sum + group._count, 0),
          active: listingCount("ACTIVE"),
          inactive: listingCount("INACTIVE"),
          withOpenReports: reportedListings,
        },
        bookings: {
          total: bookingGroups.reduce((sum, group) => sum + group._count, 0),
          byStatus,
          pending: byStatus.PENDING ?? 0,
          confirmed: byStatus.CONFIRMED ?? 0,
          activeRentals: activeRentalStatuses.reduce(
            (sum, status) => sum + (byStatus[status] ?? 0),
            0,
          ),
          completed: byStatus.COMPLETED ?? 0,
          cancelled: byStatus.CANCELLED ?? 0,
          disputed: byStatus.DISPUTED ?? 0,
        },
        recent: { users, listings, bookings },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
function pagination(query: AdminQuery, total: number) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
export async function getAdminDirectory(kind: Directory, query: AdminQuery) {
  const page = {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: order,
  };
  const text = { contains: query.q, mode: "insensitive" as const };
  if (kind === "users") {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.accountStatus ? { accountStatus: query.accountStatus } : {}),
      ...(query.q ? { OR: [{ name: text }, { email: text }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({ where, ...page, select: adminUserSelect }),
      prisma.user.count({ where }),
    ]);
    return { items, pagination: pagination(query, total) };
  }
  if (kind === "listings") {
    const where: Prisma.ListingWhereInput = {
      ...(query.restricted !== undefined
        ? { adminRestricted: query.restricted }
        : {}),
      ...(query.status
        ? { status: query.status as "ACTIVE" | "INACTIVE" }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q ? { title: text } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.listing.findMany({ where, ...page, select: adminListingSelect }),
      prisma.listing.count({ where }),
    ]);
    return { items, pagination: pagination(query, total) };
  }
  const identifier = parsePathId(query.q);
  const where: Prisma.BookingWhereInput = {
    ...(query.status ? { status: query.status as BookingStatus } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.renterId ? { renterId: query.renterId } : {}),
    ...(query.q
      ? {
          OR: [
            ...(identifier ? [{ id: identifier }] : []),
            { listing: { title: text } },
            { owner: { OR: [{ name: text }, { email: text }] } },
            { renter: { OR: [{ name: text }, { email: text }] } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({ where, ...page, select: adminBookingSelect }),
    prisma.booking.count({ where }),
  ]);
  return { items, pagination: pagination(query, total) };
}
export async function getAdminUser(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...adminUserSelect,
      _count: {
        select: {
          listings: true,
          bookingsAsOwner: true,
          bookingsAsRenter: true,
          reviewsReceived: true,
        },
      },
      reviewsReceived: {
        take: 10,
        orderBy: order,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) return null;
  const bookings = await prisma.booking.findMany({
    where: { OR: [{ ownerId: id }, { renterId: id }] },
    take: 10,
    orderBy: order,
    select: adminBookingSelect,
  });
  return { ...user, bookings };
}
export async function getAdminListing(id: number) {
  return prisma.listing.findUnique({
    where: { id },
    select: {
      ...adminListingSelect,
      description: true,
      condition: true,
      categoryDetails: true,
      updatedAt: true,
      media: { select: { id: true, url: true, mimeType: true, kind: true } },
      supportedStations: {
        select: { station: { select: { id: true, name: true, code: true } } },
      },
      _count: { select: { bookings: true, reports: true } },
      bookings: { take: 10, orderBy: order, select: adminBookingSelect },
      reports: {
        take: 10,
        orderBy: order,
        select: { id: true, status: true, createdAt: true },
      },
    },
  });
}
export async function getAdminBooking(id: number) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      ...adminBookingSelect,
      meetingStation: { select: { id: true, name: true, code: true } },
      notes: true,
      updatedAt: true,
      cancelledBy: true,
      cancelledAt: true,
      cancellationReason: true,
      handoff: {
        select: {
          timestamp: true,
          performedBy: true,
          confirmedBy: true,
          confirmedAt: true,
          conditionConfirmed: true,
          ownerConditionConfirmed: true,
        },
      },
      return: {
        select: {
          timestamp: true,
          initiatedBy: true,
          returnConfirmed: true,
          inspectedBy: true,
          inspectedAt: true,
          inspectionAccepted: true,
          confirmedBy: true,
          confirmedAt: true,
          conditionConfirmed: true,
        },
      },
      disputes: {
        take: 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true, createdAt: true, resolvedAt: true },
      },
    },
  });
  return booking ? { ...booking, dispute: booking.disputes[0] ?? null } : null;
}
