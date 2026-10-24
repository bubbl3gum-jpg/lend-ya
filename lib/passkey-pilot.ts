import "server-only";
import { Client } from "pg";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { adminApi, AdminInputError } from "./admin/auth";
import { apiError, readJsonObject } from "./api-response";
import {
  createStaffWebAuthnFoundation,
  StaffMfaDenied,
} from "./authorization/mfa/service";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { passkeyPilotConfiguration } from "./passkey-pilot-config";

/** No feature flag can bypass development, effective-target or ownership checks. */
export async function ownedPasskeyPilot() {
  const config = passkeyPilotConfiguration();
  const driver = new Client({ connectionString: config.database.toString() });
  if (
    driver.host !== config.database.hostname ||
    driver.port !== Number(config.database.port) ||
    driver.database !== config.database.pathname.slice(1)
  )
    throw new StaffMfaDenied();
  const rows = await prisma.$queryRaw<{ name: string; marker: string }[]>`
    SELECT current_database() AS name, shobj_description(oid,'pg_database') AS marker
    FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== driver.database ||
    rows[0]?.marker !== `hustlen-mrt-test:${config.runId}`
  )
    throw new StaffMfaDenied();
  return config;
}
export async function passkeyPilotAvailable() {
  try {
    await ownedPasskeyPilot();
    return true;
  } catch {
    return false;
  }
}
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const password = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 128;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
function proof(v: unknown, registration: boolean) {
  if (
    !object(v) ||
    !exact(v, [
      "id",
      "rawId",
      "type",
      "response",
      "clientExtensionResults",
      "authenticatorAttachment",
    ]) ||
    typeof v.id !== "string" ||
    !/^[A-Za-z0-9_-]{16,1400}$/.test(v.id) ||
    v.rawId !== v.id ||
    v.type !== "public-key" ||
    !object(v.response) ||
    !object(v.clientExtensionResults) ||
    !exact(v.clientExtensionResults, ["credProps"]) ||
    (v.clientExtensionResults.credProps !== undefined &&
      (!object(v.clientExtensionResults.credProps) ||
        !exact(v.clientExtensionResults.credProps, ["rk"]) ||
        typeof v.clientExtensionResults.credProps.rk !== "boolean")) ||
    (v.authenticatorAttachment !== undefined &&
      !["platform", "cross-platform"].includes(
        v.authenticatorAttachment as string,
      ))
  )
    return false;
  const r = v.response;
  if (
    !exact(
      r,
      registration
        ? ["clientDataJSON", "attestationObject", "transports"]
        : ["clientDataJSON", "authenticatorData", "signature", "userHandle"],
    )
  )
    return false;
  const b64 = (s: unknown, max: number) =>
    typeof s === "string" &&
    s.length > 0 &&
    s.length <= max &&
    /^[A-Za-z0-9_-]+$/.test(s);
  if (!b64(r.clientDataJSON, 6000)) return false;
  return registration
    ? b64(r.attestationObject, 24000) &&
        (r.transports === undefined ||
          (Array.isArray(r.transports) &&
            r.transports.length <= 8 &&
            r.transports.every((t) =>
              [
                "usb",
                "nfc",
                "ble",
                "internal",
                "hybrid",
                "smart-card",
              ].includes(t),
            )))
    : b64(r.authenticatorData, 12000) &&
        b64(r.signature, 3000) &&
        (r.userHandle === undefined ||
          r.userHandle === null ||
          b64(r.userHandle, 128));
}
export async function passkeyPilotRequest(request: Request) {
  let config;
  try {
    config = await ownedPasskeyPilot();
  } catch {
    return apiError("Not found.", 404);
  }
  // Pin origin AND target host to trusted configuration; forwarded headers cannot select a realm.
  const origin = request.headers.get("origin");
  if (
    request.headers.get("host") !== new URL(config.realm.origin).host ||
    (origin !== null && origin !== config.realm.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.method === "POST" &&
      (origin !== config.realm.origin ||
        request.headers.get("content-type") !== "application/json"))
  )
    return apiError("Exact same-origin JSON request required.", 403);
  if (new URL(request.url).search)
    return apiError("Query parameters are not accepted.", 400);
  const response = await adminApi(async () => {
    try {
      const token = (await cookies()).get("p2p_session")?.value;
      if (!token) throw new StaffMfaDenied();
      const service = createStaffWebAuthnFoundation(prisma, config.realm, {
        legacyAdminOnly: true,
      });
      if (request.method === "GET")
        return {
          credentials: await service.listCredentials(token),
          mode: "DEVELOPMENT_PILOT",
          staffAuthorized: false,
          recoveryAvailable: false,
        };
      const body = await readJsonObject(request);
      if (!body || typeof body.action !== "string")
        throw new AdminInputError("Invalid passkey request.");
      const assurance =
        body.assuranceId === undefined || uuid(body.assuranceId);
      switch (body.action) {
        case "enrollment.begin":
          if (
            !exact(body, ["action", "password", "assuranceId"]) ||
            !password(body.password) ||
            !assurance
          )
            break;
          return await service.beginEnrollment(
            token,
            body.password,
            body.assuranceId as string | undefined,
          );
        case "enrollment.finish":
          if (
            !exact(body, [
              "action",
              "challengeId",
              "password",
              "response",
              "assuranceId",
            ]) ||
            !uuid(body.challengeId) ||
            !password(body.password) ||
            !assurance ||
            !proof(body.response, true)
          )
            break;
          return await service.finishEnrollment(
            token,
            body.challengeId,
            body.password,
            body.response as unknown as RegistrationResponseJSON,
            body.assuranceId as string | undefined,
          );
        case "authentication.begin":
          if (!exact(body, ["action"])) break;
          return await service.beginAuthentication(token);
        case "authentication.finish":
          if (
            !exact(body, ["action", "challengeId", "response"]) ||
            !uuid(body.challengeId) ||
            !proof(body.response, false)
          )
            break;
          return await service.finishAuthentication(
            token,
            body.challengeId,
            body.response as unknown as AuthenticationResponseJSON,
          );
        case "challenge.cancel":
          if (
            !exact(body, ["action", "challengeId"]) ||
            !uuid(body.challengeId)
          )
            break;
          return await service.cancelChallenge(token, body.challengeId);
        case "credential.revoke":
          if (
            !exact(body, [
              "action",
              "credentialKey",
              "password",
              "assuranceId",
            ]) ||
            !uuid(body.credentialKey) ||
            !uuid(body.assuranceId) ||
            !password(body.password)
          )
            break;
          return await service.revokeCredential(
            token,
            body.password,
            body.assuranceId,
            body.credentialKey,
          );
      }
      throw new AdminInputError("Invalid or unsupported passkey request.");
    } catch (error) {
      if (error instanceof StaffMfaDenied)
        throw new AdminInputError(
          "Passkey request denied. Check your password, session, verified pilot identity and unexpired factor verification; start a fresh challenge if needed.",
          403,
        );
      throw error;
    }
  });
  return response;
}
