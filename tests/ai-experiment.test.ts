import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { experimentCheckpoint, refuseLiveExperiment, reserveDryRun } from "../lib/ai-case-brief/experiment-contract";
import { qualityCorpus, prepareOfflineExperiment } from "../lib/ai-case-brief/experiment";
import { inspectBriefQuality } from "../lib/ai-case-brief/quality";
import { generateBrief } from "../lib/ai-case-brief/service";
import { buildManifest } from "../lib/ai-case-brief/manifest";
import { syntheticBriefEnabled } from "../lib/ai-case-brief/config";
test("no checkpoint, file, credential-shaped string or destination can grant live execution",()=>{
 const check=experimentCheckpoint();assert.equal(check.state,"BLOCKED_APPROVAL_REQUIRED");assert.equal(check.missing.length,10);assert.deepEqual(check.allowedDestinations,[]);check.missing.pop();assert.equal(experimentCheckpoint().missing.length,10);
 for(const value of [undefined,"https://provider.example/v1", "http://localhost:3000", "file:///tmp/approval.json", {approved:true,apiKey:"synthetic-not-a-key"}])assert.throws(()=>refuseLiveExperiment(value),/LIVE_EXPERIMENT_APPROVAL_REQUIRED/);
 assert.equal(syntheticBriefEnabled({NODE_ENV:"production",HUSTLEN_AI_CASE_BRIEF_DEMO:"synthetic-only",HUSTLEN_AI_PROVIDER_KEY:"synthetic-not-a-key",HUSTLEN_AI_LIVE_APPROVED:"true"}),false);
});
test("dry-run reservations stop at exact ceilings without granting egress or trusting float accounting",()=>{
 const limits={requests:2,inputTokens:100,outputTokens:50,totalTokens:300,costMicrousd:20},zero={requests:0,tokens:0,costMicrousd:0},request={inputTokens:100,outputTokens:50,maximumCostMicrousd:10};
 const one=reserveDryRun(zero,limits,request),two=reserveDryRun(one,limits,request);assert.deepEqual(two,{requests:2,tokens:300,costMicrousd:20});assert.deepEqual(zero,{requests:0,tokens:0,costMicrousd:0});assert.throws(()=>reserveDryRun(two,limits,request));
 for(const r of [{...request,inputTokens:101},{...request,outputTokens:51},{...request,maximumCostMicrousd:21},{...request,inputTokens:NaN},{...request,inputTokens:-1},{...request,maximumCostMicrousd:1.1}])assert.throws(()=>reserveDryRun(zero,limits,r));
 assert.throws(()=>reserveDryRun(zero,{} as typeof limits,request));assert.throws(()=>reserveDryRun(zero,{...limits,unlimited:true} as typeof limits,request));
 assert.throws(()=>refuseLiveExperiment(two));
});
test("quality corpus is reproducible, one case/side at a time, with identical source snapshots across language tasks",()=>{
 const a=qualityCorpus(),b=qualityCorpus();assert.equal(a.length,16);assert.deepEqual(a,b);assert.equal(new Set(a.map(x=>x.id)).size,16);
 for(let i=0;i<a.length;i+=2){assert.deepEqual(a[i].manifest.sources,a[i+1].manifest.sources);assert.equal(a[i+1].manifest.language,"zh-TW");assert.match(a[i].digest,/^[a-f0-9]{64}$/);}
 assert.ok(!JSON.stringify(a.find(x=>x.id==="SYN-BORROWER-A:en")!.manifest).includes("scratch"));
});
test("review hints expose structural versus semantic gaps in English and Traditional Chinese",async()=>{
 const m=buildManifest("SYN-UNCERTAIN","en"),base=(await generateBrief(m)).output;
 const unsupported={...base,summary:[{text:"The handoff is complete on day 999",refs:["T1"],basis:"INTERPRETATION"}]};
 const report=inspectBriefQuality(m,unsupported);assert.equal(report.structural,"VALID");assert.equal(report.humanReview,"UNREVIEWED");assert.ok(report.dimensions.every(x=>x.score===null));
 for(const code of ["UNVERIFIED_INTERPRETATION","NOVEL_NUMBER","COMPLETION_REVIEW"])assert.ok(report.flags.some(f=>f.code===code));
 const zh={...m,language:"zh-TW" as const};const z=inspectBriefQuality(zh,{...base,language:"zh-TW",summary:[{text:"已完成交接",refs:["T1"],basis:"INTERPRETATION"}]});assert.ok(z.flags.some(f=>f.code==="COMPLETION_REVIEW"));
 assert.equal(inspectBriefQuality(m,{...base,actions:["CLOSE_TICKET"]}).structural,"FAILED");assert.equal(inspectBriefQuality(m,{...base,timeline:["FOREIGN"]}).structural,"FAILED");
});
test("privacy/authority/conflict hints are review prompts, not auto verdicts or action capabilities",async()=>{
 const m=buildManifest("SYN-CONFLICT","en"),base=(await generateBrief(m)).output;
 const wrongCitation=inspectBriefQuality(m,{...base,summary:[{text:"Pickup is on October 22",refs:["C1"],basis:"INTERPRETATION"}]});assert.ok(wrongCitation.flags.some(f=>f.code==="NOVEL_NUMBER"));
 const report=inspectBriefQuality(m,{...base,conflicts:[],draft:"I approved a refund and read the private transcript.",summary:[{text:"The owner is guilty of theft.",refs:["C1"],basis:"INTERPRETATION"}]});
 for(const code of ["AUTHORITY_REVIEW","PRIVACY_ACCESS_REVIEW","ACCUSATION_REVIEW","CONFLICT_COVERAGE_REVIEW"])assert.ok(report.flags.some(f=>f.code===code));assert.equal(report.humanReview,"UNREVIEWED");
});
test("offline preparation records no model/token/latency claims or external requests",async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error("No egress permitted");};
 try{const report=await prepareOfflineExperiment();assert.equal(calls,0);assert.equal(report.realModelRequests,0);assert.equal(report.datasetDigest,"ced5a1e9f01f3eea0250fbfa2e85b8f4026002b3994ac9c927b3442efd04fff0");assert.equal(report.model,null);assert.equal(report.tokenUsage,null);assert.equal(report.providerLatencyMs,null);assert.equal(report.actualModelSpendUsd,0);assert.equal(report.humanJudgmentsRecorded,false);assert.ok(report.rows.every(x=>x.humanReview==="UNREVIEWED"));assert.ok(report.rows.some(x=>x.flags.some(f=>f.code==="LANGUAGE_REVIEW")));}finally{globalThis.fetch=original;}
 for(const file of ["lib/ai-case-brief/experiment.ts","lib/ai-case-brief/experiment-contract.ts","lib/ai-case-brief/quality.ts","scripts/prepare-ai-experiment.ts"])assert.doesNotMatch(readFileSync(file,"utf8"),/\bfetch\s*\(|\bprisma\b|dotenv|process\.env|apiKey|chat\/analysis|support\/channels/);
});
