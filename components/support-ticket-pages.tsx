import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "./site-header";
import { ticketContext, TicketDenied } from "@/lib/support/tickets";
import { logOperationalError } from "@/lib/operational-error";
export async function requireTicketPage() {
  try {
    return await ticketContext();
  } catch (e) {
    if (e instanceof TicketDenied) {
      if (e.status === 401) redirect("/login");
      notFound();
    }
    logOperationalError("support_candidate_page", e);
    throw Error(
      "Development ticket service unavailable. Existing help remains available.",
    );
  }
}
export function TicketShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="mb-4 text-3xl font-semibold">{title}</h1>
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          Isolated development ticket pilot. No live replies, staff assignment
          or recovery actions. Production intake remains disabled pending policy
          approval.
        </p>
        <div className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm">
          {children}
        </div>
        <nav
          aria-label="Customer Service"
          className="mt-6 flex flex-wrap gap-5 text-sm"
        >
          <Link className="underline" href="/customer-service">
            Help guidance
          </Link>
          <Link className="underline" href="/customer-service/tickets">
            My tickets
          </Link>
          <Link className="underline" href="/customer-service/tickets/new">
            Create ticket
          </Link>
        </nav>
      </div>
    </main>
  );
}

export function failTicketPage(error: unknown): never {
  if (error instanceof TicketDenied) {
    if (error.status === 401) redirect("/login");
    if (error.status === 403 || error.status === 404) notFound();
  }
  const reference = logOperationalError("support_candidate_read", error);
  throw Error(
    `Development ticket service unavailable. Reference: ${reference}`,
  );
}
