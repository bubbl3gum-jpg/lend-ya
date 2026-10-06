import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingActions } from "@/components/booking-actions";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value.toString()));
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      ownerId: true,
      renterId: true,
      status: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      deposit: true,
      notes: true,
      listing: {
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          price: true,
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      renter: { select: { id: true, name: true, email: true } },
      meetingStation: { select: { code: true, name: true } },
    },
  });

  if (!booking) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600">← Back to dashboard</Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Booking</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{booking.listing.title}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{booking.status}</span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Dates</p>
              <p>{formatDate(booking.startAt)} → {formatDate(booking.endAt)}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Meeting station</p>
              <p>{booking.meetingStation.code} · {booking.meetingStation.name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Total price</p>
              <p>{formatPrice(booking.totalPrice)}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Deposit</p>
              <p>{booking.deposit ? formatPrice(booking.deposit) : "$0.00"}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Owner</p>
              <p>{booking.owner.name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Renter</p>
              <p>{booking.renter.name}</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Notes</p>
              <p>{booking.notes || "No notes provided."}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <BookingActions
            bookingId={booking.id}
            currentUserId={currentUser.id}
            ownerId={booking.ownerId}
            renterId={booking.renterId}
            status={booking.status}
            listingType={booking.listing.type}
          />
        </div>
      </div>
      </div>
    </main>
  );
}
