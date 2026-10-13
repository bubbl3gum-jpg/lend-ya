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
  // Persisted counters remain effective across workers and application restarts.
  const permitted = await prisma.$transaction(async (tx) => {
    await tx.authRateLimit.deleteMany({ where: { expiresAt: { lte: now } } });
    for (const [bucket, limit] of [
      [`${action}:global`, 1000],
      [key, action === "login" ? 10 : 5],
    ] as const) {
      const rows = await tx.$queryRaw<
        Array<{ attempts: number }>
      >`INSERT INTO "AuthRateLimit" (key,attempts,"expiresAt") VALUES (${bucket},1,${expiresAt}) ON CONFLICT (key) DO UPDATE SET attempts="AuthRateLimit".attempts+1 RETURNING attempts`;
      if (rows[0].attempts > limit) return false;
    }
    return true;
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
