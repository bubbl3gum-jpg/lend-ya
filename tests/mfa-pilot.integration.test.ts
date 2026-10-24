import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { MFA_PASSWORD, mfaActorFixture } from "./support/mfa-fixtures";
import { realTestAuthenticator } from "./support/webauthn-authenticator";

test(
  "Batch 5B actual application passkey routes, legacy Admin boundary and native browser pilot",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase(),
      base = process.env.TEST_BASE_URL!,
      endpoint = base + "/api/auth/admin-passkeys";
    type Actor = Awaited<ReturnType<typeof mfaActorFixture>>;
    const api = async (
      body?: object,
      actor?: Actor,
      headers: Record<string, string> = {},
    ) =>
      fetch(endpoint, {
        method: body ? "POST" : "GET",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          ...(actor ? { Cookie: `p2p_session=${actor.token}` } : {}),
          ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const admin = async () => {
      const a = await mfaActorFixture(db);
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [a.userId]);
      return a;
    };
    const begin = async (a: Actor, action = "authentication.begin") => {
      const r = await api(
        {
          action,
          ...(action === "enrollment.begin" ? { password: MFA_PASSWORD } : {}),
        },
        a,
      );
      assert.equal(r.status, 200);
      return r.json();
    };
    const enrolled = async () => {
      const actor = await admin(),
        auth = realTestAuthenticator(),
        c = await begin(actor, "enrollment.begin");
      const r = await api(
        {
          action: "enrollment.finish",
          challengeId: c.challengeId,
          password: MFA_PASSWORD,
          response: auth.registration(c.options.challenge, base, "localhost"),
        },
        actor,
      );
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.equal(data.staffAuthorized, false);
      return {
        actor,
        auth,
        key: data.credentialKey,
        handle: c.options.user.id,
      };
    };
    const verified = async (f: Awaited<ReturnType<typeof enrolled>>) => {
      const c = await begin(f.actor);
      const response = f.auth.assertion(
        c.options.challenge,
        base,
        "localhost",
        f.handle,
      );
      const r = await api(
        {
          action: "authentication.finish",
          challengeId: c.challengeId,
          response,
        },
        f.actor,
      );
      assert.equal(r.status, 200);
      return {
        data: await r.json(),
        body: {
          action: "authentication.finish",
          challengeId: c.challengeId,
          response,
        },
        challengeId: c.challengeId,
      };
    };
    try {
      await t.test(
        "anonymous, ordinary, suspended, expired and unverified Admin identities cannot use the pilot",
        async () => {
          assert.equal((await api()).status, 401);
          const a = await mfaActorFixture(db);
          assert.equal((await api(undefined, a)).status, 403);
          assert.equal(
            (
              await api(
                {
                  action: "enrollment.begin",
                  password: MFA_PASSWORD,
                  role: "ADMIN",
                },
                a,
                { "X-Role": "ADMIN" },
              )
            ).status,
            403,
          );
          await db.query(
            `UPDATE "User" SET role='ADMIN',"accountStatus"='SUSPENDED' WHERE id=$1`,
            [a.userId],
          );
          assert.equal((await api(undefined, a)).status, 403);
          await db.query(
            `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
            [a.userId],
          );
          await db.query(
            `UPDATE "StaffAccountAssociation" SET state='REVOKED' WHERE id=$1`,
            [a.associationId],
          );
          assert.equal((await api(undefined, a)).status, 403);
          const expired = await admin();
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE id=$1`,
            [expired.sessionId],
          );
          assert.equal((await api(undefined, expired)).status, 401);
        },
      );
      await t.test(
        "concurrent first status reads initialize one MFA version without exposing credential material",
        async () => {
          const a = await admin();
          const reads = await Promise.all([
            api(undefined, a),
            api(undefined, a),
            api(undefined, a),
            api(undefined, a),
          ]);
          assert.deepEqual(
            reads.map((r) => r.status),
            [200, 200, 200, 200],
          );
          for (const r of reads)
            assert.deepEqual((await r.json()).credentials, []);
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "StaffMfaVersion" WHERE "associationId"=$1`,
                [a.associationId],
              )
            ).rows[0].n,
            1,
          );
        },
      );
      await t.test(
        "strict exact Origin/Host, CSRF and closed JSON reject forged parameters before challenges",
        async () => {
          const a = await admin();
          const badHeaders: Record<string, string>[] = [
            { Origin: "" },
            { Origin: "null" },
            { Origin: "https://evil.example" },
            { Origin: base.replace("http:", "https:") },
            { "Sec-Fetch-Site": "cross-site" },
            { "Content-Type": "text/plain" },
            { Host: "evil.example" },
          ];
          for (const headers of badHeaders)
            assert.equal(
              (await api({ action: "authentication.begin" }, a, headers))
                .status,
              403,
              JSON.stringify(headers),
            );
          const missing = await fetch(endpoint, {
            method: "POST",
            headers: {
              Cookie: `p2p_session=${a.token}`,
              "Content-Type": "application/json",
            },
            body: '{"action":"authentication.begin"}',
          });
          assert.equal(missing.status, 403);
          for (const forged of [
            { rpId: "evil.example" },
            { origin: base },
            { personId: a.personId },
            { mfaVerified: true },
            { assurance: "MFA" },
            { role: "ADMIN" },
            { authorizationVersion: 1 },
            { policyVersion: "fake" },
          ])
            assert.equal(
              (
                await api(
                  {
                    action: "enrollment.begin",
                    password: MFA_PASSWORD,
                    ...forged,
                  },
                  a,
                )
              ).status,
              400,
            );
          assert.equal(
            (await api({ action: "recover", password: MFA_PASSWORD }, a))
              .status,
            400,
          );
          assert.equal(
            (
              await api(
                { action: "enrollment.begin", password: "x".repeat(40000) },
                a,
              )
            ).status,
            400,
          );
          const query = await fetch(endpoint + "?assuranceId=forged", {
            headers: { Cookie: `p2p_session=${a.token}`, Origin: base },
          });
          assert.equal(query.status, 400);
          assert.equal(
            (await api(undefined, a, { Origin: "https://evil.example" }))
              .status,
            403,
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "StaffMfaChallenge" WHERE "associationId"=$1`,
                [a.associationId],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "real signed route enrollment/assertion, safe credential listing and wrong signed origins",
        async () => {
          const f = await enrolled(),
            c = await begin(f.actor);
          assert.equal(
            (
              await api(
                {
                  action: "authentication.finish",
                  challengeId: c.challengeId,
                  response: f.auth.assertion(
                    c.options.challenge,
                    "https://evil.example",
                    "localhost",
                    f.handle,
                  ),
                },
                f.actor,
              )
            ).status,
            403,
          );
          const result = await verified(f);
          assert.equal(result.data.factorVerified, true);
          assert.equal(result.data.staffAuthorized, false);
          assert.ok(result.data.expiresAt);
          const list = await api(undefined, f.actor);
          assert.equal(list.status, 200);
          const text = await list.text();
          assert.ok(text.includes(f.key));
          for (const field of [
            "publicKey",
            "credentialId",
            "tokenHash",
            "challengeHash",
          ])
            assert.ok(!text.includes(field));
          assert.match(list.headers.get("cache-control")!, /no-store/);
        },
      );
      await t.test(
        "route replay and concurrent valid assertions consume a challenge exactly once",
        async () => {
          const f = await enrolled(),
            v = await verified(f);
          assert.equal((await api(v.body, f.actor)).status, 403);
          const c = await begin(f.actor),
            body = {
              action: "authentication.finish",
              challengeId: c.challengeId,
              response: f.auth.assertion(
                c.options.challenge,
                base,
                "localhost",
                f.handle,
              ),
            };
          assert.deepEqual(
            (await Promise.all([api(body, f.actor), api(body, f.actor)]))
              .map((r) => r.status)
              .sort(),
            [200, 403],
          );
        },
      );
      await t.test(
        "cancelled and expired challenges cannot mint assurance",
        async () => {
          const f = await enrolled(),
            c = await begin(f.actor);
          assert.equal(
            (
              await api(
                { action: "challenge.cancel", challengeId: c.challengeId },
                f.actor,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                {
                  action: "authentication.finish",
                  challengeId: c.challengeId,
                  response: f.auth.assertion(
                    c.options.challenge,
                    base,
                    "localhost",
                    f.handle,
                  ),
                },
                f.actor,
              )
            ).status,
            403,
          );
          const nonce = randomUUID(),
            id = randomUUID();
          await db.query(
            `INSERT INTO "StaffMfaChallenge" (id,"associationId","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion","challengeHash","configHash",purpose,"createdAt","expiresAt") SELECT $1,"associationId","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion",$2,"configHash",purpose,NOW()-interval '6 minutes',NOW()-interval '2 minutes' FROM "StaffMfaChallenge" WHERE id=$3`,
            [
              id,
              createHash("sha256").update(nonce).digest("hex"),
              c.challengeId,
            ],
          );
          assert.equal(
            (
              await api(
                {
                  action: "authentication.finish",
                  challengeId: id,
                  response: f.auth.assertion(
                    nonce,
                    base,
                    "localhost",
                    f.handle,
                  ),
                },
                f.actor,
              )
            ).status,
            403,
          );
        },
      );
      await t.test(
        "wrong current session, role demotion, suspension and logout invalidate route access",
        async () => {
          const f = await enrolled(),
            c = await begin(f.actor),
            body = {
              action: "authentication.finish",
              challengeId: c.challengeId,
              response: f.auth.assertion(
                c.options.challenge,
                base,
                "localhost",
                f.handle,
              ),
            };
          const token = randomUUID();
          await db.query(
            `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour')`,
            [f.actor.userId, createHash("sha256").update(token).digest("hex")],
          );
          assert.equal((await api(body, { ...f.actor, token })).status, 403);
          await db.query(`UPDATE "User" SET role='USER' WHERE id=$1`, [
            f.actor.userId,
          ]);
          assert.equal((await api(body, f.actor)).status, 403);
          await db.query(
            `UPDATE "User" SET role='ADMIN',"accountStatus"='SUSPENDED' WHERE id=$1`,
            [f.actor.userId],
          );
          assert.equal((await api(body, f.actor)).status, 403);
          await db.query(
            `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
            [f.actor.userId],
          );
          const logout = await fetch(base + "/api/auth/logout", {
            method: "POST",
            headers: { Origin: base, Cookie: `p2p_session=${f.actor.token}` },
          });
          assert.equal(logout.status, 200);
          assert.equal((await api(body, f.actor)).status, 401);
        },
      );
      await t.test(
        "revoke requires current password and real fresh assurance; old proof cannot add another key",
        async () => {
          const f = await enrolled(),
            v = await verified(f);
          assert.equal(
            (
              await api(
                {
                  action: "credential.revoke",
                  credentialKey: f.key,
                  password: MFA_PASSWORD,
                  assuranceId: randomUUID(),
                },
                f.actor,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(
                {
                  action: "credential.revoke",
                  credentialKey: f.key,
                  password: "wrong",
                  assuranceId: v.data.assuranceId,
                },
                f.actor,
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await api(
                {
                  action: "credential.revoke",
                  credentialKey: f.key,
                  password: MFA_PASSWORD,
                  assuranceId: v.data.assuranceId,
                },
                f.actor,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await api(
                {
                  action: "enrollment.begin",
                  password: MFA_PASSWORD,
                  assuranceId: v.data.assuranceId,
                },
                f.actor,
              )
            ).status,
            403,
          );
          assert.equal(
            (await api({ action: "authentication.begin" }, f.actor)).status,
            403,
          );
          assert.equal((await api(v.body, f.actor)).status, 403);
        },
      );
      await t.test(
        "real database audit failure rolls back verification; the same unconsumed signed response can recover",
        async () => {
          const f = await enrolled(),
            c = await begin(f.actor),
            body = {
              action: "authentication.finish",
              challengeId: c.challengeId,
              response: f.auth.assertion(
                c.options.challenge,
                base,
                "localhost",
                f.handle,
              ),
            };
          await db.query(
            `CREATE FUNCTION b5b_fail_verified() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='VERIFIED' THEN RAISE EXCEPTION 'fixture audit unavailable'; END IF; RETURN NEW; END $$; CREATE TRIGGER b5b_fail_verified BEFORE INSERT ON "StaffMfaEvent" FOR EACH ROW EXECUTE FUNCTION b5b_fail_verified()`,
          );
          try {
            assert.equal((await api(body, f.actor)).status, 403);
            assert.equal(
              (
                await db.query(
                  `SELECT state FROM "StaffMfaChallenge" WHERE id=$1`,
                  [c.challengeId],
                )
              ).rows[0].state,
              "PENDING",
            );
          } finally {
            await db.query(
              `DROP TRIGGER b5b_fail_verified ON "StaffMfaEvent"; DROP FUNCTION b5b_fail_verified()`,
            );
          }
          assert.equal((await api(body, f.actor)).status, 200);
        },
      );
      await t.test(
        "ownership marker is rechecked on actual application requests",
        async () => {
          const a = await admin(),
            database = (await db.query(`SELECT current_database() n`)).rows[0]
              .n;
          assert.match(database, /^hustlen_test_[a-z0-9_]+$/);
          await db.query(`COMMENT ON DATABASE "${database}" IS 'wrong-marker'`);
          try {
            assert.equal((await api(undefined, a)).status, 404);
            assert.equal(
              (
                await api(
                  { action: "enrollment.begin", password: MFA_PASSWORD },
                  a,
                )
              ).status,
              404,
            );
          } finally {
            await db.query(
              `COMMENT ON DATABASE "${database}" IS 'hustlen-mrt-test:${process.env.MRT_TEST_RUN_ID}'`,
            );
          }
        },
      );
      await t.test(
        "native application enrollment, assertion, additional key, revocation, cancellation and responsive screenshots",
        async () => {
          const a = await admin(),
            email = (
              await db.query(`SELECT email FROM "User" WHERE id=$1`, [a.userId])
            ).rows[0].email;
          const browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox"],
          });
          try {
            const context = await browser.newContext({
                viewport: { width: 1440, height: 1000 },
              }),
              page = await context.newPage(),
              cdp = await context.newCDPSession(page);
            await cdp.send("WebAuthn.enable");
            const add = () =>
              cdp.send("WebAuthn.addVirtualAuthenticator", {
                options: {
                  protocol: "ctap2",
                  transport: "internal",
                  hasResidentKey: true,
                  hasUserVerification: true,
                  isUserVerified: true,
                  automaticPresenceSimulation: true,
                },
              });
            const first = await add();
            await page.goto(base + "/login");
            await page.getByLabel("Email address", { exact: true }).fill(email);
            await page
              .getByLabel("Password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click();
            await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
            await page.goto(base + "/admin/security");
            await expect(
              page.getByRole("heading", { name: "Passkeys", exact: true }),
            ).toBeVisible();
            await page
              .getByLabel("Current password", { exact: true })
              .fill(MFA_PASSWORD);
            await expect(
              page.getByRole("button", { name: "Enroll passkey", exact: true }),
            ).toBeEnabled();
            await page
              .getByRole("button", { name: "Enroll passkey", exact: true })
              .focus();
            await page.keyboard.press("Enter");
            await expect(page.getByRole("status")).toContainText(
              "Passkey enrolled",
              { timeout: 15000 },
            );
            await page
              .getByRole("button", { name: "Verify passkey", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Factor verified for this session",
              { timeout: 15000 },
            );
            await cdp.send("WebAuthn.removeVirtualAuthenticator", {
              authenticatorId: first.authenticatorId,
            });
            const second = await add();
            await page
              .getByLabel("Current password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Add another passkey", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Passkey enrolled",
              { timeout: 15000 },
            );
            await page
              .getByRole("button", { name: "Verify passkey", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Factor verified for this session",
              { timeout: 15000 },
            );
            await page
              .getByLabel("Current password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Revoke passkey 1", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Passkey revoked",
              { timeout: 15000 },
            );
            await page
              .getByRole("button", { name: "Verify passkey", exact: true })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Factor verified for this session",
              { timeout: 15000 },
            );
            for (const [label, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await page.setViewportSize({ width, height });
              await page.screenshot({
                path: path.join(
                  process.env.MRT_TEST_ARTIFACT_DIR!,
                  `passkeys-${label}.png`,
                ),
                fullPage: true,
              });
              assert.equal(
                await page.evaluate(
                  () =>
                    document.documentElement.scrollWidth <= window.innerWidth,
                ),
                true,
              );
            }
            await cdp.send("WebAuthn.setAutomaticPresenceSimulation", {
              authenticatorId: second.authenticatorId,
              enabled: false,
            });
            const begun = page.waitForResponse(
              (r) =>
                r.url() === endpoint &&
                r.request().postDataJSON()?.action === "authentication.begin",
            );
            await page
              .getByRole("button", { name: "Verify passkey", exact: true })
              .click();
            await begun;
            await page
              .getByRole("button", {
                name: "Cancel browser prompt",
                exact: true,
              })
              .click();
            await expect(
              page
                .getByRole("alert")
                .filter({ hasText: "The browser passkey" }),
            ).toContainText("cancelled", { timeout: 15000 });
            await expect
              .poll(async () =>
                Number(
                  (
                    await db.query(
                      `SELECT count(*)::int n FROM "StaffMfaChallenge" WHERE "associationId"=$1 AND state='CANCELLED'`,
                      [a.associationId],
                    )
                  ).rows[0].n,
                ),
              )
              .toBeGreaterThan(0);
            const cookies = await context.cookies();
            assert.ok(
              cookies.find(
                (c) =>
                  c.name === "p2p_session" &&
                  c.httpOnly &&
                  c.sameSite === "Lax",
              ),
            );
            await page
              .getByRole("button", { name: "Sign out", exact: true })
              .click();
            await expect(page).toHaveURL(base + "/login");
            assert.equal((await context.request.get(endpoint)).status(), 401);
          } finally {
            await browser.close();
          }
        },
      );
      await t.test(
        "no staff activation, authority conversion or approval execution occurred",
        async () => {
          for (const [table, where] of [
            ["StaffMembership", "state='ACTIVE'"],
            ["StaffCapabilityGrant", "state='ACTIVE'"],
            ["StaffChangeRequest", "state IN ('APPROVED','EXECUTED')"],
            ["StaffSecurityEvent", "outcome='COMMITTED'"],
          ] as const) {
            assert.equal(
              (
                await db.query(
                  `SELECT count(*)::int n FROM "${table}" WHERE ${where}`,
                )
              ).rows[0].n,
              0,
            );
          }
        },
      );
    } finally {
      await db.end();
    }
  },
);
