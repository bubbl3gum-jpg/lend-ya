export const concerns=["VISIBLE_DAMAGE","POSSIBLE_DIFFERENCE","UNCONFIRMED_ACCESSORY","FUNCTIONAL_TEST_NEEDED","INSUFFICIENT_EVIDENCE"] as const;
export function inspectionWindow(returnedAt:string|null,now:Date){
 const at=returnedAt===null?NaN:Date.parse(returnedAt);
 if(!Number.isFinite(at)||at>now.getTime())return {returnedAt:null,deadline:null,open:false};
 return {returnedAt:new Date(at).toISOString(),deadline:new Date(at+24*3600_000).toISOString(),open:now.getTime()<at+24*3600_000};
}
export type TestNotification={id:string;kind:"TEST_DELIVERED"|"QUEUED"|"FAILED";occurredAt:string;source:"SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF"};
/** Demonstration only. No production delivery adapter, clock override or enforceable borrower deadline. */
export function responseWindow(event:TestNotification|null){
 if(!event||event.source!=="SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF"||event.kind!=="TEST_DELIVERED"||!Number.isFinite(Date.parse(event.occurredAt)))return {start:null,deadline:null,enforceable:false,automaticLiability:false};
 return {start:event.occurredAt,deadline:new Date(Date.parse(event.occurredAt)+48*3600_000).toISOString(),enforceable:false,automaticLiability:false};
}
export const notificationExamples:TestNotification[]=[
 {id:"SYN-NOTICE-DELIVERED",kind:"TEST_DELIVERED",occurredAt:"2026-10-28T03:00:00Z",source:"SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF"},
 {id:"SYN-NOTICE-QUEUED",kind:"QUEUED",occurredAt:"2026-10-28T03:00:00Z",source:"SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF"},
 {id:"SYN-NOTICE-FAILED",kind:"FAILED",occurredAt:"2026-10-28T03:00:00Z",source:"SYNTHETIC_FIXTURE_NOT_DELIVERY_PROOF"},
];
const text=(v:unknown,max:number)=>{if(typeof v!=="string"||!v.trim()||v.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error("INPUT");return v.trim();};
export function previewInput(value:unknown){
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("INPUT");
 const v=value as Record<string,unknown>;
 const keys=v.mode==="CLAIM"?["bookingId","mode","component","concern","description","evidenceIds","missingEvidence"]:v.mode==="RESPONSE"?["bookingId","mode","description","evidenceIds","accessoryState","disagree","requestHuman"]:[];
 if(!keys.length||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||!Number.isSafeInteger(v.bookingId)||Number(v.bookingId)<1||Number(v.bookingId)>2147483647||!Array.isArray(v.evidenceIds)||v.evidenceIds.length>10||new Set(v.evidenceIds).size!==v.evidenceIds.length||v.evidenceIds.some(id=>typeof id!=="string"||!/^[a-f0-9-]{36}$/.test(id)))throw Error("INPUT");
 const common={bookingId:v.bookingId as number,description:text(v.description,2000),evidenceIds:v.evidenceIds as string[]};
 if(v.mode==="CLAIM"){
  if(!(concerns as readonly unknown[]).includes(v.concern)||typeof v.missingEvidence!=="boolean")throw Error("INPUT");
  return {...common,mode:"CLAIM" as const,component:text(v.component,120),concern:v.concern as typeof concerns[number],missingEvidence:v.missingEvidence};
 }
 if(!["RETURNED","NOT_RETURNED","UNKNOWN"].includes(v.accessoryState as string)||typeof v.disagree!=="boolean"||typeof v.requestHuman!=="boolean")throw Error("INPUT");
 return {...common,mode:"RESPONSE" as const,accessoryState:v.accessoryState as string,disagree:v.disagree,requestHuman:v.requestHuman};
}
