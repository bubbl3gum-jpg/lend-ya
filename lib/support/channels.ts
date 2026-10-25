import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ticketContext, TicketDenied } from "./tickets";
import { channelCandidateConfig, CHANNEL_POLICY } from "./channel-config";
import { channelMessageInput, messageCursor } from "./channel-input";
import { uuid } from "./input";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
const channelSelect = {
  id: true,
  ticketId: true,
  relationshipSide: true,
  createdAt: true,
} satisfies Prisma.SupportParticipantChannelSelect;
const messageSelect = {
  id: true,
  sequence: true,
  content: true,
  createdAt: true,
} satisfies Prisma.SupportMessageSelect;
type Tx = Prisma.TransactionClient;
async function context() {
  let config;
  try {
    config = channelCandidateConfig();
  } catch {
    throw new TicketDenied(404, "Channel unavailable.");
  }
  const { user } = await ticketContext();
  return { config, user };
}
async function activeLock(tx: Tx, id: number) {
  const rows = await tx.$queryRaw<
    { id: number }[]
  >`SELECT id FROM "User" WHERE id=${id} AND "accountStatus"='ACTIVE' FOR UPDATE`;
  if (!rows.length) throw new TicketDenied(403, "Account unavailable.");
}
async function side(tx: Tx, ticketId: string, userId: number) {
  const rows = await tx.$queryRaw<
    { side: string | null }[]
  >`SELECT support_channel_candidate_side(${ticketId}::uuid,${userId}::int) AS side`;
  if (!rows[0]?.side) throw new TicketDenied(404, "Channel unavailable.");
  return rows[0].side;
}
async function ticketResource(
  tx: Tx,
  id: string,
  userId: number,
  lock = false,
) {
  if (!uuid(id)) throw new TicketDenied(404, "Channel unavailable.");
  const row = await tx.supportTicket.findFirst({
    where: { id, requesterUserId: userId },
    select: { id: true },
  });
  if (!row) throw new TicketDenied(404, "Channel unavailable.");
  if (lock)
    await tx.$queryRaw`SELECT id FROM "SupportTicket" WHERE id=${id}::uuid AND "requesterUserId"=${userId} FOR UPDATE`;
  return side(tx, id, userId);
}
async function channelResource(
  tx: Tx,
  id: string,
  userId: number,
  lock = false,
) {
  if (!uuid(id)) throw new TicketDenied(404, "Channel unavailable.");
  const row = await tx.supportParticipantChannel.findFirst({
    where: {
      id,
      participantUserId: userId,
      ticket: { requesterUserId: userId },
    },
    select: channelSelect,
  });
  if (!row) throw new TicketDenied(404, "Channel unavailable.");
  if (lock)
    await tx.$queryRaw`SELECT id FROM "SupportParticipantChannel" WHERE id=${id}::uuid AND "participantUserId"=${userId} FOR UPDATE`;
  if ((await side(tx, row.ticketId, userId)) !== row.relationshipSide)
    throw new TicketDenied(404, "Channel unavailable.");
  return row;
}
export async function ownChannel(ticketId: string) {
  const { user } = await context();
  return prisma.$transaction(
    async (tx) => {
      await ticketResource(tx, ticketId, user.id);
      return tx.supportParticipantChannel.findFirst({
        where: {
          ticketId,
          participantUserId: user.id,
          ticket: { requesterUserId: user.id },
        },
        select: channelSelect,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function createOwnChannel(
  ticketId: string,
  body: Record<string, unknown>,
) {
  const { user } = await context();
  if (Object.keys(body).length)
    throw new TicketDenied(
      400,
      "Channel creation accepts no identity or membership fields.",
    );
  return prisma.$transaction(
    async (tx) => {
      await activeLock(tx, user.id);
      const relationshipSide = await ticketResource(
        tx,
        ticketId,
        user.id,
        true,
      );
      const previous = await tx.supportParticipantChannel.findFirst({
        where: {
          ticketId,
          participantUserId: user.id,
          ticket: { requesterUserId: user.id },
        },
        select: channelSelect,
      });
      if (previous) {
        if (previous.relationshipSide !== relationshipSide)
          throw new TicketDenied(404, "Channel unavailable.");
        return { channel: previous, replayed: true };
      }
      return {
        channel: await tx.supportParticipantChannel.create({
          data: {
            id: randomUUID(),
            ticketId,
            participantUserId: user.id,
            relationshipSide,
            policyVersion: CHANNEL_POLICY,
          },
          select: channelSelect,
        }),
        replayed: false,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
export async function ownMessages(channelId: string, params: URLSearchParams) {
  const { user } = await context();
  let after;
  try {
    after = messageCursor(params);
  } catch {
    throw new TicketDenied(400, "Invalid message filter.");
  }
  return prisma.$transaction(
    async (tx) => {
      const channel = await channelResource(tx, channelId, user.id);
      const rows = await tx.supportMessage.findMany({
        where: {
          channelId,
          authorUserId: user.id,
          sequence: { gt: after },
          channel: {
            participantUserId: user.id,
            ticket: { requesterUserId: user.id },
          },
        },
        select: messageSelect,
        orderBy: { sequence: "asc" },
        take: 11,
      });
      const items = rows.slice(0, 10);
      return {
        channel,
        items,
        hasMore: rows.length > 10,
        nextAfter: items.at(-1)?.sequence ?? after,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function createOwnMessage(
  channelId: string,
  body: Record<string, unknown>,
) {
  const { config, user } = await context();
  let v;
  try {
    v = channelMessageInput(body);
  } catch {
    throw new TicketDenied(400, "Invalid requester test message.");
  }
  const hash = createHash("sha256").update(v.content).digest("hex");
  return prisma.$transaction(
    async (tx) => {
      await activeLock(tx, user.id);
      const channel = await channelResource(tx, channelId, user.id, true);
      const previous = await tx.supportMessage.findFirst({
        where: {
          channelId,
          requestKey: v.requestKey,
          authorUserId: user.id,
          channel: {
            participantUserId: user.id,
            ticket: { requesterUserId: user.id },
          },
        },
        select: { ...messageSelect, requestHash: true },
      });
      if (previous) {
        if (previous.requestHash !== hash)
          throw new TicketDenied(
            409,
            "Request key already used for different content.",
          );
        const { requestHash: _, ...message } = previous;
        void _;
        return { message, replayed: true };
      }
      const aggregate = await tx.supportMessage.aggregate({
        where: { channelId, authorUserId: user.id },
        _max: { sequence: true },
        _count: true,
      });
      if (aggregate._count >= config.messageLimit)
        throw new TicketDenied(
          429,
          "Development channel limit reached. No production message limit is approved.",
        );
      const message = await tx.supportMessage.create({
        data: {
          id: randomUUID(),
          channelId,
          ticketId: channel.ticketId,
          authorUserId: user.id,
          ...v,
          requestHash: hash,
          sequence: (aggregate._max.sequence ?? 0) + 1,
        },
        select: messageSelect,
      });
      return { message, replayed: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
export async function channelApi(
  request: Request,
  kind: "channel" | "messages",
  id: string,
) {
  let response: Response;
  try {
    const { config } = await context();
    if (
      request.headers.get("host") !== new URL(config.origin).host ||
      (request.headers.get("origin") !== null &&
        request.headers.get("origin") !== config.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.method === "POST" &&
        (request.headers.get("origin") !== config.origin ||
          request.headers.get("content-type") !== "application/json"))
    )
      throw new TicketDenied(403, "Request origin refused.");
    const params = new URL(request.url).searchParams;
    if ((kind === "channel" || request.method === "POST") && [...params].length)
      throw new TicketDenied(400, "Unknown channel filter.");
    if (request.method === "POST") {
      const body = await readJsonObject(request);
      if (!body) throw new TicketDenied(400, "Invalid JSON payload.");
      const result =
        kind === "channel"
          ? await createOwnChannel(id, body)
          : await createOwnMessage(id, body);
      response = Response.json(result, { status: result.replayed ? 200 : 201 });
    } else
      response = Response.json(
        kind === "channel"
          ? { channel: await ownChannel(id) }
          : await ownMessages(id, params),
      );
  } catch (e) {
    response =
      e instanceof TicketDenied
        ? apiError(e.message, e.status)
        : internalServerError("support_requester_channel_candidate", e);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
