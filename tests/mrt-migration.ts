import "dotenv/config";
import assert from "node:assert/strict";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { connectTestDatabase } from "./support/test-database";

async function main() {
  const client = await connectTestDatabase();
  const artifacts = process.env.MRT_TEST_ARTIFACT_DIR!;
  const migrationRoot = path.resolve("prisma/migrations");
  const names = (await readdir(migrationRoot))
    .filter((name) => /^\d/.test(name))
    .sort();
  const official = "20261016100000_official_mrt_stations";
  const expectedAdmin = [
    "20261013080000_booking_cancellation",
    "20261013100000_private_rental_evidence",
    "20261014010000_admin_moderation",
    "20261014020000_dispute_case_history",
    "20261014030000_mvp_security",
  ];
  for (const name of [...expectedAdmin, official])
    assert.ok(names.includes(name));
  const adminNames = names.filter((name) => name !== official);
  const stage = path.join(artifacts, "admin-state");
  await mkdir(path.join(stage, "migrations"), { recursive: true });
  for (const name of adminNames)
    await cp(
      path.join(migrationRoot, name),
      path.join(stage, "migrations", name),
      { recursive: true },
    );
  await cp(
    path.join(migrationRoot, "migration_lock.toml"),
    path.join(stage, "migrations/migration_lock.toml"),
  );
  const config = path.join(stage, "prisma.config.ts");
  await writeFile(
    config,
    `import {defineConfig} from ${JSON.stringify(path.resolve("node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))},migrations:{path:${JSON.stringify(path.join(stage, "migrations"))}},datasource:{url:process.env.DATABASE_URL}});`,
  );
  function cli(args: string[]) {
    return execFileSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", ...args],
      { env: process.env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  }
  try {
    assert.equal(
      (await client.query("SELECT to_regclass('public.\"User\"') AS name"))
        .rows[0].name,
      null,
      "Upgrade fixture must start in its fresh owned database",
    );
    cli(["migrate", "deploy", "--config", config]);
    const previous = (
      await client.query(
        'SELECT migration_name,checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
      )
    ).rows;
    assert.deepEqual(
      previous.map((row) => row.migration_name),
      adminNames,
    );
    for (const [code, name] of [
      ["TPE", "Taipei Main Station"],
      ["ZSH", "Zhongshan"],
      ["XIM", "Ximen"],
      ["JNT", "Jiantan"],
      ["SSH", "Songshan"],
    ])
      await client.query(
        'INSERT INTO "MrtStation" (code,name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING',
        [code, name],
      );
    const legacy = (
      await client.query('SELECT * FROM "MrtStation" ORDER BY id')
    ).rows;
    const station = legacy.find((row) => row.code === "JNT").id;
    const user = async (name: string, role = "USER") =>
      (
        await client.query(
          'INSERT INTO "User" (name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,\'preserved-hash\',$3,NOW()) RETURNING id',
          [name, `${name}@upgrade.example.test`, role],
        )
      ).rows[0].id;
    const owner = await user("owner"),
      borrower = await user("borrower"),
      admin = await user("admin", "ADMIN");
    const listing = (
      await client.query(
        "INSERT INTO \"Listing\" (\"ownerId\",title,description,category,price,deposit,condition,\"adminRestricted\",\"updatedAt\") VALUES ($1,'Preserved restricted listing','Original description','Cameras',125.50,100,'Good',true,NOW()) RETURNING id",
        [owner],
      )
    ).rows[0].id;
    await client.query(
      'INSERT INTO "ListingStation" ("listingId","stationId") VALUES ($1,$2)',
      [listing, station],
    );
    const booking = async (status: string) =>
      (
        await client.query(
          'INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice",deposit,"updatedAt") VALUES ($1,$2,$3,$4,\'2035-01-01\',\'2035-01-02\',$5,125.50,125.50,100,NOW()) RETURNING id',
          [listing, owner, borrower, station, status],
        )
      ).rows[0].id;
    const complete = await booking("COMPLETED"),
      cancelled = await booking("CANCELLED"),
      disputed = await booking("DISPUTED");
    await client.query(
      'UPDATE "Booking" SET "cancelledBy"=$2,"cancelledAt"=NOW(),"cancellationReason"=\'Original cancellation\' WHERE id=$1',
      [cancelled, borrower],
    );
    await client.query(
      'INSERT INTO "Handoff" ("bookingId","performedBy","confirmedBy","conditionConfirmed","ownerConditionConfirmed","conditionNotes","borrowerConditionNotes","confirmedAt","updatedAt") VALUES ($1,$2,$3,true,true,\'Original owner evidence\',\'Original borrower evidence\',NOW(),NOW())',
      [complete, owner, borrower],
    );
    await client.query(
      'INSERT INTO "Return" ("bookingId","initiatedBy","confirmedBy","conditionConfirmed","returnConfirmed","inspectedBy","inspectionAccepted","inspectionNotes","confirmedAt","inspectedAt","updatedAt") VALUES ($1,$2,$3,true,true,$3,true,\'Original inspection\',NOW(),NOW(),NOW())',
      [complete, borrower, owner],
    );
    await client.query(
      "INSERT INTO \"Dispute\" (\"bookingId\",\"openedBy\",reason,description,status,\"resolvedAt\",\"resolvedBy\",finding,\"decisionSummary\") VALUES ($1,$2,'Historical case','Original description','RESOLVED',NOW(),$3,'NO_FAULT','Original decision'),($1,$2,'Reopened case','Second allegation','OPEN',NULL,NULL,NULL,NULL)",
      [disputed, borrower, admin],
    );
    await client.query(
      "INSERT INTO \"BookingEvidencePhoto\" (id,\"bookingId\",\"uploaderId\",stage,\"mimeType\",data) VALUES ('00000000-0000-4000-8000-000000000001',$1,$2,'HANDOFF_OWNER','image/png',decode('0102030405','hex'))",
      [complete, owner],
    );
    await client.query(
      "INSERT INTO \"ListingReport\" (\"listingId\",\"reporterId\",reason,description,status) VALUES ($1,$2,'Original report','Retain report','OPEN')",
      [listing, borrower],
    );
    await client.query(
      'INSERT INTO "VerifiedReview" ("bookingId","authorId","subjectId",rating,comment) VALUES ($1,$2,$3,4,\'Original verified review\')',
      [complete, borrower, owner],
    );
    await client.query(
      'INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES ($1,\'LISTING_RESTRICT\',\'Listing\',$2,\'Original moderation\',\'{"adminRestricted":false}\',\'{"adminRestricted":true}\')',
      [admin, listing],
    );
    await client.query(
      "INSERT INTO \"AuthRateLimit\" (key,attempts,\"expiresAt\") VALUES ('preserved-auth-key',2,NOW()+INTERVAL '1 day')",
    );
    const tables = [
      "User",
      "AuthSession",
      "Listing",
      "ListingStation",
      "ListingMedia",
      "Booking",
      "Handoff",
      "Return",
      "Dispute",
      "ListingReport",
      "VerifiedReview",
      "BookingEvidencePhoto",
      "AdminAuditLog",
      "AuthRateLimit",
    ];
    const snapshot = new Map<string, string>();
    for (const table of tables)
      snapshot.set(
        table,
        JSON.stringify(
          (
            await client.query(
              `SELECT * FROM "${table}" ORDER BY ${table === "AuthRateLimit" ? "key" : "id"}`,
            )
          ).rows,
        ),
      );
    const pending = names.filter(
      (name) => !previous.some((row) => row.migration_name === name),
    );
    assert.deepEqual(pending, [official]);
    const preflightBefore = JSON.parse(
      execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/db-preflight.ts"],
        { env: process.env, encoding: "utf8" },
      ),
    );
    assert.deepEqual(preflightBefore.pending, [official]);
    cli(["migrate", "deploy", "--config", "prisma7.config.ts"]);
    const preflightAfter = JSON.parse(
      execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/db-preflight.ts"],
        { env: process.env, encoding: "utf8" },
      ),
    );
    assert.deepEqual(preflightAfter.pending, []);
    for (const table of tables)
      assert.equal(
        JSON.stringify(
          (
            await client.query(
              `SELECT * FROM "${table}" ORDER BY ${table === "AuthRateLimit" ? "key" : "id"}`,
            )
          ).rows,
        ),
        snapshot.get(table),
        `${table} history changed during MRT upgrade`,
      );
    const after = (
      await client.query(
        'SELECT migration_name,checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
      )
    ).rows;
    assert.deepEqual(
      after.filter((row) => row.migration_name !== official),
      previous,
      "Applied migration history/checksums changed",
    );
    for (const row of legacy) {
      const current = (
        await client.query(
          'SELECT id,code,name,"createdAt" FROM "MrtStation" WHERE id=$1',
          [row.id],
        )
      ).rows[0];
      assert.deepEqual(current, row);
    }
    for (let i = 0; i < 2; i++)
      execFileSync(
        process.execPath,
        ["node_modules/tsx/dist/cli.mjs", "scripts/import-mrt.ts"],
        { env: process.env, stdio: "pipe" },
      );
    for (const table of tables)
      assert.equal(
        JSON.stringify(
          (
            await client.query(
              `SELECT * FROM "${table}" ORDER BY ${table === "AuthRateLimit" ? "key" : "id"}`,
            )
          ).rows,
        ),
        snapshot.get(table),
        `${table} history changed during station import`,
      );
    assert.equal(
      (
        await client.query(
          'SELECT count(*)::int n FROM "MrtStation" WHERE "canonicalId" IS NOT NULL',
        )
      ).rows[0].n,
      120,
    );
    assert.equal(
      (
        await client.query(
          'SELECT sum(cardinality("lineCodes"))::int n FROM "MrtStation"',
        )
      ).rows[0].n,
      136,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "adminRestricted" FROM "Listing" WHERE id=$1',
          [listing],
        )
      ).rows[0].adminRestricted,
      true,
    );
    assert.equal(
      (
        await client.query(
          'SELECT "meetingStationId" FROM "Booking" WHERE id=$1',
          [complete],
        )
      ).rows[0].meetingStationId,
      station,
    );
    cli([
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--exit-code",
      "--config",
      "prisma7.config.ts",
    ]);
    const report = {
      at: new Date().toISOString(),
      sourceAdminCommit: "18529a30bb7da3c3db08baca614ef1fe2764eb10",
      adminMigrations: previous,
      pendingBeforeUpgrade: pending,
      totalApplied: after.length,
      passed: [
        "Real Prisma deploy to Admin/MVP state (all five divergent migrations)",
        "Only official MRT migration pending before upgrade",
        "Every prior row preserved across all 14 history/security tables",
        "Admin restriction true preserved",
        "Cancellation and private evidence bytes preserved",
        "Resolved and open dispute case history and immutable admin audits preserved",
        "Five legacy station primary keys and all booking/listing foreign keys preserved",
        "120 physical locations and 136 line codes",
        "Two imports preserve existing application data",
        "No migration checksum changed",
        "Combined Prisma schema diff empty",
      ],
    };
    await writeFile(
      path.join(artifacts, "migration-validation.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
