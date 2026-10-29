/** OPTIONAL genuine Ollama run; not part of deterministic mock suite. Requires model already installed on SAME host. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium,expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { supportStaffFixture } from "./support/support-staff-fixture";
import { MFA_PASSWORD } from "./support/mfa-fixtures";
test("OPTIONAL genuine local Qwen synthetic inference through native authenticated application",{timeout:180000},async()=>{
 const db=await connectTestDatabase(),base="http://localhost:"+process.env.TEST_ADMIN_PORT!,artifact=process.env.MRT_TEST_ARTIFACT_DIR!;
 let fixture:Awaited<ReturnType<typeof supportStaffFixture>>|undefined,app:ChildProcess|undefined,worker:ChildProcess|undefined;
 const stop=async(p:ChildProcess|undefined)=>{if(!p||p.exitCode!==null)return;const done=new Promise(r=>p.once("exit",r));p.kill("SIGTERM");const timer=setTimeout(()=>p.kill("SIGKILL"),3000);await done;clearTimeout(timer);};
 try{
  const tags=await fetch("http://127.0.0.1:11434/api/tags",{redirect:"error",signal:AbortSignal.timeout(2000)});assert.equal(tags.status,200,"Actual local Ollama must already be running; never download or substitute a mock");
  fixture=await supportStaffFixture(db,base);const runtime=fixture.profile.url("runtime"),secret=randomBytes(32).toString("hex"),socket=`/tmp/hustlen-support-${process.env.MRT_TEST_RUN_ID}.sock`;
  const common={PATH:process.env.PATH,NODE_ENV:"development" as const,MRT_TEST_RUN_ID:process.env.MRT_TEST_RUN_ID,HUSTLEN_SUPPORT_STAFF_CANDIDATE:"owned-synthetic-only",HUSTLEN_SUPPORT_STAFF_ORIGIN:base};
  worker=spawn(process.execPath,["--import","tsx","scripts/support-candidate-worker.mjs"],{env:common,stdio:["pipe","pipe","pipe"]});let ready=false;
  worker.stdout?.on("data",b=>{if(String(b).includes("SUPPORT_WORKER_READY"))ready=true;});worker.stderr?.on("data",b=>void appendFile(path.join(artifact,"real-worker.log"),b));
  worker.stdin!.end(JSON.stringify({mfaUrl:fixture.profile.url("mfa"),supportUrl:fixture.supportUrl,secret,socket}));
  for(let n=0;n<100&&!ready;n++)await new Promise(r=>setTimeout(r,50));assert(ready);
  app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","localhost","--port",process.env.TEST_ADMIN_PORT!],{env:{...common,DATABASE_URL:runtime,TEST_DATABASE_URL:runtime,MRT_TEST_DATABASE_URL:runtime,HUSTLEN_SUPPORT_ASSISTANT_CANDIDATE:"offline-only",HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY:secret,HUSTLEN_SUPPORT_STAFF_SOCKET:socket,HUSTLEN_LOCAL_AI:"synthetic-ollama-only",HUSTLEN_LOCAL_AI_DIAGNOSTICS:"owned-test-categories-only",HUSTLEN_OLLAMA_MODEL:process.env.HUSTLEN_OLLAMA_MODEL??"qwen3.5:9b"},stdio:["ignore","pipe","pipe"]});
  for(const stream of [app.stdout,app.stderr])stream?.on("data",b=>void appendFile(path.join(artifact,"real-app.log"),b));
  ready=false;for(let n=0;n<120;n++){try{if((await fetch(base+"/login")).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
  try{
   const page=await browser.newPage(),errors:string[]=[],external:string[]=[],consoleErrors:string[]=[];
   page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("request",r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)external.push("unexpected external origin");});
   const email=(await db.query('SELECT email FROM "User" WHERE id=$1',[fixture.requester.userId])).rows[0].email;
   await page.goto(base+"/login");await page.getByLabel("Email address",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill(MFA_PASSWORD);await page.getByRole("button",{name:"Log in",exact:true}).click();await page.waitForURL(base+"/dashboard");await page.goto(base+"/dev/support-companion");
   const results:unknown[]=[];
   for(const scenario of ["SYN-REVIEW-INJECTION:en","SYN-REVIEW-TRANSLATION:zh-TW"]){
    if(results.length)page.once("dialog",dialog=>dialog.accept());
    await page.getByLabel("Synthetic scenario and output language",{exact:true}).selectOption(scenario);
    const response=page.waitForResponse(r=>r.url()===base+"/api/dev/support-companion/local",{timeout:65000});await page.getByRole("button",{name:"Generate with Ollama",exact:true}).click();
    const r=await response,body=await r.json();results.push({scenario,status:r.status(),body,humanScores:null});
    await writeFile(path.join(artifact,"real-local-results.json"),JSON.stringify({realInference:true,noQualityApproval:true,results},null,2),{mode:0o600});assert.equal(r.status(),200,"Real model unavailable/invalid result: retained as failure, never replaced by scripted success");assert.equal(body.provenance,"LOCAL_OLLAMA_INFERENCE");
    await expect(page.getByLabel("English local AI draft",{exact:true})).not.toHaveValue("");
    if(scenario.endsWith("zh-TW"))await page.locator(".companion-language select").selectOption("zh-TW");
    await page.screenshot({path:path.join(artifact,"real-local-"+(scenario.endsWith("zh-TW")?"zh":"en")+".png"),fullPage:true});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(external,[]);
  }finally{await browser.close();}
 }finally{await stop(app);await stop(worker);await fixture?.cleanup();await db.end();}
});
