import {ticketInput,uuid} from "../support/input";
/** No actor or related-record selectors. The existing service derives identity. */
export function fictionalHandoff(summary:string,requestKey:string){
 if(!summary.trim())throw Error("Empty summary");
 const description=`Fictional development case. All statements are unverified; no booking or evidence attached.\n\n${summary}`;
 return {action:"create" as const,...ticketInput({categoryCode:"OTHER_SUPPORT",subject:"Fictional AI-assisted support handoff",description,requestKey})};
}
export function handoffReceipt(raw:unknown){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Invalid receipt");
 const x=raw as Record<string,unknown>;
 if(!uuid(x.id)||x.categoryCode!=="OTHER_SUPPORT"||x.currentState!=="RECEIVED"||typeof x.createdAt!=="string"||!Number.isFinite(Date.parse(x.createdAt)))throw Error("Invalid receipt");
 return {id:x.id,createdAt:x.createdAt};
}
