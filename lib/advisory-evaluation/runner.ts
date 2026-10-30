import { evaluationDataset, digest, type EvaluationCase } from "./dataset";
import { unrunResult, validateResult, blankReview, type ResultRecord } from "./contracts";
import { validateAdvisory, safeValidationDiagnostic, InferenceError, validationFields, validationReasons } from "../local-inference/contracts";
export type Plan={version:"advisory-evaluation-plan-v1";datasetDigest:string;caseIds:string[];plannedCalls:number;maximumCalls:number;planDigest:string};
/** Closed, deliberately small scope. No --all, repeats or implicit model execution. */
export function planEvaluation(pinned:unknown,ids:string[]=["E03:en"],language?:"en"|"zh-TW"):Plan{
 const dataset=evaluationDataset();if(digest(pinned)!==digest(dataset))throw Error("DATASET_MISMATCH");
 if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||language!==undefined&&language!=="en"&&language!=="zh-TW")throw Error("INVALID_SELECTION");
 const cases=ids.map(id=>{const c=dataset.cases.find(c=>c.id===id);if(!c)throw Error("INVALID_SELECTION");return c;}).filter(c=>!language||c.language===language);
 const plannedCalls=cases.reduce((n,c)=>n+c.turns.length,0);if(!cases.length||plannedCalls>7)throw Error("INVALID_SELECTION");
 const snapshot={version:"advisory-evaluation-plan-v1" as const,datasetDigest:dataset.datasetDigest,caseIds:cases.map(c=>c.id),plannedCalls,maximumCalls:7};return {...snapshot,planDigest:digest(snapshot)};
}
export function requestFor(item:EvaluationCase,turn:number){
 const prefix=item.turns.find(t=>t.turn===turn);if(!prefix)throw Error("INVALID_TURN");
 // Only this exact existing fixed selector can carry application-authored CONTEXT.
 if(item.id.startsWith("E10:"))return {scenario:`SYN-RECOVERY-CHARGER:${item.language}`};
 if(prefix.manifest.sources.some(s=>s.kind!=="PARTICIPANT_CLAIM"))throw Error("INVALID_SOURCE_KIND");
 return {mode:"PLAYGROUND",side:item.side,language:item.language,messages:prefix.manifest.sources.map(s=>s.excerpt)};
}
export type Exchange={status:number;body:unknown};
export interface EvaluationClient{send(payload:ReturnType<typeof requestFor>,signal:AbortSignal):Promise<Exchange>}
export type Attempt={caseId:string;turn:number;clientElapsedMs:number;httpStatus:number|null;reportedLatencyMs:number|null;reportedModel:string|null;requestedModel:"qwen3.5:9b";sourceKinds:{id:string;kind:string}[];inferenceExecution:"REPORTED"|"UNCONFIRMED";responseBound:boolean;sourceKindsOrigin:"EXPECTED_MANIFEST";checks:{manifestExact:boolean;sourceReferencesValid:boolean|null;claimFactsNotPromoted:boolean|null}};
function reseal(r:ResultRecord){const {resultDigest,...snapshot}=r;void resultDigest;return validateResult({...snapshot,resultDigest:digest(snapshot)});}
const codes=["INPUT","UNAVAILABLE","LIMIT","TIMEOUT","CANCELED","VALIDATION","SESSION","DENIED"] as const;
/** No I/O persistence. Client seam is used by tests, never selected by browser/configuration. */
export async function runEvaluation(plan:Plan,client:EvaluationClient,signal:AbortSignal,execution:"MOCK"|"LOCAL_OLLAMA_INFERENCE",runId:string,wait:(signal:AbortSignal)=>Promise<void>,clock=()=>performance.now()){
 const dataset=evaluationDataset(),expected=planEvaluation(dataset,plan.caseIds);
 if(digest(plan)!==digest(expected))throw Error("PLAN_MISMATCH");
 if(!/^RUN-[A-Za-z0-9-]{1,64}$/.test(runId)||!["MOCK","LOCAL_OLLAMA_INFERENCE"].includes(execution))throw Error("INVALID_RUN");
 const results:ResultRecord[]=[],attempts:Attempt[]=[],notRunDetails:{caseId:string;turn:number;reason:"DEPENDENT_FAILURE"|"STOPPED"|"CANCELED"|"WAIT_INTERRUPTED"}[]=[];let stopped=false;
 for(const id of plan.caseIds){const item=dataset.cases.find(c=>c.id===id)!;let blocked=false;
  for(const prefix of item.turns){
   let r=unrunResult(id,prefix.turn);
   if(blocked||stopped||signal.aborted){notRunDetails.push({caseId:id,turn:prefix.turn,reason:signal.aborted?"CANCELED":blocked?"DEPENDENT_FAILURE":"STOPPED"});results.push(r);continue;}
   if(attempts.length){try{await wait(signal);}catch{stopped=true;notRunDetails.push({caseId:id,turn:prefix.turn,reason:"WAIT_INTERRUPTED"});results.push(r);continue;}}
   if(signal.aborted){stopped=true;notRunDetails.push({caseId:id,turn:prefix.turn,reason:"CANCELED"});results.push(r);continue;}
   const started=clock();let status:number|null=null,body:unknown=null,code:typeof codes[number]|null=null,bound=false,reportedLatency:number|null=null,model:string|null=null,reason:typeof validationReasons[number]|null=null,field:typeof validationFields[number]|null=null;
   try{const response=await client.send(requestFor(item,prefix.turn),signal);status=response.status;body=response.body;}catch(e){code=signal.aborted?"CANCELED":e instanceof InferenceError&&e.code==="TIMEOUT"?"TIMEOUT":"UNAVAILABLE";}
   const elapsed=Math.max(0,Math.round(clock()-started));if(signal.aborted)code="CANCELED";
   if(!code){
    const x=body&&typeof body==="object"&&!Array.isArray(body)?body as Record<string,unknown>:null;
    if(status===200){
     if(!x||!x.manifest||x.provenance!=="LOCAL_OLLAMA_INFERENCE"||x.model!=="qwen3.5:9b"||digest(x.manifest)!==prefix.inputDigest||x.inputDigest!==digestWireManifest(prefix.manifest)||typeof x.latencyMs!=="number"||!Number.isSafeInteger(x.latencyMs)||x.latencyMs<0){code="VALIDATION";reason="OBJECT_SHAPE";field="root";stopped=true;}
     else{bound=true;model=x.model as string;reportedLatency=x.latencyMs as number;try{r.output=validateAdvisory(x.output,prefix.manifest);}catch(e){code="VALIDATION";if(e instanceof InferenceError){const d=safeValidationDiagnostic(e);reason=d?.reason??null;field=d?.field??null;}}}
    }else{
     code=x&&codes.includes(x.code as typeof codes[number])?x.code as typeof codes[number]:"UNAVAILABLE";
     const d=x?.diagnostic as {reason?:unknown;field?:unknown}|undefined;
     if(code==="VALIDATION"&&d&&validationReasons.includes(d.reason as typeof validationReasons[number])&&validationFields.includes(d.field as typeof validationFields[number])){reason=d.reason as typeof validationReasons[number];field=d.field as typeof validationFields[number];}
    }
   }
   r.run={...r.run,id:runId,execution,model}; // Unknown model stays null on failed/unconfirmed requests.
   r.latencyMs=elapsed;r.httpStatus=status===200&&!code?200:status!==null&&status>=400&&status<=599?status:null;
   if(code){r.output=null;r.outcome="FAILURE";r.failure={code,reason,field};r.structural=code==="VALIDATION"?"REJECTED":"UNAVAILABLE";blocked=true;}
   else{r.outcome="SUCCESS";r.structural="VALID";}
   r=reseal(r);results.push(r);
   attempts.push({caseId:id,turn:prefix.turn,clientElapsedMs:elapsed,httpStatus:status,reportedLatencyMs:reportedLatency,reportedModel:model,requestedModel:"qwen3.5:9b",sourceKinds:prefix.manifest.sources.map(s=>({id:s.id,kind:s.kind})),inferenceExecution:bound?"REPORTED":"UNCONFIRMED",responseBound:bound,sourceKindsOrigin:"EXPECTED_MANIFEST",checks:{manifestExact:bound,sourceReferencesValid:r.outcome==="SUCCESS"?true:null,claimFactsNotPromoted:r.outcome==="SUCCESS"?true:null}});
   // Fail closed across cases for authorization, rate, environment and transport loss. No retries.
   if(code&&["SESSION","DENIED","LIMIT","INPUT","UNAVAILABLE","CANCELED"].includes(code))stopped=true;
  }
 }
 return {version:"advisory-evaluation-run-v1" as const,plan,execution,results,attempts,reviews:results.map(blankReview),reviewPacket:{version:"advisory-evaluation-packet-v1" as const,datasetDigest:dataset.datasetDigest,execution,items:results.map(result=>{const item=dataset.cases.find(c=>c.id===result.caseId)!;return {result,manifest:item.turns.find(t=>t.turn===result.turn)!.manifest,invariants:item.invariants,expectedBehavior:item.expectedBehavior,review:blankReview(result)};})},summary:{plannedCalls:plan.plannedCalls,attemptedRequests:attempts.length,reportedInferenceResults:attempts.filter(a=>a.inferenceExecution==="REPORTED").length,inferenceCallsActuallyExecuted:null,notRunDetails,success:results.filter(r=>r.outcome==="SUCCESS").length,failed:results.filter(r=>r.outcome==="FAILURE").length,notRun:results.filter(r=>r.outcome==="NOT_RUN").length,humanReviewRequired:results.filter(r=>r.outcome==="SUCCESS").map(r=>({caseId:r.caseId,turn:r.turn})),semanticGradesAvailable:false,issues:results.filter(r=>r.failure).map(r=>({caseId:r.caseId,turn:r.turn,...r.failure}))}};
}
// Existing route uses insertion-order JSON.stringify hashing; do not confuse it with 3A canonical binding.
import { createHash } from "node:crypto";
import type { Manifest } from "../ai-case-brief/contracts";
function digestWireManifest(manifest:Manifest){return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");}
export function compareResults(before:ResultRecord[],after:ResultRecord[]){
 const validate=(rows:ResultRecord[])=>{const keys=new Set<string>();return rows.map(r=>{const v=validateResult(r),key=v.caseId+":"+v.turn;if(keys.has(key))throw Error("DUPLICATE_RESULT");keys.add(key);return v;});};
 const a=validate(before),b=validate(after);
 return b.map(row=>{const old=a.find(x=>x.caseId===row.caseId&&x.turn===row.turn);return {caseId:row.caseId,turn:row.turn,comparable:!!old&&old.inputDigest===row.inputDigest,previous:old?.outcome??null,current:row.outcome,outputChanged:old?.output&&row.output?digest(old.output)!==digest(row.output):null,clientLatencyDeltaMs:old?.latencyMs!==null&&old?.latencyMs!==undefined&&row.latencyMs!==null?row.latencyMs-old.latencyMs:null,semanticRegression:"UNREVIEWED"};});
}
