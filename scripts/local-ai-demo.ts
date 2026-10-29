import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import net from "node:net";
import { chromium, type Browser } from "@playwright/test";
import { assertOwnedDatabase, connectTestDatabaseTarget, testDatabaseUrl, testRunId } from "../tests/support/test-database";
import { logOperationalError } from "../lib/operational-error";

type Fixture=Awaited<ReturnType<typeof import("../tests/support/support-staff-fixture").supportStaffFixture>>;
async function freePort(){
 const server=net.createServer();await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(0,"localhost",resolve);});
 const port=(server.address() as net.AddressInfo).port;await new Promise<void>(resolve=>server.close(()=>resolve()));return port;
}
/** Only a recorded detached child/group from THIS launcher; never kill by port/name. */
async function stopChild(child:ChildProcess|undefined){
 if(!child||!child.pid||child.exitCode!==null||child.signalCode!==null)return;
 const exited=new Promise<void>(resolve=>child.once("close",()=>resolve()));
 const kill=(signal:NodeJS.Signals)=>{try{if(process.platform==="win32")child.kill(signal);else process.kill(-child.pid!,signal);}catch(e){if((e as NodeJS.ErrnoException).code!=="ESRCH")throw e;}};
 kill("SIGTERM");const timer=setTimeout(()=>kill("SIGKILL"),8000);await exited;clearTimeout(timer);
}
async function main(){
 if(process.env.NODE_ENV==="production")throw Error("Development only");
 const url=testDatabaseUrl(process.env.MRT_TEST_DATABASE_URL,process.env.DATABASE_URL),database=url.pathname.slice(1),runId=testRunId();
 const artifact=path.resolve(".test-artifacts",runId);
 let stopping=false,failed=false,release!:()=>void;
 const stopped=new Promise<void>(resolve=>{release=resolve;});
 const requestStop=()=>{const first=!stopping;stopping=true;release();
  if(first&&migration&&migration.exitCode===null&&migration.signalCode===null)void stopChild(migration).catch(e=>{failed=true;logOperationalError("demo.local_ai.setup_stop",e);});
 };
 const signals=["SIGINT","SIGTERM"] as const;for(const s of signals)process.on(s,requestStop);
 const check=()=>{if(stopping)throw Error("Demo stopped");};
 let admin:Awaited<ReturnType<typeof connectTestDatabaseTarget>>|undefined,owner:typeof admin,fixture:Fixture|undefined;
 let browser:Browser|undefined,app:ChildProcess|undefined,worker:ChildProcess|undefined,migration:ChildProcess|undefined;
 let owned=false,artifactOwned=false,fixtureImports=false,ownedSocket:string|undefined;
 const mediaDirectory=path.resolve("storage/listings");let previousMedia=new Set<string>();
 const watch=(child:ChildProcess)=>{child.once("error",()=>{failed=true;requestStop();});child.once("exit",()=>{if(!stopping){failed=true;requestStop();}});};
 try{
  // Health/model presence only. No generation, downloads, mock fallback or service management.
  const response=await fetch("http://127.0.0.1:11434/api/tags",{redirect:"error",signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw Error("Ollama unavailable");
  const tags=await response.json();if(!Array.isArray(tags.models)||!tags.models.some((m:{name?:unknown})=>m?.name==="qwen3.5:9b"))throw Error("Install qwen3.5:9b in the existing local Ollama first");check();
  admin=await connectTestDatabaseTarget(url,true);check();
  // CREATE fails if it exists: never adopt, reset, migrate or drop an existing target.
  await admin.query(`CREATE DATABASE "${database}"`);owned=true;
  await admin.query(`COMMENT ON DATABASE "${database}" IS 'hustlen-mrt-test:${runId}'`);
  owner=await connectTestDatabaseTarget(url);await assertOwnedDatabase(owner,url,runId);check();
  console.log(`Local AI demo owns ${database}; run ${runId}. Ctrl+C cleans up this run only.`);
  await mkdir(path.dirname(artifact),{recursive:true});await mkdir(artifact,{mode:0o700});artifactOwned=true;
  await writeFile(path.join(artifact,"tsconfig.json"),JSON.stringify({extends:"../../tsconfig.json",include:["../../next-env.d.ts","../../app/**/*.ts","../../app/**/*.tsx","../../components/**/*.tsx","../../lib/**/*.ts"],exclude:["../../node_modules"]}),{mode:0o600});
  previousMedia=new Set(await readdir(mediaDirectory).catch((e:NodeJS.ErrnoException)=>{if(e.code!=="ENOENT")throw e;return [] as string[];}));
  const ownedEnv={PATH:process.env.PATH,NODE_ENV:"development" as const,DATABASE_URL:url.toString(),TEST_DATABASE_URL:url.toString(),MRT_TEST_DATABASE_URL:url.toString(),MRT_TEST_RUN_ID:runId};
  console.log("Preparing fresh owned database and existing restricted fixture…");
  migration=spawn(process.execPath,["node_modules/prisma/build/index.js","migrate","deploy","--config","prisma7.config.ts"],{env:ownedEnv,detached:true,stdio:"ignore"});
  const migrated=await new Promise<boolean>(resolve=>{migration!.once("error",()=>resolve(false));migration!.once("exit",code=>resolve(code===0));});
  if(!migrated)throw Error("Owned migration failed");check();
  // Same server-only marker loader used by the existing isolated tests; NO auth mock.
  Object.assign(process.env,ownedEnv);
  await import(pathToFileURL(path.resolve("tests/support/server-boundary-loader.mjs")).href);
  const {supportStaffFixture}=await import("../tests/support/support-staff-fixture");fixtureImports=true;
  const port=await freePort(),origin=`http://localhost:${port}`;
  fixture=await supportStaffFixture(owner,origin);check();
  const secret=randomBytes(32).toString("hex"),socket=`/tmp/hustlen-support-${runId}.sock`;
  const common={PATH:process.env.PATH,NODE_ENV:"development" as const,MRT_TEST_RUN_ID:runId,HUSTLEN_SUPPORT_STAFF_CANDIDATE:"owned-synthetic-only",HUSTLEN_SUPPORT_STAFF_ORIGIN:origin};
  worker=spawn(process.execPath,["--import","tsx","scripts/support-candidate-worker.mjs"],{env:common,detached:true,stdio:["pipe","pipe","pipe"]});watch(worker);
  let ready=false;worker.stdout?.on("data",b=>{if(String(b).includes("SUPPORT_WORKER_READY")){ready=true;ownedSocket=socket;}});worker.stderr?.resume();
  worker.stdin!.end(JSON.stringify({mfaUrl:fixture.profile.url("mfa"),supportUrl:fixture.supportUrl,secret,socket}));
  for(let n=0;n<100&&!ready;n++){check();await new Promise(r=>setTimeout(r,50));}if(!ready)throw Error("Private login worker unavailable");check();
  const runtime=fixture.profile.url("runtime");
  app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","localhost","--port",String(port)],{env:{...common,DATABASE_URL:runtime,TEST_DATABASE_URL:runtime,MRT_TEST_DATABASE_URL:runtime,HUSTLEN_SUPPORT_ASSISTANT_CANDIDATE:"offline-only",HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY:secret,HUSTLEN_SUPPORT_STAFF_SOCKET:socket,HUSTLEN_LOCAL_AI:"synthetic-ollama-only",HUSTLEN_LOCAL_AI_DIAGNOSTICS:"owned-test-categories-only",HUSTLEN_OLLAMA_MODEL:"qwen3.5:9b"},detached:true,stdio:"ignore"});watch(app);
  ready=false;for(let n=0;n<120&&!ready;n++){check();try{ready=(await fetch(origin+"/login",{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error("Local app unavailable");check();
  browser=await chromium.launch({headless:false,executablePath:process.env.MRT_BROWSER_PATH??process.env.CHROMIUM_PATH,handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false});
  browser.on("disconnected",requestStop);check();
  const page=await browser.newPage();
  // A listener prevents Playwright auto-dismiss; the human answers native dialogs.
  page.on("dialog",()=>{});
  const email=(await owner.query('SELECT email FROM "User" WHERE id=$1',[fixture.requester.userId])).rows[0].email;
  const {MFA_PASSWORD}=await import("../tests/support/mfa-fixtures");
  await page.goto(origin+"/login");check();await page.getByLabel("Email address",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill(MFA_PASSWORD);
  await page.getByRole("button",{name:"Log in",exact:true}).click();await page.waitForURL(origin+"/dashboard");check();
  await page.goto(origin+"/dev/support-companion");check();
  console.log(`Ready: ${origin}/dev/support-companion`);
  console.log("Select synthetic scenarios and press Generate with Ollama yourself. No generation is automatic. Validation failures stay failures.");
  console.log("Browser stays open until Ctrl+C or you close it. Existing fixture credential/config expiry and inference/rate limits remain unchanged.");
  await stopped;
 }catch(e){if(!stopping){failed=true;logOperationalError("demo.local_ai",e);}}
 finally{
  stopping=true;
  try{
   try{await browser?.close();}catch(e){failed=true;logOperationalError("demo.local_ai.browser_cleanup",e);}
   for(const child of [app,worker,migration]){try{await stopChild(child);}catch(e){failed=true;logOperationalError("demo.local_ai.process_cleanup",e);}}
   if(fixtureImports){const {prisma}=await import("../lib/prisma");await prisma.$disconnect();}
   if(owner&&fixture){
    await assertOwnedDatabase(owner,url,runId);
    // Same recorded-upload cleanup as existing demos; additionally protect pre-existing files.
    const {rows}=await owner.query('SELECT url FROM "ListingMedia"');
    for(const row of rows){const filename=String(row.url).split("/").at(-1)!;if(/^[a-f0-9-]{36}\.(png|jpg|webp|webm|mp4)$/.test(filename)&&!previousMedia.has(filename))await rm(path.join(mediaDirectory,filename),{force:true});}
   }
   await fixture?.cleanup();
   if(owned){
    if(!owner)owner=await connectTestDatabaseTarget(url);
    await assertOwnedDatabase(owner,url,runId);await owner.end();owner=undefined;
    await admin!.query(`DROP DATABASE "${database}"`);
    console.log("Removed this run's marked disposable database and restricted fixture roles.");
   }
  }catch(e){failed=true;logOperationalError("demo.local_ai.cleanup",e);console.error(`Cleanup incomplete for run ${runId}. Never reset/adopt another database.`);}
  finally{
   await owner?.end();await admin?.end();if(ownedSocket)await rm(ownedSocket,{force:true});if(artifactOwned)await rm(artifact,{recursive:true,force:true});
   for(const s of signals)process.off(s,requestStop);
  }
 }
 if(failed){console.error("Local AI demo failed; private details omitted. Check Ollama/model, guarded DB permissions and installed Chromium. Use a NEW target to restart.");process.exitCode=1;}
}
main().catch(e=>{logOperationalError("demo.local_ai.start",e);console.error("Local AI demo refused startup; original database and external services are not reset or stopped.");process.exitCode=1;});
