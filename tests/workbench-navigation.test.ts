import { test } from "node:test";
import assert from "node:assert/strict";
import {
  investigationHref,
  readWorkbenchNavigation,
} from "../lib/admin/workbench-navigation";
test("Workbench context round-trips only category, exact ID and bounded pagination", () => {
  const view = {
    category: "OPEN_REPORTS" as const,
    recordId: 42,
    page: 3,
    pageSize: 20,
  };
  const href = investigationHref("/admin/reports/42", view),
    read = readWorkbenchNavigation(
      new URL(href, "https://fixture.test").searchParams,
    );
  assert.deepEqual(read.view, view);
  assert.equal(
    read.backHref,
    "/admin/workbench?category=OPEN_REPORTS&page=3&pageSize=20&recordId=42",
  );
});
test("absent context preserves standalone details and supplies a fixed local fallback", () => {
  assert.deepEqual(readWorkbenchNavigation(new URLSearchParams()), {
    state: "absent",
    view: null,
    backHref: "/admin/workbench",
  });
});
test("forged, external, private, repeated and out-of-bounds navigation metadata is discarded", () => {
  for (const raw of [
    "returnTo=https://evil.invalid",
    "returnTo=//evil.invalid",
    "returnUrl=/admin/users/1",
    "wbCategory=__proto__",
    "wbCategory=constructor",
    "wbCategory=OPEN_REPORTS&wbPage=10001",
    "wbCategory=OPEN_REPORTS&wbPageSize=51",
    "wbCategory=OPEN_REPORTS&wbRecordId=1%20OR%201=1",
    "wbCategory=OPEN_REPORTS&wbCategory=OPEN_REPORTS",
    "wbCategory=OPEN_REPORTS&role=ADMIN",
    "wbCategory=OPEN_REPORTS&description=private-canary",
    "wbCategory=OPEN_REPORTS&wbPage=0",
    "wbCategory=OPEN_REPORTS&wbRecordId=2147483648",
  ]) {
    const result = readWorkbenchNavigation(new URLSearchParams(raw));
    assert.equal(result.state, "invalid", raw);
    assert.equal(result.backHref, "/admin/workbench");
    assert.equal(result.view, null);
  }
});
test("sender cannot produce an external or unrelated detail path", () => {
  const view = {
    category: "BOOKING_CASES" as const,
    recordId: null,
    page: 1,
    pageSize: 10,
  };
  for (const path of [
    "https://evil.invalid",
    "//evil.invalid",
    "/admin/users/1",
    "/admin/bookings/1?returnTo=x",
    "/admin/bookings/../users/1",
    "/admin/bookings/0",
  ])
    assert.throws(() => investigationHref(path, view));
  assert.throws(() =>
    investigationHref("/admin/bookings/1", { ...view, page: 10001 }),
  );
});
