import { connectTestDatabase } from "./support/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
const run = promisify(execFile);
test("Milestone 4B forward migrations preserve populated 4A account, rental, case and evidence history", async () => {
  const ownedDatabase = await connectTestDatabase();
  await ownedDatabase.end();
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(
    url && new URL(url).pathname.startsWith("/hustlen_test_"),
    "Use an empty dedicated _migration_test database.",
  );
  const pool = new Pool({ connectionString: url }),
    dir = await mkdtemp("/tmp/lend-ya-migration-");
  assert.equal(
    (await pool.query("SELECT to_regclass('public.\"User\"') AS users")).rows[0]
      .users,
    null,
    "Migration fixture database must start without application tables.",
  );
  const env = { ...process.env, DATABASE_URL: url };
  try {
    const migrations = path.join(dir, "migrations");
    await cp("prisma/migrations", migrations, { recursive: true });
    for (const name of await readdir(migrations))
      if (/^\d/.test(name) && name >= "20261014")
        await rm(path.join(migrations, name), { recursive: true });
    const config = path.join(dir, "prisma.config.ts");
    await writeFile(
      config,
      `import {defineConfig} from ${JSON.stringify(path.join(process.cwd(), "node_modules/prisma/config.js"))}; export default defineConfig({schema:${JSON.stringify(path.join(process.cwd(), "prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL}});`,
    );
    await run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--config",
        config,
      ],
      { env },
    );
    // Historical migration fixtures; these are not presented as successful API rental workflows.
    await pool.query(`INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES (1,'Historical owner','historical-owner@example.test','synthetic-fixture-hash','USER',NOW()),(2,'Historical renter','historical-renter@example.test','synthetic-fixture-hash','USER',NOW()),(3,'Historical admin','historical-admin@example.test','synthetic-fixture-hash','ADMIN',NOW());
   INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'HISTORY','Historical station');
   INSERT INTO "Listing" (id,"ownerId",title,description,category,price,deposit,condition,status,"updatedAt") VALUES (1,1,'Historical item','Original description','Electronics',12.34,25.67,'Scratch','ACTIVE',NOW());
   INSERT INTO "ListingMedia" ("listingId",url,"mimeType",kind) VALUES (1,'/uploads/listings/historical.png','image/png','PHOTO');
   INSERT INTO "ListingStation" ("listingId","stationId") VALUES (1,9001);
   INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice",deposit,"updatedAt") VALUES (1,1,1,2,9001,'2026-01-01','2026-01-02','COMPLETED',12.34,12.34,25.67,NOW()),(2,1,1,2,9001,'2026-02-01','2026-02-02','DISPUTED',12.34,12.34,25.67,NOW());
   INSERT INTO "Handoff" ("bookingId","performedBy","confirmedBy","confirmedAt","conditionConfirmed","ownerConditionConfirmed","conditionNotes","borrowerConditionNotes","updatedAt") VALUES (1,1,2,NOW(),true,true,'Owner original','Borrower original',NOW()),(2,1,2,NOW(),true,true,'Second owner original','Second borrower original',NOW());
   INSERT INTO "Return" ("bookingId","initiatedBy","confirmedBy","confirmedAt","conditionConfirmed","returnConfirmed","inspectionAccepted","conditionNotes","inspectionNotes","updatedAt") VALUES (1,2,1,NOW(),true,true,true,'Borrower return original','Owner inspection original',NOW());
   INSERT INTO "Dispute" ("bookingId","openedBy",reason,description,status) VALUES (2,2,'Original case allegation','Do not rewrite','OPEN');
   INSERT INTO "ListingReport" ("listingId","reporterId",reason,description,status) VALUES (1,2,'Original report','Keep original report','OPEN');
   INSERT INTO "VerifiedReview" ("bookingId","authorId","subjectId",rating,comment) VALUES (1,2,1,4,'Historical verified review');
   INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ('00000000-0000-4000-8000-000000000001',1,1,'HANDOFF_OWNER','image/png',decode('010203','hex'));`);
    const tables = [
      "User",
      "Listing",
      "ListingMedia",
      "ListingStation",
      "Booking",
      "Handoff",
      "Return",
      "Dispute",
      "ListingReport",
      "VerifiedReview",
      "BookingEvidencePhoto",
    ];
    const before = new Map<string, Record<string, unknown>[]>();
    for (const table of tables)
      before.set(
        table,
        (await pool.query(`SELECT * FROM "${table}" ORDER BY id`)).rows,
      );
    const checksums = (
      await pool.query(
        'SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name',
      )
    ).rows;
    await run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--config",
        "prisma7.config.ts",
      ],
      { env },
    );
    const additions: Record<string, string[]> = {
      User: ["accountStatus"],
      Booking: ["requestKey", "requestHash"],
      Listing: ["adminRestricted"],
      Dispute: [
        "resolvedBy",
        "finding",
        "decisionSummary",
        "adminNotes",
        "bookingOutcome",
      ],
      ListingReport: ["resolvedBy", "resolvedAt", "decisionReason"],
    };
    for (const table of tables) {
      const after = (await pool.query(`SELECT * FROM "${table}" ORDER BY id`))
        .rows;
      for (const row of after) {
        if (table === "Booking") {
          assert.equal(row.requestKey, null, "Existing bookings receive no invented request identity");
          assert.equal(row.requestHash, null, "Existing bookings receive no invented request hash");
        }
        for (const field of additions[table] ?? []) delete row[field];
      }
      assert.deepEqual(
        after,
        before.get(table),
        `${table} historical values remain intact`,
      );
    }
    assert.deepEqual(
      (
        await pool.query(
          "SELECT migration_name,checksum FROM \"_prisma_migrations\" WHERE migration_name < '20261014' ORDER BY migration_name",
        )
      ).rows,
      checksums,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT count(*)::int AS n FROM "User" WHERE "accountStatus"=\'ACTIVE\'',
        )
      ).rows[0].n,
      3,
    );
    assert.equal(
      (await pool.query('SELECT "adminRestricted" FROM "Listing" WHERE id=1'))
        .rows[0].adminRestricted,
      false,
    );
    assert.equal(
      (await pool.query('SELECT count(*)::int AS n FROM "AdminAuditLog"'))
        .rows[0].n,
      0,
      "No historical decisions invented",
    );
    const repeat = await run(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
        "--config",
        "prisma7.config.ts",
      ],
      { env },
    );
    assert.match(repeat.stdout, /No pending migrations/);
  } finally {
    // Only this explicitly empty-at-entry fixture database is cleared to allow repeatable upgrade testing.
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
    await pool.end();
    await rm(dir, { recursive: true, force: true });
  }
});
