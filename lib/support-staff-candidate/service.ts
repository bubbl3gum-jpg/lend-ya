import "server-only";
import type { Pool } from "pg";
import type { PrismaClient } from "@prisma/client";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { createStaffWebAuthnFoundation } from "../authorization/mfa/service";
import { supportCommand } from "./commands";
import { assertSupportOwnership, supportStaffConfig } from "./config";
import { newSessionCredential, persistSession, verifyPassword } from "../auth";
import { parseEmail, parsePassword } from "../api-validation";
import { logOperationalError } from "../operational-error";
/** Restricted principal has only these entry points; no table SELECT or audit INSERT. */
export function scopedSupportService(
  pool: Pool,
  kind: "staff" | "requester",
  config: ReturnType<typeof supportStaffConfig>,
) {
  return async (token: string, body: unknown) => {
    const current = supportStaffConfig();
    if (
      current.runId !== config.runId ||
      current.origin !== config.origin ||
      current.database.pathname !== config.database.pathname
    )
      throw Error("Candidate unavailable");
    const command = supportCommand(body, kind),
      db = await pool.connect();
    try {
      await assertSupportOwnership(db, config);
      await db.query("BEGIN");
      await db.query(
        "SET LOCAL lock_timeout='500ms'; SET LOCAL statement_timeout='2000ms'",
      );
      const fn = kind === "staff" ? "staff_request" : "requester_request";
      const result = await db.query(
        `SELECT hustlen_support_candidate.${fn}($1,$2::jsonb) result`,
        [token, JSON.stringify(command)],
      );
      await db.query("COMMIT"); // Includes deferred reply/audit integrity before disclosure.
      return result.rows[0].result;
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      logOperationalError("support_candidate.scoped_denial", error);
      throw new Error("Scoped Support access denied or unavailable.", {
        cause: error,
      });
    } finally {
      db.release();
    }
  };
}
export function supportWorkerService(
  mfaDb: PrismaClient,
  pool: Pool,
  config: ReturnType<typeof supportStaffConfig>,
) {
  const mfa = createStaffWebAuthnFoundation(mfaDb, config.realm),
    read = scopedSupportService(pool, "staff", config);
  return async (token: string, input: unknown) => {
    if (
      input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      (input as Record<string, unknown>).action === "login"
    ) {
      const raw = input as Record<string, unknown>;
      if (
        Object.keys(raw).some(
          (k) => !["action", "email", "password"].includes(k),
        )
      )
        throw Error("Closed login required");
      const email = parseEmail(raw.email),
        password = parsePassword(raw.password, 1);
      if (!email || !password) throw Error("Invalid login");
      await assertSupportOwnership(pool, config);
      await pool.query("SELECT hustlen_support_candidate.login_ready()");
      const user = await mfaDb.user.findUnique({
        where: { email },
        select: { id: true, passwordHash: true, accountStatus: true },
      });
      const valid = await verifyPassword(
        password,
        user?.passwordHash ??
          `scrypt$unregistered-account${"$"}${"0".repeat(128)}`,
      );
      if (!user || !valid || user.accountStatus !== "ACTIVE")
        throw Error("Invalid login");
      const credential = newSessionCredential();
      await persistSession(user.id, credential, mfaDb);
      return {
        token: credential.token,
        expiresAt: credential.expiresAt.toISOString(),
      };
    }
    const b = supportCommand(input, "staff");
    await assertSupportOwnership(pool, config);
    if (
      [
        "admit",
        "enroll.begin",
        "enroll.finish",
        "verify.begin",
        "verify.finish",
      ].includes(b.action)
    ) {
      await pool.query("SELECT hustlen_support_candidate.admit($1)", [token]);
      switch (b.action) {
        case "admit":
          return {
            identity: "OWNED_SYNTHETIC_SUPPORT",
            productionStaffAuthorized: false,
          };
        case "enroll.begin":
          return mfa.beginEnrollment(token, b.password as string);
        case "enroll.finish":
          return mfa.finishEnrollment(
            token,
            b.challengeId as string,
            b.password as string,
            b.response as RegistrationResponseJSON,
          );
        case "verify.begin":
          return mfa.beginAuthentication(token);
        case "verify.finish": {
          const proof = await mfa.finishAuthentication(
            token,
            b.challengeId as string,
            b.response as AuthenticationResponseJSON,
          );
          await pool.query(
            "SELECT hustlen_support_candidate.bind($1,$2::uuid)",
            [token, proof.assuranceId],
          );
          return {
            factorVerified: proof.factorVerified,
            staffAuthorized: false,
            identity: "OWNED_SYNTHETIC_SUPPORT",
          };
        }
      }
    }
    return read(token, b);
  };
}
