import type { Prisma } from "@prisma/client";
export class MarketplaceRestrictionError extends Error {}
export const restrictionMessage =
  "A participant account is suspended. New marketplace activity is restricted; existing return, inspection and dispute obligations remain available.";
export async function requireActiveAccounts(
  tx: Prisma.TransactionClient,
  ids: number[],
) {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  // Suspension is serialized against new activity; permissions are never taken from stale cookie claims.
  for (const id of sorted) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR SHARE`;
    const user = await tx.user.findUnique({
      where: { id },
      select: { accountStatus: true },
    });
    if (user?.accountStatus !== "ACTIVE")
      throw new MarketplaceRestrictionError(restrictionMessage);
  }
}
