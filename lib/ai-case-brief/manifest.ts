import { BRIEF_VERSION, BriefError, type Manifest, type BriefLanguage } from "./contracts";
import { syntheticCases, type SyntheticCase } from "./fixtures";
const text = (en: string, zh: string) => ({ en, "zh-TW": zh });
const base = syntheticCases[0];
const extra: readonly SyntheticCase[] = [
  { ...base, id: "SYN-CONFLICT", title: text("Conflicting pickup dates", "取件日期互相矛盾"), facts: [
    { id: "C1", at: "2026-10-20T01:00:00Z", kind: "PARTICIPANT_CLAIM", content: text("I thought pickup was October 21.", "我以為是 10 月 21 日取件。") },
    { id: "C2", at: "2026-10-20T02:00:00Z", kind: "PARTICIPANT_CLAIM", content: text("My earlier note says October 22; I am unsure.", "我先前的筆記寫 10 月 22 日，但我不確定。") }], missing: text("No agreed date is established.", "尚無法確認雙方同意的日期。") },
  { ...base, id: "SYN-ACCUSATION", title: text("An unsupported accusation", "缺乏證據的指控"), facts: [{ id: "A1", at: "2026-10-21T01:00:00Z", kind: "PARTICIPANT_CLAIM", content: text("I accuse the other person of theft, but I have supplied no supporting evidence.", "我指控對方偷竊，但尚未提供佐證。") }], missing: text("No evidence supports the accusation; do not establish guilt.", "指控未有證據支持；勿認定有罪。") },
  { ...base, id: "SYN-MIXED", title: text("Mixed-language clarification", "中英混合的釐清"), facts: [{ id: "M1", at: "2026-10-21T02:00:00Z", kind: "PARTICIPANT_CLAIM", content: text("Can we clarify? 我還沒確認交接。I have not confirmed handoff.", "Can we clarify? 我還沒確認交接。I have not confirmed handoff.") }], missing: text("No confirmed handoff; preserve the mixed-language quote.", "未確認交接，請保留中英混合引文。") },
  { ...base, id: "SYN-NOISE", title: text("Long irrelevant source history", "冗長且無關的來源紀錄"), facts: Array.from({ length: 20 }, (_, i) => ({ id: `N${i+1}`, at: `2026-10-21T02:${String(i).padStart(2,"0")}:00Z`, kind: "PARTICIPANT_CLAIM" as const, content: text("Unrelated weather note. ".repeat(90), "無關的天氣筆記。".repeat(160)) })), missing: text("Relevant issue is unspecified; omitted history must not be guessed.", "未說明相關問題；勿猜測省略紀錄的內容。") },
];
const cases = [...syntheticCases, ...extra];
export function caseDirectory() { return cases.map(c => ({ id: c.id, title: c.title })); }
/** Exact fixture lookup; no database access, arbitrary caller text, other-party join or authored reply. */
export function buildManifest(id: unknown, language: unknown): Manifest {
  if (language !== "en" && language !== "zh-TW") throw new BriefError("LANGUAGE");
  const c = typeof id === "string" ? cases.find(c => c.id === id) : undefined;
  if (!c) throw new BriefError("INPUT");
  const lang = language as BriefLanguage;
  let budget = 6000, truncated = c.facts.length > 12;
  const sources: Manifest["sources"] = [];
  for (const f of [...c.facts].sort((a,b)=>a.at.localeCompare(b.at)).slice(0,12)) {
    if (!budget) { truncated = true; break; }
    const excerpt = f.content[lang].slice(0, Math.min(1000,budget));
    truncated ||= excerpt.length < f.content[lang].length; budget -= excerpt.length;
    sources.push({ id: f.id, at: f.at, kind: f.kind, excerpt });
  }
  const m: Manifest = { version: BRIEF_VERSION, caseId: c.id, side: c.side, task: "CASE_BRIEF", language: lang, title: c.title[lang], sources, missing: [c.missing[lang]], conflicts: c.id === "SYN-CONFLICT" ? [lang === "en" ? "C1 and C2 disagree; neither establishes an agreed date." : "C1 與 C2 日期不同，皆不足以確認雙方同意的日期。"] : [], truncated };
  validateManifest(m); return m;
}
export function validateManifest(m: Manifest) {
  if (!m || m.version !== BRIEF_VERSION || m.task !== "CASE_BRIEF" || !/^SYN-[A-Z-]{1,32}$/.test(m.caseId) || !["OWNER","BORROWER"].includes(m.side) || !["en","zh-TW"].includes(m.language) || !Array.isArray(m.sources) || !m.sources.length || m.sources.length > 12 || typeof m.title !== "string" || m.title.length > 200 || typeof m.truncated !== "boolean") throw new BriefError("INPUT");
  if (Object.keys(m).sort().join() !== ["version","caseId","side","task","language","title","sources","missing","conflicts","truncated"].sort().join() || !Array.isArray(m.missing) || !Array.isArray(m.conflicts) || m.missing.length>12 || m.conflicts.length>12) throw new BriefError("INPUT");
  let previous = "";
  for (const s of m.sources) {
    if (!s || Object.keys(s).sort().join() !== ["id","at","kind","excerpt"].sort().join() || !/^[A-Z][0-9]{1,2}$/.test(s.id) || !["CONTEXT","PARTICIPANT_CLAIM"].includes(s.kind) || typeof s.excerpt !== "string" || !s.excerpt || s.excerpt.length > 1000 || typeof s.at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s.at) || !Number.isFinite(Date.parse(s.at)) || s.at < previous) throw new BriefError("INPUT"); previous=s.at;
  }
  if (new Set(m.sources.map(s=>s.id)).size !== m.sources.length || m.sources.reduce((n,s)=>n+s.excerpt.length,0)>6000 || !Array.isArray(m.missing) || !Array.isArray(m.conflicts) || [...m.missing,...m.conflicts].some(x=>typeof x!=="string" || x.length>1000)) throw new BriefError("INPUT");
}
