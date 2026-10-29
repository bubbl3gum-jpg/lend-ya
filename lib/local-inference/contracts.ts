import type { Manifest } from "../ai-case-brief/contracts";
export type AdvisoryStatement = { text: string; refs: string[] };
export type Advisory = {
 knownFacts: AdvisoryStatement[]; participantClaims: AdvisoryStatement[];
 uncertainties: string[]; nextSteps: AdvisoryStatement[]; requiresAgreement: string[];
 humanReview: string[]; drafts: { en: string; "zh-TW": string };
};
export class InferenceError extends Error {
 constructor(public code: "INPUT" | "UNAVAILABLE" | "LIMIT" | "TIMEOUT" | "CANCELED" | "VALIDATION") { super(code); }
}
function exact(x: unknown, keys: string[]): Record<string, unknown> {
 if (!x || typeof x !== "object" || Array.isArray(x) || Object.keys(x).sort().join() !== keys.sort().join()) throw new InferenceError("VALIDATION");
 return x as Record<string, unknown>;
}
function text(x: unknown): string {
 if (typeof x !== "string" || !x.trim() || x.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x)) throw new InferenceError("VALIDATION");
 return x;
}
function strings(x: unknown): string[] {
 if (!Array.isArray(x) || x.length > 12) throw new InferenceError("VALIDATION");
 return x.map(text);
}
/** Shape/source membership only, NOT factual correctness, privacy certification or authority. */
export function validateAdvisory(raw: unknown, manifest: Manifest): Advisory {
 const x=exact(raw,["knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview","drafts"]);
 const statements=(raw: unknown, facts=false): AdvisoryStatement[]=>{
  if (!Array.isArray(raw) || raw.length > 12) throw new InferenceError("VALIDATION");
  return raw.map(v=>{const s=exact(v,["text","refs"]);const refs=strings(s.refs);
   if (!refs.length || new Set(refs).size!==refs.length || refs.some(id=>!manifest.sources.some(source=>source.id===id && (!facts || source.kind==="CONTEXT")))) throw new InferenceError("VALIDATION");
   return {text:text(s.text),refs};});
 };
 const drafts=exact(x.drafts,["en","zh-TW"]);
 return {knownFacts:statements(x.knownFacts,true),participantClaims:statements(x.participantClaims),uncertainties:strings(x.uncertainties),nextSteps:statements(x.nextSteps),requiresAgreement:strings(x.requiresAgreement),humanReview:strings(x.humanReview),drafts:{en:text(drafts.en),"zh-TW":text(drafts["zh-TW"])}};
}
const list={type:"array",maxItems:12,items:{type:"string",minLength:1,maxLength:2000}};
const statements={type:"array",maxItems:12,items:{type:"object",additionalProperties:false,required:["text","refs"],properties:{text:{type:"string",minLength:1,maxLength:2000},refs:{...list,minItems:1}}}};
export const advisorySchema={type:"object",additionalProperties:false,required:["knownFacts","participantClaims","uncertainties","nextSteps","requiresAgreement","humanReview","drafts"],properties:{knownFacts:statements,participantClaims:statements,uncertainties:list,nextSteps:statements,requiresAgreement:list,humanReview:list,drafts:{type:"object",additionalProperties:false,required:["en","zh-TW"],properties:{en:{type:"string",minLength:1,maxLength:2000},"zh-TW":{type:"string",minLength:1,maxLength:2000}}}}};
