import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { Pool } from "pg";
import { createStaffWebAuthnFoundation } from "../authorization/mfa/service";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { createOwnedListingRead } from "./read";
import { staffReadPilotConfig } from "./config";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (b: Record<string, unknown>, keys: string[]) =>
  Object.keys(b).every((k) => keys.includes(k));
const password = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 128;
function native(v: unknown, registration: boolean) {
  if (
    !obj(v) ||
    !exact(v, [
      "id",
      "rawId",
      "type",
      "response",
      "clientExtensionResults",
      "authenticatorAttachment",
    ]) ||
    !obj(v.response) ||
    !obj(v.clientExtensionResults) ||
    !exact(v.clientExtensionResults, ["credProps"]) ||
    v.type !== "public-key" ||
    typeof v.id !== "string" ||
    v.rawId !== v.id ||
    v.id.length > 1400
  )
    return false;
  return exact(
    v.response,
    registration
      ? ["clientDataJSON", "attestationObject", "transports"]
      : ["clientDataJSON", "authenticatorData", "signature", "userHandle"],
  );
}
export function staffReadWorkerService(
  mfaDb: PrismaClient,
  readPool: Pool,
  config: ReturnType<typeof staffReadPilotConfig>,
) {
  const mfa = createStaffWebAuthnFoundation(mfaDb, config.realm),
    reads = createOwnedListingRead(readPool, config);
  return async (token: string, body: Record<string, unknown>) => {
    await reads.admission(token);
    switch (body.action) {
      case "enroll.begin":
        if (exact(body, ["action", "password"]) && password(body.password))
          return mfa.beginEnrollment(token, body.password);
        break;
      case "enroll.finish":
        if (
          exact(body, ["action", "password", "challengeId", "response"]) &&
          password(body.password) &&
          uuid(body.challengeId) &&
          native(body.response, true)
        )
          return mfa.finishEnrollment(
            token,
            body.challengeId,
            body.password,
            body.response as unknown as RegistrationResponseJSON,
          );
        break;
      case "verify.begin":
        if (exact(body, ["action"])) return mfa.beginAuthentication(token);
        break;
      case "verify.finish":
        if (
          exact(body, ["action", "challengeId", "response"]) &&
          uuid(body.challengeId) &&
          native(body.response, false)
        ) {
          const proof = await mfa.finishAuthentication(
            token,
            body.challengeId,
            body.response as unknown as AuthenticationResponseJSON,
          );
          const bindingId = await reads.bind(token, proof.assuranceId);
          return { ...proof, bindingId, identity: "OWNED_SYNTHETIC_HUMAN" };
        }
        break;
      case "read":
        if (
          exact(body, ["action", "listingId", "bindingId"]) &&
          uuid(body.bindingId) &&
          typeof body.listingId === "string" &&
          /^[1-9][0-9]{0,9}$/.test(body.listingId) &&
          Number(body.listingId) <= 2147483647
        )
          return reads.read(token, body.bindingId, Number(body.listingId));
        break;
    }
    throw Error("Unsupported pilot command");
  };
}
