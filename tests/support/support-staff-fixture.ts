import { randomBytes, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { principalFixture } from "./database-principals";
import { mfaActorFixture } from "./mfa-fixtures";
import {
  assertOwnedDatabase,
  connectTestDatabaseTarget,
  testDatabaseUrl,
} from "./test-database";
import { webAuthnRealm } from "../../lib/authorization/mfa/config";
export async function supportStaffFixture(owner: Client, origin: string) {
  const url = testDatabaseUrl(process.env.TEST_DATABASE_URL),
    runId = process.env.MRT_TEST_RUN_ID!;
  await assertOwnedDatabase(owner, url, runId);
  const requester = await mfaActorFixture(owner),
    borrower = await mfaActorFixture(owner),
    outsider = await mfaActorFixture(owner),
    issuer = await mfaActorFixture(owner);
  const listing = (
    await owner.query(
      `INSERT INTO "Listing"("ownerId",title,description,category,price,condition,status,"updatedAt") VALUES($1,'Synthetic support listing','Private listing canary','Cameras',10,'Good','ACTIVE',NOW()) RETURNING id`,
      [requester.userId],
    )
  ).rows[0].id;
  const station = (
    await owner.query(
      `INSERT INTO "MrtStation"(code,name)VALUES('B8D','Synthetic test fixture') RETURNING id`,
    )
  ).rows[0].id;
  const booking = (
    await owner.query(
      `INSERT INTO "Booking"("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt")VALUES($1,$2,$3,$4,NOW(),NOW()+interval '1 day','CONFIRMED',10,10,NOW())RETURNING id`,
      [listing, requester.userId, borrower.userId, station],
    )
  ).rows[0].id;
  const profile = await principalFixture(owner),
    name = `h8d_${runId.slice(0, 16)}_support`,
    binding = new URL(url);
  binding.username = name;
  binding.password = randomBytes(32).toString("base64url");
  const q = (v: string) => '"' + v.replaceAll('"', '""') + '"';
  let created = false;
  async function cleanup() {
    await assertOwnedDatabase(owner, url, runId);
    await owner.query(
      `DROP SCHEMA IF EXISTS hustlen_support_candidate CASCADE`,
    );
    if (created)
      await owner.query(
        `DROP OWNED BY ${q(name)} CASCADE; DROP ROLE ${q(name)}`,
      );
    await profile.cleanup();
  }
  try {
    await owner.query(
      `CREATE ROLE ${q(name)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${binding.password}' VALID UNTIL '${new Date(Date.now() + 1800000).toISOString()}'`,
    );
    created = true;
    await owner.query(
      `COMMENT ON ROLE ${q(name)} IS 'hustlen-support-principal:${runId}'; GRANT CONNECT ON DATABASE ${q(url.pathname.slice(1))} TO ${q(name)};GRANT USAGE ON SCHEMA public,hustlen_support_candidate TO ${q(name)};GRANT USAGE ON SCHEMA hustlen_support_candidate TO ${q(profile.names.runtime)},${q(profile.names.mfa)}`,
    );
    // Session issuance is separated from the ordinary application credential. No
    // insert of chosen session ID/birth or direct password/account replacement.
    await owner.query(
      `REVOKE INSERT,UPDATE ON "AuthSession" FROM ${q(profile.names.runtime)};GRANT INSERT ON "AuthSession" TO ${q(profile.names.mfa)};GRANT USAGE,SELECT ON SEQUENCE "AuthSession_id_seq" TO ${q(profile.names.mfa)}`,
    );
    const userColumns = (
      await owner.query(
        `SELECT attname FROM pg_attribute WHERE attrelid='public."User"'::regclass AND attnum>0 AND NOT attisdropped`,
      )
    ).rows.map((r) => q(r.attname));
    await owner.query(
      `REVOKE UPDATE ON "User" FROM ${q(profile.names.runtime)};REVOKE UPDATE(${userColumns.join(",")}) ON "User" FROM ${q(profile.names.runtime)}`,
    );
    const realm = webAuthnRealm({
      rpId: "localhost",
      origin,
      rpName: "Hustlen' owned Support candidate",
    });
    await owner.query(
      `INSERT INTO hustlen_support_candidate.configuration("runId","configHash","runtimeRole","workerRole","expiresAt","ticketLimit","messageLimit") VALUES($1,$2,$3,$4,NOW()+interval '1 hour',12,30)`,
      [runId, realm.configHash, profile.names.runtime, name],
    );
    for (const a of [requester, borrower, outsider])
      await owner.query(
        `INSERT INTO hustlen_support_candidate.requester("userId")VALUES($1)`,
        [a.userId],
      );
    for (const { tablename } of (
      await owner.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='hustlen_support_candidate'`,
      )
    ).rows)
      await owner.query(
        `ALTER TABLE hustlen_support_candidate.${q(tablename)} OWNER TO ${q(profile.names.migration)}`,
      );
    for (const { sequencename } of (
      await owner.query(
        `SELECT sequencename FROM pg_sequences WHERE schemaname='hustlen_support_candidate'`,
      )
    ).rows)
      await owner.query(
        `ALTER SEQUENCE hustlen_support_candidate.${q(sequencename)} OWNER TO ${q(profile.names.migration)}`,
      );
    for (const { signature } of (
      await owner.query(
        `SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='hustlen_support_candidate'`,
      )
    ).rows)
      await owner.query(
        `ALTER FUNCTION ${signature} OWNER TO ${q(profile.names.migration)}`,
      );
    await owner.query(
      `ALTER SCHEMA hustlen_support_candidate OWNER TO ${q(profile.names.migration)};GRANT EXECUTE ON FUNCTION hustlen_support_candidate.requester_request(text,jsonb) TO ${q(profile.names.runtime)};GRANT EXECUTE ON FUNCTION hustlen_support_candidate.login_ready(),hustlen_support_candidate.admit(text),hustlen_support_candidate.bind(text,uuid),hustlen_support_candidate.staff_request(text,jsonb) TO ${q(name)}`,
    );
    async function agent(existingPerson?: string) {
      const actor = await mfaActorFixture(owner, existingPerson),
        member = randomUUID(),
        draft = randomUUID();
      await owner.query(
        `INSERT INTO "StaffMembership"(id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt")VALUES($1,$2,'SUPPORT',$3,$4,'hustlen-admin-shadow-v1',NOW(),NOW()+interval '1 hour')`,
        [draft, actor.personId, issuer.personId, randomUUID()],
      );
      await owner.query(
        `INSERT INTO hustlen_support_candidate.member(id,"userId","personId","associationId","draftMembershipId",state,policy,"validFrom","expiresAt")VALUES($1,$2,$3,$4,$5,'TEST_ACTIVE','support-scoped-owned-8d-v1',NOW(),NOW()+interval '1 hour')`,
        [member, actor.userId, actor.personId, actor.associationId, draft],
      );
      return { ...actor, member, draft };
    }
    async function assign(
      a: { member: string },
      ticket: string,
      channel: string,
      actions = [
        "ticket.metadata.read",
        "ticket.events.read",
        "channel.read",
        "channel.reply",
      ],
      issuedBy = issuer.personId,
    ) {
      await assertOwnedDatabase(owner, url, runId);
      const assignment = randomUUID();
      await owner.query(
        `INSERT INTO hustlen_support_candidate.assignment(id,"ticketId","memberId","issuedByPersonId","provenanceRef",state,"validFrom","expiresAt")VALUES($1,$2,$3,$4,$5,'TEST_ACTIVE',NOW(),NOW()+interval '40 minutes')`,
        [assignment, ticket, a.member, issuedBy, randomUUID()],
      );
      const grants: Record<string, string> = {};
      for (const action of actions) {
        const id = randomUUID();
        await owner.query(
          `INSERT INTO hustlen_support_candidate.channel_grant(id,"assignmentId","ticketId","channelId",action,"issuedByPersonId","provenanceRef",state,"validFrom","expiresAt")VALUES($1,$2,$3,$4,$5,$6,$7,'TEST_ACTIVE',NOW(),NOW()+interval '35 minutes')`,
          [
            id,
            assignment,
            ticket,
            action.startsWith("channel.") ? channel : null,
            action,
            issuedBy,
            randomUUID(),
          ],
        );
        grants[action] = id;
      }
      return { assignment, grants };
    }
    async function revoke(
      table: "assignment" | "channel_grant" | "member",
      id: string,
    ) {
      await assertOwnedDatabase(owner, url, runId);
      await owner.query(
        `UPDATE hustlen_support_candidate.${table} SET state='TEST_REVOKED',"revokedAt"=clock_timestamp(),"revokedByPersonId"=$2,"revocationRef"=$3 WHERE id=$1`,
        [id, issuer.personId, randomUUID()],
      );
    }
    return {
      profile,
      supportUrl: binding.toString(),
      requester,
      borrower,
      outsider,
      issuer,
      booking,
      listing,
      agent,
      assign,
      revoke,
      cleanup,
      async supportClient() {
        return connectTestDatabaseTarget(binding);
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
