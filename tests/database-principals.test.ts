import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawn, type ChildProcess } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { connectTestDatabase } from "./support/test-database";
import { principalFixture } from "./support/database-principals";
import {
  mfaActorFixture,
  MFA_PASSWORD,
  draftMfaMembership,
} from "./support/mfa-fixtures";
import { realTestAuthenticator } from "./support/webauthn-authenticator";
import { createStaffWebAuthnFoundation } from "../lib/authorization/mfa/service";
import { persistSession, newSessionCredential } from "../lib/auth";

test(
  "real PostgreSQL principal isolation in a fresh owned disposable database",
  { timeout: 120000 },
  async (t) => {
    const owner = await connectTestDatabase();
    let profile: Awaited<ReturnType<typeof principalFixture>> | undefined,
      app: ChildProcess | undefined;
    const checks: { label: string; sqlstate: string }[] = [];
    const denied = async (
      client: import("pg").Client,
      sql: string,
      params: unknown[] = [],
      label = sql.split(" ")[0],
    ) => {
      let code = "";
      try {
        await client.query(sql, params);
      } catch (error) {
        code = String((error as { code?: string }).code ?? "");
      }
      assert.ok(
        ["42501", "23514", "P0001"].includes(code),
        `Expected denied SQL for ${label}; got ${code || "success"}`,
      );
      checks.push({ label, sqlstate: code });
    };
    try {
      const actor = await mfaActorFixture(owner);
      await owner.query(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [
        actor.userId,
      ]);
      await draftMfaMembership(owner, actor.personId);
      await owner.query(
        `INSERT INTO "AdminAuditLog" ("adminId",action,"targetType","targetId",reason,"previousState","newState") VALUES ($1,'FIXTURE','user',$1,'Owned fixture','{}','{}')`,
        [actor.userId],
      );
      const history = (
        await owner.query(
          `SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name`,
        )
      ).rows;
      profile = await principalFixture(owner);
      const runtime = await profile.connect("runtime"),
        mfa = await profile.connect("mfa"),
        writer = await profile.connect("authorization"),
        inspection = await profile.connect("inspection"),
        migration = await profile.connect("migration");
      await t.test(
        "principals have distinct real session identities and no privileged memberships",
        async () => {
          for (const [kind, c] of [
            ["runtime", runtime],
            ["mfa", mfa],
            ["authorization", writer],
            ["inspection", inspection],
          ] as const) {
            const r = (
              await c.query(
                `SELECT session_user,current_user,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname=current_user`,
              )
            ).rows[0];
            assert.equal(r.session_user, profile!.names[kind]);
            assert.equal(r.current_user, r.session_user);
            for (const k of [
              "rolsuper",
              "rolcreaterole",
              "rolcreatedb",
              "rolbypassrls",
            ])
              assert.equal(r[k], false);
            await denied(
              c,
              `SET ROLE "${profile!.names.migration}"`,
              [],
              kind + " cannot become migrator",
            );
          }
        },
      );
      await t.test(
        "runtime cannot perform DDL, disable protections, truncate audits, promote accounts or forge staff and MFA state",
        async () => {
          for (const [sql, label] of [
            [`CREATE TABLE public.forbidden_ddl(id int)`, "schema DDL"],
            [`CREATE SCHEMA forbidden_schema`, "database schema DDL"],
            [
              `CREATE TEMP TABLE forbidden_temp(id int)`,
              "temporary schema bypass",
            ],
            [
              `ALTER TABLE "StaffMfaEvent" DISABLE TRIGGER ALL`,
              "disable trigger",
            ],
            [`SET session_replication_role=replica`, "replication bypass"],
            [`TRUNCATE "AdminAuditLog"`, "truncate audit"],
            [`UPDATE "AdminAuditLog" SET reason='rewritten'`, "rewrite audit"],
            [
              `UPDATE "User" SET role='ADMIN' WHERE id=${actor.userId}`,
              "legacy role promotion",
            ],
            [
              `INSERT INTO "StaffMfaAssurance" DEFAULT VALUES`,
              "forge MFA assurance",
            ],
            [
              `INSERT INTO "StaffMfaCredential" DEFAULT VALUES`,
              "forge passkey",
            ],
            [
              `INSERT INTO "StaffMembership" DEFAULT VALUES`,
              "forge staff membership",
            ],
            [
              `INSERT INTO "StaffApprovalDecision" DEFAULT VALUES`,
              "forge approval",
            ],
            [
              `UPDATE "StaffAuthorizationVersion" SET version=version+1`,
              "epoch bypass",
            ],
            [
              `CREATE FUNCTION public.evil_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`,
              "trigger-depth spoofing helper",
            ],
          ] as const)
            await denied(runtime, sql, [], label);
          await denied(
            runtime,
            `SET ROLE "${profile!.names.mfa}"`,
            [],
            "runtime cannot become verifier",
          );
          await denied(
            runtime,
            `SET ROLE "${profile!.names.authorization}"`,
            [],
            "runtime cannot become protected writer",
          );
          await denied(
            runtime,
            `DELETE FROM "MrtStation"`,
            [],
            "runtime MRT catalogue read-only",
          );
          await denied(
            runtime,
            `INSERT INTO "User" (name,email,"passwordHash",role,"updatedAt") VALUES ('forged',$1,'invalid','ADMIN',NOW())`,
            [randomUUID() + "@fixture.test"],
            "insert privileged account",
          );
        },
      );
      await t.test(
        "MFA principal performs actual signed verification but cannot provision staff or rewrite proof history",
        async () => {
          const db = new PrismaClient({
            adapter: new PrismaPg({ connectionString: profile!.url("mfa") }),
          });
          try {
            const realm = {
                rpId: "localhost",
                origin: "http://localhost:4319",
                rpName: "Hustlen' principal fixture",
              },
              service = createStaffWebAuthnFoundation(db, realm, {
                legacyAdminOnly: true,
              }),
              auth = realTestAuthenticator();
            const start = await service.beginEnrollment(
              actor.token,
              MFA_PASSWORD,
            );
            const key = await service.finishEnrollment(
              actor.token,
              start.challengeId,
              MFA_PASSWORD,
              auth.registration(
                start.options.challenge,
                realm.origin,
                realm.rpId,
              ),
            );
            const challenge = await service.beginAuthentication(actor.token),
              verified = await service.finishAuthentication(
                actor.token,
                challenge.challengeId,
                auth.assertion(
                  challenge.options.challenge,
                  realm.origin,
                  realm.rpId,
                  start.options.user.id,
                ),
              );
            assert.equal(verified.factorVerified, true);
            assert.equal(verified.staffAuthorized, false);
            await denied(
              mfa,
              `UPDATE "StaffMfaAssurance" SET "expiresAt"="expiresAt"+interval '1 second'`,
              [],
              "rewrite assurance history",
            );
            await denied(
              mfa,
              `INSERT INTO "StaffMembership" DEFAULT VALUES`,
              [],
              "verifier cannot grant role",
            );
            await denied(
              mfa,
              `UPDATE "User" SET role='ADMIN'`,
              [],
              "verifier cannot change marketplace role",
            );
            for (const table of [
              "User",
              "AuthSession",
              "StaffPerson",
              "StaffAccountAssociation",
            ])
              await denied(
                mfa,
                `UPDATE "${table}" SET id=id`,
                [],
                "verifier lock-only " + table,
              );
            await service.revokeCredential(
              actor.token,
              MFA_PASSWORD,
              verified.assuranceId,
              key.credentialKey,
            );
          } finally {
            await db.$disconnect();
          }
        },
      );
      await t.test(
        "authorized writer still cannot activate staff, bypass epochs or commit approval/security authority",
        async () => {
          await denied(
            writer,
            `UPDATE "StaffMembership" SET state='ACTIVE'`,
            [],
            "ACTIVE remains blocked",
          );
          await denied(
            writer,
            `INSERT INTO "StaffSecurityEvent" ("correlationId","policyVersion",action,"resourceKind",outcome,"reasonCode") VALUES ($1,'hustlen-admin-shadow-v1','security.unknown_action','UNKNOWN','COMMITTED','ACCESS_DENIED')`,
            [randomUUID()],
            "COMMITTED remains blocked",
          );
          await denied(
            writer,
            `UPDATE "StaffAuthorizationVersion" SET version=version+1`,
            [],
            "direct epoch mutation blocked",
          );
          await denied(
            writer,
            `INSERT INTO "StaffAuthorizationEvent" ("personId") VALUES ($1)`,
            [actor.personId],
            "history insertion blocked",
          );
          await denied(
            writer,
            `UPDATE "AdminAuditLog" SET reason='forged'`,
            [],
            "writer append-only",
          );
          const constraints = (
            await owner.query(
              `SELECT conname,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conname IN ('staff_no_live_success','staff_membership_inactive_only','staff_grant_inactive_only') OR pg_get_constraintdef(oid) LIKE '%APPROVED%' OR pg_get_constraintdef(oid) LIKE '%EXECUTED%'`,
            )
          ).rows;
          assert.ok(constraints.some((r) => r.definition.includes("ACTIVE")));
          assert.ok(constraints.some((r) => r.definition.includes("APPROVED")));
          assert.ok(constraints.some((r) => r.definition.includes("EXECUTED")));
          assert.ok(
            constraints.some((r) => r.definition.includes("COMMITTED")),
          );
        },
      );
      await t.test(
        "inspection can read only an aggregate view; migration owner can perform controlled DDL",
        async () => {
          assert.equal(
            (
              await inspection.query(
                `SELECT booking_count FROM hustlen_fixture_health`,
              )
            ).rows[0].booking_count,
            0,
          );
          for (const table of [
            "User",
            "Booking",
            "StaffMfaCredential",
            "StaffMfaAssurance",
            "AdminAuditLog",
          ])
            await denied(
              inspection,
              `SELECT * FROM "${table}"`,
              [],
              "inspection no " + table,
            );
          await denied(
            inspection,
            `INSERT INTO "User" DEFAULT VALUES`,
            [],
            "inspection no writes",
          );
          await migration.query(
            `CREATE TABLE public.fixture_migration_probe(id int); DROP TABLE public.fixture_migration_probe; CREATE TYPE public.fixture_enum_probe AS ENUM ('one'); DROP TYPE public.fixture_enum_probe`,
          );
          assert.equal(
            (
              await migration.query(
                `SELECT bool_and(pg_get_userbyid(typowner)=current_user) owned FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'`,
              )
            ).rows[0].owned,
            true,
          );
        },
      );
      await t.test(
        "ordinary runtime preserves real Prisma session persistence and actual application login/register/catalog/logout",
        async () => {
          const db = new PrismaClient({
            adapter: new PrismaPg({
              connectionString: profile!.url("runtime"),
            }),
          });
          try {
            await persistSession(actor.userId, newSessionCredential(), db);
          } finally {
            await db.$disconnect();
          }
          const binding = profile!.url("runtime"),
            port = process.env.TEST_ADMIN_PORT!,
            base = "http://localhost:" + port;
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
            {
              env: {
                ...process.env,
                NODE_ENV: "development",
                DATABASE_URL: binding,
                TEST_DATABASE_URL: binding,
                MRT_TEST_DATABASE_URL: binding,
              },
              stdio: ["ignore", "pipe", "pipe"],
            },
          );
          for (const stream of [app.stdout, app.stderr])
            stream?.on(
              "data",
              (d) =>
                void appendFile(
                  path.join(
                    process.env.MRT_TEST_ARTIFACT_DIR!,
                    "principal-app.log",
                  ),
                  d,
                ),
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
          const email = randomUUID() + "@fixture.test",
            post = (route: string, body: object, cookie = "") =>
              fetch(base + route, {
                method: "POST",
                headers: {
                  Origin: base,
                  "Content-Type": "application/json",
                  Cookie: cookie,
                },
                body: JSON.stringify(body),
              });
          const registration = await post("/api/auth/register", {
            name: "Runtime fixture",
            email,
            password: MFA_PASSWORD,
            role: "ADMIN",
          });
          assert.equal(registration.status, 201);
          assert.equal((await registration.json()).user.role, "USER");
          const login = await post("/api/auth/login", {
            email,
            password: MFA_PASSWORD,
          });
          assert.equal(login.status, 200);
          const cookie = login.headers.get("set-cookie")!.split(";")[0];
          assert.equal(
            (
              await fetch(base + "/api/auth/me", {
                headers: { Cookie: cookie },
              })
            ).status,
            200,
          );
          assert.equal((await fetch(base + "/api/listings")).status, 200);
          assert.equal(
            (await post("/api/auth/logout", {}, cookie)).status,
            200,
          );
          assert.equal(
            (
              await fetch(base + "/api/auth/me", {
                headers: { Cookie: cookie },
              })
            ).status,
            401,
          );
        },
      );
      assert.deepEqual(
        (
          await owner.query(
            `SELECT migration_name,checksum FROM "_prisma_migrations" ORDER BY migration_name`,
          )
        ).rows,
        history,
      );
      await writeFile(
        path.join(
          process.env.MRT_TEST_ARTIFACT_DIR!,
          "principal-evidence.json",
        ),
        JSON.stringify(
          {
            principals: Object.keys(profile.names),
            separateLoginConnections: true,
            denials: checks,
            migrationRowsPreserved: history.length,
            actualCryptography: true,
            actualRuntimeApplication: true,
            roleCredentialsPublished: false,
            productionProfileActivated: false,
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      if (app && app.exitCode === null) {
        const stopped = new Promise<void>((resolve) =>
          app!.once("exit", () => resolve()),
        );
        app.kill("SIGTERM");
        await stopped;
      }
      await profile?.cleanup();
      await owner.end();
    }
  },
);
