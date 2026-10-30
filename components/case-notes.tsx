"use client";
import {SupportHandoff} from "./support-handoff";
import {useId,useState} from "react";
import {useLocale} from "@/components/i18n/locale";
import type {Manifest} from "@/lib/ai-case-brief/contracts";
import {prepareCaseSummary,caseIssueLabels,caseStageLabels,type CaseAdvisory} from "@/lib/local-inference/case-notes";
export function CaseNotesPanel({output,manifest}:{output:CaseAdvisory;manifest:Manifest}){
 const summaryId=useId();
 const {locale}=useLocale(),zh=locale==="zh-TW",[summary,setSummary]=useState<string|null>(null),[error,setError]=useState(false);

 return <details><summary>{zh?"案件筆記（AI 推測）":"Case Notes (AI-inferred)"}</summary>
 <p>{zh?"類別及階段只是依虛構陳述推測，並非預約狀態或責任認定。":"Category and stage are tentative interpretations of fictional reports, not booking status or liability findings."}</p>
 <dl><dt>{zh?"問題類別":"Issue category"}</dt><dd>{caseIssueLabels[output.caseNotes.issueCategory][zh?1:0]}</dd><dt>{zh?"可能階段":"Likely rental stage"}</dt><dd>{caseStageLabels[output.caseNotes.rentalStage][zh?1:0]}</dd><dt>{zh?"自述角色":"Reported perspective"}</dt><dd>{manifest.side==="OWNER"?(zh?"物主":"Owner"):(zh?"借用者":"Borrower")}</dd><dt>{zh?"推測所依據的陳述":"Classification claim references"}</dt><dd>{output.caseNotes.basisRefs.join(", ")||(zh?"資訊不足":"Insufficient information")}</dd></dl>
 <h4>{zh?"使用者陳述（尚未驗證）":"Participant reports (unverified)"}</h4><ul>{output.participantClaims.map((s,i)=><li key={i}>{s.text} [{s.refs.join(", ")}]</li>)}</ul>
 <h4>{zh?"已驗證的個案紀錄":"Verified application context"}</h4><p>{zh?"不可用：沒有載入預約或已驗證個案事件。一般程序不能證明此租借已交接或歸還。":"Unavailable: no booking or verified case event was loaded. General procedures do not establish this rental's handoff or return."}</p>
 <h4>{zh?"缺少、矛盾或不確定的資訊":"Missing, conflicting or uncertain information"}</h4><ul>{output.uncertainties.map((s,i)=><li key={i}>{s}</li>)}</ul>
 <h4>{zh?"優先釐清問題":"Focused clarification questions"}</h4><ul>{output.caseNotes.clarificationQuestions.map((q,i)=><li key={i}>{q}</li>)}</ul>
 <h4>{zh?"可行建議（未執行）":"Suggested next steps (not performed)"}</h4><ul>{output.nextSteps.map((s,i)=><li key={i}>{s.text} [{s.refs.join(", ")}]</li>)}</ul>
 <h4>{zh?"AI 的人工審查建議":"AI human-review recommendation"}</h4>{output.humanReview.length?<ul>{output.humanReview.map((s,i)=><li key={i}>{s}</li>)}</ul>:<p>{zh?"未提供人工審查建議。":"No human-review recommendation provided."}</p>}
 <p>{zh?"AI 建議本身不會轉交。摘要下方另列使用者確認提交的狀態。":"AI recommendations do not transfer a case. User-confirmed submission status appears separately below the summary."}</p>
 <button type="button" disabled={summary!==null} onClick={()=>{try{setSummary(prepareCaseSummary(manifest,output.caseNotes));setError(false);}catch{setError(true);}}}>{zh?"準備本機摘要草稿":"Prepare local summary draft"}</button>
 {error&&<p role="alert">{zh?"無法在目前限制內準備完整摘要，未送出任何內容。":"Cannot prepare a complete summary within the limit. Nothing was sent."}</p>}
 {summary!==null&&<><p role="status">{zh?"本機摘要草稿已準備，可編輯；提交狀態另列於下方。":"Local draft prepared and editable; submission status appears separately below."}</p><label htmlFor={summaryId}>{zh?"本機案件摘要草稿":"Local case summary draft"}</label><textarea id={summaryId} className="catalogue-input" rows={7} maxLength={8000} value={summary} onChange={e=>setSummary(e.target.value)}/><SupportHandoff summary={summary} zh={zh}/></>}
 </details>;
}
