import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminInputError } from "./auth";
import { parseSupportQuery } from "./support-query";
export type SupportCase = {
  kind: "REPORT" | "DISPUTE";
  id: number;
  status: "OPEN" | "REVIEWED" | "DISMISSED" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  related: { kind: "LISTING" | "BOOKING"; id: number };
};
/** Current case index, not ticket intake, evidence access, or staff authorization. */
export async function getSupportWorkspace(params: URLSearchParams) {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission required.", 403);
  let query;
  try {
    query = parseSupportQuery(params);
  } catch (error) {
    throw new AdminInputError(
      error instanceof Error ? error.message : "Invalid Support filters.",
    );
  }
  const rows = await prisma.$queryRaw<
    {
      asOf: Date;
      openReports: number;
      openDisputes: number;
      historicalReports: number;
      historicalDisputes: number;
      totalMatching: number;
      items: SupportCase[];
    }[]
  >(Prisma.sql`
    WITH cases AS (
      SELECT 'REPORT'::text AS kind,id,status::text,"createdAt","resolvedAt",'LISTING'::text AS "relatedKind","listingId" AS "relatedId",1 AS rank FROM "ListingReport"
      UNION ALL
      SELECT 'DISPUTE',id,status::text,"createdAt","resolvedAt",'BOOKING',"bookingId",2 FROM "Dispute"
    ), matched AS (
      SELECT * FROM cases WHERE (${query.caseType}='ALL' OR kind=${query.caseType})
      AND (${query.caseState}='ALL' OR (${query.caseState}='OPEN' AND status='OPEN') OR (${query.caseState}='RESOLVED' AND status<>'OPEN'))
      AND (${query.caseId}::int IS NULL OR id=${query.caseId})
    ), paged AS (
      SELECT * FROM matched ORDER BY "createdAt" ASC,rank ASC,id ASC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
    )
    SELECT statement_timestamp() AS "asOf",
      count(*) FILTER(WHERE kind='REPORT' AND status='OPEN')::int AS "openReports",
      count(*) FILTER(WHERE kind='DISPUTE' AND status='OPEN')::int AS "openDisputes",
      count(*) FILTER(WHERE kind='REPORT' AND status<>'OPEN')::int AS "historicalReports",
      count(*) FILTER(WHERE kind='DISPUTE' AND status<>'OPEN')::int AS "historicalDisputes",
      (SELECT count(*)::int FROM matched) AS "totalMatching",
      COALESCE((SELECT json_agg(json_build_object('kind',kind,'id',id,'status',status,
        'createdAt',to_char("createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'resolvedAt',CASE WHEN "resolvedAt" IS NULL THEN NULL ELSE to_char("resolvedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
        'related',json_build_object('kind',"relatedKind",'id',"relatedId")) ORDER BY "createdAt" ASC,rank ASC,id ASC) FROM paged),'[]'::json) AS items FROM cases
  `);
  const data = rows[0];
  // Specific operational access record, not an immutable case event or evidence audit.
  // No query string, case selector/IDs, participant data, free text or payloads.
  console.info(
    JSON.stringify({
      event: "admin_support_read",
      actorId: user.id,
      at: data.asOf.toISOString(),
      caseType: query.caseType,
      caseState: query.caseState,
      page: query.page,
      pageSize: query.pageSize,
      returned: data.items.length,
    }),
  );
  return {
    asOf: data.asOf.toISOString(),
    query,
    counts: {
      openReports: data.openReports,
      openDisputes: data.openDisputes,
      historicalReports: data.historicalReports,
      historicalDisputes: data.historicalDisputes,
    },
    totalMatching: data.totalMatching,
    totalPages: Math.max(1, Math.ceil(data.totalMatching / query.pageSize)),
    items: data.items,
  };
}
