/** Strict connection policy shared by disposable tooling and temporary GPS mode.
 * Query options are not trusted: pg and Prisma do not interpret all URLs alike.
 * Credentials may come from PGUSER/PGPASSWORD; no other PG override is accepted.
 */
export function disposableDatabaseUrl(
  value: string | undefined,
  developmentUrl?: string,
  env: Record<string, string | undefined> = process.env,
): URL {
  const refuse = () =>
    new Error(
      "Disposable database connection refused: use an explicit local hustlen_test_* URL without connection overrides.",
    );
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) throw refuse();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw refuse();
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^hustlen_test_[a-z0-9_]+$/.test(url.pathname.slice(1)) ||
    url.pathname.length > 64 ||
    url.hash ||
    [...url.searchParams].some(
      ([key, val]) => key !== "schema" || val !== "public",
    ) ||
    url.searchParams.getAll("schema").length > 1 ||
    Object.keys(env).some(
      (key) =>
        /^PG/i.test(key) &&
        !["PGUSER", "PGPASSWORD"].includes(key) &&
        env[key] !== undefined &&
        env[key] !== "",
    ) ||
    !!env.NODE_PG_FORCE_NATIVE
  )
    throw refuse();
  if (developmentUrl) {
    try {
      if (new URL(developmentUrl).pathname === url.pathname) throw refuse();
    } catch {
      throw refuse();
    }
  }
  // Do not inherit PGPORT/driver defaults, even when the caller omits a port.
  url.port ||= "5432";
  if (
    !Number.isInteger(Number(url.port)) ||
    Number(url.port) < 1 ||
    Number(url.port) > 65535
  )
    throw refuse();
  return url;
}
