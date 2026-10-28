import "server-only";
import { getCurrentUser } from "../auth";
import { ownedSupportRuntime, supportCandidateApi } from "../support-staff-candidate/bridge";
import { readJsonObject } from "../api-response";
import { assistantInput, type AssistantResult } from "./contracts";
import { composeGuide, composeCopilot, type CaseSnapshot } from "./compose";
import { logOperationalError } from "../operational-error";
export function companionEnabled(){return process.env.NODE_ENV==="development"&&process.env.HUSTLEN_SUPPORT_ASSISTANT_CANDIDATE==="offline-only";}
export async function companionActor(){
 if(!companionEnabled())throw new CompanionDenied(404);
 const config=await ownedSupportRuntime();
 const user=await getCurrentUser();
 if(!user)throw new CompanionDenied(401);
 if(user.accountStatus!=="ACTIVE")throw new CompanionDenied(403);
 return {user,config};
}
class CompanionDenied extends Error {constructor(public status:number){super("Companion unavailable");}}
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
const attempts=new Map<number,{at:number;n:number}>();
export async function companionApi(request:Request){
 try{
  if(!companionEnabled())return reply({code:"UNAVAILABLE"},404);
  let actor;
  try{actor=await companionActor();}catch(e){if(e instanceof CompanionDenied)throw e;throw new CompanionDenied(404);}
  if(new URL(request.url).search||new URL(request.url).origin!==actor.config.origin||request.headers.get("host")!==new URL(actor.config.origin).host||request.headers.get("origin")!==actor.config.origin||request.headers.get("sec-fetch-site")==="cross-site"||request.headers.get("x-hustlen-companion")!=="1")throw new CompanionDenied(403);
  if(request.headers.get("content-type")!=="application/json")return reply({code:"INPUT"},400);
  let input;
  try{input=assistantInput(await readJsonObject(request));}catch{return reply({code:"INPUT"},400);}
  const now=Date.now();for(const [id,c]of attempts)if(now-c.at>=60000)attempts.delete(id);
  if(attempts.size>=1000&&!attempts.has(actor.user.id))return reply({code:"LIMIT"},429);
  const counter=attempts.get(actor.user.id)??{at:now,n:0};counter.n=Math.min(counter.n+1,31);attempts.set(actor.user.id,counter);if(counter.n>30)return reply({code:"LIMIT"},429);
  // Existing scoped API performs its own actor/session/passkey/resource/assignment/audit checks on EACH read.
  const read=async(body:object)=>{
   if(request.signal.aborted)throw new CompanionDenied(409);
   const scoped=new Request(new URL("/api/dev/support-agent",actor.config.origin),{method:"POST",headers:request.headers,body:JSON.stringify(body),signal:request.signal});
   const response=await supportCandidateApi(scoped,"staff");
   if(!response.ok)throw new CompanionDenied(response.status);
   return response.json();
  };
  let result:AssistantResult;
  if(input.mode==="GUIDE")result=composeGuide(input);
  else{
   const ticket=await read({action:"ticket",ticketId:input.ticketId}) as CaseSnapshot["ticket"];
   const events=await read({action:"events",ticketId:input.ticketId}) as CaseSnapshot["events"];
   const messages=await read({action:"read",ticketId:input.ticketId,channelId:input.channelId,after:0}) as CaseSnapshot["messages"];
   result=composeCopilot({ticket,events,messages},input.language);
   // Recheck exact channel grant, assignment, assurance and session after composition, before release.
   await read({action:"read",ticketId:input.ticketId,channelId:input.channelId,after:0});
  }
  if(request.signal.aborted)throw new CompanionDenied(409);
  const current=await companionActor();if(current.user.id!==actor.user.id)throw new CompanionDenied(401);
  return reply(result);
 }catch(e){if(e instanceof CompanionDenied)return reply({code:e.status===401?"SESSION":e.status===404?"UNAVAILABLE":"DENIED"},e.status);logOperationalError("support_companion",e);return reply({code:"UNAVAILABLE"},503);}
}
