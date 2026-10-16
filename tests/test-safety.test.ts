import { test } from "node:test";
import assert from "node:assert/strict";
import type { Client } from "pg";
import { testDatabaseUrl, assertOwnedDatabase } from "./support/test-database";
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
