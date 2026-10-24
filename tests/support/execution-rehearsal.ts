/** Test-only executor. No application module imports this file. */
import "server-only";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { connectTestDatabase } from "./test-database";
import { assertOwnedFoundationFixture } from "../../lib/authorization/scoped/session-audit";
import { logOperationalError } from "../../lib/operational-error";
const POLICY = "SYNTHETIC_EXECUTION_V1",
  ACTION = "synthetic.counter.advance";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const uuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
type Tx = Prisma.TransactionClient;
export class RehearsalDenied extends Error {
  constructor() {
    super("Synthetic execution denied");
    this.name = "RehearsalDenied";
  }
}
export type SyntheticActor = {
  humanId: string;
  accountId: string;
  sessionId: string;
  token: string;
};
type ActorRow = {
  session_id: string;
  account_id: string;
  human_id: string;
  epoch: bigint;
  assurance_id: string;
};
type Revision = {
  proposal_id: string;
  revision: number;
  payload_hash: string;
  payload_id: string;
  resource_id: string;
  resource_version: bigint;
  evidence_version: bigint;
  policy_version: string;
  requester_epoch: bigint;
};
type Head = {
  id: string;
  requester_id: string;
  requester_session_id: string;
  action: string;
  current_revision: number;
};
type Decision = {
  id: string;
  proposal_id: string;
  revision: number;
  payload_hash: string;
  approver_id: string;
  approver_session_id: string;
  approver_epoch: bigint;
  ruling: string;
};
type Resource = {
  id: string;
  value: number;
  version: bigint;
  evidence_version: bigint;
  policy_version: string;
  lifecycle: string;
  conflicts: string[];
};
type Receipt = {
  id: string;
  after_version: bigint;
  after_value: number;
  payload_hash: string;
  decision_id: string;
};
export interface RehearsalFaults {
  onBeforeResourceLock?: (backendPid: number) => Promise<void>;
  onBeforeAuthorityLocks?: () => Promise<void>;
  afterEffect?: "REVOKE_EXECUTOR" | "DRIFT_RESOURCE" | "EXPIRE_ASSURANCE";
  lockTimeoutMs?: number;
  onFailureCode?: (code: "40P01" | "55P03" | "57014" | "OTHER") => void;
}
function sqlFailureCode(error: unknown): "40P01" | "55P03" | "57014" | "OTHER" {
  const queue: unknown[] = [error];
  for (let depth = 0; depth < 5; depth++) {
    const layer = queue.splice(0);
    for (const value of layer) {
      if (!value || typeof value !== "object") continue;
      const fields = Object.getOwnPropertyDescriptors(value);
      for (const key of ["code", "originalCode", "sqlState"]) {
        const field = fields[key];
        if (
          field &&
          "value" in field &&
          ["40P01", "55P03", "57014"].includes(field.value)
        )
          return field.value;
      }
      for (const key of [
        "meta",
        "cause",
        "originalError",
        "driverAdapterError",
      ]) {
        const field = fields[key];
        if (field && "value" in field) queue.push(field.value);
      }
    }
  }
  return "OTHER";
}
async function guard(tx: Tx) {
  await assertOwnedFoundationFixture(tx);
  const rows = await tx.$queryRaw<
    { run_id: string }[]
  >`SELECT run_id FROM approval_rehearsal.installation`;
  if (rows[0]?.run_id !== process.env.MRT_TEST_RUN_ID)
    throw new RehearsalDenied();
}
async function authority(tx: Tx, sessionId: string): Promise<ActorRow> {
  const rows = await tx.$queryRaw<
    ActorRow[]
  >`SELECT s.id AS session_id,a.id AS account_id,h.id AS human_id,h.epoch,u.id AS assurance_id FROM approval_rehearsal.session_record s JOIN approval_rehearsal.account a ON a.id=s.account_id JOIN approval_rehearsal.human h ON h.id=a.human_id JOIN approval_rehearsal.assurance u ON u.session_id=s.id WHERE s.id=${sessionId}::uuid AND h.verified AND NOT s.revoked AND s.expires_at>clock_timestamp() AND s.epoch=h.epoch AND u.human_id=h.id AND u.epoch=h.epoch AND u.kind='TEST_VERIFIED' AND NOT u.revoked AND u.verified_at<=clock_timestamp() AND u.verified_at>clock_timestamp()-interval '5 minutes' AND u.expires_at>clock_timestamp()`;
  if (rows.length !== 1) throw new RehearsalDenied();
  return rows[0];
}
async function credential(tx: Tx, token: string) {
  if (typeof token !== "string" || token.length > 128)
    throw new RehearsalDenied();
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM approval_rehearsal.session_record WHERE token_hash=${hash(token)}`;
  if (!rows[0]) throw new RehearsalDenied();
  return authority(tx, rows[0].id);
}
async function permission(
  tx: Tx,
  actor: ActorRow,
  resourceId: string,
  action: "fixture.propose" | "fixture.approve" | "fixture.execute",
) {
  const rows = await tx.$queryRaw<
    { ok: boolean }[]
  >`SELECT EXISTS(SELECT 1 FROM approval_rehearsal.capability_grant WHERE human_id=${actor.human_id}::uuid AND resource_id=${resourceId}::uuid AND action=${action} AND policy_version=${POLICY} AND NOT revoked AND expires_at>clock_timestamp()) AS ok`;
  if (!rows[0].ok) throw new RehearsalDenied();
}
async function resource(tx: Tx, id: string, lock = true) {
  const rows = lock
    ? await tx.$queryRaw<
        Resource[]
      >`SELECT * FROM approval_rehearsal.resource WHERE id=${id}::uuid FOR UPDATE`
    : await tx.$queryRaw<
        Resource[]
      >`SELECT * FROM approval_rehearsal.resource WHERE id=${id}::uuid`;
  if (!rows[0]) throw new RehearsalDenied();
  return rows[0];
}
async function payload(tx: Tx, resourceId: string, version: bigint) {
  const body = {
    kind: "SYNTHETIC_COUNTER_ADVANCE",
    resourceId,
    increment: 1,
    expectedVersion: version.toString(),
    nonce: randomUUID(),
  };
  const normalized = await tx.$queryRaw<
    { canonical: string }[]
  >`SELECT ${JSON.stringify(body)}::jsonb::text AS canonical`;
  return {
    id: randomUUID(),
    canonical: normalized[0].canonical,
    digest: hash(normalized[0].canonical),
  };
}
function validatePayload(
  canonical: string,
  digest: string,
  revision: Revision,
) {
  if (hash(canonical) !== digest || digest !== revision.payload_hash)
    throw new RehearsalDenied();
  const p = JSON.parse(canonical) as Record<string, unknown>;
  if (
    Object.keys(p).sort().join(",") !==
      "expectedVersion,increment,kind,nonce,resourceId" ||
    p.kind !== "SYNTHETIC_COUNTER_ADVANCE" ||
    p.increment !== 1 ||
    p.resourceId !== revision.resource_id ||
    p.expectedVersion !== revision.resource_version.toString() ||
    !uuid(p.nonce)
  )
    throw new RehearsalDenied();
}
export async function installExecutionRehearsal(db: PrismaClient) {
  await db.$transaction((tx) => assertOwnedFoundationFixture(tx));
  const pg = await connectTestDatabase();
  try {
    await pg.query(
      await readFile("tests/fixtures/approval-execution.sql", "utf8"),
    );
    await pg.query("INSERT INTO approval_rehearsal.installation VALUES ($1)", [
      process.env.MRT_TEST_RUN_ID,
    ]);
    await pg.query("INSERT INTO approval_rehearsal.policy VALUES (1,$1)", [
      POLICY,
    ]);
  } finally {
    await pg.end();
  }
}
/** Only test-defined counter operations. No handler/model/SQL supplied by caller. */
export function executionRehearsal(
  db: PrismaClient,
  faults: RehearsalFaults = {},
) {
  async function transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return db.$transaction(
      async (tx) => {
        await guard(tx);
        const timeout = faults.lockTimeoutMs ?? 500;
        if (!Number.isInteger(timeout) || timeout < 50 || timeout > 3000)
          throw new RehearsalDenied();
        await tx.$queryRaw`SELECT set_config('lock_timeout',${timeout + "ms"},true)`;
        await tx.$queryRaw`SELECT set_config('statement_timeout','5000ms',true)`;
        return fn(tx);
      },
      { isolationLevel: "ReadCommitted", timeout: 8000, maxWait: 2000 },
    );
  }
  async function readApproval(tx: Tx, id: string) {
    if (!uuid(id)) throw new RehearsalDenied();
    const heads = await tx.$queryRaw<
      Head[]
    >`SELECT * FROM approval_rehearsal.proposal WHERE id=${id}::uuid FOR UPDATE`;
    const head = heads[0];
    if (!head || head.action !== ACTION) throw new RehearsalDenied();
    const revisions = await tx.$queryRaw<
      Revision[]
    >`SELECT * FROM approval_rehearsal.proposal_revision WHERE proposal_id=${id}::uuid AND revision=${head.current_revision}`;
    const revision = revisions[0];
    if (!revision) throw new RehearsalDenied();
    return { head, revision };
  }
  async function verify(
    tx: Tx,
    head: Head,
    revision: Revision,
    decision: Decision,
    executorSession: string,
  ) {
    const requester = await authority(tx, head.requester_session_id),
      approver = await authority(tx, decision.approver_session_id),
      executor = await authority(tx, executorSession);
    if (
      requester.human_id !== head.requester_id ||
      requester.epoch !== revision.requester_epoch ||
      approver.human_id !== decision.approver_id ||
      approver.epoch !== decision.approver_epoch ||
      requester.human_id === approver.human_id ||
      new Set([requester.human_id, approver.human_id, executor.human_id])
        .size !== 3 ||
      decision.ruling !== "HYPOTHETICAL_INDEPENDENT" ||
      decision.revision !== revision.revision ||
      decision.payload_hash !== revision.payload_hash ||
      revision.policy_version !== POLICY
    )
      throw new RehearsalDenied();
    await permission(tx, requester, revision.resource_id, "fixture.propose");
    await permission(tx, approver, revision.resource_id, "fixture.approve");
    await permission(tx, executor, revision.resource_id, "fixture.execute");
    const deadlines = await tx.$queryRaw<
      { ok: boolean }[]
    >`SELECT EXISTS(SELECT 1 FROM approval_rehearsal.proposal p JOIN approval_rehearsal.decision d ON d.proposal_id=p.id WHERE p.id=${head.id}::uuid AND p.current_revision=${revision.revision} AND d.id=${decision.id}::uuid AND p.expires_at>clock_timestamp() AND d.expires_at>clock_timestamp()) AS ok`;
    const policies = await tx.$queryRaw<
      { version: string }[]
    >`SELECT version FROM approval_rehearsal.policy WHERE id=1`;
    if (!deadlines[0].ok || policies[0]?.version !== POLICY)
      throw new RehearsalDenied();
    return { requester, approver, executor };
  }
  return Object.freeze({
    async seedResource() {
      return transaction(async (tx) => {
        const id = randomUUID();
        await tx.$executeRaw`INSERT INTO approval_rehearsal.resource (id,policy_version) VALUES (${id}::uuid,${POLICY})`;
        return id;
      });
    },
    async seedActor(
      resourceId: string,
      actions: readonly (
        "fixture.propose" | "fixture.approve" | "fixture.execute"
      )[],
      aliasOf?: string,
    ): Promise<SyntheticActor> {
      return transaction(async (tx) => {
        if (
          !uuid(resourceId) ||
          actions.some(
            (a) =>
              ![
                "fixture.propose",
                "fixture.approve",
                "fixture.execute",
              ].includes(a),
          )
        )
          throw new RehearsalDenied();
        const humanId = aliasOf ?? randomUUID(),
          accountId = randomUUID(),
          sessionId = randomUUID(),
          token = randomUUID();
        if (!aliasOf)
          await tx.$executeRaw`INSERT INTO approval_rehearsal.human VALUES (${humanId}::uuid,true,1)`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.account VALUES (${accountId}::uuid,${humanId}::uuid)`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.session_record (id,account_id,token_hash,epoch,expires_at) SELECT ${sessionId}::uuid,${accountId}::uuid,${hash(token)},epoch,clock_timestamp()+interval '1 hour' FROM approval_rehearsal.human WHERE id=${humanId}::uuid`;
        for (const action of actions)
          await tx.$executeRaw`INSERT INTO approval_rehearsal.capability_grant (id,human_id,resource_id,action,policy_version,expires_at) VALUES (${randomUUID()}::uuid,${humanId}::uuid,${resourceId}::uuid,${action},${POLICY},clock_timestamp()+interval '1 hour')`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.assurance (id,session_id,human_id,epoch,kind,verified_at,expires_at) SELECT ${randomUUID()}::uuid,${sessionId}::uuid,id,epoch,'TEST_VERIFIED',clock_timestamp(),clock_timestamp()+interval '5 minutes' FROM approval_rehearsal.human WHERE id=${humanId}::uuid`;
        return { humanId, accountId, sessionId, token };
      });
    },
    async propose(
      token: string,
      resourceId: string,
      testDeadline: "VALID" | "EXPIRED" = "VALID",
    ) {
      return transaction(async (tx) => {
        if (!uuid(resourceId)) throw new RehearsalDenied();
        const actor = await credential(tx, token);
        await permission(tx, actor, resourceId, "fixture.propose");
        const r = await resource(tx, resourceId);
        if (r.lifecycle !== "READY" || r.conflicts.includes(actor.human_id))
          throw new RehearsalDenied();
        const deadline = new Date(
          Date.now() + (testDeadline === "EXPIRED" ? -1000 : 240000),
        );
        const p = await payload(tx, resourceId, r.version),
          id = randomUUID();
        await tx.$executeRaw`INSERT INTO approval_rehearsal.payload VALUES (${p.id}::uuid,${p.canonical},${p.digest})`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.proposal VALUES (${id}::uuid,${actor.human_id}::uuid,${actor.session_id}::uuid,${ACTION},1,${deadline})`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.proposal_revision VALUES (${id}::uuid,1,${p.id}::uuid,${p.digest},${resourceId}::uuid,${r.version},${r.evidence_version},${POLICY},${actor.epoch})`;
        return id;
      });
    },
    async revise(token: string, proposalId: string) {
      return transaction(async (tx) => {
        const actor = await credential(tx, token),
          { head, revision } = await readApproval(tx, proposalId);
        if (actor.human_id !== head.requester_id) throw new RehearsalDenied();
        const r = await resource(tx, revision.resource_id),
          p = await payload(tx, r.id, r.version);
        await tx.$executeRaw`INSERT INTO approval_rehearsal.payload VALUES (${p.id}::uuid,${p.canonical},${p.digest})`;
        await tx.$executeRaw`INSERT INTO approval_rehearsal.proposal_revision VALUES (${head.id}::uuid,${head.current_revision + 1},${p.id}::uuid,${p.digest},${r.id}::uuid,${r.version},${r.evidence_version},${POLICY},${actor.epoch})`;
        await tx.$executeRaw`UPDATE approval_rehearsal.proposal SET current_revision=current_revision+1 WHERE id=${head.id}::uuid`;
      });
    },
    async decide(
      token: string,
      proposalId: string,
      testDeadline: "VALID" | "EXPIRED" = "VALID",
    ) {
      return transaction(async (tx) => {
        const who = await credential(tx, token),
          { head, revision } = await readApproval(tx, proposalId);
        if (who.human_id === head.requester_id) throw new RehearsalDenied();
        await permission(tx, who, revision.resource_id, "fixture.approve");
        const r = await resource(tx, revision.resource_id);
        if (
          r.version !== revision.resource_version ||
          r.evidence_version !== revision.evidence_version ||
          r.conflicts.includes(who.human_id)
        )
          throw new RehearsalDenied();
        const id = randomUUID(),
          deadline = new Date(
            Date.now() + (testDeadline === "EXPIRED" ? -1000 : 180000),
          );
        await tx.$executeRaw`INSERT INTO approval_rehearsal.decision VALUES (${id}::uuid,${head.id}::uuid,${revision.revision},${revision.payload_hash},${who.human_id}::uuid,${who.session_id}::uuid,${who.epoch},${deadline},'HYPOTHETICAL_INDEPENDENT')`;
        return id;
      });
    },
    async execute(token: string, proposalId: string) {
      const attemptId = randomUUID();
      try {
        return await transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM approval_rehearsal.policy WHERE id=1 FOR SHARE`;
          const { head, revision } = await readApproval(tx, proposalId),
            decisions = await tx.$queryRaw<
              Decision[]
            >`SELECT * FROM approval_rehearsal.decision WHERE proposal_id=${head.id}::uuid AND revision=${revision.revision}`;
          const decision = decisions[0];
          if (!decision) throw new RehearsalDenied();
          const caller = await credential(tx, token),
            initial = await verify(
              tx,
              head,
              revision,
              decision,
              caller.session_id,
            );
          await faults.onBeforeAuthorityLocks?.();
          const humans = [
            initial.requester.human_id,
            initial.approver.human_id,
            initial.executor.human_id,
          ].sort();
          for (const id of humans)
            await tx.$queryRaw`SELECT id FROM approval_rehearsal.human WHERE id=${id}::uuid FOR SHARE`;
          for (const a of [
            initial.requester,
            initial.approver,
            initial.executor,
          ].sort((a, b) => a.session_id.localeCompare(b.session_id))) {
            await tx.$queryRaw`SELECT id FROM approval_rehearsal.account WHERE id=${a.account_id}::uuid FOR SHARE`;
            await tx.$queryRaw`SELECT id FROM approval_rehearsal.session_record WHERE id=${a.session_id}::uuid FOR SHARE`;
            await tx.$queryRaw`SELECT id FROM approval_rehearsal.capability_grant WHERE human_id=${a.human_id}::uuid AND resource_id=${revision.resource_id}::uuid ORDER BY id FOR SHARE`;
            await tx.$queryRaw`SELECT id FROM approval_rehearsal.assurance WHERE session_id=${a.session_id}::uuid ORDER BY id FOR SHARE`;
          }
          const actors = await verify(
            tx,
            head,
            revision,
            decision,
            caller.session_id,
          );
          if (
            actors.executor.human_id !== initial.executor.human_id ||
            actors.requester.human_id !== initial.requester.human_id ||
            actors.approver.human_id !== initial.approver.human_id
          )
            throw new RehearsalDenied();
          const backend = await tx.$queryRaw<
            { pid: number }[]
          >`SELECT pg_backend_pid() pid`;
          await faults.onBeforeResourceLock?.(backend[0].pid);
          const r = await resource(tx, revision.resource_id);
          if (
            r.policy_version !== revision.policy_version ||
            r.evidence_version !== revision.evidence_version ||
            [actors.requester, actors.approver, actors.executor].some((a) =>
              r.conflicts.includes(a.human_id),
            )
          )
            throw new RehearsalDenied();
          const payloadRows = await tx.$queryRaw<
            { canonical: string; hash: string }[]
          >`SELECT canonical,hash FROM approval_rehearsal.payload WHERE id=${revision.payload_id}::uuid`;
          validatePayload(
            payloadRows[0].canonical,
            payloadRows[0].hash,
            revision,
          );
          const prior = await tx.$queryRaw<
            Receipt[]
          >`SELECT * FROM approval_rehearsal.receipt WHERE proposal_id=${head.id}::uuid AND revision=${revision.revision}`;
          if (prior[0]) {
            const old = prior[0];
            if (
              old.payload_hash !== revision.payload_hash ||
              old.decision_id !== decision.id ||
              r.version !== old.after_version ||
              r.value !== old.after_value ||
              r.lifecycle !== "CONSUMED"
            )
              throw new RehearsalDenied();
            return {
              mode: "REHEARSAL_ONLY" as const,
              authorized: false as const,
              executed: false,
              replayed: true,
              receiptId: old.id,
            };
          }
          if (
            r.lifecycle !== "READY" ||
            r.value !== 0 ||
            r.version !== revision.resource_version
          )
            throw new RehearsalDenied();
          await tx.$executeRaw`UPDATE approval_rehearsal.resource SET value=value+1,version=version+1,lifecycle='CONSUMED' WHERE id=${r.id}::uuid`;
          if (faults.afterEffect === "REVOKE_EXECUTOR")
            await tx.$executeRaw`UPDATE approval_rehearsal.human SET epoch=epoch+1 WHERE id=${actors.executor.human_id}::uuid`;
          if (faults.afterEffect === "DRIFT_RESOURCE")
            await tx.$executeRaw`UPDATE approval_rehearsal.resource SET evidence_version=evidence_version+1 WHERE id=${r.id}::uuid`;
          if (faults.afterEffect === "EXPIRE_ASSURANCE")
            await tx.$executeRaw`UPDATE approval_rehearsal.assurance SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=${actors.executor.session_id}::uuid`;
          await verify(tx, head, revision, decision, caller.session_id);
          const final = await resource(tx, r.id, false);
          if (
            final.version !== r.version + BigInt(1) ||
            final.evidence_version !== revision.evidence_version ||
            final.policy_version !== revision.policy_version
          )
            throw new RehearsalDenied();
          const auditId = randomUUID(),
            receiptId = randomUUID();
          await tx.$executeRaw`INSERT INTO approval_rehearsal.audit_event (id,attempt_id,proposal_id,kind,payload_hash,requester_id,approver_id,executor_id) VALUES (${auditId}::uuid,${attemptId}::uuid,${head.id}::uuid,'REHEARSAL_EFFECT_COMMITTED',${revision.payload_hash},${actors.requester.human_id}::uuid,${actors.approver.human_id}::uuid,${actors.executor.human_id}::uuid)`;
          await tx.$executeRaw`INSERT INTO approval_rehearsal.receipt VALUES (${receiptId}::uuid,${head.id}::uuid,${revision.revision},${decision.id}::uuid,${revision.payload_hash},${r.id}::uuid,${actors.requester.human_id}::uuid,${actors.approver.human_id}::uuid,${actors.executor.human_id}::uuid,${r.version},${final.version},${r.value},${final.value},${revision.evidence_version},${revision.policy_version},${actors.requester.epoch},${actors.approver.epoch},${actors.executor.epoch},${auditId}::uuid,'REHEARSAL_COMMITTED')`;
          // Recheck clocks after audit/receipt insertion, immediately before commit.
          await verify(tx, head, revision, decision, caller.session_id);
          return {
            mode: "REHEARSAL_ONLY" as const,
            authorized: false as const,
            executed: true,
            replayed: false,
            receiptId,
          };
        });
      } catch (error) {
        faults.onFailureCode?.(sqlFailureCode(error));
        if (!(error instanceof RehearsalDenied))
          logOperationalError("execution_rehearsal", error);
        try {
          await transaction(async (tx) => {
            await tx.$executeRaw`INSERT INTO approval_rehearsal.audit_event (id,attempt_id,proposal_id,kind) VALUES (${randomUUID()}::uuid,${attemptId}::uuid,${uuid(proposalId) ? proposalId : null}::uuid,${error instanceof RehearsalDenied ? "REHEARSAL_DENIED" : "REHEARSAL_FAILED"})`;
          });
        } catch (auditError) {
          logOperationalError("execution_rehearsal_attempt_audit", auditError);
        }
        throw new RehearsalDenied();
      }
    },
  });
}
