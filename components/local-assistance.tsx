"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale";
import type { Advisory } from "@/lib/local-inference/contracts";
import type { Manifest } from "@/lib/ai-case-brief/contracts";
type Result={output:Advisory;manifest:Manifest;model:string;latencyMs:number;promptTokens:number|null;outputTokens:number|null;provenance:"LOCAL_OLLAMA_INFERENCE"};
export function LocalAssistance({scenarios}:{scenarios:{id:string,title:string}[]}){
 const {locale}=useLocale(),zh=locale==="zh-TW";
 const [scenario,setScenario]=useState(scenarios[0]?.id??""),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[draft,setDraft]=useState({en:"","zh-TW":""});
 const flight=useRef<AbortController|null>(null),seq=useRef(0),pending=useRef(false);
 const clear=()=>{seq.current++;flight.current?.abort();flight.current=null;pending.current=false;setBusy(false);setResult(null);setDraft({en:"","zh-TW":""});};
 useEffect(()=>()=>{seq.current++;flight.current?.abort();},[]);
 async function generate(){
  if(pending.current)return;
  if((draft.en||draft["zh-TW"])&&!confirm(zh?"捨棄目前草稿並重新產生？":"Discard current drafts and regenerate?"))return;
  clear();const n=seq.current,c=new AbortController();flight.current=c;pending.current=true;setBusy(true);setError("");
  try{const response=await fetch("/api/dev/support-companion/local",{method:"POST",headers:{"Content-Type":"application/json","X-Hustlen-Local-AI":"1"},body:JSON.stringify({scenario}),signal:c.signal,cache:"no-store"});
   if(!response.ok){const data=await response.json();throw Error(typeof data.code==="string"?data.code:"UNAVAILABLE");}
   const data=await response.json() as Result;if(n!==seq.current||c.signal.aborted)return;
   if(data.provenance!=="LOCAL_OLLAMA_INFERENCE")throw Error("VALIDATION");setResult(data);setDraft({...data.output.drafts});
  }catch(e){if(n===seq.current&&!c.signal.aborted)setError(e instanceof Error&&["INPUT","UNAVAILABLE","LIMIT","TIMEOUT","CANCELED","VALIDATION","SESSION","DENIED"].includes(e.message)?e.message:"UNAVAILABLE");}
  finally{if(n===seq.current){flight.current=null;pending.current=false;setBusy(false);}}
 }
 const labels=zh?{knownFacts:"合成情境事實（非實際驗證）",participantClaims:"參與者主張",uncertainties:"不確定與缺少資訊",nextSteps:"建議下一步",requiresAgreement:"需要明確同意",humanReview:"需要人工審查"}:{knownFacts:"Synthetic context facts (not real-world verification)",participantClaims:"Participant claims",uncertainties:"Uncertainties",nextSteps:"Suggested next steps",requiresAgreement:"Requires explicit agreement",humanReview:"Human review"};
 return <section className="companion-section" aria-labelledby="local-ai-title">
 <p className="catalogue-kicker">{zh?"本機 AI・合成資料試驗":"Local AI · synthetic-only pilot"}</p><h2 id="local-ai-title">{zh?"客服建議檢閱":"Customer Service advice review"}</h2>
 <p>{zh?"僅使用固定合成案例。AI 產生的建議可能有誤；結構與引用通過驗證不代表事實正確。與下方離線客服模式分開，絕不讀取真實案件。":"Fixed synthetic cases only. AI-generated advice can be wrong; valid structure and citations do not prove accuracy. Separate from the offline modes below; no real case retrieval."}</p>
 <label>{zh?"合成案例與輸出語言":"Synthetic scenario and output language"}<select aria-label={zh?"合成案例與輸出語言":"Synthetic scenario and output language"} className="catalogue-input" value={scenario} disabled={busy} onChange={e=>{if((!draft.en&&!draft["zh-TW"])||confirm(zh?"捨棄目前草稿？":"Discard current drafts?")){clear();setError("");setScenario(e.target.value);}}}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</select></label>
 <button type="button" className="catalogue-button" disabled={busy} onClick={generate}>{busy?(zh?"本機模型處理中…":"Local model working…"):(zh?"使用 Ollama 產生建議":"Generate with Ollama")}</button>
 {busy&&<button type="button" onClick={()=>{clear();setError("CANCELED");}}>{zh?"取消":"Cancel"}</button>}
 <p role="status" aria-live="polite">{error&&(zh?"未取得可用結果（模型可能未啟動、忙碌、逾時或輸出無效）；可取消或稍後重試。代碼：":"No usable result (model unavailable, busy, timed out or invalid output). Cancel or retry later. Code: ")+error}</p>
 {result&&<div aria-live="polite"><p>{result.model} · {result.latencyMs} ms · {zh?"回報的輸入／輸出 token":"Reported input/output tokens"}: {result.promptTokens??"unavailable"}/{result.outputTokens??"unavailable"}</p>
 {(Object.keys(labels) as (keyof typeof labels)[]).map(key=><section key={key}><h3>{labels[key]}</h3><ul>{result.output[key].map((v,i)=><li key={i}>{typeof v==="string"?v:<>{v.text} <small>[{v.refs.join(", ")}]</small></>}</li>)}</ul></section>)}
 <h3>{zh?"對照原始合成來源":"Compare original synthetic sources"}</h3>{result.manifest.sources.map(s=><blockquote key={s.id}><strong>{s.id} · {s.kind}</strong><p>{s.excerpt}</p></blockquote>)}
 <h3>{zh?"可編輯草稿・不會傳送":"Editable drafts · never sent"}</h3>{(["en","zh-TW"] as const).map(lang=><label key={lang}>{lang}<textarea aria-label={lang==="en"?"English local AI draft":"繁體中文本機 AI 草稿"} className="catalogue-input" rows={5} maxLength={4000} value={draft[lang]} onChange={e=>setDraft({...draft,[lang]:e.target.value})}/></label>)}
 <button type="button" onClick={()=>{clear();setError("");}}>{zh?"拒絕並清除建議":"Reject and clear advice"}</button>
 <p>{zh?"草稿只留在此頁面；沒有送出、接受、結案、扣款或自動執行功能。尚未經人工品質審查。":"Drafts stay on this page. No send, accept, close, charge or automatic action. Not human quality-reviewed."}</p></div>}
 </section>;
}
