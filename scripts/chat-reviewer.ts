/** Local sandbox provisioning only. Production staff provisioning requires a separate approved process. */
import "dotenv/config";
import { connectTestDatabase } from "../tests/support/test-database";
async function main(){
  if(process.env.NODE_ENV==="production")throw Error("Production grants are not supported by this sandbox helper.");
  const id=Number(process.argv[2]);if(!Number.isSafeInteger(id)||id<1)throw Error("Supply an existing active administrator ID.");
  const enabled=!process.argv.includes("--revoke");
  const db=await connectTestDatabase();
  try{
    await db.query("BEGIN");
    const actor=(await db.query('SELECT id FROM "User" WHERE id=$1 AND role=\'ADMIN\' AND "accountStatus"=\'ACTIVE\' FOR UPDATE',[id])).rows[0];
    if(!actor)throw Error("An existing active administrator is required; this helper never changes account roles.");
    const previous=(await db.query('SELECT enabled FROM "ChatReviewer" WHERE "userId"=$1 FOR UPDATE',[id])).rows[0]?.enabled??false;
    await db.query('INSERT INTO "ChatReviewer" ("userId",enabled) VALUES ($1,$2) ON CONFLICT ("userId") DO UPDATE SET enabled=$2',[id,enabled]);
    await db.query('INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES ($1,\'CHAT_REVIEWER_GRANT\',\'USER\',$1,\'Explicit local sandbox operator provisioning\',$2,$3)',[id,JSON.stringify({chatReviewer:previous}),JSON.stringify({chatReviewer:enabled})]);
    await db.query("COMMIT");console.log(enabled?"Sandbox reviewer grant recorded.":"Sandbox reviewer revocation recorded.");
  }catch(e){await db.query("ROLLBACK");throw e;}finally{await db.end();}
}
main().catch(()=>{console.error("Reviewer grant failed. Use only a runner-owned local sandbox and an existing active administrator.");process.exitCode=1;});
