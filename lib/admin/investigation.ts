import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AdminInputError } from "./auth";
import { adminRecordId } from "./query";
import { bookingCheckpointRows, queueRows } from "./workbench-sql";
import type { WorkbenchCategory, Reason } from "./workbench-catalog";
export type InvestigationKind = "BOOKING" | "LISTING" | "REPORT" | "DISPUTE";
type BookingChecks = {
  handoff: boolean;
  submittedReturn: boolean;
  physicalReturn: boolean;
  ownerReceipt: boolean;
  qrReceipt: boolean;
  acceptedInspection: boolean;
  openDispute: boolean;
  resolvedDisputes: number;
  adminClosed: boolean;
};
export type InvestigationSummary = {
  kind: InvestigationKind;
  id: number;
  status: string;
  asOf: string;
  matches: { category: WorkbenchCategory; reasons: Reason[] }[];
  booking: BookingChecks | null;
  listing: { restricted: boolean; openReports: number } | null;
  related: { kind: "BOOKING" | "LISTING"; id: number; href: string } | null;
};
/** The record comes only from its validated detail route. Navigation is not an input. */
export async function getInvestigationSummary(
  kind: InvestigationKind,
  rawId: string,
): Promise<InvestigationSummary> {
  const user = await getCurrentUser();
  if (!user) throw new AdminInputError("Authentication required.", 401);
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission required.", 403);
  if (!["BOOKING", "LISTING", "REPORT", "DISPUTE"].includes(kind))
    throw new AdminInputError("Unknown record kind.");
  const id = adminRecordId(rawId),
    asOf = new Date();
  return prisma.$transaction(
    async (tx) => {
      let status: string,
        bookingId: number | null = kind === "BOOKING" ? id : null,
        listingId: number | null = kind === "LISTING" ? id : null;
      let related: InvestigationSummary["related"] = null;
      if (kind === "BOOKING") {
        const record = await tx.booking.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!record) throw new AdminInputError("Record not found.", 404);
        status = record.status;
      } else if (kind === "LISTING") {
        const record = await tx.listing.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!record) throw new AdminInputError("Record not found.", 404);
        status = record.status;
      } else if (kind === "REPORT") {
        const record = await tx.listingReport.findUnique({
          where: { id },
          select: { status: true, listingId: true },
        });
        if (!record) throw new AdminInputError("Record not found.", 404);
        status = record.status;
        listingId = record.listingId;
        related = {
          kind: "LISTING",
          id: listingId,
          href: `/admin/listings/${listingId}`,
        };
      } else {
        const record = await tx.dispute.findUnique({
          where: { id },
          select: { status: true, bookingId: true },
        });
        if (!record) throw new AdminInputError("Record not found.", 404);
        status = record.status;
        bookingId = record.bookingId;
        related = {
          kind: "BOOKING",
          id: bookingId,
          href: `/admin/bookings/${bookingId}`,
        };
      }
      const rows = queueRows(asOf);
      const matches = await tx.$queryRaw<
        InvestigationSummary["matches"]
      >`${rows} SELECT category,reasons FROM entries WHERE kind=${kind} AND id=${id} ORDER BY category`;
      let booking: BookingChecks | null = null;
      if (bookingId !== null) {
        const flags = await tx.$queryRaw<
          {
            status: string;
            handoff_ok: boolean;
            return_submitted: boolean;
            return_ok: boolean;
            owner_receipt: boolean;
            qr_receipt: boolean;
            inspection_ok: boolean;
            open_case: boolean;
            resolved: number;
          }[]
        >`
        SELECT f.status::text,f.handoff_ok,f.return_submitted,f.return_ok,f.owner_receipt,f.qr_receipt,f.inspection_ok,f.open_case,
        (SELECT count(*)::int FROM "Dispute" d WHERE d."bookingId"=f.id AND d.status='RESOLVED') resolved
        FROM (${bookingCheckpointRows(true)}) f WHERE f.id=${bookingId}`;
        const f = flags[0];
        if (!f) throw new AdminInputError("Related booking unavailable.", 404);
        booking = {
          handoff: f.handoff_ok,
          submittedReturn: f.return_submitted,
          physicalReturn: f.return_ok,
          ownerReceipt: f.owner_receipt,
          qrReceipt: f.qr_receipt,
          acceptedInspection: f.inspection_ok,
          openDispute: f.open_case,
          resolvedDisputes: f.resolved,
          adminClosed: f.status === "ADMIN_CLOSED",
        };
      }
      let listing: InvestigationSummary["listing"] = null;
      if (listingId !== null) {
        const l = await tx.listing.findUnique({
          where: { id: listingId },
          select: {
            adminRestricted: true,
            _count: { select: { reports: { where: { status: "OPEN" } } } },
          },
        });
        if (!l) throw new AdminInputError("Related listing unavailable.", 404);
        listing = {
          restricted: l.adminRestricted,
          openReports: l._count.reports,
        };
      }
      return {
        kind,
        id,
        status,
        asOf: asOf.toISOString(),
        matches,
        booking,
        listing,
        related,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
