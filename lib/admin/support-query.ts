export const SUPPORT_CASE_TYPES = ["ALL", "REPORT", "DISPUTE"] as const;
export const SUPPORT_CASE_STATES = ["OPEN", "RESOLVED", "ALL"] as const;
export const SUPPORT_NAVIGATION_KEYS = [
  "wbCategory",
  "wbRecordId",
  "wbPage",
  "wbPageSize",
] as const;
export type SupportQuery = {
  caseType: (typeof SUPPORT_CASE_TYPES)[number];
  caseState: (typeof SUPPORT_CASE_STATES)[number];
  caseId: number | null;
  page: number;
  pageSize: number;
};
/** Fixed list filters; separate Workbench context is navigation, not authority. */
export function parseSupportQuery(params: URLSearchParams): SupportQuery {
  const allowed = [
    "caseType",
    "caseState",
    "caseId",
    "page",
    "pageSize",
    ...SUPPORT_NAVIGATION_KEYS,
  ];
  for (const key of params.keys()) {
    if (
      !allowed.includes(key) ||
      (!SUPPORT_NAVIGATION_KEYS.includes(
        key as (typeof SUPPORT_NAVIGATION_KEYS)[number],
      ) &&
        params.getAll(key).length !== 1)
    )
      throw Error("Unknown or repeated Support filter.");
  }
  const caseType = params.get("caseType") ?? "ALL",
    caseState = params.get("caseState") ?? "OPEN";
  if (
    !(SUPPORT_CASE_TYPES as readonly string[]).includes(caseType) ||
    !(SUPPORT_CASE_STATES as readonly string[]).includes(caseState)
  )
    throw Error("Choose a supported case type and state.");
  const integer = (key: string, fallback: number, max: number) => {
    const value = params.get(key);
    if (value === null || value === "") return fallback;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw Error(`Invalid ${key}.`);
    return Number(value);
  };
  const caseId =
    params.has("caseId") && params.get("caseId") !== ""
      ? integer("caseId", 1, 2147483647)
      : null;
  if (caseId !== null && caseType === "ALL")
    throw Error("Choose Reports or Disputes when filtering by case ID.");
  return {
    caseType: caseType as SupportQuery["caseType"],
    caseState: caseState as SupportQuery["caseState"],
    caseId,
    page: integer("page", 1, 10000),
    pageSize: integer("pageSize", 20, 50),
  };
}
/** Remove only the workspace's fixed filters; unknown context remains invalid. */
export function supportWorkbenchParams(params: URLSearchParams) {
  const result = new URLSearchParams(params);
  for (const key of ["caseType", "caseState", "caseId", "page", "pageSize"])
    result.delete(key);
  return result;
}
