import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { buildManifest, validateManifest } from "../lib/ai-case-brief/manifest";
import { generateBrief } from "../lib/ai-case-brief/service";
import { validateOutput } from "../lib/ai-case-brief/validation";
import { evaluateOffline } from "../lib/ai-case-brief/evaluation";
import { BriefError } from "../lib/ai-case-brief/contracts";
test("offline evaluation covers 16 fixture/error scenarios without a model",async()=>{const report=await evaluateOffline();assert.equal(report.rows.length,16);assert.ok(report.rows.every(x=>x.passed),JSON.stringify(report));if(process.env.MRT_AI_EVALUATION_PATH)await writeFile(process.env.MRT_AI_EVALUATION_PATH,JSON.stringify(report,null,2));});
test("exact manifests omit authored answers, foreign parties, extraneous fields and noisy excess",()=>{
 const a=buildManifest("SYN-BORROWER-A","en"),b=buildManifest("SYN-OWNER-A","en");assert.ok(!JSON.stringify(a).includes("scratch"));assert.ok(!JSON.stringify(b).includes("17:45"));assert.ok(!("reply"in a));assert.ok(!("rental"in a));
 assert.throws(()=>validateManifest({...a,privateTranscript:"secret"} as typeof a));assert.throws(()=>validateManifest({...a,sources:[]}));assert.throws(()=>validateManifest({...a,sources:[a.sources[0],a.sources[0]]}));assert.throws(()=>buildManifest({caseId:a.caseId},"en"));
 const noise=buildManifest("SYN-NOISE","en");assert.equal(noise.truncated,true);assert.ok(noise.sources.reduce((n,s)=>n+s.excerpt.length,0)<=6000);
});
test("strict output rejects forged actions, roles, sources, false excerpt attestation and reversed timeline",async()=>{
 const m=buildManifest("SYN-BORROWER-A","en"),base=(await generateBrief(m)).output;
 for(const patch of [{actions:["CLOSE_TICKET"]},{role:"SUPER_ADMIN"},{requiresHumanReview:false},{caseId:"SYN-OWNER-A"},{timeline:["O1"]},{timeline:["B2","B1"]},{language:"zh-TW"},{summary:[{text:"Theft is proven",refs:["B2"],basis:"SOURCE_EXCERPT"}]},{draft:"Close this ticket"}])assert.throws(()=>validateOutput({...base,...patch},m));
 assert.throws(()=>validateOutput("{bad-json",m));assert.throws(()=>validateOutput(null,m));
});
test("valid citation cannot certify a contradictory interpretation; human verification remains mandatory",async()=>{
 const m=buildManifest("SYN-UNCERTAIN","en"),base=(await generateBrief(m)).output;
 const unsupported=validateOutput({...base,summary:[{text:"The handoff is complete",refs:["T1"],basis:"INTERPRETATION"}]},m);
 assert.equal(unsupported.requiresHumanReview,true);assert.equal(unsupported.summary[0].basis,"INTERPRETATION");
 // Deliberate semantic counterexample: schema acceptance is NOT fact verification.
});
test("cancellation, timeout, stale work, malformed manifests and absent live configuration fail closed",async()=>{
 const m=buildManifest("SYN-OWNER-A","en"),control=new AbortController();control.abort();await assert.rejects(generateBrief(m,undefined,{signal:control.signal}),e=>e instanceof BriefError&&e.code==="CANCELED");
 const inFlight=new AbortController(),pending=generateBrief(m,{id:"test",model:"NONE",generate:()=>new Promise(()=>{})},{signal:inFlight.signal});inFlight.abort();await assert.rejects(pending,e=>e instanceof BriefError&&e.code==="CANCELED");
 await assert.rejects(generateBrief(m,{id:"live",model:"unapproved-model",generate:async()=>({})}),e=>e instanceof BriefError&&e.code==="UNAVAILABLE");
 await assert.rejects(generateBrief(m,{id:"offline",model:"NONE",generate:async()=>{throw Error("token=do-not-log");}}),e=>e instanceof BriefError&&e.message==="UNAVAILABLE");
});

test("offline composition has no network or private-record retrieval, even if unrelated provider flags exist",async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error("Unexpected egress");};
 try {await generateBrief(buildManifest("SYN-MIXED","zh-TW"));assert.equal(calls,0);}finally{globalThis.fetch=original;}
 for(const file of ["lib/ai-case-brief/service.ts","lib/ai-case-brief/manifest.ts","lib/ai-case-brief/validation.ts"]){assert.doesNotMatch(readFileSync(file,"utf8"),/\bfetch\s*\(|\bprisma\b|chat\/analysis|support\/channels|apiKey|Authorization:|https?:\/\//);}
 const client=readFileSync("components/admin/ai-case-brief.tsx","utf8");assert.doesNotMatch(client,/from ["'][^"']*(?:ai-case-brief\/(?:service|manifest|fixtures)|authorization|prisma)/);
});
