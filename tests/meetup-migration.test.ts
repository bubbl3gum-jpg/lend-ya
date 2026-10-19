import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { connectTestDatabase } from "./support/test-database";
const run = promisify(execFile),
  migration = "20261019210000_mrt_meetup_verification";
test("additive meetup migration preserves every populated pre-existing table and checksum; historical bookings stay unenrolled", async () => {
  const db = await connectTestDatabase(),
    dir = await mkdtemp("/tmp/hustlen-meetup-migration-");
  try {
    assert.equal(
      (await db.query("SELECT to_regclass('public.\"Booking\"') AS t")).rows[0]
        .t,
      null,
    );
    const migrations = path.join(dir, "migrations");
    await cp("prisma/migrations", migrations, { recursive: true });
    await rm(path.join(migrations, migration), { recursive: true });
    const config = path.join(dir, "prisma.config.ts");
    await writeFile(
      config,
      `import {defineConfig} from ${JSON.stringify(path.join(process.cwd(), "node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.join(process.cwd(), "prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL}});`,
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
      { env: process.env },
    );
    // Historical fixture preservation, not an asserted successful user/API workflow.
    await db.query(`INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES (1,'Owner','owner@example.test','fixture','USER',NOW()),(2,'Borrower','borrower@example.test','fixture','USER',NOW()),(3,'Admin','admin@example.test','fixture','ADMIN',NOW());
  INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'HISTORY','Historical unchanged station');
  INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,status,"updatedAt") VALUES (1,1,'Historical equipment','Preserve original','Cameras',10,'Good','ACTIVE',NOW());
  INSERT INTO "ListingStation" ("listingId","stationId") VALUES (1,9001);
  INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt") VALUES (1,1,1,2,9001,'2026-01-01','2026-01-02','COMPLETED',10,10,NOW()),(2,1,1,2,9001,'2026-02-01','2026-02-02','DISPUTED',10,10,NOW());
  INSERT INTO "Handoff" ("bookingId","performedBy","confirmedBy","confirmedAt","ownerConditionConfirmed","conditionConfirmed","conditionNotes","updatedAt") VALUES (1,1,2,NOW(),true,true,'Historical original',NOW()),(2,1,2,NOW(),true,true,'Disputed original',NOW());
  INSERT INTO "Return" ("bookingId","initiatedBy","confirmedBy","confirmedAt","conditionConfirmed","returnConfirmed","inspectionAccepted","conditionNotes","updatedAt") VALUES (1,2,1,NOW(),true,true,true,'Historical returned condition',NOW());
  INSERT INTO "Dispute" ("bookingId","openedBy",reason,description,status) VALUES (2,2,'Historical dispute','Keep evidence','OPEN');
  INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ('00000000-0000-4000-8000-000000000001',1,1,'HANDOFF_OWNER','image/png',decode('010203','hex'));
  INSERT INTO "Conversation" (id,"listingId","ownerId","borrowerId",version) VALUES (1,1,1,2,1);
  INSERT INTO "ConversationParticipant" ("conversationId","userId") VALUES (1,1),(1,2);
  INSERT INTO "ChatMessage" (id,"conversationId","senderId","clientMessageId","requestHash","contentHash","normalizedHash",body,sequence,"updatedSequence","deliverySequence",status,categories,"ruleCodes","policyVersion") VALUES (1,1,1,'historical-message',repeat('a',64),repeat('b',64),repeat('c',64),'Original immutable message',1,1,1,'FLAGGED',ARRAY['LINK_RISK'],ARRAY['EXTERNAL_LINK_REVIEW'],'deterministic-mvp-1');
  INSERT INTO "ChatModerationCase" ("conversationId","messageId","targetUserId","reporterId",kind,category,evidence) VALUES (1,1,1,2,'REPORT','USER_REPORT','{"messages":[]}');
  INSERT INTO "ChatAnalysisJob" ("messageId","analysisVersion","contextMessageIds","listingTitle") VALUES (1,'shadow-2.3-1',ARRAY[]::int[],'Historical equipment');
  INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES (3,'FIXTURE_PRESERVATION','BOOKING',2,'Historical audit','{}','{}');`);
    const tables = (
      await db.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename",
      )
    ).rows.map((r) => String(r.tablename));
    const snapshots = new Map<string, unknown[]>();
    for (const table of tables)
      snapshots.set(
        table,
        (
          await db.query(
            `SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
          )
        ).rows,
      );
    const old = (
      await db.query(
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
      { env: process.env },
    );
    for (const table of tables)
      assert.deepEqual(
        (
          await db.query(
            `SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
          )
        ).rows,
        snapshots.get(table),
        `${table} preserved byte values`,
      );
    assert.deepEqual(
      (
        await db.query(
          'SELECT migration_name,checksum FROM "_prisma_migrations" WHERE migration_name<>$1 ORDER BY migration_name',
          [migration],
        )
      ).rows,
      old,
    );
    for (const table of [
      "MeetupSession",
      "MeetupCheckIn",
      "MeetupFallback",
      "MeetupChallenge",
      "MeetupEvent",
      "MeetupRate",
    ])
      assert.equal(
        (await db.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0].n,
        0,
      );
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM "MrtStation"')).rows[0].n,
      snapshots.get("MrtStation")!.length,
      "Imported and historical station identities unchanged",
    );
  } finally {
    await db.end();
    await rm(dir, { recursive: true, force: true });
  }
});
