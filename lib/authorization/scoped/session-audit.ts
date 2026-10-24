import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { capability, POLICY_VERSION } from "../registry";
import { disposableDatabaseUrl } from "../../disposable-database-url";
import { logOperationalError } from "../../operational-error";

const readActions = new Set([
  "bookings.read",
  "listings.read",
  "users.directory.read",
  "disputes.investigate",
  "listing_reports.review",
  "chat_cases.evidence.read",
  "audit.read",
  "evidence.rental_case.read",
]);
export type PendingReadRequest = Readonly<{
  action: unknown;
  resourceId: unknown;
  caseId?: unknown;
  evidenceId?: unknown;
}>;
type Selection = Readonly<{
  action: string;
  resourceKind: string;
  resourceId: string | null;
  caseId: string | null;
  evidenceId: string | null;
}>;
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const id = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[1-9][0-9]{0,9}$/.test(value) &&
  Number(value) <= 2147483647;
function selection(request: PendingReadRequest): Selection {
  const entry = capability(request.action);
  if (
    !entry ||
    !readActions.has(entry.action) ||
    !id(request.resourceId) ||
    (request.caseId !== undefined &&
      !id(request.caseId) &&
      !uuid(request.caseId)) ||
    (request.evidenceId !== undefined && !uuid(request.evidenceId))
  )
    return {
      action: "security.unknown_action",
      resourceKind: "UNKNOWN",
      resourceId: null,
      caseId: null,
      evidenceId: null,
    };
  return {
    action: entry.action,
    resourceKind: entry.resource,
    resourceId: request.resourceId,
    caseId: request.caseId ?? null,
    evidenceId: request.evidenceId ?? null,
  };
}
export class PendingStaffDenied extends Error {
  constructor() {
    super("Pending staff access denied");
    this.name = "PendingStaffDenied";
  }
}

