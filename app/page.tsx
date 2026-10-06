import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 3,
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
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-18 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Marketplace</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">Rent what you need. Share what you have.</h1>
          <p className="mt-6 max-w-lg text-lg text-slate-600">Book trusted rentals and services across the city using simple meeting-station pickups and clear request flows.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/listings" className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white">Browse listings</Link>
            <Link href="/listings/new" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-900">Create listing</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">
            <p className="font-semibold">Demo flow</p>
            <p className="mt-2">Browse → request → owner accepts → pickup → use → return → complete.</p>
          </div>
          <div className="mt-6 space-y-4">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{listing.type}</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{listing.title}</h2>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">{formatPrice(listing.price)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{listing.category} · {listing.condition}</p>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{listing.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
