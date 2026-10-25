import { randomBytes } from "node:crypto";
import type { Client } from "pg";
import {
  assertOwnedDatabase,
  connectTestDatabaseTarget,
  testDatabaseUrl,
} from "./test-database";
/** Disposable experiment only. Cluster-scoped ephemeral login roles; no deployment installer. */
export async function principalFixture(owner: Client) {
  const url = testDatabaseUrl(process.env.TEST_DATABASE_URL),
    runId = process.env.MRT_TEST_RUN_ID!;
  await assertOwnedDatabase(owner, url, runId);
  const names = Object.fromEntries(
    ["migration", "runtime", "mfa", "authorization", "inspection"].map((k) => [
      k,
      `h5c_${runId.slice(0, 16)}_${k}`,
    ]),
  ) as Record<
    "migration" | "runtime" | "mfa" | "authorization" | "inspection",
    string
  >;
  const connections: Client[] = [],
    created: string[] = [],
    bindings = new Map<string, URL>();
  const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  async function cleanup() {
    for (const c of connections) await c.end();
    await assertOwnedDatabase(owner, url, runId);
    // All role objects/grants are in this owned DB. No existing role is adopted.
    for (const name of [...created].reverse())
      await owner.query(`DROP OWNED BY ${quote(name)} CASCADE`);
    for (const name of [...created].reverse())
      await owner.query(`DROP ROLE ${quote(name)}`);
  }
  try {
    for (const name of Object.values(names)) {
      const secret = randomBytes(32).toString("base64url"),
        binding = new URL(url);
      binding.username = name;
      binding.password = secret;
      bindings.set(name, binding);
      await owner.query(
        `CREATE ROLE ${quote(name)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${secret}' VALID UNTIL '${new Date(Date.now() + 1800000).toISOString()}'`,
      );
      created.push(name);
      await owner.query(
        `COMMENT ON ROLE ${quote(name)} IS 'hustlen-test-principal:${runId}'`,
      );
    }
    await owner.query(
      `REVOKE ALL ON DATABASE ${quote(url.pathname.slice(1))} FROM PUBLIC; GRANT CONNECT ON DATABASE ${quote(url.pathname.slice(1))} TO ${Object.values(names).map(quote).join(",")}; REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ${Object.values(names).map(quote).join(",")}; REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC; REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC; REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC`,
    );
    const tables = (
      await owner.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
      )
    ).rows.map((r) => String(r.tablename));
    const sequences = (
      await owner.query(
        `SELECT sequencename FROM pg_sequences WHERE schemaname='public'`,
      )
    ).rows.map((r) => String(r.sequencename));
    const functions = (
      await owner.query(
        `SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'`,
      )
    ).rows.map((r) => String(r.signature));
    for (const table of tables)
      await owner.query(
        `ALTER TABLE public.${quote(table)} OWNER TO ${quote(names.migration)}`,
      );
    for (const sequence of sequences)
      await owner.query(
        `ALTER SEQUENCE public.${quote(sequence)} OWNER TO ${quote(names.migration)}`,
      );
    for (const signature of functions)
      await owner.query(
        `ALTER FUNCTION ${signature} OWNER TO ${quote(names.migration)}`,
      );
    const enums = (
      await owner.query(
        `SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'`,
      )
    ).rows;
    for (const { typname } of enums)
      await owner.query(
        `ALTER TYPE public.${quote(typname)} OWNER TO ${quote(names.migration)}`,
      );
    await owner.query(`ALTER SCHEMA public OWNER TO ${quote(names.migration)}`);
    const grant = async (role: string, privilege: string, table: string) =>
      owner.query(
        `GRANT ${privilege} ON TABLE public.${quote(table)} TO ${quote(role)}`,
      );
    for (const table of tables.filter(
      (t) =>
        !t.startsWith("Staff") &&
        !t.startsWith("Support") &&
        t !== "_prisma_migrations" &&
        t !== "User" &&
        t !== "AdminAuditLog" &&
        t !== "MrtStation",
    ))
      await grant(names.runtime, "SELECT,INSERT,UPDATE,DELETE", table);
    await grant(names.runtime, "SELECT", "MrtStation");
    await grant(names.runtime, "SELECT,INSERT", "User");
    const columns = (
      await owner.query(
        `SELECT attname FROM pg_attribute WHERE attrelid='public."User"'::regclass AND attnum>0 AND NOT attisdropped AND attname NOT IN ('id','role','createdAt')`,
      )
    ).rows.map((r) => quote(r.attname));
    await owner.query(
      `GRANT UPDATE (${columns.join(",")}) ON "User" TO ${quote(names.runtime)}`,
    );
    await owner.query(
      `ALTER TABLE "User" ENABLE ROW LEVEL SECURITY; CREATE POLICY fixture_user_read ON "User" FOR SELECT TO ${quote(names.runtime)} USING(true); CREATE POLICY fixture_user_insert ON "User" FOR INSERT TO ${quote(names.runtime)} WITH CHECK(role='USER'); CREATE POLICY fixture_user_update ON "User" FOR UPDATE TO ${quote(names.runtime)} USING(true) WITH CHECK(true)`,
    );
    await grant(names.runtime, "SELECT,INSERT", "AdminAuditLog");
    for (const sequence of sequences.filter((s) => !s.startsWith("Staff")))
      await owner.query(
        `GRANT USAGE,SELECT ON SEQUENCE ${quote(sequence)} TO ${quote(names.runtime)}`,
      );
    for (const table of [
      "AuthSession",
      "User",
      "StaffPerson",
      "StaffAccountAssociation",
      "StaffAuthorizationVersion",
      "StaffMembership",
      "StaffCapabilityGrant",
    ])
      await grant(names.mfa, "SELECT", table);
    await owner.query(
      `CREATE POLICY fixture_mfa_identity_read ON "User" FOR SELECT TO ${quote(names.mfa)},${quote(names.authorization)} USING(true)`,
    );
    await owner.query(
      `CREATE POLICY fixture_mfa_lock ON "User" FOR UPDATE TO ${quote(names.mfa)} USING(true) WITH CHECK(false)`,
    );
    // PostgreSQL row locks require UPDATE privilege. Grant only a guarded immutable
    // identity column, never profile/role writes; the non-owner cannot disable this guard.
    await owner.query(
      `CREATE FUNCTION public.fixture_mfa_lock_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'MFA identity column is lock-only'; END $$`,
    );
    for (const table of [
      "AuthSession",
      "User",
      "StaffPerson",
      "StaffAccountAssociation",
    ]) {
      await owner.query(
        `GRANT UPDATE(id) ON ${quote(table)} TO ${quote(names.mfa)}`,
      );
      await owner.query(
        `CREATE TRIGGER fixture_mfa_lock_only BEFORE UPDATE OF id ON ${quote(table)} FOR EACH ROW WHEN (current_user='${names.mfa}') EXECUTE FUNCTION public.fixture_mfa_lock_only()`,
      );
    }
    for (const table of tables.filter((t) => t.startsWith("StaffMfa")))
      await grant(names.mfa, "SELECT,INSERT,UPDATE", table);
    for (const sequence of sequences.filter((s) => s.startsWith("StaffMfa")))
      await owner.query(
        `GRANT USAGE,SELECT ON SEQUENCE ${quote(sequence)} TO ${quote(names.mfa)}`,
      );
    for (const table of tables.filter(
      (t) => t.startsWith("Staff") && !t.startsWith("StaffMfa"),
    ))
      await grant(
        names.authorization,
        table === "StaffCapabilityContract" ? "SELECT" : "SELECT,INSERT,UPDATE",
        table,
      );
    await grant(names.authorization, "SELECT", "AuthSession");
    await grant(names.authorization, "SELECT", "User");
    await grant(names.authorization, "SELECT,INSERT", "AdminAuditLog");
    for (const sequence of sequences.filter(
      (s) => s.startsWith("Staff") || s.startsWith("AdminAudit"),
    ))
      await owner.query(
        `GRANT USAGE,SELECT ON SEQUENCE ${quote(sequence)} TO ${quote(names.authorization)}`,
      );
    await owner.query(
      `CREATE VIEW public.hustlen_fixture_health WITH(security_barrier=true) AS SELECT count(*)::int AS booking_count FROM public."Booking"; ALTER VIEW public.hustlen_fixture_health OWNER TO ${quote(names.migration)}; GRANT SELECT ON public.hustlen_fixture_health TO ${quote(names.inspection)}`,
    );
    async function connect(kind: keyof typeof names) {
      const client = await connectTestDatabaseTarget(
        bindings.get(names[kind])!,
      );
      await assertOwnedDatabase(client, url, runId);
      connections.push(client);
      return client;
    }
    return {
      names,
      connect,
      url: (kind: keyof typeof names) => bindings.get(names[kind])!.toString(),
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
