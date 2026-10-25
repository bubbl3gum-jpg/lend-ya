import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { connectTestDatabase } from "./support/test-database";
import { supportStaffFixture } from "./support/support-staff-fixture";
import { mfaActorFixture, MFA_PASSWORD } from "./support/mfa-fixtures";
import { realTestAuthenticator } from "./support/webauthn-authenticator";
import { scopedSupportService } from "../lib/support-staff-candidate/service";
import { supportStaffConfig } from "../lib/support-staff-candidate/config";

test(
  "Batch 8D persisted assignment, scoped SQL, native passkey, two-way channel and fail-closed audit",
  { timeout: 240000 },
  async (t) => {
    const owner = await connectTestDatabase(),
      base = "http://localhost:" + process.env.TEST_ADMIN_PORT!,
      artifact = process.env.MRT_TEST_ARTIFACT_DIR!,
      runId = process.env.MRT_TEST_RUN_ID!;
    let fixture: Awaited<ReturnType<typeof supportStaffFixture>> | undefined,
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
    type Actor = {
      token: string;
      userId: number;
      personId: string;
      sessionId: number;
    };
    const api = async (
      kind: "staff" | "requester",
      body: object,
      actor?: { token: string },
      headers: Record<string, string> = {},
    ) => {
      const r = await fetch(
        base + "/api/dev/support-" + (kind === "staff" ? "agent" : "requester"),
        {
          method: "POST",
          headers: {
            Origin: base,
            "Content-Type": "application/json",
            ...(actor ? { Cookie: "p2p_session=" + actor.token } : {}),
            ...headers,
          },
          body: JSON.stringify(body),
        },
      );
      return { status: r.status, body: await r.json(), headers: r.headers };
    };
    const cmd = async (kind: "staff" | "requester", body: object, a: Actor) => {
      const r = await api(kind, body, a);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.match(r.headers.get("cache-control")!, /private, no-store/);
      return r.body;
    };
    const auditCount = async () =>
      Number(
        (
          await owner.query(
            "SELECT count(*) n FROM hustlen_support_candidate.audit",
          )
        ).rows[0].n,
      );
    const message = (content: string) => ({
      content,
      requestKey: randomUUID(),
    });
    const makeCase = async (a: Actor) => {
      const ticket = await cmd(
        "requester",
        {
          action: "create",
          categoryCode: "RENTAL_HANDOFF_RETURN",
          subject: "Synthetic scoped ticket",
          description: "Synthetic intake; no private imports",
          bookingId: fixture!.booking,
          requestKey: randomUUID(),
        },
        a,
      );
      const channel = await cmd(
        "requester",
        { action: "channel", ticketId: ticket.id },
        a,
      );
      return { ticket: ticket.id, channel: channel.id };
    };
    const read = (c: { ticket: string; channel: string }) => ({
      action: "read",
      ticketId: c.ticket,
      channelId: c.channel,
    });
    const verify = async (a: Actor) => {
      const auth = realTestAuthenticator(),
        e = await cmd(
          "staff",
          { action: "enroll.begin", password: MFA_PASSWORD },
          a,
        );
      await cmd(
        "staff",
        {
          action: "enroll.finish",
          password: MFA_PASSWORD,
          challengeId: e.challengeId,
          response: auth.registration(e.options.challenge, base, "localhost"),
        },
        a,
      );
      const v = await cmd("staff", { action: "verify.begin" }, a);
      const response = auth.assertion(
        v.options.challenge,
        base,
        "localhost",
        e.options.user.id,
      );
      const raw = await api(
        "staff",
        { action: "verify.finish", challengeId: v.challengeId, response },
        a,
      );
      if (raw.status !== 200) {
        const db = await fixture!.supportClient();
        try {
          const proof = (
            await owner.query(
              `SELECT id FROM "StaffMfaAssurance" WHERE "associationId"=(SELECT id FROM "StaffAccountAssociation" WHERE "userId"=$1) ORDER BY "verifiedAt" DESC LIMIT 1`,
              [a.userId],
            )
          ).rows[0];
          if (proof)
            try {
              await db.query(
                "SELECT hustlen_support_candidate.bind($1,$2::uuid)",
                [a.token, proof.id],
              );
            } catch (error) {
              const code = (error as { code?: string }).code;
              assert.fail("Binding SQLSTATE " + code);
            }
        } finally {
          await db.end();
        }
      }
      assert.equal(raw.status, 200, JSON.stringify(raw.body));
      const proof = raw.body;
      assert.equal(proof.factorVerified, true);
      assert.equal(proof.staffAuthorized, false);
      return { auth, handle: e.options.user.id };
    };
    const denied = async (
      a: Actor,
      c: { ticket: string; channel: string },
      kind: "staff" | "requester" = "staff",
    ) => {
      const before = await auditCount(),
        r = await api(kind, read(c), a);
      assert.equal(r.status, 403);
      assert.deepEqual(Object.keys(r.body), ["error"]);
      assert.equal(await auditCount(), before);
    };
    try {
      fixture = await supportStaffFixture(owner, base);
      const common = {
        PATH: process.env.PATH,
        NODE_ENV: "development" as const,
        MRT_TEST_RUN_ID: runId,
        MRT_TEST_ARTIFACT_DIR: artifact,
        HUSTLEN_SUPPORT_STAFF_CANDIDATE: "owned-synthetic-only",
        HUSTLEN_SUPPORT_STAFF_ORIGIN: base,
      };
      const secret = randomBytes(32).toString("hex"),
        socket = `/tmp/hustlen-support-${runId}.sock`,
        runtime = fixture.profile.url("runtime");
      worker = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/support-candidate-worker.mjs"],
        { env: common, stdio: ["pipe", "pipe", "pipe"] },
      );
      let ready = false;
      worker.stdout?.on("data", (b) => {
        if (String(b).includes("SUPPORT_WORKER_READY")) ready = true;
      });
      worker.stderr?.on(
        "data",
        (b) => void appendFile(path.join(artifact, "worker.log"), b),
      );
      worker.stdin!.end(
        JSON.stringify({
          mfaUrl: fixture.profile.url("mfa"),
          supportUrl: fixture.supportUrl,
          secret,
          socket,
        }),
      );
      for (let n = 0; n < 100 && !ready; n++) {
        if (worker.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.equal(ready, true, "restricted worker must start");
      const appEnv = {
        ...common,
        DATABASE_URL: runtime,
        TEST_DATABASE_URL: runtime,
        MRT_TEST_DATABASE_URL: runtime,
        HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY: secret,
        HUSTLEN_SUPPORT_STAFF_SOCKET: socket,
      };
      assert.ok(!Object.values(appEnv).includes(fixture.supportUrl));
      assert.ok(!Object.values(appEnv).includes(fixture.profile.url("mfa")));
      app = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--hostname",
          "localhost",
          "--port",
          process.env.TEST_ADMIN_PORT!,
        ],
        { env: appEnv, stdio: ["ignore", "pipe", "pipe"] },
      );
      app.stdout?.on(
        "data",
        (b) => void appendFile(path.join(artifact, "app.log"), b),
      );
      app.stderr?.on(
        "data",
        (b) => void appendFile(path.join(artifact, "app.log"), b),
      );
      let appReady = false;
      for (let n = 0; n < 120; n++) {
        try {
          if ((await fetch(base + "/login")).ok) {
            appReady = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(appReady);
      const agent = await fixture.agent(),
        unrelated = await fixture.agent(),
        admin = await mfaActorFixture(owner),
        reviewer = await mfaActorFixture(owner);
      await owner.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
        admin.userId,
      ]);
      await owner.query(
        `INSERT INTO "ChatReviewer"("userId",enabled)VALUES($1,true)`,
        [reviewer.userId],
      );
      const own = await makeCase(fixture.requester),
        other = await makeCase(fixture.borrower),
        canary = "PRIVATE-8D-" + randomUUID();
      const grant = await fixture.assign(agent, own.ticket, own.channel);
      let agentAuth: Awaited<ReturnType<typeof verify>>;
      const source = (
        await owner.query(
          `SELECT row_to_json(b)::text row FROM "Booking" b WHERE id=$1`,
          [fixture.booking],
        )
      ).rows[0].row;
      await t.test(
        "independent tickets and exact per-action/channel grants; no legacy privilege bypass",
        async () => {
          await cmd(
            "requester",
            {
              action: "message",
              ticketId: own.ticket,
              channelId: own.channel,
              ...message(canary),
            },
            fixture!.requester,
          );
          await cmd(
            "requester",
            {
              action: "message",
              ticketId: other.ticket,
              channelId: other.channel,
              ...message("Borrower-private-" + canary),
            },
            fixture!.borrower,
          );
          await denied(fixture!.requester, other, "requester");
          await denied(fixture!.borrower, own, "requester");
          await denied(fixture!.outsider, own, "requester");
          await denied(agent, own);
          agentAuth = await verify(agent);
          await verify(unrelated);
          const rows = await cmd("staff", read(own), agent);
          assert.equal(rows[0].content, canary);
          await denied(agent, other);
          await denied(unrelated, own);
          await denied(admin, own);
          await denied(reviewer, own);
          const queue = await cmd("staff", { action: "queue" }, agent);
          assert.deepEqual(
            queue.map((x: { id: string }) => x.id),
            [own.ticket],
          );
          assert.deepEqual(
            Object.keys(queue[0]).sort(),
            ["id", "categoryCode", "currentState", "createdAt"].sort(),
          );
          const channels = await cmd(
            "staff",
            { action: "channels", ticketId: own.ticket },
            agent,
          );
          assert.deepEqual(channels, [{ id: own.channel }]);
          const events = await cmd(
            "staff",
            { action: "events", ticketId: own.ticket },
            agent,
          );
          assert.equal(events[0].eventType, "TICKET_RECEIVED");
          assert.ok(!JSON.stringify(events).includes(canary));
        },
      );
      await t.test(
        "closed commands, exact Origin/CSRF and current ACTIVE sessions",
        async () => {
          assert.equal((await api("staff", read(own))).status, 401);
          for (const extra of [
            { role: "SUPPORT" },
            { staffId: agent.personId },
            { assignmentId: grant.assignment },
            { assurance: true },
            { userId: agent.userId },
          ])
            assert.equal(
              (await api("staff", { ...read(own), ...extra }, agent)).status,
              400,
            );
          for (const headers of [
            { Origin: "http://evil.invalid" },
            { Origin: "" },
            { "sec-fetch-site": "cross-site" },
          ] as Record<string, string>[])
            assert.equal(
              (await api("staff", read(own), agent, headers)).status,
              403,
            );
          await denied(agent, { ticket: randomUUID(), channel: randomUUID() });
          await denied(agent, { ticket: other.ticket, channel: own.channel });
          const expired = await mfaActorFixture(owner);
          await owner.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 minute' WHERE id=$1`,
            [expired.sessionId],
          );
          assert.equal((await api("staff", read(own), expired)).status, 401);
          assert.equal(
            (
              await owner.query(
                `SELECT count(*)::int n FROM "AuthSession" WHERE id=$1`,
                [expired.sessionId],
              )
            ).rows[0].n,
            0,
          );
          await owner.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [agent.userId],
          );
          try {
            await denied(agent, own);
          } finally {
            await owner.query(
              `UPDATE "User" SET "accountStatus"='ACTIVE' WHERE id=$1`,
              [agent.userId],
            );
          }
          await owner.query(
            `UPDATE "AuthSession" SET "createdAt"="createdAt"+interval '1 millisecond' WHERE id=$1`,
            [agent.sessionId],
          );
          try {
            await denied(agent, own);
          } finally {
            await owner.query(
              `UPDATE "AuthSession" SET "createdAt"="createdAt"-interval '1 millisecond' WHERE id=$1`,
              [agent.sessionId],
            );
          }
        },
      );
      await t.test(
        "atomic replies, shared stream ordering, concurrent retries and immutable attribution",
        async () => {
          const body = {
              action: "reply",
              ticketId: own.ticket,
              channelId: own.channel,
              ...message("Test reply " + canary),
            },
            results = await Promise.all([
              cmd("staff", body, agent),
              cmd("staff", body, agent),
            ]);
          assert.equal(results[0].id, results[1].id);
          assert.deepEqual(results.map((r) => r.replayed).sort(), [
            false,
            true,
          ]);
          assert.equal(
            (await api("staff", { ...body, content: "Changed" }, agent)).status,
            403,
          );
          await Promise.all(
            Array.from({ length: 6 }, (_, i) =>
              cmd(
                "staff",
                {
                  action: "reply",
                  ticketId: own.ticket,
                  channelId: own.channel,
                  ...message("Concurrent " + i),
                },
                agent,
              ),
            ),
          );
          await cmd(
            "requester",
            {
              action: "message",
              ticketId: own.ticket,
              channelId: own.channel,
              ...message("Requester after staff"),
            },
            fixture!.requester,
          );
          const rows = await cmd("requester", read(own), fixture!.requester);
          assert.deepEqual(
            rows.map((x: { sequence: number }) => x.sequence),
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
          );
          assert.equal(rows[1].authorKind, "SUPPORT_TEST");
          assert.equal(rows[1].content, body.content);
          for (const sql of [
            `UPDATE hustlen_support_candidate.reply SET content='Forged'`,
            `DELETE FROM hustlen_support_candidate.reply`,
            `TRUNCATE hustlen_support_candidate.audit`,
            `TRUNCATE hustlen_support_candidate.assignment CASCADE`,
            `UPDATE hustlen_support_candidate.audit SET outcome='TEST_ACCESS_COMMITTED'`,
            `DELETE FROM hustlen_support_candidate.authorization_history`,
          ])
            await assert.rejects(owner.query(sql));
          assert.equal(
            (
              await owner.query(
                `SELECT count(*)::int n FROM hustlen_support_candidate.reply r LEFT JOIN hustlen_support_candidate.audit a ON a.id=r."auditId" AND a."replyId"=r.id AND a."personId"=r."personId" AND a."channelId"=r."channelId" WHERE a.id IS NULL`,
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "required audit failures suppress private reads and roll back all reply/stream writes",
        async () => {
          const before = await auditCount(),
            counts = (
              await owner.query(
                `SELECT (SELECT count(*) FROM hustlen_support_candidate.reply) replies,(SELECT count(*) FROM hustlen_support_candidate.entry) entries`,
              )
            ).rows[0];
          await owner.query(
            `CREATE FUNCTION hustlen_support_candidate.owned_audit_failure()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Owned injected audit failure';END$$;CREATE TRIGGER owned_audit_failure BEFORE INSERT ON hustlen_support_candidate.audit FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.owned_audit_failure()`,
          );
          try {
            await denied(agent, own);
            assert.equal(
              (
                await api(
                  "staff",
                  {
                    action: "reply",
                    ticketId: own.ticket,
                    channelId: own.channel,
                    ...message("Must roll back"),
                  },
                  agent,
                )
              ).status,
              403,
            );
            assert.equal(await auditCount(), before);
            assert.deepEqual(
              (
                await owner.query(
                  `SELECT (SELECT count(*) FROM hustlen_support_candidate.reply) replies,(SELECT count(*) FROM hustlen_support_candidate.entry) entries`,
                )
              ).rows[0],
              counts,
            );
          } finally {
            await owner.query(
              `DROP TRIGGER owned_audit_failure ON hustlen_support_candidate.audit;DROP FUNCTION hustlen_support_candidate.owned_audit_failure()`,
            );
          }
          await owner.query(
            `CREATE FUNCTION hustlen_support_candidate.owned_stream_failure()RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Owned late write failure';END$$;CREATE TRIGGER owned_stream_failure AFTER INSERT ON hustlen_support_candidate.entry FOR EACH ROW EXECUTE FUNCTION hustlen_support_candidate.owned_stream_failure()`,
          );
          try {
            assert.equal(
              (
                await api(
                  "staff",
                  {
                    action: "reply",
                    ticketId: own.ticket,
                    channelId: own.channel,
                    ...message("Late rollback"),
                  },
                  agent,
                )
              ).status,
              403,
            );
            assert.equal(await auditCount(), before);
            assert.deepEqual(
              (
                await owner.query(
                  `SELECT (SELECT count(*) FROM hustlen_support_candidate.reply) replies,(SELECT count(*) FROM hustlen_support_candidate.entry) entries`,
                )
              ).rows[0],
              counts,
            );
          } finally {
            await owner.query(
              `DROP TRIGGER owned_stream_failure ON hustlen_support_candidate.entry;DROP FUNCTION hustlen_support_candidate.owned_stream_failure()`,
            );
          }
          await assert.rejects(
            owner.query(
              `INSERT INTO hustlen_support_candidate.reply(id,"channelId","ticketId","personId","requestKey","requestHash",content,"auditId")VALUES($1,$2,$3,$4,$5,repeat('a',64),'Unaudited reply',$6)`,
              [
                randomUUID(),
                own.channel,
                own.ticket,
                agent.personId,
                randomUUID(),
                randomUUID(),
              ],
            ),
          );
          await cmd("staff", read(own), agent);
        },
      );
      await t.test(
        "canonical aliases, participant conflicts and independent assignment authority",
        async () => {
          const epochBefore = (
            await owner.query(
              `SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
              [agent.personId],
            )
          ).rows[0].version;
          const alias = await mfaActorFixture(owner, agent.personId);
          await denied(alias, own);
          assert.ok(
            BigInt(
              (
                await owner.query(
                  `SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
                  [agent.personId],
                )
              ).rows[0].version,
            ) > BigInt(epochBefore),
          );
          await denied(agent, own);
          const fresh = await cmd("staff", { action: "verify.begin" }, agent);
          await cmd(
            "staff",
            {
              action: "verify.finish",
              challengeId: fresh.challengeId,
              response: agentAuth.auth.assertion(
                fresh.options.challenge,
                base,
                "localhost",
                agentAuth.handle,
              ),
            },
            agent,
          );
          const conflict = await fixture!.agent(fixture!.borrower.personId);
          const c = await makeCase(fixture!.requester);
          await assert.rejects(fixture!.assign(conflict, c.ticket, c.channel));
          await assert.rejects(
            fixture!.assign(
              unrelated,
              c.ticket,
              c.channel,
              undefined,
              unrelated.personId,
            ),
          );
          await assert.rejects(
            fixture!.assign(
              unrelated,
              c.ticket,
              c.channel,
              undefined,
              fixture!.requester.personId,
            ),
          );
          const only = await fixture!.assign(unrelated, c.ticket, c.channel, [
            "ticket.metadata.read",
          ]);
          assert.ok(only.assignment);
          assert.equal(
            (
              await cmd(
                "staff",
                { action: "channels", ticketId: c.ticket },
                unrelated,
              )
            ).length,
            0,
          );
          await denied(unrelated, c);
        },
      );
      await t.test(
        "service and real database principals cannot substitute actors, read tables or forge success audits/sessions",
        async () => {
          const runtime = await fixture!.profile.connect("runtime"),
            support = await fixture!.supportClient(),
            mfa = await fixture!.profile.connect("mfa");
          try {
            for (const db of [runtime, support, mfa]) {
              await assert.rejects(
                db.query('CREATE TEMP TABLE "SupportTicket"(id uuid)'),
              );
              for (const sql of [
                'SELECT * FROM "SupportMessage"',
                "SELECT * FROM hustlen_support_candidate.reply",
                "SELECT * FROM hustlen_support_candidate.audit",
                `INSERT INTO hustlen_support_candidate.audit(id)VALUES('${randomUUID()}')`,
                `SELECT hustlen_support_candidate.record_access('{}'::jsonb)`,
                `SELECT hustlen_support_candidate.authorize('{}'::jsonb,NULL,NULL,'channel.read')`,
              ])
                await assert.rejects(db.query(sql));
            }
            await assert.rejects(
              runtime.query(
                `INSERT INTO "AuthSession"("userId","tokenHash","expiresAt")VALUES($1,repeat('e',64),NOW()+interval '1 hour')`,
                [agent.userId],
              ),
            );
            await assert.rejects(
              runtime.query(
                `UPDATE "AuthSession" SET "tokenHash"=repeat('f',64) WHERE id=$1`,
                [agent.sessionId],
              ),
            );
            await assert.rejects(
              runtime.query(
                `UPDATE "User" SET "passwordHash"='forged' WHERE id=$1`,
                [agent.userId],
              ),
            );
            await assert.rejects(
              runtime.query(
                `SELECT hustlen_support_candidate.staff_request($1,$2::jsonb)`,
                [agent.token, JSON.stringify(read(own))],
              ),
            );
            await assert.rejects(
              support.query(
                `SELECT hustlen_support_candidate.staff_request($1,$2::jsonb)`,
                [unrelated.token, JSON.stringify(read(own))],
              ),
            );
            await runtime.query(`SET hustlen.person_id='${agent.personId}'`);
            await assert.rejects(
              runtime.query(
                `SELECT hustlen_support_candidate.requester_request($1,$2::jsonb)`,
                [fixture!.outsider.token, JSON.stringify(read(own))],
              ),
            );
            const pool = new Pool({
                connectionString: fixture!.supportUrl,
                max: 1,
              }),
              old = { ...process.env };
            Object.assign(process.env, {
              ...common,
              DATABASE_URL: fixture!.supportUrl,
              TEST_DATABASE_URL: fixture!.supportUrl,
              MRT_TEST_DATABASE_URL: fixture!.supportUrl,
            });
            try {
              const service = scopedSupportService(
                pool,
                "staff",
                supportStaffConfig(),
              );
              await assert.rejects(service(unrelated.token, read(own)));
              await assert.rejects(
                service(agent.token, { ...read(own), actorId: agent.userId }),
              );
              try {
                assert.equal(
                  ((await service(agent.token, read(own))) as unknown[]).length,
                  9,
                );
              } catch (error) {
                const cause = (error as { cause?: { code?: string } }).cause;
                assert.fail("Direct service SQLSTATE " + cause?.code);
              }
            } finally {
              await pool.end();
              for (const k of Object.keys(process.env))
                if (!(k in old)) delete process.env[k];
              Object.assign(process.env, old);
            }
          } finally {
            await support.end();
          }
        },
      );
      await t.test(
        "native browser Owner/Borrower intake, passkey Agent reply, three viewports and assignment revocation",
        async () => {
          const browser = await chromium.launch({
              executablePath: process.env.CHROMIUM_PATH,
              headless: true,
              args: ["--no-sandbox", "--disable-dev-shm-usage"],
            }),
            agentBrowser = await fixture!.agent();
          const ownContext = await browser.newContext(),
            otherContext = await browser.newContext(),
            staffContext = await browser.newContext();
          const op = await ownContext.newPage(),
            bp = await otherContext.newPage(),
            sp = await staffContext.newPage();
          async function login(page: typeof op, a: Actor) {
            const email = (
              await owner.query(`SELECT email FROM "User" WHERE id=$1`, [
                a.userId,
              ])
            ).rows[0].email;
            await page.goto(base + "/login");
            await page.getByLabel("Email address").fill(email);
            await page
              .getByLabel("Password", { exact: true })
              .fill(MFA_PASSWORD);
            await page
              .getByRole("button", { name: "Log in", exact: true })
              .click();
            await expect(page).not.toHaveURL(/\/login$/);
          }
          async function intake(page: typeof op, a: Actor, text: string) {
            await login(page, a);
            await page.goto(base + "/dev/support-requester");
            await page
              .getByLabel("Own booking ID (optional)")
              .fill(String(fixture!.booking));
            await page
              .getByLabel("Test subject", { exact: true })
              .fill("Public synthetic browser ticket");
            await page
              .getByLabel("Test description", { exact: true })
              .fill("Public synthetic browser acceptance");
            await page
              .getByRole("button", {
                name: "Create own test ticket",
                exact: true,
              })
              .click();
            await expect(
              page.getByText("Own test ticket and own channel created.", {
                exact: false,
              }),
            ).toBeVisible();
            await page
              .getByRole("button", {
                name: "Open permitted channel",
                exact: true,
              })
              .click();
            await page
              .getByLabel("My test message", { exact: true })
              .fill(text);
            await page
              .getByRole("button", {
                name: "Save my test message",
                exact: true,
              })
              .click();
            await expect(page.getByText(text, { exact: true })).toBeVisible();
            return (
              await owner.query(
                `SELECT t.id ticket,c.id channel FROM "SupportTicket" t JOIN "SupportParticipantChannel" c ON c."ticketId"=t.id WHERE t."requesterUserId"=$1 ORDER BY t."createdAt" DESC LIMIT 1`,
                [a.userId],
              )
            ).rows[0] as { ticket: string; channel: string };
          }
          try {
            const oc = await intake(
                op,
                fixture!.requester,
                "Public Owner development message",
              ),
              bc = await intake(
                bp,
                fixture!.borrower,
                "Public Borrower separate message",
              );
            assert.notEqual(oc.ticket, bc.ticket);
            const assigned = await fixture!.assign(
              agentBrowser,
              oc.ticket,
              oc.channel,
            );
            await login(sp, agentBrowser);
            await sp.goto(base + "/dev/support-agent");
            const cdp = await staffContext.newCDPSession(sp);
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
            await sp
              .getByLabel("Current password", { exact: true })
              .fill(MFA_PASSWORD);
            await sp
              .getByRole("button", {
                name: "Enroll fixture passkey",
                exact: true,
              })
              .click();
            await expect(
              sp.getByText("Fixture passkey enrolled.", { exact: false }),
            ).toBeVisible();
            await sp
              .getByRole("button", {
                name: "Verify fixture passkey",
                exact: true,
              })
              .click();
            await expect(
              sp.getByText("Real passkey verified for this session.", {
                exact: false,
              }),
            ).toBeVisible();
            await sp
              .getByRole("button", {
                name: "Load assigned tickets",
                exact: true,
              })
              .click();
            await sp
              .getByRole("button", {
                name: "Open assigned ticket",
                exact: true,
              })
              .click();
            await sp
              .getByRole("button", {
                name: "Open permitted channel",
                exact: true,
              })
              .click();
            await expect(
              sp.getByText("Public Owner development message", { exact: true }),
            ).toBeVisible();
            assert.ok(
              !(await sp.locator("main").innerText()).includes(
                "Public Borrower separate message",
              ),
            );
            await sp
              .getByLabel("Test Support reply", { exact: true })
              .fill("Public synthetic Support reply");
            await sp
              .getByRole("button", { name: "Save test reply", exact: true })
              .click();
            await expect(
              sp.getByText("Public synthetic Support reply", { exact: true }),
            ).toBeVisible();
            await op
              .getByRole("button", {
                name: "Refresh first messages",
                exact: true,
              })
              .click();
            await expect(
              op.getByText("Public synthetic Support reply", { exact: true }),
            ).toBeVisible();
            assert.ok(
              !(await bp.locator("main").innerText()).includes(
                "Public synthetic Support reply",
              ),
            );
            const foreign = await bp.evaluate(async ({ ticket, channel }) => {
              const r = await fetch("/api/dev/support-requester", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "read",
                  ticketId: ticket,
                  channelId: channel,
                }),
              });
              return { status: r.status, body: await r.text() };
            }, oc);
            assert.equal(foreign.status, 403);
            assert.ok(!foreign.body.includes("Public synthetic Support reply"));
            for (const [name, width, height] of [
              ["desktop", 1440, 1000],
              ["tablet", 820, 1180],
              ["mobile", 390, 844],
            ] as const) {
              await sp.setViewportSize({ width, height });
              await expect(
                sp.getByLabel("Test Support reply", { exact: true }),
              ).toBeVisible();
              assert.equal(
                await sp.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
                true,
              );
              await sp
                .getByLabel("Test Support reply", { exact: true })
                .focus();
              await expect(
                sp.getByLabel("Test Support reply", { exact: true }),
              ).toBeFocused();
              await sp.screenshot({
                path: path.join(artifact, `support-agent-${name}.png`),
                fullPage: true,
              });
            }
            await fixture!.revoke("assignment", assigned.assignment);
            await sp
              .getByRole("button", {
                name: "Refresh first messages",
                exact: true,
              })
              .click();
            await expect(sp.locator("main").getByRole("alert")).toContainText(
              "Scoped Support access denied",
            );
            assert.ok(
              !(await sp.locator("main").innerText()).includes(
                "Public Owner development message",
              ),
            );
            const cookie = (await staffContext.cookies()).find(
              (c) => c.name === "p2p_session",
            )!.value;
            assert.equal(
              (
                await api(
                  "staff",
                  {
                    action: "reply",
                    ticketId: oc.ticket,
                    channelId: oc.channel,
                    ...message("After revocation"),
                  },
                  { token: cookie },
                )
              ).status,
              403,
            );
            // Logout invalidates the actual browser session and its exact assurance binding.
            await sp
              .getByRole("button", { name: "Sign out", exact: true })
              .click();
            await expect(sp).toHaveURL(/\/login$/);
            assert.equal(
              (await api("staff", read(oc), { token: cookie })).status,
              401,
            );
            await writeFile(
              path.join(artifact, "support-browser-evidence.json"),
              JSON.stringify(
                {
                  actualNativeLogin: true,
                  actualNativeWebAuthn: true,
                  independentOwnerBorrowerIntake: true,
                  exactOwnedAssignment: true,
                  actualStaffReply: true,
                  requesterSawReply: true,
                  borrowerForeignReadDenied: true,
                  revocationDeniedAndClearedDisplay: true,
                  logoutDenied: true,
                  responsiveViewports: 3,
                  productionActivation: false,
                },
                null,
                2,
              ),
            );
          } finally {
            await browser.close();
          }
        },
      );
      await t.test(
        "expired scoped authority and revoked credentials deny independently",
        async () => {
          const a = await fixture!.agent();
          await verify(a);
          const expiredGrant = await makeCase(fixture!.requester),
            ga = await fixture!.assign(
              a,
              expiredGrant.ticket,
              expiredGrant.channel,
              [],
            );
          await owner.query(
            `INSERT INTO hustlen_support_candidate.channel_grant(id,"assignmentId","ticketId","channelId",action,"issuedByPersonId","provenanceRef",state,"validFrom","expiresAt")VALUES($1,$2,$3,$4,'channel.read',$5,$6,'TEST_ACTIVE',NOW()-interval '1 hour',NOW()-interval '1 second')`,
            [
              randomUUID(),
              ga.assignment,
              expiredGrant.ticket,
              expiredGrant.channel,
              fixture!.issuer.personId,
              randomUUID(),
            ],
          );
          await denied(a, expiredGrant);
          const expiredAssignment = await makeCase(fixture!.requester);
          await owner.query(
            `INSERT INTO hustlen_support_candidate.assignment(id,"ticketId","memberId","issuedByPersonId","provenanceRef",state,"validFrom","expiresAt")VALUES($1,$2,$3,$4,$5,'TEST_ACTIVE',NOW()-interval '1 hour',NOW()-interval '1 second')`,
            [
              randomUUID(),
              expiredAssignment.ticket,
              a.member,
              fixture!.issuer.personId,
              randomUUID(),
            ],
          );
          await denied(a, expiredAssignment);
          const liveCase = await makeCase(fixture!.requester);
          await fixture!.assign(a, liveCase.ticket, liveCase.channel);
          await cmd("staff", read(liveCase), a);
          await owner.query(
            `UPDATE "StaffMfaCredential" SET "revokedAt"=clock_timestamp() WHERE "associationId"=$1`,
            [a.associationId],
          );
          await denied(a, liveCase);
          assert.equal(
            (
              await api(
                "staff",
                {
                  action: "reply",
                  ticketId: liveCase.ticket,
                  channelId: liveCase.channel,
                  ...message("Revoked credential"),
                },
                a,
              )
            ).status,
            403,
          );
          const memberOnly = await fixture!.agent(),
            memberCase = await makeCase(fixture!.requester);
          await verify(memberOnly);
          await fixture!.assign(
            memberOnly,
            memberCase.ticket,
            memberCase.channel,
          );
          await cmd("staff", read(memberCase), memberOnly);
          await fixture!.revoke("member", memberOnly.member);
          await denied(memberOnly, memberCase);
        },
      );
      await t.test(
        "bounded Unicode transcript survives private transport and exact stream cursors",
        async () => {
          const c = await makeCase(fixture!.requester);
          await fixture!.assign(agent, c.ticket, c.channel);
          const text = "測".repeat(2000);
          await Promise.all(
            Array.from({ length: 11 }, () =>
              cmd(
                "requester",
                {
                  action: "message",
                  ticketId: c.ticket,
                  channelId: c.channel,
                  ...message(text),
                },
                fixture!.requester,
              ),
            ),
          );
          const first = await cmd("staff", read(c), agent);
          assert.equal(first.length, 11);
          assert.ok(
            first.every((m: { content: string }) => m.content === text),
          );
          const next = await cmd("staff", { ...read(c), after: 10 }, agent);
          assert.equal(next.length, 1);
          assert.equal(next[0].sequence, 11);
        },
      );
      await t.test(
        "revoked channel grants, assignment and member versions invalidate subsequent reads and writes",
        async () => {
          await fixture!.revoke("channel_grant", grant.grants["channel.read"]);
          await denied(agent, own);
          assert.equal(
            (
              await api(
                "staff",
                {
                  action: "reply",
                  ticketId: own.ticket,
                  channelId: own.channel,
                  ...message("Revoked read grant"),
                },
                agent,
              )
            ).status,
            403,
          );
          await fixture!.revoke("assignment", grant.assignment);
          await denied(agent, own);
          await fixture!.revoke("member", agent.member);
          await denied(agent, own);
          const rows = (
            await owner.query(
              `SELECT version,state FROM hustlen_support_candidate.authorization_history WHERE "objectId"=$1 ORDER BY version`,
              [grant.assignment],
            )
          ).rows;
          assert.deepEqual(
            rows.map((r) => r.state),
            ["TEST_ACTIVE", "TEST_REVOKED"],
          );
          assert.deepEqual(
            rows.map((r) => String(r.version)),
            ["1", "2"],
          );
          assert.equal(
            (
              await owner.query(
                `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await owner.query(
                `SELECT count(*)::int n FROM "StaffCapabilityGrant" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "unsafe runtime session privileges are refused at HTTP and SQL boundaries",
        async () => {
          const name = fixture!.profile.names.runtime;
          await owner.query(`GRANT INSERT ON "AuthSession" TO "${name}"`);
          try {
            assert.equal(
              (await api("requester", read(own), fixture!.requester)).status,
              404,
            );
            const db = await fixture!.profile.connect("runtime");
            await assert.rejects(
              db.query(
                `SELECT hustlen_support_candidate.requester_request($1,$2::jsonb)`,
                [fixture!.requester.token, JSON.stringify(read(own))],
              ),
            );
          } finally {
            await owner.query(`REVOKE INSERT ON "AuthSession" FROM "${name}"`);
          }
          await cmd("requester", read(own), fixture!.requester);
        },
      );
      await t.test(
        "expired owned configuration denies disclosure and private login issuance",
        async () => {
          const expiry = (
            await owner.query(
              `SELECT "expiresAt" FROM hustlen_support_candidate.configuration WHERE singleton`,
            )
          ).rows[0].expiresAt;
          const beforeSessions = (
            await owner.query(`SELECT count(*)::int n FROM "AuthSession"`)
          ).rows[0].n;
          await owner.query(
            `UPDATE hustlen_support_candidate.configuration SET "expiresAt"="createdAt"+interval '1 millisecond' WHERE singleton`,
          );
          try {
            await denied(fixture!.requester, own, "requester");
            const email = (
              await owner.query(`SELECT email FROM "User" WHERE id=$1`, [
                fixture!.requester.userId,
              ])
            ).rows[0].email;
            const r = await fetch(base + "/api/auth/login", {
              method: "POST",
              headers: { Origin: base, "Content-Type": "application/json" },
              body: JSON.stringify({ email, password: MFA_PASSWORD }),
            });
            assert.equal(r.status, 500);
            assert.equal(
              (await owner.query(`SELECT count(*)::int n FROM "AuthSession"`))
                .rows[0].n,
              beforeSessions,
            );
          } finally {
            await owner.query(
              `UPDATE hustlen_support_candidate.configuration SET "expiresAt"=$1 WHERE singleton`,
              [expiry],
            );
          }
        },
      );
      await t.test(
        "private worker outage fails closed without audit or transcript disclosure",
        async () => {
          await cmd("staff", { action: "admit" }, unrelated);
          const before = await auditCount();
          await stop(worker);
          const result = await api("staff", { action: "admit" }, unrelated);
          assert.equal(result.status, 403);
          assert.equal(await auditCount(), before);
          assert.ok(!JSON.stringify(result.body).includes(canary));
        },
      );
      assert.equal(
        (
          await owner.query(
            `SELECT row_to_json(b)::text row FROM "Booking" b WHERE id=$1`,
            [fixture.booking],
          )
        ).rows[0].row,
        source,
      );
      const logs = await readFile(path.join(artifact, "app.log"), "utf8");
      assert.ok(!logs.includes(canary));
      assert.ok(!logs.includes(agent.token));
      assert.ok(!logs.includes(secret));
      assert.ok(!logs.includes(own.channel));
      const audit = (
        await owner.query(
          `SELECT action,outcome,policy,"databaseActor"::text actor,"channelId" IS NOT NULL AS "channelScoped",length("correlationId"::text)=36 AS "hasCorrelation" FROM hustlen_support_candidate.audit ORDER BY "createdAt" LIMIT 8`,
        )
      ).rows;
      await writeFile(
        path.join(artifact, "support-audit-sample.json"),
        JSON.stringify(audit, null, 2),
      );
      await writeFile(
        path.join(artifact, "support-security.json"),
        JSON.stringify(
          {
            ownerBorrowerIndependent: true,
            legacyAdminReviewerDenied: true,
            realWebAuthnSessionBound: true,
            perActionAssignmentAndChannelGrants: true,
            aliasAndParticipantConflicts: true,
            revocationVersions: true,
            expiredAssignmentsAndGrantsDenied: true,
            revokedPasskeyAndMemberDenied: true,
            workerOutageFailsClosed: true,
            expiredConfigurationBlocksPrivateLoginIssuance: true,
            requesterAndStaffSqlScope: true,
            restrictedRuntimeCannotMintSessionsOrReplacePasswords: true,
            unsafeRuntimePrivilegeConfigurationRefused: true,
            restrictedPrincipalsNoDirectPrivateSelectOrAuditInsert: true,
            durableReadAuditBeforeDisclosure: true,
            replyAndAuditAtomic: true,
            sharedStreamSequence: true,
            boundedUnicodeTranscriptAndCursor: true,
            idempotentConcurrentReplies: true,
            immutableHistory: true,
            noBookingChange: true,
            productionStaffMembershipsActive: 0,
            productionGrantsActive: 0,
            workerOsIsolationCertified: false,
            productionBlocked: true,
          },
          null,
          2,
        ),
      );
    } finally {
      await stop(app);
      await stop(worker);
      await fixture?.cleanup();
      await owner.end();
    }
  },
);
