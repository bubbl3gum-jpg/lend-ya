import { uuid } from "../support/input";
export const assistantScopes = ["CUSTOMER_SERVICE", "OWNER", "BORROWER"] as const;
export type AssistantScope = typeof assistantScopes[number];
export type Language = "en" | "zh-TW";
export const issues = ["BORROWING","LISTING","DEPOSIT","PICKUP","RETURN","MRT","QR","EVIDENCE","CONDITION","CONTACT","OWNER_ABSENT","BORROWER_ABSENT","QR_FAILED","DAMAGED","RETURN_UNVERIFIED","PAYMENT","TECHNICAL","ACCOUNT"] as const;
export type Issue = typeof issues[number];
export type GuideInput = {mode:"GUIDE";language:Language;issue:Issue;report:string};
export type CopilotInput = {mode:"COPILOT";language:Language;ticketId:string;channelId:string};
/** Client mode selects an operation, never authority. Resource authorization occurs separately on the server. */
export function assistantInput(value:unknown):GuideInput|CopilotInput {
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error("INPUT");
  const v=value as Record<string,unknown>;
  const keys=v.mode==="GUIDE"?["mode","language","issue","report"]:v.mode==="COPILOT"?["mode","language","ticketId","channelId"]:[];
  if(!keys.length||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||!["en","zh-TW"].includes(v.language as string))throw Error("INPUT");
  if(v.mode==="GUIDE"){
    if(!(issues as readonly unknown[]).includes(v.issue)||typeof v.report!=="string"||v.report.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v.report))throw Error("INPUT");
    return {mode:"GUIDE",language:v.language as Language,issue:v.issue as Issue,report:v.report.trim()};
  }
  if(!uuid(v.ticketId)||!uuid(v.channelId))throw Error("INPUT");
  return {mode:"COPILOT",language:v.language as Language,ticketId:v.ticketId,channelId:v.channelId};
}
export type AssistantResult = {
 scope:"CUSTOMER_SERVICE";mode:"GUIDE"|"COPILOT";language:Language;provenance:"DETERMINISTIC_OFFLINE_NO_MODEL";
 summary:string;guidance:string;questions:string[];draftTitle:string;draft:string;uncertainty:string[];
 sources:{id:string;kind:"IMPLEMENTATION_REFERENCE"|"PARTICIPANT_CLAIM"|"APPLICATION_EVENT";at:string|null;text:string;originalLanguage:boolean;authorKind?:"REQUESTER"|"SUPPORT_TEST"}[];
 conflicts:{text:string;refs:string[]}[];caseStatus:string|null;truncated:boolean;requiresHumanReview:true;
};
