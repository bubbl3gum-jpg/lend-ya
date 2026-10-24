import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
import {
  executionRehearsal,
  installExecutionRehearsal,
  RehearsalDenied,
} from "./support/execution-rehearsal";
import {
  executionReadiness,
  futureExecutionContract,
  validateFutureExecutionIntent,
  executionIntentDigest,
} from "../lib/authorization/approvals/execution-contracts";

test(
  "Batch 4B execution safety over a separately owned synthetic PostgreSQL domain",
  { timeout: 90000 },
  async (t) => {
    const pg = await connectTestDatabase(),
      db = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: process.env.TEST_DATABASE_URL!,
        }),
      });
    const observedSqlStates: string[] = [];
    const before = new Map<string, unknown[]>();
    const tables = (
      await pg.query(
        `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
      )
    ).rows.map((r) => r.tablename as string);
    const snapshot = async (table: string) =>
      (
        await pg.query(
          `SELECT to_jsonb(t) AS row FROM public."${table}" t ORDER BY to_jsonb(t)::text`,
        )
      ).rows;
    for (const table of tables) before.set(table, await snapshot(table));
    const triggers = (
      await pg.query(
        `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
      )
    ).rows;
    try {
      await installExecutionRehearsal(db);
      const engine = executionRehearsal(db);
      async function fixture() {
        const resource = await engine.seedResource(),
          requester = await engine.seedActor(resource, ["fixture.propose"]),
          approver = await engine.seedActor(resource, ["fixture.approve"]),
          executor = await engine.seedActor(resource, ["fixture.execute"]);
        const proposal = await engine.propose(requester.token, resource);
        await engine.decide(approver.token, proposal);
        return { resource, requester, approver, executor, proposal };
      }
      const state = async (id: string) =>
        (
          await pg.query(
            "SELECT value,version::text,lifecycle FROM approval_rehearsal.resource WHERE id=$1",
            [id],
          )
        ).rows[0];
      const receipts = async (id: string) =>
        (
          await pg.query(
            "SELECT count(*)::int n FROM approval_rehearsal.receipt WHERE proposal_id=$1",
            [id],
          )
        ).rows[0].n;
      await t.test(
        "future registry is blocked, typed, closed and cannot select an operational handler",
        async () => {
          for (const action of [
            "users.serious_sanction.request",
            "users.serious_sanction_restore.request",
            "locations.restore.request",
            "geofence_policy.change.request",
            "announcements.high_impact.request",
            "security.staff_grant_revoke.request",
            "disputes.resolution.request",
            "custody_incidents.resolution.request",
          ]) {
            const c = futureExecutionContract(action);
            assert.ok(c);
            assert.equal(c.availability, "BLOCKED_NO_PRODUCTION_HANDLER");
            assert.equal(executionReadiness(action).authorized, false);
            assert.ok(
              c.requirements.includes("EXACT_REVISION_PAYLOAD_HASH_AUDIENCE"),
            );
          }
          for (const action of [
            "unknown",
            "__proto__",
            "bookings.status.write",
            "SELECT * FROM User",
          ])
            assert.equal(futureExecutionContract(action), null);
          const input = {
            kind: "DISPUTE_RESOLUTION",
            resourceId: "90",
            transition: "CLOSE_RETURNED",
            changeRef: randomUUID(),
            changeHash: "a".repeat(64),
            reasonRef: randomUUID(),
          };
          const valid = validateFutureExecutionIntent(
            "disputes.resolution.request",
            input,
          );
          assert.ok(valid);
          assert.equal(
            executionIntentDigest(valid),
            executionIntentDigest({ ...valid }),
          );
          assert.equal(
            validateFutureExecutionIntent("disputes.resolution.request", {
              ...input,
              sql: "UPDATE Booking",
            }),
            null,
          );
          assert.equal(
            validateFutureExecutionIntent("disputes.resolution.request", {
              ...input,
              transition: "SET_ANY_STATUS",
            }),
            null,
          );
          assert.equal(validateFutureExecutionIntent("unknown", input), null);
        },
      );
      await t.test(
        "exactly one fixed synthetic effect and receipt commit; repeat is historical replay only",
        async () => {
          const f = await fixture();
          const first = await engine.execute(f.executor.token, f.proposal),
            second = await engine.execute(f.executor.token, f.proposal);
          assert.equal(first.executed, true);
          assert.equal(first.authorized, false);
          assert.equal(first.mode, "REHEARSAL_ONLY");
          assert.equal(second.executed, false);
          assert.equal(second.replayed, true);
          assert.equal(first.receiptId, second.receiptId);
          assert.deepEqual(await state(f.resource), {
            value: 1,
            version: "2",
            lifecycle: "CONSUMED",
          });
          assert.equal(await receipts(f.proposal), 1);
          await assert.rejects(() =>
            pg.query(
              `UPDATE approval_rehearsal.receipt SET after_value=2 WHERE id=$1`,
              [first.receiptId],
            ),
          );
          await assert.rejects(() =>
            pg.query(
              `DELETE FROM approval_rehearsal.audit_event WHERE id=(SELECT audit_id FROM approval_rehearsal.receipt WHERE id=$1)`,
              [first.receiptId],
            ),
          );
        },
      );
      await t.test(
        "concurrent real transactions cannot duplicate a revision effect",
        async () => {
          const f = await fixture();
          const results = await Promise.all([
            engine.execute(f.executor.token, f.proposal),
            engine.execute(f.executor.token, f.proposal),
            engine.execute(f.executor.token, f.proposal),
          ]);
          assert.equal(results.filter((r) => r.executed).length, 1);
          assert.equal(results.filter((r) => r.replayed).length, 2);
          assert.equal((await state(f.resource)).value, 1);
          assert.equal(await receipts(f.proposal), 1);
        },
      );
      await t.test(
        "same-person aliases, self-approval, forged tokens and missing independent decisions deny",
        async () => {
          const resource = await engine.seedResource(),
            requester = await engine.seedActor(resource, [
              "fixture.propose",
              "fixture.approve",
            ]),
            alias = await engine.seedActor(
              resource,
              ["fixture.approve"],
              requester.humanId,
            ),
            executor = await engine.seedActor(resource, ["fixture.execute"]);
          const proposal = await engine.propose(requester.token, resource);
          await assert.rejects(
            () => engine.decide(requester.token, proposal),
            RehearsalDenied,
          );
          await assert.rejects(
            () => engine.decide(alias.token, proposal),
            RehearsalDenied,
          );
          await assert.rejects(
            () => engine.execute(executor.token, proposal),
            RehearsalDenied,
          );
          const f = await fixture();
          await assert.rejects(
            () =>
              engine.execute(
                '{"human":"verified","role":"ADMIN","mfa":true}',
                f.proposal,
              ),
            RehearsalDenied,
          );
          assert.equal((await state(f.resource)).value, 0);
        },
      );
      await t.test(
        "forged persisted approval identity and payload cannot authorize an effect",
        async () => {
          const r = await engine.seedResource(),
            a = await engine.seedActor(r, ["fixture.propose"]),
            b = await engine.seedActor(r, ["fixture.approve"]),
            c = await engine.seedActor(r, ["fixture.execute"]);
          const proposal = await engine.propose(a.token, r),
            revision = (
              await pg.query(
                `SELECT * FROM approval_rehearsal.proposal_revision WHERE proposal_id=$1`,
                [proposal],
              )
            ).rows[0];
          await assert.rejects(() =>
            pg.query(
              `INSERT INTO approval_rehearsal.decision VALUES ($1,$2,1,$3,$4,$5,1,clock_timestamp()+interval '1 minute','HYPOTHETICAL_INDEPENDENT')`,
              [randomUUID(), proposal, "0".repeat(64), b.humanId, b.sessionId],
            ),
          );
          // Individually valid FK references still do not prove the asserted approver:
          // stored human b paired with requester a's session is deliberately forged.
          await pg.query(
            `INSERT INTO approval_rehearsal.decision VALUES ($1,$2,1,$3,$4,$5,1,clock_timestamp()+interval '1 minute','HYPOTHETICAL_INDEPENDENT')`,
            [
              randomUUID(),
              proposal,
              revision.payload_hash,
              b.humanId,
              a.sessionId,
            ],
          );
          await assert.rejects(
            () => engine.execute(c.token, proposal),
            RehearsalDenied,
          );
          assert.equal(await receipts(proposal), 0);
          assert.equal((await state(r)).value, 0);
        },
      );
      await t.test(
        "payload mutation, new revision, wrong resource and client-supplied action cannot dispatch",
        async () => {
          const f = await fixture();
          await assert.rejects(() =>
            pg.query(
              `UPDATE approval_rehearsal.payload SET canonical='{}' WHERE id=(SELECT payload_id FROM approval_rehearsal.proposal_revision WHERE proposal_id=$1)`,
              [f.proposal],
            ),
          );
          await engine.revise(f.requester.token, f.proposal);
          await assert.rejects(
            () => engine.execute(f.executor.token, f.proposal),
            RehearsalDenied,
          );
          assert.equal(await receipts(f.proposal), 0);
          const other = await fixture();
          await assert.rejects(
            () => engine.execute(other.executor.token, randomUUID()),
            RehearsalDenied,
          );
          await assert.rejects(
            () => engine.execute(f.executor.token, other.proposal),
            RehearsalDenied,
          );
          const ignored = {
            proposalId: other.proposal,
            action: "users.serious_sanction.request",
            handler: "arbitrarySql",
          };
          await assert.rejects(
            () =>
              engine.execute(
                other.executor.token,
                ignored as unknown as string,
              ),
            RehearsalDenied,
          );
          assert.equal((await state(other.resource)).value, 0);
        },
      );
      await t.test(
        "revoked human/session/grant, stale epoch and pending/expired assurance deny",
        async () => {
          const changes = [
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.human SET epoch=epoch+1 WHERE id=$1`,
                [f.executor.humanId],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.session_record SET revoked=true WHERE id=$1`,
                [f.executor.sessionId],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.capability_grant SET revoked=true WHERE human_id=$1`,
                [f.executor.humanId],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.assurance SET kind='PENDING' WHERE session_id=$1`,
                [f.executor.sessionId],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.assurance SET expires_at=clock_timestamp()-interval '1 second' WHERE session_id=$1`,
                [f.approver.sessionId],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE approval_rehearsal.human SET verified=false WHERE id=$1`,
                [f.requester.humanId],
              ),
          ];
          for (const change of changes) {
            const f = await fixture();
            await change(f);
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
            assert.equal(await receipts(f.proposal), 0);
            assert.equal((await state(f.resource)).value, 0);
          }
        },
      );
      await t.test(
        "expired proposal/approval, resource/evidence/policy drift and all actor conflicts invalidate",
        async () => {
          for (const column of ["version", "evidence_version"]) {
            const f = await fixture();
            await pg.query(
              `UPDATE approval_rehearsal.resource SET ${column}=${column}+1 WHERE id=$1`,
              [f.resource],
            );
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
            assert.equal(await receipts(f.proposal), 0);
          }
          const p = await fixture();
          const expired = await engine.propose(
            p.requester.token,
            p.resource,
            "EXPIRED",
          );
          await engine.decide(p.approver.token, expired);
          await assert.rejects(
            () => engine.execute(p.executor.token, expired),
            RehearsalDenied,
          );
          const late = await engine.propose(p.requester.token, p.resource);
          await engine.decide(p.approver.token, late, "EXPIRED");
          await assert.rejects(
            () => engine.execute(p.executor.token, late),
            RehearsalDenied,
          );
          const policy = await fixture();
          await pg.query(
            `UPDATE approval_rehearsal.policy SET version='DRIFTED' WHERE id=1`,
          );
          try {
            await assert.rejects(
              () => engine.execute(policy.executor.token, policy.proposal),
              RehearsalDenied,
            );
          } finally {
            await pg.query(
              `UPDATE approval_rehearsal.policy SET version='SYNTHETIC_EXECUTION_V1' WHERE id=1`,
            );
          }
          for (const which of ["requester", "approver", "executor"] as const) {
            const f = await fixture();
            await pg.query(
              `UPDATE approval_rehearsal.resource SET conflicts=$1 WHERE id=$2`,
              [[f[which].humanId], f.resource],
            );
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
          }
        },
      );
      await t.test(
        "audit persistence failure and domain failure roll back effect and leave no receipt",
        async () => {
          const f = await fixture();
          await pg.query(
            `CREATE FUNCTION approval_rehearsal.audit_outage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='REHEARSAL_EFFECT_COMMITTED' THEN RAISE EXCEPTION 'Injected audit outage'; END IF; RETURN NEW; END $$; CREATE TRIGGER audit_outage BEFORE INSERT ON approval_rehearsal.audit_event FOR EACH ROW EXECUTE FUNCTION approval_rehearsal.audit_outage()`,
          );
          try {
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
          } finally {
            await pg.query(
              `DROP TRIGGER audit_outage ON approval_rehearsal.audit_event; DROP FUNCTION approval_rehearsal.audit_outage()`,
            );
          }
          assert.equal((await state(f.resource)).value, 0);
          assert.equal(await receipts(f.proposal), 0);
          const g = await fixture();
          await pg.query(
            `CREATE FUNCTION approval_rehearsal.domain_outage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected domain failure'; END $$; CREATE TRIGGER domain_outage BEFORE UPDATE ON approval_rehearsal.resource FOR EACH ROW EXECUTE FUNCTION approval_rehearsal.domain_outage()`,
          );
          try {
            await assert.rejects(
              () => engine.execute(g.executor.token, g.proposal),
              RehearsalDenied,
            );
          } finally {
            await pg.query(
              `DROP TRIGGER domain_outage ON approval_rehearsal.resource; DROP FUNCTION approval_rehearsal.domain_outage()`,
            );
          }
          assert.equal(await receipts(g.proposal), 0);
          assert.equal((await state(g.resource)).value, 0);
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM approval_rehearsal.audit_event WHERE proposal_id=$1 AND kind='REHEARSAL_EFFECT_COMMITTED'`,
                [g.proposal],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "final authoritative failures after provisional effect roll back every change",
        async () => {
          for (const afterEffect of [
            "REVOKE_EXECUTOR",
            "DRIFT_RESOURCE",
            "EXPIRE_ASSURANCE",
          ] as const) {
            const f = await fixture(),
              faulty = executionRehearsal(db, { afterEffect });
            await assert.rejects(
              () => faulty.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
            assert.deepEqual(await state(f.resource), {
              value: 0,
              version: "1",
              lifecycle: "READY",
            });
            assert.equal(await receipts(f.proposal), 0);
          }
        },
      );
      await t.test(
        "committed revocation before authority locks prevents execution",
        async () => {
          const f = await fixture();
          let start!: () => void, resume!: () => void;
          const started = new Promise<void>((r) => {
              start = r;
            }),
            gate = new Promise<void>((r) => {
              resume = r;
            });
          const paused = executionRehearsal(db, {
            onBeforeAuthorityLocks: async () => {
              start();
              await gate;
            },
          });
          const pending = paused.execute(f.executor.token, f.proposal);
          await Promise.race([
            started,
            pending.then(() => {
              throw Error("Expected pause");
            }),
          ]);
          try {
            await pg.query(
              `UPDATE approval_rehearsal.human SET epoch=epoch+1 WHERE id=$1`,
              [f.executor.humanId],
            );
          } finally {
            resume();
          }
          await assert.rejects(pending, RehearsalDenied);
          assert.equal(await receipts(f.proposal), 0);
          assert.equal((await state(f.resource)).value, 0);
        },
      );
      await t.test(
        "revocation during a locked execution waits, then blocks all subsequent access",
        async () => {
          const f = await fixture(),
            peer = await connectTestDatabase();
          let start!: () => void, resume!: () => void;
          const started = new Promise<void>((r) => {
              start = r;
            }),
            gate = new Promise<void>((r) => {
              resume = r;
            });
          const paused = executionRehearsal(db, {
            onBeforeResourceLock: async () => {
              start();
              await gate;
            },
          });
          const pending = paused.execute(f.executor.token, f.proposal);
          try {
            await started;
            const pid = (await peer.query("SELECT pg_backend_pid() pid"))
              .rows[0].pid;
            const revoke = peer.query(
              `UPDATE approval_rehearsal.human SET epoch=epoch+1 WHERE id=$1`,
              [f.executor.humanId],
            );
            let waiting = false;
            try {
              for (let i = 0; i < 100; i++) {
                const row = (
                  await pg.query(
                    `SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1`,
                    [pid],
                  )
                ).rows[0];
                if (row?.wait_event_type === "Lock") {
                  waiting = true;
                  break;
                }
                await new Promise((r) => setTimeout(r, 10));
              }
            } finally {
              resume();
            }
            assert.ok(waiting);
            assert.equal((await pending).executed, true);
            await revoke;
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
          } finally {
            resume();
            await peer.end();
          }
        },
      );
      await t.test(
        "real lock timeout fails closed and never silently retries",
        async () => {
          const f = await fixture(),
            peer = await connectTestDatabase();
          await peer.query("BEGIN");
          try {
            await peer.query(
              `SELECT id FROM approval_rehearsal.resource WHERE id=$1 FOR UPDATE`,
              [f.resource],
            );
            const fast = executionRehearsal(db, {
              lockTimeoutMs: 100,
              onFailureCode: (code) => observedSqlStates.push(code),
            });
            await assert.rejects(
              () => fast.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
            assert.equal(await receipts(f.proposal), 0);
            assert.ok(
              observedSqlStates.includes("55P03"),
              "Observe PostgreSQL lock_not_available SQLSTATE",
            );
          } finally {
            await peer.query("ROLLBACK");
            await peer.end();
          }
          assert.equal((await state(f.resource)).value, 0);
        },
      );
      await t.test(
        "a real PostgreSQL deadlock aborts rehearsal without success or receipt",
        async () => {
          const f = await fixture(),
            peer = await connectTestDatabase();
          let pid = 0,
            signal!: () => void;
          const started = new Promise<void>((r) => {
            signal = r;
          });
          await peer.query("BEGIN");
          await peer.query(
            `SELECT id FROM approval_rehearsal.resource WHERE id=$1 FOR UPDATE`,
            [f.resource],
          );
          const deadlocking = executionRehearsal(db, {
            lockTimeoutMs: 3000,
            onFailureCode: (code) => observedSqlStates.push(code),
            onBeforeResourceLock: async (p) => {
              pid = p;
              signal();
            },
          });
          const pending = deadlocking.execute(f.executor.token, f.proposal);
          const expected = assert.rejects(pending, RehearsalDenied);
          try {
            await started;
            for (let i = 0; i < 100; i++) {
              if (
                (
                  await pg.query(
                    `SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1`,
                    [pid],
                  )
                ).rows[0]?.wait_event_type === "Lock"
              )
                break;
              await new Promise((r) => setTimeout(r, 5));
            }
            const reverse = peer.query(
              `SELECT id FROM approval_rehearsal.proposal WHERE id=$1 FOR UPDATE`,
              [f.proposal],
            );
            await expected;
            await reverse;
            assert.ok(
              observedSqlStates.includes("40P01"),
              "Observe PostgreSQL deadlock_detected SQLSTATE",
            );
            assert.equal(await receipts(f.proposal), 0);
          } finally {
            await peer.query("ROLLBACK");
            await peer.end();
          }
          assert.equal((await state(f.resource)).value, 0);
        },
      );
      await t.test(
        "assurance expiry during a locked rehearsal invalidates the provisional effect",
        async () => {
          const f = await fixture();
          await pg.query(
            `UPDATE approval_rehearsal.assurance SET expires_at=clock_timestamp()+interval '2 seconds' WHERE session_id=$1`,
            [f.executor.sessionId],
          );
          const delayed = executionRehearsal(db, {
            onBeforeResourceLock: async () => {
              await new Promise((r) => setTimeout(r, 2100));
            },
          });
          await assert.rejects(
            () => delayed.execute(f.executor.token, f.proposal),
            RehearsalDenied,
          );
          assert.equal(await receipts(f.proposal), 0);
          assert.deepEqual(await state(f.resource), {
            value: 0,
            version: "1",
            lifecycle: "READY",
          });
        },
      );
      await t.test(
        "production mode and wrong ownership marker refuse rehearsal",
        async () => {
          const f = await fixture(),
            oldMode = process.env.NODE_ENV,
            oldRun = process.env.MRT_TEST_RUN_ID;
          try {
            Reflect.set(process.env, "NODE_ENV", "production");
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
            Reflect.set(process.env, "NODE_ENV", oldMode);
            process.env.MRT_TEST_RUN_ID = "f".repeat(24);
            await assert.rejects(
              () => engine.execute(f.executor.token, f.proposal),
              RehearsalDenied,
            );
          } finally {
            if (oldMode === undefined)
              Reflect.deleteProperty(process.env, "NODE_ENV");
            else Reflect.set(process.env, "NODE_ENV", oldMode);
            process.env.MRT_TEST_RUN_ID = oldRun;
          }
          assert.equal((await state(f.resource)).value, 0);
        },
      );
      await t.test(
        "all application records, migration history, triggers and activation safeguards remain unchanged",
        async () => {
          for (const table of tables)
            assert.deepEqual(await snapshot(table), before.get(table), table);
          const after = (
            await pg.query(
              `SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`,
            )
          ).rows;
          assert.deepEqual(after, triggers);
          const names = [
            "staff_membership_inactive_only",
            "staff_grant_inactive_only",
            "staff_change_inactive",
            "staff_decision_inactive",
            "staff_no_live_success",
          ];
          for (const name of names)
            assert.equal(
              (
                await pg.query(
                  "SELECT count(*)::int n FROM pg_constraint WHERE conname=$1",
                  [name],
                )
              ).rows[0].n,
              1,
            );
          await writeFile(
            path.join(
              process.env.MRT_TEST_ARTIFACT_DIR!,
              "execution-preservation.json",
            ),
            JSON.stringify(
              {
                applicationTablesCompared: tables,
                applicationRowsCompared: Object.fromEntries(
                  [...before].map(([name, rows]) => [name, rows.length]),
                ),
                applicationTriggersPreserved: triggers.length,
                applicationRecordsUnchanged: true,
                observedSqlStates,
                applicationMigrationsAdded: 0,
                activationChecksUnchanged: names,
              },
              null,
              2,
            ) + "\n",
          );
        },
      );
    } finally {
      await db.$disconnect();
      await pg.end();
    }
  },
);
