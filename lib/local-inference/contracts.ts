import type { Manifest } from "../ai-case-brief/contracts";
export type AdvisoryStatement = { text: string; refs: string[] };
export type Advisory = {
 knownFacts: AdvisoryStatement[]; participantClaims: AdvisoryStatement[];
 uncertainties: string[]; nextSteps: AdvisoryStatement[]; requiresAgreement: string[];
 humanReview: string[]; drafts: { en: string; "zh-TW": string };
};
export const validationReasons = ["PROVIDER_JSON","RESPONSE_SIZE","PROVIDER_ENVELOPE","MODEL_MISMATCH","INCOMPLETE_RESPONSE","CONTENT_MISSING","CONTENT_JSON","CONTENT_JSON_LIMIT","OBJECT_SHAPE","ARRAY_SHAPE","TEXT_INVALID","REFS_EMPTY","REFS_DUPLICATE","REFS_UNKNOWN","FACT_SOURCE_KIND"] as const;
export type ValidationReason = typeof validationReasons[number];
export const validationFields = ["provider","root","knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview","drafts","drafts.en","drafts.zh-TW"] as const;
export type ValidationField = typeof validationFields[number];
export class InferenceError extends Error {
 constructor(public code: "INPUT" | "UNAVAILABLE" | "LIMIT" | "TIMEOUT" | "CANCELED" | "VALIDATION",public reason?:ValidationReason,public field?:ValidationField) { super(code); }
}
/** Static allowlists only: never values, unknown keys, indices, refs, text, counts or provider diagnostics. */
export function safeValidationDiagnostic(error:InferenceError) {
 if(error.code!=="VALIDATION" || !validationReasons.includes(error.reason!) || !validationFields.includes(error.field!))return undefined;
 return {version:"local-validation-v1" as const,reason:error.reason!,field:error.field!};
}
function fail(reason:ValidationReason,field:ValidationField):never { throw new InferenceError("VALIDATION",reason,field); }
function exact(x: unknown, keys: string[],field:ValidationField): Record<string, unknown> {
 if (!x || typeof x !== "object" || Array.isArray(x) || Object.keys(x).sort().join() !== keys.sort().join()) fail("OBJECT_SHAPE",field);
 return x as Record<string, unknown>;
}
function text(x: unknown,field:ValidationField): string {
 if (typeof x !== "string" || !x.trim() || x.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x)) fail("TEXT_INVALID",field);
 return x;
}
function strings(x: unknown,field:ValidationField): string[] {
 if (!Array.isArray(x) || x.length > 12) fail("ARRAY_SHAPE",field);
 return x.map(v=>text(v,field));
}
/** Shape/source membership only, NOT factual correctness, privacy certification or authority. */
export function validateAdvisory(raw: unknown, manifest: Manifest): Advisory {
 const x=exact(raw,["knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview","drafts"],"root");
 const statements=(raw: unknown,field:ValidationField,facts=false): AdvisoryStatement[]=>{
  if (!Array.isArray(raw) || raw.length > 12) fail("ARRAY_SHAPE",field);
  return raw.map(v=>{const s=exact(v,["text","refs"],field);const refs=strings(s.refs,field);
   if (!refs.length)fail("REFS_EMPTY",field);
   if (new Set(refs).size!==refs.length)fail("REFS_DUPLICATE",field);
   if (refs.some(id=>!manifest.sources.some(source=>source.id===id)))fail("REFS_UNKNOWN",field);
   if (facts && refs.some(id=>!manifest.sources.some(source=>source.id===id && source.kind==="CONTEXT")))fail("FACT_SOURCE_KIND",field);
   return {text:text(s.text,field),refs};});
 };
 const drafts=exact(x.drafts,["en","zh-TW"],"drafts");
 return {knownFacts:statements(x.knownFacts,"knownFacts",true),participantClaims:statements(x.participantClaims,"participantClaims"),uncertainties:strings(x.uncertainties,"uncertainties"),nextSteps:statements(x.nextSteps,"nextSteps"),requiresAgreement:strings(x.requiresAgreement,"requiresAgreement"),humanReview:strings(x.humanReview,"humanReview"),drafts:{en:text(drafts.en,"drafts.en"),"zh-TW":text(drafts["zh-TW"],"drafts.zh-TW")}};
}
const list={type:"array",maxItems:12,items:{type:"string",minLength:1,maxLength:2000}};
const statements={type:"array",maxItems:12,items:{type:"object",additionalProperties:false,required:["text","refs"],properties:{text:{type:"string",minLength:1,maxLength:2000},refs:{...list,minItems:1}}}};
export const advisorySchema={type:"object",additionalProperties:false,required:["knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview","drafts"],properties:{knownFacts:statements,participantClaims:statements,uncertainties:list,nextSteps:statements,requiresAgreement:list,humanReview:list,drafts:{type:"object",additionalProperties:false,required:["en","zh-TW"],properties:{en:{type:"string",minLength:1,maxLength:2000},"zh-TW":{type:"string",minLength:1,maxLength:2000}}}}};

/** Constrain generation from the server-selected manifest; validation remains independent. */
export function sourceAwareAdvisorySchema(manifest: Manifest) {
 const ids=manifest.sources.map(source=>source.id);
 const contextIds=manifest.sources.filter(source=>source.kind==="CONTEXT").map(source=>source.id);
 const scopedStatements=(allowed: string[])=>({
  ...statements,
  maxItems:allowed.length ? 12 : 0,
  items:{...statements.items,properties:{...statements.items.properties,
   refs:{...list,minItems:1,uniqueItems:true,items:{...list.items,...(allowed.length ? {enum:allowed} : {})}}
  }}
 });
 return {...advisorySchema,properties:{...advisorySchema.properties,
  knownFacts:scopedStatements(contextIds),
  participantClaims:scopedStatements(ids),nextSteps:scopedStatements(ids)
 }};
}
