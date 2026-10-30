import {test} from "node:test";
import assert from "node:assert/strict";
import {caseAssistanceTask} from "../lib/local-inference/case-assistance";
import {caseAdvisorySchema,validateCaseAdvisory,prepareCaseSummary,CASE_NOTES_VERSION,caseIssues,caseStages} from "../lib/local-inference/case-notes";
import {groundedHelpTask,proceduralKnowledge} from "../lib/local-inference/knowledge";
import {runInference,localConfig} from "../lib/local-inference/gateway";
import {validateAdvisory} from "../lib/local-inference/contracts";
const input={mode:"CASE_ASSISTANCE",topic:"RETURN",side:"BORROWER",language:"en",messages:["Fictional: a charger may be missing; no loss is confirmed.","The owner disagrees. No compensation was agreed."]};
const make=()=>({knownFacts:[] as {text:string;refs:string[]}[],participantClaims:[{text:"Reported possible missing charger",refs:["U1"]}],uncertainties:["Accessory state unconfirmed; participant accounts may conflict"],nextSteps:[{text:"Ask which bag was checked",refs:["U1"]}],requiresAgreement:["No compensation agreement"],humanReview:["Ask authorized human help if the uncertainty persists"],drafts:{en:"Could we clarify the accessory location?","zh-TW":"是否能先釐清配件放置位置？"},caseNotes:{version:CASE_NOTES_VERSION,issueCategory:"ACCESSORY",rentalStage:"INSPECTION",basisRefs:["U1","U2"],clarificationQuestions:["Which bag was checked?","What remains uncertain?"]}});
test("5B reuses original M5A sources/fingerprints; browser cannot invent sources or case records",()=>{
 const task=caseAssistanceTask(input),grounded=groundedHelpTask({...input,mode:"GROUNDED"});assert.deepEqual(task.manifest.sources,grounded.manifest.sources);assert.deepEqual("knowledge" in task?task.knowledge:undefined,grounded.knowledge);
 for(const topic of ["BOOKING","HANDOFF","RETURN"])assert.equal(proceduralKnowledge(topic).version,1);
 for(const raw of [{...input,bookingId:1},{...input,sources:[]},{...input,side:"ADMIN"},{...input,topic:"REFUND"}])assert.throws(()=>caseAssistanceTask(raw));
 const general=caseAssistanceTask({...input,topic:"GENERAL"});assert(general.manifest.sources.every(s=>s.kind==="PARTICIPANT_CLAIM"));
});
test("5B independent closed classification/stage contract, zero-to-two questions, claim-only inference basis",()=>{
 const task=caseAssistanceTask(input),good=make();assert.deepEqual(validateCaseAdvisory(good,task.manifest),good);
 for(const change of [
 (v:ReturnType<typeof make>)=>{v.caseNotes.issueCategory="GUILTY";},
 (v:ReturnType<typeof make>)=>{v.caseNotes.rentalStage="RETURNED";},
 (v:ReturnType<typeof make>)=>{v.caseNotes.basisRefs=[];},
 (v:ReturnType<typeof make>)=>{v.caseNotes.basisRefs=["HUSTLEN-PROC-RETURN:v1"];},
 (v:ReturnType<typeof make>)=>{v.caseNotes.basisRefs=["FOREIGN"];},
 (v:ReturnType<typeof make>)=>{v.caseNotes.clarificationQuestions=["a","b","c"];},
 (v:ReturnType<typeof make>)=>{v.knownFacts=[{text:"Return verified",refs:["U1"]}];}
 ]){const v=make();change(v);assert.throws(()=>validateCaseAdvisory(v,task.manifest));}
 for(const issue of caseIssues){const v=make();v.caseNotes.issueCategory=issue;assert.equal(validateCaseAdvisory(v,task.manifest).caseNotes.issueCategory,issue);}
 for(const stage of caseStages){const v=make();v.caseNotes.rentalStage=stage;assert.equal(validateCaseAdvisory(v,task.manifest).caseNotes.rentalStage,stage);}
 assert.throws(()=>validateCaseAdvisory({...good,verifiedApplicationContext:"return confirmed"},task.manifest));
 assert.throws(()=>validateCaseAdvisory({...good,caseNotes:{...good.caseNotes,ticketSubmitted:true}},task.manifest));assert.throws(()=>validateAdvisory(good,task.manifest));
 const unknown=make();unknown.caseNotes={...unknown.caseNotes,issueCategory:"UNCLEAR",rentalStage:"UNDETERMINED",basisRefs:[],clarificationQuestions:[]};assert.equal(validateCaseAdvisory(unknown,task.manifest).caseNotes.issueCategory,"UNCLEAR");
 const schema=caseAdvisorySchema(task.manifest);assert.deepEqual(schema.properties.caseNotes.properties.basisRefs.items.enum,["U1","U2"]);
});
test("5B preserves perspective/language/corrections through mock gateway, not semantic quality proof",async()=>{
 const config=localConfig({NODE_ENV:"development",HUSTLEN_LOCAL_AI:"synthetic-ollama-only"});
 for(const language of ["en","zh-TW"])for(const side of ["OWNER","BORROWER"]){
  const task=caseAssistanceTask({...input,language,side}),good=make();
  const r=await runInference(task.manifest,new AbortController().signal,config,async body=>{const request=JSON.parse(body);assert(request.format.required.includes("caseNotes"));assert(request.messages[0].content.includes("not a confirmed handoff/return status"));assert(request.messages[0].content.includes(`Fictional requester: ${side}`));assert.deepEqual(JSON.parse(request.messages[1].content).sources,task.manifest.sources);return {model:config.model,done:true,message:{content:JSON.stringify(good)}};});assert.deepEqual(r.output,good);
 }
});
test("5B prepared summary is neutral unsent original claims, no policy/return record invented",()=>{
 for(const language of ["en","zh-TW"]){const t=caseAssistanceTask({...input,language}),v=validateCaseAdvisory(make(),t.manifest),summary=prepareCaseSummary(t.manifest,v.caseNotes);for(const message of input.messages)assert(summary.includes(message));assert(summary.includes("HUSTLEN-PROC-RETURN:v1"));assert(!summary.includes("refund approved"));assert(summary.length<=8000);assert(summary.includes(language==="en"?"not sent":"未送出"));assert(summary.includes(language==="en"?"No booking":"沒有載入預約"));}
});
