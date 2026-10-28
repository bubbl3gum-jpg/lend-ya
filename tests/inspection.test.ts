import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inspectionWindow,responseWindow,notificationExamples,previewInput} from "../lib/inspection/contracts";
import {identityAuthorizationUnavailable,validateVisionObservation,visionInferenceUnavailable} from "../lib/inspection/future-contracts";
test("inspection is a stable half-open 24-hour window from authoritative return, never page refresh",()=>{
 const at="2026-10-28T03:00:00.000Z",first=inspectionWindow(at,new Date("2026-10-28T04:00:00Z")),reload=inspectionWindow(at,new Date("2026-10-28T05:00:00Z"));
 assert.equal(first.deadline,"2026-10-29T03:00:00.000Z");assert.equal(first.deadline,reload.deadline);assert(first.open);assert(!inspectionWindow(at,new Date("2026-10-29T03:00:00Z")).open);assert(!inspectionWindow(at,new Date("2026-10-30T03:00:00Z")).open);assert.equal(inspectionWindow(null,new Date()).deadline,null);assert.equal(inspectionWindow(at,new Date("2026-10-27T03:00:00Z")).returnedAt,null);
});
test("only explicit synthetic delivered event demonstrates 48 hours; queued/failed/missing never start, silence never liability",()=>{
 assert.equal(responseWindow(notificationExamples[0]).deadline,"2026-10-30T03:00:00.000Z");for(const e of [null,notificationExamples[1],notificationExamples[2]])assert.equal(responseWindow(e).deadline,null);
 for(const e of notificationExamples){assert.equal(responseWindow(e).automaticLiability,false);assert.equal(responseWindow(e).enforceable,false);}
});
test("closed preview inputs forbid forged identity, clocks, delivery, money and foreign scope",()=>{
 const claim={bookingId:1,mode:"CLAIM",component:"Lens body",concern:"POSSIBLE_DIFFERENCE",description:"A possible difference, not a finding",evidenceIds:[],missingEvidence:true};assert.equal(previewInput(claim).mode,"CLAIM");
 for(const x of [null,{...claim,ownerId:2},{...claim,returnedAt:new Date().toISOString()},{...claim,verified:true},{...claim,notificationDelivered:true},{...claim,refund:500},{...claim,concern:"GUILTY"},{...claim,evidenceIds:["foreign"]},{...claim,description:"x".repeat(2001)}])assert.throws(()=>previewInput(x));
 const response=previewInput({bookingId:1,mode:"RESPONSE",description:"I disagree and request clarification",evidenceIds:[],accessoryState:"UNKNOWN",disagree:true,requestHuman:true});assert.equal(response.mode,"RESPONSE");assert.equal("disagree" in response&&response.disagree,true);
});
test("vision observations only cite allowed original references and cannot assert values/actions; eKYC never trusts synthetic success",()=>{
 const observation={kind:"POSSIBLE_DIFFERENCE",text:"Possible surface difference",refs:["original-one"],confidence:null,uncertainty:"View is incomplete",advisory:true};assert.equal(validateVisionObservation(observation,["original-one"]).advisory,true);
 for(const v of [{...observation,repairCost:300},{...observation,advisory:false},{...observation,refs:["foreign"]},{...observation,confidence:NaN}])assert.throws(()=>validateVisionObservation(v,["original-one"]));
 for(const value of [{verified:true},{state:"VERIFIED",providerReference:"synthetic"},null])assert.throws(()=>identityAuthorizationUnavailable(value),/NO_APPROVED_EKYC/);
 assert.throws(()=>visionInferenceUnavailable({bookingId:1,category:"camera",checklist:{},references:[]}),/NO_APPROVED_VISION/);
});
test("inspection preview code has no mutation, inference or production dispute invocation",async()=>{
 const server=await readFile("lib/inspection/service.ts","utf8");assert.doesNotMatch(server,/\.(?:create|update|delete|upsert|executeRaw)\(|fetch\(|\/dispute/);
 for(const file of ["lib/inspection/contracts.ts","lib/inspection/future-contracts.ts"]){assert.doesNotMatch(await readFile(file,"utf8"),/fetch\(|process\.env|from ["'][^"']*(?:prisma|provider|biometric)/);}
 const layout=await readFile("app/layout.tsx","utf8");assert.doesNotMatch(layout,/next\/font\/google|MOCKED_RESPONSES/);
});
