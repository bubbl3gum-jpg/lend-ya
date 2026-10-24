import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminPage, AdminInputError } from "@/lib/admin/auth";
import {
  getCaseHistory,
  getCaseAudit,
  historyLabels,
  type HistoryKind,
} from "@/lib/admin/case-history";
import {
  caseNavigationHref,
  historyNavigation,
} from "@/lib/admin/case-history-navigation";
import { toSearchParams, type SearchParams } from "@/lib/admin/query";
import { logOperationalError } from "@/lib/operational-error";
import { AdminPanel, AdminTitle, adminDate } from "./ui";

export async function CaseHistoryView({
  kind,
  id,
  searchParams,
}: {
  kind: HistoryKind;
  id: string;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams),
    navigation = historyNavigation(params);
  const route = kind === "REPORT" ? "reports" : "disputes";
  let data;
  try {
    data = await getCaseHistory(kind, id, params);
  } catch (error) {
    if (error instanceof AdminInputError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403 || error.status === 404) notFound();
    }
    const reference =
      error instanceof AdminInputError
        ? null
        : logOperationalError("admin_case_history_read", error);
    return (
      <AdminPanel title="Case history unavailable">
        <p role="alert">
          {error instanceof AdminInputError
            ? "Check the history pagination and query parameters."
            : "History could not be loaded. This does not establish that no events occurred. Reload to try again."}
        </p>
        {reference ? (
          <p className="mt-2 text-xs">Reference: {reference}</p>
        ) : null}
        <Link
          className="mt-4 inline-block underline"
          href={navigation.backHref}
        >
          Back to Workbench
        </Link>
      </AdminPanel>
    );
  }
  const detail = caseNavigationHref(`/admin/${route}/${data.id}`, params);
  const pageHref = (page: number) => {
    const href = caseNavigationHref(
        `/admin/${route}/${data.id}/history`,
        params,
      ),
      q = new URL(href, "http://local.invalid");
    q.searchParams.set("historyPage", String(page));
    return q.pathname + q.search;
  };
  return (
    <section aria-label="Case history" className="my-6 min-w-0">
      <AdminPanel title="Case history">
        <p className="mb-4 text-sm text-slate-600">
          Oldest first. Case timestamps are persisted fields, not an immutable
          transition ledger. Audit entries are recorded administrative metadata.
          These sources may describe the same decision; missing entries do not
          establish that nothing happened.
        </p>
        <p className="mb-4 text-sm">
          Case closure does not prove physical return or accepted inspection.{" "}
          <Link
            className="underline text-emerald-800"
            href={detail + "#investigation-checkpoints"}
          >
            Inspect current case checkpoints
          </Link>
          .
        </p>
        {data.events.length ? (
          <ol className="divide-y divide-slate-100">
            {data.events.map((event, index) => (
              <li
                key={`${event.source}-${event.auditId ?? event.event}-${index}`}
                className="grid min-w-0 gap-2 py-4 sm:grid-cols-[12rem_1fr]"
              >
                <time
                  className="text-sm text-slate-500"
                  dateTime={event.timestamp}
                >
                  {adminDate(event.timestamp)}
                </time>
                <div className="min-w-0 break-words">
                  <p className="font-medium">{historyLabels[event.event]}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.source === "ADMIN_AUDIT"
                      ? "Recorded audit event"
                      : "Persisted case timestamp"}{" "}
                    · {kind.toLowerCase()} #{data.id}
                  </p>
                  {event.auditId ? (
                    <Link
                      className="mt-2 inline-block text-sm text-emerald-800 underline"
                      href={caseNavigationHref(
                        `/admin/case-audit/${event.auditId}`,
                        params,
                      )}
                    >
                      Inspect audit metadata #{event.auditId}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status" className="py-4 text-sm">
            No recorded entries on this page. History may be incomplete; this is
            not proof that no event occurred.
          </p>
        )}
        <nav
          aria-label="Case history pagination"
          className="mt-4 flex flex-wrap gap-4 text-sm"
        >
          <span>
            {data.total} recorded entries · Page {data.page} of{" "}
            {Math.max(1, Math.ceil(data.total / 20))}
          </span>
          {data.page > 1 ? (
            <Link className="underline" href={pageHref(data.page - 1)}>
              Previous history page
            </Link>
          ) : null}
          {data.page * 20 < data.total ? (
            <Link className="underline" href={pageHref(data.page + 1)}>
              Next history page
            </Link>
          ) : null}
        </nav>
        <div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-sm">
          <Link className="underline" href={detail}>
            Back to case detail
          </Link>
          <Link
            className="underline"
            href={caseNavigationHref(
              `/admin/${data.related.kind === "LISTING" ? "listings" : "bookings"}/${data.related.id}`,
              params,
            )}
          >
            Inspect related {data.related.kind.toLowerCase()} #{data.related.id}
          </Link>
          <Link
            data-history-workbench-back
            className="underline"
            href={navigation.backHref}
          >
            Back to Workbench
          </Link>
        </div>
      </AdminPanel>
    </section>
  );
}
export async function CaseAuditView({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams),
    navigation = historyNavigation(params);
  let data;
  try {
    data = await getCaseAudit(id);
  } catch (error) {
    if (error instanceof AdminInputError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403 || error.status === 404) notFound();
    }
    const reference = logOperationalError("admin_case_audit_read", error);
    return (
      <AdminPanel title="Audit metadata unavailable">
        <p role="alert">The record could not be loaded. Reload to try again.</p>
        <p className="text-xs">Reference: {reference}</p>
        <Link href={navigation.backHref}>Back to Workbench</Link>
      </AdminPanel>
    );
  }
  const casePath = `/admin/${data.kind === "REPORT" ? "reports" : "disputes"}/${data.caseId}`;
  return (
    <>
      <AdminTitle
        title={`Case audit #${data.id}`}
        description="Allowlisted audit metadata. Case decisions do not establish physical custody."
      />
      <AdminPanel title={historyLabels[data.event]}>
        <p>
          <time dateTime={data.timestamp}>{adminDate(data.timestamp)}</time> ·
          Recorded audit event · {data.kind.toLowerCase()} #{data.caseId}
        </p>
        <nav
          aria-label="Audit navigation"
          className="mt-5 flex flex-wrap gap-4 text-sm"
        >
          <Link
            className="underline"
            href={caseNavigationHref(casePath + "/history", params)}
          >
            Back to case history
          </Link>
          <Link
            className="underline"
            href={caseNavigationHref(casePath, params)}
          >
            Inspect case detail and current checkpoints
          </Link>
          <Link
            data-history-workbench-back
            className="underline"
            href={navigation.backHref}
          >
            Back to Workbench
          </Link>
        </nav>
      </AdminPanel>
    </>
  );
}

export async function CaseHistoryPreview({
  kind,
  id,
  searchParams,
}: {
  kind: HistoryKind;
  id: number;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = toSearchParams(await searchParams),
    href = caseNavigationHref(
      `/admin/${kind === "REPORT" ? "reports" : "disputes"}/${id}/history`,
      params,
    );
  let data;
  try {
    data = await getCaseHistory(kind, String(id), new URLSearchParams());
  } catch (error) {
    // Independent guard errors must never be rendered as a successful empty history.
    if (error instanceof AdminInputError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403 || error.status === 404) notFound();
    }
    logOperationalError("admin_case_history_preview", error);
    return (
      <AdminPanel title="Case history">
        <p role="alert">
          History is unavailable. No historical conclusion can be drawn.
        </p>
        <Link className="underline" href={href}>
          Open case history
        </Link>
      </AdminPanel>
    );
  }
  return (
    <section aria-label="Case history preview" className="mt-6">
      <AdminPanel title="Case history">
        <p className="mb-3 text-xs text-slate-600">
          First three recorded entries, oldest first. Case timestamps and audit
          metadata have different provenance; this is not a complete transition
          or custody ledger.
        </p>
        <ol className="space-y-3">
          {data.events.slice(0, 3).map((event, index) => (
            <li key={index} className="min-w-0 break-words text-sm">
              <time dateTime={event.timestamp} className="text-slate-500">
                {adminDate(event.timestamp)}
              </time>
              <p>
                {historyLabels[event.event]} ·{" "}
                {event.source === "ADMIN_AUDIT"
                  ? "Recorded audit event"
                  : "Persisted case timestamp"}
              </p>
            </li>
          ))}
        </ol>
        {!data.events.length ? (
          <p>No entries available; this does not prove no event occurred.</p>
        ) : null}
        <Link
          className="mt-4 inline-block text-sm text-emerald-800 underline"
          href={href}
        >
          View chronological case history and audit metadata
        </Link>
      </AdminPanel>
    </section>
  );
}
