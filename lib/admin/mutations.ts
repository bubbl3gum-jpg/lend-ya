import "server-only";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
import { AdminInputError } from "@/lib/admin/auth";
import { adminRecordId } from "@/lib/admin/query";

export async function adminMutation(
  request: Request,
  run: (adminId: number, body: Record<string, unknown>) => Promise<unknown>,
) {
  let response: Response;
  try {
    const user = await getCurrentUser();
    if (!user) response = apiError("Authentication required.", 401);
    else if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
      response = apiError("Active administrator permission required.", 403);
    else {
      // SameSite=Lax plus JSON-only requests and explicit Origin/Fetch Metadata checks.
      const origin = request.headers.get("origin");
      // Next's internal request URL can use localhost even when the browser used a deployment host.
      // Host is the HTTP authority the browser requested; do not trust arbitrary forwarded-host headers.
      const requestUrl = new URL(request.url),
        host = request.headers.get("host") ?? requestUrl.host;
      let sameOrigin = true;
      if (origin) {
        try {
          const source = new URL(origin);
          sameOrigin =
            ["http:", "https:"].includes(source.protocol) &&
            source.host === host;
        } catch {
          sameOrigin = false;
        }
      }
      if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site")
        throw new AdminInputError(
          "Cross-origin administrative actions are forbidden.",
          403,
        );
      if (
        request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
      )
        throw new AdminInputError("Use application/json.");
      const reader = request.body?.getReader();
      if (!reader) throw new AdminInputError("Provide a JSON request body.");
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) {
          await reader.cancel();
          throw new AdminInputError(
            "Administrative request exceeds 8 KB.",
            413,
          );
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const body = await readJsonObject(
        new Request(request.url, { method: "POST", body: bytes }),
      );
      if (!body) throw new AdminInputError("Provide a valid JSON object.");
      response = Response.json(await run(user.id, body));
    }
  } catch (error) {
    response =
      error instanceof AdminInputError
        ? apiError(error.message, error.status)
        : internalServerError("Administrative action", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
function input(body: Record<string, unknown>, fields: string[]) {
  if (Object.keys(body).some((k) => !fields.includes(k)))
    throw new AdminInputError("Unexpected administrative input field.");
  if (
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    body.reason.length > 2000
  )
    throw new AdminInputError("A reason of 1–2000 characters is required.");
  return body.reason.trim();
}
async function actor(tx: Prisma.TransactionClient, adminId: number) {
  // Read persisted permissions within the action transaction; shared lock prevents role changes during the write.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${adminId} FOR SHARE`;
  const user = await tx.user.findUnique({
    where: { id: adminId },
    select: { role: true, accountStatus: true },
  });
  if (user?.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
    throw new AdminInputError("Administrator permission changed.", 403);
}
function audit(
  tx: Prisma.TransactionClient,
  adminId: number,
  action: string,
  targetType: string,
  targetId: number,
  reason: string,
  previousState: Prisma.InputJsonObject,
  newState: Prisma.InputJsonObject,
) {
  return tx.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      reason,
      previousState,
      newState,
    },
    select: { id: true },
  });
}
export async function moderateUser(
  rawId: string,
  adminId: number,
  body: Record<string, unknown>,
) {
  const id = adminRecordId(rawId),
    reason = input(body, ["status", "expectedStatus", "reason"]);
  if (
    !["ACTIVE", "SUSPENDED"].includes(String(body.status)) ||
    !["ACTIVE", "SUSPENDED"].includes(String(body.expectedStatus))
  )
    throw new AdminInputError("Supply status and expectedStatus.");
  if (id === adminId)
    throw new AdminInputError(
      "You cannot suspend or moderate your own account.",
      403,
    );
  return prisma.$transaction(async (tx) => {
    await actor(tx, adminId);
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id },
      select: { role: true, accountStatus: true },
    });
    if (!user) throw new AdminInputError("User not found.", 404);
    if (user.role !== "USER")
      throw new AdminInputError(
        "Standard moderation cannot modify administrators.",
        403,
      );
    if (
      user.accountStatus !== body.expectedStatus ||
      user.accountStatus === body.status
    )
      throw new AdminInputError(
        "Account status changed or already has that status. Refresh.",
        409,
      );
    const status = body.status as "ACTIVE" | "SUSPENDED";
    await tx.user.update({ where: { id }, data: { accountStatus: status } });
    const log = await audit(
      tx,
      adminId,
      status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      "USER",
      id,
      reason,
      { accountStatus: user.accountStatus },
      { accountStatus: status },
    );
    return { id, accountStatus: status, auditLogId: log.id };
  });
}
export async function moderateListing(
  rawId: string,
  adminId: number,
  body: Record<string, unknown>,
) {
  const id = adminRecordId(rawId),
    reason = input(body, ["restricted", "expectedRestricted", "reason"]);
  if (
    typeof body.restricted !== "boolean" ||
    typeof body.expectedRestricted !== "boolean"
  )
    throw new AdminInputError(
      "Supply restricted and expectedRestricted booleans.",
    );
  return prisma.$transaction(async (tx) => {
    await actor(tx, adminId);
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id} FOR UPDATE`;
    const listing = await tx.listing.findUnique({
      where: { id },
      select: { adminRestricted: true, status: true },
    });
    if (!listing) throw new AdminInputError("Listing not found.", 404);
    if (
      listing.adminRestricted !== body.expectedRestricted ||
      listing.adminRestricted === body.restricted
    )
      throw new AdminInputError(
        "Listing restriction changed or already has that state. Refresh.",
        409,
      );
    const restricted = body.restricted as boolean;
    // Only remove the admin flag. Owner inactivity, suspension, reports, media and rental eligibility remain authoritative.
    await tx.listing.update({
      where: { id },
      data: { adminRestricted: restricted },
    });
    const log = await audit(
      tx,
      adminId,
      restricted ? "LISTING_RESTRICTED" : "LISTING_RESTORED",
      "LISTING",
      id,
      reason,
      listing,
      { ...listing, adminRestricted: restricted },
    );
    return { id, adminRestricted: restricted, auditLogId: log.id };
  });
}
export async function resolveReport(
  rawId: string,
  adminId: number,
  body: Record<string, unknown>,
) {
  const id = adminRecordId(rawId),
    reason = input(body, ["decision", "reason"]);
  if (!["DISMISS", "UPHOLD"].includes(String(body.decision)))
    throw new AdminInputError("Decision must be DISMISS or UPHOLD.");
  return prisma.$transaction(async (tx) => {
    await actor(tx, adminId);
    const original = await tx.listingReport.findUnique({
      where: { id },
      select: { listingId: true },
    });
    if (!original) throw new AdminInputError("Report not found.", 404);
    // All report and listing moderation writers acquire the Listing lock before case state.
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${original.listingId} FOR UPDATE`;
    const report = await tx.listingReport.findUniqueOrThrow({ where: { id } });
    if (report.status !== "OPEN")
      throw new AdminInputError(
        "Report already resolved. Refresh to read the decision.",
        409,
      );
    const listing = await tx.listing.findUniqueOrThrow({
      where: { id: report.listingId },
      select: { adminRestricted: true },
    });
    const status = body.decision === "UPHOLD" ? "REVIEWED" : "DISMISSED";
    await tx.listingReport.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedBy: adminId,
        decisionReason: reason,
      },
    });
    if (status === "REVIEWED") {
      await tx.listing.update({
        where: { id: report.listingId },
        data: { adminRestricted: true },
      });
      await audit(
        tx,
        adminId,
        "LISTING_RESTRICTED",
        "LISTING",
        report.listingId,
        reason,
        { adminRestricted: listing.adminRestricted },
        { adminRestricted: true, reportId: id },
      );
    }
    const log = await audit(
      tx,
      adminId,
      "REPORT_RESOLVED",
      "REPORT",
      id,
      reason,
      { status: "OPEN", listingId: report.listingId },
      {
        status,
        listingId: report.listingId,
        adminRestricted: status === "REVIEWED" || listing.adminRestricted,
      },
    );
    return { id, status, auditLogId: log.id };
  });
}
export async function resolveDispute(
  rawId: string,
  adminId: number,
  body: Record<string, unknown>,
) {
  const id = adminRecordId(rawId),
    reason = input(body, ["finding", "outcome", "reason", "adminNotes"]);
  if (
    ![
      "NO_ACTIONABLE_ISSUE",
      "ISSUE_CONFIRMED",
      "INSUFFICIENT_EVIDENCE",
    ].includes(String(body.finding))
  )
    throw new AdminInputError("Choose a supported finding.");
  if (
    body.adminNotes !== undefined &&
    (typeof body.adminNotes !== "string" || body.adminNotes.length > 2000)
  )
    throw new AdminInputError(
      "Internal notes must be text up to 2000 characters.",
    );
  if (
    !["CONTINUE_RETURN", "RESUME_INSPECTION", "CLOSE_RETURNED"].includes(
      String(body.outcome),
    )
  )
    throw new AdminInputError("Choose a supported booking outcome.");
  return prisma.$transaction(async (tx) => {
    await actor(tx, adminId);
    const original = await tx.dispute.findUnique({
      where: { id },
      select: { bookingId: true },
    });
    if (!original) throw new AdminInputError("Dispute not found.", 404);
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${original.bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: original.bookingId },
      include: { handoff: true, return: true },
    });
    const dispute = await tx.dispute.findUniqueOrThrow({ where: { id } });
    if (dispute.status !== "OPEN" || booking.status !== "DISPUTED")
      throw new AdminInputError(
        "Dispute is resolved or booking state changed. Refresh.",
        409,
      );
    const h = booking.handoff,
      r = booking.return;
    if (
      !h ||
      h.performedBy !== booking.ownerId ||
      h.confirmedBy !== booking.renterId ||
      !h.ownerConditionConfirmed ||
      !h.conditionConfirmed ||
      !h.confirmedAt
    )
      throw new AdminInputError(
        "Valid bilateral handoff evidence is required; legacy record needs explicit remediation.",
        409,
      );
    let status: "IN_USE" | "RETURN_PENDING" | "ADMIN_CLOSED";
    if (body.outcome === "CONTINUE_RETURN") {
      if (r)
        throw new AdminInputError(
          "A return already exists. Inspect its evidence instead.",
          409,
        );
      status = "IN_USE";
    } else {
      if (!r || r.initiatedBy !== booking.renterId || !r.returnConfirmed)
        throw new AdminInputError(
          "Recorded borrower return is required. No return will be fabricated.",
          409,
        );
      if (body.outcome === "RESUME_INSPECTION") {
        if (r.inspectedAt || r.confirmedBy)
          throw new AdminInputError(
            "Recorded inspection is immutable. Use the returned administrative closure after reviewing it.",
            409,
          );
        status = "RETURN_PENDING";
      } else {
        if (
          r.inspectedBy !== booking.ownerId ||
          !r.inspectedAt ||
          r.inspectionAccepted === null ||
          !r.inspectionChecklist
        )
          throw new AdminInputError(
            "Owner inspection evidence is required before releasing a returned item.",
            409,
          );
        status = "ADMIN_CLOSED";
      }
    }
    await tx.dispute.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: adminId,
        finding: body.finding as string,
        bookingOutcome: body.outcome as string,
        decisionSummary: reason,
        adminNotes:
          typeof body.adminNotes === "string"
            ? body.adminNotes.trim() || null
            : null,
      },
    });
    await tx.booking.update({ where: { id: booking.id }, data: { status } });
    const log = await audit(
      tx,
      adminId,
      "DISPUTE_RESOLVED",
      "DISPUTE",
      id,
      reason,
      { status: "OPEN", bookingId: booking.id, bookingStatus: "DISPUTED" },
      {
        status: "RESOLVED",
        bookingId: booking.id,
        bookingStatus: status,
        finding: body.finding as string,
        outcome: body.outcome as string,
      },
    );
    return {
      id,
      status: "RESOLVED",
      bookingStatus: status,
      auditLogId: log.id,
    };
  });
}
