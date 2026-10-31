import "server-only";
import {cookies} from "next/headers";
import {createHash} from "node:crypto";
import {prisma} from "../prisma";
import {companionActor} from "../assistant/server";
import {localConfig} from "../local-inference/gateway";
import {readJsonObject} from "../api-response";
import {hash} from "./contracts";
import {SnapshotStore,type Scope,type Canonical} from "./store";
import {translate} from "./engine";
import {TranslationError,type TranslationFailure} from "./types";
export function translationEnabled(){return process.env.NODE_ENV==="development"&&process.env.HUSTLEN_TRANSLATION_SIDECAR==="mock-only";}
const globals=globalThis as typeof globalThis&{__hustlenTranslationSnapshotsV1?:SnapshotStore};
const store=()=>globals.__hustlenTranslationSnapshotsV1??(globals.__hustlenTranslationSnapshotsV1=new SnapshotStore());
export async function translationActor(){
 if(!translationEnabled())throw new TranslationError("UNAVAILABLE");
 try{localConfig();}catch{throw new TranslationError("UNAVAILABLE");}
 const a=await companionActor(),token=(await cookies()).get("p2p_session")?.value;if(!token)throw new TranslationError("SESSION");
 const tokenHash=createHash("sha256").update(token).digest("hex");
 const s=await prisma.authSession.findUnique({where:{tokenHash},select:{id:true,userId:true,createdAt:true,expiresAt:true}});
 if(!s||s.userId!==a.user.id||s.expiresAt.getTime()<=Date.now())throw new TranslationError("SESSION");
 return {config:a.config,scope:{actorId:a.user.id,sessionBinding:hash({id:s.id,born:s.createdAt.toISOString(),tokenHash,runId:a.config.runId}),expiresAt:s.expiresAt.getTime()} satisfies Scope};
}
/** Optional extension: never turn a valid original inference into a failed response. */
export async function captureTranslation(canonical:Canonical,initial:Scope){const current=await translationActor();if(current.scope.sessionBinding!==initial.sessionBinding)throw new TranslationError("SESSION");return store().capture(current.scope,canonical);}
const attempts=new Map<string,{at:number;n:number}>();
const headers={"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff"};
export async function translationApi(request:Request){try{
 const a=await translationActor(),url=new URL(request.url);
 if(url.search||url.origin!==a.config.origin||request.headers.get("host")!==new URL(a.config.origin).host||request.headers.get("origin")!==a.config.origin||request.headers.get("sec-fetch-site")==="cross-site"||request.headers.get("x-hustlen-translation")!=="1"||request.headers.get("content-type")!=="application/json")throw new TranslationError("DENIED");
 const now=Date.now();for(const [key,v]of attempts)if(now-v.at>=60000)attempts.delete(key);
 if(attempts.size>=1000&&!attempts.has(a.scope.sessionBinding))throw new TranslationError("LIMIT");const n=attempts.get(a.scope.sessionBinding)??{at:now,n:0};n.n++;attempts.set(a.scope.sessionBinding,n);if(n.n>20)throw new TranslationError("LIMIT");
 if(request.signal.aborted)throw new TranslationError("CANCELED");const result=translate(store(),a.scope,await readJsonObject(request));
 const current=await translationActor();if(current.scope.sessionBinding!==a.scope.sessionBinding)throw new TranslationError("SESSION");if(request.signal.aborted)throw new TranslationError("CANCELED");
 return Response.json(result,{headers});
 }catch(e){const code=e instanceof TranslationError?e.code:e instanceof Error&&"status" in e&&e.status===401?"SESSION":e instanceof Error&&"status" in e&&e.status===403?"DENIED":"UNAVAILABLE";
 const status=code==="SESSION"?401:code==="DENIED"?403:code==="INPUT"?400:code==="STALE_SNAPSHOT"?410:code==="LIMIT"?429:code==="CANCELED"?409:code==="MOCK_UNAVAILABLE"||code==="MIXED_SOURCE_UNSUPPORTED"?422:code==="REJECTED_OUTPUT"||code==="PROTECTED_VALUE_MISMATCH"?502:404;
 return Response.json({version:"advisory-translation-v1",state:code==="CANCELED"?"CANCELED":code==="UNAVAILABLE"||code==="MOCK_UNAVAILABLE"?"UNAVAILABLE":code==="SESSION"||code==="DENIED"||code==="INPUT"||code==="STALE_SNAPSHOT"||code==="MIXED_SOURCE_UNSUPPORTED"?"REJECTED":"FAILED",code,originalPreserved:true} satisfies TranslationFailure,{status,headers});}}
