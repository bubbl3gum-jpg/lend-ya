import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
import { fixture, NOW } from "./fixtures/authorization";
import {
  STAFF_ROLES,
  POLICY_VERSION,
  type StaffRole,
  capability,
} from "../lib/authorization/registry";
import type { PolicySnapshot } from "../lib/authorization/policy";
import {
  createScopedShadowReads,
  ScopedReadDenied,
  type ShadowReadBoundary,
} from "../lib/authorization/scoped/reads";
import { inspectPersistedStaffIdentity } from "../lib/authorization/scoped/identity";

// Only this isolated test composes a synthetic authority source. ACTIVE fixture
// snapshots never enter persisted memberships, production sessions or HTTP routes.
test("Batch 3B scoped shadow reads over owned disposable fixtures", async (t) => {
  const pg = await connectTestDatabase();
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }),
    log: [{ emit: "event", level: "query" }],
  });
  let domainQueries = 0;
  db.$on("query", (e) => {
    if (
      /FROM "public"\."(Booking|Listing|User|Dispute|ListingReport|ChatModerationCase|AdminAuditLog|BookingEvidencePhoto|ListingMedia)"/.test(
        e.query,
      )
    )
      domainQueries++;
  });
  let mutate: (s: PolicySnapshot) => PolicySnapshot = (s) => s;
  let role: StaffRole = STAFF_ROLES[0];
  let now = NOW,
    fenced = true,
    auditFails = false,
    afterAudit: (() => void) | undefined;
  const boundary: ShadowReadBoundary = {
    now: () => now,
    async snapshot(_tx, credential, ref) {
      if (credential !== "synthetic-session" || ref.id !== "90")
        return { session: null, membership: null, resource: null };
      const s = fixture(currentAction, role);
      const resource = { ...s.resource!, id: "90", caseId: "case-90" };
      return mutate({
        ...s,
        resource,
        membership: {
          ...s.membership!,
          grants: s.membership!.grants.map((g) => ({
            ...g,
            resourceId: "90",
            caseId: "case-90",
          })),
        },
      });
    },
    async fence() {
      return fenced;
    },
    async audit(tx, event) {
      assert.equal(event.policyVersion, POLICY_VERSION);
      if (event.action === "evidence.rental_case.read")
        assert.match(event.evidenceId!, /^[a-f0-9-]{36}$/);
      if (auditFails) throw Error("Injected audit outage");
      await tx.$executeRaw`INSERT INTO "ScopedReadTestAudit" ("personId",action) VALUES (${event.personId},${event.action})`;
      afterAudit?.();
    },
  };
  let currentAction = "bookings.read";
  const reads = createScopedShadowReads(db, boundary);
  const reset = () => {
    mutate = (s) => s;
    role = STAFF_ROLES[0];
    now = NOW;
    fenced = true;
    auditFails = false;
    afterAudit = undefined;
    currentAction = "bookings.read";
  };
  const denied = (fn: () => Promise<unknown>) =>
    assert.rejects(fn, ScopedReadDenied);
  try {
    await pg.query(`CREATE TABLE "ScopedReadTestAudit" ("personId" text NOT NULL, action text NOT NULL);
      INSERT INTO "User" (id,name,email,"passwordHash","updatedAt") VALUES (60,'SECRET_OWNER','private-owner@fixture.test','SECRET_HASH',NOW()),(61,'SECRET_BORROWER','private-borrower@fixture.test','SECRET_HASH',NOW()),(90,'PRIVATE_PERSON','private-person@fixture.test','SECRET_HASH',NOW()),(91,'UNRELATED_PERSON','unrelated-person@fixture.test','SECRET_HASH',NOW());
      INSERT INTO "MrtStation" (id,code,name) VALUES (9001,'SCOPEFIXTURE','Fixture only');
      INSERT INTO "Listing" (id,"ownerId",title,description,category,price,condition,"updatedAt") VALUES (90,60,'PRIVATE_TITLE','PRIVATE_DESCRIPTION','Cameras',10,'Good',NOW()),(91,61,'UNRELATED','UNRELATED','Cameras',10,'Good',NOW());
      INSERT INTO "Booking" (id,"listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice",notes,"updatedAt") VALUES (90,90,60,61,9001,'2026-10-24','2026-10-25','HANDOFF_PENDING',10,'PRIVATE_NOTES',NOW()),(91,91,61,60,9001,'2026-10-24','2026-10-25','IN_USE',10,'UNRELATED',NOW());
      INSERT INTO "Dispute" (id,"bookingId","openedBy",reason,description) VALUES (90,90,61,'PRIVATE_REASON','PRIVATE_DESCRIPTION'),(91,91,60,'UNRELATED','UNRELATED');
      INSERT INTO "ListingReport" (id,"listingId","reporterId",reason) VALUES (90,90,61,'PRIVATE_REASON');
      INSERT INTO "ListingMedia" (id,"listingId",url,"mimeType",kind) VALUES (90,90,'/SECRET_FILE','image/png','PHOTO'),(91,91,'/OTHER_SECRET','image/png','PHOTO');
      INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ('00000000-0000-4000-8000-000000000090',90,60,'HANDOFF_OWNER','image/png',decode('010203','hex')),('00000000-0000-4000-8000-000000000091',91,61,'HANDOFF_OWNER','image/png',decode('040506','hex'));
      INSERT INTO "Conversation" (id,"listingId","ownerId","borrowerId",version) VALUES (90,90,60,61,1);
      INSERT INTO "ChatModerationCase" (id,"conversationId","targetUserId",kind,category,evidence) VALUES (90,90,60,'REPORT','USER_REPORT','{"secret":"PRIVATE_EVIDENCE"}');
      INSERT INTO "AdminAuditLog" (id,"adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES (90,60,'FIXTURE','USER',61,'PRIVATE_REASON','{"secret":true}','{"secret":true}');`);
    await t.test(
      "all four roles read only exact authorized bookings with minimal fields and scoped totals",
      async () => {
        for (const r of STAFF_ROLES) {
          reset();
          role = r;
          const result = await reads.directory(
            "synthetic-session",
            "bookings.read",
            ["90"],
            { limit: 1 },
          );
          assert.equal(result.mode, "SHADOW_ONLY");
          assert.equal(result.readyForActivation, false);
          assert.equal(result.data.totalInAuthorizedSelection, 1);
          assert.deepEqual(Object.keys(result.data.rows[0]).sort(), [
            "endAt",
            "id",
            "startAt",
            "status",
          ]);
          assert.equal(
            (await reads.overview("synthetic-session", ["90"])).data
              .inUseStatus,
            0,
          );
        }
        assert.ok(
          domainQueries > 0,
          "Query tracing must observe successful scoped domain reads",
        );
        reset();
        await denied(() =>
          reads.detail("synthetic-session", "bookings.read", "91"),
        );
        await denied(() =>
          reads.directory("synthetic-session", "bookings.read", ["90", "91"]),
        );
        await denied(() =>
          reads.detail("synthetic-session", "bookings.read", "999999"),
        );
      },
    );
    await t.test(
      "anonymous, ordinary, forged roles, stale sessions, revoked/expired grants and conflicting aliases deny before domain queries",
      async () => {
        reset();
        const before = domainQueries;
        for (const token of [
          null,
          "ordinary-session",
          '{"role":"SUPER_ADMIN","grants":["*"]}',
        ])
          await denied(() => reads.detail(token, "bookings.read", "90"));
        const patches: ((s: PolicySnapshot) => PolicySnapshot)[] = [
          (s) => ({ ...s, session: null }),
          (s) => ({ ...s, membership: null }),
          (s) => ({ ...s, session: { ...s.session!, expiresAt: NOW } }),
          (s) => ({
            ...s,
            session: { ...s.session!, accountStatus: "SUSPENDED" },
          }),
          (s) => ({
            ...s,
            session: { ...s.session!, policyVersion: "forged" },
          }),
          (s) => ({
            ...s,
            session: { ...s.session!, authorizationVersion: 1 },
          }),
          (s) => ({ ...s, membership: { ...s.membership!, userId: 999 } }),
          (s) => ({
            ...s,
            membership: { ...s.membership!, personVerified: false },
          }),
          (s) => ({
            ...s,
            membership: { ...s.membership!, status: "REVOKED" },
          }),
          (s) => ({
            ...s,
            membership: { ...s.membership!, status: "SUSPENDED" },
          }),
          (s) => ({ ...s, membership: { ...s.membership!, expiresAt: NOW } }),
          (s) => ({ ...s, membership: { ...s.membership!, grants: [] } }),
          (s) => ({
            ...s,
            membership: {
              ...s.membership!,
              grants: s.membership!.grants.map((g) => ({
                ...g,
                status: "REVOKED",
              })),
            },
          }),
          (s) => ({
            ...s,
            membership: {
              ...s.membership!,
              grants: s.membership!.grants.map((g) => ({
                ...g,
                expiresAt: NOW,
              })),
            },
          }),
          (s) => ({
            ...s,
            membership: {
              ...s.membership!,
              grants: s.membership!.grants.map((g) => ({
                ...g,
                authorizationVersion: 1,
              })),
            },
          }),
          (s) => ({
            ...s,
            resource: {
              ...s.resource!,
              participantPersonIds: [s.membership!.personId],
            },
          }),
          (s) => ({
            ...s,
            resource: {
              ...s.resource!,
              subjectPersonIds: [s.membership!.personId],
            },
          }),
          (s) => ({
            ...s,
            resource: { ...s.resource!, assignedPersonIds: [] },
          }),
          (s) => ({ ...s, resource: { ...s.resource!, id: "91" } }),
          (s) => ({
            ...s,
            resource: { ...s.resource!, caseId: "different-case" },
          }),
        ];
        for (const patch of patches) {
          mutate = patch;
          await denied(() =>
            reads.detail("synthetic-session", "bookings.read", "90"),
          );
        }
        reset();
        for (const action of [
          "unknown",
          "__proto__",
          "bookings.status.write",
          "support.channel.read",
          "ai.autonomous_admin",
        ])
          await denied(() => reads.detail("synthetic-session", action, "90"));
        for (const id of [
          "0",
          "01",
          "*",
          "1 OR 1=1",
          "2147483648",
          "9007199254740993",
        ])
          await denied(() =>
            reads.detail("synthetic-session", "bookings.read", id),
          );
        await denied(() => reads.directory(null, "bookings.read", []));
        await denied(() =>
          reads.directory("synthetic-session", "bookings.read", []),
        );
        assert.equal(domainQueries, before);
      },
    );
    await t.test(
      "all current domain projections exclude bodies, identities, secrets and unscoped records",
      async () => {
        for (const action of [
          "listings.read",
          "disputes.investigate",
          "listing_reports.review",
          "chat_cases.evidence.read",
          "audit.read",
        ]) {
          reset();
          currentAction = action;
          const result = await reads.detail("synthetic-session", action, "90");
          assert.equal(result.data.totalInAuthorizedSelection, 1);
          assert.doesNotMatch(
            JSON.stringify(result),
            /PRIVATE|SECRET|UNRELATED|email|passwordHash|evidence|previousState|reason|ownerId|renterId/,
          );
        }
        reset();
        currentAction = "users.directory.read";
        const user = await reads.detail(
          "synthetic-session",
          currentAction,
          "90",
        );
        assert.equal(user.data.totalInAuthorizedSelection, 1);
        assert.deepEqual(Object.keys(user.data.rows[0]).sort(), [
          "accountStatus",
          "createdAt",
          "id",
        ]);
        assert.doesNotMatch(
          JSON.stringify(user),
          /PRIVATE|SECRET|email|passwordHash/,
        );
        await denied(() =>
          reads.detail("synthetic-session", currentAction, "91"),
        );
        reset();
        currentAction = "listings.read";
        const media = await reads.listingMediaMetadata(
          "synthetic-session",
          "90",
        );
        assert.deepEqual(media.data, [
          { id: 90, mimeType: "image/png", kind: "PHOTO" },
        ]);
        await denied(() =>
          reads.listingMediaMetadata("synthetic-session", "91"),
        );
        assert.equal("supportChannel" in reads, false);
      },
    );
    await t.test(
      "role eligibility is an AND condition for every implemented domain",
      async () => {
        for (const action of [
          "bookings.read",
          "listings.read",
          "users.directory.read",
          "disputes.investigate",
          "listing_reports.review",
          "chat_cases.evidence.read",
          "audit.read",
        ]) {
          for (const candidateRole of STAFF_ROLES) {
            reset();
            currentAction = action;
            role = candidateRole;
            if (capability(action)!.roles.includes(candidateRole)) {
              await reads.detail("synthetic-session", action, "90");
            } else {
              await denied(() =>
                reads.detail("synthetic-session", action, "90"),
              );
            }
          }
        }
      },
    );
    await t.test(
      "private evidence requires assignment, exact case, durable audit and matching photo booking",
      async () => {
        reset();
        currentAction = "evidence.rental_case.read";
        const photo = "00000000-0000-4000-8000-000000000090";
        const value = await reads.rentalEvidence(
          "synthetic-session",
          "90",
          photo,
        );
        assert.equal(Buffer.from(value.data.data).toString("hex"), "010203");
        await denied(() =>
          reads.rentalEvidence(
            "synthetic-session",
            "90",
            "00000000-0000-4000-8000-000000000091",
          ),
        );
        mutate = (s) => ({
          ...s,
          resource: { ...s.resource!, assignedPersonIds: [] },
        });
        await denied(() =>
          reads.rentalEvidence("synthetic-session", "90", photo),
        );
        reset();
        currentAction = "evidence.rental_case.read";
        const missingAudit = createScopedShadowReads(db, {
          ...boundary,
          audit: undefined,
        });
        await denied(() =>
          missingAudit.rentalEvidence("synthetic-session", "90", photo),
        );
        auditFails = true;
        await assert.rejects(
          () => reads.rentalEvidence("synthetic-session", "90", photo),
          /Injected audit outage/,
        );
        auditFails = false;
        mutate = (s) => ({
          ...s,
          resource: {
            ...s.resource!,
            accessPurpose: "INDEPENDENT_REVIEW",
            investigatorPersonIds: [s.membership!.personId],
          },
        });
        await denied(() =>
          reads.rentalEvidence("synthetic-session", "90", photo),
        );
      },
    );
    await t.test(
      "concurrent revocation, grant expiry and audit failure release no result and rollback audit",
      async () => {
        reset();
        currentAction = "evidence.rental_case.read";
        const before = (
          await pg.query('SELECT count(*)::int n FROM "ScopedReadTestAudit"')
        ).rows[0].n;
        let start!: () => void, resume!: () => void;
        const started = new Promise<void>((resolve) => {
            start = resolve;
          }),
          gate = new Promise<void>((resolve) => {
            resume = resolve;
          });
        const concurrent = createScopedShadowReads(db, {
          ...boundary,
          audit: async (tx, event) => {
            await boundary.audit!(tx, event);
            start();
            await gate;
          },
        });
        const pending = concurrent.rentalEvidence(
          "synthetic-session",
          "90",
          "00000000-0000-4000-8000-000000000090",
        );
        await started;
        fenced = false;
        resume();
        await assert.rejects(pending, ScopedReadDenied);
        reset();
        currentAction = "evidence.rental_case.read";
        afterAudit = () => {
          now = NOW + 60001;
        };
        await denied(() =>
          reads.rentalEvidence(
            "synthetic-session",
            "90",
            "00000000-0000-4000-8000-000000000090",
          ),
        );
        assert.equal(
          (await pg.query('SELECT count(*)::int n FROM "ScopedReadTestAudit"'))
            .rows[0].n,
          before,
        );
      },
    );
    await t.test(
      "a separately committed persisted epoch revocation fences an in-flight shadow read",
      async () => {
        reset();
        currentAction = "evidence.rental_case.read";
        const human = randomUUID();
        await pg.query(
          `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
          [
            human,
            createHash("sha256").update(human).digest("hex"),
            randomUUID(),
          ],
        );
        const epoch = (
          await pg.query(
            `SELECT version::text FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
            [human],
          )
        ).rows[0].version;
        let start!: () => void, resume!: () => void;
        const started = new Promise<void>((resolve) => {
          start = resolve;
        });
        const gate = new Promise<void>((resolve) => {
          resume = resolve;
        });
        const reader = createScopedShadowReads(db, {
          ...boundary,
          audit: async (tx, event) => {
            await boundary.audit!(tx, event);
            start();
            await gate;
          },
          // A second connection sees the committed epoch; RepeatableRead alone
          // would keep seeing the stale snapshot. This is an isolated seam test,
          // not a production StaffSessionBinding implementation.
          fence: async () =>
            (
              await pg.query(
                `SELECT version::text FROM "StaffAuthorizationVersion" WHERE "personId"=$1`,
                [human],
              )
            ).rows[0].version === epoch,
        });
        const before = (
          await pg.query('SELECT count(*)::int n FROM "ScopedReadTestAudit"')
        ).rows[0].n;
        const pending = reader.rentalEvidence(
          "synthetic-session",
          "90",
          "00000000-0000-4000-8000-000000000090",
        );
        await started;
        try {
          await pg.query(
            `UPDATE "StaffPerson" SET verification='REVOKED' WHERE id=$1`,
            [human],
          );
        } finally {
          resume();
        }
        await assert.rejects(pending, ScopedReadDenied);
        assert.equal(
          (await pg.query('SELECT count(*)::int n FROM "ScopedReadTestAudit"'))
            .rows[0].n,
          before,
        );
      },
    );
    await t.test(
      "even unexpectedly ACTIVE database rows cannot bypass missing trusted staff attestation",
      async () => {
        const unexpected = {
          authSession: {
            findUnique: async () => ({
              expiresAt: new Date(Date.now() + 60000),
              user: {
                accountStatus: "ACTIVE",
                staffAssociation: {
                  state: "VERIFIED",
                  verifiedAt: new Date(),
                  person: {
                    verification: "VERIFIED",
                    authorization: {
                      version: BigInt(1),
                      policyVersion: POLICY_VERSION,
                    },
                    memberships: [
                      { id: randomUUID(), policyVersion: POLICY_VERSION },
                    ],
                  },
                },
              },
            }),
          },
        } as unknown as Prisma.TransactionClient;
        assert.deepEqual(
          await inspectPersistedStaffIdentity(unexpected, "fixture-token"),
          {
            mode: "INACTIVE",
            authorized: false,
            reason: "STAFF_SESSION_ATTESTATION_NOT_IMPLEMENTED",
          },
        );
      },
    );
    await t.test(
      "persisted ordinary account, VERIFIED alias and DRAFT membership never authenticate staff",
      async () => {
        const subject = randomUUID(),
          issuer = randomUUID(),
          token = randomUUID();
        for (const id of [subject, issuer])
          await pg.query(
            `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
            [id, createHash("sha256").update(id).digest("hex"), randomUUID()],
          );
        await pg.query(
          `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES (60,$1,NOW()+interval '1 hour')`,
          [createHash("sha256").update(token).digest("hex")],
        );
        const inspect = () =>
          db.$transaction((tx) => inspectPersistedStaffIdentity(tx, token));
        assert.equal((await inspect()).reason, "UNVERIFIED_HUMAN_LINK");
        await pg.query(
          `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,60,'VERIFIED',$3,NOW())`,
          [randomUUID(), subject, randomUUID()],
        );
        await pg.query(
          `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'OPERATIONS',$3,$4,$5,NOW(),NOW()+interval '1 day')`,
          [randomUUID(), subject, issuer, randomUUID(), POLICY_VERSION],
        );
        assert.deepEqual(await inspect(), {
          mode: "INACTIVE",
          authorized: false,
          reason: "NO_ACTIVE_MEMBERSHIP",
        });
        assert.equal(
          (
            await db.$transaction((tx) =>
              inspectPersistedStaffIdentity(tx, null),
            )
          ).authorized,
          false,
        );
        await pg.query(
          `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 hour' WHERE "userId"=60`,
        );
        assert.equal((await inspect()).reason, "INVALID_SESSION");
        assert.equal(
          (
            await pg.query(
              `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (await pg.query(`SELECT role FROM "User" WHERE id=60`)).rows[0].role,
          "USER",
        );
      },
    );
  } finally {
    await db.$disconnect();
    await pg.end();
  }
});
