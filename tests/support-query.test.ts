import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSupportQuery,
  supportWorkbenchParams,
} from "../lib/admin/support-query";
import { readWorkbenchNavigation } from "../lib/admin/workbench-navigation";
import { caseNavigationHref } from "../lib/admin/case-history-navigation";
test("Support query defaults, exact typed IDs and bounded pagination", () => {
  assert.deepEqual(parseSupportQuery(new URLSearchParams()), {
    caseType: "ALL",
    caseState: "OPEN",
    caseId: null,
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(
    parseSupportQuery(
      new URLSearchParams(
        "caseType=REPORT&caseState=RESOLVED&caseId=42&page=2&pageSize=5",
      ),
    ),
    {
      caseType: "REPORT",
      caseState: "RESOLVED",
      caseId: 42,
      page: 2,
      pageSize: 5,
    },
  );
  for (const raw of [
    "caseId=1",
    "caseType=__proto__",
    "caseState=COMPLETED",
    "caseType=REPORT&caseType=DISPUTE",
    "page=0",
    "page=10001",
    "pageSize=51",
    "caseType=REPORT&caseId=1%20OR%201=1",
    "caseType=DISPUTE&caseId=2147483648",
    "pageSize=NaN",
  ])
    assert.throws(() => parseSupportQuery(new URLSearchParams(raw)));
});
test("Support never accepts actor, evidence, assignment, ticket or redirect selectors", () => {
  for (const key of [
    "userId",
    "actorId",
    "role",
    "staffRole",
    "assignedTo",
    "ticketId",
    "evidenceId",
    "bookingId",
    "listingId",
    "returnTo",
    "returnUrl",
    "q",
    "description",
  ])
    assert.throws(() =>
      parseSupportQuery(new URLSearchParams({ [key]: "private-or-forged" })),
    );
});
test("Support filters cannot select a Workbench case or leak into its closed envelope", () => {
  const q = new URLSearchParams(
      "caseType=DISPUTE&caseState=ALL&caseId=1&page=2&pageSize=5&wbCategory=OPEN_REPORTS&wbRecordId=42&wbPage=3&wbPageSize=20",
    ),
    p = supportWorkbenchParams(q);
  assert.equal(
    readWorkbenchNavigation(p).backHref,
    "/admin/workbench?category=OPEN_REPORTS&page=3&pageSize=20&recordId=42",
  );
  assert.equal(
    caseNavigationHref("/admin/disputes/1/history", p),
    "/admin/disputes/1/history?wbCategory=OPEN_REPORTS&wbPage=3&wbPageSize=20&wbRecordId=42",
  );
  for (const extra of [
    "&wbPage=4",
    "&wbCategory=constructor",
    "&returnTo=https://evil.invalid",
  ])
    assert.equal(
      readWorkbenchNavigation(
        supportWorkbenchParams(new URLSearchParams(q + extra)),
      ).state,
      "invalid",
    );
});
