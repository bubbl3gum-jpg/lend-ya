import {test} from "node:test";import assert from "node:assert/strict";import {randomUUID} from "node:crypto";
import {playgroundTask} from "../lib/local-inference/playground";import type {Advisory} from "../lib/local-inference/contracts";
import {SnapshotStore,type Scope} from "../lib/translation-sidecar/store";import {translate} from "../lib/translation-sidecar/engine";
import {hash,requestInput,verifyLiteralIntegrity,verifySourceLanguage} from "../lib/translation-sidecar/contracts";import {mockAdapter,validateMockFields} from "../lib/translation-sidecar/mock";
const owner:Scope={actorId:1,sessionBinding:"server-session-incarnation-a",expiresAt:Date.now()+3600000};
function canonical(locale:"en"|"zh-TW"="en"){
 const manifest=playgroundTask({mode:"PLAYGROUND",side:"BORROWER",language:locale,messages:["Fictional unconfirmed accessory."]}).manifest;
 const output:Advisory={knownFacts:[],participantClaims:[{text:"Synthetic unverified statement",refs:[manifest.sources[0].id]}],uncertainties:["Insufficient evidence"],nextSteps:[],requiresAgreement:[],humanReview:[],drafts:{en:"Please clarify the issue.","zh-TW":"請協助釐清問題。"}};return {manifest,output,model:"qwen3.5:9b"};
}
const input=(d:ReturnType<SnapshotStore["capture"]>)=>({version:"advisory-translation-request-v1",responseRef:d.responseRef,canonicalDigest:d.canonicalDigest,targetLocale:d.sourceLocale==="en"?"zh-TW":"en",fieldPaths:[`drafts.${d.sourceLocale}`],requestId:randomUUID()});
test("immutable canonical snapshots bind actor/session, expire and reject unknown source locale",()=>{
 let now=Date.now();const s=new SnapshotStore(()=>now),c=canonical(),d=s.capture(owner,c);try{
 c.output.drafts.en="Browser changed";assert.equal(s.resolve(owner,d.responseRef).canonical.output.drafts.en,"Please clarify the issue.");assert.throws(()=>{s.resolve(owner,d.responseRef).canonical.manifest.side="OWNER";});
 for(const scope of [{...owner,actorId:2},{...owner,sessionBinding:"new-incarnation"},{...owner,expiresAt:now-1}])assert.throws(()=>s.resolve(scope,d.responseRef));
 now+=300001;assert.throws(()=>s.resolve(owner,d.responseRef));assert.throws(()=>s.capture(owner,{...canonical(),manifest:{...canonical().manifest,language:"fr" as "en"}}));
 }finally{s.clear();}
});
test("bounded snapshot ownership, per-session eviction and original source metadata unchanged",()=>{const s=new SnapshotStore();try{const old=s.capture(owner,canonical());for(let n=0;n<6;n++)s.capture(owner,canonical());assert.throws(()=>s.resolve(owner,old.responseRef));const d=s.capture(owner,canonical()),e=s.resolve(owner,d.responseRef);assert.equal(e.canonical.manifest.sources[0].kind,"PARTICIPANT_CLAIM");assert.deepEqual(e.canonical.output.knownFacts,[]);}finally{s.clear();}});
test("exact selected paths, forged canonical text/metadata, stale digest and idempotent request binding",()=>{const s=new SnapshotStore();try{const d=s.capture(owner,canonical()),r=input(d),result=translate(s,owner,r);assert.equal(result.provenance,"MOCK_TEST_OUTPUT");assert.equal(result.provider.model,null);assert.equal(result.fields[0].translatedText,"請協助釐清問題。");assert.deepEqual(translate(s,owner,r),result);
 for(const bad of [{...r,output:canonical().output},{...r,sourceKinds:["CONTEXT"]},{...r,actorId:2},{...r,targetLocale:"zh-CN"},{...r,fieldPaths:["knownFacts[0].text"]},{...r,fieldPaths:["participantClaims[99].text"]},{...r,fieldPaths:["drafts.zh-TW"]},{...r,fieldPaths:["caseNotes.issueCategory"]},{...r,fieldPaths:["participantClaims[0].refs"]},{...r,fieldPaths:["drafts.en","drafts.en"]},{...r,canonicalDigest:"sha256:"+"0".repeat(64)},{...r,requestId:"forged"}])assert.throws(()=>translate(s,owner,bad));
 assert.throws(()=>translate(s,owner,{...r,targetLocale:"en"}));const r2={...input(d),targetLocale:"en"};assert.equal(translate(s,owner,r2).state,"NOT_NEEDED");assert.throws(()=>translate(s,owner,input(d)));assert.equal(s.resolve(owner,d.responseRef).canonical.output.drafts.en,"Please clarify the issue.");
 }finally{s.clear();}});
test("authored mock coverage, mixed/unknown source refusal and bilingual reverse mapping",()=>{const s=new SnapshotStore();try{const d=s.capture(owner,canonical("zh-TW"));assert.equal(translate(s,owner,input(d)).fields[0].translatedText,"Please clarify the issue.");const c=canonical();c.output.drafts.en="A fictional sentence not in the mock catalogue.";const unavailable=s.capture(owner,c);assert.throws(()=>translate(s,owner,input(unavailable)),/MOCK_UNAVAILABLE/);
 for(const [text,lang]of [["not confirmed 尚未確認","en"],["物主 said 未確認","zh-TW"],["12345","en"]]as const)assert.throws(()=>verifySourceLanguage(text,lang));
 }finally{s.clear();}});
test("literal currency/date/timezone invariants and independent output/provenance rejection",()=>{
 const source="NT$1000 deposit and NT$400 rental fee are not confirmed paid. Pickup proposal: 2026-11-03 18:00 Asia/Taipei UTC+08:00; no agreement.",selected={"drafts.en":source},raw=mockAdapter(selected,"en","zh-TW");assert.doesNotThrow(()=>validateMockFields(raw,selected,"en","zh-TW"));
 for(const translated of [raw.fields[0].translatedText.replace("NT$400","NT$500"),raw.fields[0].translatedText.replace("18:00","19:00"),raw.fields[0].translatedText.replace("Asia/Taipei","Asia/Tokyo"),raw.fields[0].translatedText.replace("2026-11-03","2026-11-04")])assert.throws(()=>verifyLiteralIntegrity(source,translated));
 for(const bad of [{...raw,provenance:"DEDICATED_TRANSLATION_API"},{...raw,fields:[]},{...raw,fields:[{...raw.fields[0],path:"knownFacts[0].text"}]},{...raw,fields:[{...raw.fields[0],canonicalTextDigest:hash("different")}]},{...raw,fields:[{...raw.fields[0],refs:["foreign"]}]}])assert.throws(()=>validateMockFields(bad,selected,"en","zh-TW"));
 for(const [a,b]of [["2026-11-03T18:00:00+08:00","2026-11-03T18:00:00-08:00"],["400 TWD","400 USD"],["-NT$400","NT$400"],["UTC+0800","UTC-0800"]])assert.throws(()=>verifyLiteralIntegrity(a,b));
 assert.throws(()=>requestInput({text:source}));
});
