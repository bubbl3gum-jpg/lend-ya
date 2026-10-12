import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { prisma } from "@/lib/prisma";
import { getListingAvailability } from "@/lib/listing-status";
import { SiteHeader } from "@/components/site-header";

export default async function HomePage() {
  const records = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      price: true,
      condition: true,
      media: { where: { kind: "PHOTO" }, orderBy: { createdAt: "asc" }, take: 1, select: { url: true } },
      supportedStations: { select: { station: { select: { name: true } } } },
      bookings: {
        where: { status: { in: ["HANDOFF_PENDING", "IN_USE", "RETURN_PENDING", "INSPECTION", "DISPUTED"] } },
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
    availability: getListingAvailability({ bookings: listing.bookings, openReports: listing.reports }),
    pickupStations: listing.supportedStations.map(({ station }) => station.name),
    photoUrl: listing.media[0]?.url ?? null,
  }));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-18 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Marketplace</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">Rent what you need. Share what you have.</h1>
          <p className="mt-6 max-w-lg text-lg text-slate-600">Find physical items nearby, agree on a pickup station, and rent directly from their owners.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/listings" className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white">Browse listings</Link>
            <Link href="/listings/new" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-900">Create listing</Link>
          </div>
        </div>

        <section aria-labelledby="recent-listings-title">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="recent-listings-title" className="text-xl font-semibold text-slate-900">Recent listings</h2>
            <Link href="/listings" className="text-sm font-medium text-emerald-800 underline underline-offset-4">Browse all</Link>
          </div>
          {listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((listing) => <ListingCard key={listing.id} listing={listing} compact />)}
            </div>
          ) : (
            <p className="border-t border-slate-200 py-6 text-sm text-slate-600">No active item listings yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
