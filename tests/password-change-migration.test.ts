import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { connectTestDatabase } from "./support/test-database";
test(
  "11E additive migration preserves populated history, rolls back partial failure and replays",
  { timeout: 120000 },
  async () => {
    const db = await connectTestDatabase(),
      art = process.env.MRT_TEST_ARTIFACT_DIR!,
      name = "20261027090000_account_password_security_event",
      root = path.resolve("prisma/migrations"),
      stage = path.join(art, "historical-state");
    const cli = (config: string) =>
      execFileSync(
        process.execPath,
        [
          "node_modules/prisma/build/index.js",
          "migrate",
          "deploy",
          "--config",
          config,
        ],
        {
          env: process.env,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    try {
      assert.equal(
        (await db.query(`SELECT to_regclass('public."User"') t`)).rows[0].t,
        null,
      );
      await mkdir(path.join(stage, "migrations"), { recursive: true });
      for (const dir of await readdir(root))
        if (dir !== name)
          await cp(path.join(root, dir), path.join(stage, "migrations", dir), {
            recursive: true,
          });
      const config = path.join(stage, "prisma.config.ts");
      await writeFile(
        config,
        `import {defineConfig} from ${JSON.stringify(path.resolve("node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))},migrations:{path:${JSON.stringify(path.join(stage, "migrations"))}},datasource:{url:process.env.DATABASE_URL}});`,
      );
      cli(config);
      await db.query(
        `INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES (1,'Historical owner','owner@upgrade.fixture.test','preserved-credential','USER',now()),(2,'Historical borrower','borrower@upgrade.fixture.test','preserved-credential','USER',now()),(3,'Historical admin','admin@upgrade.fixture.test','preserved-credential','ADMIN',now())`,
      );
      await db.query(
        `INSERT INTO "AuthSession" ("tokenHash","userId","expiresAt") VALUES (repeat('a',64),1,now()+interval '1 day'),(repeat('b',64),2,now()+interval '1 day')`,
      );
      await db.query('INSERT INTO "ChatReviewer" ("userId") VALUES (3)');
      await db.query(
        `INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'OWNED','Owned upgrade fixture')`,
      );
      await db.query(
        `INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,"updatedAt") VALUES (1,1,'Historical item','Preserved description','Tools',10,'Good',now())`,
      );
      await db.query(
        `INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt") VALUES (1,1,1,2,9001,'2026-01-01','2026-01-02','COMPLETED',10,10,now())`,
      );
      await db.query(
        `INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES (3,'FIXTURE_PRESERVATION','BOOKING',1,'Historical audit','{}','{}')`,
      );
      const tables = [
        "User",
        "AuthSession",
        "ChatReviewer",
        "MrtStation",
        "Listing",
        "Booking",
        "AdminAuditLog",
      ];
      const snapshot = async () => {
        const data: Record<string, unknown> = {};
        for (const table of tables)
          data[table] = (
            await db.query(
              `SELECT to_jsonb(t) value FROM "${table}" t ORDER BY ${table === "ChatReviewer" ? '"userId"' : "id"}`,
            )
          ).rows;
        return JSON.stringify(data);
      };
      const before = await snapshot(),
        history = (
          await db.query(
            'SELECT migration_name,checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
          )
        ).rows;
      // An owned fixture function collision must not leave a partial event table.
      await db.query(
        `CREATE FUNCTION account_security_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$`,
      );
      const sql = await readFile(
        path.join(root, name, "migration.sql"),
        "utf8",
      );
      await assert.rejects(db.query(sql));
      await db.query("ROLLBACK");
      assert.equal(
        (
          await db.query(
            `SELECT to_regclass('public."AccountSecurityEvent"') t`,
          )
        ).rows[0].t,
        null,
      );
      assert.ok(
        (await snapshot()) === before,
        "Partial failure modified historical records",
      );
      await db.query("DROP FUNCTION account_security_event_immutable()");
      cli("prisma7.config.ts");
      assert.ok(
        (await snapshot()) === before,
        "Upgrade modified historical records",
      );
      const after = (
        await db.query(
          'SELECT migration_name,checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
        )
      ).rows;
      assert.deepEqual(
        after.filter((r) => r.migration_name !== name),
        history,
      );
      assert.equal(after.length, history.length + 1);
      assert.equal(
        (await db.query('SELECT count(*)::int n FROM "AccountSecurityEvent"'))
          .rows[0].n,
        0,
      );
      cli("prisma7.config.ts");
      assert.ok(
        (await snapshot()) === before,
        "Replay modified historical records",
      );
      await writeFile(
        path.join(art, "password-migration.json"),
        JSON.stringify(
          {
            previousMigrations: history.length,
            finalMigrations: after.length,
            historicalRowsUnchanged: tables,
            partialFailureAtomic: true,
            replayPassed: true,
            noCredentialBackfill: true,
            noNewAuthority: true,
            oldSessionFieldsPreserved: true,
          },
          null,
          2,
        ),
      );
    } finally {
      await db.end();
    }
  },
);
