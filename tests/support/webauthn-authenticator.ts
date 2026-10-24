/** Generates real ES256 assertions. No verifier is mocked and no private key is persisted. */
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
const sha = (data: string | Buffer) =>
  createHash("sha256").update(data).digest();
const b64 = (x: Uint8Array) => Buffer.from(x).toString("base64url");
export function realTestAuthenticator() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    }),
    jwk = publicKey.export({ format: "jwk" }),
    credentialId = randomBytes(32),
    id = b64(credentialId);
  const cose = new Map<number, number | Uint8Array>([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, Buffer.from(jwk.x!, "base64url")],
    [-3, Buffer.from(jwk.y!, "base64url")],
  ]);
  let counter = 0;
  return {
    id,
    registration(
      challenge: string,
      origin: string,
      rpId: string,
    ): RegistrationResponseJSON {
      const data = Buffer.from(
        JSON.stringify({
          type: "webauthn.create",
          challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const count = Buffer.alloc(4),
        length = Buffer.alloc(2);
      length.writeUInt16BE(credentialId.length);
      const authData = Buffer.concat([
        sha(rpId),
        Buffer.from([0x45]),
        count,
        Buffer.alloc(16),
        length,
        credentialId,
        Buffer.from(isoCBOR.encode(cose)),
      ]);
      const att = isoCBOR.encode(
        new Map<string, unknown>([
          ["fmt", "none"],
          ["attStmt", new Map()],
          ["authData", authData],
        ]) as Parameters<typeof isoCBOR.encode>[0],
      );
      return {
        id,
        rawId: id,
        type: "public-key",
        response: {
          clientDataJSON: b64(data),
          attestationObject: b64(att),
          transports: ["internal"],
        },
        clientExtensionResults: {},
        authenticatorAttachment: "platform",
      };
    },
    assertion(
      challenge: string,
      origin: string,
      rpId: string,
      userHandle?: string,
      options: { verified?: boolean; counter?: number } = {},
    ): AuthenticationResponseJSON {
      counter = options.counter ?? counter + 1;
      const clientData = Buffer.from(
        JSON.stringify({
          type: "webauthn.get",
          challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const count = Buffer.alloc(4);
      count.writeUInt32BE(counter);
      const authData = Buffer.concat([
        sha(rpId),
        Buffer.from([options.verified === false ? 0x01 : 0x05]),
        count,
      ]);
      const signature = sign(
        "sha256",
        Buffer.concat([authData, sha(clientData)]),
        privateKey,
      );
      return {
        id,
        rawId: id,
        type: "public-key",
        response: {
          clientDataJSON: b64(clientData),
          authenticatorData: b64(authData),
          signature: b64(signature),
          userHandle,
        },
        clientExtensionResults: {},
        authenticatorAttachment: "platform",
      };
    },
  };
}
