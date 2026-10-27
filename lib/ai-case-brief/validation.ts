import { BRIEF_VERSION, BriefError, type BriefOutput, type Manifest } from "./contracts";
function object(v: unknown, keys: string[]): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).sort().join() !== keys.sort().join()) throw new BriefError("VALIDATION");
  return v as Record<string, unknown>;
}
function text(v: unknown): asserts v is string {
  if (typeof v !== "string" || !v.trim() || v.length>2000 || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) || /^(?:ignore (?:all|previous)|close (?:this|the) ticket|approve (?:a |the )?refund|create (?:a |an )?(?:staff|admin)|send (?:this|the) message)/i.test(v)) throw new BriefError("VALIDATION");
}
export function validateOutput(raw: unknown, m: Manifest): BriefOutput {
  if (typeof raw === "string") { if (raw.length>24000) throw new BriefError("VALIDATION"); try { raw=JSON.parse(raw); } catch { throw new BriefError("VALIDATION"); } }
  const r=object(raw,["version","caseId","language","summary","observations","timeline","category","missing","conflicts","questions","draft","uncertainty","requiresHumanReview"]);
  if (r.version!==BRIEF_VERSION || r.caseId!==m.caseId || r.language!==m.language || r.requiresHumanReview!==true || !["SCHEDULING","CONDITION","CLARIFICATION","UNTRUSTED_CONTENT"].includes(r.category as string)) throw new BriefError("VALIDATION");
  const source=new Map(m.sources.map(s=>[s.id,s]));
  const refs=(v: unknown) => {
    if (!Array.isArray(v) || !v.length || v.length>12 || new Set(v).size!==v.length || v.some(id=>typeof id!=="string" || !source.has(id))) throw new BriefError("REFERENCES");
    return v as string[];
  };
  for (const key of ["summary","observations"]) {
    if (!Array.isArray(r[key]) || !(r[key] as unknown[]).length || (r[key] as unknown[]).length>12) throw new BriefError("VALIDATION");
    for (const value of r[key] as unknown[]) { const c=object(value,["text","refs","basis"]); text(c.text); const ids=refs(c.refs); if (!["SOURCE_EXCERPT","INTERPRETATION"].includes(c.basis as string)) throw new BriefError("VALIDATION"); if (c.basis==="SOURCE_EXCERPT" && (ids.length!==1 || source.get(ids[0])!.excerpt!==c.text)) throw new BriefError("VALIDATION"); }
  }
  const timeline=refs(r.timeline); const ordered=m.sources.filter(s=>timeline.includes(s.id)).map(s=>s.id); if (timeline.join()!==ordered.join()) throw new BriefError("VALIDATION");
  for (const key of ["missing","conflicts","questions","uncertainty"]) { if (!Array.isArray(r[key]) || (r[key] as unknown[]).length>12) throw new BriefError("VALIDATION"); for (const v of r[key] as unknown[]) text(v); }
  if (!(r.uncertainty as unknown[]).length || !(r.questions as unknown[]).length) throw new BriefError("VALIDATION");
  text(r.draft);
  if (JSON.stringify(raw).length>24000) throw new BriefError("VALIDATION");
  return structuredClone(r) as BriefOutput;
}
