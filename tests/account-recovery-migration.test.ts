import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { connectTestDatabase } from "./support/test-database";

test("canonical populated history survives both recovery migrations and repeat deployment", { timeout: 120000 }, async () => {
  const db = await connectTestDatabase();
  const artifact = process.env.MRT_TEST_ARTIFACT_DIR!;
  const first = "20261109090000_password_recovery";
  const second = "20261109100000_recovery_email_outbox";
  const cli = (args: string[]) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], {
    env: process.env, stdio: ["ignore", "pipe", "pipe"],
  });
  async function stagedConfig(includeRecovery: boolean) {
    const root = path.resolve(artifact, includeRecovery ? "recovery-stage" : "canonical-stage");
    await mkdir(path.join(root, "migrations"), { recursive: true });
    for (const entry of await readdir("prisma/migrations")) {
      if (entry === second || (!includeRecovery && entry === first)) continue;
      await cp(path.join("prisma/migrations", entry), path.join(root, "migrations", entry), { recursive: true });
    }
    const config = path.join(root, "prisma.config.ts");
    await writeFile(config, `import {defineConfig} from ${JSON.stringify(path.resolve("node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))},migrations:{path:${JSON.stringify(path.join(root, "migrations"))}},datasource:{url:process.env.DATABASE_URL}});`);
    return config;
  }
  async function snapshot() {
    const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename")).rows;
    const rows: Record<string, string[]> = {};
    for (const { tablename } of tables) {
      const quoted = '"' + String(tablename).replaceAll('"', '""') + '"';
      rows[tablename] = (await db.query(`SELECT row_to_json(t)::text value FROM ${quoted} t ORDER BY row_to_json(t)::text`)).rows.map(r => r.value);
    }
    return rows;
  }
  async function unchanged(before: Record<string, string[]>) {
    const after = await snapshot();
    for (const table of Object.keys(before)) assert.deepEqual(after[table], before[table], `Migration changed existing ${table} rows`);
  }
  try {
    assert.equal((await db.query(`SELECT to_regclass('public."User"') t`)).rows[0].t, null);
    cli(["migrate", "deploy", "--config", await stagedConfig(false)]);
    await db.query(`INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES (1,'Historical owner','owner@upgrade.fixture.test','preserved-credential','USER',now()),(2,'Historical borrower','borrower@upgrade.fixture.test','preserved-credential','USER',now()),(3,'Historical admin','admin@upgrade.fixture.test','preserved-credential','ADMIN',now())`);
    await db.query(`INSERT INTO "AuthSession" ("tokenHash","userId","expiresAt") VALUES (repeat('a',64),1,now()+interval '1 day')`);
    await db.query(`INSERT INTO "ChatReviewer" ("userId") VALUES (3)`);
    await db.query(`INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'OWNED','Owned migration fixture')`);
    await db.query(`INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,"updatedAt") VALUES (1,1,'Historical item','Preserved description','Tools',10,'Good',now())`);
    await db.query(`INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"dailyPrice","totalPrice","updatedAt") VALUES (1,1,1,2,9001,'2026-01-01','2026-01-02','COMPLETED',10,10,now())`);
    await db.query(`INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES (3,'FIXTURE_PRESERVATION','BOOKING',1,'Historical audit','{}','{}')`);
    const canonical = await snapshot();
    cli(["migrate", "deploy", "--config", await stagedConfig(true)]);
    await unchanged(canonical);
    await db.query(`INSERT INTO "PasswordRecovery" ("userId","tokenHash","expiresAt") VALUES (1,repeat('c',64),now()+interval '30 minutes')`);
    await db.query(`INSERT INTO "PasswordRecoveryRequest" ("emailHash","ipHash") VALUES (repeat('d',64),repeat('e',64))`);
    const recovery = await snapshot();
    cli(["migrate", "deploy", "--config", "prisma7.config.ts"]);
    await unchanged(recovery);
    cli(["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code", "--config", "prisma7.config.ts"]);
    const complete = await snapshot();
    cli(["migrate", "deploy", "--config", "prisma7.config.ts"]);
    assert.deepEqual(await snapshot(), complete);
    const report = { passed: true, canonicalTablesCompared: Object.keys(canonical).length, recoveryTablesCompared: Object.keys(recovery).length, repeatDeploymentPreservedAllRows: true };
    await writeFile(path.join(artifact, "recovery-migration-validation.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
  } finally {
    await db.end();
  }
});
