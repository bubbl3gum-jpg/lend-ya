import { test } from "node:test";
import assert from "node:assert/strict";
import { logOperationalError } from "../lib/operational-error";
import { internalServerError } from "../lib/api-response";

test("operational failures retain bounded correlation/category without private error data", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...values: unknown[]) => lines.push(values.join(" "));
  try {
    const error = Object.assign(
      new Error(
        "postgresql://person:token@private.example/userdb?secret=token",
      ),
      {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        meta: {
          email: "private@example.test",
          token: "secret-token",
          query: "private SQL",
        },
        cause: new Error("Private nested cause"),
      },
    );
    const response = internalServerError("POST /api/auth/login", error);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal server error" });
    const record = JSON.parse(lines[0]);
    assert.equal(response.headers.get("X-Error-Id"), record.errorId);
    assert.equal(record.code, "P2002");
    assert.equal(record.errorType, "PrismaClientKnownRequestError");
    assert.deepEqual(
      Object.keys(record).sort(),
      ["event", "errorId", "context", "errorType", "code"].sort(),
    );
    assert.match(record.errorId, /^[a-f0-9-]{36}$/);
    assert.ok(lines[0].length < 400);
    for (const secret of [
      "postgresql",
      "private.example",
      "userdb",
      "secret-token",
      "private SQL",
      "private@example.test",
      "Private nested cause",
    ])
      assert.ok(!lines[0].includes(secret));
    const hostile = {
      get code() {
        throw Error("Do not run getters");
      },
      get name() {
        throw Error("Do not run getters");
      },
      toString() {
        throw Error("Do not stringify");
      },
    };
    logOperationalError("bad\ncontext", hostile);
    assert.equal(JSON.parse(lines[1]).context, "unknown_operation");
    assert.equal(JSON.parse(lines[1]).code, "UNCLASSIFIED");
    logOperationalError("test.failure", {
      code: "token-secret",
      name: "secret-person",
    });
    assert.ok(!lines[2].includes("token-secret"));
    assert.ok(!lines[2].includes("secret-person"));
    logOperationalError("test.proxy", new Proxy({}, { getPrototypeOf() { throw Error("private proxy trap"); }, getOwnPropertyDescriptor() { throw Error("private descriptor trap"); } }));
    assert.equal(JSON.parse(lines[3]).errorType, "Unknown");
    assert.notEqual(JSON.parse(lines[1]).errorId, JSON.parse(lines[2]).errorId);
  } finally {
    console.error = original;
  }
});
