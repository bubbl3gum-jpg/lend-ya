import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
const run = promisify(execFile),
  migration = "20261024180000_staff_webauthn_foundation";
test(
  "Batch 5A populated upgrade: transactional failure, recovery, replay, preservation and old-client compatibility",
  { timeout: 120000 },
  async (t) => {
    const db = await connectTestDatabase(),
      dir = await mkdtemp("/tmp/hustlen-staff-migration-");
    const migrations = path.join(dir, "migrations"),
      config = path.join(dir, "prisma.config.ts");
    const command = async (...args: string[]) =>
      run(
        process.execPath,
        ["node_modules/prisma/build/index.js", ...args, "--config", config],
        { env: process.env },
      );
    try {
      assert.equal(
        (await db.query(`SELECT to_regclass('public."User"') AS name`)).rows[0]
          .name,
        null,
        "Runner must supply an empty owned database",
      );
      await cp("prisma/migrations", migrations, { recursive: true });
      // Exclude the later SQL-managed Support candidate from this historical fixture.
      await rm(path.join(migrations,"20261026010000_scoped_support_candidate"),{recursive:true});

      await rm(path.join(migrations, migration), { recursive: true });

      await writeFile(
        config,
        `import {defineConfig} from ${JSON.stringify(path.join(process.cwd(), "node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.join(process.cwd(), "prisma/schema.prisma"))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL}});`,
      );
      await command("migrate", "deploy");
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
      await db.query(
        `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES (1,repeat('d',64),'2035-01-01'),(3,repeat('e',64),'2035-01-01'); INSERT INTO "ChatReviewer" ("userId",enabled) VALUES (3,true);`,
      );
      await db.query(`INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ('10000000-0000-4000-8000-000000000001','VERIFIED',repeat('1',64),'10000000-0000-4000-8000-000000000011',NOW()),('10000000-0000-4000-8000-000000000002','VERIFIED',repeat('2',64),'10000000-0000-4000-8000-000000000012',NOW());
      INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ('10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000001',1,'VERIFIED','10000000-0000-4000-8000-000000000031',NOW());
      INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ('10000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000001','OPERATIONS','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000051','hustlen-admin-shadow-v1',NOW(),NOW()+interval '1 day');
      INSERT INTO "StaffCapabilityGrant" (id,"membershipId",action,"policyVersion",scope,"resourceKind","resourceId","purposeCode","issuedByPersonId","provenanceRef","validFrom","expiresAt") VALUES ('10000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000041','listings.read','hustlen-admin-shadow-v1','RESOURCE','listing','1','OPERATIONS_METADATA','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000071',NOW(),NOW()+interval '1 hour');`);
      await db.query(`INSERT INTO "StaffStepUpRecord" (id,"associationId","authSessionId","authSessionCreatedAt",assurance,"issuerRef","proofRef","authenticatedAt","expiresAt") SELECT '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000021',id,"createdAt",'MFA','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',NOW()-interval '1 minute',NOW()+interval '10 minutes' FROM "AuthSession" WHERE "userId"=1;
      INSERT INTO "StaffSessionBinding" (id,"authSessionId","authSessionCreatedAt","associationId","membershipId","stepUpId","authorizationVersion","policyVersion","expiresAt","provenanceRef") SELECT '20000000-0000-4000-8000-000000000004',s.id,s."createdAt",'10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000041','20000000-0000-4000-8000-000000000001',v.version,'hustlen-admin-shadow-v1',NOW()+interval '5 minutes','20000000-0000-4000-8000-000000000005' FROM "AuthSession" s CROSS JOIN "StaffAuthorizationVersion" v WHERE s."userId"=1 AND v."personId"='10000000-0000-4000-8000-000000000001';
      INSERT INTO "StaffSecurityEvent" ("correlationId","bindingId","policyVersion",action,"resourceKind","resourceId",outcome,"reasonCode") VALUES ('20000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000004','hustlen-admin-shadow-v1','listings.read','listing','1','DENIED','ACCESS_DENIED');`);
      const tables = (
        await db.query(
          `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`,
        )
      ).rows.map((row) => String(row.tablename));
      const snapshot = async (table: string) =>
        (
          await db.query(
            `SELECT to_jsonb(t) AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      const before = new Map<string, unknown[]>();
      for (const table of tables) before.set(table, await snapshot(table));
      const oldHistory = (
        await db.query(
          `SELECT to_jsonb(t) AS row FROM "_prisma_migrations" t ORDER BY migration_name`,
        )
      ).rows;
      const oldNames = (
        await db.query(
          `SELECT migration_name FROM "_prisma_migrations" ORDER BY migration_name`,
        )
      ).rows.map((row) => row.migration_name);
      const oldTriggers = (
        await db.query(
          `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
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
        "a failed forward migration rolls back all new DDL without changing historical rows",
        async () => {
          await writeFile(
            path.join(migrations, migration, "migration.sql"),
            sql.replace("COMMIT;", "SELECT 1/0;\nCOMMIT;"),
          );
          await assert.rejects(command("migrate", "deploy"));
          assert.equal(
            (
              await db.query(
                `SELECT to_regclass('public."StaffMfaCredential"') AS name`,
              )
            ).rows[0].name,
            null,
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM pg_type WHERE typname='StaffMfaPurpose'`,
              )
            ).rows[0].n,
            0,
          );
          for (const table of tables)
            assert.deepEqual(await snapshot(table), before.get(table), table);
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
                [migration],
              )
            ).rows[0].n,
            1,
          );
        },
      );
      await t.test(
        "explicit rollback resolution and replay apply only the exact reviewed forward migration",
        async () => {
          await command("migrate", "resolve", "--rolled-back", migration);
          await writeFile(
            path.join(migrations, migration, "migration.sql"),
            sql,
          );
          await command("migrate", "deploy");
          const first = await snapshot("_prisma_migrations");
          await command("migrate", "deploy");
          assert.deepEqual(
            await snapshot("_prisma_migrations"),
            first,
            "No-op replay must not rewrite migration history",
          );
          for (const table of tables)
            assert.deepEqual(
              await snapshot(table),
              before.get(table),
              `${table}: complete row preservation`,
            );
          assert.deepEqual(
            (
              await db.query(
                `SELECT to_jsonb(t) AS row FROM "_prisma_migrations" t WHERE migration_name=ANY($1::text[]) ORDER BY migration_name`,
                [oldNames],
              )
            ).rows,
            oldHistory,
          );
          for (const name of oldNames) {
            const checksum = createHash("sha256")
              .update(
                await readFile(
                  path.join("prisma/migrations", name, "migration.sql"),
                ),
              )
              .digest("hex");
            assert.equal(
              (
                await db.query(
                  'SELECT checksum FROM "_prisma_migrations" WHERE migration_name=$1',
                  [name],
                )
              ).rows[0].checksum,
              checksum,
            );
          }
          const triggers = (
            await db.query(
              `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal AND c.relname=ANY($1::text[]) ORDER BY c.relname,t.tgname`,
              [tables],
            )
          ).rows;
          assert.deepEqual(triggers, oldTriggers);
          for (const table of [
            "StaffMfaCredential",
            "StaffMfaVersion",
            "StaffMfaChallenge",
            "StaffMfaAssurance",
            "StaffMfaEvent",
            "StaffMfaRateLimit",
          ])
            assert.equal(
              (await db.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
                .n,
              0,
              `${table} unprovisioned`,
            );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "StaffCapabilityContract"`,
              )
            ).rows[0].n,
            74,
          );
        },
      );
      await t.test(
        "the exact Batch 4B Prisma schema/client still reads users, sessions, bookings and reviewer grants after upgrade",
        async () => {
          const artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
            schemaFile = path.join(artifact, "legacy.prisma"),
            output = path.join(artifact, "legacy-client");
          const baseline = (
            await run("git", [
              "show",
              "c017ca878da65d44059988067ef6263448bd9875:prisma/schema.prisma",
            ])
          ).stdout;
          await writeFile(
            schemaFile,
            baseline.replace(
              'provider = "prisma-client-js"',
              `provider = "prisma-client-js"\n  output = ${JSON.stringify(output)}`,
            ),
          );
          await command("generate", "--schema", schemaFile);
          const { PrismaClient } = await import(
            pathToFileURL(path.join(output, "index.js")).href
          );
          const legacy = new PrismaClient({
            adapter: new PrismaPg({
              connectionString: process.env.TEST_DATABASE_URL!,
            }),
          });
          try {
            assert.ok("staffPerson" in legacy);
            assert.equal(await legacy.staffPerson.count(), 2);
            assert.equal(
              (await legacy.staffMembership.findFirst()).state,
              "DRAFT",
            );
            assert.ok("staffSessionBinding" in legacy);
            assert.ok("staffChangeRequest" in legacy);
            assert.ok(!("staffMfaCredential" in legacy));
            assert.equal(
              (
                await legacy.user.findUnique({
                  where: { id: 3 },
                  select: { role: true },
                })
              ).role,
              "ADMIN",
            );
            assert.equal(
              (await legacy.chatReviewer.findUnique({ where: { userId: 3 } }))
                .enabled,
              true,
            );
            assert.equal(
              (
                await legacy.authSession.findUnique({
                  where: { tokenHash: "e".repeat(64) },
                })
              ).userId,
              3,
            );
            assert.equal(
              (await legacy.booking.findUnique({ where: { id: 1 } })).status,
              "COMPLETED",
            );
            assert.equal(
              Buffer.from(
                (
                  await legacy.bookingEvidencePhoto.findFirst({
                    where: { bookingId: 1 },
                  })
                ).data,
              ).toString("hex"),
              "010203",
            );
          } finally {
            await legacy.$disconnect();
          }
        },
      );
      const evidence = {
        baseline: "c017ca878da65d44059988067ef6263448bd9875",
        legacyTablesCompared: tables,
        legacyRowsCompared: Object.fromEntries(
          [...before].map(([name, rows]) => [name, rows.length]),
        ),
        historicalMigrationNames: oldNames,
        historicalTriggersPreserved: oldTriggers.length,
        failureDdlRolledBack: true,
        exactForwardMigrationRecovered: true,
        replayNoOp: true,
        oldClientCompatible: true,
        noAdditionalStaffProvisioned: true,
        fixtureBaselineHasPendingStaff: true,
      };
      await writeFile(
        path.join(process.env.MRT_TEST_ARTIFACT_DIR!, "mfa-preservation.json"),
        JSON.stringify(evidence, null, 2),
      );
    } finally {
      await db.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
