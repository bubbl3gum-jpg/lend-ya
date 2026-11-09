import {
  createHash,
  randomBytes,
} from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
export { hashPassword, verifyPassword } from "@/lib/password";

const sessionCookieName = "p2p_session";
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
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

export async function setSessionCookie(credential: SessionCredential): Promise<void> {
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

export async function createSession(userId: number, verifiedPasswordHash: string): Promise<boolean> {
  const credential = newSessionCredential();
  const created = await prisma.$transaction(async (transaction) => {
    // Recovery takes this same row lock before changing passwords/revoking sessions.
    const [user] = await transaction.$queryRaw<{ passwordHash: string }[]>`
      SELECT "passwordHash" FROM "User" WHERE id = ${userId} FOR UPDATE
    `;
    if (!user || user.passwordHash !== verifiedPasswordHash) return false;
    await persistSession(userId, credential, transaction);
    return true;
  });
  if (!created) return false;
  await setSessionCookie(credential);
  return true;
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  cookieStore.delete(sessionCookieName);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
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
