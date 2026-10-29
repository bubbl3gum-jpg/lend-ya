import {test} from "node:test";
import assert from "node:assert/strict";
import {cp,mkdir,readdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {connectTestDatabase} from "./support/test-database";
test("13B-R1 additive migration preserves populated legacy records, rolls back partial SQL and replays",async()=>{
 const db=await connectTestDatabase(),art=process.env.MRT_TEST_ARTIFACT_DIR!,name="20261029110000_owned_condition_claims",root=path.resolve("prisma/migrations"),stage=path.join(art,"r2-baseline");
 const cli=(config:string)=>execFileSync(process.execPath,["node_modules/prisma/build/index.js","migrate","deploy","--config",config],{env:process.env,encoding:"utf8",stdio:["ignore","pipe","pipe"]});
 try{
 assert.equal((await db.query(`SELECT to_regclass('public."User"') name`)).rows[0].name,null);
 await mkdir(path.join(stage,"migrations"),{recursive:true});const names=(await readdir(root)).filter(n=>/^\d/.test(n)&&n<name).sort();for(const n of [...names,"migration_lock.toml"])await cp(path.join(root,n),path.join(stage,"migrations",n),{recursive:true});
 const config=path.join(stage,"prisma.config.ts");await writeFile(config,`import {defineConfig} from ${JSON.stringify(path.resolve("node_modules/prisma/config.js"))};export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))},migrations:{path:${JSON.stringify(path.join(stage,"migrations"))}},datasource:{url:process.env.DATABASE_URL}});`);cli(config);
 const user=(await db.query(`INSERT INTO "User"(name,email,"passwordHash",role,"updatedAt") VALUES('Synthetic historical owner','r2-migration@fixture.test','unchanged-fixture-hash','ADMIN',NOW())RETURNING id`)).rows[0].id;
 const borrower=(await db.query(`INSERT INTO "User"(name,email,"passwordHash","updatedAt") VALUES('Synthetic historical borrower','r2-borrower@fixture.test','unchanged-fixture-hash',NOW())RETURNING id`)).rows[0].id;
 const station=(await db.query('SELECT id FROM "MrtStation" ORDER BY id LIMIT 1')).rows[0].id;
 const listing=(await db.query(`INSERT INTO "Listing"("ownerId",title,description,category,price,condition,"updatedAt")VALUES($1,'Historical fixture','Unchanged','Cameras',15,'Unchanged',NOW())RETURNING id`,[user])).rows[0].id;
 await db.query(`INSERT INTO "Booking"("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt")VALUES($1,$2,$3,$4,'2027-01-01','2027-01-02','CONFIRMED',15,NOW())`,[listing,user,borrower,station]);
 const historicalBooking=(await db.query('SELECT id FROM "Booking" ORDER BY id LIMIT 1')).rows[0].id;
 await db.query(`INSERT INTO "BookingEvidencePhoto"(id,"bookingId","uploaderId",stage,"mimeType",data)VALUES('00000000-0000-4000-8000-000000000001',$1,$2,'HANDOFF_OWNER','image/png',decode('0102030405','hex'))`,[historicalBooking,user]);
 await db.query(`INSERT INTO "AuthSession"("userId","tokenHash","expiresAt")VALUES($1,$2,'2027-01-01')`,[user,"a".repeat(64)]);
 await db.query('INSERT INTO "ChatReviewer"("userId",enabled)VALUES($1,true)',[user]);
 await db.query(`INSERT INTO "AdminAuditLog"("adminId",action,"targetType","targetId",reason,"previousState","newState")VALUES($1,'SYNTHETIC_FIXTURE','listing',$2,'Owned historical fixture','{}','{}')`,[user,listing]);
 await db.query(`INSERT INTO "Dispute"("bookingId","openedBy",reason,description)VALUES($1,$2,'Historical concern','Original legacy allegation')`,[historicalBooking,user]);await db.query(`UPDATE "Booking" SET status='DISPUTED' WHERE id=$1`,[historicalBooking]);await db.query(`INSERT INTO "Return"("bookingId","initiatedBy","returnConfirmed","updatedAt")VALUES($1,$2,true,NOW())`,[historicalBooking,borrower]);
 const snapshot=async()=>{const result:Record<string,unknown>={};for(const table of ["User","Listing","Booking","AuthSession","ChatReviewer","AdminAuditLog","BookingEvidencePhoto","MrtStation","Dispute","Return"]){result[table]=(await db.query(`SELECT to_jsonb(t) value FROM "${table}" t ORDER BY to_jsonb(t)::text`)).rows.map(r=>r.value);}return result;};const before=await snapshot();const checksums=(await db.query('SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name')).rows;
 const sql=await readFile(path.join(root,name,"migration.sql"),"utf8");await assert.rejects(db.query(sql.replace('COMMIT;','SELECT claim_missing_function_for_failure(); COMMIT;')),(e:unknown)=>{assert.equal((e as {code:string}).code,"42883",String(e));return true;});await db.query('ROLLBACK');assert.equal((await db.query(`SELECT to_regclass('public."DevConditionClaim"') name`)).rows[0].name,null);assert.deepEqual(await snapshot(),before);
 cli(path.resolve("prisma7.config.ts"));cli(path.resolve("prisma7.config.ts"));const after=await snapshot();assert.deepEqual(after,before);assert.deepEqual((await db.query('SELECT migration_name,checksum FROM "_prisma_migrations" WHERE migration_name<$1 ORDER BY migration_name',[name])).rows,checksums);
 const allMigrations=(await readdir(root)).filter(n=>/^\d/.test(n)).sort();assert.deepEqual((await db.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name')).rows.map(r=>r.migration_name),allMigrations);
 await writeFile(path.join(art,"condition-migration.json"),JSON.stringify({baselineMigrations:names.length,additiveMigrations:1,populatedLegacyPreserved:true,sessionRoleUnchanged:true,noBackfill:true,partialSqlRollback:true,replay:true,historicalChecksumsUnchanged:true},null,2));
 }finally{await db.end();}
});
