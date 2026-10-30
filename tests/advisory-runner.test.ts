import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {evaluationDataset} from "../lib/advisory-evaluation/dataset";
import {planEvaluation,runEvaluation,compareResults,type EvaluationClient} from "../lib/advisory-evaluation/runner";
import {authenticatedClient,rateWait,boundedJson,validateOrigin} from "../lib/advisory-evaluation/client";
import {InferenceError} from "../lib/local-inference/contracts";
const pinned=JSON.parse(readFileSync("docs/ai/milestone3a/dataset.json","utf8"));
const dataset=evaluationDataset();
const signal=()=>new AbortController().signal;
function reply(id:string,turn:number){const manifest=dataset.cases.find(c=>c.id===id)!.turns[turn-1].manifest;const ref=manifest.sources[0].id;return {status:200,body:{model:"qwen3.5:9b",provenance:"LOCAL_OLLAMA_INFERENCE",manifest,inputDigest:createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),latencyMs:23,output:{knownFacts:[],participantClaims:[{text:"Authored unit fixture, not model output",refs:[ref]}],uncertainties:[],nextSteps:[],requiresAgreement:[],humanReview:[],drafts:{en:"Clarify the claim.","zh-TW":"請釐清主張。"}}}};}
test("3B pinned selection defaults to offline single case and refuses all/repeats/forged plans",async()=>{
 const plan=planEvaluation(pinned);assert.deepEqual(plan.caseIds,["E03:en"]);assert.equal(plan.plannedCalls,1);
 for(const ids of [[],["unknown"],["E01:en","E01:en"],dataset.cases.map(c=>c.id),["E01:en","E01:zh-TW"]])assert.throws(()=>planEvaluation(pinned,ids));
 assert.throws(()=>planEvaluation({...pinned,version:"forged"}));assert.throws(()=>planEvaluation(pinned,["E03:en"],"zh-TW"));
 let calls=0;await assert.rejects(runEvaluation({...plan,maximumCalls:99},{send:async()=>{calls++;return reply("E03:en",1);}},signal(),"MOCK","RUN-test",async()=>{}));assert.equal(calls,0);
 const child=spawnSync(process.execPath,["--import","tsx","scripts/advisory-evaluate.ts"],{encoding:"utf8"});assert.equal(child.status,0);assert.equal(JSON.parse(child.stdout).realInferenceRequests,0);
 for(const args of [["--all"],["--persist"],["--output","unsafe"],["--execute"],["--execute","--cases","E03:en","--confirm-calls","1"]]){const c=spawnSync(process.execPath,["--import","tsx","scripts/advisory-evaluate.ts",...args],{encoding:"utf8",env:{...process.env,NODE_ENV:"production"}});assert.notEqual(c.status,0);assert(!c.stderr.includes("postgresql://"));}
});
test("3B chronological prefixes and E10 exact fixed selector, no authored CONTEXT",async()=>{
 const plan=planEvaluation(pinned,["E01:en","E10:en"]),seen:unknown[]=[];let n=0,waits=0;
 const result=await runEvaluation(plan,{send:async payload=>{seen.push(payload);n++;return n<=5?reply("E01:en",n):reply("E10:en",1);}},signal(),"MOCK","RUN-test",async()=>{waits++;});
 assert.equal(n,6);assert.equal(waits,5);assert.equal(result.summary.success,6);assert(result.reviews.every(r=>Object.values(r.dimensions).every(d=>d.score===null)));
 assert.deepEqual(seen.at(-1),{scenario:"SYN-RECOVERY-CHARGER:en"});
 for(let i=0;i<5;i++){assert.equal((seen[i] as {messages:string[]}).messages.length,i+1);assert.equal(JSON.stringify(seen[i]).includes("CONTEXT"),false);}
 assert.equal(result.reviewPacket.items.length,6);assert.equal(result.reviewPacket.items[5].manifest.sources[0].kind,"CONTEXT");assert.equal(result.attempts[0].reportedLatencyMs,23);assert.equal(result.results[0].latencyMs,result.attempts[0].clientElapsedMs);
 assert.deepEqual(compareResults(result.results,result.results).map(r=>r.outputChanged),Array(6).fill(false));
 assert.throws(()=>compareResults([result.results[0],result.results[0]],[]));
});
test("3B failure blocks dependent turns; safety failures stop whole plan; metadata is allowlisted",async()=>{
 const plan=planEvaluation(pinned,["E01:en","E03:en"]);let n=0;
 const client:EvaluationClient={send:async()=>{n++;return n===1?{status:502,body:{code:"VALIDATION",diagnostic:{reason:"FACT_SOURCE_KIND",field:"knownFacts"},private:"SECRET_SENTINEL"}}:reply("E03:en",1);}};
 const r=await runEvaluation(plan,client,signal(),"MOCK","RUN-test",async()=>{});
 assert.equal(n,2);assert.equal(r.summary.notRun,4);assert.equal(r.results[0].failure?.reason,"FACT_SOURCE_KIND");assert.equal(r.results[0].run.model,null);assert(!JSON.stringify(r).includes("SECRET_SENTINEL"));
 for(const code of ["SESSION","DENIED","LIMIT","UNAVAILABLE"]){let count=0;const value=await runEvaluation(plan,{send:async()=>{count++;return {status:401,body:{code}};}},signal(),"MOCK","RUN-test",async()=>{});assert.equal(count,1);assert.equal(value.summary.notRun,5);}
 const unknownModel=await runEvaluation(planEvaluation(pinned),{send:async()=>({status:503,body:{code:"UNAVAILABLE"}})},signal(),"LOCAL_OLLAMA_INFERENCE","RUN-format-test-only",async()=>{});assert.equal(unknownModel.results[0].run.model,null);
 const bad=reply("E03:en",1);bad.body.manifest={...bad.body.manifest,caseId:"FORGED"};
 const mismatch=await runEvaluation(planEvaluation(pinned),{send:async()=>bad},signal(),"MOCK","RUN-test",async()=>{});assert.equal(mismatch.results[0].failure?.code,"VALIDATION");assert.equal(mismatch.attempts[0].httpStatus,200);assert.equal(mismatch.attempts[0].reportedModel,null);
});
test("3B cancellation/timeout honest and no late success or retries",async()=>{
 const plan=planEvaluation(pinned,["E01:en"]),c=new AbortController();let n=0;
 const r=await runEvaluation(plan,{send:async()=>{n++;c.abort();return reply("E01:en",1);}},c.signal,"MOCK","RUN-test",async()=>{});assert.equal(n,1);assert.equal(r.results[0].failure?.code,"CANCELED");assert.equal(r.summary.notRun,4);
 const timeout=await runEvaluation(plan,{send:async()=>{throw new InferenceError("TIMEOUT");}},signal(),"MOCK","RUN-test",async()=>{});assert.equal(timeout.results[0].failure?.code,"TIMEOUT");assert.equal(timeout.summary.attemptedRequests,1);
 const pre=new AbortController();pre.abort();const empty=await runEvaluation(plan,{send:async()=>{throw Error("must not call");}},pre.signal,"MOCK","RUN-test",async()=>{});assert.equal(empty.summary.attemptedRequests,0);
 await assert.rejects(rateWait(pre.signal));
});
test("3B authenticated app-only client refuses production/redirect/unsafe origin; closes only own session",async()=>{
 for(const origin of ["https://localhost:1234","http://evil.test:1234","http://localhost:65536","http://u:p@localhost:1234","http://127.0.0.1:1234"])assert.throws(()=>validateOrigin(origin));
 const requests:{url:string;init:RequestInit}[]=[];
 const mock:typeof fetch=async(input,init)=>{const url=String(input);requests.push({url,init:init!});if(url.endsWith("/login"))return new Response(null,{status:200,headers:{"Set-Cookie":"p2p_session=UNIT_SECRET; HttpOnly"}});if(url.endsWith("/logout"))return new Response(null,{status:200});return requests.length===1?new Response(null,{status:401}):Response.json({code:"VALIDATION"},{status:502});};
 const client=await authenticatedClient("http://localhost:1234","synthetic@fixture.test","unit-fixture-only",signal(),mock);await client.send({scenario:"SYN-RECOVERY-CHARGER:en"},signal());await client.close();await assert.rejects(client.send({scenario:"anything"},signal()));
 assert(requests.every(r=>r.url.startsWith("http://localhost:1234/")&&r.init.redirect==="error"));assert(!requests[0].init.headers||!JSON.stringify(requests[0].init.headers).includes("UNIT_SECRET"));
 let probes=0;await assert.rejects(authenticatedClient("http://localhost:1234","synthetic@fixture.test","unit-fixture-only",signal(),async()=>{probes++;return new Response(null,{status:404});}));assert.equal(probes,1);
 await assert.rejects(boundedJson(new Response("x".repeat(131073))));
});

