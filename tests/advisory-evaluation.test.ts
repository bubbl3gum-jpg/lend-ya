import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluationDataset,digest,invariantDefinitions} from "../lib/advisory-evaluation/dataset";
import {validateResult,unrunResult,blankReview,validateHumanReview,type ResultRecord} from "../lib/advisory-evaluation/contracts";
import {qualityDimensions} from "../lib/ai-case-brief/quality";
import {recoveryFixtures} from "../lib/local-inference/recovery-fixture";
function seal(record:ResultRecord){const {resultDigest,...snapshot}=record;void resultDigest;return {...snapshot,resultDigest:digest(snapshot)};}
function mockResult():ResultRecord{
 const r=unrunResult("E01:en");r.run={id:"RUN-contract-fixture",execution:"MOCK",model:"test-only",modelDigest:null,promptDigest:null,schemaDigest:null};r.outcome="SUCCESS";r.httpStatus=200;r.latencyMs=1;r.structural="VALID";
 r.output={knownFacts:[],participantClaims:[{text:"Authored test fixture, not an inference",refs:["U1"]}],uncertainties:["No images inspected"],nextSteps:[{text:"Clarify the reported condition",refs:["U1"]}],requiresAgreement:[],humanReview:["Review the original evidence"],drafts:{en:"Could you clarify the reported concern?","zh-TW":"請協助釐清所描述的狀況。"}};
 return seal(r);
}
test("3A pinned separately versioned24-case bilingual dataset,32 prefixes and invariant coverage",()=>{
 const d=evaluationDataset();assert.deepEqual(d,JSON.parse(readFileSync("docs/ai/milestone3a/dataset.json","utf8")));
 assert.equal(d.datasetDigest,"db9ac6f853bf8077982b2dc20e7f3c7c8ca701041a2fe6994dbf7ba7971355c5");assert.equal(d.version,"cs-advisory-eval-v1");assert.equal(d.cases.length,24);assert.equal(new Set(d.cases.map(c=>c.id)).size,24);assert.equal(d.cases.reduce((n,c)=>n+c.turns.length,0),32);
 const coverage=new Set(d.cases.flatMap(c=>c.invariants.map(i=>i.id)));assert.deepEqual([...coverage].sort(),Object.keys(invariantDefinitions).sort());
 for(let index=0;index<12;index++){
  const [en,zh]=d.cases.slice(index*2,index*2+2);assert.equal(en.language,"en");assert.equal(zh.language,"zh-TW");assert(en.expectedBehavior.length>0);assert.deepEqual(en.expectedBehavior,zh.expectedBehavior);assert.equal(en.side,zh.side);assert.equal(en.risk,zh.risk);
  assert.deepEqual(en.turns.map(t=>t.manifest.sources),zh.turns.map(t=>t.manifest.sources));
  for(const c of [en,zh])for(const t of c.turns){assert.equal(t.inputDigest,digest(t.manifest));assert.equal(t.manifest.side,c.side);assert.equal(t.manifest.language,c.language);assert.equal(validateResult(unrunResult(c.id,t.turn)).outcome,"NOT_RUN");}
 }
 for(const c of d.cases.filter(c=>!c.id.startsWith("E10")))assert(c.turns.every(t=>t.manifest.sources.every(s=>s.kind==="PARTICIPANT_CLAIM")));
 for(const c of d.cases.filter(c=>c.id.startsWith("E10")))assert.deepEqual(c.turns[0].manifest,recoveryFixtures().find(f=>f.manifest.language===c.language)!.manifest);
});
test("3A five-turn corrections, perspectives, chronology and no-image expectations remain explicit",()=>{
 const cases=evaluationDataset().cases,owner=cases.find(c=>c.id==="E01:en")!,borrower=cases.find(c=>c.id==="E03:en")!;
 assert.equal(owner.turns.length,5);assert(owner.invariants.some(i=>i.id==="CONTINUITY"));assert(owner.invariants.some(i=>i.id==="NO_IMAGE_CLAIM"));assert(owner.invariants.some(i=>i.id==="CHRONOLOGY"));
 for(const [index,t]of owner.turns.entries()){assert.equal(t.manifest.sources.length,index+1);assert.deepEqual(t.manifest.sources,owner.turns[4].manifest.sources.slice(0,index+1));}
 assert.match(owner.turns[4].manifest.sources[3].excerpt,/not confirmed/);assert.match(owner.turns[1].manifest.sources[1].excerpt,/cannot be retaken/);
 assert.equal(borrower.side,"BORROWER");assert.match(borrower.turns[0].manifest.sources[0].excerpt,/Neither is accepted/);assert(borrower.invariants.some(i=>i.id==="PERSPECTIVE"));
});
test("3A closed result states, snapshot binding, strict independent Advisory validation",()=>{
 const good=mockResult();assert.deepEqual(validateResult(good),good);
 const change=(f:(r:ResultRecord)=>void)=>{const r=structuredClone(good);f(r);return seal(r);};
 for(const raw of [null,{}, {...good,extra:true},{...good,resultDigest:"0".repeat(64)},change(r=>{r.inputDigest="0".repeat(64);}),change(r=>{r.datasetDigest="0".repeat(64);}),change(r=>{r.caseId="FOREIGN";}),change(r=>{r.turn=6;}),change(r=>{r.output!.knownFacts=r.output!.participantClaims;}),change(r=>{r.output!.nextSteps[0].refs=["C1"];}),change(r=>{r.latencyMs=-1;}),change(r=>{r.structural="UNAVAILABLE";}),change(r=>{r.run.execution="NOT_RUN";}),change(r=>{r.run.execution="LOCAL_OLLAMA_INFERENCE";}),change(r=>{r.heuristics=[{code:"PERSPECTIVE_REVIEW",field:"drafts",refs:["FOREIGN"]}];})])assert.throws(()=>validateResult(raw),/INVALID_ADVISORY_EVALUATION/);
 const failure=unrunResult("E02:zh-TW");failure.run={...good.run};failure.outcome="FAILURE";failure.httpStatus=502;failure.failure={code:"VALIDATION",reason:"FACT_SOURCE_KIND",field:"knownFacts"};failure.structural="REJECTED";assert.equal(validateResult(seal(failure)).failure?.reason,"FACT_SOURCE_KIND");
 failure.output=good.output;assert.throws(()=>validateResult(seal(failure)));
 const blank=unrunResult("E01:en");blank.latencyMs=0;assert.throws(()=>validateResult(seal(blank)));
});
test("3A heuristic flags are not human scores or semantic truth",()=>{
 const r=mockResult();r.output!.drafts.en="We inspected the photos and decided liability.";r.heuristics=[{code:"IMAGE_CLAIM_REVIEW",field:"drafts.en",refs:["U1"]}];
 const result=validateResult(seal(r));assert.equal(result.heuristics.length,1);
 assert(Object.values(blankReview(result).dimensions).every(d=>d.state==="UNREVIEWED"&&d.score===null));
 // A schema-valid but semantically wrong sentence stays visible for review, never silently repaired.
 assert.match(result.output!.drafts.en,/inspected/);
});
test("3A additive partial/NA review preserves rubric, honest nulls and exact result binding",()=>{
 const result=mockResult(),review=blankReview(result);assert.deepEqual(validateHumanReview(review,result),review);assert.deepEqual(Object.keys(review.dimensions),[...qualityDimensions]);
 review.dimensions.factuality={state:"SCORED",score:1,note:"Unit-test fixture judgment only, not a real reviewer."};review.dimensions.injection={state:"NOT_APPLICABLE",score:null,note:"No malicious instruction in this contract fixture."};review.reviewer="REVIEWER-TEST-FIXTURE";review.reviewedAt="2026-01-01T00:00:00Z";
 assert.deepEqual(validateHumanReview(review,result),review);assert.equal(review.dimensions.translation.score,null);
 const variants=[{...review,extra:true},{...review,resultDigest:"0".repeat(64)},{...review,reviewer:null},{...review,reviewedAt:"2999-01-01T00:00:00Z"},{...review,dimensions:{...review.dimensions,factuality:{state:"SCORED",score:3,note:"invalid"}}},{...review,dimensions:{...review.dimensions,injection:{state:"NOT_APPLICABLE",score:2,note:"fabricated pass"}}},{...review,dimensions:{...review.dimensions,injection:{state:"NOT_APPLICABLE",score:null,note:""}}},{...review,dimensions:{...review.dimensions,draft:{state:"UNREVIEWED",score:2,note:""}}}];
 for(const raw of variants)assert.throws(()=>validateHumanReview(raw,result),/INVALID_ADVISORY_EVALUATION/);
 const pending=unrunResult("E01:en");assert.throws(()=>validateHumanReview({...review,resultDigest:pending.resultDigest},pending));
});

