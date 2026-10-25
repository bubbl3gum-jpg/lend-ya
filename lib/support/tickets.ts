import "server-only";
import { Client } from "pg";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { supportCandidateConfig, SUPPORT_CANDIDATE_POLICY } from "./config";
import { ticketInput, uuid } from "./input";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
export class TicketDenied extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function ownedSupportCandidate() {
  let c;
  try {
    c = supportCandidateConfig();
  } catch {
    throw new TicketDenied(404, "Not found.");
  }
  const driver = new Client({ connectionString: c.database.toString() });
  if (
    driver.host !== c.database.hostname ||
    driver.port !== Number(c.database.port) ||
    driver.database !== c.database.pathname.slice(1)
  )
    throw new TicketDenied(404, "Not found.");
  const rows = await prisma.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== driver.database ||
    rows[0]?.marker !== `hustlen-mrt-test:${c.runId}`
  )
    throw new TicketDenied(404, "Not found.");
  return c;
}
export async function ticketContext() {
  const config = await ownedSupportCandidate(),
    user = await getCurrentUser();
  if (!user) throw new TicketDenied(401, "Authentication required.");
  if (user.accountStatus !== "ACTIVE" || !config.requesterIds.includes(user.id))
    throw new TicketDenied(
      403,
      "Candidate requester unavailable. Existing help and rental support remain available.",
    );
  return { config, user };
}
const select = {
  id: true,
  categoryCode: true,
  subject: true,
  currentState: true,
  createdAt: true,
  lifecycleVersion: true,
} satisfies Prisma.SupportTicketSelect;
async function relatedAllowed(
  tx: Prisma.TransactionClient,
  userId: number,
  v: {
    bookingId: number | null;
    listingId: number | null;
    reportId: number | null;
    disputeId: number | null;
  },
) {
  if (
    v.bookingId !== null &&
    !(await tx.booking.findFirst({
      where: {
        id: v.bookingId,
        OR: [{ ownerId: userId }, { renterId: userId }],
      },
      select: { id: true },
    }))
  )
    return false;
  if (
    v.listingId !== null &&
    !(await tx.listing.findFirst({
      where: { id: v.listingId, ownerId: userId },
      select: { id: true },
    }))
  )
    return false;
  if (
    v.reportId !== null &&
    !(await tx.listingReport.findFirst({
      where: { id: v.reportId, reporterId: userId },
      select: { id: true },
    }))
  )
    return false;
  if (
    v.disputeId !== null &&
    !(await tx.dispute.findFirst({
      where: {
        id: v.disputeId,
        openedBy: userId,
        booking: { OR: [{ ownerId: userId }, { renterId: userId }] },
      },
      select: { id: true },
    }))
  )
    return false;
  return true;
}
export async function createOwnTicket(body: Record<string, unknown>) {
  const { config, user } = await ticketContext();
  let v;
  try {
    v = ticketInput(body);
  } catch {
    throw new TicketDenied(400, "Invalid ticket submission.");
  }
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...v, requestKey: undefined }))
    .digest("hex");
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { accountStatus: string }[]
    >`SELECT "accountStatus" FROM "User" WHERE id=${user.id} FOR UPDATE`;
    if (rows[0]?.accountStatus !== "ACTIVE")
      throw new TicketDenied(403, "Account unavailable.");
    const previous = await tx.supportTicket.findUnique({
      where: {
        requesterUserId_requestKey: {
          requesterUserId: user.id,
          requestKey: v.requestKey,
        },
      },
      select: { ...select, requestHash: true },
    });
    if (previous) {
      if (previous.requestHash !== hash)
        throw new TicketDenied(
          409,
          "Request key already used for different content.",
        );
      const { requestHash: _, ...ticket } = previous;
      void _;
      return { ticket, replayed: true };
    }
    if (!(await relatedAllowed(tx, user.id, v)))
      throw new TicketDenied(404, "Related record unavailable.");
    const count = await tx.supportTicket.count({
      where: {
        requesterUserId: user.id,
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (count >= config.limit)
      throw new TicketDenied(
        429,
        "Development intake limit reached. Existing help remains available.",
      );
    const id = randomUUID(),
      eventId = randomUUID();
    const ticket = await tx.supportTicket.create({
      data: {
        ...v,
        id,
        requesterUserId: user.id,
        requestHash: hash,
        initialEventId: eventId,
        policyVersion: SUPPORT_CANDIDATE_POLICY,
        currentState: "RECEIVED",
        lifecycleVersion: 1,
      },
      select,
    });
    await tx.supportTicketEvent.create({
      data: {
        id: eventId,
        ticketId: id,
        actorUserId: user.id,
        eventType: "TICKET_RECEIVED",
        sequence: 1,
        lifecycleVersion: 1,
        correlationId: v.requestKey,
      },
    });
    return { ticket, replayed: false };
  });
}
export async function listOwnTickets(params: URLSearchParams) {
  const { user } = await ticketContext();
  for (const k of params.keys())
    if (k !== "page" || params.getAll(k).length !== 1)
      throw new TicketDenied(400, "Unknown ticket filter.");
  const raw = params.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(raw) || Number(raw) > 10000)
    throw new TicketDenied(400, "Invalid page.");
  const page = Number(raw);
  const [items, total] = await prisma.$transaction(
    [
      prisma.supportTicket.findMany({
        where: { requesterUserId: user.id },
        select,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
        skip: (page - 1) * 10,
      }),
      prisma.supportTicket.count({ where: { requesterUserId: user.id } }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return { items, page, pageSize: 10, total };
}
export async function readOwnTicket(id: string) {
  const { user } = await ticketContext();
  if (!uuid(id)) throw new TicketDenied(404, "Ticket not found.");
  return prisma.$transaction(
    async (tx) => {
      const row = await tx.supportTicket.findFirst({
        where: { id, requesterUserId: user.id },
        select: {
          ...select,
          description: true,
          bookingId: true,
          listingId: true,
          reportId: true,
          disputeId: true,
        },
      });
      if (!row) throw new TicketDenied(404, "Ticket not found.");
      const { bookingId, listingId, reportId, disputeId, ...ticket } = row;
      const allowed = await relatedAllowed(tx, user.id, row);
      const link = bookingId
        ? { kind: "booking", id: bookingId }
        : listingId
          ? { kind: "listing", id: listingId }
          : reportId
            ? { kind: "report", id: reportId }
            : disputeId
              ? { kind: "dispute", id: disputeId }
              : null;
      const events = await tx.supportTicketEvent.findMany({
        where: { ticketId: id, actorUserId: user.id },
        select: { eventType: true, sequence: true, createdAt: true },
        orderBy: { sequence: "asc" },
        take: 10,
      });
      return { ...ticket, related: allowed ? link : null, events };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function ticketApi(request: Request, id?: string) {
  let response: Response;
  try {
    const c = await ownedSupportCandidate();
    if (
      request.headers.get("host") !== new URL(c.origin).host ||
      (request.headers.get("origin") !== null &&
        request.headers.get("origin") !== c.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.method === "POST" &&
        (request.headers.get("origin") !== c.origin ||
          request.headers.get("content-type") !== "application/json"))
    )
      throw new TicketDenied(403, "Request origin refused.");
    if ((id || request.method === "POST") && new URL(request.url).search)
      throw new TicketDenied(400, "Unknown ticket filter.");
    if (request.method === "POST") {
      const body = await readJsonObject(request);
      if (!body) throw new TicketDenied(400, "Invalid JSON payload.");
      const result = await createOwnTicket(body);
      response = Response.json(result, { status: result.replayed ? 200 : 201 });
    } else
      response = Response.json(
        id
          ? await readOwnTicket(id)
          : await listOwnTickets(new URL(request.url).searchParams),
      );
  } catch (error) {
    response =
      error instanceof TicketDenied
        ? apiError(error.message, error.status)
        : internalServerError("support_ticket_candidate", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
