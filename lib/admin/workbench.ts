import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminInputError } from "./auth";

import {
  workbenchCategories,
  type WorkbenchCategory,
  type Reason,
} from "./workbench-catalog";
export {
  workbenchCategories,
  workbenchReasons,
  type WorkbenchCategory,
} from "./workbench-catalog";
import { queueRows } from "./workbench-sql";
import { investigationHref } from "./workbench-navigation";
type EntryRow = {
  category: WorkbenchCategory;
  id: number;
  kind: "BOOKING" | "LISTING" | "REPORT" | "DISPUTE";
  status: string;
  recordedAt: Date;
  endAt: Date | null;
  relatedId: number | null;
  reasons: Reason[];
};
export type WorkbenchEntry = Omit<EntryRow, "recordedAt" | "endAt"> & {
  recordedAt: string;
  endAt: string | null;
  href: string;
};
export function parseWorkbenchQuery(params: URLSearchParams) {
  for (const key of params.keys())
    if (
      !["category", "recordId", "page", "pageSize"].includes(key) ||
      params.getAll(key).length !== 1
    )
      throw new AdminInputError("Unknown or repeated workbench filter.");
  const category = params.get("category") ?? "BOOKING_CASES";
  if (!Object.hasOwn(workbenchCategories, category))
    throw new AdminInputError("Unknown queue category.");
  const integer = (key: string, fallback: number, max: number) => {
    const value = params.get(key);
    if (value === null || value === "") return fallback;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new AdminInputError(`Invalid ${key}.`);
    return Number(value);
  };
  return {
    category: category as WorkbenchCategory,
    recordId: params.get("recordId")
      ? integer("recordId", 1, 2147483647)
      : null,
    page: integer("page", 1, 10000),
    pageSize: integer("pageSize", 10, 50),
  };
}

const paths = {
  BOOKING: "bookings",
  LISTING: "listings",
  REPORT: "reports",
  DISPUTE: "disputes",
} as const;

/** Real legacy guard at the service boundary, independent of page/API callers. */
export async function getOperationsWorkbench(params: URLSearchParams) {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission required.", 403);
  const query = parseWorkbenchQuery(params),
    asOf = new Date();
  return prisma.$transaction(
    async (tx) => {
      const rows = queueRows(asOf);
      const counts = await tx.$queryRaw<
        { category: WorkbenchCategory; total: number; matching: number }[]
      >`${rows}
      SELECT category,count(*)::int total,count(*) FILTER (WHERE ${query.recordId}::int IS NULL OR id=${query.recordId})::int matching FROM entries GROUP BY category`;
      const entries = await tx.$queryRaw<EntryRow[]>`${rows}
      SELECT * FROM entries WHERE category=${query.category} AND (${query.recordId}::int IS NULL OR id=${query.recordId})
      ORDER BY "recordedAt" ASC,id ASC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`;
      const activity = await tx.adminAuditLog.findMany({
        where: {
          targetType: {
            in: ["LISTING", "BOOKING", "REPORT", "DISPUTE"],
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 8,
        select: { id: true, targetType: true, targetId: true, createdAt: true },
      });
      const totalMatching =
        counts.find((c) => c.category === query.category)?.matching ?? 0;
      return {
        asOf: asOf.toISOString(),
        query,
        queues: (Object.keys(workbenchCategories) as WorkbenchCategory[]).map(
          (category) => ({
            category,
            count: counts.find((c) => c.category === category)?.total ?? 0,
          }),
        ),
        totalMatching,
        totalPages: Math.max(1, Math.ceil(totalMatching / query.pageSize)),
        items: entries.map(
          (entry): WorkbenchEntry => ({
            ...entry,
            recordedAt: entry.recordedAt.toISOString(),
            endAt: entry.endAt?.toISOString() ?? null,
            href: investigationHref(
              `/admin/${paths[entry.kind]}/${entry.id}`,
              query,
            ),
          }),
        ),
        activity: activity.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
