import { randomBytes } from "node:crypto";
import { Client } from "pg";

import { disposableDatabaseUrl } from "../../lib/disposable-database-url";

export function assertEffectiveTestTarget(
  client: Client,
  url: URL,
  maintenance = false,
) {
  const parameters = (
    client as unknown as {
      connectionParameters: {
        host: string;
        port: number;
        database: string;
        options?: unknown;
        replication?: unknown;
      };
    }
  ).connectionParameters;
  if (
    client.host !== url.hostname.replace(/^\[|\]$/g, "") ||
    client.port !== Number(url.port) ||
    client.database !== (maintenance ? "postgres" : url.pathname.slice(1)) ||
    parameters.host !== client.host ||
    parameters.port !== client.port ||
    parameters.database !== client.database ||
    (parameters.options !== undefined && parameters.options !== "") ||
    !!parameters.replication
  )
    throw new Error(
      "Disposable database driver target/options do not match the validated target.",
    );
}
export function testDatabaseUrl(
  value: string | undefined,
  developmentUrl?: string,
): URL {
  const url = disposableDatabaseUrl(value, developmentUrl);
  // Inspect pg's actual configuration without opening any network connection.
  assertEffectiveTestTarget(
    new Client({ connectionString: url.toString() }),
    url,
  );
  return url;
}
export async function connectTestDatabaseTarget(
  value: URL,
  maintenance = false,
) {
  const url = testDatabaseUrl(value.toString());
  const binding = new URL(url);
  if (maintenance) binding.pathname = "/postgres";
  const client = new Client({ connectionString: binding.toString() });
  assertEffectiveTestTarget(client, url, maintenance);
  try {
    await client.connect();
    const identity = await client.query("SELECT current_database() AS name");
    if (
      identity.rows[0]?.name !==
      (maintenance ? "postgres" : url.pathname.slice(1))
    )
      throw new Error(
        "Connected database identity differs from the validated target.",
      );
    return client;
  } catch (error) {
    await client.end();
    throw error;
  }
}
export async function assertOwnedDatabase(
  client: Client,
  url: URL,
  runId: string,
) {
  assertEffectiveTestTarget(client, testDatabaseUrl(url.toString()));
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
  const client = await connectTestDatabaseTarget(url);
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
