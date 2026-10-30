import type {Manifest} from "../ai-case-brief/contracts";
import {InferenceError,sourceAwareAdvisorySchema,validateAdvisory,type Advisory} from "./contracts";
export const CASE_NOTES_VERSION="fictional-case-notes-v1";
export const caseIssues=["BOOKING_TIME","HANDOFF_ARRIVAL","UNVERIFIED_RETURN","CONDITION","ACCESSORY","AGREEMENT_COMPENSATION","UNCLEAR"] as const;
export const caseStages=["BOOKING","PICKUP","IN_RENTAL","RETURN","INSPECTION","DISPUTE","UNDETERMINED"] as const;
export const caseIssueLabels={BOOKING_TIME:["Booking / pickup time","預約／取件時間"],HANDOFF_ARRIVAL:["Handoff / arrival","交接／到場"],UNVERIFIED_RETURN:["Unverified return","歸還尚未驗證"],CONDITION:["Condition concern","物品狀況問題"],ACCESSORY:["Accessory concern","配件問題"],AGREEMENT_COMPENSATION:["Agreement / compensation question","協議／補償問題"],UNCLEAR:["Unclear","尚不明確"]};
 export const caseStageLabels={BOOKING:["Booking","預約"],PICKUP:["Pickup","取件"],IN_RENTAL:["During rental","租借中"],RETURN:["Return","歸還"],INSPECTION:["Inspection","檢查"],DISPUTE:["Dispute discussion","爭議討論"],UNDETERMINED:["Undetermined","尚未確定"]};
export type CaseNotes={version:typeof CASE_NOTES_VERSION;issueCategory:typeof caseIssues[number];rentalStage:typeof caseStages[number];basisRefs:string[];clarificationQuestions:string[]};
export type CaseAdvisory=Advisory&{caseNotes:CaseNotes};
export function caseAdvisorySchema(manifest:Manifest){
 const base=sourceAwareAdvisorySchema(manifest),ids=manifest.sources.filter(s=>s.kind==="PARTICIPANT_CLAIM").map(s=>s.id);
 return {...base,required:[...base.required,"caseNotes"],properties:{...base.properties,caseNotes:{type:"object",additionalProperties:false,required:["version","issueCategory","rentalStage","basisRefs","clarificationQuestions"],properties:{version:{type:"string",enum:[CASE_NOTES_VERSION]},issueCategory:{type:"string",enum:caseIssues},rentalStage:{type:"string",enum:caseStages},basisRefs:{type:"array",maxItems:6,uniqueItems:true,items:{type:"string",enum:ids}},clarificationQuestions:{type:"array",maxItems:2,items:{type:"string",minLength:1,maxLength:500}}}}}};
}
function reject(reason:"OBJECT_SHAPE"|"TEXT_INVALID"|"REFS_UNKNOWN"|"FACT_SOURCE_KIND"="OBJECT_SHAPE"):never{throw new InferenceError("VALIDATION",reason,"root");}
/** Additional classification is advisory, never a custody state, verified event or policy decision. */
export function validateCaseAdvisory(raw:unknown,manifest:Manifest):CaseAdvisory{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))reject();
 const {caseNotes,...base}=raw as Record<string,unknown>;
 const output=validateAdvisory(base,manifest);
 if(!caseNotes||typeof caseNotes!=="object"||Array.isArray(caseNotes))reject();
 const n=caseNotes as Record<string,unknown>,keys=["version","issueCategory","rentalStage","basisRefs","clarificationQuestions"];
 if(Object.keys(n).length!==keys.length||keys.some(k=>!Object.hasOwn(n,k))||n.version!==CASE_NOTES_VERSION||!caseIssues.includes(n.issueCategory as CaseNotes["issueCategory"])||!caseStages.includes(n.rentalStage as CaseNotes["rentalStage"]))reject();
 if(!Array.isArray(n.basisRefs)||n.basisRefs.length>6||new Set(n.basisRefs).size!==n.basisRefs.length)reject();
 for(const id of n.basisRefs){const source=manifest.sources.find(s=>s.id===id);if(!source)reject("REFS_UNKNOWN");if(source.kind!=="PARTICIPANT_CLAIM")reject("FACT_SOURCE_KIND");}
 if((n.issueCategory!=="UNCLEAR"||n.rentalStage!=="UNDETERMINED")&&!n.basisRefs.length)reject();
 if(!Array.isArray(n.clarificationQuestions)||n.clarificationQuestions.length>2)reject();
 for(const q of n.clarificationQuestions)if(typeof q!=="string"||!q.trim()||q.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(q))reject("TEXT_INVALID");
 return {...output,caseNotes:structuredClone(n) as CaseNotes};
}
/** Deterministic, user-triggered summary of original reports, not an AI finding or Support submission. */
export function prepareCaseSummary(manifest:Manifest,notes:CaseNotes){
 const zh=manifest.language==="zh-TW";
 const lines=[zh?"虛構案件摘要草稿・未送出，未由人工接收":"Fictional case summary draft · not sent or received by a human",
  (zh?"自述角色：":"Reported role: ")+(manifest.side==="OWNER"?(zh?"物主":"Owner"):(zh?"借用者":"Borrower")),
  (zh?"AI 推測類別／階段（非事實認定）：":"AI-inferred category/stage (not a finding): ")+caseIssueLabels[notes.issueCategory][zh?1:0]+" / "+caseStageLabels[notes.rentalStage][zh?1:0],
  zh?"使用者原始陳述（尚未驗證、保留原文）：":"Original user reports (unverified, original language preserved):",
  ...manifest.sources.filter(s=>s.kind==="PARTICIPANT_CLAIM").map(s=>`[${s.id}] ${s.excerpt}`),
  (zh?"一般程序來源（不是個案事件證據）：":"General procedure sources (not evidence of case events): ")+ (manifest.sources.filter(s=>s.kind==="CONTEXT").map(s=>s.id).join(", ")||(zh?"未選取":"None selected")),
  zh?"沒有載入預約或已驗證個案事件。請人工協助釐清以上不確定事項；本摘要不承認責任、不要求自動退款或變更保管狀態。":"No booking or verified case event was loaded. Please help clarify the uncertainties above; this summary does not admit liability, request an automatic refund or change custody."];
 const text=lines.join("\n\n");if(text.length>8000)throw Error("SUMMARY_LIMIT");return text;
}
