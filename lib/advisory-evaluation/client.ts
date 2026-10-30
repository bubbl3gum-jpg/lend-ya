import { InferenceError } from "../local-inference/contracts";
import type { EvaluationClient } from "./runner";
const headers=(origin:string)=>({Origin:origin,"Content-Type":"application/json","X-Hustlen-Local-AI":"1"});
export function validateOrigin(origin:string){
 if(!/^http:\/\/localhost:[1-9][0-9]{0,4}$/.test(origin)||new URL(origin).port===""||Number(new URL(origin).port)>65535)throw Error("INVALID_OWNED_ORIGIN");return origin;
}
export async function boundedJson(response:Response){
 const reader=response.body?.getReader();if(!reader)throw Error("INVALID_APP_RESPONSE");
 let size=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();throw Error("APP_RESPONSE_LIMIT");}chunks.push(value);}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;}catch{throw Error("INVALID_APP_RESPONSE");}
}
/** Same guarded application probe/native login as the existing fixed evaluator. Never calls Ollama. */
export async function authenticatedClient(origin:string,email:string,password:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
 validateOrigin(origin);if(!email.endsWith("@fixture.test")||email.length>200||!password||password.length>1000)throw Error("SYNTHETIC_LOGIN_REQUIRED");
 const endpoint=origin+"/api/dev/support-companion/local";
 const request=async(url:string,init:RequestInit,outer:AbortSignal,ms:number)=>{
  const timer=AbortSignal.timeout(ms),combined=AbortSignal.any([outer,timer]);
  try{return await fetcher(url,{...init,redirect:"error",signal:combined});}catch{throw new InferenceError(outer.aborted?"CANCELED":timer.aborted?"TIMEOUT":"UNAVAILABLE");}
 };
 const probe=await request(endpoint,{method:"POST",headers:headers(origin),body:'{"scenario":"SYN-REVIEW-INJECTION:en"}'},signal,5000);
 // Production/invalid owned-runtime refusals are not a session challenge and must stop before login.
 if(probe.status!==401)throw Error("OWNED_RUNTIME_REQUIRED");await probe.body?.cancel();
 const login=await request(origin+"/api/auth/login",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({email,password})},signal,10000);
 const cookie=login.headers.get("set-cookie")?.match(/p2p_session=[^;]+/)?.[0];await login.body?.cancel();
 if(!login.ok||!cookie)throw Error("SYNTHETIC_LOGIN_FAILED");
 let closed=false;
 return {
  async send(payload,outer){
   if(closed)throw Error("CLIENT_CLOSED");
   const timer=AbortSignal.timeout(65000),combined=AbortSignal.any([outer,timer]);
   try{
    const response=await fetcher(endpoint,{method:"POST",headers:{...headers(origin),Cookie:cookie},body:JSON.stringify(payload),redirect:"error",signal:combined});
    let body:unknown;try{body=await boundedJson(response);}catch{if(combined.aborted)throw Error("ABORTED");body=null;}
    return {status:response.status,body};
   }catch{throw new InferenceError(outer.aborted?"CANCELED":timer.aborted?"TIMEOUT":"UNAVAILABLE");}
  },
  async close(){if(closed)return;closed=true;const response=await request(origin+"/api/auth/logout",{method:"POST",headers:{Origin:origin,Cookie:cookie}},new AbortController().signal,5000);await response.body?.cancel();if(!response.ok)throw Error("LOGOUT_FAILED");}
 } satisfies EvaluationClient&{close():Promise<void>};
}
export function rateWait(signal:AbortSignal,ms=11000){return new Promise<void>((resolve,reject)=>{
 if(signal.aborted){reject(Error("CANCELED"));return;}
 const finish=()=>{signal.removeEventListener("abort",cancel);resolve();};
 const timer=setTimeout(finish,ms),cancel=()=>{clearTimeout(timer);signal.removeEventListener("abort",cancel);reject(Error("CANCELED"));};signal.addEventListener("abort",cancel,{once:true});
});}
