"use client";
import {useEffect,useId,useRef,useState} from "react";
import {useLocale} from "@/components/i18n/locale";
import {translationCodes,type SnapshotDescriptor,type TranslationArtifact,type TranslationLocale} from "@/lib/translation-sidecar/types";
export function TranslationSidecar({snapshot}:{snapshot:SnapshotDescriptor|null}){
 const {locale}=useLocale(),zh=locale==="zh-TW",id=useId();
 const [target,setTarget]=useState<TranslationLocale>(snapshot?.sourceLocale==="en"?"zh-TW":"en"),[path,setPath]=useState(snapshot?`drafts.${snapshot.sourceLocale}`:""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<TranslationArtifact|null>(null);
 const flight=useRef<AbortController|null>(null),seq=useRef(0),pending=useRef(false),retry=useRef<{binding:string;key:string}|null>(null);
 useEffect(()=>()=>{seq.current++;flight.current?.abort();},[]);
 function clear(){seq.current++;flight.current?.abort();pending.current=false;setBusy(false);setError("");setResult(null);retry.current=null;}
 async function translate(){if(!snapshot||pending.current)return;const request=++seq.current,c=new AbortController();flight.current=c;pending.current=true;setBusy(true);setError("");setResult(null);
 try{const binding=JSON.stringify([snapshot.canonicalDigest,target,path]);if(retry.current?.binding!==binding)retry.current={binding,key:crypto.randomUUID()};
 const payload={version:"advisory-translation-request-v1",responseRef:snapshot.responseRef,canonicalDigest:snapshot.canonicalDigest,targetLocale:target,fieldPaths:[path],requestId:retry.current.key};
 const r=await fetch("/api/dev/support-companion/translation",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","X-Hustlen-Translation":"1"},signal:c.signal,body:JSON.stringify(payload)}),data=await r.json();if(request!==seq.current||c.signal.aborted)return;
 if(!r.ok)throw Error(translationCodes.includes(data.code)?data.code:"UNAVAILABLE");
 if(data.version!=="advisory-translation-v1"||data.provenance!=="MOCK_TEST_OUTPUT"||data.responseRef!==snapshot.responseRef||data.canonicalDigest!==snapshot.canonicalDigest||data.targetLocale!==target||data.requestId!==payload.requestId||!Array.isArray(data.fields)||data.fields.length!==1||data.fields[0].path!==path)throw Error("REJECTED_OUTPUT");setResult(data);
 }catch(e){if(request===seq.current&&!c.signal.aborted)setError(e instanceof Error&&translationCodes.includes(e.message as typeof translationCodes[number])?e.message:"UNAVAILABLE");}
 finally{if(request===seq.current){pending.current=false;setBusy(false);flight.current=null;}}}
 return <section className="companion-section" aria-label={zh?"模擬翻譯附加檢視":"Mock translation sidecar"}>
 <h4>{zh?"可選模擬翻譯":"Optional mock translation"}</h4><p>{zh?"僅限已編寫的測試譯文，並非翻譯服務或語言品質驗收。原始回覆保持不變；不翻譯或覆寫案件摘要、使用者修改或客服提交內容。":"Authored mock translations only; not a translation service or language-quality acceptance. Original response stays unchanged. Case summaries, user edits and Support submissions are not translated or overwritten."}</p>
 {!snapshot?<p role="status">{zh?"翻譯無法使用，原始回覆仍可閱讀。":"Translation unavailable; original response remains available."}</p>:<><p>{zh?"已驗證回覆僅暫存在伺服器記憶體，最多五分鐘並綁定目前登入；重啟或到期後請重新產生回覆。":"Validated reply held in server memory for up to five minutes, bound to this session. Restart/expiry requires a new reply."} {new Intl.DateTimeFormat(zh?"zh-TW":"en",{timeZone:"Asia/Taipei",dateStyle:"medium",timeStyle:"short"}).format(new Date(snapshot.expiresAt))} (Asia/Taipei)</p>
 <label htmlFor={id+"-target"}>{zh?"翻譯目標語言":"Translation target language"}</label><select id={id+"-target"} className="catalogue-input" value={target} onChange={e=>{clear();setTarget(e.target.value as TranslationLocale);}}><option value="en">English</option><option value="zh-TW">繁體中文（台灣）</option></select>
 <label htmlFor={id+"-field"}>{zh?"選取回覆欄位":"Selected response field"}</label><select id={id+"-field"} className="catalogue-input" value={path} onChange={e=>{clear();setPath(e.target.value);}}>{snapshot.fieldPaths.map(p=><option key={p} value={p}>{p}</option>)}</select>
 <button type="button" disabled={busy} onClick={()=>void translate()}>{busy?(zh?"處理模擬譯文…":"Preparing mock translation…"):(zh?"明確請求模擬翻譯":"Request mock translation")}</button>
 <p>{zh?"未列於已編寫範例中的文字會顯示無法使用，不會假造譯文。每份快照最多兩個成功請求。":"Text outside the authored catalogue returns unavailable, never an invented translation. Up to two successful requests per snapshot."}</p>
 </>}
 {error&&<p role="alert">{zh?"翻譯無法使用或遭拒；原始回覆已保留。代碼：":"Translation unavailable or rejected; original preserved. Code: "}{error}</p>}
 {result&&<div role="status"><p>MOCK_TEST_OUTPUT · {result.state} · {result.latencyMs} ms</p>{result.fields.map(f=><dl key={f.path}><dt>{zh?"原文":"Original"} · {f.path}</dt><dd style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{f.original}</dd><dt>{zh?"已編寫的模擬譯文（未經審閱）":"Authored mock translation (unreviewed)"}</dt><dd style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{f.translatedText}</dd></dl>)}<p>{zh?"語意忠實度尚未驗證。風險提示並非品質判定。":"Semantic fidelity unverified. Risk hints are not quality judgments."}</p><p>{result.warnings.join(" · ")}</p></div>}
 </section>;
}
