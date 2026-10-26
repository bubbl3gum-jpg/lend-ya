import { disposableDatabaseUrl } from "../disposable-database-url";
export function geofencingLabConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_GEOFENCING_LAB !== "owned-self-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Lab unavailable");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env),
    origin = env.HUSTLEN_GEOFENCING_LAB_ORIGIN,
    ids = (env.HUSTLEN_GEOFENCING_LAB_ADMIN_IDS ?? "").split(",");
  if (!origin) throw Error("Explicit Lab origin required");
  const u = new URL(origin);
  if (
    u.origin !== origin ||
    u.protocol !== "http:" ||
    u.hostname !== "localhost" ||
    !u.port ||
    u.username ||
    u.password ||
    !ids.length ||
    ids.length > 20 ||
    ids.some((id) => !/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
  )
    throw Error("Invalid Lab binding");
  return {
    database,
    origin,
    adminIds: ids.map(Number),
    runId: env.MRT_TEST_RUN_ID!,
  };
}
