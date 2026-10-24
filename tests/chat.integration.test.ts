import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { openSync, closeSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, expect, type Page } from "@playwright/test";
import { loginDiagnostics } from "./support/login-diagnostics";
import { connectTestDatabase } from "./support/test-database";
import { prisma } from "../lib/prisma";
import { claimAnalysis, finishAnalysis, processAnalysis } from "../lib/chat/analysis/jobs";
import { MockProvider, type AnalysisProvider } from "../lib/chat/analysis/provider";
import { checklistItems } from "../lib/rental-checklist";
type Actor = {id:number;email:string;cookie:string};
type Message = {id:number;body:string;status:string;sequence:number;updatedSequence:number;deliverySequence:number|null;senderId:number};
type Case = {id:number;messageId:number|null;version:number;status:string;kind:string;targetUserId:number};
type Payload = {analysis:{id:number;messageId:number;status:string;recommendation:{suggestedOutcome:string;requiresHumanReview:boolean;providerVersion:string}|null}[];user:{id:number};listing:{id:number};conversationId:number;message:Message;messages:Message[];cursor:number;hasMore:boolean;nextBefore:number|null;conversation:{unreadCount:number;lastReadSequence:number};cases:Case[];case:Case;caseId:number;booking:{id:number;status:string};notices:{corrected:boolean}[];quote:{dailyPrice:string;totalPrice:string;deposit:string};code:string;outcome:string;replayed:boolean;conversations:{id:number;lastActivityAt:string}[]};
test("Milestone 2: isolated chat, multilingual safety, scoped review, browser delivery and restart persistence",{timeout:300000},async(t)=>{
  const db=await connectTestDatabase();
  const base=`http://localhost:${process.env.TEST_CHAT_PORT}`,tag=randomUUID(),password="IsolatedChat123!";
  const logfile=path.join(process.env.MRT_TEST_ARTIFACT_DIR!,"chat-server.log"),log=openSync(logfile,"a");
  let server:ChildProcess|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  async function stop(){if(server&&server.exitCode===null&&server.signalCode===null){const done=once(server,"exit");server.kill("SIGTERM");const timer=setTimeout(()=>server?.kill("SIGKILL"),5000);await done;clearTimeout(timer);}}
  async function start(enabled:boolean,analysisMode="mock-shadow"){server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","localhost","--port",String(process.env.TEST_CHAT_PORT)],{env:{...process.env,NODE_ENV:"development",CHAT_ENABLED:String(enabled),CHAT_PREVIEW_USER_IDS:"",CHAT_ANALYSIS_MODE:analysisMode},stdio:["ignore",log,log]});for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error("Chat server stopped; inspect owned artifact log.");try{if((await fetch(base+"/api/listings",{signal:AbortSignal.timeout(2000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error("Chat server did not become ready.");}
  const api=async(url:string,cookie="",method="GET",body?:object|FormData,headers:Record<string,string>={})=>{const r=await fetch(base+url,{method,headers:{Cookie:cookie,...(body instanceof FormData?{}:{"Content-Type":"application/json"}),...headers},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{}),redirect:"manual"});const bytes=Buffer.from(await r.arrayBuffer());let json={} as Payload;try{json=JSON.parse(bytes.toString());}catch{}return {status:r.status,json,bytes,cookie:r.headers.get("set-cookie")?.split(";")[0]??""};};
  const register=async(name:string):Promise<Actor>=>{const email=`${name}-${tag}@example.test`;const r=await api("/api/auth/register","","POST",{name,email,password});assert.equal(r.status,201);return {id:r.json.user.id,email,cookie:r.cookie};};
  try{
    await start(false);
    const owner=await register("ChatOwner"),borrower=await register("ChatBorrower"),outsider=await register("Outsider"),admin=await register("ReviewerOne"),admin2=await register("ReviewerTwo"),plainAdmin=await register("UngrantAdmin");
    await db.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=ANY($1::int[])',[[admin.id,admin2.id,plainAdmin.id]]);
    for(const actor of [admin,admin2])execFileSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/chat-reviewer.ts",String(actor.id)],{env:process.env,stdio:"pipe"});
    const station=(await db.query('SELECT id FROM "MrtStation" WHERE code=\'TPE\'')).rows[0].id;
    const image=await sharp({create:{width:8,height:8,channels:3,background:"blue"}}).png().toBuffer();
    const form=new FormData();for(const [k,v]of Object.entries({title:`Chat fixture ${tag}`,description:"Isolated item",category:"Cameras",condition:"Good",price:"10",stationIds:JSON.stringify([station])}))form.set(k,v);form.append("photos",new File([new Uint8Array(image)],"item.png",{type:"image/png"}));
    const listing=await api("/api/listings",owner.cookie,"POST",form);assert.equal(listing.status,201);const listingId=listing.json.listing.id;
    let cid=0,firstId=0,heldCase=0,heldId=0,paginationConversationId=0,paginationReleasedBody="";
    const send=(actor:Actor,body:string,extra:object={},key=randomUUID())=>api(`/api/conversations/${cid}/messages`,actor.cookie,"POST",{body,clientMessageId:key,...extra});
    const caseFor=async(messageId:number)=>(await db.query('SELECT id FROM "ChatModerationCase" WHERE "messageId"=$1 AND kind=\'SYSTEM\'',[messageId])).rows[0].id as number;
    const claim=async(actor:Actor,id:number)=>api(`/api/admin/chat/cases/${id}/claim`,actor.cookie,"POST",{});
    const read=async(actor:Actor,id:number)=>api(`/api/admin/chat/cases/${id}`,actor.cookie);
    const decide=async(actor:Actor,id:number,action:string,reason="Reviewed contextual evidence",classification="NO_VIOLATION")=>{const r=await read(actor,id);assert.equal(r.status,200);return api(`/api/admin/chat/cases/${id}/decision`,actor.cookie,"POST",{action,reason,classification,expectedVersion:r.json.case.version});};
    await t.test("feature flag is server-side, off by default, with no general-user bypass",async()=>{
      assert.equal((await api("/api/conversations",borrower.cookie,"POST",{listingId})).status,503);
      assert.equal((await api("/api/conversations",borrower.cookie,"GET",undefined,{"X-Chat-Enabled":"true"})).status,503);
      assert.equal((await db.query('SELECT count(*)::int n FROM "Conversation"')).rows[0].n,0);
      assert.equal((await api("/api/admin/chat/cases",plainAdmin.cookie)).status,403);
      const page=await fetch(base+"/messages",{headers:{Cookie:borrower.cookie}});assert.match(await page.text(),/Private chat is disabled/);
      await stop();await start(true);
    });
    await t.test("pre-booking creation deduplicates races, derives participants and rejects forged identities",async()=>{
      assert.equal((await api("/api/conversations","","POST",{listingId})).status,401);
      assert.equal((await api("/api/conversations",owner.cookie,"POST",{listingId})).status,400);
      assert.equal((await api("/api/conversations",borrower.cookie,"POST",{listingId,ownerId:outsider.id})).status,400);
      const r=await Promise.all(Array.from({length:3},()=>api("/api/conversations",borrower.cookie,"POST",{listingId})));
      r.forEach(x=>assert.equal(x.status,200));cid=r[0].json.conversationId;r.forEach(x=>assert.equal(x.json.conversationId,cid));
      assert.equal((await db.query('SELECT count(*)::int n FROM "Conversation"')).rows[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int n FROM "Booking"')).rows[0].n,0);
      assert.equal((await api(`/api/conversations/${cid}/messages`,outsider.cookie)).status,404);
      assert.equal((await api("/api/conversations",outsider.cookie)).json.conversations.length,0);
      assert.equal((await send(borrower,"Forged",{senderId:owner.id})).status,400);
      assert.equal((await send(borrower,"Forged time",{createdAt:"2000-01-01"})).status,400);
      assert.equal((await send(outsider,"Intrusion")).status,404);
      const foreign=await api("/api/conversations",outsider.cookie,"POST",{listingId});assert.equal(foreign.status,200);assert.notEqual(foreign.json.conversationId,cid);
    });
    await t.test("idempotent sends, ordered pagination, reconnect cursors and monotonic read state",async()=>{
      const key=randomUUID(),body=`First chat ${tag}`;const pair=await Promise.all([send(borrower,body,{},key),send(borrower,body,{},key)]);pair.forEach(r=>assert.equal(r.status,200));firstId=pair[0].json.message.id;assert.equal(pair[1].json.message.id,firstId);
      assert.equal((await send(borrower,"changed",{},key)).status,409);
      assert.equal((await send(borrower,body)).status,429);
      assert.equal((await send(borrower,"bad\u0000text")).json.outcome,"REJECTED");
      for(const body of ["Reply from owner", "Pickup details next", "Another followup"]){assert.equal((await send(owner,`${body} ${tag}`)).status,200);}
      let cursor=0;const ids:number[]=[];for(let i=0;i<5;i++){const r=await api(`/api/conversations/${cid}/messages?after=${cursor}&limit=2`,owner.cookie);assert.equal(r.status,200);ids.push(...r.json.messages.map(m=>m.id));assert.ok(r.json.cursor>=cursor);cursor=r.json.cursor;if(!r.json.hasMore)break;}assert.equal(new Set(ids).size,4);
      const latest=await api(`/api/conversations/${cid}/messages?limit=2`,borrower.cookie);assert.equal(latest.json.messages.length,2);assert.ok(latest.json.nextBefore);const older=await api(`/api/conversations/${cid}/messages?before=${latest.json.nextBefore}&limit=2`,borrower.cookie);assert.equal(older.json.messages.length,2);
      const newest=latest.json.messages[1];assert.equal((await api(`/api/conversations/${cid}/read`,borrower.cookie,"POST",{throughMessageId:newest.id})).status,200);
      const prior=(await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.conversation.lastReadSequence;await api(`/api/conversations/${cid}/read`,borrower.cookie,"POST",{throughMessageId:firstId});assert.equal((await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.conversation.lastReadSequence,prior);
      assert.equal((await api(`/api/conversations/${cid}/messages?after=999999`,borrower.cookie)).status,400);
    });
    await t.test("held-message privacy, case assignment, bounded evidence, read auditing and delayed release recovery",async()=>{
      const held=await send(owner,`I will kill you ${tag}`);assert.equal(held.json.message.status,"HELD");heldId=held.json.message.id;heldCase=await caseFor(heldId);
      assert.ok(!(await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.messages.some(m=>m.id===heldId));
      assert.equal((await api(`/api/conversations/${cid}/read`,borrower.cookie,"POST",{throughMessageId:heldId})).status,400);
      const later=await send(owner,`Later allowed update ${tag}`);assert.equal(later.status,200);const before=(await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.cursor;await api(`/api/conversations/${cid}/read`,borrower.cookie,"POST",{throughMessageId:later.json.message.id});
      assert.equal((await read(plainAdmin,heldCase)).status,403);assert.equal((await read(admin,heldCase)).status,403);assert.equal((await claim(admin,heldCase)).status,200);assert.equal((await claim(admin2,heldCase)).status,409);assert.equal((await read(admin2,heldCase)).status,403);
      const detail=await read(admin,heldCase);assert.equal(detail.status,200);assert.ok(detail.json.messages.length<=5);assert.ok(detail.json.messages.some(m=>m.id===heldId));
      const audit=(await db.query('SELECT * FROM "AdminAuditLog" WHERE action=\'CHAT_EVIDENCE_VIEWED\' AND "targetId"=$1',[heldCase])).rows;assert.ok(audit.length);assert.equal(audit[0].adminId,admin.id);assert.ok(!JSON.stringify(audit).includes(`I will kill you ${tag}`));
      const released=await decide(admin,heldCase,"RELEASE","Quoted text reviewed; no account penalty");assert.equal(released.status,200);
      const delta=await api(`/api/conversations/${cid}/messages?after=${before}`,borrower.cookie);assert.ok(delta.json.messages.some(m=>m.id===heldId));assert.equal(delta.json.conversation.unreadCount,1);
      assert.equal((await db.query('SELECT count(*)::int n FROM "ChatOutboxEvent" WHERE "dedupKey"=$1',[`message:${heldId}:visible`])).rows[0].n,1);
      assert.equal((await api(`/api/admin/chat/cases/${heldCase}/decision`,admin.cookie,"POST",{action:"RELEASE",reason:"duplicate",classification:"NO_VIOLATION",expectedVersion:detail.json.case.version})).status,409);
      await assert.rejects(db.query('UPDATE "ChatMessage" SET body=\'rewritten\' WHERE id=$1',[heldId]),/immutable/);
      await assert.rejects(db.query('UPDATE "ChatModerationCase" SET evidence=\'{"messages":[]}\' WHERE id=$1',[heldCase]),/immutable/);
    });
    await t.test("context-sensitive multilingual messages, technical limits, user reports and per-user rate limits",async()=>{
      for(const body of ["How can we report scams and drugs?", "請問如何檢舉毒品與性交易？", "Bagaimana melaporkan narkoba dan penipuan?"]){const r=await send(borrower,`${body} ${tag}`);assert.equal(r.json.message.status,"ALLOWED");}
      for(const body of ["Someone said 'I will kill you'; I am reporting it", "不要販售毒品", "Jangan jual narkoba"]){const r=await send(borrower,`${body} ${tag}`);assert.notEqual(r.json.message.status,"HELD");}
      const flagged=await send(owner,`You are an idiot ${tag}`);assert.equal(flagged.json.message.status,"FLAGGED");const reported=await api(`/api/conversations/${cid}/report`,borrower.cookie,"POST",{messageId:flagged.json.message.id,reason:"Harassment"});assert.equal(reported.status,200);assert.equal((await api(`/api/conversations/${cid}/report`,borrower.cookie,"POST",{messageId:flagged.json.message.id,reason:"retry"})).json.caseId,reported.json.caseId);
      assert.equal((await api(`/api/conversations/${cid}/report`,outsider.cookie,"POST",{reason:"outsider"})).status,404);
      assert.equal((await api(`/api/conversations/${cid}/report`,borrower.cookie,"POST",{messageId:999999,reason:"fake"})).status,404);
      const key=`send:${borrower.id}:${Math.floor(Date.now()/60000)}`;await db.query('INSERT INTO "ChatRateLimit" (key,attempts,"expiresAt") VALUES ($1,20,NOW()+INTERVAL \'1 minute\') ON CONFLICT (key) DO UPDATE SET attempts=20',[key]);assert.equal((await send(borrower,`Rate denied ${tag}`)).status,429);assert.equal((await send(owner,`Other account remains usable ${tag}`)).status,200);await db.query('DELETE FROM "ChatRateLimit" WHERE key=$1',[key]);
      assert.equal((await send(owner,"a".repeat(4001))).status,400);
      assert.equal((await api(`/api/conversations/${cid}/messages`,owner.cookie,"POST",{body:"Hostile origin",clientMessageId:randomUUID()},{Origin:"https://evil.example","Sec-Fetch-Site":"cross-site"})).status,403);
    });
    await t.test("human warnings, rejection, independent appeals/corrections and audit failure fail closed",async()=>{
      const before=(await db.query('SELECT "accountStatus","trustScore" FROM "User" WHERE id=$1',[owner.id])).rows[0];
      const warning=await send(owner,`Kamu bodoh warning ${tag}`),caseId=await caseFor(warning.json.message.id);await claim(admin,caseId);assert.equal((await decide(admin,caseId,"WARN","Please avoid personal insults","HARASSMENT")).status,200);
      const appeal=await api(`/api/chat/cases/${caseId}/appeal`,owner.cookie,"POST",{reason:"Please correct this warning"});assert.equal(appeal.status,200);assert.equal((await claim(admin,appeal.json.caseId)).status,403);await claim(admin2,appeal.json.caseId);assert.equal((await decide(admin2,appeal.json.caseId,"CORRECT","Warning corrected after independent review")).status,200);assert.ok((await api("/api/conversations",owner.cookie)).json.notices.some(n=>n.corrected));
      const reject=await send(owner,`I sell cocaine ${tag}`),rejectCase=await caseFor(reject.json.message.id);await claim(admin,rejectCase);assert.equal((await decide(admin,rejectCase,"REJECT","Offer not permitted","ILLEGAL_GOODS")).status,200);assert.ok(!(await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.messages.some(m=>m.id===reject.json.message.id));
      const correction=await api(`/api/chat/cases/${rejectCase}/appeal`,owner.cookie,"POST",{reason:"Context was misunderstood"});await claim(admin2,correction.json.caseId);assert.equal((await decide(admin2,correction.json.caseId,"RELEASE","Corrected disposition after context review")).status,200);
      assert.deepEqual((await db.query('SELECT "accountStatus","trustScore" FROM "User" WHERE id=$1',[owner.id])).rows[0],before);
      await db.query(`CREATE FUNCTION chat_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='CHAT_EVIDENCE_VIEWED' THEN RAISE EXCEPTION 'Injected access audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER chat_fail_audit BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION chat_fail_audit()`);
      try{const denied=await read(admin,heldCase);assert.equal(denied.status,500);assert.ok(!denied.bytes.toString().includes(`I will kill you ${tag}`));}finally{await db.query('DROP TRIGGER chat_fail_audit ON "AdminAuditLog"; DROP FUNCTION chat_fail_audit()');}
      assert.ok(!readFileSync(logfile,"utf8").includes(`I will kill you ${tag}`),"Ordinary application logs must not contain private message bodies");
    });
    await t.test("fixed classifications preserve original text and enqueue exactly one shadow job per idempotent message",async()=>{
      await db.query('DELETE FROM "ChatRateLimit"');
      const idiom=await send(owner,`I will kill you with kindness ${tag}`);assert.equal(idiom.json.message.status,"ALLOWED");
      const body=`selling c0caine ${tag}`,key=randomUUID();const replies=await Promise.all([send(owner,body,{},key),send(owner,body,{},key)]);
      replies.forEach(r=>assert.equal(r.status,200));assert.equal(replies[0].json.message.id,replies[1].json.message.id);const id=replies[0].json.message.id;
      assert.equal(replies[0].json.message.status,"HELD");assert.equal(replies[0].json.message.body,body);
      assert.equal((await db.query('SELECT count(*)::int n FROM "ChatAnalysisJob" WHERE "messageId"=$1',[id])).rows[0].n,1);
      assert.equal((await db.query('SELECT count(*)::int n FROM "ChatModerationCase" WHERE "messageId"=$1',[id])).rows[0].n,1);
      const job=(await db.query('SELECT * FROM "ChatAnalysisJob" WHERE "messageId"=$1',[id])).rows[0];assert.ok(job.contextMessageIds.length<=2);
      const snapshot=(await db.query('SELECT evidence FROM "ChatModerationCase" WHERE "messageId"=$1',[id])).rows[0].evidence;
      assert.ok(job.contextMessageIds.every((n:number)=>snapshot.messages.some((m:{id:number})=>m.id===n)));
    });
    await t.test("durable shadow timeout/outage recovery, scoped audited display and independent human disagreement",async()=>{
      for(let n=0;n<100;n++){if(!(await processAnalysis(prisma)).processed)break;}
      const held=await send(owner,`I will attack you shadow ${tag}`),id=held.json.message.id,caseId=await caseFor(id);
      const before=(await db.query('SELECT * FROM "ChatMessage" WHERE id=$1',[id])).rows[0];
      const conversationBefore=(await db.query('SELECT version FROM "Conversation" WHERE id=$1',[cid])).rows[0];
      const provider:AnalysisProvider={providerVersion:"outage-test",modelVersion:"test",analyze:()=>new Promise(()=>{})};
      assert.equal((await processAnalysis(prisma,provider,15)).errorCode,"TIMEOUT");
      const job=(await db.query('SELECT * FROM "ChatAnalysisJob" WHERE "messageId"=$1',[id])).rows[0];assert.equal(job.status,"WAITING");assert.equal(job.attempts,1);assert.equal((await processAnalysis(prisma)).processed,false);
      await stop();await start(true);assert.equal((await db.query('SELECT status FROM "ChatAnalysisJob" WHERE id=$1',[job.id])).rows[0].status,"WAITING");
      assert.ok(!(await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.messages.some(m=>m.id===id));
      await db.query('UPDATE "ChatAnalysisJob" SET "availableAt"=NOW() WHERE id=$1',[job.id]);
      assert.equal((await processAnalysis(prisma,{...provider,analyze:async()=>{throw Error("PRIVATE_PROVIDER_FAILURE_BODY");}})).errorCode,"PROVIDER_UNAVAILABLE");
      await db.query('UPDATE "ChatAnalysisJob" SET "availableAt"=NOW() WHERE id=$1',[job.id]);assert.equal((await processAnalysis(prisma)).status,"SUCCEEDED");
      assert.deepEqual((await db.query('SELECT * FROM "ChatMessage" WHERE id=$1',[id])).rows[0],before);
      assert.deepEqual((await db.query('SELECT version FROM "Conversation" WHERE id=$1',[cid])).rows[0],conversationBefore);
      assert.equal((await read(plainAdmin,caseId)).status,403);assert.equal((await read(admin,caseId)).status,403);await claim(admin,caseId);assert.equal((await read(admin2,caseId)).status,403);
      const detail=await read(admin,caseId),analysis=detail.json.analysis.find(a=>a.messageId===id);assert.equal(analysis?.recommendation?.suggestedOutcome,"HELD");assert.equal(analysis?.recommendation?.requiresHumanReview,true);
      const narrow=await prisma.chatModerationCase.create({data:{conversationId:cid,messageId:id,targetUserId:owner.id,reporterId:borrower.id,kind:"REPORT",category:"USER_REPORT",reportReason:"Synthetic narrower evidence grant",evidence:{messages:[{id,contentHash:before.contentHash}]}}});
      await claim(admin,narrow.id);const scoped=await read(admin,narrow.id);assert.equal(scoped.status,200);assert.equal(scoped.json.messages.length,1);assert.ok(!scoped.json.analysis.some(a=>a.messageId===id),"Recommendation influenced by out-of-snapshot context must be omitted");
      const audit=(await db.query('SELECT "newState" FROM "AdminAuditLog" WHERE action=\'CHAT_EVIDENCE_VIEWED\' AND "targetId"=$1 ORDER BY id DESC LIMIT 1',[caseId])).rows[0].newState;assert.ok(audit.analysisJobIds.includes(job.id));
      await assert.rejects(db.query('UPDATE "ChatAnalysisJob" SET recommendation=\'{}\' WHERE id=$1',[job.id]),/immutable/);
      await assert.rejects(db.query('DELETE FROM "ChatAnalysisJob" WHERE id=$1',[job.id]),/immutable/);
      assert.equal((await decide(admin,caseId,"RELEASE","Human reviewer disagrees with unverified mock recommendation")).status,200);
      assert.ok((await api(`/api/conversations/${cid}/messages`,borrower.cookie)).json.messages.some(m=>m.id===id));
      assert.ok(!JSON.stringify((await db.query('SELECT * FROM "ChatAnalysisJob" WHERE id=$1',[job.id])).rows).includes("PRIVATE_PROVIDER_FAILURE_BODY"));
    });
    await t.test("malformed responses exhaust at three attempts without releasing holds; leases fence stale workers",async()=>{
      const held=await send(owner,`I will stab you invalid ${tag}`),id=held.json.message.id;
      const malformed={...new MockProvider(),providerVersion:"malformed",modelVersion:"test",analyze:async()=>({banUser:true})};
      for(let n=0;n<3;n++){await db.query('UPDATE "ChatAnalysisJob" SET "availableAt"=NOW() WHERE "messageId"=$1',[id]);const result=await processAnalysis(prisma,malformed);assert.equal(result.errorCode,"INVALID_RESPONSE");assert.equal(result.status,n===2?"FAILED":"WAITING");}
      const job=(await db.query('SELECT * FROM "ChatAnalysisJob" WHERE "messageId"=$1',[id])).rows[0];assert.equal(job.attempts,3);assert.equal((await processAnalysis(prisma)).processed,false);assert.equal((await db.query('SELECT status FROM "ChatMessage" WHERE id=$1',[id])).rows[0].status,"HELD");
      await send(owner,`Lease fixture ${tag}`);const claims=await Promise.all([claimAnalysis(prisma),claimAnalysis(prisma)]);assert.equal(claims.filter(Boolean).length,1);const first=claims.find(Boolean)!;
      await db.query('UPDATE "ChatAnalysisJob" SET "leaseUntil"=NOW()-INTERVAL \'1 second\' WHERE id=$1',[first.id]);const second=await claimAnalysis(prisma);assert.equal(second?.id,first.id);assert.notEqual(second?.leaseToken,first.leaseToken);
      assert.equal((await finishAnalysis(prisma,first,{errorCode:"TIMEOUT"})).count,0);assert.equal((await finishAnalysis(prisma,second!,{errorCode:"TIMEOUT"})).count,1);
      await db.query('UPDATE "ChatAnalysisJob" SET "availableAt"=NOW() WHERE id=$1',[first.id]);const last=await claimAnalysis(prisma);assert.equal(last?.attempts,3);await db.query('UPDATE "ChatAnalysisJob" SET "leaseUntil"=NOW()-INTERVAL \'1 second\' WHERE id=$1',[first.id]);assert.equal(await claimAnalysis(prisma),null);assert.equal((await db.query('SELECT status FROM "ChatAnalysisJob" WHERE id=$1',[first.id])).rows[0].status,"FAILED");
    });
    await t.test("booking references, blocks, suspension and safe coordination preserve the complete rental lifecycle",async()=>{
      const input={listingId,meetingStationId:station,startAt:"2035-01-01T10:00",endAt:"2035-01-02T10:00"};const quote=await api("/api/bookings",borrower.cookie,"POST",{...input,quote:true});assert.equal(quote.status,200);
      const b=await api("/api/bookings",borrower.cookie,"POST",input),bid=b.json.booking.id;assert.equal(b.status,201);assert.equal((await send(borrower,`Related booking ${tag}`,{bookingId:bid})).status,200);assert.equal((await send(outsider,"Foreign booking",{bookingId:bid})).status,404);
      const foreign=await api("/api/bookings",outsider.cookie,"POST",input);assert.equal(foreign.status,201);assert.equal((await send(borrower,"Wrong pair",{bookingId:foreign.json.booking.id})).status,400);
      assert.equal((await api(`/api/bookings/${bid}`,owner.cookie,"PATCH",{action:"accept"})).status,200);
      assert.equal((await api(`/api/conversations/${cid}/block`,borrower.cookie,"POST",{blocked:true})).status,200);assert.equal((await send(owner,"Blocked owner")).status,403);assert.equal((await send(borrower,"Blocked borrower")).status,403);
      assert.equal((await api(`/api/conversations/${cid}/messages`,borrower.cookie)).status,200);
      const support=await api(`/api/conversations/${cid}/coordination`,borrower.cookie,"POST",{bookingId:bid});assert.equal(support.status,200);assert.equal((await api(`/api/conversations/${cid}/coordination`,borrower.cookie,"POST",{bookingId:bid})).json.caseId,support.json.caseId);
      assert.equal((await api(`/api/conversations/${cid}/coordination`,borrower.cookie,"POST",{bookingId:foreign.json.booking.id})).status,400);
      const evidence={checklist:Object.fromEntries(Object.keys(checklistItems).map(k=>[k,"yes"])),conditionConfirmed:true,returnConfirmed:true};
      assert.equal((await api(`/api/bookings/${bid}/handoff`,owner.cookie,"POST",evidence)).status,200);assert.equal((await api(`/api/bookings/${bid}/handoff`,borrower.cookie,"POST",evidence)).status,200);
      await api(`/api/conversations/${cid}/block`,borrower.cookie,"POST",{blocked:false});await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',[borrower.id]);assert.equal((await send(borrower,"Suspended free text")).status,403);
      assert.equal((await api(`/api/bookings/${bid}/return`,borrower.cookie,"POST",evidence)).status,200);assert.equal((await api(`/api/bookings/${bid}`,owner.cookie,"PATCH",{action:"inspect"})).status,200);assert.equal((await api(`/api/bookings/${bid}/inspection`,owner.cookie,"POST",{...evidence,acceptable:true})).status,200);
      await db.query('UPDATE "User" SET "accountStatus"=\'ACTIVE\' WHERE id=$1',[borrower.id]);for(const actor of [owner,borrower])assert.equal((await api(`/api/bookings/${bid}/reviews`,actor.cookie,"POST",{rating:5,comment:"Verified rental with chat"})).status,201);
      const before=await api(`/api/bookings/${bid}`,owner.cookie);assert.equal(before.json.booking.status,"COMPLETED");assert.equal((await send(owner,`After completion ${tag}`,{bookingId:bid})).status,200);assert.equal((await api("/api/conversations",borrower.cookie,"POST",{listingId})).json.conversationId,cid);assert.equal((await api(`/api/bookings/${bid}`,owner.cookie)).json.booking.status,"COMPLETED");
      const second=await api("/api/bookings",borrower.cookie,"POST",{...input,startAt:"2036-01-01T10:00",endAt:"2036-01-02T10:00"});assert.equal(second.status,201);assert.equal((await send(borrower,`Second booking same thread ${tag}`,{bookingId:second.json.booking.id})).status,200);assert.equal((await api("/api/conversations",borrower.cookie,"POST",{listingId})).json.conversationId,cid);
    });
    await t.test("activity ordered inbox and released old holds survive paginated reconnect",async()=>{
      const other=(await db.query('SELECT id FROM "Conversation" WHERE "borrowerId"=$1',[outsider.id])).rows[0].id;
      const post=(body:string)=>api(`/api/conversations/${other}/messages`,owner.cookie,"POST",{body,clientMessageId:randomUUID()});
      await db.query('DELETE FROM "ChatRateLimit"');
      const held=await post(`I will hurt you paginated ${tag}`);assert.equal(held.json.message.status,"HELD");paginationConversationId=other;paginationReleasedBody=held.json.message.body;
      for(let n=0;n<53;n++){if(n%10===0)await db.query('DELETE FROM "ChatRateLimit"');assert.equal((await post(`Pagination fixture ${n} ${tag}`)).status,200);}
      const cursor=(await api(`/api/conversations/${other}/messages?limit=50`,outsider.cookie)).json.cursor;
      assert.equal((await send(borrower,`Revive older thread ${tag}`)).status,200);
      let inbox=await api('/api/conversations?limit=1',owner.cookie);assert.equal(inbox.json.conversations[0].id,cid);assert.ok(inbox.json.nextBefore);
      const page=await api(`/api/conversations?limit=1&before=${encodeURIComponent(String(inbox.json.nextBefore))}`,owner.cookie);assert.equal(page.json.conversations[0].id,other);
      assert.equal((await api('/api/conversations?before=invalid',owner.cookie)).status,400);
      await db.query('UPDATE "Conversation" SET "lastActivityAt"=\'2000-01-01\' WHERE id=ANY($1::int[])',[[cid,other]]);
      const tied=await api('/api/conversations?limit=1',owner.cookie);assert.equal(tied.json.conversations[0].id,Math.max(cid,other));
      const tiedPage=await api(`/api/conversations?limit=1&before=${encodeURIComponent(String(tied.json.nextBefore))}`,owner.cookie);assert.equal(tiedPage.json.conversations[0].id,Math.min(cid,other));

      const id=await caseFor(held.json.message.id);await claim(admin,id);assert.equal((await decide(admin,id,"RELEASE")).status,200);
      inbox=await api('/api/conversations?limit=1',owner.cookie);assert.equal(inbox.json.conversations[0].id,other);
      const delta=await api(`/api/conversations/${other}/messages?after=${cursor}&limit=2`,outsider.cookie);assert.equal(delta.json.messages[0].id,held.json.message.id);
      const seen=new Set<number>();let after=0;for(let n=0;n<30;n++){const p=await api(`/api/conversations/${other}/messages?after=${after}&limit=2`,outsider.cookie);p.json.messages.forEach(m=>seen.add(m.id));after=p.json.cursor;if(!p.json.hasMore)break;}assert.equal(seen.size,54);assert.ok(seen.has(held.json.message.id));
      const latest=await api(`/api/conversations/${other}/messages?limit=50`,outsider.cookie);assert.ok(!latest.json.messages.some(m=>m.id===held.json.message.id));
      const older=await api(`/api/conversations/${other}/messages?limit=50&before=${latest.json.nextBefore}`,outsider.cookie);assert.ok(older.json.messages.some(m=>m.id===held.json.message.id));
      await db.query('DELETE FROM "ChatRateLimit"');
    });
    await t.test("real two-user browser polling, read indicators, report/block controls and admin case UI",async()=>{
      browser=await chromium.launch({executablePath:process.env.MRT_BROWSER_PATH??"/usr/bin/chromium",headless:true});
      const contexts=await Promise.all([browser.newContext(),browser.newContext(),browser.newContext()]);const pages=await Promise.all(contexts.map(c=>c.newPage()));
      let loginNumber=0;
      const login=async(page:Page,actor:Actor)=>{const save=await loginDiagnostics(page,db,"chat-"+loginNumber++);try{await page.goto(base+"/login");await page.getByLabel("Email address",{exact:true}).fill(actor.email);await page.getByLabel("Password",{exact:true}).fill(password);await page.getByRole("button",{name:"Log in",exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);await save("passed");}catch(error){await save("failed");throw error;}};
      await login(pages[0],owner);await login(pages[1],borrower);await login(pages[2],admin);
      await pages[1].goto(`${base}/listings/${listingId}`);await pages[1].getByRole("button",{name:"Chat with Owner",exact:true}).click();await expect(pages[1]).toHaveURL(`${base}/messages/${cid}`);await pages[0].goto(`${base}/messages/${cid}`);
      const hello=`Browser message ${tag}`;await pages[0].getByLabel("Message",{exact:true}).fill(hello);await pages[0].getByRole("button",{name:"Send message",exact:true}).click();await expect(pages[1].getByText(hello,{exact:true})).toBeVisible({timeout:15000});await pages[1].getByRole("button",{name:"Mark loaded messages read"}).click();
      const item=pages[0].getByRole("listitem").filter({has:pages[0].getByText(hello,{exact:true})});await expect(item.getByText("Read",{exact:true})).toBeVisible({timeout:15000});
      await pages[1].getByRole("listitem").filter({has:pages[1].getByText(hello,{exact:true})}).getByRole("button",{name:/Report message/}).click();await pages[1].getByLabel("Report reason").fill("Browser reporting flow");await pages[1].getByRole("button",{name:"Submit message report"}).click();await expect(pages[1].getByText(/Report saved as case/)).toBeVisible();
      await pages[1].getByRole("button",{name:"Block contact",exact:true}).click();await expect(pages[1].getByRole("button",{name:"Unblock contact",exact:true})).toBeVisible();await pages[1].getByRole("button",{name:"Unblock contact",exact:true}).click();
      const review=await send(owner,`Review this link https://bit.ly/${tag}`);const caseId=await caseFor(review.json.message.id);
      for(let n=0;n<100;n++){if(!(await processAnalysis(prisma)).processed)break;}
      await pages[2].goto(base+"/admin/chat");await pages[2].getByRole("button",{name:`Claim case #${caseId}`,exact:true}).click();await expect(pages[2].getByText(review.json.message.body,{exact:true})).toBeVisible();await expect(pages[2].getByText(`Unverified shadow analysis · message #${review.json.message.id}`,{exact:true})).toBeVisible();await pages[2].getByLabel("Decision",{exact:true}).selectOption("DISMISS");await pages[2].getByLabel("Decision explanation").fill("Harmless external link reviewed in context");await pages[2].getByRole("button",{name:"Save moderation decision"}).click();await expect(pages[2].getByText(/Decision: DISMISS/)).toBeVisible();
      await pages[1].goto(base+"/messages");await expect(pages[1].getByRole("heading",{name:"Messages",exact:true})).toBeVisible();const reconnectContext=await browser.newContext();const reconnectPage=await reconnectContext.newPage();await login(reconnectPage,outsider);await reconnectPage.goto(`${base}/messages/${paginationConversationId}`);await expect(reconnectPage.getByText(paginationReleasedBody,{exact:true})).toBeVisible({timeout:20000});await reconnectContext.close();await browser.close();browser=undefined;
    });
    await t.test("logout/login and full server restart preserve messages, read state, cases, grants and outbox",async()=>{
      const before=(await api(`/api/conversations/${cid}/messages?limit=50`,borrower.cookie)).json;assert.ok(before.messages.some(m=>m.id===firstId));
      await api("/api/auth/logout",borrower.cookie,"POST");assert.equal((await api(`/api/conversations/${cid}/messages`,borrower.cookie)).status,401);
      const login=await api("/api/auth/login","","POST",{email:borrower.email,password});assert.equal(login.status,200);borrower.cookie=login.cookie;
      await stop();await start(true);const after=await api(`/api/conversations/${cid}/messages?limit=50`,borrower.cookie);assert.equal(after.status,200);assert.equal(after.json.conversation.lastReadSequence,before.conversation.lastReadSequence);assert.ok(after.json.messages.some(m=>m.id===firstId));assert.equal((await read(admin,heldCase)).status,200);
      execFileSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/chat-reviewer.ts",String(admin.id),"--revoke"],{env:process.env,stdio:"pipe"});assert.equal((await read(admin,heldCase)).status,403);
      assert.ok((await db.query('SELECT count(*)::int n FROM "ChatOutboxEvent"')).rows[0].n>0);
      await stop();await start(true,"off");const disabled=await send(owner,`Analysis remains off ${tag}`);assert.equal(disabled.status,200);assert.equal((await db.query('SELECT count(*)::int n FROM "ChatAnalysisJob" WHERE "messageId"=$1',[disabled.json.message.id])).rows[0].n,0);
      await stop();await start(false);assert.equal((await api(`/api/conversations/${cid}/messages`,borrower.cookie)).status,503);assert.equal((await api("/api/bookings",borrower.cookie)).status,200);
    });
  }finally{await browser?.close();await stop();closeSync(log);await db.end();await prisma.$disconnect();}
});
