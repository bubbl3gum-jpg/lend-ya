import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
const decode = (s: string): ArrayBuffer =>
  Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  ).buffer;
const encode = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
export async function enrollPasskey(
  options: PublicKeyCredentialCreationOptionsJSON,
  signal: AbortSignal,
): Promise<RegistrationResponseJSON> {
  const credential = (await navigator.credentials.create({
    signal,
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      user: { ...options.user, id: decode(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((c) => ({
        ...c,
        id: decode(c.id),
      })),
    } as PublicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;
  if (!credential) throw Error("Passkey enrollment cancelled.");
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: encode(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: encode(response.clientDataJSON),
      attestationObject: encode(response.attestationObject),
      transports:
        response.getTransports() as RegistrationResponseJSON["response"]["transports"],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
export async function verifyPasskey(
  options: PublicKeyCredentialRequestOptionsJSON,
  signal: AbortSignal,
): Promise<AuthenticationResponseJSON> {
  const credential = (await navigator.credentials.get({
    signal,
    publicKey: {
      ...options,
      challenge: decode(options.challenge),
      allowCredentials: options.allowCredentials?.map((c) => ({
        ...c,
        id: decode(c.id),
      })),
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;
  if (!credential) throw Error("Passkey verification cancelled.");
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encode(credential.rawId),
    type: "public-key",
    response: {
      clientDataJSON: encode(response.clientDataJSON),
      authenticatorData: encode(response.authenticatorData),
      signature: encode(response.signature),
      ...(response.userHandle
        ? { userHandle: encode(response.userHandle) }
        : {}),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
