import { disposableDatabaseUrl } from "../disposable-database-url";
import { Client } from "pg";
export function announcementConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_ANNOUNCEMENT_CANDIDATE !== "owned-informational-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Announcement candidate unavailable.");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env),
    origin = env.HUSTLEN_ANNOUNCEMENT_ORIGIN;
  if (!origin) throw Error("Explicit development origin required.");
  const u = new URL(origin),
    ids = (env.HUSTLEN_ANNOUNCEMENT_ADMIN_IDS ?? "").split(",");
  if (
    u.origin !== origin ||
    u.protocol !== "http:" ||
    u.hostname !== "localhost" ||
    !u.port ||
    u.username ||
    u.password ||
    ids.length > 20 ||
    ids.some((id) => !/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
  )
    throw Error("Invalid candidate binding.");
  const driver = new Client({ connectionString: database.toString() });
  if (
    driver.host !== database.hostname ||
    driver.port !== Number(database.port) ||
    driver.database !== database.pathname.slice(1)
  )
    throw Error("Unsafe effective database target.");
  return {
    database,
    origin,
    adminIds: ids.map(Number),
    runId: env.MRT_TEST_RUN_ID,
  };
}
