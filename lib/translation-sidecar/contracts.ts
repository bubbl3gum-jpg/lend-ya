import {digest} from "../advisory-evaluation/dataset";
import type {Advisory} from "../local-inference/contracts";
import {TranslationError,type TranslationRequest,type TranslationLocale} from "./types";
export const hash=(v:unknown)=>"sha256:"+digest(v);
export const exact=(raw:unknown,keys:string[])=>{if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).sort().join()!==[...keys].sort().join())throw new TranslationError("INPUT");return raw as Record<string,unknown>;};
export function requestInput(raw:unknown):TranslationRequest{
 const x=exact(raw,["version","responseRef","canonicalDigest","targetLocale","fieldPaths","requestId"]);
 if(x.version!=="advisory-translation-request-v1"||typeof x.responseRef!=="string"||!uuid(x.responseRef)||!uuid(x.requestId)||typeof x.canonicalDigest!=="string"||!/^sha256:[a-f0-9]{64}$/.test(x.canonicalDigest)||!["en","zh-TW"].includes(String(x.targetLocale))||!Array.isArray(x.fieldPaths)||!x.fieldPaths.length||x.fieldPaths.length>16||new Set(x.fieldPaths).size!==x.fieldPaths.length||x.fieldPaths.some(p=>typeof p!=="string"||p.length>50))throw new TranslationError("INPUT");
 return x as TranslationRequest;
}
function uuid(x:unknown){return typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);}
export function selectedTexts(output:Advisory,locale:TranslationLocale):Record<string,string>{
 const texts:Record<string,string>={};for(const key of ["knownFacts","participantClaims","nextSteps","uncertainties","requiresAgreement","humanReview"] as const)output[key].forEach((value,i)=>{texts[`${key}[${i}]${typeof value==="string"?"":".text"}`]=typeof value==="string"?value:value.text;});texts[`drafts.${locale}`]=output.drafts[locale];return texts;
}
export function validText(s:unknown):s is string{return typeof s==="string"&&!!s.trim()&&Array.from(s).length<=4000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\uD800-\uDFFF]/u.test(s);}
/** Literal checks are necessary, not sufficient for semantic fidelity. No repair or conversion. */
export function literals(s:string):string[]{return s.match(/[+-]?(?:NT\$|US\$|USD|TWD|EUR|\$|€)\s?\d[\d,.]*|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?|\d{4}-\d{2}-\d{2}|UTC[+-]\d{2}:?\d{2}|[A-Za-z_]+\/[A-Za-z_]+|[+-]\d{2}:?\d{2}|\b\d{1,2}:\d{2}\b|\b(?:TWD|USD|EUR|NTD)\b|[+-]?\d+(?:\.\d+)?/g)??[];}
export function verifyLiteralIntegrity(original:string,translated:string){if(JSON.stringify(literals(original))!==JSON.stringify(literals(translated)))throw new TranslationError("PROTECTED_VALUE_MISMATCH");}
export function verifySourceLanguage(text:string,locale:TranslationLocale){
 const stripped=literals(text).reduce((s,l)=>s.replace(l," "),text).replace(/\b(?:QR|GPS|MRT|AI|Hustlen)\b/g,"");
 const han=/\p{Script=Han}/u.test(stripped),latin=/[A-Za-z]{2}/.test(stripped);
 if((locale==="en"&&(!latin||han))||(locale==="zh-TW"&&(!han||latin)))throw new TranslationError("MIXED_SOURCE_UNSUPPORTED");
}
export function warnings(text:string){return ["MOCK_NOT_TRANSLATION_QUALITY_EVIDENCE","LANGUAGE_HEURISTIC_ONLY",...(/\b(?:not|no|unconfirmed|uncertain)\b|尚未|不代表|未確認|沒有/i.test(text)?["NEGATION_UNCERTAINTY_REVIEW"]:[]),...(/agree|liabil|proposal|同意|協議|責任/i.test(text)?["AGREEMENT_LIABILITY_REVIEW"]:[])];}
