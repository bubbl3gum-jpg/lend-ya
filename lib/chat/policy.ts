/** Explainable review signals, not a legal verdict or comprehensive language understanding. */
export const CHAT_POLICY_VERSION = "deterministic-2.2-1";
export type ModerationOutcome = "ALLOWED" | "FLAGGED" | "HELD" | "REJECTED";
export function normalizeMessage(text: string): string {
  return text.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
/** De-obfuscate only a narrow risk vocabulary. Never rewrite stored/displayed text. */
export function analysisText(body: string): string {
  return normalizeMessage(body).replace(/[a-z0-9@$!|]+/g, token => {
    const decoded = token.replace(/[034157@$!|]/g, c => ({"0":"o","3":"e","4":"a","1":"i","5":"s","7":"t","@":"a","$":"s","!":"i","|":"i"}[c]!));
    return /^(cocaine|methamphetamine|narkoba|heroin|otp|password|kill|seks)$/.test(decoded) ? decoded : token;
  }).replace(/\b(c)[. _-]+(o)[. _-]+(c)[. _-]+(a)[. _-]+(i)[. _-]+(n)[. _-]+(e)\b/g,"cocaine");
}
const directThreat = /\b(?:i (?:will|am going to)|i'll) (?:kill|hurt|attack|stab|shoot) you\b|我要(?:殺|殺死|傷害|刺傷)你|\b(?:aku|saya) (?:akan|mau) (?:membunuh|melukai|menyerang)(?:mu| kamu)\b/;
const drugOffer = /\b(?:selling|sell|i sell|offering|jual|menjual|tersedia)\b.{0,35}\b(?:cocaine|methamphetamine|narkoba|heroin)\b|(?:販售|出售|賣|有貨).{0,12}(?:毒品|海洛因|古柯鹼)|\b(?:cocaine|narkoba|heroin)\b.{0,20}\b(?:for sale|dijual)\b/;
const serviceOffer = /\b(?:i offer|i sell|selling|offering) (?:paid sex|sexual services)\b|\b(?:menjual|menawarkan) jasa seks\b|(?:提供|招攬|出售)性交易服務/;
function contextual(clause: string) {
  return /^(?:do not|don't|never|please don't|jangan|dilarang)\b|^(?:不要|請勿|別)|\b(?:someone (?:said|wrote)|received (?:a )?threat|reporting|reported|quote|quoted|educational example|training example|lesson example|melaporkan|kutipan|contoh edukasi)\b|(?:有人說|有人威脅|收到.*威脅|教學範例|課堂範例)/.test(clause);
}
function figurative(clause: string) {
  return /\b(?:with (?:kindness|laughter)|in (?:the |a )?(?:game|video game|chess match)|on (?:the |a )?(?:game|chess) board)\b|(?:遊戲裡|遊戲中|棋盤上)|\b(?:di game|dalam permainan)\b/.test(clause)
    && !/\b(?:knife|gun|weapon|outside your home|really|for real)\b|(?:刀|槍|真的殺)|\b(?:pisau|senjata|sungguhan)\b/.test(clause);
}
export function moderateText(body: string): { outcome: ModerationOutcome; categories: string[]; ruleCodes: string[] } {
  const text = analysisText(body.replace(/\r?\n/g,";"));
  if (!normalizeMessage(body) || body.length > 4000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body))
    return { outcome: "REJECTED", categories: ["TECHNICAL"], ruleCodes: ["INVALID_TEXT"] };
  const categories = new Set<string>(), codes = new Set<string>(); let held = false;
  // Scope negation/reporting to clauses: a harmless prefix cannot immunize a later direct offer/threat.
  const clauses = text.split(/[;。！？\n]|\.(?:\s|$)|\bbut\b|\bhowever\b|\btapi\b|\btetapi\b|但是|然而/).map(c=>c.trim()).filter(Boolean);
  for (const clause of clauses) {
    const context = contextual(clause);
    for (const [category, code, pattern] of [
      ["THREATS","DIRECT_THREAT",directThreat],
      ["ILLEGAL_GOODS","EXPLICIT_DRUG_OFFER",drugOffer],
      ["PROHIBITED_SOLICITATION","EXPLICIT_SEX_SERVICE_OFFER",serviceOffer],
    ] as const) {
      if (!pattern.test(clause)) continue;
      if (category === "THREATS" && figurative(clause) && !context) { codes.add("FIGURATIVE_THREAT_CONTEXT"); continue; }
      categories.add(category); codes.add(context ? `${code}_CONTEXT_REVIEW` : code); if (!context) held = true;
    }
    if (/\bsend (?:me )?(?:your )?(?:otp|verification code|password)\b|(?:傳|給)我.*(?:驗證碼|密碼)|\bkirim.{0,20}(?:kode otp|password|kata sandi)\b|\bpay.{0,25}(?:gift cards?|crypto wallet)\b|(?:付款|支付).{0,12}(?:禮品卡|私人錢包)|\bbayar.{0,20}(?:kartu hadiah|dompet kripto)\b/.test(clause)) { categories.add("SCAMS"); codes.add(context?"SCAM_CONTEXT_REVIEW":"CREDENTIAL_OR_PAYMENT_RISK"); }
    if (/\byou are (?:an? )?(?:idiot|moron)\b|你是(?:個)?白痴|\bkamu (?:itu )?bodoh\b/.test(clause)) { categories.add("HARASSMENT");codes.add(context?"INSULT_CONTEXT_REVIEW":"DIRECT_INSULT"); }
  }
  if (/https?:\/\//i.test(text)) { categories.add("LINK_RISK");codes.add("EXTERNAL_LINK_REVIEW"); }
  if (/(.)\1{49}/u.test(text) || (text.match(/https?:\/\//g)?.length ?? 0) >= 3) { categories.add("SPAM");codes.add("REPETITIVE_CONTENT"); }
  return {outcome:held?"HELD":categories.size?"FLAGGED":"ALLOWED",categories:[...categories],ruleCodes:[...codes]};
}
