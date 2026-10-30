"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale";
import { guidance, local } from "@/lib/assistant/guidance";
import { companionMessages } from "@/lib/assistant/messages";
import { issues, type Issue, type AssistantResult } from "@/lib/assistant/contracts";
import { LocalAiPlayground } from "@/components/local-ai-playground";
import { LocalAssistance } from "@/components/local-assistance";
export function SupportCompanion({localScenarios=[]}:{localScenarios?:{id:string,title:string}[]}){
 const {locale,setLocale}=useLocale(),t=companionMessages(locale);
 const [mode,setMode]=useState<"GUIDE"|"COPILOT">("GUIDE"),[issue,setIssue]=useState<Issue>("RETURN_UNVERIFIED"),[report,setReport]=useState(""),[ticketId,setTicket]=useState(""),[channelId,setChannel]=useState("");
 const [result,setResult]=useState<AssistantResult|null>(null),[draft,setDraft]=useState(""),[title,setTitle]=useState(""),[dirty,setDirty]=useState(false),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState("");
 const flight=useRef<AbortController|null>(null),sequence=useRef(0),pending=useRef(false);
 const invalidate=()=>{sequence.current++;flight.current?.abort();flight.current=null;pending.current=false;setBusy(false);setResult(null);setDraft("");setTitle("");setReviewed(false);setDirty(false);};
 useEffect(()=>()=>{sequence.current++;flight.current?.abort();},[]);
 async function generate(event:React.FormEvent){
  event.preventDefault();if(pending.current)return;
  if(dirty&&!confirm(t.discard))return;
  const id=++sequence.current,controller=new AbortController();flight.current?.abort();flight.current=controller;pending.current=true;setBusy(true);setFeedback("");setReviewed(false);setResult(null);setDraft("");setTitle("");setDirty(false);
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const r=await fetch("/api/dev/support-companion",{method:"POST",headers:{"Content-Type":"application/json","X-Hustlen-Companion":"1"},cache:"no-store",signal:controller.signal,body:JSON.stringify(mode==="GUIDE"?{mode,language:locale,issue,report}:{mode,language:locale,ticketId,channelId})});
   if(!r.ok)throw Error(r.status===401?"SESSION":"DENIED");
   const data=await r.json() as AssistantResult;if(sequence.current!==id||controller.signal.aborted)return;
   if(data.provenance!=="DETERMINISTIC_OFFLINE_NO_MODEL"||data.scope!=="CUSTOMER_SERVICE")throw Error("SOURCE");
   setResult(data);setDraft(data.draft);setTitle(data.draftTitle);
  }catch(e){if(sequence.current===id){setResult(null);setDraft("");setTitle("");setFeedback(controller.signal.aborted?t.loadingFail:e instanceof Error&&e.message==="SESSION"?t.session:t.error);}}
  finally{clearTimeout(timer);if(sequence.current===id){pending.current=false;setBusy(false);flight.current=null;}}
 }
 const inputClass="catalogue-input";
 return <main className="companion-page" id="companion-content">
 <Link href="/">{t.back}</Link><header className="companion-masthead"><p className="catalogue-kicker">{t.edition}</p><h1>{t.title}</h1><p>{localScenarios.length>0?(locale==="zh-TW"?"自有開發環境。可選的本機 AI 面板使用固定合成案例或明確標示的虛構互動情境；原有指引與受指派客服模式仍為離線預寫協助。未開放正式客服，也不會自動操作。":"Owned development only. The optional local AI panel uses fixed synthetic cases or clearly labelled fictional playground input; existing guide and assigned-support modes remain offline assistance. No production Support or automatic actions."):t.notice}</p></header>
 <label className="companion-language">Language / 語言<select value={locale} onChange={e=>setLocale(e.target.value)}><option value="en">English</option><option value="zh-TW">繁體中文</option></select></label>
 <nav aria-label={locale==="zh-TW"?"協助模式":"Assistance modes"} className="companion-modes">{(["GUIDE","COPILOT"] as const).map(m=><button key={m} type="button" aria-pressed={mode===m} onClick={()=>{if(mode!==m&&(!dirty||confirm(t.discard))){invalidate();setMode(m);setFeedback("");}}}>{m==="GUIDE"?t.guide:t.copilot}</button>)}</nav>
 {localScenarios.length>0&&<><LocalAssistance scenarios={localScenarios}/><LocalAiPlayground/></>}
 <div className="companion-columns"><section className="companion-section"><form onSubmit={generate}>
 {mode==="GUIDE"?<><label>{t.issue}<select className={inputClass} value={issue} onChange={e=>setIssue(e.target.value as Issue)}>{issues.map(id=><option key={id} value={id}>{local(guidance[id].label,locale)}</option>)}</select></label><label>{t.report}<textarea className={inputClass} value={report} maxLength={1200} rows={5} onChange={e=>setReport(e.target.value)} aria-describedby="report-help"/></label><p id="report-help">{t.reportHelp}</p><p>{t.noSource}</p></>:<><p>{t.modeNotice}</p><Link href="/dev/support-agent">{t.staffSetup}</Link><label>{t.ticket}<input className={inputClass} value={ticketId} onChange={e=>{invalidate();setTicket(e.target.value);}} required autoComplete="off"/></label><label>{t.channel}<input className={inputClass} value={channelId} onChange={e=>{invalidate();setChannel(e.target.value);}} required autoComplete="off"/></label></>}
 <div className="companion-actions"><button className="catalogue-button" type="submit" disabled={busy}>{busy?t.busy:t.generate}</button>{busy&&<button type="button" onClick={()=>{invalidate();setFeedback(t.loadingFail);}}>{t.cancel}</button>}</div>
 </form><p role="status" aria-live="polite">{feedback}</p></section>
 <section className="companion-section" aria-live="polite" aria-busy={busy}>
 {result&&<><p>{t.resultLanguage}: {result.language}</p><h2>{t.summary}</h2><p>{result.summary}</p>{result.caseStatus&&<p>{t.state}: {result.caseStatus}</p>}<h3>{t.guidance}</h3><p>{result.guidance}</p><h3>{t.questions}</h3><ul>{result.questions.map(q=><li key={q}>{q}</li>)}</ul>
 {result.conflicts.length>0&&<><h3>{t.conflict}</h3>{result.conflicts.map((c,i)=><p key={i}>{c.text} ({c.refs.join(", ")})</p>)}</>}
 <h3>{t.draft}</h3><label>{t.titleLabel}<input className={inputClass} value={title} maxLength={120} onChange={e=>{setTitle(e.target.value);setDirty(true);setReviewed(false);}}/></label><label htmlFor="companion-draft">{t.draft}</label><textarea id="companion-draft" className={inputClass} value={draft} maxLength={4000} rows={7} onChange={e=>{setDraft(e.target.value);setDirty(true);setReviewed(false);}}/>
 <label className="companion-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{t.review}</label><button type="button" disabled={!reviewed||busy} onClick={async()=>{try{await navigator.clipboard.writeText(title+"\n\n"+draft);setFeedback(t.copied);}catch{setFeedback(t.copyError);}}}>{t.copy}</button>
 <p>{t.reviewRequired}</p>{mode==="GUIDE"&&<Link href="/dev/support-requester">{t.handoff}</Link>}<h3>{t.unknown}</h3><ul>{result.uncertainty.map(u=><li key={u}>{u}</li>)}</ul>{result.truncated&&<p>{t.more}</p>}
 <h3>{t.source}</h3>{result.sources.length===0&&<p>{t.empty}</p>}<ol className="companion-sources">{result.sources.map(s=><li key={s.id}><strong>{s.id}</strong><p>{s.kind}{s.authorKind?" · "+(s.authorKind==="REQUESTER"?t.requester:t.testStaff):""} · {s.kind==="APPLICATION_EVENT"?t.event:s.originalLanguage?t.original:t.procedure}</p>{s.at&&<time dateTime={s.at}>{new Intl.DateTimeFormat(result.language,{timeZone:"Asia/Taipei",dateStyle:"medium",timeStyle:"short"}).format(new Date(s.at))} (Asia/Taipei)</time>}<p>{s.text}</p></li>)}</ol></>}
 </section></div>
 </main>;
}
