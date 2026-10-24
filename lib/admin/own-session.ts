import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export type OwnAdminSessionSummary = {
  status: "AUTHENTICATED";
  createdAt: string;
  expiresAt: string;
  passkeyStatus: "UNAVAILABLE";
};

/** No selectors or caller-supplied identity. This read never renews/deletes a session.
 * Passkey records are deliberately outside this production-safe projection. */
export async function readOwnAdminSession(): Promise<
  | { ok: true; summary: OwnAdminSessionSummary }
  | { ok: false; status: 401 | 403 }
> {
  const token = (await cookies()).get("p2p_session")?.value;
  if (!token) return { ok: false, status: 401 };
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    select: {
      createdAt: true,
      expiresAt: true,
      user: { select: { role: true, accountStatus: true } },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now())
    return { ok: false, status: 401 };
  if (session.user.role !== "ADMIN" || session.user.accountStatus !== "ACTIVE")
    return { ok: false, status: 403 };
  return {
    ok: true,
    summary: {
      status: "AUTHENTICATED",
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      passkeyStatus: "UNAVAILABLE",
    },
  };
}
