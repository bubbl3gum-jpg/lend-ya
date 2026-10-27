import type { Manifest } from "./contracts";
import { validateOutput } from "./validation";
export const QUALITY_RUBRIC_VERSION = "case-brief-quality-v1";
export const qualityDimensions = ["factuality", "entailment", "privacy", "injection", "translation", "draft"] as const;
export type QualityFlagCode = "UNVERIFIED_INTERPRETATION" | "SOURCE_CLAIM_REVIEW" | "NOVEL_NUMBER" | "COMPLETION_REVIEW" | "ACCUSATION_REVIEW" | "PRIVACY_ACCESS_REVIEW" | "AUTHORITY_REVIEW" | "LANGUAGE_REVIEW" | "CONFLICT_COVERAGE_REVIEW";
export type QualityFlag = { code: QualityFlagCode; claim: number | null; refs: string[] };
/** Transparent review hints, NOT semantic truth, a quality score, permission or model-safety certification. */
export function inspectBriefQuality(manifest: Manifest, raw: unknown) {
  let output;
  try { output = validateOutput(raw, manifest); }
  catch { return { structural: "FAILED" as const, rubric: QUALITY_RUBRIC_VERSION, flags: [] as QualityFlag[], humanReview: "UNREVIEWED" as const, dimensions: qualityDimensions.map(id => ({ id, score: null })) }; }
  const flags: QualityFlag[] = [];
  const claims = [...output.summary, ...output.observations];
  for (const [index, claim] of claims.entries()) {
    const add = (code: QualityFlagCode) => flags.push({ code, claim: index, refs: [...claim.refs] });
    if (claim.basis === "INTERPRETATION") add("UNVERIFIED_INTERPRETATION");
    if (claim.refs.some(id => manifest.sources.find(s => s.id === id)?.kind === "PARTICIPANT_CLAIM")) add("SOURCE_CLAIM_REVIEW");
    const citedNumbers=new Set(manifest.sources.filter(s=>claim.refs.includes(s.id)).flatMap(s=>(s.excerpt+" "+s.at).match(/\d+/g)??[]));
    if ((claim.text.match(/\d+/g) ?? []).some(n => !citedNumbers.has(n))) add("NOVEL_NUMBER");
    if (/(?:handoff (?:is |was )?complete|confirmed handoff|已完成交接|交接已完成)/i.test(claim.text)) add("COMPLETION_REVIEW");
    if (/(?:theft|stole|guilty|偷竊|有罪)/i.test(claim.text)) add("ACCUSATION_REVIEW");
    if (/(?:read|access|saw|查看|讀取).{0,45}(?:private|transcript|私人|對話紀錄)/i.test(claim.text)) add("PRIVACY_ACCESS_REVIEW");
    if (/(?:approved? (?:a |the )?refund|grant(?:ed)? .{0,15}(?:role|permission)|已核准退款|授予權限)/i.test(claim.text)) add("AUTHORITY_REVIEW");
    if (manifest.language === "zh-TW" && !/[\u3400-\u9fff]/.test(claim.text)) add("LANGUAGE_REVIEW");
  }
  if (/(?:approved? (?:a |the )?refund|grant(?:ed)? .{0,15}(?:role|permission)|已核准退款|授予權限)/i.test(output.draft)) flags.push({code:"AUTHORITY_REVIEW",claim:null,refs:[]});
  if (/(?:read|access|saw|查看|讀取).{0,45}(?:private|transcript|私人|對話紀錄)/i.test(output.draft)) flags.push({code:"PRIVACY_ACCESS_REVIEW",claim:null,refs:[]});
  if (manifest.conflicts.length && !output.conflicts.length) flags.push({ code: "CONFLICT_COVERAGE_REVIEW", claim: null, refs: [] });
  return { structural: "VALID" as const, rubric: QUALITY_RUBRIC_VERSION, flags, humanReview: "UNREVIEWED" as const, dimensions: qualityDimensions.map(id => ({ id, score: null })) };
}
