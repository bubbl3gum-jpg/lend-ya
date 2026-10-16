import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/data";
import { AdminTitle, AdminPanel, adminDate } from "@/components/admin/ui";
export default async function Overview() {
  await requireAdminPage();
  const data = await getAdminOverview();
  const sections = [
    [
      "Users",
      [
        ["Total registered users", data.users.total],
        ["New users · last 30 days", data.users.newLast30Days],
        ["Administrators", data.users.admins],
      ],
    ],
    [
      "Listings",
      [
        ["Total listings", data.listings.total],
        ["Active listings", data.listings.active],
        ["Inactive listings", data.listings.inactive],
        ["Listings with open reports", data.listings.withOpenReports],
      ],
    ],
    [
      "Bookings",
      [
        ["Total bookings", data.bookings.total],
        ["Pending bookings", data.bookings.pending],
        ["Confirmed bookings", data.bookings.confirmed],
        ["Active rentals", data.bookings.activeRentals],
        ["Completed bookings", data.bookings.completed],
        ["Cancelled bookings", data.bookings.cancelled],
        ["Disputed bookings", data.bookings.disputed],
        ["Administrative closures", data.bookings.byStatus.ADMIN_CLOSED ?? 0],
      ],
    ],
  ] as const;
  return (
    <>
      <AdminTitle
        title="Platform overview"
        description="Current platform records. New users means registration in the last 30 elapsed days. Active rentals include handoff pending, in use, return pending and inspection; disputes are counted separately."
      />
      {sections.map(([title, cards]) => (
        <section key={title} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p data-stat={label} className="mt-3 text-3xl font-semibold">
                  {value.toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
      <h2 className="mb-2 text-lg font-semibold">Recent records</h2>
      <p className="mb-4 text-sm text-slate-500">
        Latest registrations, listings and booking requests. This is not an
        audit log.
      </p>
      <div className="grid gap-4 xl:grid-cols-3">
        <AdminPanel title="Recently registered users">
          {data.recent.users.length ? (
            <ul className="space-y-3">
              {data.recent.users.map((user) => (
                <li key={user.id}>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-sm font-medium text-emerald-800"
                  >
                    {user.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {adminDate(user.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No registered users.</p>
          )}
        </AdminPanel>
        <AdminPanel title="Recently created listings">
          {data.recent.listings.length ? (
            <ul className="space-y-3">
              {data.recent.listings.map((listing) => (
                <li key={listing.id}>
                  <Link
                    href={`/admin/listings/${listing.id}`}
                    className="text-sm font-medium text-emerald-800"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {adminDate(listing.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No listings yet.</p>
          )}
        </AdminPanel>
        <AdminPanel title="Recent booking requests">
          {data.recent.bookings.length ? (
            <ul className="space-y-3">
              {data.recent.bookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="text-sm font-medium text-emerald-800"
                  >
                    #{booking.id} · {booking.listing.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {booking.status} · {adminDate(booking.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No bookings yet.</p>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
