import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { connectTestDatabase } from "./support/test-database";
const run = promisify(execFile),
  migration = "20261026100000_typed_display_settings_candidate";
test(
  "Batch 10B populated upgrade, atomic DDL failure, replay and exact legacy preservation",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      dir = await mkdtemp("/tmp/hustlen-announcement-migration-"),
      migrations = path.join(dir, "migrations"),
      config = path.join(dir, "prisma.config.ts");
    const command = (...args: string[]) =>
      run(
        process.execPath,
        ["node_modules/prisma/build/index.js", ...args, "--config", config],
        { env: process.env },
      );
    const snapshot = async (table: string) =>
      (
        await db.query(
          `SELECT to_jsonb(t) row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
        )
      ).rows;
    try {
      assert.equal(
        (await db.query(`SELECT to_regclass('public."User"') n`)).rows[0].n,
        null,
      );
      await cp("prisma/migrations", migrations, { recursive: true });
      await rm(path.join(migrations, migration), { recursive: true });
      await writeFile(
        config,
        `import {defineConfig} from ${JSON.stringify(path.join(process.cwd(), "node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.join(process.cwd(), "prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL}});`,
      );
      await command("migrate", "deploy");
      await db.query(`INSERT INTO "User"(id,name,email,"passwordHash",role,"updatedAt")VALUES(1,'Historical owner','owner@fixture.test','fixture','USER',NOW()),(2,'Historical borrower','borrower@fixture.test','fixture','USER',NOW()),(3,'Historical Admin','admin@fixture.test','fixture','ADMIN',NOW());
   INSERT INTO "MrtStation"(id,code,name)VALUES(9001,'HISTORY','Historical station');
   INSERT INTO "Listing"(id,"ownerId",title,description,category,price,condition,status,"updatedAt")VALUES(1,1,'Historical item','Historical description','Cameras',10,'Good','ACTIVE',NOW());
   INSERT INTO "Booking"(id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt")VALUES(1,1,1,2,9001,'2026-01-01','2026-01-02','COMPLETED',10,10,NOW());
   INSERT INTO "AuthSession"("userId","tokenHash","expiresAt")VALUES(3,repeat('a',64),'2035-01-01');
   INSERT INTO "ChatReviewer"("userId",enabled)VALUES(3,true);
   INSERT INTO "AdminAuditLog"("adminId",action,"targetType","targetId",reason,"previousState","newState")VALUES(3,'HISTORICAL','BOOKING',1,'Historical audit','{}','{}');
   INSERT INTO "BookingEvidencePhoto"(id,"bookingId","uploaderId",stage,"mimeType",data)VALUES('00000000-0000-4000-8000-000000000001',1,1,'HANDOFF_OWNER','image/png',decode('010203','hex'));`);
      await db.query(
        `WITH n AS(INSERT INTO "Announcement"(title,body,"creatorId")VALUES('Historical notice','Preserve the original draft',3) RETURNING id)INSERT INTO "AnnouncementEvent"("announcementId","actorId",action,"previousVersion","resultingVersion","requestId","requestHash")SELECT id,3,'CREATE',0,1,gen_random_uuid(),repeat('f',64) FROM n`,
      );
      const tables = (
          await db.query(
            `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`,
          )
        ).rows.map((r) => String(r.tablename)),
        before = new Map<string, unknown[]>();
      for (const table of tables) before.set(table, await snapshot(table));
      const history = await snapshot("_prisma_migrations"),
        triggers = (
          await db.query(
            `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
          )
        ).rows;
      const sql = await readFile(
        path.join("prisma/migrations", migration, "migration.sql"),
        "utf8",
      );
      await cp(
        path.join("prisma/migrations", migration),
        path.join(migrations, migration),
        { recursive: true },
      );
      await t.test(
        "partial failure leaves no display setting objects or altered historical rows",
        async () => {
          await writeFile(
            path.join(migrations, migration, "migration.sql"),
            sql.replace("COMMIT;", "SELECT 1/0; COMMIT;"),
          );
          await assert.rejects(command("migrate", "deploy"));
          assert.equal(
            (
              await db.query(
                `SELECT to_regclass('public."DevDisplaySetting"') n`,
              )
            ).rows[0].n,
            null,
          );
          for (const table of tables)
            assert.deepEqual(await snapshot(table), before.get(table), table);
        },
      );
      await t.test(
        "explicit owned-fixture recovery, forward replay and old reader compatibility",
        async () => {
          await command("migrate", "resolve", "--rolled-back", migration);
          await writeFile(
            path.join(migrations, migration, "migration.sql"),
            sql,
          );
          await command("migrate", "deploy");
          const first = await snapshot("_prisma_migrations");
          await command("migrate", "deploy");
          assert.deepEqual(await snapshot("_prisma_migrations"), first);
          for (const table of tables)
            assert.deepEqual(await snapshot(table), before.get(table), table);
          const names = history.map((r) => r.row.migration_name);
          assert.deepEqual(
            (
              await db.query(
                `SELECT to_jsonb(t) row FROM "_prisma_migrations" t WHERE migration_name=ANY($1) ORDER BY to_jsonb(t)::text`,
                [names],
              )
            ).rows,
            history,
          );
          assert.deepEqual(
            (
              await db.query(
                `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal AND c.relname<>ALL(ARRAY['DevDisplaySetting','DevDisplaySettingEvent']) ORDER BY c.relname,t.tgname`,
              )
            ).rows,
            triggers,
          );
          assert.equal(
            (await db.query(`SELECT count(*)::int n FROM "DevDisplaySetting"`))
              .rows[0].n,
            0,
          );
          assert.equal(
            (await db.query(`SELECT role FROM "User" WHERE id=3`)).rows[0].role,
            "ADMIN",
          );
          assert.equal(
            (
              await db.query(
                `SELECT enabled FROM "ChatReviewer" WHERE "userId"=3`,
              )
            ).rows[0].enabled,
            true,
          );
        },
      );
      await t.test(
        "missing ownership marker and eventless writes fail closed; history cannot truncate",
        async () => {
          const meta = (
            await db.query(
              `SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`,
            )
          ).rows[0];
          await db.query(
            `COMMENT ON DATABASE "${meta.name}" IS 'owned-invalid-marker-test'`,
          );
          try {
            await assert.rejects(
              db.query(
                `INSERT INTO "DevDisplaySetting"(key,value,version,"actorId")VALUES('dev.announcements.visible',1,1,3)`,
              ),
            );
          } finally {
            await db.query(
              `COMMENT ON DATABASE "${meta.name}" IS '${meta.marker}'`,
            );
          }
          await assert.rejects(
            db.query(
              `INSERT INTO "DevDisplaySetting"(key,value,version,"actorId")VALUES('dev.announcements.visible',1,1,3)`,
            ),
          );
          await assert.rejects(db.query(`TRUNCATE "DevDisplaySettingEvent"`));
          await assert.rejects(
            db.query(`TRUNCATE "DevDisplaySetting" CASCADE`),
          );
          assert.equal(
            (await db.query(`SELECT count(*)::int n FROM "DevDisplaySetting"`))
              .rows[0].n,
            0,
          );
        },
      );
    } finally {
      await db.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
