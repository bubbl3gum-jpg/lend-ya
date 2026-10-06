import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingActions } from "@/components/booking-actions";
import { SiteHeader } from "@/components/site-header";
import { parsePathId } from "@/lib/api-validation";
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
  const bookingId = parsePathId(id);
  if (bookingId === null) {
    notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
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
      handoff: {
        select: {
          performedBy: true,
          confirmedBy: true,
          timestamp: true,
          conditionNotes: true,
          conditionConfirmed: true,
        },
      },
      return: {
        select: {
          initiatedBy: true,
          confirmedBy: true,
          timestamp: true,
          confirmedAt: true,
          conditionNotes: true,
          conditionConfirmed: true,
        },
      },
      dispute: {
        select: {
          openedBy: true,
          reason: true,
          description: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }
  if (booking.ownerId !== currentUser.id && booking.renterId !== currentUser.id) {
    notFound();
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

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Handoff and return</h2>
          <div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <p className="font-medium text-slate-900">Pickup handoff</p>
              <p>{booking.handoff ? `Recorded ${formatDate(booking.handoff.timestamp)}` : "Not started"}</p>
              {booking.handoff?.conditionNotes ? <p className="mt-1">{booking.handoff.conditionNotes}</p> : null}
            </div>
            <div>
              <p className="font-medium text-slate-900">Return</p>
              <p>{booking.return ? `Submitted ${formatDate(booking.return.timestamp)}` : "Not started"}</p>
              {booking.return?.conditionNotes ? <p className="mt-1">{booking.return.conditionNotes}</p> : null}
            </div>
          </div>
          {booking.dispute ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-semibold">Dispute: {booking.dispute.reason}</p>
              <p className="mt-1">{booking.dispute.description}</p>
            </div>
          ) : null}
        </section>

        <div className="mt-8">
          <BookingActions
            bookingId={booking.id}
            currentUserId={currentUser.id}
            ownerId={booking.ownerId}
            renterId={booking.renterId}
            status={booking.status}
            handoffPerformerId={booking.handoff?.performedBy}
            hasDispute={Boolean(booking.dispute)}
          />
        </div>
      </div>
      </div>
    </main>
  );
}
