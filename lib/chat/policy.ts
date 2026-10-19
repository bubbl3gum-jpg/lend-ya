/** Deterministic review signals, not a legal verdict or multilingual comprehension model. */
export const CHAT_POLICY_VERSION = "deterministic-mvp-1";
export type ModerationOutcome = "ALLOWED" | "FLAGGED" | "HELD" | "REJECTED";
export function normalizeMessage(text: string): string {
  return text.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
export function moderateText(body: string): { outcome: ModerationOutcome; categories: string[]; ruleCodes: string[] } {
  const text = normalizeMessage(body);
  if (!text || body.length > 4000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body))
    return { outcome: "REJECTED", categories: ["TECHNICAL"], ruleCodes: ["INVALID_TEXT"] };
  const categories: string[] = [], ruleCodes: string[] = [];
  let held = false;
  const contextual = /^(do not|don't|never|不要|請勿|别|別|jangan)\b|^(不要|請勿|别|別)|someone (said|wrote)|received (a )?threat|quoted?[: ]|有人(?:說|威脅)|收到.*威脅|kutipan|melaporkan ancaman/.test(text);
  for (const [category, code, pattern] of [
    ["THREATS", "DIRECT_THREAT", /\bi will (kill|hurt|attack) you\b|我要(?:殺|殺死|傷害)你|\baku akan (membunuh|melukai)(mu| kamu)\b/],
    ["ILLEGAL_GOODS", "EXPLICIT_DRUG_OFFER", /\b(selling|i sell|jual|menjual)\b.{0,25}\b(cocaine|methamphetamine|narkoba)\b|(?:販售|出售|賣)毒品/],
    ["PROHIBITED_SOLICITATION", "EXPLICIT_SEX_SERVICE_OFFER", /\bi (offer|sell) paid sex\b|\bmenjual jasa seks\b|(?:提供|招攬)性交易服務/],
  ] as const) {
    if (pattern.test(text)) { categories.push(category); ruleCodes.push(contextual ? `${code}_CONTEXT_REVIEW` : code); if (!contextual) held = true; }
  }
  if (/\bsend (me )?(your )?(otp|verification code)\b|(?:傳|給)我.*驗證碼|\bkirim.{0,20}kode otp\b/.test(text)) { categories.push("SCAMS"); ruleCodes.push("CREDENTIAL_REQUEST"); }
  if (/you are (an? )?(idiot|moron)|你是(?:個)?白痴|\bkamu (itu )?bodoh\b/.test(text)) { categories.push("HARASSMENT"); ruleCodes.push("DIRECT_INSULT"); }
  if (/https?:\/\//i.test(text)) { categories.push("LINK_RISK"); ruleCodes.push("EXTERNAL_LINK_REVIEW"); }
  if (/(.)\1{49}/u.test(text) || (text.match(/https?:\/\//g)?.length ?? 0) >= 3) { categories.push("SPAM"); ruleCodes.push("REPETITIVE_CONTENT"); }
  return { outcome: held ? "HELD" : categories.length ? "FLAGGED" : "ALLOWED", categories: [...new Set(categories)], ruleCodes };
}
