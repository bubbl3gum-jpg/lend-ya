import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { connectTestDatabase } from "./support/test-database";
test("11F credential rotation rejects distinct strings with the same effective scrypt input", async () => {
  const db = await connectTestDatabase(),
    base = process.env.TEST_BASE_URL!,
    art = process.env.MRT_TEST_ARTIFACT_DIR!;
  try {
    const original = "Owned-\ud800-secret!",
      equivalent = "Owned-\ud801-secret!",
      email = randomUUID() + "@fixture.test";
    assert.notEqual(original, equivalent);
    const headers = { Origin: base, "Content-Type": "application/json" };
    const r = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Encoding review fixture",
        email,
        password: original,
      }),
    });
    assert.equal(r.status, 201);
    const user = (await r.json()).user,
      token = r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1];
    const rotate = await fetch(base + "/api/account/password", {
      method: "POST",
      headers: {
        ...headers,
        "X-Hustlen-Password-Change": "1",
        Cookie: "p2p_session=" + token,
      },
      body: JSON.stringify({
        currentPassword: original,
        newPassword: equivalent,
        confirmPassword: equivalent,
      }),
    });
    const login = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password: original }),
    });
    assert.equal(login.status, 200);
    const events = Number(
      (
        await db.query(
          'SELECT count(*) n FROM "AccountSecurityEvent" WHERE "actorId"=$1',
          [user.id],
        )
      ).rows[0].n,
    );
    await writeFile(
      path.join(art, "effective-credential-review.json"),
      JSON.stringify(
        {
          case: "different ill-formed UTF-16 strings encode to the same UTF-8 password bytes",
          changeStatus: rotate.status,
          originalLoginStatus: login.status,
          securityEvents: events,
          noCredentialMaterialRecorded: true,
        },
        null,
        2,
      ),
    );
    assert.equal(
      rotate.status,
      400,
      "Equivalent effective credentials must not be reported as a password rotation",
    );
    assert.equal(events, 0);
    const actual = "Different-well-formed-password!";
    const changed = await fetch(base + "/api/account/password", {
      method: "POST",
      headers: {
        ...headers,
        "X-Hustlen-Password-Change": "1",
        Cookie: "p2p_session=" + token,
      },
      body: JSON.stringify({
        currentPassword: original,
        newPassword: actual,
        confirmPassword: actual,
      }),
    });
    assert.equal(changed.status, 200);
    assert.equal(
      (
        await fetch(base + "/api/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password: original }),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(base + "/api/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password: actual }),
        })
      ).status,
      200,
    );
  } finally {
    await db.end();
  }
});

for (const kind of ["audit", "credential"] as const)
  test(`11F silent ${kind} storage cannot commit password or revocation`, async () => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      art = process.env.MRT_TEST_ARTIFACT_DIR!,
      password = "Owned-storage-review-current!",
      newPassword = "Owned-storage-review-next!",
      email = randomUUID() + "@fixture.test",
      headers = { Origin: base, "Content-Type": "application/json" };
    let triggered = false;
    try {
      const r = await fetch(base + "/api/auth/register", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Storage review fixture",
          email,
          password,
        }),
      });
      assert.equal(r.status, 201);
      const user = (await r.json()).user,
        token = r.headers.get("set-cookie")!.match(/p2p_session=([^;]+)/)![1],
        before = (
          await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
            user.id,
          ])
        ).rows[0].passwordHash;
      await db.query(
        `CREATE FUNCTION fixture_review_silent_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${kind === "audit" ? "RETURN NULL;" : "RETURN OLD;"} END $$`,
      );
      await db.query(
        `CREATE TRIGGER fixture_review_silent_write BEFORE ${kind === "audit" ? 'INSERT ON "AccountSecurityEvent"' : 'UPDATE OF "passwordHash" ON "User"'} FOR EACH ROW WHEN (${kind === "audit" ? 'NEW."actorId"' : "OLD.id"}=${user.id}) EXECUTE FUNCTION fixture_review_silent_write()`,
      );
      triggered = true;
      const result = await fetch(base + "/api/account/password", {
        method: "POST",
        headers: {
          ...headers,
          Cookie: "p2p_session=" + token,
          "X-Hustlen-Password-Change": "1",
        },
        body: JSON.stringify({
          currentPassword: password,
          newPassword,
          confirmPassword: newPassword,
        }),
      });
      const changed =
          (
            await db.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [
              user.id,
            ])
          ).rows[0].passwordHash !== before,
        sessions = Number(
          (
            await db.query(
              'SELECT count(*) n FROM "AuthSession" WHERE "userId"=$1',
              [user.id],
            )
          ).rows[0].n,
        ),
        events = Number(
          (
            await db.query(
              'SELECT count(*) n FROM "AccountSecurityEvent" WHERE "actorId"=$1',
              [user.id],
            )
          ).rows[0].n,
        );
      await writeFile(
        path.join(art, `silent-${kind}-review.json`),
        JSON.stringify(
          {
            kind,
            responseStatus: result.status,
            credentialChanged: changed,
            remainingSessions: sessions,
            securityEvents: events,
            noCredentialMaterialRecorded: true,
          },
          null,
          2,
        ),
      );
      assert.equal(
        result.status,
        500,
        "Required write must be verified before reporting success",
      );
      assert.equal(changed, false);
      assert.equal(sessions, 1);
      assert.equal(events, 0);
    } finally {
      if (triggered)
        await db.query(
          `DROP TRIGGER fixture_review_silent_write ON "${kind === "audit" ? "AccountSecurityEvent" : "User"}"`,
        );
      await db.query("DROP FUNCTION IF EXISTS fixture_review_silent_write()");
      await db.end();
    }
  });
