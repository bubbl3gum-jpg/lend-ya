import { randomBytes } from "node:crypto";
import { Client } from "pg";

export function testDatabaseUrl(
  value: string | undefined,
  developmentUrl?: string,
): URL {
  if (!value)
    throw new Error(
      "Set MRT_TEST_DATABASE_URL explicitly to a new local hustlen_test_* database. Shared DATABASE_URL is never a test target.",
    );
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^hustlen_test_[a-z0-9_]+$/.test(url.pathname.slice(1)) ||
    url.pathname.length > 64
  )
    throw new Error(
      "Tests require a local database named hustlen_test_* (at most 63 characters).",
    );
  if (developmentUrl && new URL(developmentUrl).pathname === url.pathname)
    throw new Error(
      "The designated test database must differ from the development database.",
    );
  return url;
}
export async function assertOwnedDatabase(
  client: Client,
  url: URL,
  runId: string,
) {
  const { rows } = await client.query(
    "SELECT current_database() AS name, shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
  );
  if (
    rows[0]?.name !== url.pathname.slice(1) ||
    rows[0]?.marker !== `hustlen-mrt-test:${runId}`
  )
    throw new Error(
      "Refusing to use a database without this test run's ownership marker.",
    );
}
export async function connectTestDatabase() {
  const url = testDatabaseUrl(process.env.MRT_TEST_DATABASE_URL);
  const runId = process.env.MRT_TEST_RUN_ID;
  if (
    !runId ||
    !/^[a-f0-9]{24}$/.test(runId) ||
    process.env.DATABASE_URL !== url.toString()
  )
    throw new Error(
      "Run tests through the isolated runner; app/test DATABASE_URL must match the designated test database.",
    );
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await assertOwnedDatabase(client, url, runId);
  } catch (error) {
    await client.end();
    throw error;
  }
  return client;
}
export function testRunId() {
  return randomBytes(12).toString("hex");
}
