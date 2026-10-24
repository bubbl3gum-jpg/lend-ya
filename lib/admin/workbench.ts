import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminInputError } from "./auth";

export const workbenchCategories = {
  BOOKING_CASES: "Booking cases",
  RENTAL_END_PASSED: "Past agreed rental end",
  CUSTODY_REVIEW: "Custody records to check",
  LISTING_REVIEW: "Listing review",
  OPEN_REPORTS: "Open listing reports",
  OPEN_DISPUTES: "Open rental disputes",
} as const;
export type WorkbenchCategory = keyof typeof workbenchCategories;
export const workbenchReasons = {
  DISPUTED_BOOKING_STATE: "Booking has DISPUTED status",
  OPEN_RENTAL_CASE: "Booking has an open rental dispute",
  AGREED_END_PASSED_RETURN_UNCONFIRMED:
    "Agreed rental end passed; physical return is not confirmed",
  HANDOFF_RECORD_INCOMPLETE:
    "State requires bilateral handoff; confirmation record is incomplete",
  RETURN_RECORD_INCOMPLETE: "Return-stage confirmation record is incomplete",
  INSPECTION_RECORD_INCOMPLETE:
    "Completed state has incomplete accepted inspection",
  ADMIN_CLOSED_RETURN_UNCONFIRMED:
    "Administrative closure does not confirm physical return",
  ADMIN_RESTRICTED: "Listing is administratively restricted",
  OPEN_LISTING_REPORT: "Listing has an open report",
  OPEN_REPORT: "Listing report remains OPEN",
  OPEN_DISPUTE: "Rental dispute remains OPEN",
} as const;
type Reason = keyof typeof workbenchReasons;
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

// Fixed SQL only. All request values use Prisma's parameter bindings. No evidence,
// free-text case contents, contact details, credentials or actor names are selected.
function queueRows(asOf: Date) {
  return Prisma.sql`WITH flags AS (
    SELECT b.id,b.status,b."createdAt",b."endAt",
      (h."performedBy"=b."ownerId" AND h."confirmedBy"=b."renterId" AND h."ownerConditionConfirmed" AND h."conditionConfirmed" AND h."confirmedAt" IS NOT NULL) IS TRUE AS handoff_ok,
      (r."initiatedBy"=b."renterId" AND r."returnConfirmed" AND r."confirmedBy"=b."ownerId" AND r."confirmedAt" IS NOT NULL) IS TRUE OR EXISTS(SELECT 1 FROM "MeetupChallenge" mc WHERE mc."bookingId"=b.id AND mc.purpose='RETURN' AND mc."verifierId"=b."ownerId" AND mc."completedAt" IS NOT NULL AND mc."consumedAt" IS NOT NULL AND mc."completionHash" IS NOT NULL) AS return_ok,
      (r."initiatedBy"=b."renterId" AND r."returnConfirmed") IS TRUE AS return_submitted,
      (r."inspectedBy"=b."ownerId" AND r."inspectedAt" IS NOT NULL AND r."inspectionAccepted") IS TRUE AS inspection_ok,
      EXISTS(SELECT 1 FROM "Dispute" d WHERE d."bookingId"=b.id AND d.status='OPEN') AS open_case
    FROM "Booking" b LEFT JOIN "Handoff" h ON h."bookingId"=b.id LEFT JOIN "Return" r ON r."bookingId"=b.id
  ), entries AS (
    SELECT 'BOOKING_CASES'::text category,id,'BOOKING'::text kind,status::text,status_time AS "recordedAt","endAt",NULL::int AS "relatedId",reasons FROM (
      SELECT *,"createdAt" status_time,array_remove(ARRAY[CASE WHEN status='DISPUTED' THEN 'DISPUTED_BOOKING_STATE' END,CASE WHEN open_case THEN 'OPEN_RENTAL_CASE' END],NULL) reasons FROM flags WHERE status='DISPUTED' OR open_case
    ) booking_cases
    UNION ALL
    SELECT 'RENTAL_END_PASSED',id,'BOOKING',status::text,"createdAt","endAt",NULL::int,ARRAY['AGREED_END_PASSED_RETURN_UNCONFIRMED'] FROM flags
    WHERE status IN ('IN_USE','RETURN_PENDING','DISPUTED','ADMIN_CLOSED') AND handoff_ok AND NOT return_ok AND "endAt"<(${asOf}::timestamptz AT TIME ZONE 'UTC')
    UNION ALL
    SELECT 'CUSTODY_REVIEW',id,'BOOKING',status::text,"createdAt","endAt",NULL::int,
      array_remove(ARRAY[
        CASE WHEN NOT handoff_ok THEN 'HANDOFF_RECORD_INCOMPLETE' END,
        CASE WHEN ((status='COMPLETED' AND NOT return_ok) OR (status='INSPECTION' AND NOT return_submitted)) THEN 'RETURN_RECORD_INCOMPLETE' END,
        CASE WHEN status='COMPLETED' AND NOT inspection_ok THEN 'INSPECTION_RECORD_INCOMPLETE' END,
        CASE WHEN status='ADMIN_CLOSED' AND NOT return_ok THEN 'ADMIN_CLOSED_RETURN_UNCONFIRMED' END],NULL)
    FROM flags WHERE status IN ('IN_USE','RETURN_PENDING','INSPECTION','COMPLETED','ADMIN_CLOSED') AND
      (NOT handoff_ok OR (((status='COMPLETED' AND NOT return_ok) OR (status='INSPECTION' AND NOT return_submitted))) OR (status='COMPLETED' AND NOT inspection_ok) OR (status='ADMIN_CLOSED' AND NOT return_ok))
    UNION ALL
    SELECT 'LISTING_REVIEW',l.id,'LISTING',l.status::text,l."createdAt",NULL::timestamp,NULL::int,
      array_remove(ARRAY[CASE WHEN l."adminRestricted" THEN 'ADMIN_RESTRICTED' END,CASE WHEN EXISTS(SELECT 1 FROM "ListingReport" p WHERE p."listingId"=l.id AND p.status='OPEN') THEN 'OPEN_LISTING_REPORT' END],NULL)
    FROM "Listing" l WHERE l."adminRestricted" OR EXISTS(SELECT 1 FROM "ListingReport" p WHERE p."listingId"=l.id AND p.status='OPEN')
    UNION ALL
    SELECT 'OPEN_REPORTS',id,'REPORT',status::text,"createdAt",NULL::timestamp,"listingId",ARRAY['OPEN_REPORT'] FROM "ListingReport" WHERE status='OPEN'
    UNION ALL
    SELECT 'OPEN_DISPUTES',id,'DISPUTE',status::text,"createdAt",NULL::timestamp,"bookingId",ARRAY['OPEN_DISPUTE'] FROM "Dispute" WHERE status='OPEN'
  )`;
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
            href: `/admin/${paths[entry.kind]}/${entry.id}`,
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
