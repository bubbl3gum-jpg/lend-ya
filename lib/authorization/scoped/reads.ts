import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { evaluateShadow, type PolicySnapshot } from "../policy";
import { capability } from "../registry";

export type Reference = Readonly<{ kind: string; id: string }>;
export class ScopedReadDenied extends Error {
  constructor() {
    super("Scoped shadow read denied");
    this.name = "ScopedReadDenied";
  }
}
/** Trusted server dependencies, NOT request DTOs. No production composition is
 * supplied. Synthetic fixtures exercise future reads without activating roles. */
export interface ShadowReadBoundary {
  snapshot(
    tx: Prisma.TransactionClient,
    credential: string | null,
    reference: Reference,
  ): Promise<PolicySnapshot>;
  now(): number;
  /** Must re-resolve authoritative session/epoch/scope outside the read snapshot
   * before release. Missing/stale/failed fence denies the whole result. */
  fence(
    credential: string | null,
    snapshots: readonly PolicySnapshot[],
  ): Promise<boolean>;
  /** Durable, attributable audit in the SAME transaction, never console logging.
   * No production sink exists yet; evidence therefore stays unavailable there. */
  audit?: (
    tx: Prisma.TransactionClient,
    event: Readonly<{
      personId: string;
      userId: number;
      authorizationVersion: number;
      policyVersion: string;
      resourceVersion: number;
      evidenceVersion: number;
      evidenceId: string | null;
      action: string;
      resource: Reference;
      caseId: string;
      purpose: string;
    }>,
  ) => Promise<void>;
}
const reads = {
  "bookings.read": {
    kind: "booking",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.booking.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, startAt: true, endAt: true },
        orderBy: { id: "asc" },
      }),
  },
  "listings.read": {
    kind: "listing",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.listing.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          status: true,
          category: true,
          adminRestricted: true,
        },
        orderBy: { id: "asc" },
      }),
  },
  "users.directory.read": {
    kind: "user",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, accountStatus: true, createdAt: true },
        orderBy: { id: "asc" },
      }),
  },
  "disputes.investigate": {
    kind: "dispute",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.dispute.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, createdAt: true },
        orderBy: { id: "asc" },
      }),
  },
  "listing_reports.review": {
    kind: "report",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.listingReport.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, createdAt: true },
        orderBy: { id: "asc" },
      }),
  },
  "chat_cases.evidence.read": {
    kind: "chat_case",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.chatModerationCase.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, category: true, version: true },
        orderBy: { id: "asc" },
      }),
  },
  "audit.read": {
    kind: "audit",
    query: (tx: Prisma.TransactionClient, ids: number[]) =>
      tx.adminAuditLog.findMany({
        where: { id: { in: ids } },
        select: { id: true, action: true, createdAt: true },
        orderBy: { id: "asc" },
      }),
  },
} as const;
export type ScopedReadAction = keyof typeof reads;

/** Parallel shadow-only services. No router, Server Action, runtime singleton or
 * exported permit constructor. Contexts are privately issued per transaction. */
