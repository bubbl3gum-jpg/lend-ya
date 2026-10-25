import { disposableDatabaseUrl } from "../disposable-database-url";
export const SUPPORT_CANDIDATE_POLICY = "support-owned-candidate-8b-v1";
export function supportCandidateConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_SUPPORT_TICKET_CANDIDATE !== "owned-development-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Support candidate unavailable");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env),
    origin = env.HUSTLEN_SUPPORT_TICKET_ORIGIN;
  if (!origin) throw Error("Explicit candidate origin required");
  const u = new URL(origin);
  if (
    u.origin !== origin ||
    u.protocol !== "http:" ||
    u.hostname !== "localhost" ||
    !u.port ||
    u.username ||
    u.password
  )
    throw Error("Exact localhost origin required");
  const limit = env.HUSTLEN_SUPPORT_TICKET_TEST_LIMIT;
  if (!limit || !/^[1-9]\d?$/.test(limit) || Number(limit) > 20)
    throw Error("Explicit bounded test limit required");
  const ids = (env.HUSTLEN_SUPPORT_TICKET_REQUESTER_IDS ?? "").split(",");
  if (
    !ids.length ||
    ids.length > 20 ||
    ids.some((id) => !/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
  )
    throw Error("Explicit candidate requester allowlist required");
  return {
    database,
    origin,
    limit: Number(limit),
    requesterIds: ids.map(Number),
    runId: env.MRT_TEST_RUN_ID!,
  };
}
