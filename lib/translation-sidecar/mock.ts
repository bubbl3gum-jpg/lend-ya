import {exact,validText,verifyLiteralIntegrity,verifySourceLanguage,hash} from "./contracts";
import {TranslationError,type TranslationLocale} from "./types";
/** Authored fixtures only. No general translation, inference, network or fallback. */
const pairs:readonly(readonly[string,string])[]=[
 ["Please clarify the issue.","請協助釐清問題。"],
 ["Synthetic unverified statement","虛構陳述（尚未驗證）"],
 ["Insufficient evidence","資訊不足"],
 ["Ask for clarification","請協助釐清"],
 ["Mutual agreement is required","需要雙方同意"],
 ["No financial authority","無金融操作權限"],
 ["NT$1000 deposit and NT$400 rental fee are not confirmed paid. Pickup proposal: 2026-11-03 18:00 Asia/Taipei UTC+08:00; no agreement.","NT$1000 押金與 NT$400 租金皆未確認支付。取件提議：2026-11-03 18:00 Asia/Taipei UTC+08:00；雙方尚未達成協議。"]
];
export function authoredTranslation(original:string,from:TranslationLocale,to:TranslationLocale){
 verifySourceLanguage(original,from);if(from===to)return original;
 const match=pairs.find(p=>p[from==="en"?0:1]===original);if(!match)throw new TranslationError("MOCK_UNAVAILABLE");return match[to==="en"?0:1];
}
/** Independent adapter-output checks. Never mutate, repair, discard fields or infer source metadata. */
export function validateMockFields(raw:unknown,selected:Record<string,string>,from:TranslationLocale,to:TranslationLocale){
 if(Buffer.byteLength(JSON.stringify(raw))>65536)throw new TranslationError("REJECTED_OUTPUT");
 const x=exact(raw,["provenance","providerVersion","fields"]);
 if(x.provenance!=="MOCK_TEST_OUTPUT"||x.providerVersion!=="authored-translation-v1"||!Array.isArray(x.fields)||x.fields.length!==Object.keys(selected).length)throw new TranslationError("REJECTED_OUTPUT");
 let total=0;const seen=new Set<string>(),out:{path:string;canonicalTextDigest:string;original:string;translatedText:string}[]=[];
 for(const value of x.fields){const f=exact(value,["path","canonicalTextDigest","translatedText"]);if(typeof f.path!=="string"||!Object.hasOwn(selected,f.path)||seen.has(f.path)||f.canonicalTextDigest!==hash(selected[f.path])||!validText(f.translatedText))throw new TranslationError("REJECTED_OUTPUT");seen.add(f.path);total+=Array.from(f.translatedText).length;if(total>16000)throw new TranslationError("REJECTED_OUTPUT");verifySourceLanguage(selected[f.path],from);verifyLiteralIntegrity(selected[f.path],f.translatedText);verifySourceLanguage(f.translatedText,to);out.push({path:f.path,canonicalTextDigest:String(f.canonicalTextDigest),original:selected[f.path],translatedText:f.translatedText});}
 return out;
}
export function mockAdapter(selected:Record<string,string>,from:TranslationLocale,to:TranslationLocale){return {provenance:"MOCK_TEST_OUTPUT",providerVersion:"authored-translation-v1",fields:Object.entries(selected).map(([path,original])=>({path,canonicalTextDigest:hash(original),translatedText:authoredTranslation(original,from,to)}))};}
