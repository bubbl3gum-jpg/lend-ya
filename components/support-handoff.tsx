"use client";
import {useId,useRef,useState} from "react";
import {fictionalHandoff,handoffReceipt} from "@/lib/local-inference/support-handoff";
export function SupportHandoff({summary,zh}:{summary:string;zh:boolean}){
 const id=useId(),locked=useRef(false);
 const [attempt,setAttempt]=useState<ReturnType<typeof fictionalHandoff>|null>(null);
 const [preview,setPreview]=useState(false),[confirmedText,setConfirmedText]=useState<string|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[receipt,setReceipt]=useState<ReturnType<typeof handoffReceipt>|null>(null);
 let candidate:ReturnType<typeof fictionalHandoff>|null=null;
 try{candidate=fictionalHandoff(summary,"00000000-0000-4000-8000-000000000000");}catch{}
 const payload=attempt??candidate;
 const confirmed=!!payload&&confirmedText===payload.description;
 async function submit(){
  if(locked.current||receipt||!confirmed||!payload)return;
  locked.current=true;setBusy(true);setFailed(false);
  try{
   const request=attempt??fictionalHandoff(summary,crypto.randomUUID());
   setAttempt(request);
   const r=await fetch("/api/dev/support-requester",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(request)});
   if(!r.ok)throw Error("Rejected");
   setReceipt(handoffReceipt(await r.json()));
  }catch{setFailed(true);}finally{locked.current=false;setBusy(false);}
 }
 return <section aria-label={zh?"測試客服轉交":"Synthetic Support handoff"}>
 <p>{zh?"僅限虛構測試資料。目的地：此自有開發資料庫的客服受理服務；不是真人客服傳送或通知。":"Fictional data only. Destination: Support intake in this owned development database; not human delivery or notification."}</p>
 {!preview&&!receipt&&<button type="button" disabled={!candidate} onClick={()=>{setPreview(true);setConfirmedText(null);}}>{zh?"預覽客服提交內容":"Preview Support submission"}</button>}
 {!candidate&&!attempt&&<p>{zh?"請手動縮短摘要；連同提示最多 2,000 字元，且不得含無效控制字元。":"Shorten the summary manually: description including notice must fit 2,000 characters and contain no invalid controls."}</p>}
 {preview&&!receipt&&<><p>{zh?"帳號由目前登入狀態決定。類別：其他客服；標題：虛構 AI 協助轉交。無關聯紀錄。":"Actor: current authenticated synthetic account. Category: OTHER_SUPPORT. No related records."}</p><p>{payload?.subject}</p><pre className="whitespace-pre-wrap break-words">{payload?.description}</pre>
 <label htmlFor={id}><input id={id} type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmedText(e.target.checked&&payload?payload.description:null)}/>{zh?"我已審閱以上完整虛構內容，確認提交至測試受理服務。":"I reviewed the exact fictional payload above and confirm submission to test intake."}</label>
 <button type="button" disabled={busy||!confirmed||!payload} onClick={()=>void submit()}>{busy?(zh?"正在提交…":"Submission pending…"):(zh?"確認提交虛構案件":"Confirm fictional submission")}</button>
 {!attempt&&<button type="button" onClick={()=>{setPreview(false);setConfirmedText(null);}}>{zh?"取消，不提交":"Cancel without submitting"}</button>}
 {attempt&&<p>{zh?"重試使用原始內容及相同請求編號；後續摘要修改不會改變此次提交。":"Retries use the original payload and request key; later summary edits do not alter this submission."}</p>}
 </>}
 {failed&&<p role="alert">{zh?"提交遭拒或結果無法確認；沒有可用收據。可明確重試同一請求，不會自動重送。":"Submission rejected or outcome unconfirmed; no receipt available. You may explicitly retry the same request; no automatic retry."}</p>}
 {receipt&&<p role="status">{zh?"測試案件已持久化":"Synthetic ticket persisted"}: {receipt.id} · {receipt.createdAt}. {zh?"這只確認資料庫已受理；未確認指派、真人接收或回覆。":"This confirms database intake only. Agent assignment, human receipt and response are not confirmed."}</p>}
 </section>;
}