export function createScopedShadowReads(
  db: PrismaClient,
  boundary: ShadowReadBoundary,
) {
  async function run<T>(
    credential: string | null,
    work: (
      tx: Prisma.TransactionClient,
      authorize: (
        action: string,
        ref: Reference,
        evidenceId?: string,
      ) => Promise<PolicySnapshot>,
    ) => Promise<T>,
  ) {
    return db.$transaction(
      async (tx) => {
        const used: { action: string; snapshot: PolicySnapshot }[] = [];
        const authorize = async (
          action: string,
          ref: Reference,
          evidenceId?: string,
        ) => {
          if (
            !capability(action) ||
            !/^[1-9][0-9]*$/.test(ref.id) ||
            !Number.isSafeInteger(Number(ref.id)) ||
            Number(ref.id) > 2147483647
          )
            throw new ScopedReadDenied();
          const snapshot = structuredClone(
            await boundary.snapshot(tx, credential, ref),
          );
          if (
            snapshot.resource?.kind !== ref.kind ||
            snapshot.resource.id !== ref.id ||
            evaluateShadow(action, snapshot, boundary.now()).candidate !==
              "MATCH"
          )
            throw new ScopedReadDenied();
          // An assigned investigator must never approve or independently review their
          // own investigation, even if their case grant otherwise matches.
          if (
            snapshot.resource.accessPurpose === "INDEPENDENT_REVIEW" &&
            snapshot.resource.investigatorPersonIds.includes(
              snapshot.membership!.personId,
            )
          )
            throw new ScopedReadDenied();
          const contract = capability(action)!;
          if (contract.evidence) {
            if (
              !boundary.audit ||
              !snapshot.resource.caseId ||
              !snapshot.resource.accessPurpose
            )
              throw new ScopedReadDenied();
            await boundary.audit(tx, {
              personId: snapshot.membership!.personId,
              userId: snapshot.session!.userId,
              authorizationVersion: snapshot.membership!.authorizationVersion,
              policyVersion: snapshot.membership!.policyVersion,
              resourceVersion: snapshot.resource.version,
              evidenceVersion: snapshot.resource.evidenceVersion,
              evidenceId: evidenceId ?? null,
              action,
              resource: { ...ref },
              caseId: snapshot.resource.caseId,
              purpose: snapshot.resource.accessPurpose,
            });
          }
          used.push({ action, snapshot });
          return snapshot;
        };
        const result = await work(tx, authorize);
        // Re-evaluate clocks and require a fresh authoritative fence. Fail closed if
        // revocation/expiry/assignment changes while data is being read or audited.
        if (
          used.some(
            ({ action, snapshot }) =>
              evaluateShadow(action, snapshot, boundary.now()).candidate !==
              "MATCH",
          ) ||
          !(await boundary.fence(
            credential,
            used.map((s) => s.snapshot),
          ))
        )
          throw new ScopedReadDenied();
        return {
          mode: "SHADOW_ONLY" as const,
          readyForActivation: false as const,
          data: result,
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 10000 },
    );
  }
  async function directory(
    credential: string | null,
    action: string,
    ids: readonly string[],
    options: { offset?: number; limit?: number } = {},
  ) {
    if (
      !Object.hasOwn(reads, action) ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      !Number.isInteger(options.offset ?? 0) ||
      (options.offset ?? 0) < 0 ||
      !Number.isInteger(options.limit ?? 25) ||
      (options.limit ?? 25) < 1 ||
      (options.limit ?? 25) > 100
    )
      throw new ScopedReadDenied();
    const spec = reads[action as ScopedReadAction];
    return run(credential, async (tx, authorize) => {
      // All requested IDs must be authorized before any domain query. A denied ID
      // yields the same generic error whether it exists or not; no partial counts.
      const unique = [...new Set(ids)];
      for (const id of unique) await authorize(action, { kind: spec.kind, id });
      const rows = await spec.query(tx, unique.map(Number));
      return {
        totalInAuthorizedSelection: rows.length,
        rows: rows.slice(
          options.offset ?? 0,
          (options.offset ?? 0) + (options.limit ?? 25),
        ),
      };
    });
  }
  return Object.freeze({
    directory,
    detail: (credential: string | null, action: string, id: string) =>
      directory(credential, action, [id], { limit: 1 }),
    async overview(credential: string | null, bookingIds: readonly string[]) {
      // Never platform-wide totals: only exact authorized booking selection.
      const result = await directory(credential, "bookings.read", bookingIds, {
        limit: 100,
      });
      const rows = result.data.rows as { status: string }[];
      return {
        ...result,
        data: {
          scope: "EXACT_BOOKING_SELECTION",
          bookings: result.data.totalInAuthorizedSelection,
          inUseStatus: rows.filter((r) => r.status === "IN_USE").length,
        },
      };
    },
    async listingMediaMetadata(credential: string | null, listingId: string) {
      return run(credential, async (tx, authorize) => {
        await authorize("listings.read", { kind: "listing", id: listingId });
        // No URL/path/bytes: metadata does not authorize the legacy file transport.
        return tx.listingMedia.findMany({
          where: { listingId: Number(listingId) },
          select: { id: true, mimeType: true, kind: true },
          orderBy: { id: "asc" },
          take: 100,
        });
      });
    },
    async rentalEvidence(
      credential: string | null,
      disputeId: string,
      photoId: string,
    ) {
      if (!/^[a-f0-9-]{36}$/i.test(photoId)) throw new ScopedReadDenied();
      return run(credential, async (tx, authorize) => {
        await authorize(
          "evidence.rental_case.read",
          {
            kind: "dispute",
            id: disputeId,
          },
          photoId,
        );
        const dispute = await tx.dispute.findUnique({
          where: { id: Number(disputeId) },
          select: { bookingId: true },
        });
        if (!dispute) throw new ScopedReadDenied();
        const photo = await tx.bookingEvidencePhoto.findFirst({
          where: { id: photoId, bookingId: dispute.bookingId },
          select: { id: true, mimeType: true, data: true },
        });
        if (!photo) throw new ScopedReadDenied();
        return photo;
      });
    },
    // No support conversations, generic bytes/file reader or operational actions.
  });
}
