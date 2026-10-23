import { test } from "node:test";
import assert from "node:assert/strict";
import { Client, defaults } from "pg";
import {
  testDatabaseUrl,
  assertOwnedDatabase,
  assertEffectiveTestTarget,
} from "./support/test-database";
import { browserLaunchOptions } from "./support/browser";

test("test targets require explicit local test database designation", () => {
  for (const value of [
    undefined,
    "postgresql://localhost/p2p_marketplace",
    "postgresql://remote.example/hustlen_test_example",
    "postgresql://localhost/hustlen_test_a%22",
    "http://localhost/hustlen_test_example",
  ])
    assert.throws(() => testDatabaseUrl(value));
  assert.throws(() =>
    testDatabaseUrl(
      "postgresql://localhost/hustlen_test_example",
      "postgresql://localhost/hustlen_test_example",
    ),
  );
  assert.equal(
    testDatabaseUrl("postgresql://localhost/hustlen_test_example").pathname,
    "/hustlen_test_example",
  );
});
test("database ownership marker and actual database identity are both required", async () => {
  const url = new URL("postgresql://localhost/hustlen_test_example");
  const client = (name: string, marker: string | null) =>
    ({
      host: "localhost",
      port: 5432,
      database: "hustlen_test_example",
      connectionParameters: {
        host: "localhost",
        port: 5432,
        database: "hustlen_test_example",
      },
      query: async () => ({ rows: [{ name, marker }] }),
    }) as unknown as Client;
  await assert.rejects(
    assertOwnedDatabase(client("hustlen_test_example", null), url, "run"),
  );
  await assert.rejects(
    assertOwnedDatabase(
      client("p2p_marketplace", "hustlen-mrt-test:run"),
      url,
      "run",
    ),
  );
  await assert.rejects(
    assertOwnedDatabase(
      client("hustlen_test_example", "hustlen-mrt-test:other"),
      url,
      "run",
    ),
  );
  await assertOwnedDatabase(
    client("hustlen_test_example", "hustlen-mrt-test:run"),
    url,
    "run",
  );
});
test("browser defaults to managed Chromium and supports an explicit executable", () => {
  assert.equal("executablePath" in browserLaunchOptions(), false);
  assert.equal(
    browserLaunchOptions(process.execPath).executablePath,
    process.execPath,
  );
  assert.throws(
    () => browserLaunchOptions("/definitely-missing-mrt-browser"),
    /MRT_BROWSER_PATH/,
  );
});

import type { Browser } from "playwright";
import type { PrismaClient } from "@prisma/client";
import { verifyApplicationDatabase } from "./support/application-database";
test("wrong application database fails before mutating API tests and removes its canary", async () => {
  let deleted = false,
    closed = false;
  const prisma = {
    user: {
      create: async () => ({ id: 99 }),
      delete: async () => {
        deleted = true;
      },
    },
    authSession: { create: async () => {} },
  } as unknown as PrismaClient;
  const browser = {
    newContext: async () => ({
      addCookies: async () => {},
      request: { get: async () => ({ status: () => 401 }) },
      close: async () => {
        closed = true;
      },
    }),
  } as unknown as Browser;
  await assert.rejects(
    verifyApplicationDatabase(browser, prisma, "http://localhost:3000", "run"),
    /database identity check failed/,
  );
  assert.equal(deleted, true);
  assert.equal(closed, true);
});

test("connection options, alternate drivers and ambient target overrides fail before connecting", () => {
  const base =
    "postgresql://demo:credential@localhost:55433/hustlen_test_guard";
  // Construction only: this proves driver interpretation differs from URL.host,
  // without contacting any host or database (especially the adversarial target).
  const unsafe = new Client({
    connectionString: base + "?host=remote.invalid",
  });
  assert.equal(unsafe.host, "remote.invalid");
  for (const query of [
    "host=remote.invalid",
    "host=%2Ftmp",
    "hostaddr=203.0.113.1",
    "port=1",
    "database=production",
    "dbname=production",
    "service=production",
    "connectionString=postgresql%3A%2F%2Fremote.invalid%2Fproduction",
    "options=-c%20search_path%3Dprivate",
    "sslcert=%2Fprivate%2Fcertificate",
    "sslkey=%2Fprivate%2Fkey",
    "sslmode=disable",
    "schema=private",
    "schema=public&schema=public",
    "%68ost=remote.invalid",
    "HOST=remote.invalid",
    "unknown=1",
  ])
    assert.throws(() => testDatabaseUrl(base + "?" + query), /refused/);
  for (const value of [
    base + "#fragment",
    base + "\n",
    base.replace(":55433", ":0"),
    base.replace("localhost", "127.1"),
    base.replace("localhost", "%2Flocalhost"),
  ])
    assert.throws(() => testDatabaseUrl(value));
  assert.equal(testDatabaseUrl(base + "?schema=public").port, "55433");
  assert.equal(
    testDatabaseUrl("postgresql://localhost/hustlen_test_guard").port,
    "5432",
  );
  for (const key of [
    "PGHOST",
    "PGHOSTADDR",
    "PGPORT",
    "PGDATABASE",
    "PGSERVICE",
    "PGSERVICEFILE",
    "PGOPTIONS",
    "PGSSLMODE",
    "NODE_PG_FORCE_NATIVE",
  ]) {
    const previous = process.env[key];
    try {
      process.env[key] = "unexpected";
      assert.throws(() => testDatabaseUrl(base), /refused/);
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
  const target = testDatabaseUrl(base);
  assert.throws(() =>
    assertEffectiveTestTarget(
      new Client({
        host: "remote.invalid",
        database: "production",
        port: 55433,
      }),
      target,
    ),
  );
  assert.throws(() =>
    assertEffectiveTestTarget(
      new Client({ connectionString: base, options: "-c search_path=private" }),
      target,
    ),
  );
  const tampered = new Client({ connectionString: base });
  (
    tampered as unknown as { connectionParameters: { database: string } }
  ).connectionParameters.database = "production";
  assert.throws(() => assertEffectiveTestTarget(tampered, target));
  const previous = defaults.options;
  try {
    defaults.options = "-c search_path=private";
    assert.throws(() => testDatabaseUrl(base), /target/);
  } finally {
    defaults.options = previous;
  }
});


test("the isolated CLI rejects unsafe options before opening even a local connection", async () => {
  const { createServer } = await import("node:net");
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  let connections = 0;
  const trap = createServer((socket) => { connections++; socket.destroy(); });
  await new Promise<void>((resolve) => trap.listen(0, "127.0.0.1", resolve));
  const port = (trap.address() as import("node:net").AddressInfo).port;
  try {
    for (const query of ["options=-c%20search_path%3Dprivate", "host=127.0.0.1", "database=production"]) {
      const child = spawn(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"), path.resolve("tests/run-isolated.ts"), "--build"], {
        env: { ...process.env, DATABASE_URL: "postgresql://127.0.0.1/development", MRT_TEST_DATABASE_URL: `postgresql://demo:private-password@127.0.0.1:${port}/hustlen_test_trap?${query}` }, stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
      const timer = setTimeout(() => child.kill("SIGKILL"), 8000);
      const code = await new Promise<number | null>((resolve) => child.once("close", resolve));
      clearTimeout(timer);
      assert.equal(code, 1);
      assert.match(output, /operation_failed/);
      assert.ok(!output.includes("private-password"));
      assert.ok(!output.includes("postgresql:"));
      assert.equal(connections, 0, "No network connection may precede option validation");
    }
  } finally { await new Promise<void>((resolve, reject) => trap.close((error) => error ? reject(error) : resolve())); }
});
