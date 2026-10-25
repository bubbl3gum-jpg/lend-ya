import "server-only";
import { setSessionCookie } from "../auth";
import { ownedSupportRuntime, staffWorkerCommand } from "./bridge";
/** Candidate only: ordinary runtime cannot mint or replace AuthSession rows. */
export async function createOwnedSupportSession(
  email: string,
  password: string,
) {
  const c = await ownedSupportRuntime();
  const result = (await staffWorkerCommand(
    "",
    { action: "login", email, password },
    c,
  )) as { token?: unknown; expiresAt?: unknown };
  if (
    typeof result.token !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(result.token) ||
    typeof result.expiresAt !== "string"
  )
    throw Error("Session issuance unavailable");
  const expiresAt = new Date(result.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())
    throw Error("Invalid session expiry");
  await setSessionCookie({ token: result.token, expiresAt });
}
