import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { capability, POLICY_VERSION } from "../registry";
import {
  resolvePendingFoundationActor,
  assertOwnedFoundationFixture,
} from "../scoped/session-audit";
import {
  APPROVAL_POLICY_VERSION,
  inspectHypotheticalCandidate,
  type FixtureReviewFacts,
  type CandidateActor,
} from "./candidate";
export class ApprovalFoundationDenied extends Error {
  constructor() {
    super("Inactive approval foundation denied");
    this.name = "ApprovalFoundationDenied";
  }
}
export type DraftReference = Readonly<{
  action: string;
  resourceId: string;
  audience: "CASE_ONLY" | "PLATFORM";
  payloadRef: string;
  reasonRef: string;
  reasonCode: "SAFETY_REVIEW" | "POLICY_REVIEW" | "DISPUTE_REVIEW";
  evidenceRefs: readonly string[];
}>;
export interface ApprovalFixtureBoundary {
  resource(
    tx: Prisma.TransactionClient,
    actor: CandidateActor,
    input: DraftReference,
  ): Promise<{
    resourceKind: string;
    resourceId: string;
    resourceVersion: bigint;
    evidenceVersion: bigint;
    payloadDigest: string;
    caseId: string | null;
  }>;
  reviewer(
    tx: Prisma.TransactionClient,
    actor: CandidateActor,
    proposal: Parameters<typeof inspectHypotheticalCandidate>[1],
  ): Promise<FixtureReviewFacts>;
  /** Required bounded audit writer in this same transaction. No production writer. */
  audit(
    tx: Prisma.TransactionClient,
    event: Readonly<{
      correlationId: string;
      requestId: string;
      revision: number;
      personId: string;
      userId: number;
      bindingId: string;
      kind: "REVISION" | "SUBMIT" | "CANCEL" | "DECISION";
    }>,
  ): Promise<void>;
}
const uuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
function validate(input: DraftReference) {
  const contract = capability(input.action),
    approval = capability(input.action.replace(/\.request$/, ".approve"));
  if (
    !contract ||
    contract.risk !== "HIGH" ||
    contract.blockedPolicy ||
    approval?.approvalFor !== input.action ||
    (!uuid(input.resourceId) &&
      (!/^[1-9][0-9]{0,9}$/.test(input.resourceId) ||
        Number(input.resourceId) > 2147483647)) ||
    !["CASE_ONLY", "PLATFORM"].includes(input.audience) ||
    !uuid(input.payloadRef) ||
    !uuid(input.reasonRef) ||
    !["SAFETY_REVIEW", "POLICY_REVIEW", "DISPUTE_REVIEW"].includes(
      input.reasonCode,
    ) ||
    !Array.isArray(input.evidenceRefs) ||
    input.evidenceRefs.length < 1 ||
    input.evidenceRefs.length > 16 ||
    !input.evidenceRefs.every(uuid)
  )
    throw new ApprovalFoundationDenied();
  return contract;
}
/** All writes/hypotheses require a verified owned disposable database. No live
 * MFA issuer, production approval policy, operational callback or executor. */
