import "server-only";
import { logOperationalError } from "../operational-error";
import { companionActor } from "../assistant/server";
import { readJsonObject } from "../api-response";
import { localTask } from "./catalogue";
import { InferenceError, safeValidationDiagnostic } from "./contracts";
import { localConfig, ollamaGateway } from "./gateway";
export function localEnabled(){try{localConfig();return true;}catch{return false;}}
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
const attempts=new Map<number,{at:number,n:number}>();
export async function localInferenceApi(request:Request){
 let authorizedDiagnostic=false;
 try {
  const config=localConfig(); // Refuse production/flag/endpoint/model BEFORE auth, DB or HTTP.
  const actor=await companionActor();
  const url=new URL(request.url);
  if(url.search || url.origin!==actor.config.origin || request.headers.get("host")!==new URL(actor.config.origin).host || request.headers.get("origin")!==actor.config.origin || request.headers.get("sec-fetch-site")==="cross-site" || request.headers.get("x-hustlen-local-ai")!=="1")return reply({code:"DENIED"},403);
  if(request.headers.get("content-type")!=="application/json")throw new InferenceError("INPUT");
  let task;try{task=localTask(await readJsonObject(request));}catch{throw new InferenceError("INPUT");}
  const now=Date.now();for(const [id,a]of attempts)if(now-a.at>=60000)attempts.delete(id);
  if(attempts.size>=1000&&!attempts.has(actor.user.id))throw new InferenceError("LIMIT");
  const counter=attempts.get(actor.user.id)??{at:now,n:0};counter.n++;attempts.set(actor.user.id,counter);if(counter.n>6)throw new InferenceError("LIMIT");
  authorizedDiagnostic=process.env.HUSTLEN_LOCAL_AI_DIAGNOSTICS==="owned-test-categories-only";
  const result=await ollamaGateway(config).generate(task.manifest,request.signal);
  const current=await companionActor();if(current.user.id!==actor.user.id)return reply({code:"SESSION"},401);
  if(request.signal.aborted)throw new InferenceError("CANCELED");
  return reply({...result,scenario:task.id,inputDigest:task.digest,manifest:task.manifest});
 }catch(e){
  if(e instanceof InferenceError)return reply({code:e.code,...(authorizedDiagnostic && safeValidationDiagnostic(e)?{diagnostic:safeValidationDiagnostic(e)}:{})},e.code==="INPUT"?400:e.code==="LIMIT"?429:e.code==="CANCELED"?409:e.code==="TIMEOUT"?504:e.code==="VALIDATION"?502:503);
  const status=e instanceof Error && "status" in e && (e.status===401||e.status===403)?e.status:503;
  if(status===503)logOperationalError("local_inference_boundary",e);
  return reply({code:status===401?"SESSION":status===403?"DENIED":"UNAVAILABLE"},status);
 }
}
