import { test } from "node:test";
import assert from "node:assert/strict";
import { localCatalogue, localTask } from "../lib/local-inference/catalogue";
import { localConfig, runInference } from "../lib/local-inference/gateway";
import { validateAdvisory, InferenceError, safeValidationDiagnostic } from "../lib/local-inference/contracts";
const config=localConfig({NODE_ENV:"development",HUSTLEN_LOCAL_AI:"synthetic-ollama-only"});
const candidate=(id:string)=>({knownFacts:[],participantClaims:[{text:"The source contains an unverified statement.",refs:[id]}],uncertainties:["Independent evidence is unavailable."],nextSteps:[{text:"Ask a scoped clarifying question.",refs:[id]}],requiresAgreement:["Any voluntary coordination requires explicit agreement."],humanReview:["No decision or financial authority."],drafts:{en:"Please clarify the missing information.","zh-TW":"請協助釐清缺少的資訊。"}});
test("13F 32 preserved + 2 separate recovery selectors, production/endpoint/model refusal and no arbitrary prompt",()=>{
 assert.equal(localCatalogue().length,34);
 for(const raw of [{scenario:1},{scenario:"SYN-INJECTION:en",prompt:"private"},{bookingId:1},{scenario:"SYN-NOTREAL:en"}])assert.throws(()=>localTask(raw));
 for(const env of [{NODE_ENV:"production"},{HUSTLEN_OLLAMA_ENDPOINT:"http://localhost:11434"},{HUSTLEN_OLLAMA_ENDPOINT:"http://127.0.0.1:11434@evil.test"},{HUSTLEN_OLLAMA_ENDPOINT:"https://example.test"},{HUSTLEN_OLLAMA_MODEL:"other"}])assert.throws(()=>localConfig({NODE_ENV:"development",HUSTLEN_LOCAL_AI:"synthetic-ollama-only",...env}));
});
test("13F all 32 existing + 2 recovery bilingual contexts validated through mock transport; NOT model quality",async()=>{
 for(const task of localCatalogue()){
 const output=candidate(task.manifest.sources[0].id);
 const result=await runInference(task.manifest,new AbortController().signal,config,async body=>{
  const request=JSON.parse(body);assert.equal(request.think,false);assert.equal(request.stream,false);assert.equal(request.options.num_predict,2048);assert.equal(request.tools,undefined);assert.deepEqual(JSON.parse(request.messages[1].content),task.manifest);
  return {model:config.model,done:true,message:{content:JSON.stringify(output),thinking:"NEVER RELEASE"},eval_count:25,prompt_eval_count:100};
 });assert.deepEqual(result.output,output);assert.equal(JSON.stringify(result).includes("NEVER RELEASE"),false);assert.equal(result.outputTokens,25);
 assert.throws(()=>validateAdvisory({...output,nextSteps:[{text:"Invented",refs:["FOREIGN"]}]},task.manifest));
 assert.throws(()=>validateAdvisory({...output,execute:"REFUND"},task.manifest));
 if(task.manifest.sources[0].kind==="PARTICIPANT_CLAIM")assert.throws(()=>validateAdvisory({...output,knownFacts:output.participantClaims},task.manifest));
 }
});
test("13F malformed output, failures, cancellation and one-in-flight bound",async()=>{
 const task=localCatalogue()[0],controller=new AbortController();
 let entered!:()=>void;const started=new Promise<void>(r=>entered=r);
 const first=runInference(task.manifest,controller.signal,config,async(_body,signal)=>{entered();return new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(Error("aborted")),{once:true}));});
 await started;await assert.rejects(runInference(task.manifest,new AbortController().signal,config),{code:"LIMIT"});controller.abort();await assert.rejects(first,{code:"CANCELED"});
 for(const raw of [null,{model:config.model,done:true,message:{content:"not json"}},{model:config.model,done:false,message:{content:"{}"}},{model:config.model,done:true,message:{content:"{}"}},{model:"other",done:true,message:{content:"{}"}}])await assert.rejects(runInference(task.manifest,new AbortController().signal,config,async()=>raw),{code:"VALIDATION"});
 await assert.rejects(runInference(task.manifest,new AbortController().signal,config,async()=>{throw Error("Sensitive diagnostics must not escape");}),{code:"UNAVAILABLE"});
});
test("13F timeout aborts transport and releases concurrency without altered legacy deadlines",async(t)=>{
 t.mock.timers.enable({apis:["setTimeout"]});
 const c=new AbortController();let ready!:()=>void;const entered=new Promise<void>(r=>ready=r);
 const pending=runInference(localCatalogue()[0].manifest,c.signal,config,async(_body,signal)=>{ready();return new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(Error("deadline")),{once:true}));});
 await entered;t.mock.timers.tick(60000);await assert.rejects(pending,{code:"TIMEOUT"});t.mock.timers.reset();
});

