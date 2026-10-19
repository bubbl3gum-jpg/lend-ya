import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
const windowMs = 15 * 60 * 1000;
export async function authenticationLimit(
  action: "login" | "register",
  email: string,
): Promise<Response | null> {
  const now = new Date(),
    expiresAt = new Date(now.getTime() + windowMs);
  const key = createHash("sha256").update(`${action}:${email}`).digest("hex");
  // Independent of forwarded IP headers, which callers can spoof without a trusted ingress.
  // Persisted per-account counters survive restarts without coupling unrelated accounts.
  // Distributed traffic limits belong at a trusted ingress, not a caller-exhaustible global bucket.
  const permitted = await prisma.$transaction(async (tx) => {
    await tx.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } });
    const rows = await tx.$queryRaw<Array<{ attempts: number }>>`INSERT INTO "AuthRateLimit" (key,attempts,"expiresAt") VALUES (${key},1,${expiresAt}) ON CONFLICT (key) DO UPDATE SET attempts="AuthRateLimit".attempts+1 RETURNING attempts`;
    return rows[0].attempts <= (action === "login" ? 10 : 5);
  });
  return permitted
    ? null
    : Response.json(
        { error: "Too many authentication attempts. Try again in 15 minutes." },
        {
          status: 429,
          headers: {
            "Retry-After": "900",
            "Cache-Control": "private, no-store",
          },
        },
      );
}
