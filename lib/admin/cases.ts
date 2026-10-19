import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminInputError } from "@/lib/admin/auth";
import { adminBookingSelect, participantSelect } from "@/lib/admin/data";
export type CaseKind = "reports" | "disputes" | "audit-logs";
const reportSelect = {
  id: true,
  listingId: true,
  reporterId: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
  decisionReason: true,
  reporter: { select: participantSelect },
  listing: {
    select: {
      id: true,
      title: true,
      status: true,
      adminRestricted: true,
      owner: { select: participantSelect },
    },
  },
} satisfies Prisma.ListingReportSelect;
const disputeSelect = {
  id: true,
  bookingId: true,
  openedBy: true,
  reason: true,
  description: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
  finding: true,
  decisionSummary: true,
  adminNotes: true,
  bookingOutcome: true,
  opener: { select: participantSelect },
  booking: { select: adminBookingSelect },
} satisfies Prisma.DisputeSelect;
const logSelect = {
  id: true,
  adminId: true,
  action: true,
  targetType: true,
  targetId: true,
  reason: true,
  previousState: true,
  newState: true,
  createdAt: true,
  admin: { select: participantSelect },
} satisfies Prisma.AdminAuditLogSelect;
export function caseQuery(kind: CaseKind, params: URLSearchParams) {
  const allowed =
    kind === "audit-logs"
      ? ["q", "page", "pageSize", "action", "targetType", "targetId", "adminId"]
      : ["q", "page", "pageSize", "status"];
  for (const key of params.keys())
    if (!allowed.includes(key) || params.getAll(key).length !== 1)
      throw new AdminInputError("Unknown or repeated query parameter.");
  const integer = (key: string, fallback?: number, max = 2147483647) => {
    const raw = params.get(key);
    if (!raw && fallback) return fallback;
    if (!raw || !/^[1-9]\d*$/.test(raw) || Number(raw) > max)
      throw new AdminInputError(`Invalid ${key}.`);
    return Number(raw);
  };
  const page = integer("page", 1, 1000000),
    pageSize = integer("pageSize", 20, 100),
    q = params.get("q") ?? "",
    status = params.get("status") || undefined;
  if (q.length > 120)
    throw new AdminInputError("Search is limited to 120 characters.");
  if (
    status &&
    !(
      kind === "reports"
        ? ["OPEN", "REVIEWED", "DISMISSED"]
        : ["OPEN", "RESOLVED"]
    ).includes(status)
  )
    throw new AdminInputError("Invalid case status.");
  const targetType = params.get("targetType") || undefined,
    action = params.get("action") || undefined;
  if (
    targetType &&
    !["USER", "LISTING", "REPORT", "DISPUTE"].includes(targetType)
  )
    throw new AdminInputError("Invalid target type.");
  if (
    action &&
    ![
      "USER_SUSPENDED",
      "USER_REACTIVATED",
      "LISTING_RESTRICTED",
      "LISTING_RESTORED",
      "REPORT_RESOLVED",
      "DISPUTE_RESOLVED",
      "EVIDENCE_VIEWED",
    ].includes(action)
  )
    throw new AdminInputError("Invalid audit action.");
  return {
    page,
    pageSize,
    q,
    status,
    targetType,
    action,
    targetId: params.has("targetId") ? integer("targetId") : undefined,
    adminId: params.has("adminId") ? integer("adminId") : undefined,
  };
}
export async function caseDirectory(kind: CaseKind, params: URLSearchParams) {
  const query = caseQuery(kind, params),
    text = { contains: query.q, mode: "insensitive" as const };
  const options = {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
  };
  if (kind === "reports") {
    const where: Prisma.ListingReportWhereInput = {
      ...(query.status
        ? { status: query.status as "OPEN" | "REVIEWED" | "DISMISSED" }
        : {}),
      ...(query.q
        ? {
            OR: [
              { reason: text },
              { listing: { title: text } },
              { reporter: { name: text } },
              { listing: { owner: { name: text } } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.listingReport.findMany({
        where,
        ...options,
        select: reportSelect,
      }),
      prisma.listingReport.count({ where }),
    ]);
    return {
      items,
      pagination: {
        ...query,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }
  if (kind === "disputes") {
    const where: Prisma.DisputeWhereInput = {
      ...(query.status ? { status: query.status as "OPEN" | "RESOLVED" } : {}),
      ...(query.q
        ? {
            OR: [
              { reason: text },
              { booking: { listing: { title: text } } },
              { booking: { owner: { name: text } } },
              { booking: { renter: { name: text } } },
              ...(/^\d+$/.test(query.q) && Number(query.q) <= 2147483647
                ? [{ bookingId: Number(query.q) }]
                : []),
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.dispute.findMany({ where, ...options, select: disputeSelect }),
      prisma.dispute.count({ where }),
    ]);
    return {
      items,
      pagination: {
        ...query,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.targetId ? { targetId: query.targetId } : {}),
    ...(query.adminId ? { adminId: query.adminId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.q
      ? { OR: [{ reason: text }, { admin: { name: text } }, { action: text }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.adminAuditLog.findMany({ where, ...options, select: logSelect }),
    prisma.adminAuditLog.count({ where }),
  ]);
  return {
    items,
    pagination: {
      ...query,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
export async function caseDetail(kind: "reports" | "disputes", id: number) {
  if (kind === "reports")
    return prisma.listingReport.findUnique({
      where: { id },
      select: reportSelect,
    });
  return prisma.dispute.findUnique({
    where: { id },
    select: {
      ...disputeSelect,
      booking: {
        select: {
          ...adminBookingSelect,
          notes: true,
          meetingStation: { select: { id: true, code: true, name: true } },
          handoff: true,
          return: true,
          evidencePhotos: {
            select: {
              id: true,
              stage: true,
              uploaderId: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
}
