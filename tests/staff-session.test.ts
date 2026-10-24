import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
import {
  createPendingSessionAudit,
  PendingStaffDenied,
  type PendingShadowDomain,
} from "../lib/authorization/scoped/session-audit";
import { POLICY_VERSION } from "../lib/authorization/registry";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");
test(
  "Batch 3C persisted session, attributable audit and database revocation foundation",
  { timeout: 30000 },
  async (t) => {
    const pg = await connectTestDatabase();
    const db = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL!,
      }),
    });
    const issuer = randomUUID(),
      photo = "00000000-0000-4000-8000-000000000090";
    const request = {
      action: "evidence.rental_case.read",
      resourceId: "90",
      caseId: "90",
      evidenceId: photo,
    };
    const domain: PendingShadowDomain = {
      async check(tx, actor, target) {
        const cases = await tx.$queryRaw<
          { assignedPerson: string }[]
        >`SELECT "assignedPerson" FROM "StaffSessionTestCase" WHERE id=90 FOR SHARE`;
        if (
          cases[0]?.assignedPerson !== actor.personId ||
          target.caseId !== "90" ||
          target.resourceId !== "90" ||
          target.evidenceId !== photo
        )
          return false;
        const found = await tx.dispute.findFirst({
          where: {
            id: 90,
            booking: {
              evidencePhotos: { some: { id: target.evidenceId } },
              ownerId: { not: actor.userId },
              renterId: { not: actor.userId },
            },
          },
          select: { id: true },
        });
        return !!found;
      },
    };
    const service = createPendingSessionAudit(db, domain),
      inactive = createPendingSessionAudit(db);
    async function fixture(shortGrant = false) {
      const person = randomUUID(),
        association = randomUUID(),
        membership = randomUUID(),
        grant = randomUUID(),
        step = randomUUID(),
        binding = randomUUID(),
        token = randomUUID();
      const user = (
        await pg.query(
          `INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES ('Synthetic person',$1,'fixture-no-login',NOW()) RETURNING id`,
          [randomUUID() + "@fixture.test"],
        )
      ).rows[0].id;
      await pg.query(
        `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
        [person, hash(person), randomUUID()],
      );
      await pg.query(
        `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,$3,'VERIFIED',$4,NOW())`,
        [association, person, user, randomUUID()],
      );
      await pg.query(
        `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'OPERATIONS',$3,$4,$5,NOW()-interval '1 minute',NOW()+interval '1 day')`,
        [membership, person, issuer, randomUUID(), POLICY_VERSION],
      );
      await pg.query(
        `INSERT INTO "StaffCapabilityGrant" (id,"membershipId",action,"policyVersion",scope,"resourceKind","resourceId","caseId","purposeCode","issuedByPersonId","provenanceRef","validFrom","expiresAt") VALUES ($1,$2,'evidence.rental_case.read',$3,'ASSIGNED_CASE','dispute','90','90','CASE_INVESTIGATION',$4,$5,NOW()-interval '1 second',NOW()+($6::text)::interval)`,
        [
          grant,
          membership,
          POLICY_VERSION,
          issuer,
          randomUUID(),
          shortGrant ? "1 second" : "10 minutes",
        ],
      );
      const epoch = (
        await pg.query(
          `SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
          [person],
        )
      ).rows[0].version;
      const session = (
        await pg.query(
          `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour') RETURNING id`,
          [user, hash(token)],
        )
      ).rows[0].id;
      await pg.query(
        `INSERT INTO "StaffStepUpRecord" (id,"associationId","authSessionId","authSessionCreatedAt",assurance,"issuerRef","proofRef","authenticatedAt","expiresAt") VALUES ($1,$2,$3,(SELECT "createdAt" FROM "AuthSession" WHERE id=$3),'MFA',$4,$5,NOW()-interval '1 minute',NOW()+interval '10 minutes')`,
        [step, association, session, randomUUID(), randomUUID()],
      );
      await pg.query(
        `INSERT INTO "StaffSessionBinding" (id,"authSessionId","authSessionCreatedAt","associationId","membershipId","stepUpId","authorizationVersion","policyVersion","expiresAt","provenanceRef") VALUES ($1,$2,(SELECT "createdAt" FROM "AuthSession" WHERE id=$2),$3,$4,$5,$6,$7,NOW()+interval '5 minutes',$8)`,
        [
          binding,
          session,
          association,
          membership,
          step,
          epoch,
          POLICY_VERSION,
          randomUUID(),
        ],
      );
      await pg.query(
        `UPDATE "StaffSessionTestCase" SET "assignedPerson"=$1 WHERE id=90`,
        [person],
      );
      return {
        person,
        association,
        membership,
        grant,
        step,
        binding,
        token,
        user,
        session,
        epoch,
      };
    }
    const read = (tx: Parameters<PendingShadowDomain["check"]>[0]) =>
      tx.bookingEvidencePhoto.findUniqueOrThrow({
        where: { id: photo },
        select: { data: true },
      });
    try {
      await pg.query(`CREATE TABLE "StaffSessionTestCase" (id int PRIMARY KEY,"assignedPerson" uuid); INSERT INTO "StaffSessionTestCase" (id) VALUES (90);
   INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ('${issuer}','VERIFIED','${hash(issuer)}','${randomUUID()}',NOW());
   INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES (9001,'Owner','owner-session@fixture.test','fixture',NOW()),(9002,'Borrower','borrower-session@fixture.test','fixture',NOW());
   INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'SESSIONFIXTURE','Session fixture');
   INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,"updatedAt") VALUES (90,9001,'Fixture','Fixture','Cameras',1,'Good',NOW());
   INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES (90,90,9001,9002,9001,'2026-10-24','2026-10-25','DISPUTED',1,NOW());
   INSERT INTO "Dispute" (id,"bookingId","openedBy",reason,description) VALUES (90,90,9002,'Fixture','Fixture');
   INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ('${photo}',90,9001,'HANDOFF_OWNER','image/png',decode('010203','hex'));`);
      await t.test(
        "fresh migration seeds no sessions, step-up records or security events",
        async () => {
          for (const table of [
            "StaffStepUpRecord",
            "StaffSessionBinding",
            "StaffSecurityEvent",
          ])
            assert.equal(
              (await pg.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
                .n,
              0,
            );
        },
      );
      await t.test(
        "pending persisted chain never authorizes staff; caller actor/outcome fields are ignored",
        async () => {
          const f = await fixture();
          assert.deepEqual(await inactive.inspect(f.token), {
            authorized: false,
            mode: "PENDING_INSPECTION",
            reason: "PENDING_NOT_AUTHORITY",
          });
          let called = false;
          await assert.rejects(
            () =>
              inactive.readShadow(f.token, request, async () => {
                called = true;
                return "secret";
              }),
            PendingStaffDenied,
          );
          assert.equal(called, false);
          const fake = {
            ...request,
            personId: issuer,
            userId: 9001,
            outcome: "COMMITTED",
            authorizationVersion: 999,
          };
          await service.recordDenied(f.token, fake);
          const event = (
            await pg.query(
              `SELECT * FROM "StaffSecurityEvent" ORDER BY id DESC LIMIT 1`,
            )
          ).rows[0];
          assert.equal(event.personId, f.person);
          assert.equal(event.userId, f.user);
          assert.equal(event.authSessionId, f.session);
          assert.equal(event.outcome, "DENIED");
          assert.equal(event.authorizationVersion, f.epoch);
          await assert.rejects(() =>
            pg.query(
              `INSERT INTO "StaffSecurityEvent" ("correlationId","bindingId","personId","policyVersion",action,"resourceKind","resourceId",outcome,"reasonCode") VALUES ($1,$2,$3,$4,'evidence.rental_case.read','dispute','90','DENIED','ACCESS_DENIED')`,
              [randomUUID(), f.binding, issuer, POLICY_VERSION],
            ),
          );
          await assert.rejects(() =>
            pg.query(
              `INSERT INTO "StaffSecurityEvent" ("correlationId","policyVersion",action,"resourceKind",outcome,"reasonCode") VALUES ($1,$2,'security.unknown_action','UNKNOWN','COMMITTED','SHADOW_READ')`,
              [randomUUID(), POLICY_VERSION],
            ),
          );
        },
      );
      await t.test(
        "shadow read refuses production mode and a forged ownership marker",
        async () => {
          const f = await fixture();
          const oldMode = process.env.NODE_ENV,
            oldRun = process.env.MRT_TEST_RUN_ID;
          let called = false;
          try {
            Reflect.set(process.env, "NODE_ENV", "production");
            await assert.rejects(
              () =>
                service.readShadow(f.token, request, async () => {
                  called = true;
                  return "private";
                }),
              PendingStaffDenied,
            );
            Reflect.set(process.env, "NODE_ENV", oldMode);
            process.env.MRT_TEST_RUN_ID = "f".repeat(24);
            await assert.rejects(
              () =>
                service.readShadow(f.token, request, async () => {
                  called = true;
                  return "private";
                }),
              PendingStaffDenied,
            );
            assert.equal(called, false);
          } finally {
            if (oldMode === undefined)
              Reflect.deleteProperty(process.env, "NODE_ENV");
            else Reflect.set(process.env, "NODE_ENV", oldMode);
            process.env.MRT_TEST_RUN_ID = oldRun;
          }
        },
      );
      await t.test(
        "shadow sensitive read commits an attributed append-only event before result release",
        async () => {
          const f = await fixture();
          const result = await service.readShadow(f.token, request, read);
          assert.equal(result.mode, "SHADOW_ONLY");
          assert.equal(result.readyForActivation, false);
          assert.equal(Buffer.from(result.data.data).toString("hex"), "010203");
          const row = (
            await pg.query(
              `SELECT * FROM "StaffSecurityEvent" WHERE "correlationId"=$1`,
              [result.correlationId],
            )
          ).rows[0];
          assert.equal(row.outcome, "SHADOW_COMMITTED");
          assert.equal(row.personId, f.person);
          assert.equal(row.evidenceId, photo);
          assert.ok(!("data" in row));
          assert.ok(!("token" in row));
          assert.ok(!("metadata" in row));
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffSecurityEvent" SET outcome='DENIED' WHERE id=$1`,
              [row.id],
            ),
          );
          await assert.rejects(() =>
            pg.query(`DELETE FROM "StaffSecurityEvent" WHERE id=$1`, [row.id]),
          );
          await assert.rejects(() => pg.query(`TRUNCATE "StaffSecurityEvent"`));
        },
      );
      await t.test(
        "unknown inputs and forged credentials retain no supplied token, body, coordinates or action",
        async () => {
          const f = await fixture();
          await service.recordDenied("forged-secret-token", {
            action: "untrusted-body; GPS=DO_NOT_RETAIN",
            resourceId: "private@example.test",
          });
          const row = (
            await pg.query(
              `SELECT * FROM "StaffSecurityEvent" ORDER BY id DESC LIMIT 1`,
            )
          ).rows[0];
          assert.equal(row.personId, null);
          assert.equal(row.action, "security.unknown_action");
          assert.equal(row.resourceId, null);
          await assert.rejects(
            () =>
              service.readShadow(
                f.token,
                { ...request, resourceId: "91" },
                read,
              ),
            PendingStaffDenied,
          );
          await pg.query(
            `UPDATE "StaffSessionTestCase" SET "assignedPerson"=$1 WHERE id=90`,
            [issuer],
          );
          await assert.rejects(
            () => service.readShadow(f.token, request, read),
            PendingStaffDenied,
          );
        },
      );
      await t.test(
        "invalid associations, stale epochs, suspension, session deletion and terminal revocation deny",
        async () => {
          const mutations = [
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
                [f.membership],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "StaffCapabilityGrant" SET state='REVOKED' WHERE id=$1`,
                [f.grant],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
                [f.user],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(`DELETE FROM "AuthSession" WHERE id=$1`, [f.session]),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE id=$1`,
                [f.session],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "StaffAccountAssociation" SET state=state WHERE id=$1`,
                [f.association],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "StaffStepUpRecord" SET state='REVOKED' WHERE id=$1`,
                [f.step],
              ),
            async (f: Awaited<ReturnType<typeof fixture>>) =>
              pg.query(
                `UPDATE "StaffSessionBinding" SET state='REVOKED' WHERE id=$1`,
                [f.binding],
              ),
          ];
          for (const change of mutations) {
            const f = await fixture();
            await change(f);
            await assert.rejects(
              () => service.readShadow(f.token, request, read),
              PendingStaffDenied,
            );
          }
          const revoked = await fixture();
          await pg.query(
            `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
            [revoked.membership],
          );
          await service.recordDenied(revoked.token, request);
          const denial = (
            await pg.query(
              `SELECT "personId","userId",outcome FROM "StaffSecurityEvent" WHERE "bindingId"=$1 ORDER BY id DESC LIMIT 1`,
              [revoked.binding],
            )
          ).rows[0];
          assert.equal(denial.personId, revoked.person);
          assert.equal(denial.userId, revoked.user);
          assert.equal(denial.outcome, "DENIED");
          const f = await fixture();
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffSessionBinding" SET "authorizationVersion"=999 WHERE id=$1`,
              [f.binding],
            ),
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffStepUpRecord" SET assurance='PASSWORD' WHERE id=$1`,
              [f.step],
            ),
          );
          await pg.query(
            `UPDATE "StaffSessionBinding" SET state='REVOKED' WHERE id=$1`,
            [f.binding],
          );
          await assert.rejects(() =>
            pg.query(
              `UPDATE "StaffSessionBinding" SET state='PENDING' WHERE id=$1`,
              [f.binding],
            ),
          );
        },
      );
      await t.test(
        "deleted/reused AuthSession IDs cannot inherit pending attribution",
        async () => {
          const f = await fixture(),
            replacement = randomUUID();
          await pg.query(`DELETE FROM "AuthSession" WHERE id=$1`, [f.session]);
          await pg.query(
            `INSERT INTO "AuthSession" (id,"userId","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,NOW()+interval '1 hour',NOW()+interval '1 second')`,
            [f.session, f.user, hash(replacement)],
          );
          assert.equal(
            (await service.inspect(replacement)).reason,
            "INVALID_PENDING_CHAIN",
          );
          await assert.rejects(
            () => service.readShadow(replacement, request, read),
            PendingStaffDenied,
          );
          await service.recordDenied(replacement, request);
          assert.equal(
            (
              await pg.query(
                `SELECT "bindingId" FROM "StaffSecurityEvent" ORDER BY id DESC LIMIT 1`,
              )
            ).rows[0].bindingId,
            null,
          );
        },
      );
      await t.test(
        "database-backed final authorization failure rolls back success event; denied attempt persists separately",
        async () => {
          const f = await fixture();
          await assert.rejects(
            () =>
              service.readShadow(f.token, request, async (tx) => {
                const data = await read(tx);
                await tx.$executeRaw`UPDATE "StaffAccountAssociation" SET state=state WHERE id=${f.association}::uuid`;
                return data;
              }),
            PendingStaffDenied,
          );
          const rows = (
            await pg.query(
              `SELECT outcome FROM "StaffSecurityEvent" WHERE "bindingId"=$1`,
              [f.binding],
            )
          ).rows;
          assert.deepEqual(
            rows.map((r) => r.outcome),
            ["DENIED"],
          );
          assert.equal(
            (await service.inspect(f.token)).reason,
            "PENDING_NOT_AUTHORITY",
          );
          const changedCase = await fixture();
          await assert.rejects(
            () =>
              service.readShadow(changedCase.token, request, async (tx) => {
                const value = await read(tx);
                await tx.$executeRaw`UPDATE "StaffSessionTestCase" SET "assignedPerson"=${issuer}::uuid WHERE id=90`;
                return value;
              }),
            PendingStaffDenied,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffSecurityEvent" WHERE "bindingId"=$1 AND outcome='SHADOW_COMMITTED'`,
                [changedCase.binding],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "real row locks linearize an in-flight read before membership revocation; next read denies",
        async () => {
          const f = await fixture(),
            peer = await connectTestDatabase();
          let start!: () => void, resume!: () => void;
          const started = new Promise<void>((resolve) => {
              start = resolve;
            }),
            gate = new Promise<void>((resolve) => {
              resume = resolve;
            });
          try {
            const pending = service.readShadow(f.token, request, async (tx) => {
              start();
              await gate;
              return read(tx);
            });
            await Promise.race([
              started,
              pending.then(() => {
                throw Error("Read did not pause");
              }),
            ]);
            const pid = (await peer.query("SELECT pg_backend_pid() pid"))
              .rows[0].pid;
            const revoke = peer.query(
              `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
              [f.membership],
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
            assert.ok(
              waiting,
              "Revocation must wait on a real PostgreSQL read lock",
            );
            assert.equal((await pending).mode, "SHADOW_ONLY");
            await revoke;
            await assert.rejects(
              () => service.readShadow(f.token, request, read),
              PendingStaffDenied,
            );
          } finally {
            await peer.end();
          }
        },
      );
      await t.test(
        "grant expiry during data retrieval denies release and rolls back shadow success",
        async () => {
          const f = await fixture(true);
          let entered = false;
          await assert.rejects(
            () =>
              service.readShadow(f.token, request, async (tx) => {
                entered = true;
                await tx.$queryRaw`SELECT 1 AS waited FROM pg_sleep(1.1)`;
                return read(tx);
              }),
            PendingStaffDenied,
          );
          assert.ok(entered);
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffSecurityEvent" WHERE "bindingId"=$1 AND outcome='SHADOW_COMMITTED'`,
                [f.binding],
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "audit outage or read failure never releases bytes; failed attempt is separate from committed actions",
        async () => {
          const f = await fixture();
          await assert.rejects(
            () =>
              service.readShadow(f.token, request, async () => {
                throw Error("private-url-token-must-not-log");
              }),
            /Staff shadow read failed/,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT outcome FROM "StaffSecurityEvent" WHERE "bindingId"=$1`,
                [f.binding],
              )
            ).rows[0].outcome,
            "FAILED",
          );
          await pg.query(
            `CREATE FUNCTION staff_test_audit_outage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.outcome='SHADOW_COMMITTED' THEN RAISE EXCEPTION 'Injected audit unavailable'; END IF; RETURN NEW; END $$; CREATE TRIGGER staff_test_audit_outage BEFORE INSERT ON "StaffSecurityEvent" FOR EACH ROW EXECUTE FUNCTION staff_test_audit_outage()`,
          );
          let called = false;
          try {
            await assert.rejects(
              () =>
                service.readShadow(f.token, request, async () => {
                  called = true;
                  return "bytes";
                }),
              /Staff shadow read failed/,
            );
            assert.equal(called, false);
          } finally {
            await pg.query(
              'DROP TRIGGER staff_test_audit_outage ON "StaffSecurityEvent"; DROP FUNCTION staff_test_audit_outage()',
            );
          }
        },
      );
      await t.test(
        "live authority and existing privilege changes remain impossible",
        async () => {
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffCapabilityGrant" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffSecurityEvent" WHERE outcome='COMMITTED'`,
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "User" WHERE role='ADMIN'`,
              )
            ).rows[0].n,
            0,
          );
        },
      );
    } finally {
      await db.$disconnect();
      await pg.end();
    }
  },
);
