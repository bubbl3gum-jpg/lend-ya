import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/data";
import { AdminTitle, AdminPanel, adminDate } from "@/components/admin/ui";
export default async function Overview() {
  await requireAdminPage();
  const data = await getAdminOverview();
  const dashboard = data.dashboard;
  const metrics = [
    [
      "Active rentals",
      dashboard.activeRentals,
      "Bookings in IN_USE: pickup confirmed; return not yet submitted.",
    ],
    [
      "Active users",
      dashboard.activeUsers,
      "Accounts with ACTIVE status, including administrators. Not online activity.",
    ],
    [
      "Open cases",
      dashboard.openCases,
      "Open listing reports and rental disputes. Chat reviews are separate.",
    ],
    [
      "Needs attention",
      dashboard.needsAttention,
      "Distinct listings and bookings with open cases; each record counted once.",
    ],
  ] as const;
  return (
    <>
      <AdminTitle
        title="Overview"
        description="Welcome to the Hustlen’ Control Center. Monitor current rentals and review the queues covered by your existing administrator access."
      />
      <section
        aria-label="Platform overview metrics"
        className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(([label, value, definition]) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-medium text-slate-600">{label}</h2>
            <p
              data-stat={label}
              className="my-3 text-4xl font-semibold tracking-tight"
            >
              {value.toLocaleString("en-US")}
            </p>
            <p className="text-xs leading-5 text-slate-500">{definition}</p>
          </article>
        ))}
      </section>
      <section
        aria-labelledby="attention-heading"
        className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-800">
              Operational overview
            </p>
            <h2 id="attention-heading" className="text-xl font-semibold">
              Requires Attention
            </h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-medium">
            {dashboard.needsAttention} affected records
          </span>
        </div>
        <p className="mb-5 max-w-3xl text-sm leading-6 text-slate-700">
          {dashboard.openCases
            ? "Open cases are ready for investigation through the existing review workflows."
            : "No open listing reports or rental disputes. These review queues are clear."}{" "}
          Pending booking requests remain with the owner and are not
          administrator tasks.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              "Listing reports",
              dashboard.openReports,
              `${dashboard.reportedListings} distinct listings`,
              "/admin/reports?status=OPEN",
            ],
            [
              "Rental disputes",
              dashboard.openDisputes,
              `${dashboard.disputedBookings} distinct bookings`,
              "/admin/disputes?status=OPEN",
            ],
          ].map(([label, count, detail, href]) => (
            <Link
              key={label}
              href={String(href)}
              className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 hover:border-amber-400"
            >
              <div>
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {detail} · Review open cases →
                </p>
              </div>
              <span className="text-2xl font-semibold">{count}</span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-600">
          Chat moderation retains its separate reviewer authorization. Case
          messages, evidence and investigation notes are not shown here.
        </p>
      </section>
      <div className="mb-8">
        <AdminPanel title="Platform activity">
          <p className="mb-4 text-sm text-slate-500">
            Latest recorded administrative actions. Metadata only; the audit log
            preserves the full authorized record.
          </p>
          {dashboard.activity.length ? (
            <ol className="divide-y divide-slate-100">
              {dashboard.activity.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {event.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.targetType.replaceAll("_", " ")} #{event.targetId}
                    </p>
                  </div>
                  <time
                    dateTime={event.createdAt.toISOString()}
                    className="text-xs text-slate-500"
                  >
                    {adminDate(event.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              No administrative activity has been recorded yet.
            </p>
          )}
          <Link
            href="/admin/audit-logs"
            className="mt-4 inline-block text-sm font-semibold text-emerald-800 underline underline-offset-4"
          >
            View audit logs →
          </Link>
        </AdminPanel>
      </div>
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
