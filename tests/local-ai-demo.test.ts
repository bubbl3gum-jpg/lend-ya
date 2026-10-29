/** Headed launcher test. External mock Ollama + test-only CDP wrapper; no launcher mock/auth bypass. */
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { createServer } from "node:http";
import net from "node:net";
import { spawn,type ChildProcess } from "node:child_process";
import { mkdtemp,writeFile,chmod,rm,access,readFile,mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium,expect,type Browser } from "@playwright/test";
import { testDatabaseUrl,connectTestDatabaseTarget,assertOwnedDatabase,testRunId } from "./support/test-database";

test("interactive local AI launcher: headed native auth, manual success/failure, persistence and SIGINT cleanup",{timeout:180000,skip:process.platform!=="darwin"&&!process.env.DISPLAY?"Needs a visible desktop or test X display; never substitute headless":false},async()=>{
 const url=testDatabaseUrl(process.env.MRT_TEST_DATABASE_URL,process.env.DATABASE_URL),name=url.pathname.slice(1),admin=await connectTestDatabaseTarget(url,true);
 const dir=await mkdtemp(path.join(tmpdir(),"hustlen-ai-launch-test-"));let child:ChildProcess|undefined,childDone:Promise<unknown>|undefined,browser:Browser|undefined,output="",modelAvailable=true,generations=0;
 const mediaDir=path.resolve("storage/listings"),oldMedia=randomUUID()+".png",newMedia=randomUUID()+".png";
 const ollama=createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json");
  if(req.url==="/api/tags"){res.end(JSON.stringify({models:modelAvailable?[{name:"qwen3.5:9b"}]:[]}));return;}
  assert.equal(req.url,"/api/chat");generations++;let text="";for await(const b of req)text+=b;const input=JSON.parse(text);assert.equal(input.model,"qwen3.5:9b");
  const manifest=JSON.parse(input.messages[1].content),ref=manifest.sources[0].id;
  const advisory={knownFacts:[],participantClaims:[{text:"Synthetic statement",refs:[ref]}],uncertainties:["Not verified"],nextSteps:[{text:"Clarify",refs:[ref]}],requiresAgreement:["Mutual agreement required"],humanReview:["No actions"],drafts:{en:"Please clarify.","zh-TW":"請協助釐清。"}};
  res.end(JSON.stringify({model:"qwen3.5:9b",done:true,message:{content:manifest.language==="zh-TW"?"{}":JSON.stringify(advisory),thinking:"NEVER_EXPOSE"}}));
 });
 const launch=(extra:Record<string,string|undefined>={})=>{
  output="";child=spawn("npm",["run","demo:local-ai"],{detached:true,env:{...process.env,...extra},stdio:["ignore","pipe","pipe"]});
  childDone=new Promise(resolve=>child!.once("close",(code,signal)=>resolve({code,signal})));
  for(const stream of [child.stdout,child.stderr])stream?.on("data",b=>{output+=String(b);});return child;
 };
 const closed=(p:ChildProcess)=>new Promise<{code:number|null,signal:NodeJS.Signals|null}>(resolve=>p.once("close",(code,signal)=>resolve({code,signal})));
 const stop=()=>{if(child?.pid){try{process.kill(-child.pid,"SIGINT");}catch(e){if((e as NodeJS.ErrnoException).code!=="ESRCH")throw e;}}};
 const absent=async()=>assert.equal((await admin.query("SELECT count(*)::int n FROM pg_database WHERE datname=$1",[name])).rows[0].n,0);
 try{
  await new Promise<void>((resolve,reject)=>{ollama.once("error",reject);ollama.listen(11434,"127.0.0.1",resolve);});
  assert.equal((await closed(launch({NODE_ENV:"production"}))).code,1);await absent();
  modelAvailable=false;assert.equal((await closed(launch())).code,1);await absent();modelAvailable=true;
  // Existing database is deliberately owned by THIS TEST, not by the launcher.
  const sentinelRun=testRunId();await admin.query(`CREATE DATABASE "${name}"`);await admin.query(`COMMENT ON DATABASE "${name}" IS 'hustlen-mrt-test:${sentinelRun}'`);
  const sentinel=await connectTestDatabaseTarget(url);try{await assertOwnedDatabase(sentinel,url,sentinelRun);await sentinel.query("CREATE TABLE untouched(v integer);INSERT INTO untouched VALUES(7)");assert.equal((await closed(launch())).code,1);assert.equal((await sentinel.query("SELECT v FROM untouched")).rows[0].v,7);await assertOwnedDatabase(sentinel,url,sentinelRun);}finally{await sentinel.end();}
  await admin.query(`DROP DATABASE "${name}"`);
  const portServer=net.createServer();await new Promise<void>(r=>portServer.listen(0,"127.0.0.1",r));const port=(portServer.address()as net.AddressInfo).port;await new Promise<void>(r=>portServer.close(()=>r()));
  const binary=process.env.MRT_BROWSER_PATH??process.env.CHROMIUM_PATH??chromium.executablePath();
  const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
  const wrapper=path.join(dir,"headed-chromium");
  await writeFile(wrapper,'#!/bin/sh\nfor arg in "$@"; do case "$arg" in --headless*) exit 9;; esac; done\nexec '+quote(binary)+' --remote-debugging-address=127.0.0.1 --remote-debugging-port='+port+' "$@"\n');await chmod(wrapper,0o700);
  await mkdir(mediaDir,{recursive:true});await writeFile(path.join(mediaDir,oldMedia),"pre-existing test sentinel",{flag:"wx"});
  const running=launch({MRT_BROWSER_PATH:wrapper});const done=closed(running);
  for(let n=0;n<600&&!output.includes("Ready: ");n++){assert.equal(running.exitCode,null,"Launcher must stay alive through setup");await new Promise(r=>setTimeout(r,100));}
  assert.match(output,/Ready: http:\/\/localhost:\d+\/dev\/support-companion/);assert.equal(generations,0,"Launcher must never auto-generate");
  const run=output.match(/run ([a-f0-9]{24})\./)![1],origin=output.match(/Ready: (http:\/\/localhost:\d+)/)![1];
  const own=await connectTestDatabaseTarget(url);try{await assertOwnedDatabase(own,url,run);const listing=(await own.query('SELECT id FROM "Listing" ORDER BY id LIMIT 1')).rows[0].id;await writeFile(path.join(mediaDir,newMedia),"new owned test upload",{flag:"wx"});for(const file of [oldMedia,newMedia])await own.query('INSERT INTO "ListingMedia"("listingId",url,"mimeType",kind)VALUES($1,$2,\'image/png\',\'PHOTO\')',[listing,"/api/listing-media/"+file]);}finally{await own.end();}
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);const page=browser.contexts()[0].pages().find(p=>p.url()===origin+"/dev/support-companion")!;assert(page,"Actual headed browser must complete native login");
  const pageErrors:string[]=[],consoleErrors:string[]=[];page.on("pageerror",e=>pageErrors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.getByRole("button",{name:"Generate with Ollama",exact:true}).click();await expect(page.getByLabel("English local AI draft",{exact:true})).toHaveValue("Please clarify.");
  page.once("dialog",d=>d.accept());await page.getByLabel("Synthetic scenario and output language",{exact:true}).selectOption("SYN-REVIEW-TRANSLATION:zh-TW");
  const failure=page.waitForResponse(r=>r.url()===origin+"/api/dev/support-companion/local");await page.getByRole("button",{name:"Generate with Ollama",exact:true}).click();const r=await failure;assert.equal(r.status(),502);assert.deepEqual(await r.json(),{code:"VALIDATION",diagnostic:{version:"local-validation-v1",reason:"OBJECT_SHAPE",field:"root"}});
  await expect(page.getByText(/No usable result/)).toBeVisible();assert.equal(await page.getByLabel("English local AI draft",{exact:true}).count(),0);assert.equal(generations,2);assert.equal(running.exitCode,null);assert(browser.isConnected(),"No automatic shutdown after two scenarios");
  await page.locator(".companion-language select").selectOption("zh-TW");await expect(page.getByRole("button",{name:"使用 Ollama 產生建議",exact:true})).toBeVisible();
  assert.deepEqual(pageErrors,[]);assert.equal(consoleErrors.length,1);assert.match(consoleErrors[0],/^Failed to load resource: the server responded with a status of 502/);
  await page.screenshot({path:path.join(dir,"headed-manual-failure.png"),fullPage:true});
  stop();await done;assert.match(output,/Removed this run's marked disposable database/);await absent();assert(!browser.isConnected());
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_roles WHERE shobj_description(oid,'pg_authid') IN ($1,$2)",["hustlen-test-principal:"+run,"hustlen-support-principal:"+run])).rows[0].n,0);
  assert.equal(await readFile(path.join(mediaDir,oldMedia),"utf8"),"pre-existing test sentinel");await assert.rejects(access(path.join(mediaDir,newMedia)),{code:"ENOENT"});
  await assert.rejects(access(path.resolve(".test-artifacts",run)),{code:"ENOENT"});await assert.rejects(access(`/tmp/hustlen-support-${run}.sock`),{code:"ENOENT"});
  await assert.rejects(fetch(origin+"/login",{signal:AbortSignal.timeout(1000)}));assert.equal((await fetch("http://127.0.0.1:11434/api/tags")).status,200);assert.equal((await admin.query("SELECT 1 v")).rows[0].v,1);
  assert(!output.includes("NEVER_EXPOSE"));
  console.log("Headed launcher proof: native login; zero automatic calls; two manual mock calls; visible502; language switch; retained window; SIGINT cleanup; external services alive. NOT genuine Qwen quality.");
 }finally{await browser?.close();stop();await childDone;await new Promise<void>(r=>ollama.close(()=>r()));await admin.end();await rm(dir,{recursive:true,force:true});for(const file of [oldMedia,newMedia])await rm(path.join(mediaDir,file),{force:true});}
});
