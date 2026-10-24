import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
import {
  approvalFixtures,
  REVIEW_ACTION,
  REQUEST_ACTION,
} from "./support/approval-fixtures";
import {
  createIsolatedApprovalFoundation,
  type DraftReference,
  ApprovalFoundationDenied,
} from "../lib/authorization/approvals/service";
import { productionApprovalReadiness } from "../lib/authorization/approvals/candidate";
import { STAFF_ROLES } from "../lib/authorization/registry";
import { createPendingSessionAudit } from "../lib/authorization/scoped/session-audit";

test(
  "Batch 4A owned PostgreSQL proposal/decision history and independent-human hypotheses",
  { timeout: 60000 },
  async (t) => {
    const pg = await connectTestDatabase(),
      db = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: process.env.TEST_DATABASE_URL!,
        }),
      });
    try {
      const f = await approvalFixtures(pg),
        service = createIsolatedApprovalFoundation(db, f.boundary);
      const requester = await f.actor("SUPER_ADMIN", 1),
        reviewer = await f.actor(),
        other = await f.actor();
      await f.assign(requester.personId, reviewer.personId, other.personId);
      const input: DraftReference = {
        action: REQUEST_ACTION,
        resourceId: "90",
        audience: "CASE_ONLY",
        payloadRef: randomUUID(),
        reasonRef: randomUUID(),
        reasonCode: "SAFETY_REVIEW",
        evidenceRefs: [randomUUID()],
      };
      const decision = (
        token: string,
        id: string,
        revision: number = 1,
        ruling: "REJECT" | "SHADOW_ELIGIBLE" = "SHADOW_ELIGIBLE",
      ) =>
        service.decideHypothetically(token, id, revision, {
          idempotencyKey: randomUUID(),
          ruling,
          rationaleRef: randomUUID(),
        });
      const proposal = async () => {
        const draft = await service.createDraft(
          requester.token,
          randomUUID(),
          input,
        );
        await service.submit(requester.token, draft.id, 1);
        return draft;
      };
      await t.test(
        "fresh migration has no proposals/decisions/transition seeds; every real policy defaults denied",
        async () => {
          for (const table of [
            "StaffChangeRequest",
            "StaffChangeRevision",
            "StaffApprovalDecision",
            "StaffChangeTransition",
          ])
            assert.equal(
              (await pg.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
                .n,
              0,
            );
          for (const action of [
            REVIEW_ACTION,
            "locations.restore.approve",
            "security.staff_grant_revoke.approve",
            "announcements.high_impact.approve",
            "disputes.resolution.approve",
            "unknown",
          ])
            assert.equal(productionApprovalReadiness(action).authorized, false);
          assert.equal("execute" in service, false);
        },
      );
      await t.test(
        "draft hash binds canonical immutable reference manifest; supplied risk/identity/status fields never authorize",
        async () => {
          const draft = await service.createDraft(
            requester.token,
            randomUUID(),
            {
              ...input,
              risk: "LOW",
              requesterPersonId: reviewer.personId,
              state: "APPROVED",
            } as DraftReference,
          );
          const head = await db.staffChangeRequest.findUniqueOrThrow({
              where: { id: draft.id },
            }),
            body = await db.staffChangeRevision.findUniqueOrThrow({
              where: {
                requestId_revision: { requestId: draft.id, revision: 1 },
              },
            });
          assert.equal(head.risk, "HIGH");
          assert.equal(head.requesterPersonId, requester.personId);
          assert.equal(head.state, "DRAFT");
          assert.equal(body.payloadHash, draft.payloadHash);
          assert.doesNotMatch(
            body.canonicalManifest,
            /private message|tokenHash|latitude|password/,
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffChangeRevision" SET audience='PLATFORM' WHERE "requestId"=$1`,
              [draft.id],
            ),
          );
          await assert.rejects(() =>
            pg.query(`DELETE FROM "StaffChangeRevision" WHERE "requestId"=$1`, [
              draft.id,
            ]),
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffChangeRequest" SET action='bookings.status.write' WHERE id=$1`,
              [draft.id],
            ),
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffChangeRequest" SET state='APPROVED' WHERE id=$1`,
              [draft.id],
            ),
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffChangeRequest" SET state='EXECUTED' WHERE id=$1`,
              [draft.id],
            ),
          );
          assert.equal(
            (await createPendingSessionAudit(db).inspect(requester.token))
              .authorized,
            false,
          );
        },
      );
      await t.test(
        "real concurrent idempotent creates and alias retries resolve one canonical-person request",
        async () => {
          const key = randomUUID();
          const results = await Promise.all([
            service.createDraft(requester.token, key, input),
            service.createDraft(requester.aliases[0].token, key, input),
          ]);
          assert.equal(results[0].id, results[1].id);
          assert.equal(results.filter((r) => r.replayed).length, 1);
          await assert.rejects(
            () =>
              service.createDraft(requester.token, key, {
                ...input,
                payloadRef: randomUUID(),
              }),
            ApprovalFoundationDenied,
          );
          const diff = await service.createDraft(other.token, key, input);
          assert.notEqual(diff.id, results[0].id);
        },
      );
      await t.test(
        "self, same-human alias and forged or expired credentials cannot review",
        async () => {
          const p = await proposal();
          for (const token of [
            requester.token,
            requester.aliases[0].token,
            '{"role":"SUPER_ADMIN","mfa":true}',
            null,
          ])
            await assert.rejects(
              () =>
                service.decideHypothetically(token, p.id, 1, {
                  idempotencyKey: randomUUID(),
                  ruling: "SHADOW_ELIGIBLE",
                  rationaleRef: randomUUID(),
                }),
              ApprovalFoundationDenied,
            );
          const stale = await f.actor();
          await f.assign(
            requester.personId,
            reviewer.personId,
            other.personId,
            stale.personId,
          );
          await pg.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE id=$1`,
            [stale.sessionId],
          );
          await assert.rejects(() => decision(stale.token, p.id));
        },
      );
      await t.test(
        "pending step-up, expired verified fixture assurance and identity mismatch fail eligibility",
        async () => {
          const p = await proposal();
          await pg.query(
            `UPDATE "ApprovalFixtureAssurance" SET kind='PENDING' WHERE "bindingId"=$1`,
            [reviewer.bindingId],
          );
          await assert.rejects(
            () => decision(reviewer.token, p.id),
            ApprovalFoundationDenied,
          );
          await pg.query(
            `UPDATE "ApprovalFixtureAssurance" SET kind='VERIFIED_FIXTURE',"verifiedAt"=NOW()-interval '10 minutes' WHERE "bindingId"=$1`,
            [reviewer.bindingId],
          );
          await assert.rejects(
            () => decision(reviewer.token, p.id),
            ApprovalFoundationDenied,
          );
          await pg.query(
            `UPDATE "ApprovalFixtureAssurance" SET "verifiedAt"=NOW(),"expiresAt"=NOW()+interval '5 minutes' WHERE "bindingId"=$1`,
            [reviewer.bindingId],
          );
          const mismatch = createIsolatedApprovalFoundation(db, {
            ...f.boundary,
            reviewer: async (...args) => {
              const facts = await f.boundary.reviewer(...args);
              return {
                ...facts,
                assurance: { ...facts.assurance, personId: requester.personId },
              };
            },
          });
          await assert.rejects(
            () =>
              mismatch.decideHypothetically(reviewer.token, p.id, 1, {
                idempotencyKey: randomUUID(),
                ruling: "SHADOW_ELIGIBLE",
                rationaleRef: randomUUID(),
              }),
            ApprovalFoundationDenied,
          );
        },
      );
      await t.test(
        "all fixed roles still need exact approval grants; unapproved fixture policy allocations deny",
        async () => {
          const p = await proposal();
          for (const role of STAFF_ROLES.filter((r) => r !== "SUPER_ADMIN")) {
            const who = await f.actor(role);
            await f.assign(
              requester.personId,
              reviewer.personId,
              other.personId,
              who.personId,
            );
            await assert.rejects(
              () => decision(who.token, p.id),
              ApprovalFoundationDenied,
            );
          }
          const noPolicy = createIsolatedApprovalFoundation(db, {
            ...f.boundary,
            reviewer: async (...args) => ({
              ...(await f.boundary.reviewer(...args)),
              fixturePolicyRoles: [],
            }),
          });
          await assert.rejects(
            () =>
              noPolicy.decideHypothetically(reviewer.token, p.id, 1, {
                idempotencyKey: randomUUID(),
                ruling: "SHADOW_ELIGIBLE",
                rationaleRef: randomUUID(),
              }),
            ApprovalFoundationDenied,
          );
        },
      );
      await t.test(
        "participant, subject, investigator, recommender, prior-reviewer and assignment conflicts deny",
        async () => {
          const p = await proposal();
          for (const column of [
            "participants",
            "subjects",
            "investigators",
            "recommenders",
            "prior",
          ]) {
            await pg.query(
              `UPDATE "ApprovalFixtureResource" SET "${column}"=$1 WHERE id='90'`,
              [[reviewer.personId]],
            );
            await assert.rejects(
              () => decision(reviewer.token, p.id),
              ApprovalFoundationDenied,
            );
            await pg.query(
              `UPDATE "ApprovalFixtureResource" SET "${column}"='{}' WHERE id='90'`,
            );
          }
          await f.assign(requester.personId);
          await assert.rejects(
            () => decision(reviewer.token, p.id),
            ApprovalFoundationDenied,
          );
          await f.assign(requester.personId, reviewer.personId, other.personId);
        },
      );
      await t.test(
        "evidence/resource/policy drift and wrong-resource claims cannot reuse a proposal",
        async () => {
          const p = await proposal();
          for (const column of ["version", "evidenceVersion"]) {
            await pg.query(
              `UPDATE "ApprovalFixtureResource" SET "${column}"="${column}"+1 WHERE id='90'`,
            );
            await assert.rejects(
              () => decision(reviewer.token, p.id),
              ApprovalFoundationDenied,
            );
            await pg.query(
              `UPDATE "ApprovalFixtureResource" SET "${column}"="${column}"-1 WHERE id='90'`,
            );
          }
          for (const patch of [
            { resourceId: "91" },
            { policyVersion: "forged-policy" },
            { payloadDigest: "0".repeat(64) },
          ]) {
            const bad = createIsolatedApprovalFoundation(db, {
              ...f.boundary,
              reviewer: async (...args) => ({
                ...(await f.boundary.reviewer(...args)),
                ...patch,
              }),
            });
            await assert.rejects(
              () =>
                bad.decideHypothetically(reviewer.token, p.id, 1, {
                  idempotencyKey: randomUUID(),
                  ruling: "SHADOW_ELIGIBLE",
                  rationaleRef: randomUUID(),
                }),
              ApprovalFoundationDenied,
            );
          }
          await assert.rejects(() =>
            pg.query(
              `UPDATE "ApprovalFixturePayload" SET body='{}'::jsonb WHERE id=$1`,
              [input.payloadRef],
            ),
          );
        },
      );
      await t.test(
        "hypothetical match is immutable, non-authorizing, idempotent and invalidated by a new revision",
        async () => {
          const p = await proposal(),
            key = randomUUID(),
            reason = randomUUID();
          const positive = await service.decideHypothetically(
            reviewer.token,
            p.id,
            1,
            {
              idempotencyKey: key,
              ruling: "SHADOW_ELIGIBLE",
              rationaleRef: reason,
            },
          );
          assert.equal(positive.hypotheticalMatch, true);
          assert.equal(positive.authorized, false);
          assert.equal(positive.readyForActivation, false);
          assert.equal(
            (
              await service.decideHypothetically(reviewer.token, p.id, 1, {
                idempotencyKey: key,
                ruling: "SHADOW_ELIGIBLE",
                rationaleRef: reason,
              })
            ).id,
            positive.id,
          );
          assert.equal(
            (
              await db.staffChangeRequest.findUniqueOrThrow({
                where: { id: p.id },
              })
            ).state,
            "SUBMITTED",
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffApprovalDecision" SET ruling='REJECT' WHERE id=$1`,
              [positive.id],
            ),
          );
          const next = await service.revise(requester.token, p.id, 1, {
            ...input,
            audience: "PLATFORM",
            payloadRef: randomUUID(),
          });
          assert.notEqual(next.payloadHash, p.payloadHash);
          assert.equal(next.revision, 2);
          await assert.rejects(() => decision(other.token, p.id, 1));
          assert.equal(
            (
              await db.staffChangeRequest.findUniqueOrThrow({
                where: { id: p.id },
              })
            ).state,
            "DRAFT",
          );
          await service.submit(requester.token, p.id, 2);
          await assert.rejects(
            () => decision(reviewer.token, p.id, 2),
            ApprovalFoundationDenied,
          );
          await decision(other.token, p.id, 2);
        },
      );
      await t.test(
        "two real concurrent reviewers serialize and cannot create conflicting decisions",
        async () => {
          const p = await proposal();
          const results = await Promise.allSettled([
            decision(reviewer.token, p.id),
            decision(other.token, p.id, 1, "REJECT"),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            results.filter((r) => r.status === "rejected").length,
            1,
          );
          assert.equal(
            await db.staffApprovalDecision.count({
              where: { requestId: p.id, revision: 1 },
            }),
            1,
          );
        },
      );
      await t.test(
        "concurrent revisions use expected revision checks and preserve previous immutable history",
        async () => {
          const p = await proposal();
          const results = await Promise.allSettled([
            service.revise(requester.token, p.id, 1, {
              ...input,
              payloadRef: randomUUID(),
            }),
            service.revise(requester.aliases[0].token, p.id, 1, {
              ...input,
              payloadRef: randomUUID(),
            }),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            await db.staffChangeRevision.count({ where: { requestId: p.id } }),
            2,
          );
        },
      );
      await t.test(
        "audit failures atomically roll back submission, decisions, revisions and transitions",
        async () => {
          const p = await proposal();
          const before = await db.staffChangeTransition.count({
            where: { requestId: p.id },
          });
          f.setAuditFailure(true);
          try {
            await assert.rejects(
              () => decision(reviewer.token, p.id),
              /Injected fixture audit failure/,
            );
            assert.equal(
              await db.staffApprovalDecision.count({
                where: { requestId: p.id },
              }),
              0,
            );
            await assert.rejects(() =>
              service.revise(requester.token, p.id, 1, {
                ...input,
                payloadRef: randomUUID(),
              }),
            );
          } finally {
            f.setAuditFailure(false);
          }
          assert.equal(
            await db.staffChangeTransition.count({
              where: { requestId: p.id },
            }),
            before,
          );
          assert.equal(
            await db.staffChangeRevision.count({ where: { requestId: p.id } }),
            1,
          );
        },
      );
      await t.test(
        "expiry, cancellation and rejection have explicit non-executable terminal semantics",
        async () => {
          const expiring = await proposal();
          const body = await db.staffChangeRevision.findUniqueOrThrow({
            where: {
              requestId_revision: { requestId: expiring.id, revision: 1 },
            },
          });
          const expiresAt = new Date(Date.now() + 1500);
          const manifest = {
            ...JSON.parse(body.canonicalManifest),
            expiresAt: expiresAt.toISOString(),
            revision: 2,
          };
          const normalized = await db.$queryRaw<
            { canonical: string }[]
          >`SELECT ${JSON.stringify(manifest)}::jsonb::text AS canonical`;
          const canonicalManifest = normalized[0].canonical,
            payloadHash = createHash("sha256")
              .update(canonicalManifest)
              .digest("hex");
          await db.staffChangeRevision.create({
            data: {
              ...body,
              revision: 2,
              createdAt: new Date(),
              expiresAt,
              canonicalManifest,
              payloadHash,
            },
          });
          await service.submit(requester.token, expiring.id, 2);
          await db.$queryRaw`SELECT 1 AS waited FROM pg_sleep(1.6)`;
          await assert.rejects(
            () => decision(reviewer.token, expiring.id, 2),
            ApprovalFoundationDenied,
          );
          await pg.query(
            `UPDATE "StaffChangeRequest" SET state='EXPIRED' WHERE id=$1`,
            [expiring.id],
          );
          await assert.rejects(() =>
            service.revise(requester.token, expiring.id, 2, input),
          );
          const cancelled = await proposal();
          await service.cancel(requester.token, cancelled.id);
          await assert.rejects(
            () => decision(reviewer.token, cancelled.id),
            ApprovalFoundationDenied,
          );
          const rejected = await proposal(),
            key = randomUUID(),
            rationaleRef = randomUUID();
          const first = await service.decideHypothetically(
            reviewer.token,
            rejected.id,
            1,
            { idempotencyKey: key, ruling: "REJECT", rationaleRef },
          );
          assert.equal(
            (
              await db.staffChangeRequest.findUniqueOrThrow({
                where: { id: rejected.id },
              })
            ).state,
            "REJECTED",
          );
          assert.equal(
            (
              await service.decideHypothetically(
                reviewer.token,
                rejected.id,
                1,
                { idempotencyKey: key, ruling: "REJECT", rationaleRef },
              )
            ).id,
            first.id,
          );
          await assert.rejects(() => decision(other.token, rejected.id));
        },
      );
      await t.test(
        "database checks block approval rulings and forged manifests; transition history is trigger-only",
        async () => {
          const p = await proposal();
          const body = await db.staffChangeRevision.findUniqueOrThrow({
            where: { requestId_revision: { requestId: p.id, revision: 1 } },
          });
          await assert.rejects(() =>
            db.staffApprovalDecision.create({
              data: {
                id: randomUUID(),
                requestId: p.id,
                revision: 1,
                payloadHash: body.payloadHash,
                reviewerBindingId: reviewer.bindingId,
                reviewerPersonId: reviewer.personId,
                reviewerUserId: reviewer.userId,
                reviewerAuthorizationVersion: BigInt(reviewer.epoch),
                ruling: "APPROVE",
                rationaleRef: randomUUID(),
                rationaleCode: "INDEPENDENT_REVIEW",
                idempotencyKey: randomUUID(),
              },
            }),
          );
          const manifest = {
            ...JSON.parse(body.canonicalManifest),
            revision: 2,
          };
          const normalized = await db.$queryRaw<
            { canonical: string }[]
          >`SELECT ${JSON.stringify(manifest)}::jsonb::text AS canonical`;
          await assert.rejects(() =>
            db.staffChangeRevision.create({
              data: {
                ...body,
                revision: 2,
                canonicalManifest: normalized[0].canonical,
                payloadHash: "0".repeat(64),
              },
            }),
          );
          assert.equal(
            (
              await db.staffChangeRequest.findUniqueOrThrow({
                where: { id: p.id },
              })
            ).currentRevision,
            1,
          );
          await assert.rejects(() =>
            pg.query(
              `INSERT INTO "StaffChangeTransition" ("requestId","previousState","newState","previousRevision","newRevision") VALUES ($1,'DRAFT','APPROVED',1,1)`,
              [p.id],
            ),
          );
          const constraints = (
            await pg.query(
              `SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='staff_change_inactive'`,
            )
          ).rows[0].definition;
          assert.match(constraints, /APPROVED/);
          assert.match(constraints, /EXECUTED/);
        },
      );
      await t.test(
        "real data drift during required auditing rolls back hypothetical decisions",
        async () => {
          const p = await proposal();
          const drifting = createIsolatedApprovalFoundation(db, {
            ...f.boundary,
            audit: async (tx, event) => {
              await f.boundary.audit(tx, event);
              if (event.kind === "DECISION")
                await tx.$executeRaw`UPDATE "ApprovalFixtureResource" SET "evidenceVersion"="evidenceVersion"+1 WHERE id='90'`;
            },
          });
          await assert.rejects(
            () =>
              drifting.decideHypothetically(reviewer.token, p.id, 1, {
                idempotencyKey: randomUUID(),
                ruling: "SHADOW_ELIGIBLE",
                rationaleRef: randomUUID(),
              }),
            ApprovalFoundationDenied,
          );
          assert.equal(
            await db.staffApprovalDecision.count({
              where: { requestId: p.id },
            }),
            0,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT "evidenceVersion"::text FROM "ApprovalFixtureResource" WHERE id='90'`,
              )
            ).rows[0].evidenceVersion,
            "1",
          );
        },
      );
      await t.test(
        "revoked requester/reviewer grants never create eligible decisions",
        async () => {
          const p = await proposal(),
            who = await f.actor();
          await f.assign(
            requester.personId,
            reviewer.personId,
            other.personId,
            who.personId,
          );
          await pg.query(
            `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
            [who.membershipId],
          );
          await assert.rejects(() => decision(who.token, p.id));
          await pg.query(
            `UPDATE "StaffCapabilityGrant" SET state='REVOKED' WHERE id=$1`,
            [requester.grants[REQUEST_ACTION]],
          );
          await assert.rejects(
            () => decision(reviewer.token, p.id),
            ApprovalFoundationDenied,
          );
        },
      );
      await t.test(
        "no permissions, execution, booking or evidence states become accessible",
        async () => {
          assert.equal(
            await db.staffChangeRequest.count({
              where: { state: { in: ["APPROVED", "EXECUTED"] } },
            }),
            0,
          );
          assert.equal(
            await db.staffMembership.count({ where: { state: "ACTIVE" } }),
            0,
          );
          assert.equal(
            await db.staffCapabilityGrant.count({ where: { state: "ACTIVE" } }),
            0,
          );
          assert.equal(await db.user.count({ where: { role: "ADMIN" } }), 0);
          await assert.rejects(() =>
            pg.query(`TRUNCATE "StaffChangeRequest" CASCADE`),
          );
        },
      );
    } finally {
      await db.$disconnect();
      await pg.end();
    }
  },
);
