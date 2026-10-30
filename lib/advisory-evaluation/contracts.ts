import { qualityDimensions, QUALITY_RUBRIC_VERSION } from "../ai-case-brief/quality";
import { validateAdvisory, validationFields, validationReasons, type Advisory } from "../local-inference/contracts";
import { DATASET_VERSION, digest, evaluationDataset } from "./dataset";
export const RESULT_VERSION="advisory-evaluation-result-v1";
export const REVIEW_VERSION="advisory-human-review-v1";
const failureCodes=["INPUT","UNAVAILABLE","LIMIT","TIMEOUT","CANCELED","VALIDATION","SESSION","DENIED"] as const;
export const heuristicCodes=["PERSPECTIVE_REVIEW","CHRONOLOGY_REVIEW","IMAGE_CLAIM_REVIEW","UNCERTAINTY_REVIEW","ACTIONABILITY_REVIEW","PRIVACY_REVIEW","AUTHORITY_REVIEW","LANGUAGE_REVIEW","CONTINUITY_REVIEW"] as const;
type Dimension=typeof qualityDimensions[number];
export type ResultRecord={
 version:typeof RESULT_VERSION;datasetVersion:typeof DATASET_VERSION;datasetDigest:string;caseId:string;caseDigest:string;turn:number;inputDigest:string;
 run:{id:string;execution:"NOT_RUN"|"MOCK"|"LOCAL_OLLAMA_INFERENCE";model:string|null;modelDigest:string|null;promptDigest:string|null;schemaDigest:string|null};
 outcome:"NOT_RUN"|"SUCCESS"|"FAILURE";httpStatus:number|null;latencyMs:number|null;output:Advisory|null;
 structural:"NOT_RUN"|"VALID"|"REJECTED"|"UNAVAILABLE";
 failure:{code:typeof failureCodes[number];reason:typeof validationReasons[number]|null;field:typeof validationFields[number]|null}|null;
 heuristics:{code:typeof heuristicCodes[number];field:typeof validationFields[number];refs:string[]}[];
 resultDigest:string;
};
export type ReviewRecord={version:typeof REVIEW_VERSION;rubric:typeof QUALITY_RUBRIC_VERSION;resultDigest:string;
 reviewer:string|null;reviewedAt:string|null;
 dimensions:Record<Dimension,{state:"UNREVIEWED"|"NOT_APPLICABLE"|"SCORED";score:0|1|2|null;note:string}>;
 observations:string;unsupportedClaims:string;translationProblems:string;privacyConcerns:string;
};
function invalid():never{throw Error("INVALID_ADVISORY_EVALUATION");}
function exact(value:unknown,keys:string[]):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))invalid();
 return value as Record<string,unknown>;
}
function note(value:unknown,required=false){if(typeof value!=="string"||value.length>2000||/[\u0000-\u001f\u007f]/.test(value)||(required&&!value.trim()))invalid();}
const isHash=(x:unknown)=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
/** Self-reported execution metadata is not proof of model execution, human identity or release approval. */
export function validateResult(raw:unknown):ResultRecord{
 const r=exact(raw,["version","datasetVersion","datasetDigest","caseId","caseDigest","turn","inputDigest","run","outcome","httpStatus","latencyMs","output","structural","failure","heuristics","resultDigest"]);
 const dataset=evaluationDataset(),item=dataset.cases.find(c=>c.id===r.caseId);
 if(r.version!==RESULT_VERSION||r.datasetVersion!==DATASET_VERSION||r.datasetDigest!==dataset.datasetDigest||!item||r.caseDigest!==item.caseDigest||!Number.isInteger(r.turn))invalid();
 const turn=item.turns.find(t=>t.turn===r.turn);if(!turn||r.inputDigest!==turn.inputDigest)invalid();
 const run=exact(r.run,["id","execution","model","modelDigest","promptDigest","schemaDigest"]);
 if(typeof run.id!=="string"||!/^RUN-[A-Za-z0-9-]{1,64}$/.test(run.id)||!["NOT_RUN","MOCK","LOCAL_OLLAMA_INFERENCE"].includes(run.execution as string))invalid();
 if(run.model!==null&&(typeof run.model!=="string"||run.model.length>80||!/^[-a-zA-Z0-9:._]+$/.test(run.model)))invalid();
 for(const key of ["modelDigest","promptDigest","schemaDigest"])if(run[key]!==null&&!isHash(run[key]))invalid();
 if(r.latencyMs!==null&&(!Number.isSafeInteger(r.latencyMs)||(r.latencyMs as number)<0))invalid();
 if(!Array.isArray(r.heuristics)||r.heuristics.length>24)invalid();
 for(const value of r.heuristics){const h=exact(value,["code","field","refs"]);
  if(!heuristicCodes.includes(h.code as typeof heuristicCodes[number])||!validationFields.includes(h.field as typeof validationFields[number])||!Array.isArray(h.refs)||h.refs.length>12||new Set(h.refs).size!==h.refs.length||h.refs.some(id=>!turn.manifest.sources.some(s=>s.id===id)))invalid();
 }
 if(r.outcome==="NOT_RUN"){
  if(run.execution!=="NOT_RUN"||[run.model,run.modelDigest,run.promptDigest,run.schemaDigest,r.httpStatus,r.latencyMs,r.output,r.failure].some(x=>x!==null)||r.structural!=="NOT_RUN"||r.heuristics.length)invalid();
 }else{
  if(run.execution==="NOT_RUN"||!run.model)invalid();
  if(run.execution==="LOCAL_OLLAMA_INFERENCE"&&run.model!=="qwen3.5:9b"&&run.model!=="qwen3.5:4b")invalid();
  if(r.outcome==="SUCCESS"){
   if(r.httpStatus!==200||r.structural!=="VALID"||r.failure!==null||r.latencyMs===null)invalid();
   try{validateAdvisory(r.output,turn.manifest);}catch{invalid();}
  }else if(r.outcome==="FAILURE"){
   if(r.output!==null||r.heuristics.length||!(r.httpStatus===null||(Number.isInteger(r.httpStatus)&&(r.httpStatus as number)>=400&&(r.httpStatus as number)<=599)))invalid();
   const f=exact(r.failure,["code","reason","field"]);
   if(!failureCodes.includes(f.code as typeof failureCodes[number])||r.structural!==(f.code==="VALIDATION"?"REJECTED":"UNAVAILABLE"))invalid();
   if(f.reason!==null||f.field!==null){if(f.code!=="VALIDATION"||!validationReasons.includes(f.reason as typeof validationReasons[number])||!validationFields.includes(f.field as typeof validationFields[number]))invalid();}
  }else invalid();
 }
 const {resultDigest,...snapshot}=r;if(!isHash(resultDigest)||resultDigest!==digest(snapshot))invalid();
 return structuredClone(r) as ResultRecord;
}
export function unrunResult(caseId:string,turn=1):ResultRecord{
 const dataset=evaluationDataset(),item=dataset.cases.find(c=>c.id===caseId),prefix=item?.turns.find(t=>t.turn===turn);if(!item||!prefix)invalid();
 const snapshot={version:RESULT_VERSION,datasetVersion:DATASET_VERSION,datasetDigest:dataset.datasetDigest,caseId,caseDigest:item.caseDigest,turn,inputDigest:prefix.inputDigest,
 run:{id:"RUN-unexecuted",execution:"NOT_RUN" as const,model:null,modelDigest:null,promptDigest:null,schemaDigest:null},outcome:"NOT_RUN" as const,httpStatus:null,latencyMs:null,output:null,structural:"NOT_RUN" as const,failure:null,heuristics:[]};
 return validateResult({...snapshot,resultDigest:digest(snapshot)});
}
export function blankReview(result:ResultRecord):ReviewRecord{
 const r=validateResult(result);
 return {version:REVIEW_VERSION,rubric:QUALITY_RUBRIC_VERSION,resultDigest:r.resultDigest,reviewer:null,reviewedAt:null,
 dimensions:Object.fromEntries(qualityDimensions.map(d=>[d,{state:"UNREVIEWED",score:null,note:""}])) as ReviewRecord["dimensions"],observations:"",unsupportedClaims:"",translationProblems:"",privacyConcerns:""};
}
export function validateHumanReview(raw:unknown,result:ResultRecord,now=Date.now()):ReviewRecord{
 const record=validateResult(result),r=exact(raw,["version","rubric","resultDigest","reviewer","reviewedAt","dimensions","observations","unsupportedClaims","translationProblems","privacyConcerns"]);
 if(r.version!==REVIEW_VERSION||r.rubric!==QUALITY_RUBRIC_VERSION||r.resultDigest!==record.resultDigest)invalid();
 const dimensions=exact(r.dimensions,[...qualityDimensions]);let judged=false;
 for(const id of qualityDimensions){const d=exact(dimensions[id],["state","score","note"]);
  if(d.state==="UNREVIEWED"){if(d.score!==null||d.note!=="")invalid();}
  else if(d.state==="SCORED"){if(record.outcome!=="SUCCESS"||![0,1,2].includes(d.score as number))invalid();note(d.note,true);judged=true;}
  else if(d.state==="NOT_APPLICABLE"){if(record.outcome!=="SUCCESS"||d.score!==null)invalid();note(d.note,true);judged=true;}
  else invalid();
 }
 for(const key of ["observations","unsupportedClaims","translationProblems","privacyConcerns"])note(r[key]);
 if(judged){if(typeof r.reviewer!=="string"||!/^REVIEWER-[A-Z0-9-]{1,32}$/.test(r.reviewer)||typeof r.reviewedAt!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(r.reviewedAt)||!Number.isFinite(Date.parse(r.reviewedAt))||new Date(r.reviewedAt).toISOString().replace(".000Z","Z")!==r.reviewedAt||Date.parse(r.reviewedAt)>now)invalid();}
 else if(r.reviewer!==null||r.reviewedAt!==null)invalid();
 return structuredClone(r) as ReviewRecord;
}
