import { disposableDatabaseUrl } from "../disposable-database-url";
export const SUPPORT_STAFF_POLICY = "support-scoped-owned-8d-v1";
export function supportStaffConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_SUPPORT_STAFF_CANDIDATE !== "owned-synthetic-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Support candidate unavailable");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env),
    origin = env.HUSTLEN_SUPPORT_STAFF_ORIGIN;
  if (!origin) throw Error("Explicit owned origin required");
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
    origin,
    runId: env.MRT_TEST_RUN_ID!,
    realm: {
      rpId: "localhost",
      origin,
      rpName: "Hustlen' owned Support candidate",
    },
  };
}
export async function assertSupportOwnership(
  db: {
    query: (
      sql: string,
      values?: unknown[],
    ) => Promise<{ rows: Record<string, unknown>[] }>;
  },
  config: ReturnType<typeof supportStaffConfig>,
) {
  const r = await db.query(
    `SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`,
  );
  if (
    r.rows[0]?.name !== config.database.pathname.slice(1) ||
    r.rows[0]?.marker !== `hustlen-mrt-test:${config.runId}`
  )
    throw Error("Owned Support database required");
}
