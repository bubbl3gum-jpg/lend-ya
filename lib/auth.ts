import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "p2p_session";
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
const passwordKeyLength = 64;

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  verificationStatus: true,
  createdAt: true,
} as const;

function derivePasswordKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, passwordKeyLength, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key as Buffer);
      }
    });
  });
}

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

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePasswordKey(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [algorithm, salt, expectedKeyHex] = passwordHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !expectedKeyHex ||
    !/^[a-f\d]{128}$/i.test(expectedKeyHex)
  ) {
    return false;
  }

  const expectedKey = Buffer.from(expectedKeyHex, "hex");
  const actualKey = await derivePasswordKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

export async function createSession(userId: number): Promise<void> {
  const credential = newSessionCredential();
  await persistSession(userId, credential);
  await setSessionCookie(credential);
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