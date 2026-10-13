import { formatRentalTime } from "@/lib/booking-time";
import { ListingManagement } from "@/components/listing-management";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingActions } from "@/components/booking-actions";
import { SiteHeader } from "@/components/site-header";

function formatPrice(value: string | number | { toString(): string }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value.toString()));
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
      status: true,
      adminRestricted: true,
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
      listing: { select: { title: true } },
      owner: { select: { name: true } },
      renter: { select: { name: true } },
    },
  });

  const reports = await prisma.listingReport.findMany({
    where: {
      OR: [
        { reporterId: currentUser.id },
        { listing: { ownerId: currentUser.id } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      listing: { select: { id: true, title: true } },
    },
  });
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-12">
        {reports.length ? (
          <section className="mb-6 rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Listing reports · latest 50</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {reports.map((report) => (
                <li key={report.id}>
                  #{report.id} · {report.listing.title} · {report.reason} ·{" "}
                  {report.status === "OPEN"
                    ? "Pending administrator review"
                    : report.status === "REVIEWED"
                      ? "Resolved · upheld"
                      : "Resolved · dismissed"}{" "}
                  · {formatRentalTime(report.resolvedAt ?? report.createdAt)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
              Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">
              Welcome, {currentUser.name}
            </h1>
          </div>
          <Link
            href="/listings/new"
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            New listing
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-2xl bg-emerald-50 p-5">
          <Link href="/account">Account settings</Link>
          <Link href={`/profile/${currentUser.id}`}>
            My public trust profile
          </Link>
          <Link href="/account/verification">
            Trustworthiness &amp; verification
          </Link>
          <Link href="/account/activity">Activity logs</Link>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <section
            id="listings"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">
              My listings
            </h2>
            <div className="mt-4 space-y-3">
              {listings.length === 0 ? (
                <p className="text-sm text-slate-600">No listings yet.</p>
              ) : (
                listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-3"
                  >
                    <div>
                      <Link
                        href={`/listings/${listing.id}`}
                        className="font-medium text-slate-900 underline"
                      >
                        {listing.title}
                      </Link>
                      <ListingManagement
                        id={listing.id}
                        title={listing.title}
                      />
                      <p className="text-sm text-slate-600">
                        {listing.status}
                        {listing.adminRestricted
                          ? " · Restricted by administration"
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatPrice(listing.price)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2
              id="borrowings"
              className="text-xl font-semibold text-slate-900"
            >
              My borrowings
            </h2>
            <div className="mt-4 space-y-3">
              {bookings.filter((booking) => booking.renterId === currentUser.id)
                .length === 0 ? (
                <p className="text-sm text-slate-600">No bookings yet.</p>
              ) : (
                bookings
                  .filter((booking) => booking.renterId === currentUser.id)
                  .map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="block rounded-2xl border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">
                            {booking.listing.title} · Borrower
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatRentalTime(booking.startAt)} →{" "}
                            {formatRentalTime(booking.endAt)}
                          </p>
                          <p className="text-sm text-slate-600">
                            {[
                              "COMPLETED",
                              "CANCELLED",
                              "ADMIN_CLOSED",
                            ].includes(booking.status)
                              ? "Historical"
                              : booking.status === "PENDING"
                                ? "Pending request"
                                : booking.status === "CONFIRMED"
                                  ? "Upcoming"
                                  : "Active rental"}{" "}
                            · {booking.status}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {formatPrice(booking.totalPrice)}
                        </span>
                      </div>
                    </Link>
                  ))
              )}
            </div>
          </section>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Bookings as owner
          </h2>
          <div className="mt-4 space-y-4">
            {bookings.filter((booking) => booking.ownerId === currentUser.id)
              .length === 0 ? (
              <p className="text-sm text-slate-600">
                No bookings as owner yet.
              </p>
            ) : (
              bookings
                .filter((booking) => booking.ownerId === currentUser.id)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-medium underline"
                      >
                        {booking.listing.title} · {booking.status}
                      </Link>
                      <p className="text-sm text-slate-600">
                        Owner · Borrower: {booking.renter.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {formatRentalTime(booking.startAt)} →{" "}
                        {formatRentalTime(booking.endAt)}
                      </p>
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
