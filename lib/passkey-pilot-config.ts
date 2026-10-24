import { disposableDatabaseUrl } from "./disposable-database-url";
/** Trusted server configuration only. Never populated from a request or cookie. */
export function passkeyPilotConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.HUSTLEN_PASSKEY_PILOT !== "owned-development-only" ||
    !/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") ||
    env.DATABASE_URL !== env.TEST_DATABASE_URL ||
    env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL
  )
    throw Error("Passkey development pilot unavailable");
  const database = disposableDatabaseUrl(env.DATABASE_URL, undefined, env);
  const origin = env.HUSTLEN_PASSKEY_PILOT_ORIGIN;
  if (!origin) throw Error("Explicit pilot origin required");
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.hostname !== "localhost" ||
    url.protocol !== "http:" ||
    !url.port ||
    url.username ||
    url.password
  )
    throw Error("Exact localhost development origin required");
  return Object.freeze({
    database,
    runId: env.MRT_TEST_RUN_ID!,
    realm: Object.freeze({
      rpId: "localhost",
      origin,
      rpName: "Hustlen' development passkeys",
    }),
  });
}
