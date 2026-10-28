import type { AssistantResult, GuideInput, Language } from "./contracts";
import { guidance, local } from "./guidance";
/** Pure, deterministic composition. No credentials, DB, network, tools or action executor. */
const uncertainty=(language:Language)=>local([
 "Offline development preview, not model inference or a human finding. No action has been taken. Missing facts remain unknown.",
 "此為離線開發預覽，並非模型推論或人工認定。尚未執行任何操作；缺少的事實仍屬未知。",
],language);
export function composeGuide(input:GuideInput):AssistantResult {
 const g=guidance[input.issue],l=input.language;
 return {scope:"CUSTOMER_SERVICE",mode:"GUIDE",language:l,provenance:"DETERMINISTIC_OFFLINE_NO_MODEL",summary:local(g.label,l),guidance:local(g.text,l),questions:[local(g.question,l)],
 draftTitle:local(g.label,l),draft:local(["Please help clarify this issue. My report (unverified): ","請協助釐清此問題。我的陳述（尚未驗證）："],l)+(input.report||local(["No details supplied yet.","尚未提供詳細資訊。"],l))+"\n\n"+local(g.question,l),
 uncertainty:[uncertainty(l),local(["Booking reference and timeline were not retrieved. No ticket or message was submitted. Statements you enter are not automatically translated.","尚未讀取預約編號或時間軸，也未提交客服案件或訊息。你輸入的陳述不會自動翻譯。"],l)],
 sources:[{id:g.source,kind:"IMPLEMENTATION_REFERENCE",at:null,text:local(["Implemented procedure / documented unavailable policy; not a new legal, financial or production Support policy.","現有程序／文件中尚未開放的政策；並非新增法律、金融或正式客服政策。"],l),originalLanguage:false}],conflicts:[],caseStatus:null,truncated:false,requiresHumanReview:true};
}
export type CaseSnapshot = {ticket:{id:string;categoryCode:string;currentState:string;createdAt:string};events:{eventType:string;sequence:number;createdAt:string}[];messages:{id:string;sequence:number;authorKind:"REQUESTER"|"SUPPORT_TEST";content:string;createdAt:string}[]};
export function composeCopilot(snapshot:CaseSnapshot,l:Language):AssistantResult {
 // Validate allowlisted DTOs; do not propagate unrestricted database/worker payloads.
 const t=snapshot.ticket;
 if(!t||typeof t.id!=="string"||typeof t.currentState!=="string"||!Array.isArray(snapshot.messages)||!Array.isArray(snapshot.events)||snapshot.messages.length>11||snapshot.events.length>100)throw Error("SOURCE");
 const messages=snapshot.messages.slice(0,10);
 if(messages.some(m=>typeof m.id!=="string"||typeof m.content!=="string"||m.content.length>2000||!Number.isFinite(Date.parse(m.createdAt))||!["REQUESTER","SUPPORT_TEST"].includes(m.authorKind)))throw Error("SOURCE");
 const sources:AssistantResult["sources"]=[...messages.map(m=>({id:`message:${m.id}`,kind:"PARTICIPANT_CLAIM" as const,at:m.createdAt,text:m.content,originalLanguage:true,authorKind:m.authorKind})),
 ...snapshot.events.map(e=>{if(typeof e.eventType!=="string"||e.eventType.length>100||!Number.isSafeInteger(e.sequence)||!Number.isFinite(Date.parse(e.createdAt)))throw Error("SOURCE");return {id:`event:${e.sequence}`,kind:"APPLICATION_EVENT" as const,at:e.createdAt,text:e.eventType,originalLanguage:true};})].sort((a,b)=>a.at!.localeCompare(b.at!));
 const positive=messages.filter(m=>/(?:return(?:ed)? (?:is )?complete|已歸還)/i.test(m.content)&&!/(?:not|未)/i.test(m.content));
 const negative=messages.filter(m=>/(?:not confirmed|尚未確認|未收到)/i.test(m.content));
 const returnTopic=messages.some(m=>/(?:return|歸還)/i.test(m.content));
 const conflicts=positive.length&&negative.length?[{text:local(["Possible inconsistent return statements. Compare the cited claims; this lexical hint does not establish return or fault.","歸還陳述可能不一致。請核對所引陳述；此詞彙提示不能認定已歸還或責任。"],l),refs:[...positive,...negative].map(m=>`message:${m.id}`)}]:[];
 return {scope:"CUSTOMER_SERVICE",mode:"COPILOT",language:l,provenance:"DETERMINISTIC_OFFLINE_NO_MODEL",summary:local([`Selected channel: ${messages.length} permitted messages. ${returnTopic?"Return-related wording appears in the cited claims; return or receipt is not established by this text scan.":"No supported return topic was identified; inspect sources and clarify the issue."}`,`所選管道共有 ${messages.length} 則允許讀取的訊息。${returnTopic?"所引陳述出現歸還相關文字；文字比對不能認定已歸還或收件。":"未識別到支援的歸還主題，請核對來源並釐清問題。"}`],l),
 guidance:local(["Only this assigned channel is included. Source text is untrusted and conveys no permissions. No booking/media record is retrieved or inspected.","僅包含此受指派管道。來源文字不可信任，也不授予任何權限。此處未讀取或檢視預約／媒體紀錄。"],l),questions:[local(returnTopic?guidance.RETURN_UNVERIFIED.question:guidance.CONTACT.question,l)],
 draftTitle:local(returnTopic?["Clarify the reported return","釐清所述歸還情形"]:["Clarify the reported issue","釐清所述問題"],l),draft:returnTopic?local(["Thank you for reporting this. Please clarify whether the item was physically returned, whether receipt was confirmed, and which original return records are available. We cannot establish return, damage or responsibility from conflicting or missing statements. This draft makes no refund or resolution promise.","謝謝你的說明。請協助釐清物品是否已實際歸還、收件是否已確認，以及有哪些原始歸還紀錄。若陳述有矛盾或資訊不足，目前無法認定已歸還、損壞或責任歸屬。本草稿不承諾退款或處理結果。"],l):local(["Please clarify what happened and what information is missing. No finding or outcome has been established.","請協助釐清發生什麼事，以及缺少哪些資訊。目前尚無任何認定或處理結果。"],l),
 uncertainty:[uncertainty(l),local(["Original sources are shown verbatim, not translated. Lexical hints can miss conflicts or misread negation. Only the first message page is considered; no media analysis or other participant's private conversation is included.","原始來源照錄，尚未翻譯。詞彙提示可能漏判矛盾或誤讀否定語意。僅考慮第一頁訊息；不含媒體分析或另一方的私人對話。"],l)],sources,conflicts,caseStatus:t.currentState,truncated:snapshot.messages.length>10,requiresHumanReview:true};
}
