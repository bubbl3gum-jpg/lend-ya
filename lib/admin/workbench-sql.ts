import "server-only";
import { Prisma } from "@prisma/client";

export function bookingCheckpointRows(includeReceiptPaths = false) {
  const ownerReceipt = Prisma.sql`(r."initiatedBy"=b."renterId" AND r."returnConfirmed" AND r."confirmedBy"=b."ownerId" AND r."confirmedAt" IS NOT NULL) IS TRUE`;
  const qrReceipt = Prisma.sql`EXISTS(SELECT 1 FROM "MeetupChallenge" mc WHERE mc."bookingId"=b.id AND mc.purpose='RETURN' AND mc."verifierId"=b."ownerId" AND mc."completedAt" IS NOT NULL AND mc."consumedAt" IS NOT NULL AND mc."completionHash" IS NOT NULL)`;
  return Prisma.sql`    SELECT b.id,b.status,b."createdAt",b."endAt",
      (h."performedBy"=b."ownerId" AND h."confirmedBy"=b."renterId" AND h."ownerConditionConfirmed" AND h."conditionConfirmed" AND h."confirmedAt" IS NOT NULL) IS TRUE AS handoff_ok,
      (${ownerReceipt} OR ${qrReceipt}) AS return_ok,
      ${includeReceiptPaths ? Prisma.sql`${ownerReceipt} AS owner_receipt,${qrReceipt} AS qr_receipt,` : Prisma.empty}
      (r."initiatedBy"=b."renterId" AND r."returnConfirmed") IS TRUE AS return_submitted,
      (r."inspectedBy"=b."ownerId" AND r."inspectedAt" IS NOT NULL AND r."inspectionAccepted") IS TRUE AS inspection_ok,
      EXISTS(SELECT 1 FROM "Dispute" d WHERE d."bookingId"=b.id AND d.status='OPEN') AS open_case
    FROM "Booking" b LEFT JOIN "Handoff" h ON h."bookingId"=b.id LEFT JOIN "Return" r ON r."bookingId"=b.id
`;
}

// Fixed SQL only. All request values use Prisma's parameter bindings. No evidence,
// free-text case contents, contact details, credentials or actor names are selected.
export function queueRows(asOf: Date) {
  return Prisma.sql`WITH flags AS (${bookingCheckpointRows()}  ), entries AS (
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
