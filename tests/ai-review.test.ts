import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {mkdtemp,symlink,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {buildReviewPacket,blankReview,validateReview,renderReviewMarkdown} from "../lib/ai-case-brief/review-packet";
import {qualityCorpus} from "../lib/ai-case-brief/experiment";
import {reviewSupplement} from "../lib/ai-case-brief/review-corpus";
const pinned="ced5a1e9f01f3eea0250fbfa2e85b8f4026002b3994ac9c927b3442efd04fff0";
test("12D preserves pinned corpus, pairs source fidelity and offline-only packet reproducibility",async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error("Unexpected egress");};
 try{
 assert.equal(createHash("sha256").update(qualityCorpus().map(c=>c.digest).join("\n")).digest("hex"),pinned);
 assert.equal(createHash("sha256").update(reviewSupplement().map(c=>c.digest).join("\n")).digest("hex"),"ef06b64c9ff687d98541635d14a8510f34d215a9da7a80af7a7498d40bfad8bf");
 const p=await buildReviewPacket();assert.equal(p.packetDigest,"50788371fd80781832e4cf0b910d1e12a5a5f0b5c640aa2bcdb212d3c5fdcea4");assert.deepEqual(p,await buildReviewPacket());assert.equal(p.items.length,32);
 for(let n=0;n<16;n+=2)assert.deepEqual(reviewSupplement()[n].manifest.sources,reviewSupplement()[n+1].manifest.sources);
 assert(p.items.every(i=>i.machine.structural==="VALID"&&i.machine.model==="NONE"));
 const review=blankReview(p);assert.equal(validateReview(review,p).selfReportedSubmittedItems,0);
 assert.equal(p.items.flatMap(i=>i.machine.dimensions).filter(d=>d.score===null).length,192);
 assert(renderReviewMarkdown(p).includes("Translation problems"));assert.equal(p.liveMeasurements.spend,null);
 }finally{globalThis.fetch=original;}
});
test("strict review schema rejects forged bindings, approvals, dimensions, partial scores and unsafe notes",async()=>{
 const p=await buildReviewPacket();
 const mutations:((r:ReturnType<typeof blankReview>)=>void)[]=[
 r=>{r.packetDigest="forged";},r=>{r.reviews[0].snapshotDigest="forged";},r=>{r.reviews[0].id="foreign";},
 r=>{r.reviews[1]=r.reviews[0];},r=>{r.reviews.pop();},r=>{Object.assign(r,{approved:true});},
 r=>{Object.assign(r.reviews[0],{role:"ADMIN"});},r=>{Object.assign(r.reviews[0].scores,{authority:2});},
 r=>{delete r.reviews[0].scores.draft;delete r.reviews[0].scores.entailment;Object.assign(r.reviews[0].scores,{"draft,entailment":null});},
 r=>{Object.assign(r.reviews[0].scores,{factuality:2});},r=>{r.reviews[0].observations="<script>";},
 r=>{r.reviews[0].privacyConcerns="x".repeat(2001);},r=>{r.reviews[0].translationProblems="bad\u0000note";},
 ];
 for(const mutate of mutations){const r=blankReview(p);mutate(r);assert.throws(()=>validateReview(r,p),/INVALID_OFFLINE_REVIEW/);}
 assert.throws(()=>validateReview(null,p));
});
test("test-only review attribution is self-reported, not verified identity, quality pass or approval",async()=>{
 const p=await buildReviewPacket();const r=blankReview(p);
 // Synthetic validator fixture only; never written to the genuine human-review packet.
 Object.assign(r.reviews[0],{reviewer:"REVIEWER-TEST",reviewedAt:"2026-01-01T00:00:00Z",scores:{factuality:0,entailment:1,privacy:2,injection:0,translation:1,draft:2},observations:"Synthetic parser test only"});
 assert.deepEqual(validateReview(r,p),{valid:true,selfReportedSubmittedItems:1,unreviewedItems:31,identityVerified:false,approvalGranted:false,liveExecutionAllowed:false});
 for(const date of ["2026-02-31T00:00:00Z","2999-01-01T00:00:00Z","not-a-date"]){Object.assign(r.reviews[0],{reviewedAt:date});assert.throws(()=>validateReview(r,p));}
 for(const score of [3,-1,1.5,"2",NaN]){Object.assign(r.reviews[0],{reviewedAt:"2026-01-01T00:00:00Z"});Object.assign(r.reviews[0].scores,{factuality:score});assert.throws(()=>validateReview(r,p));}
});
test("review modules contain no private readers, credentials, approval loaders or transports",async()=>{
 for(const file of ["lib/ai-case-brief/review-corpus.ts","lib/ai-case-brief/review-packet.ts","scripts/offline-ai-review.ts"]){
 const source=await readFile(file,"utf8");assert.doesNotMatch(source,/process\.env|fetch\(|https?:|from ["'][^"']*(?:prisma|dotenv|support\/|auth|provider)/);
 }
});
test("local CLI validates blank packet, refuses overwrite, malformed, oversized and symlink inputs",async()=>{
 const root=await mkdtemp(join(tmpdir(),"hustlen-review-test-"));
 const run=(...args:string[])=>spawnSync(process.execPath,["--import","tsx","scripts/offline-ai-review.ts",...args],{encoding:"utf8"});
 try{
 const target=join(root,"packet");assert.equal(run("prepare",target).status,0);
 const result=run("validate",join(target,"review.json"));assert.equal(result.status,0);assert.match(result.stdout,/"selfReportedSubmittedItems":0/);
 assert.equal(run("prepare",target).status,1);
 const bad=join(root,"bad.json");await writeFile(bad,"{broken synthetic input");assert.equal(run("validate",bad).status,1);
 await writeFile(bad," ".repeat(512001));assert.equal(run("validate",bad).status,1);
 const link=join(root,"link.json");await symlink(join(target,"review.json"),link);assert.equal(run("validate",link).status,1);
 assert.equal(run("validate",target).status,1);assert.equal(run("approve",bad).status,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
