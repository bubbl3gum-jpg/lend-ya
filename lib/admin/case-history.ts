import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminInputError } from "./auth";
import { adminRecordId } from "./query";
import { historyPage } from "./case-history-navigation";
export type HistoryKind = "REPORT" | "DISPUTE";
export const historyLabels = {
  CASE_CREATED: "Case creation timestamp recorded",
  LATEST_RESOLUTION: "Latest case resolution timestamp recorded",
  REPORT_RESOLVED: "Report decision recorded",
  DISPUTE_RESOLVED: "Dispute decision recorded",
  EVIDENCE_VIEWED: "Evidence access recorded",
  ADMIN_ACTION_RECORDED: "Administrative audit metadata recorded",
} as const;
export type HistoryEvent = {
  source: "CASE_TIMESTAMP" | "ADMIN_AUDIT";
  event: keyof typeof historyLabels;
  timestamp: string;
  auditId: number | null;
};
export type CaseHistoryDto = {
  kind: HistoryKind;
  id: number;
  related: { kind: "LISTING" | "BOOKING"; id: number };
  page: number;
  pageSize: 20;
  total: number;
  events: HistoryEvent[];
};
async function requireHistoryAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission required.", 403);
}
/** One snapshot SQL statement; fixed fields, exact target, no audit payloads/actors. */
export async function getCaseHistory(
  kind: HistoryKind,
  rawId: string,
  params: URLSearchParams,
): Promise<CaseHistoryDto> {
  await requireHistoryAdmin();
  if (kind !== "REPORT" && kind !== "DISPUTE")
    throw new AdminInputError("Unknown case type.");
  const id = adminRecordId(rawId),
    page = historyPage(params);
  if (page === null) throw new AdminInputError("Invalid history page.");
  const allowed = [
    "historyPage",
    "wbCategory",
    "wbRecordId",
    "wbPage",
    "wbPageSize",
  ];
  for (const key of params.keys())
    if (!allowed.includes(key))
      throw new AdminInputError("Unknown history query parameter.");
  const table =
    kind === "REPORT" ? Prisma.sql`"ListingReport"` : Prisma.sql`"Dispute"`;
  const relatedColumn =
    kind === "REPORT" ? Prisma.sql`"listingId"` : Prisma.sql`"bookingId"`;
  const rows = await prisma.$queryRaw<
    {
      found: boolean;
      relatedId: number | null;
      total: number;
      events: HistoryEvent[];
    }[]
  >(Prisma.sql`
    WITH record AS (
      SELECT id, "createdAt", "resolvedAt", ${relatedColumn} AS "relatedId" FROM ${table} WHERE id=${id}
    ), events AS (
      SELECT 'CASE_TIMESTAMP'::text AS source, 'CASE_CREATED'::text AS event, "createdAt" AS timestamp, NULL::int AS "auditId", 1 AS rank, 0 AS tie FROM record
      UNION ALL
      SELECT 'CASE_TIMESTAMP', 'LATEST_RESOLUTION', "resolvedAt", NULL::int, 2, 0 FROM record WHERE "resolvedAt" IS NOT NULL
      UNION ALL
      SELECT 'ADMIN_AUDIT', CASE WHEN action IN ('REPORT_RESOLVED','DISPUTE_RESOLVED','EVIDENCE_VIEWED') THEN action ELSE 'ADMIN_ACTION_RECORDED' END,
        "createdAt", id, 3, id FROM "AdminAuditLog" WHERE "targetType"=${kind} AND "targetId"=${id} AND EXISTS(SELECT 1 FROM record)
    ), paged AS (
      SELECT source,event,timestamp,"auditId",rank,tie FROM events ORDER BY timestamp ASC, rank ASC, tie ASC LIMIT 20 OFFSET ${(page - 1) * 20}
    )
    SELECT EXISTS(SELECT 1 FROM record) AS found, (SELECT "relatedId" FROM record) AS "relatedId",
      (SELECT count(*)::int FROM events) AS total,
      COALESCE((SELECT json_agg(json_build_object('source',source,'event',event,'timestamp',to_char(timestamp,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'auditId',"auditId") ORDER BY timestamp ASC,rank ASC,tie ASC) FROM paged), '[]'::json) AS events
  `);
  const result = rows[0];
  if (!result.found) throw new AdminInputError("Case not found.", 404);
  return {
    kind,
    id,
    related: {
      kind: kind === "REPORT" ? "LISTING" : "BOOKING",
      id: result.relatedId!,
    },
    page,
    pageSize: 20,
    total: result.total,
    events: result.events,
  };
}
export async function getCaseAudit(rawId: string) {
  await requireHistoryAdmin();
  const id = adminRecordId(rawId);
  const row = await prisma.adminAuditLog.findUnique({
    where: { id },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      action: true,
      createdAt: true,
    },
  });
  if (!row || (row.targetType !== "REPORT" && row.targetType !== "DISPUTE"))
    throw new AdminInputError("Case audit record not found.", 404);
  // Never return unrecognised free-form action strings or the unrestricted log.
  const event = [
    "REPORT_RESOLVED",
    "DISPUTE_RESOLVED",
    "EVIDENCE_VIEWED",
  ].includes(row.action)
    ? (row.action as keyof typeof historyLabels)
    : "ADMIN_ACTION_RECORDED";
  return {
    id: row.id,
    kind: row.targetType as HistoryKind,
    caseId: row.targetId,
    event,
    timestamp: row.createdAt.toISOString(),
  };
}
