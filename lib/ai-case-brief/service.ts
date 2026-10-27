import { BRIEF_VERSION, BriefError, type Manifest, type BriefAdapter, type BriefResult, type BriefOutput } from "./contracts";
import { validateManifest } from "./manifest";
import { validateOutput } from "./validation";
/** No networking, tools, credentials, fixture lookup or private-record access. */
export class OfflineBriefAdapter implements BriefAdapter {
  readonly id="deterministic-offline-v1"; readonly model="NONE";
  async generate(m: Readonly<Manifest>, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) throw new BriefError("CANCELED");
    const zh=m.language==="zh-TW";
    const safe=m.sources.filter(s=>!/[<>]/.test(s.excerpt) && !/ignore|忽略/i.test(s.excerpt));
    const caution=zh?"內容僅為來源陳述，不是已驗證結論；請人工比對。":"Source statements are not verified conclusions; compare them manually.";
    const summary= safe.length ? safe.slice(0,3).map(s=>({text:s.excerpt,refs:[s.id],basis:"SOURCE_EXCERPT" as const})) : [{text:zh?"來源包含不可信指令，並未授予操作權限。":"The source contains untrusted instructions and grants no operational authority.",refs:[m.sources[0].id],basis:"INTERPRETATION" as const}];
    return { version:BRIEF_VERSION,caseId:m.caseId,language:m.language,summary,observations:summary,timeline:m.sources.map(s=>s.id),category:m.caseId==="SYN-INJECTION"?"UNTRUSTED_CONTENT":m.caseId==="SYN-OWNER-A"?"CONDITION":m.caseId==="SYN-BORROWER-A"?"SCHEDULING":"CLARIFICATION",missing:[...m.missing],conflicts:[...m.conflicts],questions:[zh?"請釐清缺少或互相矛盾的資訊，勿推定責任或交接完成。":"Please clarify missing or conflicting information; do not infer responsibility or completed handoff."],draft:zh?"謝謝你的說明。請補充需要釐清的時間與資訊；目前無法據此確認責任、交接或雙方同意。":"Thank you for the information. Please clarify the timing and missing details; this alone cannot establish responsibility, handoff or mutual agreement.",uncertainty:[caution,...(m.truncated?[zh?"紀錄已截短；勿猜測省略內容。":"History was truncated; do not guess omitted context."]:[])],requiresHumanReview:true } satisfies BriefOutput;
  }
}
export async function generateBrief(manifest: Manifest, adapter: BriefAdapter=new OfflineBriefAdapter(), options: { signal?: AbortSignal; timeoutMs?: number }={}): Promise<BriefResult> {
  validateManifest(manifest);
  const timeout=options.timeoutMs??1500;
  if (!Number.isInteger(timeout)||timeout<1||timeout>3000) throw new BriefError("INPUT");
  // This shipped composition cannot select a live model even when credentials exist.
  if (adapter.model!=="NONE") throw new BriefError("UNAVAILABLE");
  if (options.signal?.aborted) throw new BriefError("CANCELED");
  const controller=new AbortController(); let timer: ReturnType<typeof setTimeout>|undefined;
  let cancel:()=>void=()=>{};
  const stopped=new Promise<never>((_,reject)=>{ cancel=()=>{controller.abort();reject(new BriefError("CANCELED"));}; options.signal?.addEventListener("abort",cancel,{once:true}); timer=setTimeout(()=>{controller.abort();reject(new BriefError("TIMEOUT"));},timeout); });
  try {
    const snapshot=structuredClone(manifest);
    const raw=await Promise.race([Promise.resolve().then(()=>adapter.generate(structuredClone(snapshot),controller.signal)),stopped]);
    if (options.signal?.aborted) throw new BriefError("CANCELED");
    return {provenance:"SIMULATED_NO_MODEL",adapter:adapter.id,model:"NONE",output:validateOutput(raw,snapshot)};
  } catch(e) { throw e instanceof BriefError?e:new BriefError("UNAVAILABLE"); }
  finally { if(timer)clearTimeout(timer); options.signal?.removeEventListener("abort",cancel); controller.abort(); }
}
