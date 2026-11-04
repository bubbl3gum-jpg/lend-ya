import { test } from "node:test";
import assert from "node:assert/strict";
import { utcPostgresUrl } from "../lib/postgres-utc";

test("UTC adapter binding preserves target and pins timezone after supplied options", () => {
  const source = "postgresql://user:private@localhost:55433/hustlen_test_utc?schema=public&options=-c%20application_name%3Dhustlen%20-c%20timezone%3DAsia%2FTaipei";
  const url = new URL(utcPostgresUrl(source));
  assert.equal(url.hostname, "localhost");
  assert.equal(url.port, "55433");
  assert.equal(url.pathname, "/hustlen_test_utc");
  assert.equal(url.searchParams.get("schema"), "public");
  assert.equal(url.searchParams.get("options"), "-c application_name=hustlen -c timezone=Asia/Taipei -c timezone=UTC");
  assert.equal(new URL(utcPostgresUrl("postgresql://localhost/test")).searchParams.get("options"), "-c timezone=UTC");
  assert.throws(() => utcPostgresUrl("not a URL"));
});
