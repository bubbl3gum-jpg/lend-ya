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

test("fast-uri rejects encoded schemes and ambiguous hosts and preserves relative-reference meaning", () => {
  // Focused vectors from fast-uri 3.1.9's scheme-validation,
  // relative-normalization-security and host-delimiter-security regressions.
  const script = `
    import uri from "fast-uri";
    import assert from "node:assert/strict";
    assert.equal(uri.parse("%6Aavascript:alert(1)").error,"URI scheme is malformed.");
    assert.equal(uri.equal("../x","x"),false);
    assert.equal(uri.parse("http://a@b@evil.example/").error,"URI host is malformed.");
    assert.equal(uri.parse(uri.serialize({scheme:"x",path:"javascript:alert(1)"},{reference:"suffix"})).scheme,undefined);
  `;
  const result=spawnSync(process.execPath,["--max-old-space-size=64","--input-type=module","-e",script],{timeout:3000,encoding:"utf8"});
  assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,0,result.stderr);
});

test("Zod rejects an oversized constrained array before expanding per-element errors", () => {
  // GHSA-mrhx-c7xc-m3w5: bound memory/time in a child; sparse input itself is small.
  const script = `
    import { z } from "zod";
    import { writeSync } from "node:fs";
    import assert from "node:assert/strict";
    const phase = (name) => writeSync(2, JSON.stringify({phase:name,atMs:performance.now()}) + "\\n");
    phase("imports-complete");
    const result = z.array(z.string()).max(2).safeParse(new Array(100000));
    phase("parse-complete");
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, "too_big");
    assert.equal(result.error.issues[0].maximum, 2);
    assert.deepEqual(z.array(z.string()).max(2).parse(["item"]), ["item"]);
    phase("assertions-complete");
  `;
  const started = performance.now();
  const result = spawnSync(process.execPath,
    ["--max-old-space-size=64", "--input-type=module", "-e", script],
    { timeout: 3000, encoding: "utf8" });
  const evidence = { wallMs: performance.now() - started, status: result.status, signal: result.signal, error: result.error?.message, phases: result.stderr };
  console.log("Zod bounded-child evidence:", JSON.stringify(evidence));
  assert.equal(result.error, undefined, JSON.stringify(evidence));
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
});
