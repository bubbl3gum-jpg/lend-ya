import {request} from "node:https";
import {prepareFixtureVision,visionInstructions,visionResponseSchema} from "./adapter";
import {visionLimits,VisionAdapterError} from "./adapter-config";
import {acquireVisionSlot} from "./slot";
import {digest,fixtureDigest} from "./contracts";
import {validateExecutionObservations,type ExecutionObservation} from "./execution-contract";
import {visionProvider,geminiModel} from "./provider";
// Owner-provisioned credentials alone never authorize photograph export or execution.
const hostedExecutionApproved=false;
export type HostedVisionExecution={version:"vision-hosted-execution-v1";provider:"GEMINI";provenance:"MOCK_TEST_OUTPUT"|"GEMINI_VISION_INFERENCE";model:{requestedId:typeof geminiModel;reportedVersion:string;identity:"MOCK_NOT_ATTESTED"|"PROVIDER_REPORTED_NOT_WEIGHT_ATTESTED"};fixtureDigest:string;inputImages:{id:string;stage:string;parentSha256:string;derivativeSha256:string}[];promptDigest:string;latencyMs:number;humanReview:"REQUIRED";observations:ExecutionObservation[]};
export type MockGeminiTransport=(body:string,signal:AbortSignal)=>Promise<string>;
/** Fixed HTTPS endpoint/header authentication; no URL inputs, redirects, proxy routing or file API. */
async function hostedTransport(body:string,signal:AbortSignal,env:Record<string,string|undefined>):Promise<string>{
 if(!hostedExecutionApproved)throw new VisionAdapterError("EXECUTION_NOT_AUTHORIZED");
 const key=env.HUSTLEN_GEMINI_API_KEY;if(!key||key.length<20||key.length>256||/[^\x21-\x7e]/.test(key))throw new VisionAdapterError("UNAVAILABLE");
 return new Promise((resolve,reject)=>{const req=request({hostname:"generativelanguage.googleapis.com",port:443,path:`/v1beta/models/${geminiModel}:generateContent`,method:"POST",signal,headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body),"x-goog-api-key":key}},res=>{
  if(res.statusCode!==200){reject(new VisionAdapterError("TRANSPORT"));res.destroy();req.destroy();return;}let size=0;const chunks:Buffer[]=[];
  res.on("data",(b:Buffer)=>{size+=b.length;if(size>visionLimits.responseBytes){reject(new VisionAdapterError("RESPONSE_SIZE"));res.destroy();req.destroy();}else chunks.push(b);});res.on("error",()=>reject(new VisionAdapterError("TRANSPORT")));res.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));
 });req.on("error",()=>reject(new VisionAdapterError(signal.aborted?"CANCELED":"TRANSPORT")));req.end(body);});
}
export async function runGeminiVision(refs:readonly string[],signal:AbortSignal,env:Record<string,string|undefined>=process.env,mock?:MockGeminiTransport,mockTimeoutMs:number=visionLimits.timeoutMs):Promise<HostedVisionExecution>{
 const choice=visionProvider(env);if(choice.provider!=="GEMINI")throw new VisionAdapterError("MODEL_IDENTITY");if(signal.aborted)throw new VisionAdapterError("CANCELED");if(!mock&&!hostedExecutionApproved)throw new VisionAdapterError("EXECUTION_NOT_AUTHORIZED");
 const release=acquireVisionSlot(),started=performance.now(),controller=new AbortController();let timedOut=false,pending:Promise<string>|undefined,settled=false;
 const abort=()=>controller.abort();signal.addEventListener("abort",abort,{once:true});let cancel!:(e:VisionAdapterError)=>void;const canceled=new Promise<never>((_,reject)=>{cancel=reject;});void canceled.catch(()=>{});
 const onAbort=()=>cancel(new VisionAdapterError(timedOut?"TIMEOUT":"CANCELED"));controller.signal.addEventListener("abort",onAbort,{once:true});const timer=setTimeout(()=>{timedOut=true;controller.abort();},mock?Math.max(1,Math.min(mockTimeoutMs,visionLimits.timeoutMs)):visionLimits.timeoutMs);
 try{
  const {f,selected,images}=await prepareFixtureVision(refs);if(controller.signal.aborted)throw new VisionAdapterError(timedOut?"TIMEOUT":"CANCELED");
  const context={fixtureVersion:f.version,fixtureDigest,category:f.category,checklistId:f.checklistId,checklistVersion:f.checklistVersion,images:selected,pairs:f.pairs.filter(p=>refs.includes(p.pickupId)&&refs.includes(p.returnId))};
  const body=JSON.stringify({systemInstruction:{parts:[{text:visionInstructions}]},contents:[{role:"user",parts:[{text:JSON.stringify(context)},...selected.flatMap((image,i)=>[{text:`Image reference ${image.id}; stage ${image.stage}; area ${image.areaId}`},{inlineData:{mimeType:"image/png",data:images[i]}}])]}],generationConfig:{temperature:0,maxOutputTokens:visionLimits.output,responseMimeType:"application/json",responseJsonSchema:visionResponseSchema(selected.map(i=>i.id),[...new Set(selected.map(i=>i.areaId))])}});
  if(Buffer.byteLength(body)>visionLimits.requestBytes)throw new VisionAdapterError("INPUT");pending=mock?mock(body,controller.signal):hostedTransport(body,controller.signal,env);void pending.then(()=>{settled=true;},()=>{settled=true;});
  const response=await Promise.race([pending,canceled]);if(controller.signal.aborted)throw new VisionAdapterError(timedOut?"TIMEOUT":"CANCELED");if(typeof response!=="string"||Buffer.byteLength(response)>visionLimits.responseBytes)throw new VisionAdapterError("RESPONSE_SIZE");
  let raw;try{raw=JSON.parse(response);}catch{throw new VisionAdapterError("PROVIDER_JSON");}
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||!Array.isArray(raw.candidates)||raw.candidates.length!==1||raw.candidates[0]?.finishReason!=="STOP")throw new VisionAdapterError("PROVIDER_ENVELOPE");
  if(typeof raw.modelVersion!=="string"||raw.modelVersion.length>128||/(?:^|-)tts(?:-|$)/i.test(raw.modelVersion)||!/^[A-Za-z0-9._-]+$/.test(raw.modelVersion)||!(raw.modelVersion===choice.model||raw.modelVersion.startsWith(choice.model+"-")))throw new VisionAdapterError("MODEL_IDENTITY");
  const parts=raw.candidates[0].content?.parts;if(raw.candidates[0].content?.role!=="model"||!Array.isArray(parts)||parts.length!==1||Object.keys(parts[0]??{}).join()!=="text"||typeof parts[0].text!=="string")throw new VisionAdapterError("PROVIDER_ENVELOPE");
  let output;try{output=JSON.parse(parts[0].text);}catch{throw new VisionAdapterError("CONTENT_JSON");}if(!output||Object.keys(output).join()!=="observations")throw new VisionAdapterError("OBSERVATION");
  let observations;try{observations=validateExecutionObservations(output.observations,f,selected.map(i=>i.id));}catch{throw new VisionAdapterError("OBSERVATION");}
  return {version:"vision-hosted-execution-v1",provider:"GEMINI",provenance:mock?"MOCK_TEST_OUTPUT":"GEMINI_VISION_INFERENCE",model:{requestedId:choice.model,reportedVersion:raw.modelVersion,identity:mock?"MOCK_NOT_ATTESTED":"PROVIDER_REPORTED_NOT_WEIGHT_ATTESTED"},fixtureDigest,inputImages:selected.map(i=>({id:i.id,stage:i.stage,parentSha256:i.parent.sha256,derivativeSha256:i.derivative.sha256})),promptDigest:digest({instructions:visionInstructions,context}),latencyMs:Math.round(performance.now()-started),humanReview:"REQUIRED",observations};
 }catch(e){const safe=e instanceof VisionAdapterError?e:new VisionAdapterError("UNAVAILABLE");safe.latencyMs=Math.round(performance.now()-started);throw safe;}
 finally{clearTimeout(timer);signal.removeEventListener("abort",abort);controller.signal.removeEventListener("abort",onAbort);if(pending&&!settled)void pending.then(release,release);else release();}
}
