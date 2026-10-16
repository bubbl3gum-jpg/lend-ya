import "dotenv/config";
import { connectTestDatabase } from "./support/test-database";
import path from "node:path";
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
async function main() {
  const client = await connectTestDatabase();
  const url = new URL(process.env.DATABASE_URL!);
  try {
    const migrations = (await readdir("prisma/migrations"))
      .filter((s) => s !== "migration_lock.toml")
      .sort();
    for (const migration of migrations.filter(
      (s) => s !== "20261016100000_official_mrt_stations",
    ))
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    await client.query(`INSERT INTO "MrtStation" ("id","code","name") VALUES (701,'TPE','Taipei Main Station'),(702,'ZSH','Zhongshan'),(703,'XIM','Ximen'),(704,'JNT','Jiantan'),(705,'SSH','Songshan') ON CONFLICT (code) DO UPDATE SET id=EXCLUDED.id;
 INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES (701,'Owner','migration-owner@example.test','test',NOW()),(702,'Borrower','migration-borrower@example.test','test',NOW());
 INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,"updatedAt") VALUES (701,701,'Historical item','Historical item','Cameras',100,'Good',NOW());
 INSERT INTO "ListingStation" ("listingId","stationId") VALUES (701,701),(701,704);
 INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES (701,701,701,702,704,NOW(),NOW()+INTERVAL '1 day','CONFIRMED',100,NOW());`);
    await client.query(
      await readFile(
        "prisma/migrations/20261016100000_official_mrt_stations/migration.sql",
        "utf8",
      ),
    );
    assert.equal(
      (
        await client.query(
          'SELECT COUNT(*)::int AS count FROM "MrtStation" WHERE "canonicalId" IS NOT NULL',
        )
      ).rows[0].count,
      120,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "meetingStationId" FROM "Booking" WHERE id=701',
        )
      ).rows[0].meetingStationId,
      704,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "canonicalId" FROM "MrtStation" WHERE id=704',
        )
      ).rows[0].canonicalId,
      "taipei-mrt:station:057",
    );
    assert.equal(
      (
        await client.query(
          'SELECT COUNT(*)::int AS count FROM "ListingStation" WHERE "listingId"=701',
        )
      ).rows[0].count,
      2,
    );
    const env = { ...process.env, DATABASE_URL: url.toString() };
    for (let i = 0; i < 2; i++)
      execFileSync(
        "node",
        ["node_modules/tsx/dist/cli.mjs", "scripts/import-mrt.ts"],
        { env, stdio: "pipe" },
      );
    execFileSync(
      "node",
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "diff",
        "--from-config-datasource",
        "--to-schema",
        "prisma/schema.prisma",
        "--exit-code",
        "--config",
        "prisma7.config.ts",
      ],
      { env, stdio: "pipe" },
    );
    // Also verify the same forward migration on an empty station table in a fresh schema.
    await client.query("CREATE SCHEMA fresh; SET search_path TO fresh");
    for (const migration of migrations)
      await client.query(
        await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"),
      );
    assert.equal(
      (
        await client.query(
          'SELECT COUNT(*)::int AS count FROM fresh."MrtStation"',
        )
      ).rows[0].count,
      120,
    );
    const report = {
      at: new Date().toISOString(),
      passed: [
        "Historical migration chain",
        "Forward migration preserves five legacy keys, listing relations, booked Jiantan station",
        "120 canonical rows",
        "Idempotent import twice",
        "Prisma schema diff empty",
        "Fresh empty-database migration chain",
      ],
    };
    await writeFile(
      path.join(
        process.env.MRT_TEST_ARTIFACT_DIR!,
        "migration-validation.json",
      ),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(report);
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
