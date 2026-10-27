/** Synthetic demonstration only. Never authorizes staff, case access or a provider. */
export function syntheticBriefEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === "development" && env.HUSTLEN_AI_CASE_BRIEF_DEMO === "synthetic-only";
}
