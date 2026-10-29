import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { supportStaffFixture } from "./support/support-staff-fixture";
import { MFA_PASSWORD } from "./support/mfa-fixtures";

test("13F real application guards and browser with explicitly MOCKED loopback Ollama (not Qwen)",{timeout:150000},async()=>{
 const db=await connectTestDatabase(),base="http://localhost:"+process.env.TEST_ADMIN_PORT!,artifact=process.env.MRT_TEST_ARTIFACT_DIR!;
 let fixture:Awaited<ReturnType<typeof supportStaffFixture>>|undefined,app:ChildProcess|undefined,worker:ChildProcess|undefined;
 let calls=0,mode="valid";const prompts:string[]=[];
 const ollama=createServer(async(req,res)=>{
  calls++;assert.equal(req.url,"/api/chat");let body="";for await(const b of req)body+=b;prompts.push(body);
  if(mode==="redirect"){res.writeHead(302,{Location:"http://192.0.2.1:11434/never-follow"});res.end();return;}
  if(mode==="oversize"){res.end("x".repeat(70000));return;}
  if(mode==="unavailable"){res.writeHead(503);res.end();return;}
  const manifest=JSON.parse(JSON.parse(body).messages[1].content),ref=manifest.sources[0].id;
  const output={knownFacts:[],participantClaims:[{text:"Synthetic unverified statement",refs:[ref]}],uncertainties:["Insufficient evidence"],nextSteps:[{text:"Ask for clarification",refs:[ref]}],requiresAgreement:["Mutual agreement is required"],humanReview:["No financial authority"],drafts:{en:"Please clarify the issue.","zh-TW":"請協助釐清問題。"}};
  res.setHeader("Content-Type","application/json");res.end(JSON.stringify({model:JSON.parse(body).model,done:true,message:{content:mode==="invalid"?"{}":JSON.stringify(output),thinking:"HIDDEN_THINKING_SENTINEL"},prompt_eval_count:100,eval_count:50}));
 });
 try{
  // Exclusive loopback bind refuses to replace/impersonate an already running real Ollama.
  await new Promise<void>((resolve,reject)=>{ollama.once("error",reject);ollama.listen(11434,"127.0.0.1",resolve);});
  fixture=await supportStaffFixture(db,base);
  const snapshots=async()=>{const rows:Record<string,unknown>={};for(const table of ["Booking","Listing","Dispute","SupportTicket","SupportMessage","DevConditionClaim","DevRecoveryEvent"]){rows[table]=(await db.query(`SELECT row_to_json(x)::text value FROM "${table}" x ORDER BY row_to_json(x)::text`)).rows;}return rows;};
  const original=await snapshots();const runtime=fixture.profile.url("runtime");
  const secret=randomBytes(32).toString("hex"),socket=`/tmp/hustlen-support-${process.env.MRT_TEST_RUN_ID}.sock`;
  const common={PATH:process.env.PATH,NODE_ENV:"development" as const,MRT_TEST_RUN_ID:process.env.MRT_TEST_RUN_ID,HUSTLEN_SUPPORT_STAFF_CANDIDATE:"owned-synthetic-only",HUSTLEN_SUPPORT_STAFF_ORIGIN:base};
  worker=spawn(process.execPath,["--import","tsx","scripts/support-candidate-worker.mjs"],{env:common,stdio:["pipe","pipe","pipe"]});
  let workerReady=false;worker.stdout?.on("data",b=>{if(String(b).includes("SUPPORT_WORKER_READY"))workerReady=true;});worker.stderr?.on("data",b=>void appendFile(path.join(artifact,"local-ai-worker.log"),b));
  worker.stdin!.end(JSON.stringify({mfaUrl:fixture.profile.url("mfa"),supportUrl:fixture.supportUrl,secret,socket}));
  for(let n=0;n<100&&!workerReady;n++)await new Promise(r=>setTimeout(r,50));assert(workerReady);
  app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","localhost","--port",process.env.TEST_ADMIN_PORT!],{env:{PATH:process.env.PATH,NODE_ENV:"development",MRT_TEST_RUN_ID:process.env.MRT_TEST_RUN_ID,DATABASE_URL:runtime,TEST_DATABASE_URL:runtime,MRT_TEST_DATABASE_URL:runtime,HUSTLEN_SUPPORT_STAFF_CANDIDATE:"owned-synthetic-only",HUSTLEN_SUPPORT_ASSISTANT_CANDIDATE:"offline-only",HUSTLEN_SUPPORT_STAFF_ORIGIN:base,HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY:secret,HUSTLEN_SUPPORT_STAFF_SOCKET:socket,HUSTLEN_LOCAL_AI:"synthetic-ollama-only"},stdio:["ignore","pipe","pipe"]});
  for(const stream of [app.stdout,app.stderr])stream?.on("data",b=>void appendFile(path.join(artifact,"local-ai-app.log"),b));
  let ready=false;for(let n=0;n<120;n++){try{if((await fetch(base+"/login")).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
  const actor=fixture.requester;
  const post=async(body:unknown,token:string|undefined=actor.token,extra:Record<string,string>={})=>fetch(base+"/api/dev/support-companion/local",{method:"POST",headers:{Origin:base,"Content-Type":"application/json","X-Hustlen-Local-AI":"1",...(token?{Cookie:"p2p_session="+token}:{}),...extra},body:JSON.stringify(body)});
  const selector={scenario:"SYN-REVIEW-INJECTION:en"};
  assert.equal((await post(selector,"" )).status,401);
  for(const body of [{...selector,report:"PRIVATE_CANARY"},{bookingId:fixture.booking},{scenario:"1"},{...selector,endpoint:"https://evil.test"}])assert.equal((await post(body)).status,400);
  assert.equal((await post(selector,actor.token,{Origin:"http://evil.test"})).status,403);
  assert.equal((await post(selector,actor.token,{"X-Hustlen-Local-AI":""})).status,403);assert.equal(calls,0);
  const response=await post(selector);assert.equal(response.status,200);assert.match(response.headers.get("cache-control")!,/private, no-store/);const actual=await response.json();assert.equal(actual.provenance,"LOCAL_OLLAMA_INFERENCE");assert.equal(JSON.stringify(actual).includes("HIDDEN_THINKING_SENTINEL"),false);
  mode="invalid";assert.equal((await post(selector)).status,502);mode="unavailable";assert.equal((await post(selector)).status,429);mode="redirect";assert.equal((await post(selector,fixture.borrower.token)).status,503);mode="oversize";assert.equal((await post(selector,fixture.borrower.token)).status,502);mode="valid";
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
  try{
   const context=await browser.newContext();const page=await context.newPage();
   const errors:string[]=[],external:string[]=[],consoleErrors:string[]=[];page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==base)external.push("external");});
   const email=(await db.query('SELECT email FROM "User" WHERE id=$1',[actor.userId])).rows[0].email;
   await page.goto(base+"/login");await page.getByLabel("Email address",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill(MFA_PASSWORD);await page.getByRole("button",{name:"Log in",exact:true}).click();await page.waitForURL(base+"/dashboard");
   await page.goto(base+"/dev/support-companion");await page.getByRole("button",{name:"Generate with Ollama",exact:true}).click();await expect(page.getByText("Please clarify the issue.",{exact:true})).toBeVisible();
   await page.getByLabel("English local AI draft",{exact:true}).fill("Edited locally — never sent");assert.equal(prompts.some(p=>p.includes("Edited locally")),false);
   for(const [name,width,height]of [["desktop",1440,1000],["tablet",820,1180],["mobile",390,844]] as const){if(name==="tablet"){await page.locator(".companion-language select").selectOption("zh-TW");page.once("dialog",dialog=>dialog.accept());await page.getByLabel("合成案例與輸出語言",{exact:true}).selectOption("SYN-REVIEW-TRANSLATION:zh-TW");await page.getByRole("button",{name:"使用 Ollama 產生建議",exact:true}).click();await expect(page.getByLabel("繁體中文本機 AI 草稿",{exact:true})).toHaveValue("請協助釐清問題。");}
   await page.setViewportSize({width,height});await page.screenshot({path:path.join(artifact,"local-ai-"+name+".png"),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await page.getByRole("button",{name:"拒絕並清除建議",exact:true}).focus();await expect(page.getByRole("button",{name:"拒絕並清除建議",exact:true})).toBeFocused();await page.keyboard.press("Enter");await expect(page.getByLabel("English local AI draft",{exact:true})).toHaveCount(0);
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(consoleErrors,[]);
  }finally{await browser.close();}
  await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1',[actor.userId]);assert.equal((await post(selector)).status,403);
  await db.query('DELETE FROM "AuthSession" WHERE id=$1',[actor.sessionId]);assert.equal((await post(selector)).status,401);
  assert.deepEqual(await snapshots(),original);
  assert(prompts.every(p=>!p.includes("PRIVATE_CANARY")&&!p.includes("Private listing canary")));
  await writeFile(path.join(artifact,"local-ai-browser-evidence.json"),JSON.stringify({mockedTransport:true,realQwen:false,calls,nativeLogin:true,fixedSyntheticOnly:true,noBrowserInferenceOrExternalRequests:true,thinkingOmitted:true,malformedRejected:true,originAndSessionDenied:true,editedDraftNeverSent:true,widths:[1440,820,390],languages:["en","zh-TW"],errors:[],consoleErrors:[]},null,2));
 }finally{
  if(app&&app.exitCode===null){const exited=new Promise(r=>app!.once("exit",r));app.kill("SIGTERM");const timer=setTimeout(()=>app!.kill("SIGKILL"),3000);await exited;clearTimeout(timer);}
  if(worker&&worker.exitCode===null){const exited=new Promise(r=>worker!.once("exit",r));worker.kill("SIGTERM");const timer=setTimeout(()=>worker!.kill("SIGKILL"),3000);await exited;clearTimeout(timer);}
  await new Promise<void>(resolve=>ollama.close(()=>resolve()));await fixture?.cleanup();await db.end();
 }
});
