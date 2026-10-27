import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { syntheticBriefEnabled } from "../lib/ai-case-brief/config";
import { syntheticCases, syntheticCase, validFixtureReferences } from "../lib/ai-case-brief/fixtures";
test("synthetic notebook is denied without exact development configuration, including accidentally configured production", () => {
  for (const mode of [undefined, "production", "test", "Development"])
    assert.equal(syntheticBriefEnabled({ NODE_ENV: mode, HUSTLEN_AI_CASE_BRIEF_DEMO: "synthetic-only" }), false);
  for (const flag of [undefined, "true", "1", "live", "SYNTHETIC-ONLY"])
    assert.equal(syntheticBriefEnabled({ NODE_ENV: "development", HUSTLEN_AI_CASE_BRIEF_DEMO: flag }), false);
  assert.equal(syntheticBriefEnabled({ NODE_ENV: "development", HUSTLEN_AI_CASE_BRIEF_DEMO: "synthetic-only" }), true);
});
test("fixture-only selectors reject unrelated database IDs and forged names", () => {
  for (const id of [undefined, 1, {}, [], "1", "__proto__", "SupportTicket:1", "SYN-BORROWER-A/../owner"])
    assert.equal(syntheticCase(id), undefined);
  assert.equal(new Set(syntheticCases.map(c => c.id)).size, syntheticCases.length);
});
test("every scripted statement cites only its own scenario and has both languages", () => {
  for (const c of syntheticCases) {
    assert.ok(validFixtureReferences(c), c.id);
    for (const item of [c.title, c.category, c.missing, c.question, c.reply, c.caution, ...c.summary.map(s => s.text), ...c.facts.map(f => f.content)]) {
      assert.ok(item.en.trim()); assert.ok(item["zh-TW"].trim());
    }
    assert.equal(validFixtureReferences({ ...c, summary: [{ text: c.title, refs: ["FOREIGN-PRIVATE-FACT"] }] }), false);
    assert.equal(validFixtureReferences({ ...c, facts: [...c.facts, c.facts[0]] }), false);
  }
});
test("same fictional rental keeps opposite-party claims and references separate", () => {
  const borrower = syntheticCase("SYN-BORROWER-A")!, owner = syntheticCase("SYN-OWNER-A")!;
  assert.equal(borrower.rental, owner.rental); assert.notEqual(borrower.side, owner.side);
  assert.ok(borrower.facts.every(f => !owner.facts.some(o => o.id === f.id)));
  assert.ok(!JSON.stringify(borrower.summary).includes("scratch"));
  assert.ok(!JSON.stringify(owner.summary).includes("17:45"));
});
test("scripted injection and translation scenarios expose uncertainty rather than binding claims", () => {
  const injection = syntheticCase("SYN-INJECTION")!, translation = syntheticCase("SYN-UNCERTAIN")!;
  assert.match(injection.facts[0].content.en, /<script>/);
  assert.match(injection.summary[0].text.en, /untrusted data, not authority/);
  assert.match(injection.caution.en, /no model was run/);
  assert.match(translation.facts[0].content["zh-TW"], /交接完成了嗎？/);
  assert.match(translation.summary[0].text.en, /does not assert completion/);
  assert.match(translation.missing.en, /No confirmation/);
});
test("prototype modules cannot call providers, retrieve case records or persist drafts", () => {
  for (const file of ["lib/ai-case-brief/fixtures.ts", "app/admin/ai-case-brief/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|\bXMLHttpRequest\b|\bnavigator\.sendBeacon\b|\bprisma\b|chat\/analysis|support\/channels|dangerouslySetInnerHTML|localStorage|sessionStorage/);
  }
});
