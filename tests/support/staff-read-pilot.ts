import { randomBytes, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { principalFixture } from "./database-principals";
import {
  connectTestDatabaseTarget,
  assertOwnedDatabase,
  testDatabaseUrl,
} from "./test-database";
import { mfaActorFixture } from "./mfa-fixtures";
export async function staffReadFixture(owner: Client) {
  const url = testDatabaseUrl(process.env.TEST_DATABASE_URL),
    runId = process.env.MRT_TEST_RUN_ID!;
  await assertOwnedDatabase(owner, url, runId);
  const ownerActor = await mfaActorFixture(owner),
    issuer = await mfaActorFixture(owner);
  const listing = (
    await owner.query(
      `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'PRIVATE_TITLE_CANARY','PRIVATE_DESCRIPTION_CANARY','Cameras',10,'Good',NOW()) RETURNING id`,
      [ownerActor.userId],
    )
  ).rows[0].id;
  const outside = (
    await owner.query(
      `INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,'OUTSIDE_TITLE','OUTSIDE_DESCRIPTION','Private outside',10,'Good',NOW()) RETURNING id`,
      [ownerActor.userId],
    )
  ).rows[0].id;
  const profile = await principalFixture(owner),
    name = `h6a_${runId.slice(0, 16)}_read_audit`,
    binding = new URL(url);
  binding.username = name;
  binding.password = randomBytes(32).toString("base64url");
  const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  let readerCreated = false;
  async function cleanup() {
    await assertOwnedDatabase(owner, url, runId);
    await owner.query(
      `DROP SCHEMA IF EXISTS hustlen_staff_read_fixture CASCADE; DROP POLICY IF EXISTS staff_read_fixture_identity ON "User"; DROP POLICY IF EXISTS staff_read_fixture_lock ON "User"`,
    );
    if (readerCreated) {
      await owner.query(
        `DROP OWNED BY ${quote(name)} CASCADE; DROP ROLE ${quote(name)}`,
      );
    }
    await profile.cleanup();
  }
  try {
    await owner.query(
      `CREATE ROLE ${quote(name)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${binding.password}' VALID UNTIL '${new Date(Date.now() + 1800000).toISOString()}'`,
    );
    readerCreated = true;
    await owner.query(
      `COMMENT ON ROLE ${quote(name)} IS 'hustlen-staff-read-principal:${runId}'; GRANT CONNECT ON DATABASE ${quote(url.pathname.slice(1))} TO ${quote(name)}; GRANT USAGE ON SCHEMA public TO ${quote(name)}`,
    );
    await owner.query(`CREATE SCHEMA hustlen_staff_read_fixture; COMMENT ON SCHEMA hustlen_staff_read_fixture IS 'hustlen-staff-read-fixture:${runId}';
 CREATE TABLE hustlen_staff_read_fixture.member(id uuid PRIMARY KEY,"userId" integer UNIQUE NOT NULL REFERENCES public."User", "personId" uuid NOT NULL REFERENCES public."StaffPerson", "associationId" uuid NOT NULL REFERENCES public."StaffAccountAssociation", "draftMembershipId" uuid NOT NULL REFERENCES public."StaffMembership",kind text NOT NULL CHECK(kind='OWNED_SYNTHETIC_HUMAN'),policy text NOT NULL CHECK(policy='hustlen-listing-read-fixture-v1'),role text NOT NULL,state text NOT NULL CHECK(state IN ('TEST_ACTIVE','TEST_REVOKED')),version bigint NOT NULL DEFAULT 1 CHECK(version>0),"validFrom" timestamp(3) NOT NULL,"expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"validFrom"));
 CREATE TABLE hustlen_staff_read_fixture.grant(id uuid PRIMARY KEY,"memberId" uuid NOT NULL REFERENCES hustlen_staff_read_fixture.member,"listingId" integer NOT NULL REFERENCES public."Listing","draftGrantId" uuid NOT NULL REFERENCES public."StaffCapabilityGrant",action text NOT NULL CHECK(action='listings.read'),policy text NOT NULL CHECK(policy='hustlen-listing-read-fixture-v1'),state text NOT NULL CHECK(state IN ('TEST_ACTIVE','TEST_REVOKED')),version bigint NOT NULL DEFAULT 1 CHECK(version>0),"validFrom" timestamp(3) NOT NULL,"expiresAt" timestamp(3) NOT NULL CHECK("expiresAt">"validFrom"),UNIQUE("memberId","listingId"));
 CREATE TABLE hustlen_staff_read_fixture.binding(id uuid PRIMARY KEY,"memberId" uuid NOT NULL REFERENCES hustlen_staff_read_fixture.member,"memberVersion" bigint NOT NULL,"assuranceId" uuid UNIQUE NOT NULL REFERENCES public."StaffMfaAssurance","sessionId" integer NOT NULL,"sessionBorn" timestamp(3) NOT NULL,epoch bigint NOT NULL,"expiresAt" timestamp(3) NOT NULL);
 CREATE TABLE hustlen_staff_read_fixture.audit(id bigserial PRIMARY KEY,"correlationId" uuid UNIQUE NOT NULL,"userId" integer NOT NULL,"personId" uuid NOT NULL,"associationId" uuid NOT NULL,"sessionId" integer NOT NULL,"sessionBorn" timestamp(3) NOT NULL,"memberId" uuid NOT NULL REFERENCES hustlen_staff_read_fixture.member,"memberVersion" bigint NOT NULL,"grantId" uuid NOT NULL REFERENCES hustlen_staff_read_fixture.grant,"grantVersion" bigint NOT NULL,"bindingId" uuid NOT NULL REFERENCES hustlen_staff_read_fixture.binding,"assuranceId" uuid NOT NULL REFERENCES public."StaffMfaAssurance",epoch bigint NOT NULL,"mfaVersion" bigint NOT NULL,"listingId" integer NOT NULL,"resourceVersion" varchar(64) NOT NULL,policy varchar(80) NOT NULL CHECK(policy='hustlen-listing-read-fixture-v1'),action varchar(40) NOT NULL CHECK(action='listings.read'),result varchar(32) NOT NULL CHECK(result='TEST_ACCESS_COMMITTED'),"databaseActor" name NOT NULL DEFAULT CURRENT_USER,"createdAt" timestamp(3) NOT NULL DEFAULT clock_timestamp());
 CREATE FUNCTION hustlen_staff_read_fixture.bump() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.version:=OLD.version+1; RETURN NEW; END $$;
 CREATE TRIGGER member_version BEFORE UPDATE ON hustlen_staff_read_fixture.member FOR EACH ROW EXECUTE FUNCTION hustlen_staff_read_fixture.bump();
 CREATE TRIGGER grant_version BEFORE UPDATE ON hustlen_staff_read_fixture.grant FOR EACH ROW EXECUTE FUNCTION hustlen_staff_read_fixture.bump();
 CREATE TRIGGER binding_immutable BEFORE UPDATE OR DELETE ON hustlen_staff_read_fixture.binding FOR EACH ROW EXECUTE FUNCTION public.hustlen_staff_immutable();
 CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON hustlen_staff_read_fixture.audit FOR EACH ROW EXECUTE FUNCTION public.hustlen_staff_immutable();
 CREATE FUNCTION hustlen_staff_read_fixture.no_truncate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test access history cannot be truncated'; END $$;
 CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON hustlen_staff_read_fixture.audit FOR EACH STATEMENT EXECUTE FUNCTION hustlen_staff_read_fixture.no_truncate();
 REVOKE ALL ON SCHEMA hustlen_staff_read_fixture FROM PUBLIC; REVOKE ALL ON ALL TABLES IN SCHEMA hustlen_staff_read_fixture FROM PUBLIC; REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hustlen_staff_read_fixture FROM PUBLIC;`);
    for (const table of [
      "AuthSession",
      "StaffPerson",
      "StaffAccountAssociation",
      "StaffAuthorizationVersion",
      "StaffMembership",
      "StaffCapabilityGrant",
      "StaffMfaVersion",
      "StaffMfaAssurance",
      "StaffMfaCredential",
    ])
      await owner.query(`GRANT SELECT ON ${quote(table)} TO ${quote(name)}`);
    await owner.query(
      `GRANT SELECT(id,role,"accountStatus") ON "User" TO ${quote(name)}; CREATE POLICY staff_read_fixture_identity ON "User" FOR SELECT TO ${quote(name)} USING(true); CREATE POLICY staff_read_fixture_lock ON "User" FOR UPDATE TO ${quote(name)} USING(true) WITH CHECK(false); GRANT SELECT(id,status,category,"adminRestricted","ownerId") ON "Listing" TO ${quote(name)}`,
    );
    await owner.query(
      `CREATE FUNCTION hustlen_staff_read_fixture.lock_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Read principal locks cannot modify identity'; END $$`,
    );
    for (const [table, column] of [
      ["AuthSession", "id"],
      ["User", "id"],
      ["StaffPerson", "id"],
      ["StaffAccountAssociation", "id"],
      ["StaffAuthorizationVersion", "version"],
      ["StaffMembership", "id"],
      ["StaffCapabilityGrant", "id"],
      ["StaffMfaVersion", "version"],
      ["StaffMfaCredential", "id"],
      ["Listing", "id"],
    ])
      await owner.query(
        `GRANT UPDATE(${quote(column)}) ON ${quote(table)} TO ${quote(name)}; CREATE TRIGGER a_staff_read_lock_only BEFORE UPDATE OF ${quote(column)} ON ${quote(table)} FOR EACH ROW WHEN(current_user='${name}') EXECUTE FUNCTION hustlen_staff_read_fixture.lock_only()`,
      );
    await owner.query(
      `GRANT USAGE ON SCHEMA hustlen_staff_read_fixture TO ${quote(name)}; GRANT SELECT ON ALL TABLES IN SCHEMA hustlen_staff_read_fixture TO ${quote(name)}; GRANT INSERT ON hustlen_staff_read_fixture.binding,hustlen_staff_read_fixture.audit TO ${quote(name)}; GRANT USAGE,SELECT ON SEQUENCE hustlen_staff_read_fixture.audit_id_seq TO ${quote(name)}`,
    );
    for (const table of ["member", "grant"])
      await owner.query(
        `GRANT UPDATE(id) ON hustlen_staff_read_fixture.${table} TO ${quote(name)}; CREATE TRIGGER a_read_lock_only BEFORE UPDATE OF id ON hustlen_staff_read_fixture.${table} FOR EACH ROW WHEN(current_user='${name}') EXECUTE FUNCTION hustlen_staff_read_fixture.lock_only()`,
      );
    const seed = async () => {
      const actor = await mfaActorFixture(owner),
        member = randomUUID(),
        grant = randomUUID(),
        dm = randomUUID(),
        dg = randomUUID();
      await owner.query(
        `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'OPERATIONS',$3,$4,'hustlen-admin-shadow-v1',NOW(),NOW()+interval '1 hour')`,
        [dm, actor.personId, issuer.personId, randomUUID()],
      );
      await owner.query(
        `INSERT INTO "StaffCapabilityGrant" (id,"membershipId",action,"policyVersion",scope,"resourceKind","resourceId","purposeCode","issuedByPersonId","provenanceRef","validFrom","expiresAt") VALUES ($1,$2,'listings.read','hustlen-admin-shadow-v1','RESOURCE','listing',$3,'OPERATIONS_METADATA',$4,$5,NOW(),NOW()+interval '59 minutes')`,
        [dg, dm, String(listing), issuer.personId, randomUUID()],
      );
      await owner.query(
        `INSERT INTO hustlen_staff_read_fixture.member (id,"userId","personId","associationId","draftMembershipId",kind,policy,role,state,"validFrom","expiresAt") VALUES ($1,$2,$3,$4,$5,'OWNED_SYNTHETIC_HUMAN','hustlen-listing-read-fixture-v1','OPERATIONS','TEST_ACTIVE',NOW(),NOW()+interval '1 hour')`,
        [member, actor.userId, actor.personId, actor.associationId, dm],
      );
      await owner.query(
        `INSERT INTO hustlen_staff_read_fixture.grant (id,"memberId","listingId","draftGrantId",action,policy,state,"validFrom","expiresAt") VALUES ($1,$2,$3,$4,'listings.read','hustlen-listing-read-fixture-v1','TEST_ACTIVE',NOW(),NOW()+interval '1 hour')`,
        [grant, member, listing, dg],
      );
      return { ...actor, member, grant, listing, outside, dm, dg };
    };
    return {
      profile,
      readUrl: binding.toString(),
      seed,
      listing,
      outside,
      async runtimeClient() {
        return profile.connect("runtime");
      },
      async readClient() {
        const c = await connectTestDatabaseTarget(binding);
        await assertOwnedDatabase(c, url, runId);
        return c;
      },
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
