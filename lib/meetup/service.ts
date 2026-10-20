import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { Prisma, Booking, MeetupChallenge } from "@prisma/client";
import { prisma } from "../prisma";
import { RentalError } from "../rental-errors";
import {
  previewParticipant,
  secret,
  ttlSeconds,
  checkInTtlSeconds,
  confirmationTtlSeconds,
} from "./config";
import {
  evaluateLocation,
  locationSettings,
  LOCATION_POLICY,
} from "./location";
export type Purpose = "PICKUP" | "RETURN";
type Tx = Prisma.TransactionClient;
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const keyed = (s: string) =>
  createHmac("sha256", secret()).update(s).digest("hex");
export function purpose(value: unknown): Purpose {
  if (value !== "PICKUP" && value !== "RETURN")
    throw new RentalError("Choose PICKUP or RETURN.", 400);
  return value;
}
export function requestKey(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(value))
    throw new RentalError("Provide a stable requestKey for retries.", 400);
  return value;
}
export function fields(body: Record<string, unknown>, names: string[]) {
  if (Object.keys(body).some((k) => !names.includes(k)))
    throw new RentalError("Unexpected verification field.", 400);
}
export async function meetupEvent(
  tx: Tx,
  bookingId: number,
  actorId: number,
  p: Purpose,
  kind: string,
  challengeId?: string,
) {
  await tx.meetupEvent.create({
    data: { bookingId, actorId, purpose: p, kind, challengeId },
  });
}
async function locked(tx: Tx, id: number, userId: number) {
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${id} FOR UPDATE`;
  const b = await tx.booking.findUnique({
    where: { id },
    include: {
      meetup: true,
      handoff: true,
      return: true,
      meetingStation: true,
      disputes: { where: { status: "OPEN" }, take: 1 },
    },
  });
  if (!b) throw new RentalError("Booking not found.", 404);
  if (userId !== b.ownerId && userId !== b.renterId)
    throw new RentalError("Participants only.", 403);
  return b;
}
type RecordBooking = Awaited<ReturnType<typeof locked>>;
function eligible(b: RecordBooking, p: Purpose) {
  if (!b.meetup)
    throw new RentalError(
      "This booking has not opted into the isolated meetup preview.",
      409,
    );
  if (
    b.disputes.length ||
    ![
      ...(p === "PICKUP"
        ? ["CONFIRMED", "HANDOFF_PENDING"]
        : ["IN_USE", "RETURN_PENDING"]),
    ].includes(b.status)
  )
    throw new RentalError(
      "This rental stage is not eligible for meetup verification. Use the dispute or Customer Service workflow.",
      409,
    );
}
async function limit(
  tx: Tx,
  bid: number,
  uid: number,
  p: Purpose,
  action: string,
  max: number,
  seconds: number,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000)),
    key = `${bid}:${uid}:${p}:${action}:${bucket}`;
  const row = await tx.meetupRate.upsert({
    where: { key },
    create: {
      key,
      bookingId: bid,
      attempts: 1,
      expiresAt: new Date((bucket + 1) * seconds * 1000),
    },
    update: { attempts: { increment: 1 } },
  });
  return row.attempts <= max;
}
async function latestChecks(
  tx: Tx,
  b: Pick<Booking, "id" | "ownerId" | "renterId">,
  p: Purpose,
) {
  const owner = await tx.meetupCheckIn.findFirst({
    where: { bookingId: b.id, userId: b.ownerId, purpose: p },
    orderBy: { id: "desc" },
  });
  const borrower = await tx.meetupCheckIn.findFirst({
    where: { bookingId: b.id, userId: b.renterId, purpose: p },
    orderBy: { id: "desc" },
  });
  return { owner, borrower };
}
async function arrivals(
  tx: Tx,
  b: Pick<Booking, "id" | "ownerId" | "renterId">,
  p: Purpose,
) {
  const { owner, borrower } = await latestChecks(tx, b, p),
    now = new Date();
  if (
    !owner ||
    !borrower ||
    owner.expiresAt <= now ||
    borrower.expiresAt <= now
  )
    throw new RentalError(
      "Both participants need fresh check-ins for this stage.",
    );
  if (owner.outcome === "VERIFIED" && borrower.outcome === "VERIFIED")
    return { owner, borrower, fallback: null };
  if ([owner, borrower].some((c) => c.outcome === "OUTSIDE"))
    throw new RentalError(
      "A participant is outside the accepted area. Check the agreed station or request assistance.",
    );
  const fallback = await tx.meetupFallback.findUnique({
    where: {
      bookingId_purpose_ownerCheckId_borrowerCheckId: {
        bookingId: b.id,
        purpose: p,
        ownerCheckId: owner.id,
        borrowerCheckId: borrower.id,
      },
    },
  });
  if (
    !fallback?.ownerAckAt ||
    !fallback.borrowerAckAt ||
    fallback.expiresAt <= now
  )
    throw new RentalError(
      "Location is not verified. Both participants must explicitly acknowledge reduced assurance with a reason.",
    );
  return { owner, borrower, fallback };
}
export async function enroll(id: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    if (b.meetup) return { enabled: true };
    if (
      userId !== b.ownerId ||
      !previewParticipant(b.ownerId) ||
      !previewParticipant(b.renterId)
    )
      throw new RentalError(
        "Both participants must have explicit server-side preview access; only the owner can enroll.",
        403,
      );
    if (b.status !== "CONFIRMED" || b.handoff || b.disputes.length)
      throw new RentalError("Opt in only before an owner handoff is recorded.");
    secret();
    ttlSeconds();
    checkInTtlSeconds();
    locationSettings(b.meetingStation.canonicalId ?? "");
    await tx.meetupSession.create({
      data: { bookingId: id, enabledBy: userId },
    });
    await meetupEvent(tx, id, userId, "PICKUP", "PREVIEW_ENROLLED");
    return { enabled: true };
  });
}
export async function checkIn(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, [
    "purpose",
    "requestKey",
    "mode",
    "latitude",
    "longitude",
    "accuracy",
    "timestamp",
    "reason",
  ]);
  const p = purpose(body.purpose),
    key = requestKey(body.requestKey);
  const fingerprint = keyed(
    JSON.stringify({
      p,
      mode: body.mode,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      timestamp: body.timestamp,
      reason: body.reason,
    }),
  );
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    eligible(b, p);
    const old = await tx.meetupCheckIn.findUnique({
      where: {
        bookingId_userId_purpose_requestKey: {
          bookingId: id,
          userId,
          purpose: p,
          requestKey: key,
        },
      },
    });
    if (old) {
      if (old.requestHash !== fingerprint)
        throw new RentalError("Retry key belongs to different check-in data.");
      return {
        checkIn: {
          id: old.id,
          outcome: old.outcome,
          reason: old.reason,
          expiresAt: old.expiresAt,
        },
        replayed: true,
      };
    }
    if (!(await limit(tx, id, userId, p, "checkin", 5, 60)))
      return {
        failure: "Too many check-ins. Try again after the rate window.",
        status: 429,
      };
    let result: {
      outcome: string;
      reason: string;
      accuracyMeters: number | null;
      distanceBand: number | null;
    };
    if (body.mode === "unavailable") {
      if (
        !["DENIED", "TIMEOUT", "UNSUPPORTED", "UNAVAILABLE"].includes(
          String(body.reason),
        ) ||
        [body.latitude, body.longitude, body.accuracy, body.timestamp].some(
          (v) => v !== undefined,
        )
      )
        throw new RentalError(
          "Choose a supported unavailable-location reason without coordinates.",
          400,
        );
      result = {
        outcome: "UNAVAILABLE",
        reason: String(body.reason),
        accuracyMeters: null,
        distanceBand: null,
      };
    } else if (body.mode === "location") {
      if (
        ![body.latitude, body.longitude, body.accuracy, body.timestamp].every(
          (v) => typeof v === "number",
        ) ||
        body.reason !== undefined
      )
        throw new RentalError(
          "Provide numeric position, accuracy and sample timestamp.",
          400,
        );
      try {
        result = evaluateLocation(b.meetingStation.canonicalId ?? "", {
          latitude: body.latitude as number,
          longitude: body.longitude as number,
          accuracy: body.accuracy as number,
          timestamp: body.timestamp as number,
        });
      } catch {
        throw new RentalError(
          "Invalid/stale location reading. Request a fresh browser reading.",
          400,
        );
      }
    } else
      throw new RentalError(
        "Choose browser location or unavailable location.",
        400,
      );
    const check = await tx.meetupCheckIn.create({
      data: {
        bookingId: id,
        userId,
        purpose: p,
        role: userId === b.ownerId ? "OWNER" : "BORROWER",
        ...result,
        policyVersion: LOCATION_POLICY,
        requestKey: key,
        requestHash: fingerprint,
        expiresAt: new Date(Date.now() + 1000 * checkInTtlSeconds()),
      },
    });
    await meetupEvent(tx, id, userId, p, `CHECKIN_${result.outcome}`);
    return {
      checkIn: {
        id: check.id,
        outcome: check.outcome,
        reason: check.reason,
        expiresAt: check.expiresAt,
      },
      replayed: false,
    };
  });
}
export async function acknowledgeFallback(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, ["purpose", "reason", "acknowledged"]);
  const p = purpose(body.purpose);
  if (
    body.acknowledged !== true ||
    typeof body.reason !== "string" ||
    body.reason.trim().length < 5 ||
    body.reason.length > 500 ||
    /[\u0000-\u001f]/.test(body.reason)
  )
    throw new RentalError(
      "Explicitly acknowledge reduced assurance and give a reason (5–500 characters).",
      400,
    );
  const reason = body.reason.trim();
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    eligible(b, p);
    const { owner, borrower } = await latestChecks(tx, b, p),
      now = new Date();
    if (
      !owner ||
      !borrower ||
      owner.expiresAt <= now ||
      borrower.expiresAt <= now ||
      [owner, borrower].some((c) => c.outcome === "OUTSIDE") ||
      ![owner, borrower].some((c) =>
        ["UNAVAILABLE", "INACCURATE"].includes(c.outcome),
      )
    )
      throw new RentalError(
        "Fresh checks from both participants and unavailable/inaccurate location are required. Outside-area readings need a new check or assistance.",
      );
    const where = {
      bookingId_purpose_ownerCheckId_borrowerCheckId: {
        bookingId: id,
        purpose: p,
        ownerCheckId: owner.id,
        borrowerCheckId: borrower.id,
      },
    };
    const record = await tx.meetupFallback.upsert({
      where,
      update: {},
      create: {
        bookingId: id,
        purpose: p,
        ownerCheckId: owner.id,
        borrowerCheckId: borrower.id,
        expiresAt: new Date(
          Math.min(owner.expiresAt.getTime(), borrower.expiresAt.getTime()),
        ),
      },
    });
    const isOwner = userId === b.ownerId,
      previous = isOwner ? record.ownerReason : record.borrowerReason;
    if (previous) {
      if (previous !== reason)
        throw new RentalError(
          "This acknowledgement is immutable; refresh to see the saved reason.",
        );
      return { fallback: record, replayed: true };
    }
    const fallback = await tx.meetupFallback.update({
      where: { id: record.id },
      data: isOwner
        ? { ownerReason: reason, ownerAckAt: now }
        : { borrowerReason: reason, borrowerAckAt: now },
    });
    await meetupEvent(tx, id, userId, p, "REDUCED_ASSURANCE_ACK");
    return { fallback };
  });
}
export async function issue(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, ["purpose", "requestKey"]);
  const p = purpose(body.purpose),
    key = requestKey(body.requestKey);
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    eligible(b, p);
    confirmationTtlSeconds();
    const issuer = p === "PICKUP" ? b.ownerId : b.renterId,
      verifier = p === "PICKUP" ? b.renterId : b.ownerId;
    if (userId !== issuer)
      throw new RentalError(
        "Only the issuing participant may generate this stage's challenge.",
        403,
      );
    const old = await tx.meetupChallenge.findUnique({
      where: {
        bookingId_purpose_issueKey: {
          bookingId: id,
          purpose: p,
          issueKey: key,
        },
      },
    });
    if (old)
      return {
        challengeId: old.id,
        expiresAt: old.expiresAt,
        replayed: true,
        secretUnavailable: true,
        message:
          "Challenge already issued; secrets are not stored. Explicitly renew with a new request key if the original response was lost.",
      };
    if (
      p === "PICKUP"
        ? b.status !== "HANDOFF_PENDING" ||
          !b.handoff?.ownerConditionConfirmed ||
          b.handoff.performedBy !== b.ownerId
        : b.status !== "RETURN_PENDING" ||
          !b.return?.returnConfirmed ||
          b.return.initiatedBy !== b.renterId
    )
      throw new RentalError(
        "The issuing participant must first save the stage's condition checklist and acknowledgement.",
      );
    const checks = await arrivals(tx, b, p);
    if (!(await limit(tx, id, userId, p, "issue", 5, 60)))
      return {
        failure: "Too many renewals. Try again after the rate window.",
        status: 429,
      };
    const now = new Date(),
      challengeId = randomUUID(),
      token = randomBytes(32).toString("hex"),
      code = String(randomInt(0, 1000000)).padStart(6, "0");
    await tx.meetupChallenge.updateMany({
      where: { bookingId: id, purpose: p, revokedAt: null, completedAt: null },
      data: { revokedAt: now },
    });
    const expiresAt = new Date(
      Math.min(
        Date.now() + ttlSeconds() * 1000,
        checks.owner.expiresAt.getTime(),
        checks.borrower.expiresAt.getTime(),
      ),
    );
    await tx.meetupChallenge.create({
      data: {
        id: challengeId,
        bookingId: id,
        purpose: p,
        issuerId: issuer,
        issueKey: key,
        verifierId: verifier,
        bookingState: b.status,
        bookingVersion: b.meetup!.bookingVersion,
        bookingUpdatedAt: b.updatedAt,
        ownerCheckId: checks.owner.id,
        borrowerCheckId: checks.borrower.id,
        fallbackId: checks.fallback?.id,
        tokenHash: digest(token),
        codeHash: keyed(`${challengeId}:${id}:${p}:${code}`),
        expiresAt,
      },
    });
    await meetupEvent(tx, id, userId, p, "CHALLENGE_ISSUED", challengeId);
    return {
      challengeId,
      expiresAt,
      qrPayload: `HUSTLEN1:${id}:${p}:${challengeId}:${token}`,
      manualCode: code,
      assurance: checks.fallback
        ? "REDUCED_LOCATION_UNVERIFIED"
        : "LOCATION_SUPPORTING_SIGNAL",
    };
  });
}
function secureEqual(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
async function validChallenge(
  tx: Tx,
  b: RecordBooking,
  c: MeetupChallenge,
  p: Purpose,
) {
  eligible(b, p);
  if (
    c.bookingId !== b.id ||
    c.purpose !== p ||
    c.bookingState !== b.status ||
    c.bookingVersion !== b.meetup?.bookingVersion ||
    c.bookingUpdatedAt.getTime() !== b.updatedAt.getTime() ||
    c.revokedAt ||
    (c.consumedAt
      ? !c.confirmationExpiresAt || c.confirmationExpiresAt <= new Date()
      : c.expiresAt <= new Date()) ||
    c.completedAt
  )
    throw new RentalError(
      "Challenge expired, replaced or no longer eligible. Ask for a new challenge.",
    );
  // Successful redemption snapshots fresh arrival assurance. Its later time expiry
  // must not shorten the independent confirmation window. New readings still revoke it.
  const a = c.consumedAt
    ? { ...(await latestChecks(tx, b, p)), fallback: null }
    : await arrivals(tx, b, p);
  if (
    a.owner?.id !== c.ownerCheckId ||
    a.borrower?.id !== c.borrowerCheckId ||
    (!c.consumedAt && (a.fallback?.id ?? null) !== c.fallbackId) ||
    c.issuerId !== (p === "PICKUP" ? b.ownerId : b.renterId) ||
    c.verifierId !== (p === "PICKUP" ? b.renterId : b.ownerId)
  )
    throw new RentalError(
      "Arrival verification changed. Generate a new challenge.",
    );
}
export async function verify(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, [
    "purpose",
    "challengeId",
    "qrPayload",
    "manualCode",
    "requestKey",
  ]);
  const p = purpose(body.purpose),
    key = requestKey(body.requestKey);
  if (
    typeof body.challengeId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(body.challengeId)
  )
    throw new RentalError(
      "Provide a valid challenge ID from the same booking.",
      400,
    );
  if ((body.qrPayload === undefined) === (body.manualCode === undefined))
    throw new RentalError("Provide either a QR payload or a manual code.", 400);
  if (
    (body.qrPayload !== undefined &&
      (typeof body.qrPayload !== "string" || body.qrPayload.length > 180)) ||
    (body.manualCode !== undefined &&
      (typeof body.manualCode !== "string" || body.manualCode.length > 32))
  )
    throw new RentalError("Invalid verification input.", 400);
  const fingerprint = keyed(
    JSON.stringify({
      p,
      id: body.challengeId,
      qr: body.qrPayload,
      code: body.manualCode,
    }),
  );
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    eligible(b, p);
    const c = await tx.meetupChallenge.findUnique({
      where: { id: body.challengeId as string },
    });
    if (!c || c.bookingId !== id || c.purpose !== p)
      throw new RentalError(
        "Challenge does not match this booking/stage.",
        404,
      );
    if (c.verifierId !== userId) {
      await meetupEvent(tx, id, userId, p, "VERIFY_WRONG_PARTICIPANT", c.id);
      return {
        failure: "Only the intended participant can verify this challenge.",
        status: 403,
      };
    }
    await validChallenge(tx, b, c, p);
    if (c.consumedAt) {
      if (c.verificationKey === key && c.verificationHash === fingerprint)
        return {
          verified: true,
          challengeId: c.id,
          replayed: true,
          confirmationExpiresAt: c.confirmationExpiresAt,
          itemTitle: (
            await tx.listing.findUniqueOrThrow({
              where: { id: b.listingId },
              select: { title: true },
            })
          ).title,
        };
      throw new RentalError(
        "Challenge was already consumed. Resume the saved acknowledgement or refresh.",
      );
    }
    if (
      c.attempts >= 5 ||
      !(await limit(tx, id, userId, p, "verify", 10, 900))
    ) {
      await meetupEvent(tx, id, userId, p, "VERIFY_RATE_LIMIT", c.id);
      return {
        failure:
          "Verification attempt limit reached. Request assistance or wait for the rate window.",
        status: 429,
      };
    }
    const parts =
      typeof body.qrPayload === "string" ? body.qrPayload.split(":") : null;
    const correct = parts
      ? parts.length === 5 &&
        parts[0] === "HUSTLEN1" &&
        parts[1] === String(id) &&
        parts[2] === p &&
        parts[3] === c.id &&
        /^[a-f0-9]{64}$/.test(parts[4]) &&
        secureEqual(digest(parts[4]), c.tokenHash)
      : secureEqual(keyed(`${c.id}:${id}:${p}:${body.manualCode}`), c.codeHash);
    if (!correct) {
      await tx.meetupChallenge.update({
        where: { id: c.id },
        data: { attempts: { increment: 1 } },
      });
      await meetupEvent(tx, id, userId, p, "VERIFY_SECRET_FAILED", c.id);
      return { failure: "Code or QR could not be verified.", status: 400 };
    }
    const consumedAt = new Date();
    const confirmationExpiresAt = new Date(
      consumedAt.getTime() + confirmationTtlSeconds() * 1000,
    );
    const changed = await tx.meetupChallenge.updateMany({
      where: {
        id: c.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        consumedAt,
        confirmationExpiresAt,
        verificationKey: key,
        verificationHash: fingerprint,
      },
    });
    if (changed.count !== 1)
      throw new RentalError("Challenge changed. Refresh before retrying.");
    await meetupEvent(tx, id, userId, p, "CHALLENGE_VERIFIED", c.id);
    const item = await tx.listing.findUniqueOrThrow({
      where: { id: b.listingId },
      select: { title: true },
    });
    return {
      verified: true,
      challengeId: c.id,
      itemTitle: item.title,
      bookingId: id,
      purpose: p,
      confirmationExpiresAt,
      requiresPhysicalAcknowledgement: true,
    };
  });
}
export async function status(id: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    if (!b.meetup)
      return {
        enabled: false,
        canEnroll:
          userId === b.ownerId &&
          b.status === "CONFIRMED" &&
          previewParticipant(b.ownerId) &&
          previewParticipant(b.renterId),
      };
    const p: Purpose = ["CONFIRMED", "HANDOFF_PENDING"].includes(b.status)
        ? "PICKUP"
        : "RETURN",
      checks = await latestChecks(tx, b, p);
    const fallback =
      checks.owner && checks.borrower
        ? await tx.meetupFallback.findUnique({
            where: {
              bookingId_purpose_ownerCheckId_borrowerCheckId: {
                bookingId: id,
                purpose: p,
                ownerCheckId: checks.owner.id,
                borrowerCheckId: checks.borrower.id,
              },
            },
          })
        : null;
    const c = await tx.meetupChallenge.findFirst({
      where: { bookingId: id, purpose: p, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    let confirmationEligible = false;
    if (c?.consumedAt) {
      try {
        await validChallenge(tx, b, c, p);
        confirmationEligible = true;
      } catch (error) {
        if (!(error instanceof RentalError)) throw error;
      }
    }
    const checkDto = (r: typeof checks.owner) =>
      r
        ? {
            id: r.id,
            userId: r.userId,
            outcome: r.outcome,
            reason: r.reason,
            expiresAt: r.expiresAt,
          }
        : null;
    return {
      enabled: true,
      purpose: p,
      bookingStatus: b.status,
      station: {
        name: b.meetingStation.name,
        canonicalId: b.meetingStation.canonicalId,
        ...locationSettings(b.meetingStation.canonicalId ?? ""),
      },
      checks: {
        owner: checkDto(checks.owner),
        borrower: checkDto(checks.borrower),
      },
      fallback: fallback
        ? {
            ownerAckAt: fallback.ownerAckAt,
            borrowerAckAt: fallback.borrowerAckAt,
            ownerReason: fallback.ownerReason,
            borrowerReason: fallback.borrowerReason,
            expiresAt: fallback.expiresAt,
          }
        : null,
      challenge: c
        ? {
            id: c.id,
            expiresAt: c.expiresAt,
            consumedAt: c.consumedAt,
            confirmationExpiresAt: c.confirmationExpiresAt,
            confirmationEligible,
            completedAt: c.completedAt,
            verifierId: c.verifierId,
          }
        : null,
    };
  });
}
/** Called inside the existing authoritative lifecycle transaction after its Booking lock. */
export async function requireMeetupReceipt(
  tx: Tx,
  b: Booking,
  userId: number,
  p: Purpose,
  submission: { meetupChallengeId?: string; physicalReceipt?: boolean },
  completionHash: string,
) {
  const session = await tx.meetupSession.findUnique({
    where: { bookingId: b.id },
  });
  if (!session) return null;
  if (!submission.physicalReceipt || !submission.meetupChallengeId)
    throw new RentalError(
      "Verify the stage challenge and explicitly acknowledge physical receipt; condition evidence remains mandatory.",
    );
  const c = await tx.meetupChallenge.findUnique({
    where: { id: submission.meetupChallengeId },
  });
  if (!c || c.verifierId !== userId || !c.consumedAt)
    throw new RentalError(
      "The intended participant must first verify this booking's challenge.",
    );
  const full = await tx.booking.findUniqueOrThrow({
    where: { id: b.id },
    include: {
      meetup: true,
      handoff: true,
      return: true,
      meetingStation: true,
      disputes: { where: { status: "OPEN" }, take: 1 },
    },
  });
  await validChallenge(tx, full, c, p);
  await tx.meetupChallenge.update({
    where: { id: c.id },
    data: { completedAt: new Date(), completionHash },
  });
  await meetupEvent(tx, b.id, userId, p, "PHYSICAL_RECEIPT_ACK", c.id);
  return c;
}
export async function replayReceipt(
  tx: Tx,
  b: Booking,
  userId: number,
  p: Purpose,
  challengeId: string | undefined,
  completionHash: string,
) {
  if (!challengeId) return false;
  const c = await tx.meetupChallenge.findUnique({ where: { id: challengeId } });
  if (!c?.completedAt) return false;
  if (
    c.bookingId !== b.id ||
    c.purpose !== p ||
    c.verifierId !== userId ||
    c.completionHash !== completionHash ||
    b.status !== (p === "PICKUP" ? "IN_USE" : "INSPECTION")
  )
    throw new RentalError(
      "This receipt belongs to a completed or changed operation. Refresh the booking.",
    );
  return true;
}
export async function receiveReturn(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, ["action", "meetupChallengeId", "physicalReceipt"]);
  if (
    typeof body.meetupChallengeId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(body.meetupChallengeId) ||
    body.physicalReceipt !== true
  )
    throw new RentalError(
      "Verify the return challenge and explicitly acknowledge physical receipt.",
      400,
    );
  const hash = digest(
    JSON.stringify({
      challengeId: body.meetupChallengeId,
      physicalReceipt: true,
      action: "inspect",
    }),
  );
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    if (userId !== b.ownerId)
      throw new RentalError(
        "Only the owner may acknowledge physical return.",
        403,
      );
    if (
      await replayReceipt(
        tx,
        b,
        userId,
        "RETURN",
        body.meetupChallengeId as string,
        hash,
      )
    )
      return { status: b.status, replayed: true };
    eligible(b, "RETURN");
    if (
      b.status !== "RETURN_PENDING" ||
      !b.return?.returnConfirmed ||
      b.return.initiatedBy !== b.renterId ||
      !b.handoff?.conditionConfirmed ||
      !b.handoff.ownerConditionConfirmed ||
      b.handoff.performedBy !== b.ownerId ||
      b.handoff.confirmedBy !== b.renterId
    )
      throw new RentalError(
        "A valid borrower return and bilateral pickup are required.",
      );
    await requireMeetupReceipt(
      tx,
      b,
      userId,
      "RETURN",
      body as { meetupChallengeId: string; physicalReceipt: true },
      hash,
    );
    await tx.booking.update({ where: { id }, data: { status: "INSPECTION" } });
    return {
      status: "INSPECTION",
      physicalReceiptRecorded: true,
      inspectionRequired: true,
    };
  });
}
/** Reuse the existing scoped coordination-case intake even when free-text chat/GPS is unavailable. */
export async function assistance(
  id: number,
  userId: number,
  body: Record<string, unknown>,
) {
  fields(body, ["reason"]);
  if (
    typeof body.reason !== "string" ||
    ![
      "LOCATION_PROBLEM",
      "CHALLENGE_PROBLEM",
      "MEETUP_PROBLEM",
      "SAFETY_CONCERN",
    ].includes(body.reason)
  )
    throw new RentalError("Choose a structured assistance reason.", 400);
  const reason = body.reason;
  return prisma.$transaction(async (tx) => {
    const b = await locked(tx, id, userId);
    if (!b.meetup)
      throw new RentalError("Meetup preview is not enrolled for this booking.");
    const dedupKey = `meetup-support:${id}:${userId}:${Math.floor(Date.now() / 86400000)}`;
    const previous = await tx.chatModerationCase.findUnique({
      where: { dedupKey },
    });
    if (previous) return { caseId: previous.id, replayed: true };
    if (!(await limit(tx, id, userId, "RETURN", "assistance", 3, 86400)))
      return {
        failure:
          "Assistance request limit reached for this booking; your existing case remains available.",
        status: 429,
      };
    const conversation = await tx.conversation.upsert({
      where: {
        listingId_ownerId_borrowerId: {
          listingId: b.listingId,
          ownerId: b.ownerId,
          borrowerId: b.renterId,
        },
      },
      update: {},
      create: {
        listingId: b.listingId,
        ownerId: b.ownerId,
        borrowerId: b.renterId,
        participants: {
          create: [{ userId: b.ownerId }, { userId: b.renterId }],
        },
      },
    });
    const record = await tx.chatModerationCase.create({
      data: {
        conversationId: conversation.id,
        targetUserId: userId,
        reporterId: userId,
        kind: "COORDINATION",
        category: "RENTAL_SUPPORT",
        reportReason: reason,
        evidence: { bookingId: id, messages: [] },
        dedupKey,
      },
    });
    await tx.chatOutboxEvent.create({
      data: {
        kind: "COORDINATION_REQUEST",
        dedupKey,
        payload: { caseId: record.id, bookingId: id },
      },
    });
    await meetupEvent(
      tx,
      id,
      userId,
      ["CONFIRMED", "HANDOFF_PENDING"].includes(b.status) ? "PICKUP" : "RETURN",
      "ASSISTANCE_REQUESTED",
    );
    return {
      caseId: record.id,
      message:
        "Coordination case recorded for authorized human review. No rental state changed; email/live support is not available.",
    };
  });
}
