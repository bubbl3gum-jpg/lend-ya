import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { connectTestDatabase } from "./support/test-database";
import { createShadowPolicyService } from "../lib/authorization/server";
import {
  CAPABILITIES,
  POLICY_VERSION,
  STAFF_ROLES,
  type StaffRole,
} from "../lib/authorization/registry";
import {
  evaluateShadow,
  type PolicySnapshot,
  type ResourceSnapshot,
} from "../lib/authorization/policy";
import { fixture, NOW } from "./fixtures/authorization";
import {
  moderateUser,
  moderateListing,
  resolveReport,
  resolveDispute,
} from "../lib/admin/mutations";
import { readDisputeEvidence } from "../lib/admin/evidence";
import { readCase, claim, decide } from "../lib/chat/moderation";
import { prisma } from "../lib/prisma";

// The fixture HTTP endpoint below is a loopback test server, never a Next route.
// Future memberships live in memory; all labelled staff remain UserRole.USER.
test(
  "Batch 2B: HTTP and direct service shadow checks, plus every legacy Admin API",
  { timeout: 180000 },
  async (t) => {
    const db = await connectTestDatabase();
    const base = process.env.TEST_BASE_URL!;
    const api = async (
      url: string,
      cookie = "",
      method = "GET",
      body?: object,
    ) =>
      fetch(base + url, {
        method,
        headers: {
          Cookie: cookie,
          "Content-Type": "application/json",
          "X-Role": "SUPER_ADMIN",
          "X-Risk": "LOW",
          "X-Staff-Role": "SUPER_ADMIN",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const actors: { id: number; cookie: string; role?: StaffRole }[] = [];
    const memberships = new Map<number, StaffRole>();
    let suspended = false,
      revoked = false,
      stale = false,
      resourceChanged = false,
      auditUnavailable = false,
      riskElevated = false;
    const resourceFor = (kind: string): ResourceSnapshot | null => {
      const entry = Object.values(CAPABILITIES).find(
        (entry) => entry.resource === kind,
      );
      if (!entry) return null;
      return {
        ...fixture(entry.action).resource!,
        assignedPersonIds: actors.map((actor) => `person-${actor.id}`),
        ...(resourceChanged ? { id: "wrong-resource" } : {}),
        accessAuditAvailable: !auditUnavailable,
        ...(riskElevated ? { serverRisk: "HIGH" as const } : {}),
      };
    };
    const service = createShadowPolicyService({
      now: () => NOW,
      async loadSnapshot(credential, reference): Promise<PolicySnapshot> {
        const cookie =
          credential instanceof Request
            ? (credential.headers.get("cookie") ?? "")
            : credential.sessionKey;
        const response = await api("/api/auth/me", cookie);
        if (response.status !== 200)
          return { session: null, membership: null, resource: null };
        const { user } = await response.json();
        const role = memberships.get(user.id);
        const skeleton = fixture();
        const allGrants = Object.values(CAPABILITIES).map(
          (entry) => fixture(entry.action).membership!.grants[0],
        );
        return {
          session: {
            ...skeleton.session!,
            userId: user.id,
            accountStatus: suspended ? "SUSPENDED" : user.accountStatus,
          },
          membership: role
            ? {
                ...skeleton.membership!,
                userId: user.id,
                personId: `person-${user.id}`,
                role,
                grants: allGrants,
                status: revoked ? "REVOKED" : "ACTIVE",
                authorizationVersion: stale ? 8 : 7,
              }
            : null,
          resource: resourceFor(reference.kind),
          // No approval object is invented by a request body. Approvals therefore
          // deny at this fixture HTTP boundary; detailed eligibility is unit tested.
          proposal: null,
        };
      },
    });
    const shadowHttp = createServer(async (incoming, outgoing) => {
      try {
        let raw = "";
        for await (const chunk of incoming) {
          raw += chunk;
          if (raw.length > 4096) throw Error("Fixture body too large");
        }
        const body = JSON.parse(raw);
        const request = new Request("http://localhost/shadow", {
          method: "POST",
          headers: { cookie: incoming.headers.cookie ?? "" },
          body: raw,
        });
        const result = await service.evaluate(request, body.action, {
          kind: body.kind,
          id: body.id,
        });
        outgoing.writeHead(200, { "Content-Type": "application/json" });
        outgoing.end(JSON.stringify(result));
      } catch {
        outgoing.writeHead(400);
        outgoing.end();
      }
    });
    await new Promise<void>((resolve) =>
      shadowHttp.listen(0, "127.0.0.1", resolve),
    );
    const shadowBase = `http://127.0.0.1:${(shadowHttp.address() as import("node:net").AddressInfo).port}`;
    const shadow = async (
      actor: (typeof actors)[number] | null,
      action: string,
      kind = "platform",
      id = "resource-1",
      extras = {},
    ) => {
      const response = await fetch(shadowBase, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: actor?.cookie ?? "",
          "X-Role": "SUPER_ADMIN",
        },
        body: JSON.stringify({
          action,
          kind,
          id,
          role: "SUPER_ADMIN",
          risk: "LOW",
          ...extras,
        }),
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    try {
      for (const role of [...STAFF_ROLES, undefined, undefined]) {
        const response = await api("/api/auth/register", "", "POST", {
          name: "Authorization fixture",
          email: `${randomUUID()}@authorization.test`,
          password: `Isolated-${randomUUID()}`,
        });
        assert.equal(response.status, 201);
        const payload = await response.json();
        const actor = {
          id: payload.user.id,
          cookie: response.headers.get("set-cookie")!.split(";")[0],
          role,
        };
        actors.push(actor);
        if (role) memberships.set(actor.id, role);
        assert.equal(payload.user.role, "USER");
      }
      const ordinary = actors[4],
        legacyAdmin = actors[5];
      // Only the normal legacy test administrator; future staff remain inert fixtures.
      await db.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
        legacyAdmin.id,
      ]);
      await t.test(
        "persisted DRAFT staff identity cannot confer legacy or new staff authority",
        async () => {
          const subject = randomUUID(),
            issuer = randomUUID();
          for (const id of [subject, issuer])
            await db.query(
              `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
              [id, createHash("sha256").update(id).digest("hex"), randomUUID()],
            );
          await db.query(
            `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,$3,'VERIFIED',$4,NOW())`,
            [randomUUID(), subject, ordinary.id, randomUUID()],
          );
          await db.query(
            `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'OPERATIONS',$3,$4,$5,NOW(),NOW()+interval '1 day')`,
            [randomUUID(), subject, issuer, randomUUID(), POLICY_VERSION],
          );
          assert.equal(
            (await api("/api/admin/overview", ordinary.cookie)).status,
            403,
          );
          assert.equal(
            (await shadow(ordinary, "overview.read")).candidate,
            "DENY",
          );
          assert.equal(
            (
              await db.query('SELECT role FROM "User" WHERE id=$1', [
                ordinary.id,
              ])
            ).rows[0].role,
            "USER",
          );
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "every contract/role is shadow evaluated over HTTP without trusting headers or body roles",
        async () => {
          for (const actor of actors.slice(0, 4))
            for (const entry of Object.values(CAPABILITIES)) {
              const result = await shadow(actor, entry.action, entry.resource);
              assert.equal(result.readyForActivation, false);
              assert.equal(result.mode, "SHADOW_ONLY");
              const expected = evaluateShadow(
                entry.action,
                { ...fixture(entry.action, actor.role), proposal: null },
                NOW,
              );
              assert.equal(
                result.candidate,
                expected.candidate,
                `${entry.action}/${actor.role}`,
              );
              if (["FORBIDDEN", "DEFERRED"].includes(entry.risk))
                assert.equal(result.candidate, "DENY");
            }
        },
      );
      await t.test(
        "anonymous, ordinary USER and legacy ADMIN are not assigned future roles",
        async () => {
          for (const actor of [null, ordinary, legacyAdmin])
            assert.equal(
              (await shadow(actor, "overview.read")).candidate,
              "DENY",
            );
          for (const action of [
            "__proto__",
            "constructor",
            "overview.read forged",
            "security.superuser",
          ])
            assert.equal(
              (await shadow(actors[0], action)).reason,
              "UNKNOWN_CAPABILITY",
            );
          assert.equal(
            (
              await shadow(
                { ...actors[0], cookie: "p2p_session=invalid" },
                "overview.read",
              )
            ).candidate,
            "DENY",
          );
        },
      );
      await t.test(
        "live shadow loader revocation, suspension, stale versions and wrong resource fail at HTTP and service boundaries",
        async () => {
          for (const state of ["revoked", "suspended", "stale", "resource"]) {
            revoked = state === "revoked";
            suspended = state === "suspended";
            stale = state === "stale";
            resourceChanged = state === "resource";
            assert.equal(
              (await shadow(actors[0], "overview.read")).candidate,
              "DENY",
            );
            assert.equal(
              (
                await service.evaluate(
                  { sessionKey: actors[0].cookie },
                  "overview.read",
                  { kind: "platform", id: "resource-1" },
                )
              ).candidate,
              "DENY",
            );
          }
          revoked = suspended = stale = resourceChanged = false;
          riskElevated = true;
          assert.equal(
            (
              await shadow(
                actors[1],
                "listings.restrict",
                "listing",
                "resource-1",
                { risk: "LOW", role: "SUPER_ADMIN" },
              )
            ).reason,
            "RISK_ESCALATION_REQUIRED",
          );
          riskElevated = false;
          auditUnavailable = true;
          assert.equal(
            (await shadow(actors[2], "evidence.rental_case.read", "dispute"))
              .candidate,
            "DENY",
          );
          auditUnavailable = false;
          assert.equal(
            (
              await shadow(
                actors[2],
                "support.channel.read",
                "support_channel",
                "opposite-channel",
              )
            ).candidate,
            "DENY",
          );
        },
      );
      await t.test(
        "every existing Admin route denies all four USER-labelled future roles and anonymous requests",
        async () => {
          function routes(dir: string): string[] {
            return readdirSync(dir, { withFileTypes: true }).flatMap((item) =>
              item.isDirectory()
                ? routes(path.join(dir, item.name))
                : item.name === "route.ts"
                  ? [path.join(dir, item.name)]
                  : [],
            );
          }
          for (const file of routes("app/api/admin")) {
            const url =
              "/" +
              file
                .replace(/^app\//, "")
                .replace(/\/route.ts$/, "")
                .replaceAll("[id]", "1")
                .replaceAll(
                  "[photoId]",
                  "11111111-1111-4111-8111-111111111111",
                );
            const methods = [
              ...readFileSync(file, "utf8").matchAll(
                /export (?:async )?function (GET|POST|PATCH|DELETE)\(/g,
              ),
            ].map((match) => match[1]);
            assert.ok(methods.length, `Uninventoried method syntax: ${file}`);
            for (const method of methods)
              for (const actor of [null, ...actors.slice(0, 5)]) {
                const response = await api(
                  url,
                  actor?.cookie,
                  method,
                  method === "GET"
                    ? undefined
                    : { role: "ADMIN", staffRole: "SUPER_ADMIN", risk: "LOW" },
                );
                assert.equal(
                  response.status,
                  actor ? 403 : 401,
                  `${method} ${url} / ${actor?.role ?? "ordinary/anonymous"}`,
                );
                assert.ok(
                  !(await response.text()).includes("private-case-sentinel"),
                );
              }
          }
          assert.equal(
            (await api("/api/admin/overview", legacyAdmin.cookie)).status,
            200,
          );
          assert.equal(
            (await api("/api/admin/chat/cases", legacyAdmin.cookie)).status,
            403,
            "ADMIN still needs separate ChatReviewer grant",
          );
          for (const actor of actors.slice(0, 4))
            assert.equal(
              (
                await db.query('SELECT role FROM "User" WHERE id=$1', [
                  actor.id,
                ])
              ).rows[0].role,
              "USER",
            );
        },
      );
      await t.test(
        "direct legacy mutation, private evidence and chat services still reject lower-privilege actors",
        async () => {
          const forbidden = (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            error.status === 403;
          const before = (
            await db.query('SELECT COUNT(*)::int n FROM "AdminAuditLog"')
          ).rows[0].n;
          for (const actor of actors.slice(0, 5)) {
            await assert.rejects(
              moderateUser(String(legacyAdmin.id), actor.id, {
                status: "SUSPENDED",
                expectedStatus: "ACTIVE",
                reason: "Must remain denied",
              }),
              forbidden,
            );
            await assert.rejects(
              moderateListing("1", actor.id, {
                restricted: true,
                expectedRestricted: false,
                reason: "Must remain denied",
              }),
              forbidden,
            );
            await assert.rejects(
              resolveReport("1", actor.id, {
                decision: "DISMISS",
                reason: "Must remain denied",
              }),
              forbidden,
            );
            await assert.rejects(
              resolveDispute("1", actor.id, {
                finding: "NO_ACTIONABLE_ISSUE",
                outcome: "CONTINUE_RETURN",
                reason: "Must remain denied",
              }),
              forbidden,
            );
            await assert.rejects(
              readDisputeEvidence(actor.id, 1, randomUUID()),
              forbidden,
            );
            await assert.rejects(readCase(actor.id, 1), forbidden);
            await assert.rejects(claim(actor.id, 1), forbidden);
            await assert.rejects(
              decide(actor.id, 1, {
                action: "DISMISS",
                classification: "NO_VIOLATION",
                reason: "Must remain denied",
                expectedVersion: 0,
              }),
              forbidden,
            );
          }
          assert.equal(
            (await db.query('SELECT COUNT(*)::int n FROM "AdminAuditLog"'))
              .rows[0].n,
            before,
          );
          assert.equal(
            (
              await db.query('SELECT "accountStatus" FROM "User" WHERE id=$1', [
                legacyAdmin.id,
              ])
            ).rows[0].accountStatus,
            "ACTIVE",
          );
          assert.equal(
            (await db.query('SELECT COUNT(*)::int n FROM "ChatReviewer"'))
              .rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "expired real sessions fail at both shadow boundaries without changing staff authority",
        async () => {
          await db.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-INTERVAL '1 second' WHERE "userId"=$1`,
            [actors[0].id],
          );
          assert.equal(
            (await shadow(actors[0], "overview.read")).reason,
            "INVALID_HUMAN_SESSION",
          );
          assert.equal(
            (
              await service.evaluate(
                { sessionKey: actors[0].cookie },
                "overview.read",
                { kind: "platform", id: "resource-1" },
              )
            ).candidate,
            "DENY",
          );
          assert.equal(
            (await api("/api/admin/overview", actors[0].cookie)).status,
            401,
          );
        },
      );
    } finally {
      shadowHttp.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        shadowHttp.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.$disconnect();
      await db.end();
    }
  },
);
