import { createHash, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { hashPassword } from "../../lib/auth";
import { POLICY_VERSION } from "../../lib/authorization/registry";
export const MFA_PASSWORD = "Fixture-mfa-password-93!";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function mfaActorFixture(pg: Client, existingPerson?: string) {
  const personId = existingPerson ?? randomUUID(),
    associationId = randomUUID(),
    token = randomUUID();
  const userId = (
    await pg.query(
      `INSERT INTO "User" (name,email,"passwordHash","updatedAt") VALUES ('MFA fixture account',$1,$2,NOW()) RETURNING id`,
      [randomUUID() + "@fixture.test", await hashPassword(MFA_PASSWORD)],
    )
  ).rows[0].id;
  if (!existingPerson)
    await pg.query(
      `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
      [personId, hash(personId), randomUUID()],
    );
  await pg.query(
    `INSERT INTO "StaffAccountAssociation" (id,"personId","userId",state,"provenanceRef","verifiedAt") VALUES ($1,$2,$3,'VERIFIED',$4,NOW())`,
    [associationId, personId, userId, randomUUID()],
  );
  const sessionId = (
    await pg.query(
      `INSERT INTO "AuthSession" ("userId","tokenHash","expiresAt") VALUES ($1,$2,NOW()+interval '1 hour') RETURNING id`,
      [userId, hash(token)],
    )
  ).rows[0].id;
  return { personId, associationId, token, userId, sessionId };
}
export async function draftMfaMembership(pg: Client, personId: string) {
  const issuer = randomUUID();
  await pg.query(
    `INSERT INTO "StaffPerson" (id,verification,"verificationSubjectHash","verificationRef","verifiedAt") VALUES ($1,'VERIFIED',$2,$3,NOW())`,
    [issuer, hash(issuer), randomUUID()],
  );
  await pg.query(
    `INSERT INTO "StaffMembership" (id,"personId",role,"proposedByPersonId","provenanceRef","policyVersion","validFrom","expiresAt") VALUES ($1,$2,'SUPER_ADMIN',$3,$4,$5,NOW(),NOW()+interval '1 day')`,
    [randomUUID(), personId, issuer, randomUUID(), POLICY_VERSION],
  );
}
