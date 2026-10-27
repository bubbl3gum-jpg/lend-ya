import { getCurrentUser } from "@/lib/auth";
import { syntheticBriefEnabled } from "@/lib/ai-case-brief/config";
import { buildManifest } from "@/lib/ai-case-brief/manifest";
import { BriefError, type BriefAdapter } from "@/lib/ai-case-brief/contracts";
import { generateBrief, OfflineBriefAdapter } from "@/lib/ai-case-brief/service";
import { readJsonObject } from "@/lib/api-response";
import { logOperationalError } from "@/lib/operational-error";
export const dynamic="force-dynamic";
const attempts=new Map<number,{at:number;n:number}>();
function reply(body:unknown,status=200) { return Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}}); }
async function actor() {
  if(!syntheticBriefEnabled())return reply({code:"UNAVAILABLE"},404);
  const user=await getCurrentUser(); if(!user)return reply({code:"SESSION"},401);
  if(user.role!=="ADMIN"||user.accountStatus!=="ACTIVE")return reply({code:"DENIED"},403);
  return user;
}
function failure(e:unknown) { if(e instanceof BriefError)return reply({code:e.code},e.code==="LIMIT"?429:e.code==="UNAVAILABLE"?503:e.code==="TIMEOUT"?504:422);logOperationalError("synthetic_brief",e);return reply({code:"UNAVAILABLE"},503); }
export async function GET(request:Request) {
  try { const a=await actor();if(a instanceof Response)return a;
    const q=new URL(request.url).searchParams;
    if([...q.keys()].some(k=>!["caseId","language"].includes(k))||q.getAll("caseId").length!==1||q.getAll("language").length!==1)throw new BriefError("INPUT");
    return reply({manifest:buildManifest(q.get("caseId"),q.get("language"))});
  }catch(e){return failure(e);}
}
export async function POST(request:Request) {
  try { const a=await actor();if(a instanceof Response)return a;
    const origin=process.env.HUSTLEN_AI_BRIEF_ORIGIN;
    if(!origin||new URL(origin).hostname!=="localhost"||new URL(origin).origin!==origin||new URL(request.url).origin!==origin||request.headers.get("origin")!==origin||request.headers.get("x-hustlen-synthetic-brief")!=="1"||request.headers.get("sec-fetch-site")==="cross-site")return reply({code:"ORIGIN"},403);
    if(new URL(request.url).search||request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new BriefError("INPUT");
    const body=await readJsonObject(request);
    if(!body||Object.keys(body).sort().join()!==["caseId","language","condition"].sort().join()||!["NORMAL","UNAVAILABLE","TIMEOUT","INVALID","REFERENCES","LIMIT"].includes(body.condition as string))throw new BriefError("INPUT");
    const now=Date.now();for(const [id,x]of attempts)if(now-x.at>=60000)attempts.delete(id);
    const counter=attempts.get(a.id)??{at:now,n:0};if(attempts.size>=1000&&!attempts.has(a.id))throw new BriefError("LIMIT");counter.n=Math.min(counter.n+1,41);attempts.set(a.id,counter);if(counter.n>40)throw new BriefError("LIMIT");
    const manifest=buildManifest(body.caseId,body.language);
    const offline=new OfflineBriefAdapter();
    const adapter:BriefAdapter={id:offline.id,model:"NONE",async generate(m,signal){
      if(body.condition==="UNAVAILABLE")throw new BriefError("UNAVAILABLE");
      if(body.condition==="LIMIT")throw new BriefError("LIMIT");
      if(body.condition==="TIMEOUT")return new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(new BriefError("TIMEOUT")),{once:true}));
      if(body.condition==="INVALID")return {};
      const out=await offline.generate(m,signal);
      if(body.condition==="REFERENCES")return {...(out as object),timeline:["FOREIGN-PRIVATE-SOURCE"]};
      return out;
    }};
    const result=await generateBrief(manifest,adapter,{signal:request.signal});
    // Re-resolve current session before release; still only synthetic data, no live-case authority.
    const current=await actor();if(current instanceof Response)return current;if(current.id!==a.id)return reply({code:"SESSION"},401);
    return reply({manifest,result});
  }catch(e){return failure(e);}
}
