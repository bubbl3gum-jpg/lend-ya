"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeritageSurface } from "@/components/heritage/experience";
import { useLocale } from "@/components/i18n/locale";
import { formatTime, type Locale } from "@/lib/i18n/core";
import type { Appearance } from "@/lib/heritage/appearance";
import type { Manifest, BriefResult } from "@/lib/ai-case-brief/contracts";
import type { MessageId } from "@/lib/i18n/catalogues";
type Props={initialLocale:Locale;initialTheme:Appearance;initialManifest:Manifest;directory:{id:string;title:Record<Locale,string>}[]};
export function SyntheticCaseBrief(props:Props){return <HeritageSurface initialLocale={props.initialLocale} initialTheme={props.initialTheme}><Notebook {...props}/></HeritageSurface>;}
function Notebook({initialManifest,directory}:Props){
 const {locale,t}=useLocale();const [manifest,setManifest]=useState(initialManifest),[selected,setSelected]=useState(initialManifest.caseId),[result,setResult]=useState<BriefResult|null>(null),[condition,setCondition]=useState("NORMAL");
 const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"),[code,setCode]=useState(""),[draft,setDraft]=useState(""),[draftLocale,setDraftLocale]=useState<Locale>(locale),[dirty,setDirty]=useState(false),[ack,setAck]=useState(false),[reviewed,setReviewed]=useState(false);
 const controller=useRef<AbortController|null>(null),sequence=useRef(0),feedback=useRef<HTMLParagraphElement>(null);
 useEffect(()=>()=>{sequence.current++;controller.current?.abort();},[]);
 useEffect(()=>{if(state==="ready"||state==="error")feedback.current?.focus();},[state]);
 useEffect(()=>{if(reviewed)feedback.current?.focus();},[reviewed]);
 function allowed(){return !dirty||window.confirm(t("ai.discard"));}
 function stop(){sequence.current++;controller.current?.abort();controller.current=null;setAck(false);setReviewed(false);setCode("CANCELED");setState("error");}
 async function request(next=selected,generate=true){
  if(!allowed())return;
  controller.current?.abort();const control=new AbortController();controller.current=control;const seq=++sequence.current;
  setState("loading");setAck(false);setReviewed(false);setCode("");
  const changing=next!==manifest.caseId;
  if(changing){setSelected(next);setResult(null);setDraft("");setDirty(false);}
  const deadline=setTimeout(()=>{if(seq===sequence.current){sequence.current++;control.abort();controller.current=null;setCode("TIMEOUT");setState("error");}},4000);
  try{
   const response=await fetch(generate?"/api/admin/ai-case-brief":`/api/admin/ai-case-brief?caseId=${encodeURIComponent(next)}&language=${locale}`,generate?{method:"POST",headers:{"Content-Type":"application/json","X-Hustlen-Synthetic-Brief":"1"},body:JSON.stringify({caseId:next,language:locale,condition}),signal:control.signal}:{signal:control.signal});
   const body=await response.json();if(seq!==sequence.current)return;
   if(!response.ok){setCode(response.status===401?"SESSION":typeof body.code==="string"?body.code:"UNAVAILABLE");setState("error");return;}
   setManifest(body.manifest);
   if(generate){setResult(body.result);setDraft(body.result.output.draft);setDraftLocale(body.result.output.language);setDirty(false);setState("ready");}else setState("idle");
  }catch{if(seq!==sequence.current)return;setCode(control.signal.aborted?"CANCELED":"UNAVAILABLE");setState("error");}
  finally{clearTimeout(deadline);if(seq===sequence.current)controller.current=null;}
 }
 const errors:Record<string,MessageId>={INPUT:"ai.invalid",LANGUAGE:"ai.languageError",VALIDATION:"ai.invalid",REFERENCES:"ai.referencesError",UNAVAILABLE:"ai.providerError",TIMEOUT:"ai.timeoutError",LIMIT:"ai.limitError",CANCELED:"ai.canceledError",SESSION:"ai.sessionError",DENIED:"ai.sessionError",ORIGIN:"ai.invalid"};
 const out=result?.output;
 const citations=(refs:string[])=>refs.map(ref=><a key={ref} href={`#fact-${manifest.caseId}-${ref}`} aria-label={t("ai.cite",{id:ref})} onClick={e=>{e.preventDefault();document.getElementById(`fact-${manifest.caseId}-${ref}`)?.focus();}}>[{ref}]</a>);
 return <article className="ai-notebook" data-testid="synthetic-notebook">
  <header className="ai-masthead"><p className="catalogue-eyebrow">{t("ai.kicker")}</p><h1>{t("ai.title")}</h1><p className="ai-deck">{t("ai.intro")}</p><p className="ai-boundary">{t("ai.simulated")}</p><Link href="/admin/workbench">← {t("ai.back")}</Link></header>
  <div className="ai-scenario"><label htmlFor="synthetic-scenario">{t("ai.select")}</label><select id="synthetic-scenario" value={selected} aria-describedby="scenario-note" onChange={e=>void request(e.target.value,false)}>{directory.map(c=><option key={c.id} value={c.id}>{c.id} · {c.title[locale]}</option>)}</select><p id="scenario-note">{t("ai.switchNote")}</p></div>
  <div className="ai-ledger-layout">
   <section className="ai-source-ledger" aria-labelledby="source-heading"><h2 id="source-heading">{t("ai.context")}</h2>{selected===manifest.caseId ? <><p>{manifest.caseId} · {t(manifest.side==="OWNER"?"ai.owner":"ai.borrower")}</p><h3>{manifest.title}</h3><p>{t("ai.sourceLanguage")} {manifest.language}</p><ol className="ai-facts">{manifest.sources.map(s=><li key={s.id} id={`fact-${manifest.caseId}-${s.id}`} tabIndex={-1} data-source-id={s.id}><span className="catalogue-eyebrow">{s.id} / {t(s.kind==="CONTEXT"?"ai.contextKind":"ai.claimKind")}</span><p>{s.excerpt}</p><time dateTime={s.at}>{formatTime(locale,s.at)}</time></li>)}</ol><p className="ai-privacy">{t("ai.isolation")}</p></> : <p>{t("ai.sourceUnavailable")}</p>}</section>
   <section className="ai-working-brief" aria-labelledby="brief-heading" aria-busy={state==="loading"}>
    <h2 id="brief-heading">{t("ai.pipeline")}</h2>
    <label htmlFor="offline-condition">{t("ai.condition")}</label><select id="offline-condition" value={condition} onChange={e=>setCondition(e.target.value)} disabled={state==="loading"}>{["NORMAL","UNAVAILABLE","TIMEOUT","INVALID","REFERENCES","LIMIT"].map(c=><option key={c} value={c}>{t(({NORMAL:"ai.normal",UNAVAILABLE:"ai.providerError",TIMEOUT:"ai.timeoutError",INVALID:"ai.invalid",REFERENCES:"ai.referencesError",LIMIT:"ai.limitError"} as Record<string,MessageId>)[c])}</option>)}</select>
    <div className="ai-actions"><button type="button" disabled={state==="loading"} onClick={()=>void request()}>{t("ai.generate")}</button>{state==="loading"&&<button type="button" onClick={stop}>{t("ai.cancel")}</button>}</div>
    <p ref={feedback} tabIndex={-1} role="status" className="ai-feedback">{t(state==="error"?(errors[code]??"ai.providerError"):state==="loading"?"ai.pending":reviewed?"ai.reviewed":state==="ready"?"ai.simulated":"ai.idle")}</p>
    {code==="SESSION"&&<Link href="/login">{t("password.signin")}</Link>}
    {out&&<div data-testid="scripted-output"><p className="ai-boundary">{t(state!=="ready"?"ai.lastValid":"ai.humanCheck")}</p>
     <h3>{t("ai.summary")}</h3><ul className="ai-summary">{out.summary.map((s,i)=><li key={i}><p>{s.text}</p><span>{t(s.basis==="SOURCE_EXCERPT"?"ai.excerpt":"ai.interpretation")}</span><div className="ai-citations">{citations(s.refs)}</div></li>)}</ul>
     <h3>{t("ai.observations")}</h3>{out.observations.map((s,i)=><p key={i}>{s.text} {citations(s.refs)} · {t("ai.humanCheck")}</p>)}
     <h3>{t("ai.timeline")}</h3><div className="ai-citations">{citations(out.timeline)}</div>
     <dl className="ai-observations"><div><dt>{t("ai.category")}</dt><dd>{t(({"SCHEDULING":"ai.catScheduling","CONDITION":"ai.catCondition","CLARIFICATION":"ai.catClarification","UNTRUSTED_CONTENT":"ai.catUntrusted"} as Record<string,MessageId>)[out.category])}</dd></div>{[["ai.missing",out.missing],["ai.conflicts",out.conflicts],["ai.question",out.questions],["ai.caution",out.uncertainty]].map(([label,items])=><div key={label as string}><dt>{t(label as MessageId)}</dt><dd>{(items as string[]).length?(items as string[]).join(" · "):t("ai.noneEstablished")}</dd></div>)}</dl>
     <div className="ai-draft"><label htmlFor="synthetic-draft">{t("ai.draft")}</label><p id="draft-note">{t("ai.draftNote",{language:t(draftLocale==="en"?"ai.english":"ai.chinese")})}</p><textarea id="synthetic-draft" lang={draftLocale} aria-describedby="draft-note review-note" maxLength={4000} rows={6} value={draft} onChange={e=>{setDraft(e.target.value);setDirty(true);setAck(false);setReviewed(false);}}/>
     <label className="ai-ack"><input type="checkbox" disabled={state!=="ready"} checked={ack} onChange={e=>{setAck(e.target.checked);setReviewed(false);}}/>{t("ai.ack")}</label><button type="button" disabled={state!=="ready"||!ack||!draft.trim()||reviewed} onClick={()=>setReviewed(true)}>{t("ai.review")}</button><p id="review-note">{t("ai.reviewHelp")}</p></div>
    </div>}
   </section>
  </div><footer className="ai-footnote">{t("ai.limits")}</footer>
 </article>;
}
