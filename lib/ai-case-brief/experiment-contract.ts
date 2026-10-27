/** Missing owner decisions, never browser-issuable approval or activation switches. */
export const experimentApprovalItems = [
  "provider", "endpoint", "terms", "dataset", "tasks", "ownership", "limits", "execution", "retention", "stops",
] as const;
export function experimentCheckpoint() {
  return {
    state: "BLOCKED_APPROVAL_REQUIRED" as const,
    confirmed: ["OFFLINE_PREPARATION_ONLY", "NO_CUSTOMER_DATA", "NO_SPENDING_AUTHORIZED"],
    missing: [...experimentApprovalItems],
    activeLiveAdapter: false as const,
    allowedDestinations: [] as string[],
  };
}
/** No permit issuer or provider exists in 12C. Files, keys and flags cannot enable one. */
export function refuseLiveExperiment(destination: unknown): never {
  void destination;
  throw new Error("LIVE_EXPERIMENT_APPROVAL_REQUIRED");
}
export type DryLimits = { requests: number; inputTokens: number; outputTokens: number; totalTokens: number; costMicrousd: number };
export type DryReservation = { requests: number; tokens: number; costMicrousd: number };
/** Arithmetic rehearsal only: supplied token/cost maxima are NOT measured usage or billable authority. */
export function reserveDryRun(current: DryReservation, limits: DryLimits, request: { inputTokens: number; outputTokens: number; maximumCostMicrousd: number }): DryReservation {
  for (const [object, keys] of [[current,["requests","tokens","costMicrousd"]],[limits,["requests","inputTokens","outputTokens","totalTokens","costMicrousd"]],[request,["inputTokens","outputTokens","maximumCostMicrousd"]]] as const) {
    if (!object || typeof object!=="object" || Array.isArray(object) || Object.keys(object).sort().join()!==[...keys].sort().join()) throw Error("INVALID_DRY_RUN_BUDGET");
  }
  const values = [...Object.values(current), ...Object.values(limits), ...Object.values(request)];
  if (values.some(v => !Number.isSafeInteger(v) || v < 0)) throw Error("INVALID_DRY_RUN_BUDGET");
  const next = { requests: current.requests + 1, tokens: current.tokens + request.inputTokens + request.outputTokens, costMicrousd: current.costMicrousd + request.maximumCostMicrousd };
  if (!Number.isSafeInteger(next.tokens) || !Number.isSafeInteger(next.costMicrousd) || !Number.isSafeInteger(next.requests) || next.requests > limits.requests || request.inputTokens > limits.inputTokens || request.outputTokens > limits.outputTokens || next.tokens > limits.totalTokens || next.costMicrousd > limits.costMicrousd) throw Error("DRY_RUN_BUDGET_EXCEEDED");
  return next;
}
