import "server-only";
import { prisma } from "@/lib/prisma";
/** Shared public discovery projection. Fixed predicates; never user identity/evidence. */
export async function getMarketplaceDiscovery(input?: unknown) {
  const where = {
    status: "ACTIVE" as const,
    adminRestricted: false,
    owner: { accountStatus: "ACTIVE" as const },
    media: { some: { kind: "PHOTO" as const } },
  };
  const categories = await prisma.listing.findMany({
    where,
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
    take: 12,
  });
  const category =
    typeof input === "string" && categories.some((c) => c.category === input)
      ? input
      : undefined;
  const listings = await prisma.listing.findMany({
    where: { ...where, ...(category ? { category } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 4,
    select: {
      id: true,
      title: true,
      category: true,
      price: true,
      media: {
        where: { kind: "PHOTO" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 1,
        select: { url: true },
      },
    },
  });
  return { categories, category, listings };
}