async function load(
  tx: Prisma.TransactionClient,
  token: string | null,
  attributionOnly = false,
) {
  if (typeof token !== "string" || !token || token.length > 256) return null;
  const session = await tx.authSession.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { accountStatus: true } },
    },
  });
  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    (!attributionOnly && session.user.accountStatus !== "ACTIVE")
  )
    return null;
  const binding = await tx.staffSessionBinding.findFirst({
    where: {
      authSessionId: session.id,
      ...(attributionOnly ? {} : { state: "PENDING" as const }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      stepUp: true,
      membership: { include: { grants: true } },
      association: {
        include: {
          person: {
            include: {
              authorization: true,
              memberships: {
                where: { state: { in: ["DRAFT", "ACTIVE", "SUSPENDED"] } },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  if (
    !binding ||
    binding.authSessionCreatedAt.getTime() !== session.createdAt.getTime()
  )
    return null;
  const { association, stepUp, membership } = binding,
    epoch = association.person.authorization,
    now = Date.now();
  // Attribution is not authority: an authenticated account can be linked to a
  // denied attempt after its membership, grant, step-up or binding is revoked.
  if (attributionOnly) {
    if (
      association.userId !== session.userId ||
      association.state !== "VERIFIED" ||
      !association.verifiedAt ||
      association.person.verification !== "VERIFIED" ||
      !epoch
    )
      return null;
    return {
      session,
      binding,
      personId: association.personId,
      epoch: epoch.version,
    };
  }
  if (
    association.userId !== session.userId ||
    association.state !== "VERIFIED" ||
    !association.verifiedAt ||
    association.person.verification !== "VERIFIED" ||
    membership.personId !== association.personId ||
    membership.state !== "DRAFT" ||
    association.person.memberships.length !== 1 ||
    association.person.memberships[0].id !== membership.id ||
    !epoch ||
    epoch.version !== binding.authorizationVersion ||
    epoch.policyVersion !== POLICY_VERSION ||
    binding.policyVersion !== POLICY_VERSION ||
    membership.policyVersion !== POLICY_VERSION ||
    membership.validFrom.getTime() > now ||
    membership.expiresAt.getTime() <= now ||
    binding.expiresAt.getTime() <= now ||
    stepUp.state !== "PENDING" ||
    stepUp.associationId !== association.id ||
    stepUp.authSessionId !== session.id ||
    stepUp.authSessionCreatedAt.getTime() !== session.createdAt.getTime() ||
    stepUp.assurance !== "MFA" ||
    stepUp.authenticatedAt.getTime() > now ||
    stepUp.expiresAt.getTime() <= now
  )
    return null;
  return {
    session,
    binding,
    personId: association.personId,
    epoch: epoch.version,
  };
}
type PendingActor = NonNullable<Awaited<ReturnType<typeof load>>>;
/** Only server-installed fixture/domain adapters may supply this dependency.
 * It must resolve/lock actual assignment, aliases, conflicts and evidence versions.
 * No production implementation or authorization context issuer exists. */
export interface PendingShadowDomain {
  check(
    tx: Prisma.TransactionClient,
    actor: Readonly<{ personId: string; userId: number }>,
    selection: Readonly<Selection>,
  ): Promise<boolean>;
}
function grantFor(actor: PendingActor, target: Selection) {
  const entry = capability(target.action),
    now = Date.now();
  if (
    !entry ||
    entry.blockedPolicy ||
    !entry.roles.includes(actor.binding.membership.role)
  )
    return null;
  const needsCase =
    entry.scope === "ASSIGNED_CASE" ||
    entry.scope === "PRIVATE_CHANNEL" ||
    (entry.action === "bookings.read" &&
      actor.binding.membership.role !== "OPERATIONS") ||
    (entry.action === "listings.read" &&
      ["SUPPORT", "MODERATOR"].includes(actor.binding.membership.role)) ||
    (["users.directory.read", "audit.read"].includes(entry.action) &&
      actor.binding.membership.role !== "SUPER_ADMIN");
  if (entry.action === "evidence.rental_case.read" && !target.evidenceId)
    return null;
  return (
    actor.binding.membership.grants.find(
      (g) =>
        g.state === "DRAFT" &&
        g.action === target.action &&
        g.policyVersion === POLICY_VERSION &&
        g.resourceKind === target.resourceKind &&
        g.resourceId === target.resourceId &&
        g.validFrom.getTime() <= now &&
        g.expiresAt.getTime() > now &&
        (entry.scope === "RESOURCE" || g.caseId === target.caseId) &&
        g.scope === entry.scope &&
        (!needsCase || (!!target.caseId && g.caseId === target.caseId)) &&
        (!entry.evidence ||
          (target.caseId !== null &&
            ["CASE_INVESTIGATION", "INDEPENDENT_REVIEW"].includes(
              g.purposeCode,
            ))),
    ) ?? null
  );
}
async function append(
  tx: Prisma.TransactionClient,
  actor: PendingActor | null,
  target: Selection,
  correlationId: string,
  outcome: "DENIED" | "FAILED" | "SHADOW_COMMITTED",
) {
  // No actor fields, outcome, metadata JSON, log text or versions come from input.
  await tx.staffSecurityEvent.create({
    data: {
      ...target,
      correlationId,
      bindingId: actor?.binding.id ?? null,
      policyVersion: POLICY_VERSION,
      outcome,
      reasonCode:
        outcome === "SHADOW_COMMITTED"
          ? "SHADOW_READ"
          : outcome === "DENIED"
            ? "ACCESS_DENIED"
            : "ACCESS_FAILED",
    },
  });
}
async function lock(
  tx: Prisma.TransactionClient,
  actor: PendingActor,
  target: Selection,
) {
  // Follow legacy grant -> membership -> association -> person -> epoch order;
  // keep mutable session/attestation/binding rows shared-locked until commit too.
  await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE id=${actor.session.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.session.userId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffSessionBinding" WHERE id=${actor.binding.id}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffStepUpRecord" WHERE id=${actor.binding.stepUpId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffCapabilityGrant" WHERE "membershipId"=${actor.binding.membershipId}::uuid AND action=${target.action} AND "resourceId"=${target.resourceId} ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffMembership" WHERE id=${actor.binding.membershipId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffAccountAssociation" WHERE id=${actor.binding.associationId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffPerson" WHERE id=${actor.personId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT "personId" FROM "StaffAuthorizationVersion" WHERE "personId"=${actor.personId}::uuid FOR SHARE`;
}
async function ownedShadowFixture(tx: Prisma.TransactionClient) {
  const runId = process.env.MRT_TEST_RUN_ID;
  if (
    process.env.NODE_ENV === "production" ||
    !/^[a-f0-9]{24}$/.test(runId ?? "") ||
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
  )
    throw new PendingStaffDenied();
  let url: URL;
  try {
    url = disposableDatabaseUrl(process.env.TEST_DATABASE_URL);
  } catch {
    throw new PendingStaffDenied();
  }
  const identity = await tx.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() AS name, shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  if (
    identity[0]?.name !== url.pathname.slice(1) ||
    identity[0]?.marker !== `hustlen-mrt-test:${runId}`
  )
    throw new PendingStaffDenied();
}
/** Always non-activating. Pending records confer no authority. Only an explicitly
 * installed shadow domain checker can exercise a synthetic read; never wire this
 * test seam into a production Admin route or staff authentication endpoint. */
export function createPendingSessionAudit(
  db: PrismaClient,
  domain?: PendingShadowDomain,
) {
  async function attempt(
    token: string | null,
    target: Selection,
    correlationId: string,
    outcome: "DENIED" | "FAILED",
  ) {
    await db.$transaction(async (tx) =>
      append(tx, await load(tx, token, true), target, correlationId, outcome),
    );
  }
  return Object.freeze({
    async inspect(token: string | null) {
      const actor = await db.$transaction((tx) => load(tx, token));
      return Object.freeze({
        authorized: false as const,
        mode: "PENDING_INSPECTION" as const,
        reason: actor ? "PENDING_NOT_AUTHORITY" : "INVALID_PENDING_CHAIN",
      });
    },
    async recordDenied(token: string | null, request: PendingReadRequest) {
      const correlationId = randomUUID();
      await attempt(token, selection(request), correlationId, "DENIED");
      return { authorized: false as const, correlationId };
    },
    async readShadow<T>(
      token: string | null,
      request: PendingReadRequest,
      read: (tx: Prisma.TransactionClient) => Promise<T>,
    ) {
      const target = selection(request),
        correlationId = randomUUID();
      try {
        const data = await db.$transaction(
          async (tx) => {
            await ownedShadowFixture(tx);
            const first = await load(tx, token);
            if (!domain || !first || !grantFor(first, target))
              throw new PendingStaffDenied();
            await lock(tx, first, target);
            const actor = await load(tx, token);
            if (
              !actor ||
              actor.binding.id !== first.binding.id ||
              !grantFor(actor, target) ||
              !(await domain.check(
                tx,
                { personId: actor.personId, userId: actor.session.userId },
                target,
              ))
            )
              throw new PendingStaffDenied();
            await append(tx, actor, target, correlationId, "SHADOW_COMMITTED");
            const value = await read(tx);
            const final = await load(tx, token);
            if (
              !final ||
              !grantFor(final, target) ||
              !(await domain.check(
                tx,
                { personId: final.personId, userId: final.session.userId },
                target,
              ))
            )
              throw new PendingStaffDenied();
            return value;
          },
          { isolationLevel: "ReadCommitted", timeout: 10000 },
        );
        return {
          mode: "SHADOW_ONLY" as const,
          readyForActivation: false as const,
          correlationId,
          data,
        };
      } catch (error) {
        const denied = error instanceof PendingStaffDenied;
        if (!denied) logOperationalError("staff_shadow_read", error);
        try {
          await attempt(
            token,
            target,
            correlationId,
            denied ? "DENIED" : "FAILED",
          );
        } catch (auditError) {
          logOperationalError("staff_attempt_audit", auditError);
          throw new Error("Staff access audit unavailable");
        }
        if (denied) throw error;
        throw new Error("Staff shadow read failed");
      }
    },
  });
}
