import Link from "next/link";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import {
  getOperationsWorkbench,
  workbenchCategories,
  workbenchReasons,
  type WorkbenchCategory,
} from "@/lib/admin/workbench";
import { toSearchParams, type SearchParams } from "@/lib/admin/query";
import {
  AdminTitle,
  AdminPanel,
  AdminTable,
  StatusBadge,
  adminDate,
} from "@/components/admin/ui";
import { logOperationalError } from "@/lib/operational-error";
export const dynamic = "force-dynamic";
export const metadata = { title: "Operations workbench · Hustlen’ Admin" };

export default async function Workbench({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  let data;
  try {
    data = await getOperationsWorkbench(toSearchParams(await searchParams));
  } catch (error) {
    if (error instanceof AdminInputError)
      return (
        <>
          <AdminTitle
            title="Operations workbench"
            description="Check the workbench filters."
          />
          <p role="alert">{error.message}</p>
          <Link href="/admin/workbench" className="underline">
            Reset filters
          </Link>
        </>
      );
    logOperationalError("admin_workbench_read", error);
    throw new Error("Operations workbench is temporarily unavailable.");
  }
  const { query } = data;
  const pageHref = (page: number) => {
    const params = new URLSearchParams({
      category: query.category,
      page: String(page),
      pageSize: String(query.pageSize),
    });
    if (query.recordId) params.set("recordId", String(query.recordId));
    return `/admin/workbench?${params}`;
  };
  const groups: { title: string; categories: WorkbenchCategory[] }[] = [
    {
      title: "Booking attention",
      categories: ["BOOKING_CASES", "RENTAL_END_PASSED", "CUSTODY_REVIEW"],
    },
    { title: "Listing review", categories: ["LISTING_REVIEW"] },
    { title: "Open cases", categories: ["OPEN_REPORTS", "OPEN_DISPUTES"] },
  ];
  return (
    <>
      <AdminTitle
        title="Operations workbench"
        description="Review persisted marketplace exceptions and continue through existing authorized record pages. This workspace is read-only."
      />
      <p className="mb-5 text-sm text-slate-600">
        Snapshot: <time dateTime={data.asOf}>{adminDate(data.asOf)}</time>.
        Counts are queue memberships, not a total of unique tasks: the same
        booking or listing can appear in several queues.
      </p>
      <div className="mb-8 grid min-w-0 gap-5 xl:grid-cols-3">
        {groups.map((group) => (
          <AdminPanel key={group.title} title={group.title}>
            <ul className="space-y-3">
              {group.categories.map((category) => (
                <li key={category}>
                  <Link
                    href={`/admin/workbench?category=${category}`}
                    aria-current={
                      query.category === category ? "true" : undefined
                    }
                    className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-sm ${query.category === category ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <span>{workbenchCategories[category]}</span>
                    <span className="font-semibold" data-queue-count={category}>
                      {data.queues.find((q) => q.category === category)!.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </AdminPanel>
        ))}
      </div>
      <section aria-labelledby="selected-queue-title" className="mb-8 min-w-0">
        <h2 id="selected-queue-title" className="mb-2 text-xl font-semibold">
          {workbenchCategories[query.category]}
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          {data.totalMatching} matching records. Oldest creation time first,
          then record ID; this order does not assign urgency. Past agreed end is
          a review signal, not a finding of breach. Custody flags require
          investigation.
        </p>
        <form
          action="/admin/workbench"
          className="mb-5 flex min-w-0 flex-wrap items-end gap-3 rounded-xl border bg-white p-4"
        >
          <label className="grid min-w-0 gap-1 text-sm">
            Queue
            <select
              name="category"
              defaultValue={query.category}
              className="min-w-0 rounded-lg border p-2"
            >
              {Object.entries(workbenchCategories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Queue record ID
            <input
              name="recordId"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              defaultValue={query.recordId ?? ""}
              className="min-w-0 rounded-lg border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Rows per page
            <select
              name="pageSize"
              defaultValue={query.pageSize}
              className="rounded-lg border p-2"
            >
              {[...new Set([10, 20, 50, query.pageSize])]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n}>{n}</option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
          <Link
            href={`/admin/workbench?category=${query.category}`}
            className="rounded p-2 text-sm text-emerald-800 underline"
          >
            Clear record filter
          </Link>
        </form>
        <div className="space-y-3 md:hidden" aria-label="Mobile queue records">
          {data.items.length ? (
            data.items.map((item) => (
              <article
                key={item.id}
                className="min-w-0 rounded-xl border bg-white p-4 text-sm"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    data-workbench-entry
                    href={item.href}
                    className="font-semibold text-emerald-800 underline"
                  >
                    {item.kind.toLowerCase()} #{item.id}
                  </Link>
                  <StatusBadge status={item.status} />
                </div>
                {item.relatedId ? (
                  <p className="mb-2 text-xs text-slate-500">
                    {item.kind === "REPORT" ? "Listing" : "Booking"} #
                    {item.relatedId}
                  </p>
                ) : null}
                <h3 className="mb-2 font-medium">Why it appears</h3>
                <ul className="space-y-2">
                  {item.reasons.map((reason) => (
                    <li key={reason}>{workbenchReasons[reason]}</li>
                  ))}
                </ul>
                {item.endAt ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Agreed end: {adminDate(item.endAt)}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Recorded:{" "}
                  <time dateTime={item.recordedAt}>
                    {adminDate(item.recordedAt)}
                  </time>
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-xl border bg-white p-4 text-sm">
              No records match this queue and filter.
            </p>
          )}
        </div>
        <div className="hidden md:block">
          <AdminTable
            title="Operations queue records"
            headers={[
              "Record",
              "Persisted state",
              "Why it appears",
              "Recorded",
            ]}
            empty="No records match this queue and filter."
            rows={data.items.map((item) => ({
              id: item.id,
              cells: [
                <div key="record">
                  <Link
                    className="font-medium text-emerald-800 underline"
                    data-workbench-entry
                    href={item.href}
                  >
                    {item.kind.toLowerCase()} #{item.id}
                  </Link>
                  {item.relatedId ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.kind === "REPORT" ? "Listing" : "Booking"} #
                      {item.relatedId}
                    </p>
                  ) : null}
                </div>,
                <StatusBadge key="status" status={item.status} />,
                <div key="reason" className="max-w-sm whitespace-normal">
                  <ul className="space-y-1">
                    {item.reasons.map((reason) => (
                      <li key={reason}>{workbenchReasons[reason]}</li>
                    ))}
                  </ul>
                  {item.endAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Agreed end: {adminDate(item.endAt)}
                    </p>
                  ) : null}
                </div>,
                <time key="time" dateTime={item.recordedAt}>
                  {adminDate(item.recordedAt)}
                </time>,
              ],
            }))}
          />
        </div>
        <nav
          aria-label="Queue pagination"
          className="mt-4 flex flex-wrap items-center gap-4 text-sm"
        >
          {query.page > 1 ? (
            <Link href={pageHref(query.page - 1)} className="rounded underline">
              Previous page
            </Link>
          ) : null}
          <span>
            Page {query.page} of {data.totalPages}
          </span>
          {query.page < data.totalPages && query.page < 10000 ? (
            <Link href={pageHref(query.page + 1)} className="rounded underline">
              Next page
            </Link>
          ) : null}
        </nav>
        <p className="mt-4 text-xs leading-5 text-slate-600">
          Pending booking and handoff requests remain participant obligations.
          Resolved cases do not establish return of custody. No case narratives,
          private messages or evidence are shown here.
        </p>
      </section>
      <AdminPanel title="Relevant operational activity">
        <p className="mb-3 text-sm text-slate-600">
          Latest eight recorded Admin events for bookings, listings, listing
          reports and disputes. Metadata only; view the audit log for authorized
          details.
        </p>
        {data.activity.length ? (
          <ol className="divide-y divide-slate-100">
            {data.activity.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <Link
                  className="text-emerald-800 underline"
                  href={`/admin/audit-logs?targetType=${event.targetType}&targetId=${event.targetId}`}
                >
                  Recorded action · {event.targetType.replaceAll("_", " ")} #
                  {event.targetId}
                </Link>
                <time dateTime={event.createdAt}>
                  {adminDate(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">
            No matching operational activity has been recorded.
          </p>
        )}
      </AdminPanel>
    </>
  );
}
