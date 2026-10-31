import "server-only";
import {prototypeActor} from "./server";
import {visionProvider,geminiModel,type ProviderChoice} from "./provider";
import {runGeminiVision} from "./gemini";
import {runMockVision,blockedVisionExecution} from "./adapter";
import {visionModel,VisionAdapterError} from "./adapter-config";
import {executionKinds} from "./execution-contract";
import {readJsonObject} from "../api-response";
export const reviewScenarios=["INSUFFICIENT_EVIDENCE","NOT_COMPARABLE","POSSIBLE_DIFFERENCE","FAILURE"] as const;
function envFor(choice:ProviderChoice){return choice.provider==="GEMINI"?{...process.env,HUSTLEN_VISION_PROVIDER:"GEMINI",HUSTLEN_GEMINI_VISION_MODEL:choice.model}:{...process.env,HUSTLEN_VISION_PROVIDER:"OLLAMA",HUSTLEN_VISION_OLLAMA_MODEL:choice.config.model,HUSTLEN_VISION_MODEL_MANIFEST_DIGEST:choice.config.manifestDigest};}
const attempts=new Map<number,{at:number;n:number}>();
export async function reviewApi(request:Request){const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};try{
 const actor=await prototypeActor(),url=new URL(request.url);
 if(url.search||request.headers.get("host")!==new URL(actor.config.origin).host||request.headers.get("origin")!==actor.config.origin||request.headers.get("sec-fetch-site")==="cross-site"||request.headers.get("content-type")!=="application/json"||request.headers.get("x-hustlen-vision")!=="1")throw new VisionAdapterError("INPUT");
 const body=await readJsonObject(request);if(!body||Object.keys(body).sort().join()!=="mode,scenario"||!["MOCK","LIVE"].includes(String(body.mode))||!reviewScenarios.includes(body.scenario as typeof reviewScenarios[number]))throw new VisionAdapterError("INPUT");
 const now=Date.now();for(const [id,v]of attempts)if(now-v.at>=60000)attempts.delete(id);if(attempts.size>=1000&&!attempts.has(actor.user.id))throw new VisionAdapterError("LIMIT");const count=attempts.get(actor.user.id)??{at:now,n:0};count.n++;attempts.set(actor.user.id,count);if(count.n>12)throw new VisionAdapterError("LIMIT");
 const choice=visionProvider(),env=envFor(choice);
 if(body.mode==="LIVE"){
  if(choice.provider==="GEMINI")await runGeminiVision(["P1","R1"],request.signal,env);else await blockedVisionExecution(["P1","R1"],request.signal,env);
  throw new VisionAdapterError("EXECUTION_NOT_AUTHORIZED"); // No live result disclosure in this candidate.
 }
 if(process.env.HUSTLEN_VISION_SCHEMATIC_DEMO!=="mock-only")throw new VisionAdapterError("UNAVAILABLE");
 const kind=body.scenario==="FAILURE"?"INSUFFICIENT_EVIDENCE":String(body.scenario);if(!executionKinds.includes(kind as typeof executionKinds[number]))throw new VisionAdapterError("INPUT");
 const content=JSON.stringify({observations:[{kind,areaId:"body",refs:["P1","R1"],text:kind==="POSSIBLE_DIFFERENCE"?"Authored comparison-format test only; no actual item difference has been detected.":"Authored display test only: schematics cannot establish photographic item condition.",uncertainty:"No authorized photographs, inference or human visual finding supplied. Human review is required.",advisory:true}]});
 const result=choice.provider==="GEMINI"?await runGeminiVision(["P1","R1"],request.signal,env,async()=>body.scenario==="FAILURE"?"INVALID_AUTHORED_TEST_RESPONSE":JSON.stringify({modelVersion:geminiModel+"-AUTHORED-MOCK",candidates:[{finishReason:"STOP",content:{role:"model",parts:[{text:content}]}}]})):await runMockVision(["P1","R1"],request.signal,env,async()=>body.scenario==="FAILURE"?"INVALID_AUTHORED_TEST_RESPONSE":JSON.stringify({model:visionModel,done:true,message:{role:"assistant",content}}));
 const current=await prototypeActor();if(current.user.id!==actor.user.id||JSON.stringify(visionProvider())!==JSON.stringify(choice)||request.signal.aborted)throw new VisionAdapterError("CANCELED");
 return Response.json({state:kind==="NOT_COMPARABLE"?"NOT_COMPARABLE":kind==="INSUFFICIENT_EVIDENCE"?"INSUFFICIENT_EVIDENCE":"REVIEW_REQUIRED",selectedProvider:choice.provider,result},{headers});
 }catch(e){const code=e instanceof VisionAdapterError?e.code:"UNAVAILABLE";return Response.json({state:"FAILED",code},{status:code==="INPUT"?400:code==="LIMIT"?429:code==="CANCELED"?409:code==="EXECUTION_NOT_AUTHORIZED"?403:code==="UNAVAILABLE"?404:502,headers});}}
