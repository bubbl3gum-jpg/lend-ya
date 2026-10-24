import {
  readWorkbenchNavigation,
  investigationHref,
} from "./workbench-navigation";

/** Closed history pagination is separate from navigation, never an authority. */
export function historyNavigation(params: URLSearchParams) {
  const navigationParams = new URLSearchParams(params);
  navigationParams.delete("historyPage");
  return readWorkbenchNavigation(navigationParams);
}
export function historyPage(params: URLSearchParams) {
  const values = params.getAll("historyPage");
  if (!values.length) return 1;
  if (
    values.length !== 1 ||
    !/^[1-9]\d*$/.test(values[0]) ||
    Number(values[0]) > 10000
  )
    return null;
  return Number(values[0]);
}
export function caseNavigationHref(path: string, params: URLSearchParams) {
  const navigation = historyNavigation(params);
  const checked = investigationHref(
    path,
    navigation.view ?? {
      category: "OPEN_REPORTS",
      recordId: null,
      page: 1,
      pageSize: 10,
    },
  );
  return navigation.view ? checked : path;
}
