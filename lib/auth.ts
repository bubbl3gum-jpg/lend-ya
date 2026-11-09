import { createHash, randomBytes } from "node:crypto";
export { hashPassword, verifyPassword } from "./password";
import { lockPasswordAccount } from "./password-account";
export { lockPasswordAccount } from "./password-account";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "p2p_session";
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  accountStatus: true,
  verificationStatus: true,
  createdAt: true,
} as const;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionCredential = {
  token: string;
  expiresAt: Date;
};

export function newSessionCredential(): SessionCredential {
  return {
    token: randomBytes(32).toString("base64url"),
    expiresAt: new Date(Date.now() + sessionLifetimeSeconds * 1000),
  };
}

export async function persistSession(
  userId: number,
  credential: SessionCredential,
  client: Pick<Prisma.TransactionClient, "authSession"> = prisma,
): Promise<void> {
  await client.authSession.create({
    data: {
      tokenHash: hashSessionToken(credential.token),
      userId,
      expiresAt: credential.expiresAt,
    },
  });
}

export async function setSessionCookie(
  credential: SessionCredential,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, credential.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: credential.expiresAt,
    maxAge: sessionLifetimeSeconds,
  });
}

export class CredentialChangedError extends Error {
  constructor() {
    super("Credentials changed; sign in again.");
  }
}
export async function persistVerifiedSession(
  userId: number,
  verifiedHash: string,
  credential: SessionCredential,
  db = prisma,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await lockPasswordAccount(tx, userId);
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!current || current.passwordHash !== verifiedHash)
      throw new CredentialChangedError();
    await persistSession(userId, credential, tx);
  });
}
export async function createSession(
  userId: number,
  verifiedHash: string,
): Promise<void> {
  const credential = newSessionCredential();
  await persistVerifiedSession(userId, verifiedHash, credential);
  await setSessionCookie(credential);
}

/** Cookie-only cleanup after a transaction has already revoked all sessions. */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  await clearSessionCookie();
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: { select: safeUserSelect },
    },
  });

  if (!session) {
    return null;
  }
  if (session.expiresAt <= new Date()) {
    await prisma.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
}
