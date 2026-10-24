import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient, StaffMfaEventKind } from "@prisma/client";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { decodeAttestationObject } from "@simplewebauthn/server/helpers";
import { verifyPassword } from "../../auth";
import { POLICY_VERSION } from "../registry";
import { logOperationalError } from "../../operational-error";
import { webAuthnRealm, type WebAuthnRealm } from "./config";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const uuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(s);
export class StaffMfaDenied extends Error {
  constructor() {
    super("MFA verification unavailable or denied");
    this.name = "StaffMfaDenied";
  }
}
type Tx = Prisma.TransactionClient;
async function actor(tx: Tx, token: string, legacyAdminOnly = false) {
  if (typeof token !== "string" || token.length > 256)
    throw new StaffMfaDenied();
  const session = await tx.authSession.findUnique({
    where: { tokenHash: hash(token) },
    include: {
      user: {
        include: {
          staffAssociation: {
            include: { person: { include: { authorization: true } } },
          },
        },
      },
    },
  });
  const link = session?.user.staffAssociation;
  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    session.user.accountStatus !== "ACTIVE" ||
    (legacyAdminOnly && session.user.role !== "ADMIN") ||
    !link ||
    link.state !== "VERIFIED" ||
    link.person.verification !== "VERIFIED" ||
    !link.person.authorization ||
    link.person.authorization.policyVersion !== POLICY_VERSION
  )
    throw new StaffMfaDenied();
  await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE id=${session.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${session.userId} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffAccountAssociation" WHERE id=${link.id}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "StaffPerson" WHERE id=${link.personId}::uuid FOR SHARE`;
  // Atomic initialization also handles two first-page reads in React Strict Mode.
  await tx.$executeRaw`INSERT INTO "StaffMfaVersion" ("associationId",version) VALUES (${link.id}::uuid,1) ON CONFLICT ("associationId") DO NOTHING`;
  await tx.$queryRaw`SELECT "associationId" FROM "StaffMfaVersion" WHERE "associationId"=${link.id}::uuid FOR UPDATE`;
  // READ COMMITTED refresh after waiting for session/revocation/epoch locks.
  const current = await tx.authSession.findUnique({
    where: { id: session.id },
    include: {
      user: {
        include: {
          staffAssociation: {
            include: {
              person: { include: { authorization: true } },
              mfaVersion: true,
            },
          },
        },
      },
    },
  });
  const association = current?.user.staffAssociation;
  if (
    !current ||
    current.createdAt.getTime() !== session.createdAt.getTime() ||
    current.expiresAt.getTime() <= Date.now() ||
    current.user.accountStatus !== "ACTIVE" ||
    (legacyAdminOnly && current.user.role !== "ADMIN") ||
    !association ||
    association.id !== link.id ||
    association.state !== "VERIFIED" ||
    association.person.verification !== "VERIFIED" ||
    !association.person.authorization ||
    !association.mfaVersion ||
    association.person.authorization.policyVersion !== POLICY_VERSION
  )
    throw new StaffMfaDenied();
  return {
    session: current,
    association,
    epoch: association.person.authorization.version,
    mfaVersion: association.mfaVersion.version,
  };
}
type Actor = Awaited<ReturnType<typeof actor>>;
async function budget(tx: Tx, a: Actor, operation: string) {
  const key = hash(`staff-mfa:${a.association.personId}:${operation}`);
  const rows = await tx.$queryRaw<
    { attempts: number }[]
  >`INSERT INTO "StaffMfaRateLimit" (key,attempts,"expiresAt") VALUES (${key},1,clock_timestamp()+interval '15 minutes') ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN "StaffMfaRateLimit"."expiresAt"<=clock_timestamp() THEN 1 ELSE "StaffMfaRateLimit".attempts+1 END,"expiresAt"=CASE WHEN "StaffMfaRateLimit"."expiresAt"<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE "StaffMfaRateLimit"."expiresAt" END RETURNING attempts`;
  if (rows[0].attempts === 11) await audit(tx, a, "DENIED");
  return rows[0].attempts <= 10;
}
async function audit(
  tx: Tx,
  a: Actor,
  kind: StaffMfaEventKind,
  challengeId?: string,
  credentialKey?: string,
) {
  await tx.staffMfaEvent.create({
    data: {
      correlationId: randomUUID(),
      associationId: a.association.id,
      authSessionId: a.session.id,
      authSessionCreatedAt: a.session.createdAt,
      kind,
      challengeId,
      credentialKey,
    },
  });
}
const userHandle = (a: Actor) =>
  Buffer.from(a.association.id.replaceAll("-", ""), "hex");
