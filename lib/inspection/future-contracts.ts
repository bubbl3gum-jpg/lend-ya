/** Contract only. No upload, provider, biometric processing, credentials or activation path. */
export const identityStates=["NOT_STARTED","IN_PROGRESS","VERIFIED","RETRY_REQUIRED","MANUAL_REVIEW","REJECTED","EXPIRED","REVOKED"] as const;
export type IdentityState=typeof identityStates[number];
export type FutureIdentityResult={state:IdentityState;country:string;documentType:"TW_NATIONAL_ID"|"TW_ARC";providerReference:string;verifiedAt:string|null;expiresAt:string|null};
export function identityAuthorizationUnavailable(_untrustedInput:unknown):never{void _untrustedInput;throw Error("NO_APPROVED_EKYC_PROVIDER_OR_ACTIVATION");}
export type FutureVisionInput={bookingId:number;category:string;checklist:Readonly<Record<string,string|boolean>>;references:readonly {id:string;stage:"PICKUP"|"RETURN";capturedAt:string;original:true}[]};
export type FutureVisionObservation={kind:"QUALITY"|"MISSING_VIEW"|"POSSIBLE_DIFFERENCE"|"ACCESSORY_UNCERTAIN";text:string;refs:readonly string[];confidence:number|null;uncertainty:string;advisory:true};
export function validateVisionObservation(raw:unknown,allowedIds:readonly string[]):FutureVisionObservation{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("INVALID_ADVISORY_OBSERVATION");const r=raw as Record<string,unknown>,keys=["kind","text","refs","confidence","uncertainty","advisory"];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||!["QUALITY","MISSING_VIEW","POSSIBLE_DIFFERENCE","ACCESSORY_UNCERTAIN"].includes(r.kind as string)||r.advisory!==true||typeof r.text!=="string"||!r.text.trim()||r.text.length>1000||typeof r.uncertainty!=="string"||!r.uncertainty.trim()||r.uncertainty.length>1000||!Array.isArray(r.refs)||!r.refs.length||r.refs.length>12||new Set(r.refs).size!==r.refs.length||r.refs.some(x=>typeof x!=="string"||!allowedIds.includes(x))||(r.confidence!==null&&(typeof r.confidence!=="number"||!Number.isFinite(r.confidence)||r.confidence<0||r.confidence>1)))throw Error("INVALID_ADVISORY_OBSERVATION");
 return structuredClone(r) as FutureVisionObservation;
}
export function visionInferenceUnavailable(_input:FutureVisionInput):never{void _input;throw Error("NO_APPROVED_VISION_PROVIDER");}
