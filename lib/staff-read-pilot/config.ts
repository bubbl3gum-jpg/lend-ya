import { disposableDatabaseUrl } from "../disposable-database-url";
export const FIXTURE_POLICY = "hustlen-listing-read-fixture-v1";
export function staffReadPilotConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_STAFF_READ_PILOT !== "owned-synthetic-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Staff read pilot unavailable");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env),
    origin = env.HUSTLEN_STAFF_READ_ORIGIN;
  if (!origin) throw Error("Explicit development origin required");
  const u = new URL(origin);
  if (
    u.origin !== origin ||
    u.protocol !== "http:" ||
    u.hostname !== "localhost" ||
    !u.port ||
    u.username ||
    u.password
  )
    throw Error("Exact development origin required");
  return {
    database,
    runId: env.MRT_TEST_RUN_ID!,
    origin,
    realm: {
      rpId: "localhost",
      origin,
      rpName: "Hustlen' synthetic staff-read pilot",
    },
  };
}
export async function assertStaffReadOwnership(
  client: {
    query: (
      sql: string,
      values?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[] }>;
  },
  config: ReturnType<typeof staffReadPilotConfig>,
) {
  const r = await client.query(
    `SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`,
  );
  if (
    r.rows[0]?.name !== config.database.pathname.slice(1) ||
    r.rows[0]?.marker !== `hustlen-mrt-test:${config.runId}`
  )
    throw Error("Owned pilot required");
  const s = await client.query(
    `SELECT obj_description(oid,'pg_namespace') marker FROM pg_namespace WHERE nspname='hustlen_staff_read_fixture'`,
  );
  if (s.rows[0]?.marker !== `hustlen-staff-read-fixture:${config.runId}`)
    throw Error("Synthetic fixture required");
}
