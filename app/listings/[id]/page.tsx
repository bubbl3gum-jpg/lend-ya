import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      type: true,
      price: true,
      deposit: true,
      condition: true,
      status: true,
      owner: { select: { id: true, name: true, email: true } },
      supportedStations: { select: { station: { select: { id: true, code: true, name: true } } } },
    },
  });

  if (!listing) {
    redirect("/listings");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/listings" className="text-sm font-medium text-slate-600">← Back to listings</Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">{listing.type}</p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-900">{listing.title}</h1>
            </div>
            <span className="text-2xl font-semibold text-slate-900">{formatPrice(listing.price)}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">{listing.category}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Condition: {listing.condition}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Status: {listing.status}</span>
          </div>

          <p className="mt-6 text-slate-700">{listing.description}</p>

          {listing.deposit && Number(listing.deposit) > 0 ? (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              Deposit: {formatPrice(listing.deposit)}
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Pickup stations</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.supportedStations.map(({ station }) => (
                <span key={station.id} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">{station.name}</span>
              ))}
            </div>
          </div>
        </article>

        <div>
          {currentUser ? (
            <BookingForm listing={{ id: listing.id, title: listing.title, type: listing.type, supportedStations: listing.supportedStations }} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Login to book</h2>
              <p className="mt-2 text-sm text-slate-600">Create an account or log in to request this listing.</p>
              <div className="mt-4 space-y-3">
                <Link href="/login" className="block rounded-xl bg-slate-900 px-4 py-3 text-center font-medium text-white">Log in</Link>
                <Link href="/register" className="block rounded-xl border border-slate-200 px-4 py-3 text-center font-medium text-slate-900">Register</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </main>
  );
}
