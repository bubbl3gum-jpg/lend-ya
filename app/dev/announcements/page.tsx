import { notFound } from "next/navigation";
import { AdminInputError } from "@/lib/admin/auth";
import { visibleCandidateNotices } from "@/lib/announcements/service";
import { formatRentalTime } from "@/lib/booking-time";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (Object.keys(await searchParams).length) notFound();
  let rows;
  try {
    rows = await visibleCandidateNotices();
  } catch (e) {
    if (e instanceof AdminInputError) notFound();
    throw e;
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        Hustlen’ · Test announcement audience
      </h1>
      <p>
        Owned-development Admin testers only. In-app demonstration; no
        notifications delivered. Server-clock publication windows.
      </p>
      {!rows.length ? (
        <p>No active test notices.</p>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="rounded-xl border p-5">
            <h2 className="text-xl font-semibold">{r.title}</h2>
            <p className="whitespace-pre-wrap break-words">{r.body}</p>
            <p>Until {formatRentalTime(r.expiresAt)}</p>
          </article>
        ))
      )}
    </main>
  );
}
