import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { hashPassword, parseNewPassword, verifyPassword } from "../lib/password";
import { isRecoveryToken, normalizeRecoveryIp } from "../lib/password-recovery";

test("new passwords enforce bounds, digit and uppercase; lowercase is optional", () => {
  for (const invalid of [undefined, null, 123, "Abc1234", "abcdefgh1", "ABCDEFGH", "Abcdefgh", "A1" + "x".repeat(127)]) {
    assert.equal(parseNewPassword(invalid), null);
  }
  for (const valid of ["ABCDEF12", "Abcdefg1", "A1" + "x".repeat(126), " A123456 "]) {
    assert.equal(parseNewPassword(valid), valid);
  }
});

test("scrypt preserves legacy verification and salts new hashes independently", async () => {
  const password = "legacy-with-no-uppercase-or-digit";
  const one = await hashPassword(password), two = await hashPassword(password);
  assert.notEqual(one, two);
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword(password + "x", one), false);
  assert.equal(await verifyPassword(password, "broken$hash"), false);
});

test("recovery tokens accept only canonical 256-bit credentials", () => {
  assert.equal(isRecoveryToken(randomBytes(32).toString("base64url")), true);
  for (const invalid of [null, "", "x".repeat(42), "x".repeat(44), "!".repeat(43), "A".repeat(42) + "B"]) {
    assert.equal(isRecoveryToken(invalid), false);
  }
});

test("IP quotas normalize IPv6 aliases and IPv4-mapped addresses", () => {
  assert.equal(normalizeRecoveryIp("2001:0DB8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
  assert.equal(normalizeRecoveryIp("2001:db8::1"), "2001:db8::1");
  assert.equal(normalizeRecoveryIp("::ffff:192.0.2.1"), "192.0.2.1");
  assert.equal(normalizeRecoveryIp("::ffff:c000:201"), "192.0.2.1");
  for (const invalid of ["", "unknown", "192.0.2.1, 192.0.2.2", "192.0.2.1:8000", "fe80::1%eth0"]) {
    assert.equal(normalizeRecoveryIp(invalid), null);
  }
});
