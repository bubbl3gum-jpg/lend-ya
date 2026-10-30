import {digest,validateResult,type Fixture,type PrototypeObservation} from "./contracts";
import {visionModel,type VisionConfig} from "./adapter-config";
export const executionVersion="vision-execution-v1";
export const executionKinds=["VISIBLE_OBSERVATION","POSSIBLE_DIFFERENCE","INSUFFICIENT_EVIDENCE","NOT_COMPARABLE","MISSING_OR_OBSCURED_VIEW","HUMAN_REVIEW_REQUIRED","ACCESSORY_UNCERTAIN"] as const;
export type ExecutionObservation=Omit<PrototypeObservation,"kind">&{kind:typeof executionKinds[number]};
export type VisionExecution={version:typeof executionVersion;provenance:"MOCK_TEST_OUTPUT"|"LOCAL_OLLAMA_VISION_INFERENCE";model:{tag:typeof visionModel;manifestDigest:string;identity:"MOCK_NOT_ATTESTED"|"PRE_POST_DIGEST_CHECKED_NOT_ATTESTED"};fixtureDigest:string;inputImages:{id:string;stage:string;parentSha256:string;derivativeSha256:string}[];promptDigest:string;latencyMs:number;humanReview:"REQUIRED";observations:ExecutionObservation[]};
export function validateExecutionObservations(raw:unknown,f:Fixture,refs:readonly string[]):ExecutionObservation[]{
 if(!Array.isArray(raw)||raw.length>12)throw Error("OBSERVATION");
 for(const o of raw){
  if(!o||typeof o!=="object"||!executionKinds.includes(o.kind)||!Array.isArray(o.refs)||o.refs.some((id:unknown)=>typeof id!=="string"||!refs.includes(id)))throw Error("OBSERVATION");
  // Reuse unchanged M7A independent bounds, strict fields, areas, pairing and uncertainty.
  // Accessory uncertainty is not a finding of absence; retain mandatory human review.
  validateResult({version:"vision-observation-v1",fixtureDigest:digest(f),provenance:"MOCK_TEST_OUTPUT",humanReview:"REQUIRED",observations:[{...o,kind:o.kind==="ACCESSORY_UNCERTAIN"?"POSSIBLE_DIFFERENCE":o.kind}]},f);
 }
 return structuredClone(raw) as ExecutionObservation[];
}
export function validateExecution(raw:unknown,f:Fixture,c:VisionConfig,expectedProvenance:VisionExecution["provenance"]):VisionExecution{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("EXECUTION");const x=raw as VisionExecution;
 if(Object.keys(x).sort().join()!=="fixtureDigest,humanReview,inputImages,latencyMs,model,observations,promptDigest,provenance,version"||x.version!==executionVersion||x.provenance!==expectedProvenance||x.fixtureDigest!==digest(f)||x.humanReview!=="REQUIRED"||!Number.isSafeInteger(x.latencyMs)||x.latencyMs<0||!(/^[a-f0-9]{64}$/.test(x.promptDigest))||!x.model||Object.keys(x.model).sort().join()!=="identity,manifestDigest,tag"||x.model.tag!==c.model||x.model.manifestDigest!==c.manifestDigest||x.model.identity!==(expectedProvenance==="MOCK_TEST_OUTPUT"?"MOCK_NOT_ATTESTED":"PRE_POST_DIGEST_CHECKED_NOT_ATTESTED"))throw Error("EXECUTION");
 if(!Array.isArray(x.inputImages)||!x.inputImages.length||x.inputImages.length>4||new Set(x.inputImages.map(i=>i.id)).size!==x.inputImages.length)throw Error("EXECUTION");
 for(const i of x.inputImages){const original=f.images.find(p=>p.id===i.id);if(!original||Object.keys(i).sort().join()!=="derivativeSha256,id,parentSha256,stage"||i.stage!==original.stage||i.parentSha256!==original.parent.sha256||i.derivativeSha256!==original.derivative.sha256)throw Error("EXECUTION");}
 validateExecutionObservations(x.observations,f,x.inputImages.map(i=>i.id));return structuredClone(x);
}
