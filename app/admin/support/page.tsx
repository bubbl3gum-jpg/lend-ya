import Link from "next/link";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import { getSupportWorkspace } from "@/lib/admin/support";
import {
  SUPPORT_NAVIGATION_KEYS,
  supportWorkbenchParams,
} from "@/lib/admin/support-query";
import { caseNavigationHref } from "@/lib/admin/case-history-navigation";
import { readWorkbenchNavigation } from "@/lib/admin/workbench-navigation";
import { toSearchParams, type SearchParams } from "@/lib/admin/query";
import { logOperationalError } from "@/lib/operational-error";
import {
  AdminTitle,
  AdminPanel,
  StatusBadge,
  adminDate,
} from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Support · Hustlen’ Admin" };
export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams),
    navigationParams = supportWorkbenchParams(params),
    navigation = readWorkbenchNavigation(navigationParams),
    resetHref = navigation.view
      ? `/admin/support?${navigationParams}`
      : "/admin/support";
  let data;
  try {
    data = await getSupportWorkspace(params);
  } catch (error) {
    const input = error instanceof AdminInputError;
    const reference = input
      ? null
      : logOperationalError("admin_support_read", error);
    return (
      <>
        <AdminTitle
          title="Support workspace"
          description="Read-only index of existing reports and disputes."
        />
        <AdminPanel
          title={input ? "Check Support filters" : "Support unavailable"}
        >
          <p role="alert">
            {input
              ? error.message
              : "Cases could not be loaded. Counts are unavailable; this does not establish that there are no cases. Reload to try again."}
          </p>
          {reference ? (
            <p className="mt-2 text-xs">Reference: {reference}</p>
          ) : null}
          <Link className="mt-4 inline-block underline" href={resetHref}>
            Reset Support view
          </Link>
          <Link className="ml-4 underline" href={navigation.backHref}>
            Back to Workbench
          </Link>
        </AdminPanel>
      </>
    );
  }
  const q = data.query,
    pageHref = (page: number) => {
      const p = new URLSearchParams({
        caseType: q.caseType,
        caseState: q.caseState,
        page: String(page),
        pageSize: String(q.pageSize),
      });
      if (q.caseId !== null) p.set("caseId", String(q.caseId));
      if (navigation.view)
        for (const key of SUPPORT_NAVIGATION_KEYS) {
          const value = navigationParams.get(key);
          if (value !== null) p.set(key, value);
        }
      return "/admin/support?" + p;
    };
  return (
    <>
      <AdminTitle
        title="Support workspace"
        description="Find existing reports and disputes, review recorded case history and continue through authorized case details. This is a read-only case index."
      />
      <p className="mb-5 max-w-4xl text-sm text-slate-600">
        Operations Workbench groups current marketplace exceptions. Support
        brings open and historical cases into one directory. Private Support Tickets
        are not read by this case index. Assignments, priorities, response targets and support replies are not
        configured.
      </p>
      <div className="mb-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>section>h2]:min-h-14">
        {[
          ["Open listing reports", data.counts.openReports],
          ["Open booking disputes", data.counts.openDisputes],
          ["Reviewed / dismissed reports", data.counts.historicalReports],
          ["Resolved disputes", data.counts.historicalDisputes],
        ].map(([label, value]) => (
          <AdminPanel key={label} title={String(label)}>
            <p data-support-count={label} className="text-3xl font-semibold">
              {value}
            </p>
          </AdminPanel>
        ))}
      </div>
      <p className="mb-6 text-xs text-slate-600">
        Snapshot: <time dateTime={data.asOf}>{adminDate(data.asOf)}</time>.
        Counts include all persisted cases, before filters. Each report or
        dispute counts once; several cases may concern the same listing or
        booking. These are not unique incidents or a total of staff tasks.
      </p>
      <form
        action="/admin/support"
        className="mb-6 grid min-w-0 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="grid min-w-0 gap-1 text-sm">
          Case type
          <select
            aria-label="Case type"
            name="caseType"
            defaultValue={q.caseType}
            className="min-w-0 rounded-lg border p-2"
          >
            <option value="ALL">All cases</option>
            <option value="REPORT">Listing reports</option>
            <option value="DISPUTE">Booking disputes</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          Case state
          <select
            aria-label="Case state"
            name="caseState"
            defaultValue={q.caseState}
            className="min-w-0 rounded-lg border p-2"
          >
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Historical / resolved</option>
            <option value="ALL">All states</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          Exact case ID
          <input
            name="caseId"
            type="number"
            min="1"
            max="2147483647"
            defaultValue={q.caseId ?? ""}
            className="min-w-0 rounded-lg border p-2"
            aria-describedby="support-case-id-help"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          Page size
          <select
            aria-label="Page size"
            name="pageSize"
            defaultValue={q.pageSize}
            className="min-w-0 rounded-lg border p-2"
          >
            {[...new Set([10, 20, 50, q.pageSize])]
              .sort((a, b) => a - b)
              .map((size) => (
                <option key={size}>{size}</option>
              ))}
          </select>
        </label>
        {navigation.view
          ? SUPPORT_NAVIGATION_KEYS.map((key) =>
              navigationParams.has(key) ? (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={navigationParams.get(key)!}
                />
              ) : null,
            )
          : null}
        <div className="flex flex-wrap items-end gap-3">
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
          <Link className="text-sm underline" href={resetHref}>
            Reset
          </Link>
        </div>
        <p
          id="support-case-id-help"
          className="text-xs text-slate-500 sm:col-span-2 lg:col-span-5"
        >
          Choose Listing reports or Booking disputes when using an exact ID.
          Report #1 and Dispute #1 are separate cases.
        </p>
      </form>
      <section aria-label="Support case records" className="min-w-0 space-y-4">
        <p className="text-sm">
          {data.totalMatching} matching cases · Oldest creation first, then
          report/dispute type and ID. Current state does not reconstruct every
          historical transition.
        </p>
        {data.items.length ? (
          data.items.map((item) => {
            const path = `/admin/${item.kind === "REPORT" ? "reports" : "disputes"}/${item.id}`;
            return (
              <article
                key={`${item.kind}-${item.id}`}
                data-support-case={`${item.kind}:${item.id}`}
                className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr]"
              >
                <div className="min-w-0 break-words">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold">
                      {item.kind === "REPORT"
                        ? "Listing report"
                        : "Booking dispute"}{" "}
                      #{item.id}
                    </h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-sm">
                    Created{" "}
                    <time dateTime={item.createdAt}>
                      {adminDate(item.createdAt)}
                    </time>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Latest resolution:{" "}
                    {item.resolvedAt ? (
                      <time dateTime={item.resolvedAt}>
                        {adminDate(item.resolvedAt)}
                      </time>
                    ) : (
                      "Not recorded"
                    )}
                  </p>
                </div>
                <nav
                  aria-label={`${item.kind === "REPORT" ? "Report" : "Dispute"} ${item.id} navigation`}
                  className="flex min-w-0 flex-wrap content-center items-center gap-x-5 gap-y-3 text-sm"
                >
                  <Link
                    className="rounded font-semibold text-emerald-800 underline"
                    href={caseNavigationHref(path, navigationParams)}
                  >
                    Inspect case details
                  </Link>
                  <Link
                    className="rounded text-emerald-800 underline"
                    href={caseNavigationHref(
                      path + "/history",
                      navigationParams,
                    )}
                  >
                    Case history / audit
                  </Link>
                  <Link
                    className="rounded text-emerald-800 underline"
                    href={caseNavigationHref(
                      `/admin/${item.related.kind === "LISTING" ? "listings" : "bookings"}/${item.related.id}`,
                      navigationParams,
                    )}
                  >
                    Related {item.related.kind.toLowerCase()} #{item.related.id}
                  </Link>
                </nav>
              </article>
            );
          })
        ) : (
          <AdminPanel title="No matching recorded cases">
            <p role="status">
              No records match this view. Try another case state or clear the
              filters. Missing historical entries are not proof that no event
              occurred.
            </p>
          </AdminPanel>
        )}
      </section>
      <nav
        aria-label="Support pagination"
        className="mt-5 flex flex-wrap gap-4 text-sm"
      >
        <span>
          Page {q.page} of {data.totalPages}
        </span>
        {q.page > 1 ? (
          <Link className="underline" href={pageHref(q.page - 1)}>
            Previous cases
          </Link>
        ) : null}
        {q.page < data.totalPages ? (
          <Link className="underline" href={pageHref(q.page + 1)}>
            Next cases
          </Link>
        ) : null}
      </nav>
      <p className="mt-5 text-xs text-slate-600">
        Case resolution is separate from booking completion, physical return and
        accepted inspection. Use guarded case details for current investigation
        checkpoints. No private conversation or evidence is copied here.
      </p>
      <Link
        data-support-workbench-back
        className="mt-5 inline-block rounded text-sm text-emerald-800 underline"
        href={navigation.backHref}
      >
        Back to Workbench
      </Link>
    </>
  );
}