test("3A mixed fixture accepts only existing context facts; failure and review fields stay closed",()=>{
 const original=mockResult(),c=evaluationDataset().cases.find(c=>c.id==="E10:en")!;
 const mixed={...original,caseId:c.id,caseDigest:c.caseDigest,inputDigest:c.turns[0].inputDigest,output:{...original.output!,knownFacts:[{text:"Synthetic camera-return event recorded",refs:["C1"]}],participantClaims:[{text:"Accessory uncertain",refs:["C2"]}],nextSteps:[{text:"Clarify accessory",refs:["C2"]}]}};
 assert.equal(validateResult(seal(mixed)).output!.knownFacts.length,1);
 mixed.output.knownFacts[0].refs=["C2"];assert.throws(()=>validateResult(seal(mixed)));
 for(const raw of [{...original,heuristics:[{code:"AUTO_PASS",field:"root",refs:[]}]},{...original,run:{...original.run,role:"ADMIN"}},{...original,output:{...original.output!,execute:"REFUND"}}])assert.throws(()=>validateResult(seal(raw as ResultRecord)));
 const failure=unrunResult("E01:en");failure.run={...original.run};failure.outcome="FAILURE";failure.structural="UNAVAILABLE";failure.httpStatus=null;failure.failure={code:"TIMEOUT",reason:null,field:null};assert.equal(validateResult(seal(failure)).outcome,"FAILURE");
 failure.failure.reason="CONTENT_JSON";assert.throws(()=>validateResult(seal(failure)));
 const r=blankReview(original);r.dimensions.draft.note="must remain blank while unreviewed";assert.throws(()=>validateHumanReview(r,original));
});
