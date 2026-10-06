import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function ListingsPage() {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      type: true,
      price: true,
      deposit: true,
      condition: true,
      owner: { select: { name: true } },
      supportedStations: { select: { station: { select: { name: true } } } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Marketplace</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Browse listings</h1>
        </div>
        <Link href="/listings/new" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">Create listing</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{listing.type}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{listing.title}</h2>
              </div>
              <span className="text-lg font-semibold text-slate-900">{formatPrice(listing.price)}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{listing.category} · {listing.condition}</p>
            <p className="mt-3 text-sm text-slate-600">{listing.description}</p>
            <p className="mt-4 text-xs text-slate-500">Owner: {listing.owner.name}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              {listing.supportedStations.map(({ station }) => (
                <span key={station.name} className="rounded-full bg-slate-100 px-2 py-1">{station.name}</span>
              ))}
            </div>
            <span className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">View details</span>
          </Link>
        ))}
      </div>
      </div>
    </main>
  );
}
