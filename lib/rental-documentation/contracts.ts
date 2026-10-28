import {createHash} from "node:crypto";
export const policy="owned-documentation-agreement-v1";
export function canonical(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";return "{"+Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",")+"}";}
export function contentDigest(value:unknown){return createHash("sha256").update(canonical(value)).digest("hex");}
export type Terms={listingId:number;borrowerId:number;startAt:string;endAt:string;stationId:number;dailyPrice:string;totalPrice:string;deposit:string|null;notes:string|null};
export type Acknowledgement={contextId:string;versionId:string;acknowledged:true};
export function acknowledgement(raw:unknown):Acknowledgement{if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("DOCUMENTATION_ACK_REQUIRED");const r=raw as Record<string,unknown>;if(Object.keys(r).length!==3||r.acknowledged!==true||![r.contextId,r.versionId].every(v=>typeof v==="string"&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v)))throw Error("DOCUMENTATION_ACK_REQUIRED");return {contextId:String(r.contextId),versionId:String(r.versionId),acknowledged:true};}
