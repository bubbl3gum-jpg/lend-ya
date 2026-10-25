import Link from "next/link";
import {
  requireTicketPage,
  failTicketPage,
  TicketShell,
} from "@/components/support-ticket-pages";
import { listOwnTickets, TicketDenied } from "@/lib/support/tickets";
import { toSearchParams, type SearchParams } from "@/lib/admin/query";
import { adminDate } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireTicketPage();
  let data;
  try {
    data = await listOwnTickets(toSearchParams(await searchParams));
  } catch (e) {
    if (e instanceof TicketDenied && e.status === 400)
      return (
        <TicketShell title="My tickets">
          <p role="alert">Invalid ticket filters.</p>
        </TicketShell>
      );
    failTicketPage(e);
  }
  return (
    <TicketShell title="My tickets">
      <p className="mb-4 text-sm">
        {data.total} own submissions. Newest first. Status is recorded support
        handling, not rental completion.
      </p>
      <ol className="divide-y">
        {data.items.map((t) => (
          <li key={t.id} className="min-w-0 break-words py-4">
            <Link
              className="font-semibold text-emerald-800 underline"
              href={`/customer-service/tickets/${t.id}`}
            >
              {t.subject}
            </Link>
            <p className="mt-2 text-sm">
              {t.currentState} · {t.categoryCode}
            </p>
            <p className="text-sm text-slate-600">{adminDate(t.createdAt)}</p>
            <p className="text-xs text-slate-500">Reference {t.id}</p>
          </li>
        ))}
      </ol>
      {!data.items.length ? <p>No own tickets on this page.</p> : null}
      <nav aria-label="Ticket pagination" className="mt-4 flex gap-5 text-sm">
        <span>Page {data.page}</span>
        {data.page > 1 ? (
          <Link className="underline" href={`?page=${data.page - 1}`}>
            Previous tickets
          </Link>
        ) : null}
        {data.page * 10 < data.total ? (
          <Link className="underline" href={`?page=${data.page + 1}`}>
            Next tickets
          </Link>
        ) : null}
      </nav>
    </TicketShell>
  );
}
