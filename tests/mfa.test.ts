import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { connectTestDatabase } from "./support/test-database";
import {
  MFA_PASSWORD,
  mfaActorFixture,
  draftMfaMembership,
} from "./support/mfa-fixtures";
import { realTestAuthenticator } from "./support/webauthn-authenticator";
import {
  createStaffWebAuthnFoundation,
  StaffMfaDenied,
} from "../lib/authorization/mfa/service";
import { webAuthnRealm } from "../lib/authorization/mfa/config";
import { mfaBrowserAcceptance } from "./support/mfa-browser";

test(
  "Batch 5A real WebAuthn cryptography, persisted lifecycle and non-authorizing staff boundary",
  { timeout: 120000 },
  async (t) => {
    const pg = await connectTestDatabase(),
      db = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: process.env.TEST_DATABASE_URL!,
        }),
      });
    const realm = {
        rpId: "localhost",
        origin: "http://localhost:4319",
        rpName: "Hustlen' MFA",
      },
      mfa = createStaffWebAuthnFoundation(db, realm);
    async function enrolled() {
      const actor = await mfaActorFixture(pg),
        auth = realTestAuthenticator();
      const registration = await mfa.beginEnrollment(actor.token, MFA_PASSWORD);
      const result = await mfa.finishEnrollment(
        actor.token,
        registration.challengeId,
        MFA_PASSWORD,
        auth.registration(
          registration.options.challenge,
          realm.origin,
          realm.rpId,
        ),
      );
      return {
        actor,
        auth,
        key: result.credentialKey,
        handle: registration.options.user.id,
      };
    }
    const authenticate = async (f: Awaited<ReturnType<typeof enrolled>>) => {
      const c = await mfa.beginAuthentication(f.actor.token);
      return mfa.finishAuthentication(
        f.actor.token,
        c.challengeId,
        f.auth.assertion(
          c.options.challenge,
          realm.origin,
          realm.rpId,
          f.handle,
        ),
      );
    };
    try {
      await t.test(
        "explicit pinned realm, no default production origin and no factor seeds",
        async () => {
          for (const table of [
            "StaffMfaCredential",
            "StaffMfaChallenge",
            "StaffMfaAssurance",
            "StaffMfaEvent",
            "StaffMfaVersion",
            "StaffMfaRateLimit",
          ])
            assert.equal(
              (await pg.query(`SELECT count(*)::int n FROM "${table}"`)).rows[0]
                .n,
              0,
            );
          for (const config of [
            { ...realm, rpId: "evil.example" },
            { ...realm, origin: "http://example.test" },
            { ...realm, origin: realm.origin + "/path" },
          ])
            assert.throws(() => webAuthnRealm(config));
        },
      );
      await t.test(
        "real ES256 signature verifies and UV assurance is separate from staff authority",
        async () => {
          const f = await enrolled();
          const verified = await authenticate(f);
          assert.equal(verified.factorVerified, true);
          assert.equal(verified.staffAuthorized, false);
          assert.deepEqual(
            await mfa.inspectStaffTrust(f.actor.token, verified.assuranceId),
            {
              factorVerified: true,
              staffAuthorized: false,
              reason: "STAFF_ACTIVATION_BLOCKED",
            },
          );
          const saved = await db.staffMfaCredential.findUniqueOrThrow({
            where: { id: f.key },
          });
          assert.equal(saved.counter, BigInt(1));
          assert.ok(saved.publicKey.length > 32);
          const events = await db.staffMfaEvent.findMany({
            where: { associationId: f.actor.associationId },
          });
          assert.ok(events.some((e) => e.kind === "VERIFIED"));
          assert.doesNotMatch(
            JSON.stringify(events.map((e) => Object.keys(e))),
            /signature|challengeHash|publicKey|token|password/,
          );
        },
      );
      await t.test(
        "incorrect signature, signed wrong challenge/origin/RP and forged UV flags deny",
        async () => {
          const mutations = [
            "signature",
            "challenge",
            "origin",
            "rp",
            "uv",
          ] as const;
          for (const mode of mutations) {
            const f = await enrolled(),
              c = await mfa.beginAuthentication(f.actor.token);
            const response = f.auth.assertion(
              mode === "challenge" ? "wrong-challenge" : c.options.challenge,
              mode === "origin" ? "https://evil.example" : realm.origin,
              mode === "rp" ? "evil.example" : realm.rpId,
              f.handle,
              { verified: mode !== "uv" },
            );
            if (mode === "signature")
              response.response.signature =
                Buffer.alloc(70).toString("base64url");
            await assert.rejects(
              () =>
                mfa.finishAuthentication(f.actor.token, c.challengeId, {
                  ...response,
                  mfaVerified: true,
                  role: "SUPER_ADMIN",
                } as typeof response),
              StaffMfaDenied,
            );
            assert.equal(
              await db.staffMfaAssurance.count({
                where: { associationId: f.actor.associationId },
              }),
              0,
            );
          }
        },
      );
      await t.test(
        "accepted assertion replay and new-challenge substitution cannot reuse a proof",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token),
            proof = f.auth.assertion(
              c.options.challenge,
              realm.origin,
              realm.rpId,
              f.handle,
            );
          await mfa.finishAuthentication(f.actor.token, c.challengeId, proof);
          await assert.rejects(
            () => mfa.finishAuthentication(f.actor.token, c.challengeId, proof),
            StaffMfaDenied,
          );
          const other = await mfa.beginAuthentication(f.actor.token);
          await assert.rejects(
            () =>
              mfa.finishAuthentication(f.actor.token, other.challengeId, proof),
            StaffMfaDenied,
          );
          assert.equal(
            await db.staffMfaAssurance.count({
              where: { associationId: f.actor.associationId },
            }),
            1,
          );
        },
      );
      await t.test(
        "concurrent assertions consume a real nonce exactly once",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token),
            proof = f.auth.assertion(
              c.options.challenge,
              realm.origin,
              realm.rpId,
              f.handle,
            );
          const result = await Promise.allSettled([
            mfa.finishAuthentication(f.actor.token, c.challengeId, proof),
            mfa.finishAuthentication(f.actor.token, c.challengeId, proof),
          ]);
          assert.equal(
            result.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            await db.staffMfaAssurance.count({
              where: { associationId: f.actor.associationId },
            }),
            1,
          );
        },
      );
      await t.test(
        "challenge cancellation, expiration and password reauthentication fail closed",
        async () => {
          const a = await mfaActorFixture(pg);
          await assert.rejects(
            () => mfa.beginEnrollment(a.token, "wrong"),
            StaffMfaDenied,
          );
          const c = await mfa.beginEnrollment(a.token, MFA_PASSWORD);
          await mfa.cancelChallenge(a.token, c.challengeId);
          const auth = realTestAuthenticator();
          await assert.rejects(
            () =>
              mfa.finishEnrollment(
                a.token,
                c.challengeId,
                MFA_PASSWORD,
                auth.registration(
                  c.options.challenge,
                  realm.origin,
                  realm.rpId,
                ),
              ),
            StaffMfaDenied,
          );
          // Clock expiry is tested with a new bounded row, never rewriting an immutable challenge.
          const f = await enrolled(),
            original = await mfa.beginAuthentication(f.actor.token),
            row = await db.staffMfaChallenge.findUniqueOrThrow({
              where: { id: original.challengeId },
            }),
            expiredId = randomUUID();
          await db.staffMfaChallenge.create({
            data: {
              ...row,
              id: expiredId,
              challengeHash: "b".repeat(64),
              createdAt: new Date(Date.now() - 10000),
              expiresAt: new Date(Date.now() - 1000),
            },
          });
          await assert.rejects(
            () =>
              mfa.finishAuthentication(
                f.actor.token,
                expiredId,
                f.auth.assertion(
                  original.options.challenge,
                  realm.origin,
                  realm.rpId,
                  f.handle,
                ),
              ),
            StaffMfaDenied,
          );
        },
      );
      await t.test(
        "exact session incarnation rejects swapping, reuse and logout",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token);
          const second = randomUUID();
          await pg.query(
            `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour')`,
            [f.actor.userId, createHash("sha256").update(second).digest("hex")],
          );
          const proof = f.auth.assertion(
            c.options.challenge,
            realm.origin,
            realm.rpId,
            f.handle,
          );
          await assert.rejects(
            () => mfa.finishAuthentication(second, c.challengeId, proof),
            StaffMfaDenied,
          );
          const p = await authenticate(f);
          await assert.rejects(
            () =>
              mfa.inspectStaffTrust(second, p.assuranceId).then((r) => {
                if (!r.factorVerified) throw new StaffMfaDenied();
              }),
            StaffMfaDenied,
          );
          await pg.query(`DELETE FROM "AuthSession" WHERE id=$1`, [
            f.actor.sessionId,
          ]);
          await assert.rejects(
            () => mfa.inspectStaffTrust(f.actor.token, p.assuranceId),
            StaffMfaDenied,
          );
          const replacement = randomUUID();
          await pg.query(
            `INSERT INTO "AuthSession" (id,"userId","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,NOW()+interval '1 hour',NOW()+interval '1 second')`,
            [
              f.actor.sessionId,
              f.actor.userId,
              createHash("sha256").update(replacement).digest("hex"),
            ],
          );
          const result = await mfa.inspectStaffTrust(
            replacement,
            p.assuranceId,
          );
          assert.equal(result.factorVerified, false);
        },
      );
      await t.test(
        "aliases and other identities cannot borrow credentials or assurance",
        async () => {
          const f = await enrolled(),
            proof = await authenticate(f),
            alias = await mfaActorFixture(pg, f.actor.personId),
            other = await mfaActorFixture(pg);
          for (const who of [alias, other])
            assert.equal(
              (await mfa.inspectStaffTrust(who.token, proof.assuranceId))
                .factorVerified,
              false,
            );
          await assert.rejects(
            () => mfa.beginAuthentication(alias.token),
            StaffMfaDenied,
          );
        },
      );
      await t.test(
        "grant epochs, suspended/expired accounts and DRAFT/pending records never confer authority",
        async () => {
          const f = await enrolled();
          await draftMfaMembership(pg, f.actor.personId);
          const proof = await authenticate(f);
          assert.equal(
            (await mfa.inspectStaffTrust(f.actor.token, proof.assuranceId))
              .staffAuthorized,
            false,
          );
          await pg.query(
            `UPDATE "StaffAccountAssociation" SET state=state WHERE id=$1`,
            [f.actor.associationId],
          );
          assert.equal(
            (await mfa.inspectStaffTrust(f.actor.token, proof.assuranceId))
              .factorVerified,
            false,
          );
          const g = await enrolled(),
            c = await mfa.beginAuthentication(g.actor.token);
          await pg.query(
            `UPDATE "User" SET "accountStatus"='SUSPENDED' WHERE id=$1`,
            [g.actor.userId],
          );
          await assert.rejects(
            () =>
              mfa.finishAuthentication(
                g.actor.token,
                c.challengeId,
                g.auth.assertion(
                  c.options.challenge,
                  realm.origin,
                  realm.rpId,
                  g.handle,
                ),
              ),
            StaffMfaDenied,
          );
          const x = await enrolled();
          await pg.query(
            `UPDATE "AuthSession" SET "expiresAt"=NOW()-interval '1 second' WHERE id=$1`,
            [x.actor.sessionId],
          );
          await assert.rejects(
            () => mfa.beginAuthentication(x.actor.token),
            StaffMfaDenied,
          );
          assert.equal(
            (
              await pg.query(
                `SELECT count(*)::int n FROM "StaffMembership" WHERE state='ACTIVE'`,
              )
            ).rows[0].n,
            0,
          );
        },
      );
      await t.test(
        "revocation, re-enrollment and secure recovery cannot fall back to password alone",
        async () => {
          const f = await enrolled();
          await assert.rejects(
            () => mfa.beginEnrollment(f.actor.token, MFA_PASSWORD),
            StaffMfaDenied,
          );
          const proof = await authenticate(f);
          await mfa.revokeCredential(
            f.actor.token,
            MFA_PASSWORD,
            proof.assuranceId,
            f.key,
          );
          assert.equal(
            (await mfa.inspectStaffTrust(f.actor.token, proof.assuranceId))
              .factorVerified,
            false,
          );
          await assert.rejects(
            () => mfa.beginAuthentication(f.actor.token),
            StaffMfaDenied,
          );
          await assert.rejects(
            () => mfa.beginEnrollment(f.actor.token, MFA_PASSWORD),
            StaffMfaDenied,
          );
          await assert.rejects(
            () => mfa.recover(f.actor.token),
            StaffMfaDenied,
          );
        },
      );
      await t.test(
        "adding a key requires fresh signed assurance, invalidates old proofs, and history is immutable",
        async () => {
          const f = await enrolled(), proof = await authenticate(f);
          const next = realTestAuthenticator();
          const registration = await mfa.beginEnrollment(f.actor.token, MFA_PASSWORD, proof.assuranceId);
          await mfa.finishEnrollment(f.actor.token, registration.challengeId, MFA_PASSWORD,
            next.registration(registration.options.challenge, realm.origin, realm.rpId), proof.assuranceId);
          assert.equal((await mfa.inspectStaffTrust(f.actor.token, proof.assuranceId)).factorVerified, false);
          const c = await mfa.beginAuthentication(f.actor.token);
          const verified = await mfa.finishAuthentication(f.actor.token, c.challengeId,
            next.assertion(c.options.challenge, realm.origin, realm.rpId, registration.options.user.id));
          assert.equal(verified.factorVerified, true);
          await assert.rejects(() => pg.query(`UPDATE "StaffMfaAssurance" SET "expiresAt"="expiresAt"+interval '1 second' WHERE id=$1`, [verified.assuranceId]));
          await assert.rejects(() => pg.query(`DELETE FROM "StaffMfaEvent" WHERE "associationId"=$1`, [f.actor.associationId]));
          await assert.rejects(() => pg.query(`UPDATE "StaffMfaCredential" SET "associationId"=gen_random_uuid() WHERE id=$1`, [f.key]));
          const expiredId = randomUUID();
          await pg.query(`INSERT INTO "StaffMfaAssurance" (id,"associationId","credentialKey","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion","policyVersion","configHash","assertionDigest","verifiedAt","expiresAt") SELECT $1,"associationId","credentialKey","authSessionId","authSessionCreatedAt","authorizationVersion","mfaVersion","policyVersion","configHash",$2,NOW()-interval '6 minutes',NOW()-interval '2 minutes' FROM "StaffMfaAssurance" WHERE id=$3`,
            [expiredId, createHash("sha256").update(randomUUID()).digest("hex"), verified.assuranceId]);
          assert.equal((await mfa.inspectStaffTrust(f.actor.token, expiredId)).factorVerified, false);
          await assert.rejects(() => mfa.beginEnrollment(f.actor.token, MFA_PASSWORD, expiredId), StaffMfaDenied);
        },
      );
      await t.test(
        "real DB revocation racing a waiting authentication invalidates its epoch",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token),
            proof = f.auth.assertion(
              c.options.challenge,
              realm.origin,
              realm.rpId,
              f.handle,
            ),
            peer = await connectTestDatabase();
          await peer.query("BEGIN");
          try {
            await peer.query(
              `SELECT "associationId" FROM "StaffMfaVersion" WHERE "associationId"=$1 FOR UPDATE`,
              [f.actor.associationId],
            );
            const pending = mfa.finishAuthentication(
              f.actor.token,
              c.challengeId,
              proof,
            );
            const denied = assert.rejects(pending, StaffMfaDenied);
            let observedWait = false;
            for (let attempt = 0; attempt < 100; attempt++) {
              const waiting = await pg.query(`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%StaffMfaVersion%'`);
              if (waiting.rowCount) { observedWait = true; break; }
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
            assert.equal(observedWait, true, "authentication must actually wait on the locked MFA version");
            await peer.query(
              `UPDATE "StaffMfaCredential" SET "revokedAt"=NOW() WHERE id=$1`,
              [f.key],
            );
            await peer.query(
              `UPDATE "StaffMfaVersion" SET version=version+1 WHERE "associationId"=$1`,
              [f.actor.associationId],
            );
            await peer.query("COMMIT");
            await denied;
            assert.equal(
              await db.staffMfaAssurance.count({
                where: { associationId: f.actor.associationId },
              }),
              0,
            );
          } finally {
            await peer.query("ROLLBACK");
            await peer.end();
          }
        },
      );
      await t.test(
        "persisted rate limits survive concurrent incorrect proofs and limit challenge retries",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token),
            proof = f.auth.assertion(
              c.options.challenge,
              realm.origin,
              realm.rpId,
              f.handle,
            );
          proof.response.signature = Buffer.alloc(70).toString("base64url");
          const results = await Promise.allSettled(
            Array.from({ length: 7 }, () =>
              mfa.finishAuthentication(f.actor.token, c.challengeId, proof),
            ),
          );
          assert.ok(results.every((r) => r.status === "rejected"));
          const row = await db.staffMfaChallenge.findUniqueOrThrow({
            where: { id: c.challengeId },
          });
          assert.equal(row.state, "CANCELLED");
          assert.equal(row.attempts, 5);
          await Promise.allSettled(
            Array.from({ length: 11 }, () =>
              mfa.beginAuthentication(f.actor.token),
            ),
          );
          await assert.rejects(
            () => mfa.beginAuthentication(f.actor.token),
            StaffMfaDenied,
          );
        },
      );
      await t.test(
        "audit/database failure cannot release a verified proof and rollback preserves retry integrity",
        async () => {
          const f = await enrolled(),
            c = await mfa.beginAuthentication(f.actor.token),
            proof = f.auth.assertion(
              c.options.challenge,
              realm.origin,
              realm.rpId,
              f.handle,
            );
          await pg.query(
            `CREATE FUNCTION mfa_test_audit_outage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='VERIFIED' THEN RAISE EXCEPTION 'Injected MFA audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER mfa_test_audit_outage BEFORE INSERT ON "StaffMfaEvent" FOR EACH ROW EXECUTE FUNCTION mfa_test_audit_outage()`,
          );
          try {
            await assert.rejects(
              () =>
                mfa.finishAuthentication(f.actor.token, c.challengeId, proof),
              StaffMfaDenied,
            );
          } finally {
            await pg.query(
              `DROP TRIGGER mfa_test_audit_outage ON "StaffMfaEvent"; DROP FUNCTION mfa_test_audit_outage()`,
            );
          }
          assert.equal(
            await db.staffMfaAssurance.count({
              where: { associationId: f.actor.associationId },
            }),
            0,
          );
          assert.equal(
            (
              await db.staffMfaCredential.findUniqueOrThrow({
                where: { id: f.key },
              })
            ).counter,
            BigInt(0),
          );
          assert.equal(
            (
              await db.staffMfaChallenge.findUniqueOrThrow({
                where: { id: c.challengeId },
              })
            ).state,
            "PENDING",
          );
          await mfa.finishAuthentication(f.actor.token, c.challengeId, proof);
        },
      );
      await t.test(
        "browser virtual authenticator completes native WebAuthn and same-origin transport tests",
        async () => {
          await mfaBrowserAcceptance(db, pg);
        },
      );
    } finally {
      await db.$disconnect();
      await pg.end();
    }
  },
);
