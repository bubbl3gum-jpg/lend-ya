import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { recoveryTokenFromFragment } from "../lib/recovery-link";

test("recovery fragments accept only a canonical 32-byte credential", () => {
  for (let i = 0; i < 20; i++) {
    const token = randomBytes(32).toString("base64url");
    assert.ok(recoveryTokenFromFragment(`#token=${token}`) === token);
  }
});
test("missing, query-only, duplicate, extra-field and noncanonical credentials are refused", () => {
  const token = randomBytes(32).toString("base64url");
  for (const fragment of ["", "#", `?token=${token}`, `token=${token}`, "#token=short", `#token=${token}&token=${token}`, `#token=${token}&next=/admin`, `#token=${token}=`, `#token=${"A".repeat(42)}B`, `#token=${"A".repeat(44)}`, "#token=%00", "#other=value"]) {
    assert.equal(recoveryTokenFromFragment(fragment) === null, true);
  }
});
