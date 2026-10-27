import { test } from "node:test";
import assert from "node:assert/strict";
import { en, zhTW, type MessageId } from "../lib/i18n/catalogues";
import {
  parseLocale,
  message,
  formatMoney,
  formatNumber,
  formatTime,
} from "../lib/i18n/core";
test("exact locales, complete typed catalogues and matching interpolation contracts", () => {
  assert.equal(Object.keys(en).length, 230);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zhTW).sort());
  for (const value of [
    undefined,
    null,
    "zh",
    "zh-tw",
    "zh-Hant",
    "en-US",
    "de",
    [],
    {},
    "__proto__",
  ])
    assert.equal(parseLocale(value), "en");
  assert.equal(parseLocale("zh-TW"), "zh-TW");
  assert.equal(parseLocale("en"), "en");
  for (const id of Object.keys(en) as MessageId[]) {
    assert.ok(zhTW[id].trim());
    const placeholders = (s: string) =>
      [...s.matchAll(/\{([A-Za-z]+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(placeholders(en[id]), placeholders(zhTW[id]), id);
  }
});
test("English fallback, unknown-message safety and literal interpolation", () => {
  assert.equal(message("zh-TW", "nav.home", {}, {}), "Home");
  assert.equal(
    message("zh-TW", "__proto__" as MessageId),
    "This text is unavailable.",
  );
  assert.equal(
    message("en", "nav.account", { name: "<img src=x onerror=evil()>" }),
    "Account center · <img src=x onerror=evil()>",
  );
  assert.equal(
    message("zh-TW", "home.categoryRecent", { category: "Cameras" }),
    "Cameras／最新刊登",
  );
});
test("locale presentation keeps USD numerical value and Taiwan time explicit", () => {
  for (const locale of ["en", "zh-TW"] as const) {
    assert.ok(formatMoney(locale, "1234.50").includes("1,234.50"));
    assert.equal(formatNumber(locale, 1234), "1,234");
  }
  assert.ok(formatMoney("zh-TW", 100).includes("US$"));
  assert.match(
    formatTime("zh-TW", "2026-10-26T16:00:00Z"),
    /2026年10月27日|2026\/10\/27/,
  );
  assert.match(formatTime("en", "2026-10-26T16:00:00Z"), /27 Oct 2026/);
});
test("development missing-message diagnostics are bounded and never include interpolated or unknown input", () => {
  const previous = process.env.NODE_ENV,
    original = console.warn,
    captured: unknown[][] = [];
  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    console.warn = (...args: unknown[]) => {
      captured.push(args);
    };
    message("zh-TW", "form.invalid", { name: "PRIVATE_FIXTURE_VALUE" }, {});
    message("zh-TW", "form.invalid", {}, {});
    message("zh-TW", "UNTRUSTED_SECRET_IDENTIFIER" as MessageId);
    for (const id of Object.keys(en) as MessageId[])
      message("zh-TW", id, {}, {});
    assert.equal(captured.length, 32);
    const text = JSON.stringify(captured);
    assert.ok(text.includes("UNKNOWN_MESSAGE"));
    assert.ok(!text.includes("PRIVATE_FIXTURE_VALUE"));
    assert.ok(!text.includes("UNTRUSTED_SECRET_IDENTIFIER"));
  } finally {
    console.warn = original;
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous);
  }
});

test("discovery display mapping never rewrites identifiers or unknown user data", async () => {
  const { categoryLabel, detailLabel } = await import("../lib/i18n/listings");
  for (const locale of ["en", "zh-TW"] as const) {
    for (const raw of [
      "__proto__",
      "constructor",
      "Custom <script>分類</script>",
      "cameras",
    ]) {
      assert.equal(categoryLabel(locale, raw), raw);
      assert.equal(detailLabel(locale, raw), raw);
    }
  }
  assert.equal(categoryLabel("zh-TW", "Cameras"), "相機");
  assert.equal(categoryLabel("en", "Cameras"), "Cameras");
  assert.equal(detailLabel("zh-TW", "brandModel"), "品牌與型號");
});
