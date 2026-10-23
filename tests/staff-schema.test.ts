import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { connectTestDatabase } from "./support/test-database";
import { CAPABILITIES, POLICY_VERSION } from "../lib/authorization/registry";

test("Batch 3A fresh install: inert identity, bounded grants, versions and immutable history", async (t) => {
  const db = await connectTestDatabase();
  const person = randomUUID(),
    issuer = randomUUID(),
    unverified = randomUUID();
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const denied = async (sql: string, params: unknown[] = []) => {
    await assert.rejects(
      db.query(sql, params),
      (error: unknown) =>
        !!error &&
        typeof error === "object" &&
        "code" in error &&
        ["P0001", "23514", "23505", "23503", "P0002"].includes(
          String(error.code),
        ),
    );
  };
  const verified = async (id: string) =>
    db.query(
      `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
      [id, digest(id), randomUUID()],
    );
  try {
    await t.test(
      "migration seeds contracts only; no staff, session or legacy grant is provisioned",
      async () => {
        for (const table of [
          "StaffPerson",
          "StaffAccountAssociation",
          "StaffMembership",
          "StaffCapabilityGrant",
          "StaffAuthorizationVersion",
          "StaffAuthorizationEvent",
          "User",
          "AuthSession",
          "ChatReviewer",
        ])
          assert.equal(
            (await db.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
              .n,
            0,
            table,
          );
        const contracts = (
          await db.query(
            'SELECT *, "eligibleRoles"::text[] AS "eligibleRoles" FROM "StaffCapabilityContract" ORDER BY action',
          )
        ).rows;
        assert.equal(contracts.length, Object.keys(CAPABILITIES).length);
        for (const row of contracts) {
          const entry = CAPABILITIES[row.action];
          assert.ok(entry);
          assert.equal(row.policyVersion, POLICY_VERSION);
          assert.equal(row.scope, entry.scope);
          assert.equal(row.resourceKind, entry.resource);
          assert.equal(row.risk, entry.risk);
          assert.deepEqual(row.eligibleRoles, entry.roles);
          assert.equal(row.blockedPolicy, entry.blockedPolicy);
          assert.equal(row.evidence, entry.evidence);
        }
        await denied(
          `UPDATE "StaffCapabilityContract" SET "blockedPolicy"=false`,
        );
        await denied(`TRUNCATE "StaffCapabilityContract" CASCADE`);
      },
    );
    await db.query(
      `INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES (7001,'Fixture alias one','staff-alias1@fixture.test','not-login',NOW()),(7002,'Fixture alias two','staff-alias2@fixture.test','not-login',NOW()),(7003,'Fixture alias three','staff-alias3@fixture.test','not-login',NOW())`,
    );
    await denied(
      `INSERT INTO "StaffPerson" (id,verification,"verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,NOW())`,
      [randomUUID(), randomUUID()],
    );
    await verified(person);
    await verified(issuer);
    await db.query('INSERT INTO "StaffPerson" (id) VALUES ($1)', [unverified]);
    await t.test(
      "canonical verified subject and permanent account binding prevent alias identities",
      async () => {
        await denied(
          `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
          [randomUUID(), digest(person), randomUUID()],
        );
        await denied(
          `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,7001,'VERIFIED',$3,NOW())`,
          [randomUUID(), unverified, randomUUID()],
        );
        for (const userId of [7001, 7002, 7003])
          await db.query(
            `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,$3,'VERIFIED',$4,NOW())`,
            [randomUUID(), person, userId, randomUUID()],
          );
        await denied(
          `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,7002,'VERIFIED',$3,NOW())`,
          [randomUUID(), issuer, randomUUID()],
        );
        await db.query(
          `UPDATE "StaffAccountAssociation" SET state='REVOKED' WHERE "userId"=7002`,
        );
        await denied(
          `UPDATE "StaffAccountAssociation" SET "personId"=$1 WHERE "userId"=7002`,
          [issuer],
        );
        await denied(
          `UPDATE "StaffPerson" SET "verificationSubjectHash"=$1 WHERE id=$2`,
          [digest("changed"), person],
        );
        assert.equal(
          (
            await db.query(
              'SELECT count(DISTINCT "personId")::int n FROM "StaffAccountAssociation" WHERE "userId" IN (7001,7002)',
            )
          ).rows[0].n,
          1,
        );
      },
    );
    const membership = randomUUID();
    const addMembership = (
      id: string,
      subject = person,
      proposer = issuer,
      state = "DRAFT",
    ) =>
      db.query(
        `INSERT INTO "StaffMembership" (id,"personId",role,state,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'OPERATIONS',$3,$4,$5,$6,'2026-10-24','2026-11-24')`,
        [id, subject, state, proposer, randomUUID(), POLICY_VERSION],
      );
    await t.test(
      "one staged membership per human; self-proposal and all activation are denied",
      async () => {
        await assert.rejects(addMembership(randomUUID(), unverified));
        await assert.rejects(addMembership(randomUUID(), person, person));
        await addMembership(membership);
        await assert.rejects(addMembership(randomUUID()));
        await denied(
          `UPDATE "StaffMembership" SET role='SUPER_ADMIN' WHERE id=$1`,
          [membership],
        );
        await assert.rejects(
          addMembership(randomUUID(), issuer, person, "ACTIVE"),
        );
        await denied(
          `UPDATE "StaffMembership" SET state='ACTIVE' WHERE id=$1`,
          [membership],
        );
        const index = (
          await db.query(
            `SELECT indexdef FROM pg_indexes WHERE indexname='staff_one_active_membership'`,
          )
        ).rows[0].indexdef;
        assert.match(index, /UNIQUE/);
        assert.match(index, /ACTIVE/);
      },
    );
    const grant = randomUUID();
    const addGrant = (patch: Record<string, unknown> = {}) => {
      const row = {
        id: randomUUID(),
        membershipId: membership,
        action: "listings.read",
        policyVersion: POLICY_VERSION,
        state: "DRAFT",
        scope: "RESOURCE",
        resourceKind: "listing",
        resourceId: "fixture-listing",
        caseId: null,
        channelAudience: null,
        purposeCode: "OPERATIONS_METADATA",
        issuedByPersonId: issuer,
        provenanceRef: randomUUID(),
        validFrom: "2026-10-24",
        expiresAt: "2026-10-25",
        ...patch,
      };
      const keys = Object.keys(row);
      return db.query(
        `INSERT INTO "StaffCapabilityGrant" (${keys.map((k) => '"' + k + '"').join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
        Object.values(row),
      );
    };
    await t.test(
      "grants are exact, time bounded, role constrained, independently issued and inactive",
      async () => {
        for (const patch of [
          { issuedByPersonId: person },
          { action: "unknown.action" },
          { action: "audit.update_delete", resourceKind: "audit" },
          { action: "ai.autonomous_admin", resourceKind: "platform" },
          {
            action: "users.temporary_safety_restrict",
            scope: "ASSIGNED_CASE",
            resourceKind: "user",
            caseId: "case-1",
          },
          { resourceId: "*" },
          { expiresAt: "2027-01-01" },
          { validFrom: "2026-10-25", expiresAt: "2026-10-24" },
          { state: "ACTIVE" },
          {
            action: "chat_cases.evidence.read",
            scope: "ASSIGNED_CASE",
            resourceKind: "chat_case",
            caseId: "case-1",
          },
          {
            action: "evidence.rental_case.read",
            scope: "ASSIGNED_CASE",
            resourceKind: "dispute",
            caseId: "case-1",
          },
          { policyVersion: "forged-policy" },
          { issuedByPersonId: unverified },
        ])
          await assert.rejects(addGrant(patch));
        await addGrant({ id: grant });
        await denied(
          `UPDATE "StaffCapabilityGrant" SET "resourceId"='other' WHERE id=$1`,
          [grant],
        );
        await denied(
          `UPDATE "StaffCapabilityGrant" SET state='ACTIVE' WHERE id=$1`,
          [grant],
        );
        await db.query(
          `UPDATE "StaffCapabilityGrant" SET state='REVOKED' WHERE id=$1`,
          [grant],
        );
        await denied(
          `UPDATE "StaffCapabilityGrant" SET state='DRAFT' WHERE id=$1`,
          [grant],
        );
      },
    );
    await t.test(
      "private-channel drafts require exact audience, case and evidence purpose",
      async () => {
        const supportPerson = randomUUID(),
          supportMembership = randomUUID();
        await verified(supportPerson);
        await db.query(
          `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'SUPPORT',$3,$4,$5,'2026-10-24','2026-11-24')`,
          [
            supportMembership,
            supportPerson,
            issuer,
            randomUUID(),
            POLICY_VERSION,
          ],
        );
        const channel = {
          membershipId: supportMembership,
          action: "support.channel.read",
          scope: "PRIVATE_CHANNEL",
          resourceKind: "support_channel",
          resourceId: "channel-1",
          caseId: "case-1",
          channelAudience: "OWNER",
          purposeCode: "CASE_INVESTIGATION",
        };
        for (const patch of [
          { channelAudience: null },
          { channelAudience: "BOTH" },
          { caseId: null },
          { purposeCode: "OPERATIONS_METADATA" },
          { resourceId: "*" },
        ]) {
          await assert.rejects(addGrant({ ...channel, ...patch }));
        }
        const channelGrant = randomUUID();
        await addGrant({ ...channel, id: channelGrant });
        await denied(
          `UPDATE "StaffCapabilityGrant" SET "channelAudience"='BORROWER' WHERE id=$1`,
          [channelGrant],
        );
        await denied(
          `UPDATE "StaffCapabilityGrant" SET state='ACTIVE' WHERE id=$1`,
          [channelGrant],
        );
      },
    );
    await t.test(
      "concurrent alias changes serialize on one human epoch; audit failure rolls back state and version",
      async () => {
        const before = Number(
          (
            await db.query(
              'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
              [person],
            )
          ).rows[0].version,
        );
        const peer = await connectTestDatabase();
        try {
          await Promise.all([
            db.query(
              `UPDATE "StaffAccountAssociation" SET state=state WHERE "userId"=7001`,
            ),
            peer.query(
              `UPDATE "StaffAccountAssociation" SET state=state WHERE "userId"=7003`,
            ),
          ]);
        } finally {
          await peer.end();
        }
        const after = Number(
          (
            await db.query(
              'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
              [person],
            )
          ).rows[0].version,
        );
        assert.equal(after, before + 2);
        await db.query(
          `CREATE FUNCTION staff_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected staff audit failure'; END $$; CREATE TRIGGER staff_test_audit_failure BEFORE INSERT ON "StaffAuthorizationEvent" FOR EACH ROW EXECUTE FUNCTION staff_test_audit_failure()`,
        );
        try {
          await denied(
            `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
            [membership],
          );
          assert.equal(
            Number(
              (
                await db.query(
                  'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
                  [person],
                )
              ).rows[0].version,
            ),
            after,
          );
          assert.equal(
            (
              await db.query(
                'SELECT state FROM "StaffMembership" WHERE id=$1',
                [membership],
              )
            ).rows[0].state,
            "DRAFT",
          );
        } finally {
          await db.query(
            `DROP TRIGGER staff_test_audit_failure ON "StaffAuthorizationEvent"; DROP FUNCTION staff_test_audit_failure()`,
          );
        }
      },
    );
    await t.test(
      "version/history changes are atomic, monotonic, minimal and non-forgeable",
      async () => {
        const events = (
          await db.query(
            'SELECT * FROM "StaffAuthorizationEvent" WHERE "personId"=$1 ORDER BY "authorizationVersion"',
            [person],
          )
        ).rows;
        assert.ok(events.length >= 6);
        assert.deepEqual(
          events.map((e) => Number(e.authorizationVersion)),
          Array.from({ length: events.length }, (_, i) => i + 1),
        );
        assert.equal(
          Number(
            (
              await db.query(
                'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
                [person],
              )
            ).rows[0].version,
          ),
          events.length,
        );
        assert.ok(
          events.every(
            (e) =>
              e.databaseActor &&
              !JSON.stringify(e.newState).includes("verificationSubjectHash"),
          ),
        );
        for (const sql of [
          `UPDATE "StaffAuthorizationVersion" SET version=999`,
          `DELETE FROM "StaffAuthorizationEvent"`,
          `UPDATE "StaffAuthorizationEvent" SET operation='FORGED'`,
          `TRUNCATE "StaffAuthorizationEvent" CASCADE`,
          `DELETE FROM "StaffCapabilityGrant"`,
          `DELETE FROM "StaffAccountAssociation"`,
          `DELETE FROM "StaffPerson"`,
        ])
          await denied(sql);
        await denied(
          `INSERT INTO "StaffAuthorizationEvent" ("personId","authorizationVersion","entityKind","entityId",operation,"previousState","newState") VALUES($1,999,'FORGED',$1,'INSERT','{}','{}')`,
          [person],
        );
        const before = Number(
          (
            await db.query(
              'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
              [person],
            )
          ).rows[0].version,
        );
        await db.query("BEGIN");
        await db.query(
          `UPDATE "StaffMembership" SET state='REVOKED' WHERE id=$1`,
          [membership],
        );
        await db.query("ROLLBACK");
        assert.equal(
          Number(
            (
              await db.query(
                'SELECT version FROM "StaffAuthorizationVersion" WHERE "personId"=$1',
                [person],
              )
            ).rows[0].version,
          ),
          before,
        );
        assert.equal(
          (
            await db.query('SELECT state FROM "StaffMembership" WHERE id=$1', [
              membership,
            ])
          ).rows[0].state,
          "DRAFT",
        );
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int n FROM "User" WHERE role='ADMIN'`,
            )
          ).rows[0].n,
          0,
        );
      },
    );
  } finally {
    await db.end();
  }
});
