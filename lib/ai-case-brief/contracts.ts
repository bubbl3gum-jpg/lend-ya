export const BRIEF_VERSION = "synthetic-brief-v1";
export type BriefLanguage = "en" | "zh-TW";
export type BriefCode = "INPUT" | "LANGUAGE" | "VALIDATION" | "REFERENCES" | "UNAVAILABLE" | "TIMEOUT" | "LIMIT" | "CANCELED";
export class BriefError extends Error { constructor(public code: BriefCode) { super(code); } }
export type Manifest = {
  version: typeof BRIEF_VERSION; caseId: string; side: "OWNER" | "BORROWER";
  task: "CASE_BRIEF"; language: BriefLanguage; title: string;
  sources: { id: string; at: string; kind: "CONTEXT" | "PARTICIPANT_CLAIM"; excerpt: string }[];
  missing: string[]; conflicts: string[]; truncated: boolean;
};
export type Claim = { text: string; refs: string[]; basis: "SOURCE_EXCERPT" | "INTERPRETATION" };
export type BriefOutput = {
  version: typeof BRIEF_VERSION; caseId: string; language: BriefLanguage;
  summary: Claim[]; observations: Claim[]; timeline: string[];
  category: "SCHEDULING" | "CONDITION" | "CLARIFICATION" | "UNTRUSTED_CONTENT";
  missing: string[]; conflicts: string[]; questions: string[]; draft: string;
  uncertainty: string[]; requiresHumanReview: true;
};
export interface BriefAdapter { readonly id: string; readonly model: string; generate(manifest: Readonly<Manifest>, signal: AbortSignal): Promise<unknown>; }
export type BriefResult = { provenance: "SIMULATED_NO_MODEL"; adapter: string; model: "NONE"; output: BriefOutput };