test("3B client cancellation and bounded wait/body failure do not fabricate responses",async()=>{
 const controller=new AbortController();
 const mock:typeof fetch=async(input,init)=>{
  if(String(input).endsWith("/login"))return new Response(null,{status:200,headers:{"Set-Cookie":"p2p_session=UNIT_ONLY"}});
  if(String(input).endsWith("/logout"))return new Response(null,{status:200});
  if(!(init?.headers as Record<string,string>)?.Cookie)return new Response(null,{status:401});
  return new Promise((_,reject)=>{init?.signal?.addEventListener("abort",()=>reject(Error("aborted")),{once:true});controller.abort();});
 };
 const client=await authenticatedClient("http://localhost:1234","test@fixture.test","unit-only",signal(),mock);
 await assert.rejects(client.send({scenario:"synthetic"},controller.signal),{code:"CANCELED"});await client.close();
 const r=await runEvaluation(planEvaluation(pinned,["E01:en"]),{send:async()=>reply("E01:en",1)},signal(),"MOCK","RUN-test",async()=>{throw Error("wait interrupted");});
 assert.equal(r.summary.attemptedRequests,1);assert.equal(r.summary.notRun,4);assert.equal(r.summary.notRunDetails[0].reason,"WAIT_INTERRUPTED");
});