/** Real cryptographic factor service; deliberately no HTTP route or default RP.
 * Successful assertions never grant staff role/approval/legacy ADMIN access. */
export function createStaffWebAuthnFoundation(
  db: PrismaClient,
  realm: WebAuthnRealm,
  boundary: Readonly<{ legacyAdminOnly?: boolean }> = {},
) {
  const config = webAuthnRealm(realm);
  async function run<T>(token: string, work: (tx: Tx, a: Actor) => Promise<T>) {
    try {
      return await db.$transaction(
        async (tx) => work(tx, await actor(tx, token, boundary.legacyAdminOnly === true)),
        { isolationLevel: "ReadCommitted", timeout: 15000, maxWait: 3000 },
      );
    } catch (error) {
      if (!(error instanceof StaffMfaDenied))
        logOperationalError("staff_mfa", error);
      throw new StaffMfaDenied();
    }
  }
  async function denied(tx: Tx, a: Actor, challengeId?: string) {
    await audit(tx, a, "DENIED", challengeId);
    return null;
  }
  function requireResult<T>(v: T | null): T {
    if (v === null) throw new StaffMfaDenied();
    return v;
  }
  async function validAssurance(tx: Tx, a: Actor, id: string) {
    if (!uuid(id)) return null;
    const p = await tx.staffMfaAssurance.findUnique({
      where: { id },
      include: { credential: true },
    });
    if (p)
      await tx.$queryRaw`SELECT id FROM "StaffMfaCredential" WHERE id=${p.credentialKey}::uuid FOR SHARE`;
    const currentKey = p
      ? await tx.staffMfaCredential.findUnique({
          where: { id: p.credentialKey },
        })
      : null;
    if (
      !p ||
      !currentKey ||
      currentKey.revokedAt ||
      p.associationId !== a.association.id ||
      p.authSessionId !== a.session.id ||
      p.authSessionCreatedAt.getTime() !== a.session.createdAt.getTime() ||
      p.authorizationVersion !== a.epoch ||
      p.mfaVersion !== a.mfaVersion ||
      p.policyVersion !== POLICY_VERSION ||
      p.configHash !== config.configHash ||
      p.assurance !== "WEBAUTHN_UV" ||
      p.expiresAt.getTime() <= Date.now() ||
      p.credential.revokedAt ||
      p.credential.associationId !== a.association.id ||
      p.credential.rpId !== config.rpId
    )
      return null;
    return p;
  }
  async function challenge(
    tx: Tx,
    a: Actor,
    id: string,
    purpose: "ENROLL" | "STEP_UP",
  ) {
    if (!uuid(id)) return null;
    await tx.$queryRaw`SELECT id FROM "StaffMfaChallenge" WHERE id=${id}::uuid FOR UPDATE`;
    const row = await tx.staffMfaChallenge.findUnique({ where: { id } });
    if (
      !row ||
      row.associationId !== a.association.id ||
      row.authSessionId !== a.session.id ||
      row.authSessionCreatedAt.getTime() !== a.session.createdAt.getTime() ||
      row.authorizationVersion !== a.epoch ||
      row.mfaVersion !== a.mfaVersion ||
      row.configHash !== config.configHash ||
      row.purpose !== purpose ||
      row.state !== "PENDING" ||
      row.attempts >= 5 ||
      row.expiresAt.getTime() <= Date.now()
    )
      return null;
    return row;
  }
  function expected(hashValue: string) {
    return (actual: string) => {
      const digest = Buffer.from(hash(actual), "hex"),
        stored = Buffer.from(hashValue, "hex");
      return stored.length === digest.length && timingSafeEqual(stored, digest);
    };
  }
  async function failure(tx: Tx, a: Actor, id: string) {
    const row = await tx.staffMfaChallenge.findUnique({ where: { id } });
    if (row?.state === "PENDING")
      await tx.staffMfaChallenge.update({
        where: { id },
        data: {
          attempts: Math.min(row.attempts + 1, 5),
          ...(row.attempts >= 4 ? { state: "CANCELLED" as const } : {}),
        },
      });
    return denied(tx, a, id);
  }
  async function issue(
    tx: Tx,
    a: Actor,
    purpose: "ENROLL" | "STEP_UP",
    rawChallenge: string,
  ) {
    const createdAt = new Date();
    return tx.staffMfaChallenge.create({
      data: {
        createdAt,
        associationId: a.association.id,
        authSessionId: a.session.id,
        authSessionCreatedAt: a.session.createdAt,
        authorizationVersion: a.epoch,
        mfaVersion: a.mfaVersion,
        challengeHash: hash(rawChallenge),
        configHash: config.configHash,
        purpose,
        expiresAt: new Date(
          Math.min(a.session.expiresAt.getTime(), createdAt.getTime() + 299000),
        ),
      },
    });
  }
  async function recheck(tx: Tx, a: Actor, expectedVersion = a.mfaVersion) {
    const s = await tx.authSession.findUnique({ where: { id: a.session.id } });
    const v = await tx.staffMfaVersion.findUnique({
      where: { associationId: a.association.id },
    });
    if (
      !s ||
      s.createdAt.getTime() !== a.session.createdAt.getTime() ||
      s.expiresAt.getTime() <= Date.now() ||
      !v ||
      v.version !== expectedVersion
    )
      throw new StaffMfaDenied();
  }
  return Object.freeze({
    async listCredentials(token: string) {
      return run(token, async (tx, a) => tx.staffMfaCredential.findMany({
        where: { associationId: a.association.id, rpId: config.rpId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, createdAt: true, revokedAt: true, deviceType: true, backedUp: true },
      }));
    },
    async beginEnrollment(
      token: string,
      password: string,
      assuranceId?: string,
    ) {
      return requireResult(
        await run(token, async (tx, a) => {
          if (!(await budget(tx, a, "enroll"))) return null;
          if (
            typeof password !== "string" ||
            password.length > 128 ||
            !(await verifyPassword(password, a.session.user.passwordHash))
          )
            return denied(tx, a);
          const ever = await tx.staffMfaCredential.count({
            where: { associationId: a.association.id },
          });
          if (
            ever > 0 &&
            (!assuranceId || !(await validAssurance(tx, a, assuranceId)))
          )
            return denied(tx, a);
          const keys = await tx.staffMfaCredential.findMany({
            where: { associationId: a.association.id },
            select: { credentialId: true },
          });
          const options = await generateRegistrationOptions({
            rpName: config.rpName,
            rpID: config.rpId,
            userName: `staff-account-${a.session.userId}`,
            userID: userHandle(a),
            attestationType: "none",
            supportedAlgorithmIDs: [-7, -257],
            authenticatorSelection: {
              userVerification: "required",
              residentKey: "preferred",
            },
            excludeCredentials: keys.map((k) => ({ id: k.credentialId })),
            timeout: 299000,
          });
          const c = await issue(tx, a, "ENROLL", options.challenge);
          await audit(tx, a, "ENROLLMENT_STARTED", c.id);
          return { challengeId: c.id, options };
        }),
      );
    },
    async finishEnrollment(
      token: string,
      id: string,
      password: string,
      response: RegistrationResponseJSON,
      assuranceId?: string,
    ) {
      return requireResult(
        await run(token, async (tx, a) => {
          if (!(await budget(tx, a, "verify-enroll"))) return null;
          const c = await challenge(tx, a, id, "ENROLL");
          if (
            !c ||
            typeof password !== "string" ||
            password.length > 128 ||
            !(await verifyPassword(password, a.session.user.passwordHash))
          )
            return denied(tx, a);
          const ever = await tx.staffMfaCredential.count({
            where: { associationId: a.association.id },
          });
          if (
            ever > 0 &&
            (!assuranceId || !(await validAssurance(tx, a, assuranceId)))
          )
            return failure(tx, a, c.id);
          let verified;
          try {
            if (
              !response?.response ||
              typeof response.response.attestationObject !== "string" ||
              response.response.attestationObject.length > 24000 ||
              response.response.clientDataJSON.length > 6000 ||
              decodeAttestationObject(
                Buffer.from(response.response.attestationObject, "base64url"),
              ).get("fmt") !== "none"
            )
              return failure(tx, a, c.id);
            verified = await verifyRegistrationResponse({
              response,
              expectedChallenge: expected(c.challengeHash),
              expectedOrigin: config.origin,
              expectedRPID: config.rpId,
              requireUserVerification: true,
              requireUserPresence: true,
              supportedAlgorithmIDs: [-7, -257],
            });
          } catch {
            return failure(tx, a, c.id);
          }
          if (!verified.verified || !verified.registrationInfo.userVerified)
            return failure(tx, a, c.id);
          await recheck(tx, a);
          if (c.expiresAt.getTime() <= Date.now()) return failure(tx, a, c.id);
          const info = verified.registrationInfo;
          const key = await tx.staffMfaCredential.create({
            data: {
              associationId: a.association.id,
              credentialId: info.credential.id,
              publicKey: Buffer.from(info.credential.publicKey),
              counter: BigInt(info.credential.counter),
              rpId: config.rpId,
              deviceType: info.credentialDeviceType,
              backedUp: info.credentialBackedUp,
            },
          });
          await tx.staffMfaChallenge.update({
            where: { id: c.id },
            data: { state: "CONSUMED" },
          });
          await tx.staffMfaVersion.update({
            where: { associationId: a.association.id },
            data: { version: { increment: 1 } },
          });
          await audit(tx, a, "ENROLLED", c.id, key.id);
          await recheck(tx, a, a.mfaVersion + BigInt(1));
          return {
            enrolled: true as const,
            staffAuthorized: false as const,
            credentialKey: key.id,
          };
        }),
      );
    },
    async beginAuthentication(token: string) {
      return requireResult(
        await run(token, async (tx, a) => {
          if (!(await budget(tx, a, "authenticate"))) return null;
          const keys = await tx.staffMfaCredential.findMany({
            where: {
              associationId: a.association.id,
              rpId: config.rpId,
              revokedAt: null,
            },
            select: { credentialId: true },
          });
          if (keys.length === 0) return denied(tx, a);
          const options = await generateAuthenticationOptions({
            rpID: config.rpId,
            userVerification: "required",
            allowCredentials: keys.map((k) => ({ id: k.credentialId })),
            timeout: 299000,
          });
          const c = await issue(tx, a, "STEP_UP", options.challenge);
          await audit(tx, a, "AUTHENTICATION_STARTED", c.id);
          return { challengeId: c.id, options };
        }),
      );
    },
    async finishAuthentication(
      token: string,
      id: string,
      response: AuthenticationResponseJSON,
    ) {
      return requireResult(
        await run(token, async (tx, a) => {
          if (!(await budget(tx, a, "verify-authenticate"))) return null;
          const c = await challenge(tx, a, id, "STEP_UP");
          if (!c) return denied(tx, a);
          if (
            !response ||
            typeof response.id !== "string" ||
            response.id.length > 1400
          )
            return failure(tx, a, c.id);
          const key = await tx.staffMfaCredential.findUnique({
            where: { credentialId: response.id },
          });
          if (
            !key ||
            key.associationId !== a.association.id ||
            key.rpId !== config.rpId ||
            key.revokedAt
          )
            return failure(tx, a, c.id);
          await tx.$queryRaw`SELECT id FROM "StaffMfaCredential" WHERE id=${key.id}::uuid FOR UPDATE`;
          const current = await tx.staffMfaCredential.findUniqueOrThrow({
            where: { id: key.id },
          });
          if (current.revokedAt) return failure(tx, a, c.id);
          if (
            response.response?.userHandle &&
            response.response.userHandle !== userHandle(a).toString("base64url")
          )
            return failure(tx, a, c.id);
          let verified;
          try {
            if (
              response.response.authenticatorData.length > 12000 ||
              response.response.clientDataJSON.length > 6000 ||
              response.response.signature.length > 3000
            )
              return failure(tx, a, c.id);
            verified = await verifyAuthenticationResponse({
              response,
              expectedChallenge: expected(c.challengeHash),
              expectedOrigin: config.origin,
              expectedRPID: config.rpId,
              requireUserVerification: true,
              credential: {
                id: current.credentialId,
                publicKey: new Uint8Array(current.publicKey),
                counter: Number(current.counter),
              },
            });
          } catch {
            return failure(tx, a, c.id);
          }
          if (!verified.verified || !verified.authenticationInfo.userVerified)
            return failure(tx, a, c.id);
          await recheck(tx, a);
          if (c.expiresAt.getTime() <= Date.now()) return failure(tx, a, c.id);
          await tx.staffMfaCredential.update({
            where: { id: key.id },
            data: {
              counter: BigInt(verified.authenticationInfo.newCounter),
              backedUp: verified.authenticationInfo.credentialBackedUp,
            },
          });
          await tx.staffMfaChallenge.update({
            where: { id: c.id },
            data: { state: "CONSUMED" },
          });
          const verifiedAt = new Date();
          const proof = await tx.staffMfaAssurance.create({
            data: {
              verifiedAt,
              associationId: a.association.id,
              credentialKey: key.id,
              authSessionId: a.session.id,
              authSessionCreatedAt: a.session.createdAt,
              authorizationVersion: a.epoch,
              mfaVersion: a.mfaVersion,
              policyVersion: POLICY_VERSION,
              configHash: config.configHash,
              assertionDigest: hash(
                JSON.stringify({
                  authenticatorData: response.response.authenticatorData,
                  clientDataJSON: response.response.clientDataJSON,
                  signature: response.response.signature,
                }),
              ),
              expiresAt: new Date(
                Math.min(a.session.expiresAt.getTime(), verifiedAt.getTime() + 299000),
              ),
            },
          });
          await audit(tx, a, "VERIFIED", c.id, key.id);
          await recheck(tx, a);
          if (
            c.expiresAt.getTime() <= Date.now() ||
            proof.expiresAt.getTime() <= Date.now()
          )
            throw new StaffMfaDenied();
          return {
            factorVerified: true as const,
            staffAuthorized: false as const,
            assuranceId: proof.id,
            expiresAt: proof.expiresAt.toISOString(),
          };
        }),
      );
    },
    async cancelChallenge(token: string, id: string) {
      return run(token, async (tx, a) => {
        if (!uuid(id)) throw new StaffMfaDenied();
        const c = await tx.staffMfaChallenge.findUnique({ where: { id } });
        if (
          !c ||
          c.associationId !== a.association.id ||
          c.authSessionId !== a.session.id ||
          c.authSessionCreatedAt.getTime() !== a.session.createdAt.getTime() ||
          c.state !== "PENDING"
        )
          throw new StaffMfaDenied();
        await tx.staffMfaChallenge.update({
          where: { id },
          data: { state: "CANCELLED" },
        });
        await audit(tx, a, "CHALLENGE_CANCELLED", id);
        return { cancelled: true };
      });
    },
    async revokeCredential(
      token: string,
      password: string,
      assuranceId: string,
      credentialKey: string,
    ) {
      return requireResult(
        await run(token, async (tx, a) => {
          if (!(await budget(tx, a, "manage"))) return null;
          if (
            typeof password !== "string" ||
            password.length > 128 ||
            !(await verifyPassword(password, a.session.user.passwordHash)) ||
            !(await validAssurance(tx, a, assuranceId)) ||
            !uuid(credentialKey)
          )
            return denied(tx, a);
          const key = await tx.staffMfaCredential.findUnique({
            where: { id: credentialKey },
          });
          if (!key || key.associationId !== a.association.id || key.revokedAt)
            return denied(tx, a);
          await tx.staffMfaCredential.update({
            where: { id: key.id },
            data: { revokedAt: new Date() },
          });
          await tx.staffMfaVersion.update({
            where: { associationId: a.association.id },
            data: { version: { increment: 1 } },
          });
          await audit(tx, a, "CREDENTIAL_REVOKED", undefined, key.id);
          await recheck(tx, a, a.mfaVersion + BigInt(1));
          return { revoked: true };
        }),
      );
    },
    async inspectStaffTrust(token: string, assuranceId: string) {
      return run(token, async (tx, a) => {
        const proof = await validAssurance(tx, a, assuranceId);
        if (!proof)
          return {
            factorVerified: false,
            staffAuthorized: false as const,
            reason: "MFA_REQUIRED",
          };
        const memberships = await tx.staffMembership.findMany({
          where: { personId: a.association.personId },
          select: {
            state: true,
            policyVersion: true,
            expiresAt: true,
            grants: {
              select: { state: true, policyVersion: true, expiresAt: true },
            },
          },
        });
        await recheck(tx, a);
        if (proof.expiresAt.getTime() <= Date.now())
          return { factorVerified: false, staffAuthorized: false as const, reason: "MFA_REQUIRED" };
        // No live staff context issuer. ACTIVE DB states are prohibited; even an
        // incorrectly relaxed DB cannot turn a verified factor into staff authority.
        return {
          factorVerified: true,
          staffAuthorized: false as const,
          reason: memberships.some((m) => m.state === "ACTIVE")
            ? "STAFF_CUTOVER_NOT_IMPLEMENTED"
            : "STAFF_ACTIVATION_BLOCKED",
        };
      });
    },
    async recover(token: string) {
      await run(token, async (tx, a) => {
        if (!(await budget(tx, a, "recover"))) return null;
        await audit(tx, a, "RECOVERY_BLOCKED");
        return null;
      });
      throw new StaffMfaDenied();
    },
  });
}