export function createIsolatedApprovalFoundation(
  db: PrismaClient,
  boundary: ApprovalFixtureBoundary,
) {
  async function transaction<T>(
    credential: string | null,
    work: (
      tx: Prisma.TransactionClient,
      actor: NonNullable<
        Awaited<ReturnType<typeof resolvePendingFoundationActor>>
      >,
    ) => Promise<T>,
  ) {
    return db.$transaction(
      async (tx) => {
        await assertOwnedFoundationFixture(tx);
        const actor = await resolvePendingFoundationActor(tx, credential, true);
        if (!actor) throw new ApprovalFoundationDenied();
        return work(tx, actor);
      },
      { isolationLevel: "ReadCommitted", timeout: 10000 },
    );
  }
  async function lockRequest(tx: Prisma.TransactionClient, id: string) {
    if (!uuid(id)) throw new ApprovalFoundationDenied();
    await tx.$queryRaw`SELECT id FROM "StaffChangeRequest" WHERE id=${id}::uuid FOR UPDATE`;
    return tx.staffChangeRequest.findUniqueOrThrow({ where: { id } });
  }
  async function materialize(
    tx: Prisma.TransactionClient,
    actor: CandidateActor,
    input: DraftReference,
    revision: number,
  ) {
    const entry = validate(input),
      facts = await boundary.resource(tx, actor, input);
    if (
      facts.resourceKind !== entry.resource ||
      facts.resourceId !== input.resourceId ||
      facts.resourceVersion < BigInt(1) ||
      facts.evidenceVersion < BigInt(1) ||
      !/^[a-f0-9]{64}$/.test(facts.payloadDigest) ||
      !entry.roles.includes(actor.role) ||
      !actor.grants.some(
        (g) =>
          g.state === "DRAFT" &&
          g.action === input.action &&
          g.policyVersion === actor.policyVersion &&
          g.resourceId === input.resourceId &&
          g.resourceKind === entry.resource &&
          g.validFrom.getTime() <= Date.now() &&
          g.expiresAt.getTime() > Date.now() &&
          (entry.scope !== "ASSIGNED_CASE" ||
            (!!facts.caseId && g.caseId === facts.caseId)),
      )
    )
      throw new ApprovalFoundationDenied();
    const expiresAt = new Date(Math.min(actor.expiresAt, Date.now() + 3500000));
    const columns = {
      resourceId: input.resourceId,
      audience: input.audience,
      resourceVersion: facts.resourceVersion,
      evidenceVersion: facts.evidenceVersion,
      policyVersion: POLICY_VERSION,
      approvalPolicyVersion: APPROVAL_POLICY_VERSION,
      requesterAuthorizationVersion: actor.authorizationVersion,
      payloadRef: input.payloadRef,
      payloadDigest: facts.payloadDigest,
      reasonRef: input.reasonRef,
      reasonCode: input.reasonCode,
      evidenceRefs: [...new Set(input.evidenceRefs)].sort(),
      expiresAt,
    };
    const object = {
      ...columns,
      resourceVersion: columns.resourceVersion.toString(),
      evidenceVersion: columns.evidenceVersion.toString(),
      requesterAuthorizationVersion:
        columns.requesterAuthorizationVersion.toString(),
      expiresAt: expiresAt.toISOString(),
      action: entry.action,
      resourceKind: entry.resource,
      revision,
      intent: "PROPOSED_CHANGE_REFERENCE",
    };
    const normalized = await tx.$queryRaw<
      { canonical: string }[]
    >`SELECT ${JSON.stringify(object)}::jsonb::text AS canonical`;
    const canonicalManifest = normalized[0].canonical;
    return {
      ...columns,
      canonicalManifest,
      payloadHash: createHash("sha256").update(canonicalManifest).digest("hex"),
    };
  }
  async function audit(
    tx: Prisma.TransactionClient,
    actor: CandidateActor,
    request: { id: string; correlationId: string },
    revision: number,
    kind: Parameters<ApprovalFixtureBoundary["audit"]>[1]["kind"],
  ) {
    await boundary.audit(tx, {
      requestId: request.id,
      correlationId: request.correlationId,
      revision,
      personId: actor.personId,
      userId: actor.userId,
      bindingId: actor.bindingId,
      kind,
    });
  }
  async function reviewFacts(
    tx: Prisma.TransactionClient,
    actor: CandidateActor,
    proposal: Parameters<typeof inspectHypotheticalCandidate>[1],
    requestId: string,
    revision: number,
  ) {
    const facts = await boundary.reviewer(tx, actor, proposal);
    const prior = await tx.staffApprovalDecision.findMany({
      where: { requestId, revision: { lt: revision } },
      select: { reviewerPersonId: true },
    });
    return {
      ...facts,
      priorReviewerPersonIds: [
        ...new Set([
          ...facts.priorReviewerPersonIds,
          ...prior.map((row) => row.reviewerPersonId),
        ]),
      ],
    };
  }
  return Object.freeze({
    async createDraft(
      credential: string | null,
      idempotencyKey: string,
      input: DraftReference,
    ) {
      if (!uuid(idempotencyKey)) throw new ApprovalFoundationDenied();
      return transaction(credential, async (tx, actor) => {
        // Person-scoped transaction lock serializes duplicate requests across aliases.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${actor.personId + ":" + idempotencyKey},0))`;
        const old = await tx.staffChangeRequest.findUnique({
          where: {
            requesterPersonId_idempotencyKey: {
              requesterPersonId: actor.personId,
              idempotencyKey,
            },
          },
          include: { revisions: { where: { revision: 1 } } },
        });
        if (old) {
          const first = old.revisions[0];
          if (
            !first ||
            old.action !== input.action ||
            first.resourceId !== input.resourceId ||
            first.audience !== input.audience ||
            first.payloadRef !== input.payloadRef ||
            first.reasonRef !== input.reasonRef ||
            first.reasonCode !== input.reasonCode ||
            JSON.stringify([...first.evidenceRefs].sort()) !==
              JSON.stringify([...new Set(input.evidenceRefs)].sort())
          )
            throw new ApprovalFoundationDenied();
          return {
            mode: "INACTIVE" as const,
            id: old.id,
            revision: 1,
            currentRevision: old.currentRevision,
            payloadHash: first.payloadHash,
            replayed: true,
          };
        }
        const entry = validate(input),
          body = await materialize(tx, actor, input, 1);
        const request = await tx.staffChangeRequest.create({
          data: {
            id: randomUUID(),
            requesterBindingId: actor.bindingId,
            requesterPersonId: actor.personId,
            requesterUserId: actor.userId,
            action: entry.action,
            approvalAction: input.action.replace(/\.request$/, ".approve"),
            resourceKind: entry.resource,
            idempotencyKey,
            correlationId: randomUUID(),
          },
        });
        await tx.staffChangeRevision.create({
          data: { ...body, requestId: request.id, revision: 1 },
        });
        await audit(tx, actor, request, 1, "REVISION");
        return {
          mode: "INACTIVE" as const,
          id: request.id,
          revision: 1,
          payloadHash: body.payloadHash,
          replayed: false,
        };
      });
    },
    async revise(
      credential: string | null,
      id: string,
      expectedRevision: number,
      input: DraftReference,
    ) {
      return transaction(credential, async (tx, actor) => {
        const head = await lockRequest(tx, id);
        if (
          head.requesterPersonId !== actor.personId ||
          head.currentRevision !== expectedRevision ||
          head.action !== input.action
        )
          throw new ApprovalFoundationDenied();
        const revision = expectedRevision + 1,
          body = await materialize(tx, actor, input, revision);
        await tx.staffChangeRevision.create({
          data: { ...body, requestId: id, revision },
        });
        await audit(tx, actor, head, revision, "REVISION");
        return {
          mode: "INACTIVE" as const,
          id,
          revision,
          payloadHash: body.payloadHash,
        };
      });
    },
    async submit(credential: string | null, id: string, revision: number) {
      return transaction(credential, async (tx, actor) => {
        const head = await lockRequest(tx, id);
        if (
          head.requesterPersonId !== actor.personId ||
          head.currentRevision !== revision
        )
          throw new ApprovalFoundationDenied();
        await tx.staffChangeRequest.update({
          where: { id },
          data: { state: "SUBMITTED" },
        });
        await audit(tx, actor, head, revision, "SUBMIT");
        return { mode: "INACTIVE" as const };
      });
    },
    async cancel(credential: string | null, id: string) {
      return transaction(credential, async (tx, actor) => {
        const head = await lockRequest(tx, id);
        if (head.requesterPersonId !== actor.personId)
          throw new ApprovalFoundationDenied();
        await tx.staffChangeRequest.update({
          where: { id },
          data: { state: "CANCELLED" },
        });
        await audit(tx, actor, head, head.currentRevision, "CANCEL");
        return { mode: "INACTIVE" as const };
      });
    },
    async decideHypothetically(
      credential: string | null,
      id: string,
      revision: number,
      input: {
        idempotencyKey: string;
        ruling: "REJECT" | "SHADOW_ELIGIBLE";
        rationaleRef: string;
      },
    ) {
      if (
        !uuid(input.idempotencyKey) ||
        !uuid(input.rationaleRef) ||
        !["REJECT", "SHADOW_ELIGIBLE"].includes(input.ruling)
      )
        throw new ApprovalFoundationDenied();
      return transaction(credential, async (tx, actor) => {
        const head = await lockRequest(tx, id),
          body = await tx.staffChangeRevision.findUniqueOrThrow({
            where: { requestId_revision: { requestId: id, revision } },
          });
        if (head.currentRevision !== revision)
          throw new ApprovalFoundationDenied();
        const proposal = {
          ...body,
          requesterPersonId: head.requesterPersonId,
          action: head.action,
          approvalAction: head.approvalAction,
          resourceKind: head.resourceKind,
        };
        const facts = await reviewFacts(tx, actor, proposal, id, revision),
          result = await inspectHypotheticalCandidate(
            actor,
            proposal,
            facts,
            Date.now(),
            tx,
          );
        if (!result.hypotheticalMatch) throw new ApprovalFoundationDenied();
        const old = await tx.staffApprovalDecision.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (old) {
          if (
            old.requestId !== id ||
            old.revision !== revision ||
            old.reviewerPersonId !== actor.personId ||
            old.ruling !== input.ruling ||
            old.rationaleRef !== input.rationaleRef
          )
            throw new ApprovalFoundationDenied();
          return {
            ...result,
            hypotheticalMatch: false,
            reason: "HISTORICAL_DECISION_NOT_ELIGIBILITY",
            id: old.id,
            replayed: true,
          };
        }
        if (head.state !== "SUBMITTED") throw new ApprovalFoundationDenied();
        const decision = await tx.staffApprovalDecision.create({
          data: {
            id: randomUUID(),
            requestId: id,
            revision,
            payloadHash: body.payloadHash,
            reviewerBindingId: actor.bindingId,
            reviewerPersonId: actor.personId,
            reviewerUserId: actor.userId,
            reviewerAuthorizationVersion: actor.authorizationVersion,
            ruling: input.ruling,
            rationaleRef: input.rationaleRef,
            rationaleCode: "INDEPENDENT_REVIEW",
            idempotencyKey: input.idempotencyKey,
          },
        });
        await audit(tx, actor, head, revision, "DECISION");
        const finalActor = await resolvePendingFoundationActor(tx, credential);
        if (!finalActor) throw new ApprovalFoundationDenied();
        const finalFacts = await reviewFacts(
          tx,
          finalActor,
          proposal,
          id,
          revision,
        );
        if (
          !(
            await inspectHypotheticalCandidate(
              finalActor,
              proposal,
              finalFacts,
              Date.now(),
              tx,
            )
          ).hypotheticalMatch
        )
          throw new ApprovalFoundationDenied();

        return { ...result, id: decision.id, replayed: false };
      });
    },
  });
}
