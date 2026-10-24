import { createHash, randomUUID } from "node:crypto";
import type { Client } from "pg";
import {
  CAPABILITIES,
  POLICY_VERSION,
  type StaffRole,
} from "../../lib/authorization/registry";
import {
  APPROVAL_POLICY_VERSION,
  type FixtureReviewFacts,
} from "../../lib/authorization/approvals/candidate";
import type { ApprovalFixtureBoundary } from "../../lib/authorization/approvals/service";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const REQUEST_ACTION = "users.serious_sanction.request";
export const REVIEW_ACTION = "users.serious_sanction.approve";
export async function approvalFixtures(pg: Client) {
  const issuer = randomUUID();
  await pg.query(`CREATE TABLE "ApprovalFixtureResource" (id text PRIMARY KEY,kind text NOT NULL,version bigint NOT NULL,"evidenceVersion" bigint NOT NULL,"assignedPersons" uuid[] NOT NULL,participants uuid[] NOT NULL,subjects uuid[] NOT NULL,investigators uuid[] NOT NULL,recommenders uuid[] NOT NULL,prior uuid[] NOT NULL); INSERT INTO "ApprovalFixtureResource" VALUES ('90','user',1,1,'{}','{}','{}','{}','{}','{}');
 CREATE TABLE "ApprovalFixturePayload" (id uuid PRIMARY KEY, body jsonb NOT NULL, digest text NOT NULL CHECK(digest=encode(sha256(convert_to(body::text,'UTF8')),'hex'))); CREATE TRIGGER approval_payload_immutable BEFORE UPDATE OR DELETE ON "ApprovalFixturePayload" FOR EACH ROW EXECUTE FUNCTION hustlen_staff_immutable();
 CREATE TABLE "ApprovalFixtureAssurance" ("bindingId" uuid PRIMARY KEY,kind text NOT NULL,"verifiedAt" timestamptz NOT NULL,"expiresAt" timestamptz NOT NULL);
 CREATE TABLE "ApprovalFixtureAudit" ("correlationId" uuid,"requestId" uuid,revision int,"personId" uuid,"userId" int,"bindingId" uuid,kind text);`);
  await pg.query(
    `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
    [issuer, digest(issuer), randomUUID()],
  );
  async function actor(role: StaffRole = "SUPER_ADMIN", aliasCount = 0) {
    const personId = randomUUID(),
      membershipId = randomUUID();
    await pg.query(
      `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
      [personId, digest(personId), randomUUID()],
    );
    const accounts = [];
    for (let i = 0; i <= aliasCount; i++) {
      const associationId = randomUUID(),
        token = randomUUID();
      const userId = (
        await pg.query(
          `INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES ('Synthetic approval reviewer',$1,'no-login',NOW()) RETURNING id`,
          [randomUUID() + "@fixture.test"],
        )
      ).rows[0].id;
      await pg.query(
        `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,$3,'VERIFIED',$4,NOW())`,
        [associationId, personId, userId, randomUUID()],
      );
      const sessionId = (
        await pg.query(
          `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour') RETURNING id`,
          [userId, digest(token)],
        )
      ).rows[0].id;
      accounts.push({ associationId, token, userId, sessionId });
    }
    await pg.query(
      `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()-interval '1 minute',NOW()+interval '1 day')`,
      [membershipId, personId, role, issuer, randomUUID(), POLICY_VERSION],
    );
    const grants: Record<string, string> = {};
    for (const action of [REQUEST_ACTION, REVIEW_ACTION]) {
      if (!CAPABILITIES[action].roles.includes(role)) continue;
      grants[action] = randomUUID();
      await pg.query(
        `INSERT INTO "StaffCapabilityGrant" (id,"membershipId",action,"policyVersion",scope,"resourceKind","resourceId","caseId","purposeCode","issuedByPersonId","provenanceRef","validFrom","expiresAt") VALUES ($1,$2,$3,$4,'ASSIGNED_CASE','user','90','90','INDEPENDENT_REVIEW',$5,$6,NOW()-interval '1 minute',NOW()+interval '30 minutes')`,
        [
          grants[action],
          membershipId,
          action,
          POLICY_VERSION,
          issuer,
          randomUUID(),
        ],
      );
    }
    const epoch = (
      await pg.query(
        `SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
        [personId],
      )
    ).rows[0].version;
    const credentials = [];
    for (const a of accounts) {
      const stepId = randomUUID(),
        bindingId = randomUUID();
      await pg.query(
        `INSERT INTO "StaffStepUpRecord" (id,"associationId","authSessionId","authSessionCreatedAt",assurance,"issuerRef","proofRef","authenticatedAt","expiresAt") SELECT $1,$2,id,"createdAt",'MFA',$3,$4,NOW()-interval '1 minute',NOW()+interval '10 minutes' FROM "AuthSession" WHERE id=$5`,
        [stepId, a.associationId, randomUUID(), randomUUID(), a.sessionId],
      );
      await pg.query(
        `INSERT INTO "StaffSessionBinding" (id,"authSessionId","authSessionCreatedAt","associationId","membershipId","stepUpId","authorizationVersion","policyVersion","expiresAt","provenanceRef") SELECT $1,id,"createdAt",$2,$3,$4,$5,$6,NOW()+interval '5 minutes',$7 FROM "AuthSession" WHERE id=$8`,
        [
          bindingId,
          a.associationId,
          membershipId,
          stepId,
          epoch,
          POLICY_VERSION,
          randomUUID(),
          a.sessionId,
        ],
      );
      await pg.query(
        `INSERT INTO "ApprovalFixtureAssurance" VALUES ($1,'VERIFIED_FIXTURE',NOW(),NOW()+interval '5 minutes')`,
        [bindingId],
      );
      credentials.push({ ...a, bindingId, stepId });
    }
    return {
      personId,
      membershipId,
      grants,
      epoch,
      ...credentials[0],
      aliases: credentials.slice(1),
    };
  }
  let auditFails = false,
    beforeAudit: (() => Promise<void>) | null = null;
  const boundary: ApprovalFixtureBoundary = {
    async resource(tx, who, input) {
      const rows = await tx.$queryRaw<
        {
          id: string;
          kind: string;
          version: bigint;
          evidenceVersion: bigint;
          assignedPersons: string[];
          participants: string[];
          subjects: string[];
        }[]
      >`SELECT id,kind,version,"evidenceVersion","assignedPersons",participants,subjects FROM "ApprovalFixtureResource" WHERE id=${input.resourceId} FOR SHARE`;
      const r = rows[0];
      if (
        !r ||
        !r.assignedPersons.includes(who.personId) ||
        r.participants.includes(who.personId) ||
        r.subjects.includes(who.personId)
      )
        throw Error("Fixture scope denied");
      // Sealed synthetic provider: never a production payload writer. The digest
      // binds actual immutable reference-only content in this owned fixture.
      await tx.$executeRaw`WITH payload AS (SELECT jsonb_build_object('intent','SAFETY_REVIEW_FIXTURE','reference',${input.payloadRef}::text) AS body) INSERT INTO "ApprovalFixturePayload" (id,body,digest) SELECT ${input.payloadRef}::uuid,body,encode(sha256(convert_to(body::text,'UTF8')),'hex') FROM payload ON CONFLICT DO NOTHING`;
      const payload = await tx.$queryRaw<
        { digest: string }[]
      >`SELECT digest FROM "ApprovalFixturePayload" WHERE id=${input.payloadRef}::uuid`;
      return {
        payloadDigest: payload[0].digest,
        resourceKind: r.kind,
        resourceId: r.id,
        resourceVersion: r.version,
        evidenceVersion: r.evidenceVersion,
        caseId: r.id,
      };
    },
    async reviewer(tx, who, proposal) {
      const rows = await tx.$queryRaw<
        {
          id: string;
          kind: string;
          version: bigint;
          evidenceVersion: bigint;
          assignedPersons: string[];
          participants: string[];
          subjects: string[];
          investigators: string[];
          recommenders: string[];
          prior: string[];
        }[]
      >`SELECT * FROM "ApprovalFixtureResource" WHERE id=${proposal.resourceId} FOR SHARE`;
      const r = rows[0];
      if (!r) throw Error("Fixture resource absent");
      const assurance = await tx.$queryRaw<
        {
          kind: "PENDING" | "VERIFIED_FIXTURE";
          verifiedAt: Date;
          expiresAt: Date;
        }[]
      >`SELECT kind,"verifiedAt","expiresAt" FROM "ApprovalFixtureAssurance" WHERE "bindingId"=${who.bindingId}::uuid FOR SHARE`;
      const current = await tx.$queryRaw<
        { eligible: boolean }[]
      >`SELECT EXISTS(SELECT 1 FROM "StaffChangeRequest" q JOIN "StaffSessionBinding" b ON b.id=q."requesterBindingId" JOIN "StaffMembership" m ON m.id=b."membershipId" JOIN "StaffAccountAssociation" a ON a.id=b."associationId" JOIN "StaffPerson" p ON p.id=a."personId" JOIN "StaffAuthorizationVersion" v ON v."personId"=p.id JOIN "AuthSession" s ON s.id=b."authSessionId" JOIN "StaffStepUpRecord" u ON u.id=b."stepUpId" JOIN "User" account ON account.id=a."userId" WHERE q.id=${proposal.requestId}::uuid AND q."requesterPersonId"=${proposal.requesterPersonId}::uuid AND EXISTS (SELECT 1 FROM "StaffCapabilityGrant" g WHERE g."membershipId"=m.id AND g.action=q.action AND g.state='DRAFT' AND g."resourceId"=${proposal.resourceId} AND g."resourceKind"=q."resourceKind" AND g."validFrom"<=clock_timestamp() AND g."expiresAt">clock_timestamp()) AND m.state='DRAFT' AND p.verification='VERIFIED' AND a.state='VERIFIED' AND v.version=b."authorizationVersion" AND b.state='PENDING' AND b."expiresAt">clock_timestamp() AND s."expiresAt">clock_timestamp() AND s."createdAt"=b."authSessionCreatedAt" AND u.state='PENDING' AND u."expiresAt">clock_timestamp() AND account."accountStatus"='ACTIVE') AS eligible`;
      const payload = await tx.$queryRaw<
        { digest: string }[]
      >`SELECT digest FROM "ApprovalFixturePayload" WHERE id=${proposal.payloadRef}::uuid`;
      return {
        payloadDigest: payload[0]?.digest ?? "",
        fixturePolicyVersion: APPROVAL_POLICY_VERSION,
        fixturePolicyRoles: ["SUPER_ADMIN"],
        resourceKind: r.kind,
        resourceId: r.id,
        resourceVersion: r.version,
        evidenceVersion: r.evidenceVersion,
        policyVersion: POLICY_VERSION,
        caseId: r.id,
        assignedPersonIds: r.assignedPersons,
        participantPersonIds: r.participants,
        participantUserIds: [],
        subjectPersonIds: r.subjects,
        investigatorPersonIds: r.investigators,
        recommenderPersonIds: r.recommenders,
        priorReviewerPersonIds: r.prior,
        requesterStillEligible:
          current[0].eligible &&
          r.assignedPersons.includes(proposal.requesterPersonId) &&
          !r.participants.includes(proposal.requesterPersonId) &&
          !r.subjects.includes(proposal.requesterPersonId),
        assurance: {
          kind: assurance[0]?.kind ?? "PENDING",
          personId: who.personId,
          userId: who.userId,
          bindingId: who.bindingId,
          authorizationVersion: who.authorizationVersion,
          policyVersion: who.policyVersion,
          verifiedAt: assurance[0]?.verifiedAt.getTime() ?? 0,
          expiresAt: assurance[0]?.expiresAt.getTime() ?? 0,
        },
      } satisfies FixtureReviewFacts;
    },
    async audit(tx, event) {
      if (auditFails) throw Error("Injected fixture audit failure");
      if (beforeAudit) await beforeAudit();
      await tx.$executeRaw`INSERT INTO "ApprovalFixtureAudit" VALUES (${event.correlationId}::uuid,${event.requestId}::uuid,${event.revision},${event.personId}::uuid,${event.userId},${event.bindingId}::uuid,${event.kind})`;
    },
  };
  return {
    actor,
    boundary,
    setAuditFailure: (v: boolean) => {
      auditFails = v;
    },
    setAuditBarrier: (fn: (() => Promise<void>) | null) => {
      beforeAudit = fn;
    },
    async assign(...persons: string[]) {
      await pg.query(
        `UPDATE "ApprovalFixtureResource" SET "assignedPersons"=$1 WHERE id='90'`,
        [persons],
      );
    },
  };
}
