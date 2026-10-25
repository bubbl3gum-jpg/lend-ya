import Link from "next/link";
import { notFound } from "next/navigation";
import {
  requireTicketPage,
  failTicketPage,
  TicketShell,
} from "@/components/support-ticket-pages";
import { readOwnTicket, TicketDenied } from "@/lib/support/tickets";
import { adminDate } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTicketPage();
  let t;
  try {
    t = await readOwnTicket((await params).id);
  } catch (e) {
    if (e instanceof TicketDenied && e.status === 404) notFound();
    failTicketPage(e);
  }
  const related = t.related,
    href =
      related?.kind === "booking"
        ? `/bookings/${related.id}`
        : related?.kind === "listing"
          ? `/listings/${related.id}`
          : null;
  return (
    <TicketShell title="Support ticket details">
      <p role="status" className="mb-4 font-semibold">
        Recorded status: {t.currentState}
      </p>
      <dl className="grid min-w-0 gap-4 text-sm">
        <div>
          <dt>Reference</dt>
          <dd className="break-all">{t.id}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{t.categoryCode}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd className="whitespace-pre-wrap break-words">{t.subject}</dd>
        </div>
        <div>
          <dt>Submitted details</dt>
          <dd className="whitespace-pre-wrap break-words">{t.description}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{adminDate(t.createdAt)}</dd>
        </div>
        {related ? (
          <div>
            <dt>Authorized related record</dt>
            <dd>
              {href ? (
                <Link className="underline" href={href}>
                  {related.kind} #{related.id}
                </Link>
              ) : (
                `${related.kind} #${related.id}`
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      <h2 className="mt-6 text-lg font-semibold">Recorded ticket history</h2>
      <ol>
        {t.events.map((e) => (
          <li className="mt-3 text-sm" key={e.sequence}>
            {e.sequence}. Ticket received · {adminDate(e.createdAt)}
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-slate-600">
        A ticket does not confirm physical return, accept inspection or resolve
        an existing dispute. Future staff workflows are not enabled.
      </p>
    </TicketShell>
  );
}
