import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertOwnedDatabase,
  connectTestDatabase,
  connectTestDatabaseTarget,
  testDatabaseUrl,
} from "./support/test-database";

async function main() {
  const client = await connectTestDatabase();
  const url = testDatabaseUrl(process.env.MRT_TEST_DATABASE_URL);
  const runId = process.env.MRT_TEST_RUN_ID!;
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, "Run through npm run test:baseline.");
  const artifacts = process.env.MRT_TEST_ARTIFACT_DIR!;
  async function npm(script: string) {
    await assertOwnedDatabase(client, url, runId);
    const result = spawnSync(process.execPath, [npmCli!, "run", script], {
      env: process.env, encoding: "utf8", timeout: 180_000,
    });
    assert.ifError(result.error);
    await writeFile(path.join(artifacts, `${script.replaceAll(":", "-")}.log`),
      result.stdout + result.stderr);
    return result;
  }
  async function succeeds(script: string) {
    const result = await npm(script);
    assert.equal(result.status, 0, `${script} failed: ${result.stdout}\n${result.stderr}`);
  }
  // PostgreSQL text JSON retains exact Decimal/timestamp representations, avoiding
  // node-postgres timestamp parsing and JS Number precision in the comparison.
  async function snapshot() {
    const tables = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    const result: Record<string, string[]> = {};
    for (const { tablename } of tables.rows) {
      const quoted = '"' + tablename.replaceAll('"', '""') + '"';
      const rows = await client.query<{ row: string }>(
        `SELECT row_to_json(t)::text AS row FROM ${quoted} t ORDER BY row_to_json(t)::text`,
      );
      result[tablename] = rows.rows.map(({ row }) => row);
    }
    return result;
  }
  try {
    // The runner deliberately skips its usual migrate step: this tests the real
    // setup command against an empty owned database, not a prepared schema.
    await succeeds("db:setup");
    const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
      .map((entry) => entry.name).sort();
    const applied = await client.query<{ migration_name: string }>(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
    );
    assert.deepEqual(applied.rows.map((r) => r.migration_name), migrations);
    assert.equal((await client.query('SELECT count(*)::int n FROM "MrtStation"')).rows[0].n, 120);
    assert.equal((await client.query('SELECT count(*)::int n FROM "User"')).rows[0].n, 0,
      "Normal setup must not seed demo accounts.");
    assert.equal((await client.query('SELECT count(*)::int n FROM "Booking"')).rows[0].n, 0);

    if (!process.argv.includes("--setup-failure")) {
      await succeeds("db:seed");
      assert.equal((await client.query('SELECT count(*)::int n FROM "Booking"')).rows[0].n, 2);
    }
    const user = (await client.query(
      'INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES (\'Baseline custom\', $1, \'synthetic-not-a-login-hash\', NOW()) RETURNING id',
      [`baseline-${runId}@example.test`],
    )).rows[0].id;
    const renter = (await client.query(
      'INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES (\'Baseline renter\', $1, \'synthetic-not-a-login-hash\', NOW()) RETURNING id',
      [`baseline-renter-${runId}@example.test`],
    )).rows[0].id;
    const station = (await client.query(
      'INSERT INTO "MrtStation" (code,name) VALUES ($1,$2) RETURNING id',
      [`custom-${runId}`, `Historical custom ${runId}`],
    )).rows[0].id;
    const listing = (await client.query(
      'INSERT INTO "Listing" ("ownerId",title,description,category,price,condition,"updatedAt") VALUES ($1,\'Custom inactive\',\'Preserve this fixture\',\'Electronics\',12.34,\'Good\',NOW()) RETURNING id',
      [user],
    )).rows[0].id;
    await client.query('UPDATE "Listing" SET status=\'INACTIVE\' WHERE id=$1', [listing]);
    await client.query('INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)', [listing, station]);
    // Synthetic history, including immutable quotation/idempotency/cancellation
    // fields. No API or historical production timestamp is changed by this test.
    await client.query(
      'INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice",deposit,notes,"requestKey","requestHash","cancelledBy","cancelledAt","cancellationReason","updatedAt") VALUES ($1,$2,$6,$3,\'2040-01-01 02:00\',\'2040-01-02 02:01\',\'CANCELLED\',12.34,24.68,25.67,\'Do not overwrite\',$4,$5,$2,NOW(),\'Original cancellation\',NOW())',
      [listing, user, station, `baseline-${runId}`, "a".repeat(64), renter],
    );
    const filename = `${randomUUID()}.png`;
    const upload = path.resolve("storage/listings", filename);
    await mkdir(path.dirname(upload), { recursive: true });
    await writeFile(upload, "synthetic baseline cleanup fixture");
    await client.query(
      'INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES ($1,$2,\'image/png\',\'PHOTO\')',
      [listing, `/api/listing-media/${filename}`],
    );
    await writeFile(path.join(artifacts, "baseline-upload.json"), JSON.stringify({ filename }));

    if (process.argv.includes("--setup-failure")) {
      // Real importer failure after successful generation and migration, without
      // altering migrations, commands, credentials or network policy.
      await client.query('UPDATE "MrtStation" SET "canonicalId"=\'baseline-conflict\' WHERE code=\'TPE\'');
      const before = await snapshot();
      const seed = await npm("db:seed");
      assert.equal(seed.status, 1, "Seed failure must exit nonzero and disconnect without hanging.");
      const failed = await npm("db:setup");
      assert.equal(failed.status, 1, "Setup must propagate importer failure.");
      assert.match(failed.stdout + failed.stderr, /Conflicting legacy mapping/);
      assert.deepEqual(await snapshot(), before, "Failed import is atomic; no implicit seed/reset.");
      console.log("BASELINE_EXPECTED_SETUP_FAILURE: importer conflict propagated; seed failure exited cleanly.");
      throw new Error("Intentional baseline setup failure; runner must clean only this database.");
    }

    const before = await snapshot();
    await succeeds("db:setup");
    assert.deepEqual(await snapshot(), before,
      "Repeated setup must preserve every public row, station identity, FK, migration checksum and booking field.");
    await succeeds("db:seed");
    assert.deepEqual(await snapshot(), before, "Explicit seed rerun must preserve existing records too.");
    console.log(`BASELINE_REPEATABILITY_PASS: ${migrations.length} migrations; all ${Object.keys(before).length} public tables unchanged.`);

    // Independent second owned runner fails on purpose. The parent database and
    // its recorded upload act as sentinels: child cleanup must not touch them.
    const childUrl = new URL(url);
    childUrl.pathname = `/hustlen_test_baseline_failure_${runId}`;
    const child = spawnSync(process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "tests/run-isolated.ts", "--baseline-setup-failure"], {
        env: { ...process.env, MRT_TEST_DATABASE_URL: childUrl.toString(), MRT_TEST_KEEP_ON_FAILURE: "0" },
        encoding: "utf8", timeout: 240_000,
      });
    assert.ifError(child.error);
    await writeFile(path.join(artifacts, "failure-runner.log"), child.stdout + child.stderr);
    assert.equal(child.status, 1, "Intentional setup failure must fail the runner, not be reported as success.");
    assert.match(child.stdout, /BASELINE_EXPECTED_SETUP_FAILURE/);
    const childArtifacts = /artifacts: (\.test-artifacts\/[a-f0-9]{24})/.exec(child.stdout)?.[1];
    assert.ok(childArtifacts, "Expected a child runner artifact directory.");
    const manifest = JSON.parse(await readFile(path.join(childArtifacts, "run.json"), "utf8"));
    assert.equal(manifest.database, childUrl.pathname.slice(1));
    assert.equal(manifest.passed, false);
    assert.equal(manifest.preserved, false);
    const recorded = JSON.parse(await readFile(path.join(childArtifacts, "baseline-upload.json"), "utf8"));
    assert.match(recorded.filename, /^[a-f0-9-]{36}\.png$/);
    await assert.rejects(readFile(path.resolve("storage/listings", recorded.filename)), { code: "ENOENT" });
    const admin = await connectTestDatabaseTarget(childUrl, true);
    try {
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [manifest.database])).rowCount, 0);
    } finally { await admin.end(); }
    await assertOwnedDatabase(client, url, runId);
    assert.deepEqual(await snapshot(), before, "Failure cleanup must leave parent rows/ownership intact.");
    assert.equal(await readFile(upload, "utf8"), "synthetic baseline cleanup fixture");
    console.log("BASELINE_FAILURE_CLEANUP_PASS: failed child database/upload removed; parent database/upload preserved.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
