import {
  workbenchCategories,
  type WorkbenchCategory,
} from "./workbench-catalog";
export type WorkbenchView = {
  category: WorkbenchCategory;
  recordId: number | null;
  page: number;
  pageSize: number;
};

/** Navigation metadata only. Never used as a record selector or authority. */
export function readWorkbenchNavigation(params: URLSearchParams): {
  state: "valid" | "absent" | "invalid";
  view: WorkbenchView | null;
  backHref: string;
} {
  const fallback = { view: null, backHref: "/admin/workbench" };
  if (![...params.keys()].length) return { ...fallback, state: "absent" };
  const keys = ["wbCategory", "wbRecordId", "wbPage", "wbPageSize"];
  for (const key of params.keys())
    if (!keys.includes(key) || params.getAll(key).length !== 1)
      return { ...fallback, state: "invalid" };
  const category = params.get("wbCategory");
  if (!category || !Object.hasOwn(workbenchCategories, category))
    return { ...fallback, state: "invalid" };
  const integer = (key: string, fallback: number, max: number) => {
    const value = params.get(key);
    if (value === null) return fallback;
    return /^[1-9]\d*$/.test(value) && Number(value) <= max
      ? Number(value)
      : null;
  };
  const page = integer("wbPage", 1, 10000),
    pageSize = integer("wbPageSize", 10, 50),
    recordId = params.has("wbRecordId")
      ? integer("wbRecordId", 1, 2147483647)
      : null;
  if (
    page === null ||
    pageSize === null ||
    (params.has("wbRecordId") && recordId === null)
  )
    return { ...fallback, state: "invalid" };
  const view: WorkbenchView = {
    category: category as WorkbenchCategory,
    recordId,
    page,
    pageSize,
  };
  const back = new URLSearchParams({
    category,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (recordId !== null) back.set("recordId", String(recordId));
  return { state: "valid", view, backHref: `/admin/workbench?${back}` };
}
export function investigationHref(pathname: string, view: WorkbenchView) {
  if (
    !/^\/admin\/(?:(bookings|listings|reports|disputes)\/[1-9]\d*|(?:reports|disputes)\/[1-9]\d*\/history|case-audit\/[1-9]\d*)$/.test(pathname)
  )
    throw Error("Invalid investigation detail path.");
  const params = new URLSearchParams({
    wbCategory: view.category,
    wbPage: String(view.page),
    wbPageSize: String(view.pageSize),
  });
  if (view.recordId !== null) params.set("wbRecordId", String(view.recordId));
  // Validate even server-provided views; output is always a fixed local detail path.
  if (readWorkbenchNavigation(params).state !== "valid")
    throw Error("Invalid workbench view.");
  return `${pathname}?${params}`;
}
