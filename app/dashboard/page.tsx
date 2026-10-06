import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingActions } from "@/components/booking-actions";
import { SiteHeader } from "@/components/site-header";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const listings = await prisma.listing.findMany({
    where: { ownerId: currentUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      price: true,
    },
  });

  const bookings = await prisma.booking.findMany({
    where: { OR: [{ ownerId: currentUser.id }, { renterId: currentUser.id }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ownerId: true,
      renterId: true,
      status: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      listing: { select: { title: true, type: true } },
      owner: { select: { name: true } },
      renter: { select: { name: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">Dashboard</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Welcome, {currentUser.name}</h1>
        </div>
        <Link href="/listings/new" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">New listing</Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">My listings</h2>
          <div className="mt-4 space-y-3">
            {listings.length === 0 ? (
              <p className="text-sm text-slate-600">No listings yet.</p>
            ) : (
              listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{listing.title}</p>
                    <p className="text-sm text-slate-600">{listing.type} · {listing.status}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{formatPrice(listing.price)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">My bookings</h2>
          <div className="mt-4 space-y-3">
            {bookings.length === 0 ? (
              <p className="text-sm text-slate-600">No bookings yet.</p>
            ) : (
              bookings.map((booking) => (
                <Link key={booking.id} href={`/bookings/${booking.id}`} className="block rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{booking.listing.title}</p>
                      <p className="text-sm text-slate-600">{booking.status}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{formatPrice(booking.totalPrice)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Incoming booking requests</h2>
        <div className="mt-4 space-y-4">
          {bookings.filter((booking) => booking.status === "PENDING" && booking.ownerId === currentUser.id).length === 0 ? (
            <p className="text-sm text-slate-600">No pending requests.</p>
          ) : (
            bookings.filter((booking) => booking.status === "PENDING" && booking.ownerId === currentUser.id).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">{booking.listing.title}</p>
                  <p className="text-sm text-slate-600">From {booking.renter.name}</p>
                </div>
                <BookingActions
                  bookingId={booking.id}
                  currentUserId={currentUser.id}
                  ownerId={booking.ownerId}
                  renterId={booking.renterId}
                  status={booking.status}
                />
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </main>
  );
}
