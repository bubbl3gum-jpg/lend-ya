import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historyNavigation,
  historyPage,
  caseNavigationHref,
} from "../lib/admin/case-history-navigation";
test("closed history pagination is independent of the exact Workbench return view", () => {
  const p = new URLSearchParams(
    "wbCategory=OPEN_DISPUTES&wbRecordId=42&wbPage=3&wbPageSize=20&historyPage=2",
  );
  assert.equal(historyPage(p), 2);
  assert.equal(
    historyNavigation(p).backHref,
    "/admin/workbench?category=OPEN_DISPUTES&page=3&pageSize=20&recordId=42",
  );
  for (const path of [
    "/admin/reports/5/history",
    "/admin/disputes/5/history",
    "/admin/case-audit/7",
  ]) {
    const href = caseNavigationHref(path, p);
    assert.ok(href.startsWith(path + "?wbCategory=OPEN_DISPUTES"));
    assert.ok(!href.includes("historyPage"));
  }
});
test("forged, repeated and arbitrary context never becomes a redirect or selector", () => {
  for (const q of [
    "wbCategory=OPEN_REPORTS&actorId=1",
    "wbCategory=OPEN_REPORTS&evidenceId=1",
    "wbCategory=OPEN_REPORTS&returnTo=https://evil.invalid",
    "wbCategory=constructor",
    "wbCategory=OPEN_REPORTS&wbCategory=OPEN_REPORTS",
  ]) {
    const p = new URLSearchParams(q);
    assert.equal(historyNavigation(p).state, "invalid");
    assert.equal(historyNavigation(p).backHref, "/admin/workbench");
    assert.equal(
      caseNavigationHref("/admin/reports/1/history", p),
      "/admin/reports/1/history",
    );
  }
});
test("invalid history pages cannot cause unbounded pagination", () => {
  for (const q of [
    "historyPage=0",
    "historyPage=-1",
    "historyPage=10001",
    "historyPage=2&historyPage=3",
    "historyPage=NaN",
    "historyPage=1e2",
  ])
    assert.equal(historyPage(new URLSearchParams(q)), null);
  assert.equal(historyPage(new URLSearchParams()), 1);
});
test("closed route extension does not permit arbitrary URLs, evidence paths or actors", () => {
  const p = new URLSearchParams("wbCategory=OPEN_REPORTS");
  for (const path of [
    "https://evil.invalid",
    "//evil.invalid",
    "/admin/case-audit/1?role=ADMIN",
    "/admin/reports/1/history/evil",
    "/admin/disputes/1/evidence/secret",
    "/admin/users/1",
    "/admin/case-audit/0",
  ]) {
    assert.throws(() => caseNavigationHref(path, p));
    assert.throws(() => caseNavigationHref(path, new URLSearchParams()));
  }
});
