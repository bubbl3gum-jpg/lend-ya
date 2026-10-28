/** Provider-independent design; no provider or production activation exists. */
export const identityStates = ["NOT_STARTED", "PENDING", "VERIFIED", "RETRY_REQUIRED", "MANUAL_REVIEW", "REJECTED", "EXPIRED", "REVOKED"] as const;
export type IdentityState = typeof identityStates[number];
export const documents = ["TW_NATIONAL_ID", "TW_ARC"] as const;
export type DocumentType = typeof documents[number];
export const scenarios = ["SUCCESS", "DOCUMENT_RETRY", "LIVENESS_RETRY", "MATCH_RETRY", "MANUAL_REVIEW", "REJECTED"] as const;
export type Scenario = typeof scenarios[number];
export type IdentityResultContract = {
  userId: number; attemptId: string; jurisdiction: "TW"; documentType: DocumentType;
  documentVersion: string; policyVersion: string; providerReference: string;
  state: IdentityState; occurredAt: string; verifiedAt: string | null; expiresAt: string | null;
  invalidatedAt: string | null;
  // Each requires independently validated provider provenance, not OCR or a browser assertion.
  documentAuthenticity: "UNPROVEN" | "CONFIRMED";
  liveness: "UNPROVEN" | "CONFIRMED";
  faceToDocumentMatch: "UNPROVEN" | "CONFIRMED";
};
export type EventVerificationContract = {
  participantId: number; bookingId: number; purpose: "PICKUP" | "RETURN";
  sessionIncarnation: string; challengeId: string; serverSelectedChallenge: string;
  issuedAt: string; expiresAt: string; consumedAt: string | null;
  policyVersion: string; providerAttestationReference: string | null;
};
/** Intentionally inert. Nothing (including a forged or synthetic VERIFIED result) grants eligibility. */
export function futureParticipationEligibility(operation: "PUBLISH_LISTING" | "SUBMIT_RENTAL_REQUEST", _untrusted: unknown) {
  void _untrusted;
  if (!["PUBLISH_LISTING", "SUBMIT_RENTAL_REQUEST"].includes(operation)) throw Error("UNKNOWN_OPERATION");
  return { eligible: false as const, reason: "NO_APPROVED_PROVIDER_OR_PRODUCTION_CUTOVER" as const };
}
export type Command =
  | { action: "BEGIN"; expectedVersion: number; documentType: DocumentType; scenario: Scenario }
  | { action: "ADVANCE" | "RESET" | "REVOKE"; expectedVersion: number }
  | { action: "CHALLENGE"; expectedVersion: number; bookingId: number }
  | { action: "COMPLETE_CHALLENGE"; expectedVersion: number; challengeId: string };
export function commandInput(raw: unknown): Command {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("INPUT");
  const r = raw as Record<string, unknown>;
  const extra = r.action === "BEGIN" ? ["documentType", "scenario"] : r.action === "CHALLENGE" ? ["bookingId"] : r.action === "COMPLETE_CHALLENGE" ? ["challengeId"] : [];
  const keys = ["action", "expectedVersion", ...extra];
  if (!["BEGIN", "ADVANCE", "RESET", "REVOKE", "CHALLENGE", "COMPLETE_CHALLENGE"].includes(r.action as string) || Object.keys(r).length !== keys.length || keys.some(k => !Object.hasOwn(r, k)) || !Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0 || Number(r.expectedVersion) > 10000) throw Error("INPUT");
  if (r.action === "BEGIN" && (!(documents as readonly unknown[]).includes(r.documentType) || !(scenarios as readonly unknown[]).includes(r.scenario))) throw Error("INPUT");
  if (r.action === "CHALLENGE" && (!Number.isSafeInteger(r.bookingId) || Number(r.bookingId) < 1 || Number(r.bookingId) > 2147483647)) throw Error("INPUT");
  if (r.action === "COMPLETE_CHALLENGE" && (typeof r.challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(r.challengeId))) throw Error("INPUT");
  return r as Command;
}
