import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("Prisma's resolved deepmerge dependency handles recursive configuration graphs without exhausting the stack", () => {
  // Regression for GHSA-ggr8-5vv4-36mx. A separate process bounds both time and
  // stack/memory impact if this lockfile ever regresses; no database is opened.
  const script = `
    import { deepmerge } from "deepmerge-ts";
    import assert from "node:assert/strict";
    const first = { a: 1 }; first.self = first;
    const second = { b: 2 }; second.self = second;
    const result = deepmerge(first, second);
    assert.equal(result.a, 1); assert.equal(result.b, 2);
    assert.equal(result.self, result);
  `;
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=64", "--input-type=module", "-e", script],
    { timeout: 3000, encoding: "utf8" },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(
    result.status,
    0,
    "Recursive merge must complete within the bounded process, not throw or exhaust the stack",
  );
});
