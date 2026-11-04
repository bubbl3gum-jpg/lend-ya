import type { BookingStatus } from "@prisma/client";
import Link from "next/link";
import { BookingActions } from "@/components/booking-actions";
import { bookingGroups } from "@/lib/booking-navigation";
import { formatRentalTime } from "@/lib/booking-time";

type Booking = {
  id: number; ownerId: number; renterId: number; status: BookingStatus;
  documentationContextId: string | null;
  startAt: Date; endAt: Date; totalPrice: { toString(): string };
  listing: { title: string }; renter: { name: string };
  meetup: { events: { id: number }[] } | null;
};

/** Server-rendered participant history; the parent query remains authorization-scoped. */
export function ParticipantBookings({ bookings, currentUserId, role }: {
  bookings: Booking[]; currentUserId: number; role: "borrower" | "owner";
}) {
  const owned = bookings.filter(b => (role === "owner" ? b.ownerId : b.renterId) === currentUserId);
  return (
    <section id={role === "borrower" ? "borrowings" : "lending"} aria-labelledby={`${role}-bookings`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-w-0">
      <h2 id={`${role}-bookings`} className="text-xl font-semibold text-slate-900">
        {role === "owner" ? "Bookings as owner" : "My borrowings"}
      </h2>
      {(["active", "history"] as const).map(group => {
        const rows = owned.filter(b => bookingGroups[b.status] === group);
        return (
          <section key={group} id={`${role}-${group}`} aria-labelledby={`${role}-${group}-heading`} className="mt-6 border-t border-slate-200 pt-4">
            <h3 id={`${role}-${group}-heading`} className="font-semibold">
              {group === "active" ? "Active rentals" : "Rental history"} ({rows.length})
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {group === "active" ? "Pending requests, upcoming bookings, custody, returns, and disputes." : "Completed, cancelled, and administrator-closed rentals."}
            </p>
            {rows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">{group === "active" ? "No active rentals." : "No rental history yet."}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {rows.map(booking => (
                  <article key={booking.id} aria-label={`Booking #${booking.id}: ${booking.status}`} className="rounded-2xl border border-slate-200 p-3 break-words">
                    <Link href={`/bookings/${booking.id}`} className="font-medium text-slate-900 underline">
                      {booking.listing.title} · {booking.status}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600">
                      {role === "owner" ? `Owner · Borrower: ${booking.renter.name}` : "Borrower"} · Booking #{booking.id}
                    </p>
                    <p className="text-sm text-slate-600">{formatRentalTime(booking.startAt)} → {formatRentalTime(booking.endAt)}</p>
                    <p className="text-sm font-medium text-slate-700">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(booking.totalPrice.toString()))}
                    </p>
                    {role === "owner" && booking.status === "PENDING" && !booking.documentationContextId ? (
                      <div className="mt-3">
                        <BookingActions bookingId={booking.id} currentUserId={currentUserId} ownerId={booking.ownerId} renterId={booking.renterId} status={booking.status}
                          meetupRequired={!!booking.meetup} automaticMeetup={!!booking.meetup?.events.length} />
                      </div>
                    ) : null}
                    {role === "owner" && booking.status === "PENDING" && booking.documentationContextId ? (
                      <p className="mt-2 text-sm text-slate-600">Review the acknowledged item documentation in booking details before responding.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
