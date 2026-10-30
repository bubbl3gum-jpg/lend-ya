import { createHash } from "node:crypto";
import { playgroundTask } from "./playground";
import { InferenceError } from "./contracts";
/** Static technical knowledge selected on the server. No DB, file retrieval, policy approval or client-authored sources. */
const catalogue=[
 {sourceId:"HUSTLEN-PROC-BOOKING",topic:"BOOKING",version:1,reviewStatus:"IMPLEMENTATION_REVIEWED_DEV_ONLY",ownerApproval:"PENDING",references:["lib/assistant/guidance.ts#BORROWING","app/api/bookings/route.ts","app/api/bookings/[id]/route.ts"],
 description:{en:"An eligible listing can receive a rental request. A pending request is not owner acceptance or confirmed availability. Existing booking request/owner-response controls determine acceptance. A proposed change of pickup time is not mutual agreement; ask which arrangement both participants accepted. This assistant cannot accept a request or amend an arrangement.","zh-TW":"可租借的刊登可以收到租借申請。待處理申請不代表物主已接受，也不代表時段已確認；是否接受由現有申請及物主回覆流程決定。提議更改取件時間不等於雙方已達成協議，應確認雙方接受哪項安排。本助手無法接受申請或修改安排。"},
 limitations:{en:"Technical procedure only, not a commercial or legal policy. No specific booking, availability, accepted time, cancellation rule, fee, penalty or refund is verified. No real booking record was retrieved.","zh-TW":"僅說明技術程序，並非商業或法律政策。尚未驗證特定預約、可用時段或同意時間，也未核准取消、收費、處罰或退款條款；未讀取真實預約。"}},
 {sourceId:"HUSTLEN-PROC-HANDOFF",topic:"HANDOFF",version:1,reviewStatus:"IMPLEMENTATION_REVIEWED_DEV_ONLY",ownerApproval:"PENDING",references:["lib/assistant/guidance.ts#PICKUP","lib/assistant/guidance.ts#QR","lib/rental-lifecycle.ts","lib/meetup/service.ts"],
 description:{en:"In the existing handoff flow the owner records item condition/checklist and required evidence, and the borrower separately confirms receipt through the protected flow. Required meetup verification and physical-receipt acknowledgements remain separate requirements. A QR scan alone does not complete physical handoff. Follow the booking's agreed MRT station and displayed steps; the assistant cannot change custody or bypass camera, consent, location or receipt checks.","zh-TW":"在現有交接流程中，物主記錄物品狀況、檢查清單及必要紀錄，借用者再透過受保護的流程分別確認收件。必要會面驗證與實際收件確認仍是不同要求，僅掃描 QR 碼不代表已完成實際交接。請依預約中同意的捷運站及畫面步驟操作；本助手無法變更保管狀態，也不能繞過相機、同意、定位或收件確認。"},
 limitations:{en:"No actual participant, station arrival, completed checklist or physical receipt is verified. TEST_LOCATION is not verified arrival at a real MRT station. No fallback, no-show consequence, deadline or sanction is authorized by this text.","zh-TW":"未驗證實際參與者、抵站、檢查清單或實際收件。TEST_LOCATION 不代表已驗證抵達真實捷運站。本說明不授權替代流程、未到場後果、期限或處分。"}},
 {sourceId:"HUSTLEN-PROC-RETURN",topic:"RETURN",version:1,reviewStatus:"IMPLEMENTATION_REVIEWED_DEV_ONLY",ownerApproval:"PENDING",references:["lib/assistant/guidance.ts#RETURN","lib/assistant/guidance.ts#EVIDENCE","lib/rental-lifecycle.ts","lib/inspection/service.ts","lib/condition-claims/contracts.ts"],
 description:{en:"The borrower submits the return with applicable checklist, condition information and required camera evidence. Return submission, verified physical receipt and owner inspection are distinct steps. Preserve original pickup and return records; later supplemental material must not replace historical pickup evidence. Separate reported condition/accessories from established findings, and use the existing authorized dispute or human-help workflow for unresolved concerns. This text-only assistant does not inspect images or decide responsibility.","zh-TW":"借用者依流程提交歸還，包含適用的檢查清單、狀況說明及必要相機紀錄。提交歸還、驗證實際收件及物主檢查是不同步驟。請保留原始取件及歸還紀錄，後續補充資料不能取代歷史取件紀錄。應區分所述物品或配件狀況與已確認結果，未解問題請透過既有授權爭議或人工協助流程處理。本純文字助手不會檢視影像或判定責任。"},
 limitations:{en:"No actual return, damage, missing accessory, payment or dispute outcome is established. No production inspection exception, enforceable borrower-response deadline, delivery proof, compensation or refund policy is approved here. Human Support availability is not guaranteed.","zh-TW":"未確認實際歸還、損壞、配件遺失、付款或爭議結果。本說明不核准正式檢查例外、可強制執行的借用者回覆期限、送達證明、賠償或退款政策，也不保證人工客服可用。"}}
] as const;
export type KnowledgeEntry=typeof catalogue[number];
export function proceduralKnowledge(topic:unknown):KnowledgeEntry{
 const entry=catalogue.find(k=>k.topic===topic&&k.reviewStatus==="IMPLEMENTATION_REVIEWED_DEV_ONLY");
 if(!entry)throw new InferenceError("INPUT");return structuredClone(entry);
}
export function groundedHelpTask(raw:unknown){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new InferenceError("INPUT");
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).sort().join()!=="language,messages,mode,side,topic"||x.mode!=="GROUNDED")throw new InferenceError("INPUT");
 const entry=proceduralKnowledge(x.topic);
 const task=playgroundTask({mode:"PLAYGROUND",side:x.side,language:x.language,messages:x.messages});
 const language=task.manifest.language,id=`${entry.sourceId}:v${entry.version}`;
 const manifest={...task.manifest,caseId:"SYN-GROUNDED-HELP",title:"General implemented procedure with fictional participant claims; not private case verification",sources:[...task.manifest.sources,
 {id,kind:"CONTEXT" as const,at:"2026-10-30T00:00:00Z",excerpt:`GENERAL PROCEDURE ONLY. Version ${entry.version}; ${entry.reviewStatus}; owner production approval ${entry.ownerApproval}. ${entry.description[language]} Limitations: ${entry.limitations[language]} References: ${entry.references.join("; ")}`}],
 missing:[...task.manifest.missing.filter(s=>s.includes("All user turns")).map(s=>s.replace("No verified context or private records.","Only general procedural context, never verified case facts or private records.")),"Procedural source timestamp is a fixed catalogue baseline, not a booking event. Unprovided policies, deadlines and case facts remain unavailable; clarify or recommend authorized human help, never invent them."]};
 if(Buffer.byteLength(JSON.stringify(manifest))>12000)throw new InferenceError("INPUT");
 return {id:`SYN-GROUNDED-HELP:${entry.topic}:${language}`,manifest,digest:createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),knowledge:[{...entry,id,contentDigest:createHash("sha256").update(JSON.stringify(entry)).digest("hex"),scope:"GENERAL_PROCEDURE_ONLY" as const}]};
}
