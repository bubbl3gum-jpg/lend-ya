import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { connectTestDatabase } from "./support/test-database";
import { staffReadFixture } from "./support/staff-read-pilot";
import { realTestAuthenticator } from "./support/webauthn-authenticator";
import { mfaActorFixture, MFA_PASSWORD } from "./support/mfa-fixtures";

test(
  "Batch 6A real application, WebAuthn, exact listing scope, separate worker and committed audit",
  { timeout: 180000 },
  async (t) => {
    const owner = await connectTestDatabase(),
      port = process.env.TEST_ADMIN_PORT!,
      base = "http://localhost:" + port,
      endpoint = base + "/api/dev/staff-listing-read",
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      runId = process.env.MRT_TEST_RUN_ID!;
    let fixture: Awaited<ReturnType<typeof staffReadFixture>> | undefined,
      app: ChildProcess | undefined,
      worker: ChildProcess | undefined;
    const stop = async (p: ChildProcess | undefined) => {
      if (!p || p.exitCode !== null || p.signalCode !== null) return;
      const done = new Promise<void>((r) => p.once("exit", () => r()));
      p.kill("SIGTERM");
      const timer = setTimeout(() => p.kill("SIGKILL"), 3000);
      await done;
      clearTimeout(timer);
    };
    const counts = async () =>
      (
        await owner.query(
          `SELECT count(*)::int n FROM hustlen_staff_read_fixture.audit`,
        )
      ).rows[0].n as number;
    type Actor = Awaited<ReturnType<NonNullable<typeof fixture>["seed"]>>;
    const api = (
      body: object,
      actor?: { token: string },
      headers: Record<string, string> = {},
    ) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          ...(actor ? { Cookie: `p2p_session=${actor.token}` } : {}),
          ...headers,
        },
        body: JSON.stringify(body),
      });
    const cmd = async (body: object, actor: Actor) => {
      const r = await api(body, actor);
      assert.equal(r.status, 200, await r.clone().text());
      return r.json();
    };
    const enrolled = async () => {
      const actor = await fixture!.seed(),
        auth = realTestAuthenticator(),
        c = await cmd(
          { action: "enroll.begin", password: MFA_PASSWORD },
          actor,
        );
      await cmd(
        {
          action: "enroll.finish",
          challengeId: c.challengeId,
          password: MFA_PASSWORD,
          response: auth.registration(c.options.challenge, base, "localhost"),
        },
        actor,
      );
      return { actor, auth, handle: c.options.user.id };
    };
    const verified = async () => {
      const f = await enrolled(),
        c = await cmd({ action: "verify.begin" }, f.actor),
        response = f.auth.assertion(
          c.options.challenge,
          base,
          "localhost",
          f.handle,
        ),
        v = await cmd(
          { action: "verify.finish", challengeId: c.challengeId, response },
          f.actor,
        );
      assert.equal(v.factorVerified, true);
      assert.equal(v.staffAuthorized, false);
      return {
        ...f,
        bindingId: v.bindingId,
        assuranceId: v.assuranceId,
        proofBody: {
          action: "verify.finish",
          challengeId: c.challengeId,
          response,
        },
      };
    };
    const readBody = (
      f: Awaited<ReturnType<typeof verified>>,
      listingId = fixture!.listing,
    ) => ({
      action: "read",
      bindingId: f.bindingId,
      listingId: String(listingId),
    });
    const deniedRead = async (
      f: Awaited<ReturnType<typeof verified>>,
      body = readBody(f),
    ) => {
      const before = await counts(),
        r = await api(body, f.actor),
        text = await r.text();
      assert.equal(r.status, 403);
      for (const canary of [
        "Cameras",
        "PRIVATE_TITLE_CANARY",
        "PRIVATE_DESCRIPTION_CANARY",
        "Private outside",
        "adminRestricted",
      ])
        assert.ok(!text.includes(canary));
      assert.equal(await counts(), before);
    };
    try {
      fixture = await staffReadFixture(owner);
      const channel = randomBytes(32).toString("hex"),
        socket = `/tmp/hustlen-read-${runId}.sock`,
        runtime = fixture.profile.url("runtime");
      const common = {
        PATH: process.env.PATH,
        NODE_ENV: "development" as const,
        MRT_TEST_RUN_ID: runId,
        MRT_TEST_ARTIFACT_DIR: artifact,
        HUSTLEN_STAFF_READ_PILOT: "owned-synthetic-only",
        HUSTLEN_STAFF_READ_ORIGIN: base,
      };
      worker = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/staff-read-pilot-worker.mjs"],
        { env: common, stdio: ["pipe", "pipe", "pipe"] },
      );
      let workerReady = false;
      worker.stdout?.on("data", (b) => {
        if (String(b).includes("STAFF_READ_WORKER_READY")) workerReady = true;
      });
      worker.stderr?.on(
        "data",
        (b) => void appendFile(path.join(artifact, "staff-worker.log"), b),
      );
      worker.stdin!.end(
        JSON.stringify({
          mfaUrl: fixture.profile.url("mfa"),
          readUrl: fixture.readUrl,
          secret: channel,
          socket,
        }),
      );
      for (let n = 0; n < 100 && !workerReady; n++) {
        if (worker.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.equal(
        workerReady,
        true,
        "private worker must start without leaking bootstrap",
      );
      const appEnv = {
        ...common,
        DATABASE_URL: runtime,
        TEST_DATABASE_URL: runtime,
        MRT_TEST_DATABASE_URL: runtime,
        HUSTLEN_STAFF_READ_CHANNEL_KEY: channel,
        HUSTLEN_STAFF_READ_SOCKET: socket,
      };
      assert.ok(!Object.values(appEnv).includes(fixture.readUrl));
      assert.ok(!Object.values(appEnv).includes(fixture.profile.url("mfa")));
      app = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          port,
        ],
        { env: appEnv, stdio: ["ignore", "pipe", "pipe"] },
      );
      for (const stream of [app.stdout, app.stderr])
        stream?.on(
          "data",
          (b) => void appendFile(path.join(artifact, "staff-app.log"), b),
        );
      let ready = false;
      for (let n = 0; n < 150; n++) {
        try {
          if (
            (
              await fetch(base + "/api/auth/me", {
                signal: AbortSignal.timeout(1000),
              })
            ).status === 401
          ) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.equal(ready, true);
      await t.test(
        "anonymous, ordinary, legacy ADMIN and forged selectors cannot obtain staff data",
        async () => {
          assert.equal(
            (
              await api({
                action: "read",
                listingId: String(fixture!.listing),
                bindingId: randomUUID(),
              })
            ).status,
            401,
          );
          const ordinary = await mfaActorFixture(owner);
          assert.equal(
            (
              await api(
                { action: "enroll.begin", password: MFA_PASSWORD },
                ordinary,
              )
            ).status,
            403,
          );
          await owner.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
            ordinary.userId,
          ]);
          assert.equal(
            (
              await api(
                {
                  action: "read",
                  listingId: String(fixture!.listing),
                  bindingId: randomUUID(),
                },
                ordinary,
              )
            ).status,
            403,
          );
          const f = await verified();
          for (const extra of [
            { role: "OPERATIONS" },
            { personId: f.actor.personId },
            { capability: "listings.read" },
            { grantId: f.actor.grant },
            { policy: "hustlen-listing-read-fixture-v1" },
            { mfaVerified: true },
            { caseId: "1" },
            { count: true },
            { limit: 100 },
            { resourceIds: [fixture!.listing] },
          ])
            assert.equal(
              (await api({ ...readBody(f), ...extra }, f.actor)).status,
              400,
            );
          for (const headers of [
            { Origin: "https://evil.example" },
            { Origin: "" },
            { "Sec-Fetch-Site": "cross-site" },
          ] as Record<string, string>[])
            assert.equal(
              (await api(readBody(f), f.actor, headers)).status,
              403,
            );
        },
      );
      await t.test(
        "only exact granted four-field projection returns after a durable correctly attributed audit",
        async () => {
          const f = await verified(),
            before = await counts(),
            r = await api(readBody(f), f.actor);
          assert.equal(r.status, 200);
          const data = await r.json();
          assert.deepEqual(Object.keys(data).sort(), [
            "adminRestricted",
            "category",
            "id",
            "status",
          ]);
          assert.equal(data.id, fixture!.listing);
          assert.equal(data.category, "Cameras");
          assert.equal(await counts(), before + 1);
          assert.equal(
            r.headers.get("x-hustlen-identity"),
            "OWNED_SYNTHETIC_HUMAN",
          );
          assert.match(r.headers.get("cache-control")!, /no-store/);
          const event = (
            await owner.query(
              `SELECT * FROM hustlen_staff_read_fixture.audit WHERE "bindingId"=$1`,
              [f.bindingId],
            )
          ).rows[0];
          assert.equal(event.personId, f.actor.personId);
          assert.equal(event.userId, f.actor.userId);
          assert.equal(event.grantId, f.actor.grant);
          assert.equal(event.action, "listings.read");
          assert.equal(event.result, "TEST_ACCESS_COMMITTED");
          assert.equal(event.assuranceId, f.assuranceId);
          assert.equal(event.databaseActor, new URL(fixture!.readUrl).username);
          const deniedA = await api(readBody(f, fixture!.outside), f.actor),
            deniedB = await api(readBody(f, 2147483000), f.actor);
          assert.equal(deniedA.status, 403);
          assert.equal(deniedB.status, 403);
          assert.equal(await deniedA.text(), await deniedB.text());
          assert.equal(await counts(), before + 1);
        },
      );
      await t.test(
        "wrong role, revoked/expired membership and grant, stale association or proof deny without metadata",
        async () => {
          const cases: [
            string,
            (f: Awaited<ReturnType<typeof verified>>) => Promise<unknown>,
          ][] = [
            [
              "role",
              (f) =>
                owner.query(
                  `UPDATE hustlen_staff_read_fixture.member SET role='SUPPORT' WHERE id=$1`,
                  [f.actor.member],
                ),
            ],
            [
              "membership revoked",
              (f) =>
                owner.query(
                  `UPDATE hustlen_staff_read_fixture.member SET state='TEST_REVOKED' WHERE id=$1`,
                  [f.actor.member],
                ),
            ],
            [
              "membership expired",
              (f) =>
                owner.query(
                  `UPDATE hustlen_staff_read_fixture.member SET "validFrom"=NOW()-interval '2 hours',"expiresAt"=NOW()-interval '1 hour' WHERE id=$1`,
                  [f.actor.member],
                ),
            ],
            [
              "grant revoked",
              (f) =>
                owner.query(
                  `UPDATE hustlen_staff_read_fixture.grant SET state='TEST_REVOKED' WHERE id=$1`,
                  [f.actor.grant],
                ),
            ],
            [
              "grant expired",
              (f) =>
                owner.query(
                  `UPDATE hustlen_staff_read_fixture.grant SET "validFrom"=NOW()-interval '2 hours',"expiresAt"=NOW()-interval '1 hour' WHERE id=$1`,
                  [f.actor.grant],
                ),
            ],
            [
              "association revoked",
              (f) =>
                owner.query(
                  `UPDATE "StaffAccountAssociation" SET state='REVOKED' WHERE id=$1`,
                  [f.actor.associationId],
                ),
            ],
            [
              "account suspended",
              (f) =>
                owner.query(
                  `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
                  [f.actor.userId],
                ),
            ],
            [
              "key revoked",
              (f) =>
                owner.query(
                  `UPDATE "StaffMfaCredential" SET "revokedAt"=NOW() WHERE "associationId"=$1`,
                  [f.actor.associationId],
                ),
            ],
            [
              "MFA version stale",
              (f) =>
                owner.query(
                  `UPDATE "StaffMfaVersion" SET version=version+1 WHERE "associationId"=$1`,
                  [f.actor.associationId],
                ),
            ],
            [
              "authorization epoch stale",
              (f) =>
                owner.query(
                  `UPDATE "StaffPerson" SET verification='REVOKED' WHERE id=$1`,
                  [f.actor.personId],
                ),
            ],
          ];
          for (const [, change] of cases) {
            const f = await verified();
            await change(f);
            await deniedRead(f);
          }
        },
      );
      await t.test(
        "missing membership, wrong session/incarnation, expired assurance and invented bindings deny",
        async () => {
          const f = await verified();
          await deniedRead(f, { ...readBody(f), bindingId: randomUUID() });
          const token = randomUUID();
          await owner.query(
            `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour')`,
            [f.actor.userId, createHash("sha256").update(token).digest("hex")],
          );
          const swapped = await api(readBody(f), { token });
          assert.equal(swapped.status, 403);
          const other = await verified();
          await owner.query(`DELETE FROM "AuthSession" WHERE id=$1`, [
            other.actor.sessionId,
          ]);
          await owner.query(
            `INSERT INTO "AuthSession" (id,"userId","tokenHash","createdAt","expiresAt") VALUES ($1,$2,$3,NOW()+interval '1 second',NOW()+interval '1 hour')`,
            [
              other.actor.sessionId,
              other.actor.userId,
              createHash("sha256").update(other.actor.token).digest("hex"),
            ],
          );
          await deniedRead(other);
          const expired = await verified();
          await owner.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE id=$1`,
            [expired.actor.sessionId],
          );
          assert.equal(
            (await api(readBody(expired), expired.actor)).status,
            401,
          );
          assert.equal((await api(f.proofBody, f.actor)).status, 403);
        },
      );
      await t.test(
        "expired real-assurance context and missing grant cannot be replaced with invented proof flags",
        async () => {
          const f = await verified(),
            proofId = randomUUID(),
            bindingId = randomUUID();
          await owner.query(
            `INSERT INTO "StaffMfaAssurance" (id,"associationId","credentialKey","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion","policyVersion","configHash","assertionDigest","verifiedAt","expiresAt") SELECT $1,"associationId","credentialKey","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion","policyVersion","configHash",$2,NOW()-interval '6 minutes',NOW()-interval '2 minutes' FROM "StaffMfaAssurance" WHERE id=$3`,
            [
              proofId,
              createHash("sha256").update(randomUUID()).digest("hex"),
              f.assuranceId,
            ],
          );
          await owner.query(
            `INSERT INTO hustlen_staff_read_fixture.binding (id,"memberId","memberVersion","assuranceId","sessionId","sessionBorn",epoch,"expiresAt") SELECT $1,"memberId","memberVersion",$2,"sessionId","sessionBorn",epoch,NOW()+interval '1 minute' FROM hustlen_staff_read_fixture.binding WHERE id=$3`,
            [bindingId, proofId, f.bindingId],
          );
          await deniedRead(f, { ...readBody(f), bindingId });
          const missing = await verified();
          await owner.query(
            `DELETE FROM hustlen_staff_read_fixture.grant WHERE id=$1`,
            [missing.actor.grant],
          );
          await deniedRead(missing);
          for (const id of ["*", "1,2", "0", "-1", "2147483648"])
            assert.equal(
              (await api({ ...readBody(f), listingId: id }, f.actor)).status,
              403,
            );
        },
      );
      await t.test(
        "authority expiring during audit rolls back both audit and selected metadata",
        async () => {
          const f = await enrolled();
          await owner.query(
            `UPDATE hustlen_staff_read_fixture.member SET "expiresAt"=clock_timestamp()+interval '900 milliseconds' WHERE id=$1`,
            [f.actor.member],
          );
          const c = await cmd({ action: "verify.begin" }, f.actor),
            v = await cmd(
              {
                action: "verify.finish",
                challengeId: c.challengeId,
                response: f.auth.assertion(
                  c.options.challenge,
                  base,
                  "localhost",
                  f.handle,
                ),
              },
              f.actor,
            );
          await owner.query(
            `CREATE FUNCTION hustlen_staff_read_fixture.slow_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1); RETURN NEW; END $$; CREATE TRIGGER slow_audit BEFORE INSERT ON hustlen_staff_read_fixture.audit FOR EACH ROW EXECUTE FUNCTION hustlen_staff_read_fixture.slow_audit()`,
          );
          try {
            const before = await counts(),
              r = await api(
                {
                  action: "read",
                  bindingId: v.bindingId,
                  listingId: String(fixture!.listing),
                },
                f.actor,
              );
            assert.equal(r.status, 403);
            assert.equal(await counts(), before);
            assert.ok(!(await r.text()).includes("Cameras"));
          } finally {
            await owner.query(
              `DROP TRIGGER slow_audit ON hustlen_staff_read_fixture.audit; DROP FUNCTION hustlen_staff_read_fixture.slow_audit()`,
            );
          }
        },
      );
      await t.test(
        "audit failure and append-only history protection fail closed",
        async () => {
          const f = await verified(),
            before = await counts();
          await owner.query(
            `CREATE FUNCTION hustlen_staff_read_fixture.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit unavailable'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON hustlen_staff_read_fixture.audit FOR EACH ROW EXECUTE FUNCTION hustlen_staff_read_fixture.fail_audit()`,
          );
          try {
            await deniedRead(f);
          } finally {
            await owner.query(
              `DROP TRIGGER fail_audit ON hustlen_staff_read_fixture.audit; DROP FUNCTION hustlen_staff_read_fixture.fail_audit()`,
            );
          }
          assert.equal((await api(readBody(f), f.actor)).status, 200);
          assert.equal(await counts(), before + 1);
          await assert.rejects(() =>
            owner.query(
              `UPDATE hustlen_staff_read_fixture.audit SET result='changed'`,
            ),
          );
          await assert.rejects(() =>
            owner.query(`TRUNCATE hustlen_staff_read_fixture.audit`),
          );
        },
      );
      await t.test(
        "ordinary runtime cannot forge grants, real MFA, bindings or success audit records",
        async () => {
          const runtime = await fixture!.runtimeClient();
          for (const table of [
            "hustlen_staff_read_fixture.member",
            "hustlen_staff_read_fixture.grant",
            "hustlen_staff_read_fixture.binding",
            "hustlen_staff_read_fixture.audit",
            'public."StaffMfaAssurance"',
            'public."StaffMembership"',
          ]) {
            let code = "";
            try {
              await runtime.query(`INSERT INTO ${table} DEFAULT VALUES`);
            } catch (e) {
              code = (e as { code: string }).code;
            }
            assert.equal(code, "42501");
          }
          await assert.rejects(() =>
            runtime.query(
              `ALTER TABLE hustlen_staff_read_fixture.audit DISABLE TRIGGER ALL`,
            ),
          );
        },
      );
      await t.test(
        "a pending read observes committed revocation after waiting and never streams early",
        async () => {
          const f = await verified(),
            peer = await connectTestDatabase(),
            before = await counts();
          await peer.query("BEGIN");
          await peer.query(
            `SELECT id FROM hustlen_staff_read_fixture.grant WHERE id=$1 FOR UPDATE`,
            [f.actor.grant],
          );
          let headers = false;
          const pending = api(readBody(f), f.actor).then((r) => {
            headers = true;
            return r;
          });
          try {
            let waited = false;
            for (let n = 0; n < 30; n++) {
              const r = await owner.query(
                `SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%hustlen_staff_read_fixture.grant%'`,
              );
              if (r.rowCount) {
                waited = true;
                break;
              }
              await new Promise((r) => setTimeout(r, 10));
            }
            assert.equal(waited, true);
            assert.equal(headers, false);
            await peer.query(
              `UPDATE hustlen_staff_read_fixture.grant SET state='TEST_REVOKED' WHERE id=$1`,
              [f.actor.grant],
            );
            await peer.query("COMMIT");
            assert.equal((await pending).status, 403);
            assert.equal(await counts(), before);
          } finally {
            await peer.query("ROLLBACK");
            await peer.end();
          }
        },
      );
      await t.test(
        "a revocation waiting behind an authorized read serializes after its committed audit",
        async () => {
          const f = await verified(),
            blocker = await connectTestDatabase(),
            revoker = await connectTestDatabase();
          await blocker.query("BEGIN");
          await blocker.query(
            `SELECT id FROM "Listing" WHERE id=$1 FOR UPDATE`,
            [fixture!.listing],
          );
          const pending = api(readBody(f), f.actor);
          let waiting = false;
          for (let n = 0; n < 25; n++) {
            const r = await owner.query(
              `SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM public."Listing"%'`,
            );
            if (r.rowCount) {
              waiting = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 8));
          }
          assert.equal(waiting, true);
          const revoke = revoker.query(
            `UPDATE hustlen_staff_read_fixture.grant SET state='TEST_REVOKED' WHERE id=$1`,
            [f.actor.grant],
          );
          try {
            await blocker.query("COMMIT");
            assert.equal((await pending).status, 200);
            await revoke;
            await deniedRead(f);
          } finally {
            await blocker.query("ROLLBACK");
            await blocker.end();
            await revoker.end();
          }
        },
      );
      await t.test(
        "lock timeout suppresses data and ownership failure refuses before worker selection",
        async () => {
          const f = await verified(),
            peer = await connectTestDatabase();
          await peer.query("BEGIN");
          await peer.query(`SELECT id FROM "Listing" WHERE id=$1 FOR UPDATE`, [
            fixture!.listing,
          ]);
          try {
            await deniedRead(f);
          } finally {
            await peer.query("ROLLBACK");
            await peer.end();
          }
          const database = (await owner.query("SELECT current_database() n"))
            .rows[0].n;
          await owner.query(
            `COMMENT ON DATABASE "${database}" IS 'wrong-marker'`,
          );
          try {
            assert.equal((await api(readBody(f), f.actor)).status, 404);
          } finally {
            await owner.query(
              `COMMENT ON DATABASE "${database}" IS 'hustlen-mrt-test:${runId}'`,
            );
          }
        },
      );
      await t.test(
        "actual browser native passkey and scoped inspection show synthetic status and exact metadata",
        async () => {
          const actor = await fixture!.seed(),
            email = (
              await owner.query(`SELECT email FROM "User" WHERE id=$1`, [
                actor.userId,
              ])
            ).rows[0].email,
            browser = await chromium.launch({
              executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
              headless: true,
              args: ["--no-sandbox"],
            });
          try {
            const page = await browser.newPage({
                viewport: { width: 1200, height: 1000 },
              }),
              cdp = await page.context().newCDPSession(page);
            await cdp.send("WebAuthn.enable");
            await cdp.send("WebAuthn.addVirtualAuthenticator", {
              options: {
                protocol: "ctap2",
                transport: "internal",
                hasResidentKey: true,
                hasUserVerification: true,
                isUserVerified: true,
                automaticPresenceSimulation: true,
              },
            });
            await page.goto(base + "/login");
            await page.getByLabel("Email address", { exact: true }).fill(email);
            await page
              .getByLabel("Password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click();
            await expect(page).not.toHaveURL(/\/login$/);
            await page.goto(base + "/dev/staff-listing-inspection");
            await page
              .getByLabel("Current password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Enroll fixture passkey" })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Fixture passkey enrolled",
            );
            await page
              .getByRole("button", { name: "Verify fixture passkey" })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "Real factor verified",
            );
            await page
              .getByLabel("Listing ID", { exact: true })
              .fill(String(fixture!.listing));
            const before = await counts();
            await page
              .getByRole("button", { name: "Inspect scoped metadata" })
              .click();
            await expect(page.getByRole("status")).toContainText(
              "after durable test access audit",
            );
            assert.equal(await counts(), before + 1);
            await expect(
              page.getByText("Cameras", { exact: true }),
            ).toBeVisible();
            assert.ok(
              !(await page.textContent("body"))!.includes(
                "PRIVATE_TITLE_CANARY",
              ),
            );
            await page.screenshot({
              path: path.join(artifact, "staff-read-desktop.png"),
              fullPage: true,
            });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({
              path: path.join(artifact, "staff-read-mobile.png"),
              fullPage: true,
            });
          } finally {
            await browser.close();
          }
        },
      );
      await t.test(
        "worker outage denies and all production activation restrictions remain installed",
        async () => {
          const f = await verified(),
            before = await counts();
          await stop(worker);
          assert.equal((await api(readBody(f), f.actor)).status, 503);
          assert.equal(await counts(), before);
          for (const table of ["StaffMembership", "StaffCapabilityGrant"])
            assert.equal(
              (
                await owner.query(
                  `SELECT count(*)::int n FROM "${table}" WHERE state='ACTIVE'`,
                )
              ).rows[0].n,
              0,
            );
          const constraints = (
            await owner.query(
              `SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname IN ('staff_membership_inactive_only','staff_grant_inactive_only','staff_change_inactive','staff_decision_inactive','staff_no_live_success')`,
            )
          ).rows;
          assert.equal(constraints.length, 5);
        },
      );
      const samples = (
        await owner.query(
          `SELECT "correlationId","userId","personId","sessionId","sessionBorn","memberId","memberVersion","grantId","grantVersion","listingId","assuranceId",epoch,"mfaVersion","resourceVersion",policy,action,result,"databaseActor","createdAt" FROM hustlen_staff_read_fixture.audit ORDER BY id LIMIT 3`,
        )
      ).rows;
      await writeFile(
        path.join(artifact, "staff-read-audit-sample.json"),
        JSON.stringify(samples, null, 2) + "\n",
      );
      await writeFile(
        path.join(artifact, "staff-read-evidence.json"),
        JSON.stringify(
          {
            onlyProjection: ["id", "status", "category", "adminRestricted"],
            separateWorkerProcess: true,
            privilegedDbCredentialsInAppEnv: false,
            syntheticIdentityOnly: true,
            realWebAuthn: true,
            successAuditCount: await counts(),
            activationConstraintsPreserved: true,
            workerOsIsolationCertified: false,
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      await stop(app);
      await stop(worker);
      await fixture?.cleanup();
      await owner.end();
    }
  },
);
