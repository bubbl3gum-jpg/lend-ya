import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStaffReadOwnership,
  staffReadPilotConfig,
  FIXTURE_POLICY,
} from "./config";
import { webAuthnRealm } from "../authorization/mfa/config";
import { logOperationalError } from "../operational-error";
export class PilotReadDenied extends Error {
  constructor() {
    super("Synthetic staff read denied");
  }
}
const fail = () => {
  throw new PilotReadDenied();
};
const live = (from: Date, to: Date) =>
  from.getTime() <= Date.now() && to.getTime() > Date.now();
export function createOwnedListingRead(
  pool: Pool,
  config: ReturnType<typeof staffReadPilotConfig>,
) {
  const realm = webAuthnRealm(config.realm);
  async function tx<T>(work: (c: PoolClient) => Promise<T>) {
    const current = staffReadPilotConfig();
    if (
      current.runId !== config.runId ||
      current.origin !== config.origin ||
      current.database.pathname !== config.database.pathname
    )
      throw new PilotReadDenied();
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `SET LOCAL lock_timeout='350ms'; SET LOCAL statement_timeout='1800ms'`,
      );
      await assertStaffReadOwnership(c, config);
      const result = await work(c);
      await c.query("COMMIT");
      return result;
    } catch (error) {
      await c.query("ROLLBACK").catch(() => {});
      if (!(error instanceof PilotReadDenied))
        logOperationalError("staff_read_fixture", error);
      throw new PilotReadDenied();
    } finally {
      c.release();
    }
  }
  async function core(c: PoolClient, token: string) {
    if (typeof token !== "string" || !token || token.length > 256)
      return fail();
    const session = (
      await c.query(
        `SELECT id,"userId","createdAt","expiresAt" FROM public."AuthSession" WHERE "tokenHash"=$1 FOR SHARE`,
        [createHash("sha256").update(token).digest("hex")],
      )
    ).rows[0];
    if (!session || session.expiresAt.getTime() <= Date.now()) return fail();
    const user = (
      await c.query(
        `SELECT id,role,"accountStatus" FROM public."User" WHERE id=$1 FOR SHARE`,
        [session.userId],
      )
    ).rows[0];
    if (!user || user.role !== "USER" || user.accountStatus !== "ACTIVE")
      return fail();
    const association = (
      await c.query(
        `SELECT id,"personId",state FROM public."StaffAccountAssociation" WHERE "userId"=$1 FOR SHARE`,
        [user.id],
      )
    ).rows[0];
    if (!association || association.state !== "VERIFIED") return fail();
    const person = (
      await c.query(
        `SELECT id,verification FROM public."StaffPerson" WHERE id=$1 FOR SHARE`,
        [association.personId],
      )
    ).rows[0];
    if (person?.verification !== "VERIFIED") return fail();
    const epoch = (
      await c.query(
        `SELECT version,"policyVersion" FROM public."StaffAuthorizationVersion" WHERE "personId"=$1 FOR SHARE`,
        [person.id],
      )
    ).rows[0];
    if (epoch?.policyVersion !== "hustlen-admin-shadow-v1") return fail();
    const member = (
      await c.query(
        `SELECT * FROM hustlen_staff_read_fixture.member WHERE "userId"=$1 FOR SHARE`,
        [user.id],
      )
    ).rows[0];
    if (
      !member ||
      member.personId !== person.id ||
      member.associationId !== association.id ||
      member.kind !== "OWNED_SYNTHETIC_HUMAN" ||
      member.policy !== FIXTURE_POLICY ||
      member.role !== "OPERATIONS" ||
      member.state !== "TEST_ACTIVE" ||
      !live(member.validFrom, member.expiresAt)
    )
      return fail();
    const draft = (
      await c.query(
        `SELECT id,"personId",role,state,"policyVersion","validFrom","expiresAt" FROM public."StaffMembership" WHERE id=$1 FOR SHARE`,
        [member.draftMembershipId],
      )
    ).rows[0];
    if (
      !draft ||
      draft.personId !== person.id ||
      draft.role !== "OPERATIONS" ||
      draft.state !== "DRAFT" ||
      draft.policyVersion !== epoch.policyVersion ||
      !live(draft.validFrom, draft.expiresAt)
    )
      return fail();
    return {
      session,
      user,
      association,
      person,
      epoch,
      member,
      draftExpiresAt: draft.expiresAt,
    };
  }
  async function proof(
    c: PoolClient,
    a: Awaited<ReturnType<typeof core>>,
    id: string,
  ) {
    const p = (
      await c.query(`SELECT * FROM public."StaffMfaAssurance" WHERE id=$1`, [
        id,
      ])
    ).rows[0];
    const mv = (
      await c.query(
        `SELECT version FROM public."StaffMfaVersion" WHERE "associationId"=$1 FOR SHARE`,
        [a.association.id],
      )
    ).rows[0];
    if (
      !p ||
      !mv ||
      p.associationId !== a.association.id ||
      p.authSessionId !== a.session.id ||
      p.authSessionCreatedAt.getTime() !== a.session.createdAt.getTime() ||
      p.authorizationVersion !== a.epoch.version ||
      p.mfaVersion !== mv.version ||
      p.policyVersion !== a.epoch.policyVersion ||
      p.configHash !== realm.configHash ||
      p.assurance !== "WEBAUTHN_UV" ||
      !live(p.verifiedAt, p.expiresAt)
    )
      return fail();
    const key = (
      await c.query(
        `SELECT id,"associationId","rpId","revokedAt" FROM public."StaffMfaCredential" WHERE id=$1 FOR SHARE`,
        [p.credentialKey],
      )
    ).rows[0];
    if (
      !key ||
      key.associationId !== a.association.id ||
      key.rpId !== realm.rpId ||
      key.revokedAt
    )
      return fail();
    return p;
  }
  return {
    admission: (token: string) => tx((c) => core(c, token).then(() => true)),
    bind: (token: string, assuranceId: string) =>
      tx(async (c) => {
        const a = await core(c, token),
          p = await proof(c, a, assuranceId),
          id = randomUUID();
        await c.query(
          `INSERT INTO hustlen_staff_read_fixture.binding (id,"memberId","memberVersion","assuranceId","sessionId","sessionBorn",epoch,"expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            id,
            a.member.id,
            a.member.version,
            p.id,
            a.session.id,
            a.session.createdAt,
            a.epoch.version,
            new Date(
              Math.min(
                p.expiresAt.getTime(),
                a.member.expiresAt.getTime(),
                a.draftExpiresAt.getTime(),
                a.session.expiresAt.getTime(),
              ),
            ),
          ],
        );
        return id;
      }),
    read: (token: string, bindingId: string, listingId: number) =>
      tx(async (c) => {
        const a = await core(c, token);
        const binding = (
          await c.query(
            `SELECT * FROM hustlen_staff_read_fixture.binding WHERE id=$1`,
            [bindingId],
          )
        ).rows[0];
        if (
          !binding ||
          binding.memberId !== a.member.id ||
          binding.memberVersion !== a.member.version ||
          binding.sessionId !== a.session.id ||
          binding.sessionBorn.getTime() !== a.session.createdAt.getTime() ||
          binding.epoch !== a.epoch.version ||
          binding.expiresAt.getTime() <= Date.now()
        )
          return fail();
        const p = await proof(c, a, binding.assuranceId);
        // Exact grant first: no Listing selection/count/existence query precedes it.
        const grant = (
          await c.query(
            `SELECT * FROM hustlen_staff_read_fixture.grant WHERE "memberId"=$1 AND "listingId"=$2 FOR SHARE`,
            [a.member.id, listingId],
          )
        ).rows[0];
        if (
          !grant ||
          grant.action !== "listings.read" ||
          grant.policy !== FIXTURE_POLICY ||
          grant.state !== "TEST_ACTIVE" ||
          !live(grant.validFrom, grant.expiresAt)
        )
          return fail();
        const dg = (
          await c.query(
            `SELECT id,"membershipId",state,"policyVersion",action,scope,"resourceKind","resourceId","purposeCode","validFrom","expiresAt" FROM public."StaffCapabilityGrant" WHERE id=$1 FOR SHARE`,
            [grant.draftGrantId],
          )
        ).rows[0];
        if (
          !dg ||
          dg.membershipId !== a.member.draftMembershipId ||
          dg.state !== "DRAFT" ||
          dg.policyVersion !== a.epoch.policyVersion ||
          dg.action !== "listings.read" ||
          dg.scope !== "RESOURCE" ||
          dg.resourceKind !== "listing" ||
          dg.resourceId !== String(listingId) ||
          dg.purposeCode !== "OPERATIONS_METADATA" ||
          !live(dg.validFrom, dg.expiresAt)
        )
          return fail();
        const row = (
          await c.query(
            `SELECT id,status,category,"adminRestricted" FROM public."Listing" WHERE id=$1 AND "ownerId"<>$2 AND NOT EXISTS(SELECT 1 FROM public."StaffAccountAssociation" alias WHERE alias."userId"="Listing"."ownerId" AND alias."personId"=$3) FOR SHARE`,
            [listingId, a.user.id, a.person.id],
          )
        ).rows[0];
        if (!row) return fail();
        const correlation = randomUUID();
        await c.query(
          `INSERT INTO hustlen_staff_read_fixture.audit ("correlationId","userId","personId","associationId","sessionId","sessionBorn","memberId","memberVersion","grantId","grantVersion","bindingId","assuranceId",epoch,"mfaVersion","listingId","resourceVersion",policy,action,result) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'listings.read','TEST_ACCESS_COMMITTED')`,
          [
            correlation,
            a.user.id,
            a.person.id,
            a.association.id,
            a.session.id,
            a.session.createdAt,
            a.member.id,
            a.member.version,
            grant.id,
            grant.version,
            binding.id,
            p.id,
            a.epoch.version,
            p.mfaVersion,
            listingId,
            createHash("sha256")
              .update(
                JSON.stringify([
                  row.id,
                  row.status,
                  row.category,
                  row.adminRestricted,
                ]),
              )
              .digest("hex"),
            FIXTURE_POLICY,
          ],
        );
        // Locks fence all mutable authority rows; recheck wall-clock bounds after audit.
        const deadlines = [
          a.session.expiresAt,
          a.member.expiresAt,
          a.draftExpiresAt,
          binding.expiresAt,
          p.expiresAt,
          grant.expiresAt,
          dg.expiresAt,
        ];
        if (deadlines.some((d) => d.getTime() <= Date.now())) return fail();
        const current = (
          await c.query(
            `SELECT m.version,g.version AS "grantVersion",v.version AS epoch FROM hustlen_staff_read_fixture.member m JOIN hustlen_staff_read_fixture.grant g ON g.id=$2 JOIN public."StaffAuthorizationVersion" v ON v."personId"=m."personId" WHERE m.id=$1`,
            [a.member.id, grant.id],
          )
        ).rows[0];
        if (
          current.version !== a.member.version ||
          current.grantVersion !== grant.version ||
          current.epoch !== a.epoch.version
        )
          return fail();
        return {
          id: row.id,
          status: row.status,
          category: row.category,
          adminRestricted: row.adminRestricted,
        };
      }),
  };
}
