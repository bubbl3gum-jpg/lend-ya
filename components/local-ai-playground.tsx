"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale";
import type { Advisory } from "@/lib/local-inference/contracts";
import type { Manifest } from "@/lib/ai-case-brief/contracts";
type Reply={output:Advisory;manifest:Manifest;latencyMs:number;provenance:"LOCAL_OLLAMA_INFERENCE"};
type Turn={text:string;reply?:Reply;error?:string};
export function LocalAiPlayground(){
 const {locale}=useLocale(),zh=locale==="zh-TW";
 const [side,setSide]=useState<"OWNER"|"BORROWER">("OWNER"),[input,setInput]=useState(""),[turns,setTurns]=useState<Turn[]>([]),[busy,setBusy]=useState(false),[elapsed,setElapsed]=useState(0);
 const sequence=useRef(0),flight=useRef<AbortController|null>(null),pending=useRef(false),entry=useRef<HTMLTextAreaElement|null>(null);
 useEffect(()=>()=>{sequence.current++;flight.current?.abort();},[]);
 useEffect(()=>{if(!busy)return;const start=performance.now(),timer=setInterval(()=>setElapsed(Math.round((performance.now()-start)/1000)),1000);return()=>clearInterval(timer);},[busy]);
 function reset(){sequence.current++;flight.current?.abort();flight.current=null;pending.current=false;setBusy(false);setTurns([]);setInput("");setElapsed(0);entry.current?.focus();}
 async function send(event:React.FormEvent){
  event.preventDefault();if(pending.current||!input.trim()||turns.length>=6)return;
  const next=[...turns,{text:input}],id=++sequence.current,controller=new AbortController();
  flight.current=controller;pending.current=true;setTurns(next);setInput("");setBusy(true);setElapsed(0);
  try{
   const r=await fetch("/api/dev/support-companion/local",{method:"POST",headers:{"Content-Type":"application/json","X-Hustlen-Local-AI":"1"},cache:"no-store",signal:controller.signal,body:JSON.stringify({mode:"PLAYGROUND",side,language:locale,messages:next.map(t=>t.text)})});
   const data=await r.json();if(id!==sequence.current||controller.signal.aborted)return;
   if(!r.ok){const allowed=["INPUT","UNAVAILABLE","LIMIT","TIMEOUT","CANCELED","VALIDATION","SESSION","DENIED"];throw Error(allowed.includes(data.code)?data.code:"UNAVAILABLE");}
   if(data.provenance!=="LOCAL_OLLAMA_INFERENCE")throw Error("VALIDATION");
   setTurns([...next.slice(0,-1),{...next[next.length-1],reply:data as Reply}]);
  }catch(e){if(id===sequence.current&&!controller.signal.aborted)setTurns([...next.slice(0,-1),{...next[next.length-1],error:e instanceof Error&&["INPUT","UNAVAILABLE","LIMIT","TIMEOUT","CANCELED","VALIDATION","SESSION","DENIED"].includes(e.message)?e.message:"UNAVAILABLE"}]);}
  finally{if(id===sequence.current){pending.current=false;flight.current=null;setBusy(false);}}
 }
 return <section className="companion-section" aria-labelledby="playground-title">
 <p className="catalogue-kicker">{zh?"本機限定・虛構對話":"Local only · fictional conversations"}</p><h2 id="playground-title">{zh?"互動試用區":"Interactive Playground"}</h2>
 <p id="playground-notice">{zh?"僅限自有開發環境。請勿輸入真實客戶資料、姓名、聯絡方式、證件或任何敏感資訊。所有輸入都是未驗證的虛構主張。AI 不會退款、傳送訊息、結案或變更保管狀態。":"Owned development only. Do not enter real customer data, names, contact details, identity documents or sensitive information. All input is fictional, unverified claims. AI cannot refund, send messages, close cases or change custody."}</p>
 <p>{zh?"最多 6 則使用者訊息，每則 1,000 字元。對話僅保留在此頁記憶體；重新整理即清除。後續提問會附上先前的使用者訊息，AI 回覆不會作為證據重新送出；若要詢問先前建議，請具體描述。":"Up to 6 user turns, 1,000 characters each. Kept only in page memory; reload clears it. Follow-ups include earlier user turns, not AI replies as evidence. Describe the specific advice when asking about a previous reply."}</p>
 <label>{zh?"扮演角色":"Acting as"}<select className="catalogue-input" aria-label={zh?"扮演角色":"Acting as"} value={side} disabled={turns.length>0||busy} onChange={e=>setSide(e.target.value as "OWNER"|"BORROWER")}><option value="OWNER">{zh?"物主":"Owner"}</option><option value="BORROWER">{zh?"借用者":"Borrower"}</option></select></label>
 <button type="button" onClick={reset}>{zh?"新對話":"New conversation"}</button>
 <div aria-label={zh?"虛構對話":"Fictional conversation"} aria-busy={busy}>
 {turns.map((turn,index)=><article key={index} className="companion-section"><h3>{zh?"你":"You"} · U{index+1}</h3><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{turn.text}</p>
 {turn.error&&<p role="alert">{zh?"未取得有效回覆。失敗代碼：":"No valid response. Failure code: "}{turn.error}</p>}
 {turn.reply&&<><h3>{zh?"AI 建議・非判決":"AI advice · not a decision"}</h3><p>{turn.reply.provenance} · {turn.reply.latencyMs} ms</p><p style={{whiteSpace:"pre-wrap"}}>{turn.reply.output.drafts[turn.reply.manifest.language]}</p>
 <details><summary>{zh?"建議與來源歸屬":"Advice and source attribution"}</summary>
 {(["knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview"] as const).map(key=><section key={key}><h4>{key}</h4><ul>{turn.reply!.output[key].map((v,i)=><li key={i}>{typeof v==="string"?v:<>{v.text} [{v.refs.join(", ")}]</>}</li>)}</ul></section>)}
 {turn.reply.manifest.sources.map(source=><blockquote key={source.id}><strong>{source.id} · {source.kind}</strong><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{source.excerpt}</p></blockquote>)}
 </details></>}
 </article>)}
 </div>
 <form onSubmit={send}><label htmlFor="playground-message">{zh?"虛構情境或後續問題":"Fictional situation or follow-up"}</label><textarea id="playground-message" ref={entry} className="catalogue-input" rows={4} maxLength={1000} aria-describedby="playground-notice" value={input} disabled={busy||turns.length>=6} onChange={e=>setInput(e.target.value)}/>
 <button className="catalogue-button heritage-press" type="submit" disabled={busy||!input.trim()||turns.length>=6}>{busy?(zh?"本機 Qwen 處理中…":"Local Qwen working…"):(zh?"送出虛構問題":"Send fictional question")}</button>
 <p role="status" aria-live="polite">{busy?`${elapsed}s`:turns.length>=6?(zh?"已達訊息上限，請開始新對話。":"Turn limit reached. Start a new conversation."):zh?"AI 可能出錯。引用有效不代表內容正確。":"AI can be wrong. Valid citations do not establish factual accuracy."}</p>
 </form></section>;
}