test("13F-R1 fixed diagnostic categories preserve source/shape refusals without leaking values",()=>{
 const manifest=localTask({scenario:"SYN-REVIEW-TRANSLATION:zh-TW"}).manifest;
 assert.deepEqual(manifest.sources.map(s=>[s.id,s.kind]),[["R1","PARTICIPANT_CLAIM"]]);
 const good=candidate("R1");
 const rows:[unknown,string,string][]=[
  [{...good,privateUnknownField:"SECRET_SENTINEL"},"OBJECT_SHAPE","root"],
  [{...good,uncertainties:"SECRET_SENTINEL"},"ARRAY_SHAPE","uncertainties"],
  [{...good,drafts:{...good.drafts,"zh-TW":"  "}},"TEXT_INVALID","drafts.zh-TW"],
  [{...good,nextSteps:[{text:"SECRET_SENTINEL",refs:[]}]},"REFS_EMPTY","nextSteps"],
  [{...good,nextSteps:[{text:"SECRET_SENTINEL",refs:["R1","R1"]}]},"REFS_DUPLICATE","nextSteps"],
  [{...good,nextSteps:[{text:"SECRET_SENTINEL",refs:["SECRET_SENTINEL"]}]},"REFS_UNKNOWN","nextSteps"],
  [{...good,knownFacts:good.participantClaims},"FACT_SOURCE_KIND","knownFacts"],
 ];
 for(const [raw,reason,field]of rows){
  assert.throws(()=>validateAdvisory(raw,manifest),e=>{
   assert(e instanceof InferenceError);assert.equal(e.code,"VALIDATION");assert.equal(e.message,"VALIDATION");
   assert.deepEqual(safeValidationDiagnostic(e),{version:"local-validation-v1",reason,field});assert(!JSON.stringify(safeValidationDiagnostic(e)).includes("SECRET_SENTINEL"));return true;
  });
 }
 assert.deepEqual(validateAdvisory(good,manifest),good);
 assert.equal(safeValidationDiagnostic(new InferenceError("VALIDATION")),undefined);
 assert.equal(safeValidationDiagnostic(new InferenceError("UNAVAILABLE")),undefined);
 const forged=new InferenceError("VALIDATION");Object.assign(forged,{reason:"SECRET_SENTINEL",field:"SECRET_SENTINEL"});assert.equal(safeValidationDiagnostic(forged),undefined);
});
test("13F-R1 distinguishes envelope, model, incomplete response and content JSON",async()=>{
 const manifest=localTask({scenario:"SYN-REVIEW-TRANSLATION:zh-TW"}).manifest;
 for(const [raw,reason]of [[null,"PROVIDER_ENVELOPE"],[{model:"other"},"MODEL_MISMATCH"],[{model:config.model,done:false},"INCOMPLETE_RESPONSE"],[{model:config.model,done:true,message:{thinking:"SECRET_SENTINEL"}},"CONTENT_MISSING"],[{model:config.model,done:true,message:{content:"SECRET_SENTINEL"}},"CONTENT_JSON"],[{model:config.model,done:true,done_reason:"length",message:{content:"SECRET_SENTINEL"}},"CONTENT_JSON_LIMIT"]] as const){
  await assert.rejects(runInference(manifest,new AbortController().signal,config,async()=>raw),e=>{assert(e instanceof InferenceError);assert.deepEqual(safeValidationDiagnostic(e),{version:"local-validation-v1",reason,field:"provider"});return true;});
 }
});
