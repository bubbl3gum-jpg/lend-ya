import "server-only";
import { createHash } from "node:crypto";
export type WebAuthnRealm = Readonly<{
  rpId: string;
  origin: string;
  rpName: string;
}>;
/** Explicit server-owned realm only: never derive RP/origin from Host/body.
 * No production domain or mandatory-MFA policy is configured in this batch. */
export function webAuthnRealm(value: WebAuthnRealm) {
  const url = new URL(value.origin);
  if (
    url.origin !== value.origin ||
    url.username ||
    url.password ||
    url.hostname !== value.rpId ||
    !value.rpName ||
    value.rpName.length > 80 ||
    !/^[a-z0-9.-]{1,253}$/.test(value.rpId) ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        value.rpId === "localhost" &&
        process.env.NODE_ENV !== "production")
    )
  )
    throw Error("Explicit approved WebAuthn RP/origin required");
  const configHash = createHash("sha256")
    .update(
      JSON.stringify({
        protocol: "webauthn-uv-v1",
        rpId: value.rpId,
        origin: value.origin,
        algorithms: [-7, -257],
      }),
    )
    .digest("hex");
  return Object.freeze({ ...value, configHash });
}
