import Link from "next/link";
import { readLocale } from "@/lib/i18n/server";
import { HeritageSurface } from "@/components/heritage/experience";
import { readAppearance } from "@/lib/heritage/appearance";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { ListingsBrowser } from "@/components/listings-browser";
import { getListingAvailability } from "@/lib/listing-status";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const records = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      adminRestricted: false,
      owner: { accountStatus: "ACTIVE" },
      media: { some: { kind: "PHOTO" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      condition: true,
      media: {
        where: { kind: "PHOTO" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { url: true },
      },
      supportedStations: { select: { station: { select: { name: true } } } },
      bookings: {
        where: {
          status: {
            in: [
              "HANDOFF_PENDING",
              "IN_USE",
              "RETURN_PENDING",
              "INSPECTION",
              "DISPUTED",
            ],
          },
        },
        select: { status: true },
      },
      reports: { where: { status: "OPEN" }, select: { id: true }, take: 1 },
    },
  });
  const listings = records.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
    price: listing.price.toString(),
    availability: getListingAvailability({
      bookings: listing.bookings,
      openReports: listing.reports,
    }),
    pickupStations: listing.supportedStations.map(
      ({ station }) => station.name,
    ),
    photoUrl: listing.media[0]?.url ?? null,
  }));
  const categories = [
    ...new Set(listings.map((listing) => listing.category)),
  ].sort();
  const stations = [
    ...new Set(listings.flatMap((listing) => listing.pickupStations)),
  ].sort();

  const requestedCategory = (await searchParams).category;
  const initialCategory =
    typeof requestedCategory === "string" &&
    categories.includes(requestedCategory)
      ? requestedCategory
      : "ALL";
  return (
    <HeritageSurface
      initialTheme={await readAppearance()}
      initialLocale={await readLocale()}
    >
      <main className="heritage-browse" lang="en">
        <SiteHeader catalogue />
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
                Marketplace
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">
                Browse listings
              </h1>
            </div>
            <Link
              href="/listings/new"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Create listing
            </Link>
          </div>

          <ListingsBrowser
            key={initialCategory}
            initialCategory={initialCategory}
            listings={listings}
            categories={categories}
            stations={stations}
          />
        </div>
      </main>
    </HeritageSurface>
  );
}
