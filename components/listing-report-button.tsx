"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const reportReasons = ["Safety concern", "Prohibited item", "Inaccurate listing", "Other"];

export function ListingReportButton({ listingId }: { listingId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reportReasons[0]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setLoginRequired(false);

    try {
      const response = await fetch(`/api/listings/${listingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setLoginRequired(true);
        throw new Error("Log in to report this listing.");
      }
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit report.");
      }
      setMessage("Report received.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {open ? (
        <form onSubmit={submit} className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            Report reason
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              {reportReasons.map((entry) => <option key={entry}>{entry}</option>)}
            </select>
          </label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={2} placeholder="Optional details" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">{loading ? "Sending..." : "Send report"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setOpen(true); setMessage(""); }} className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-rose-700">Report</button>
      )}
      {message ? (
        <p className="mt-2 text-xs text-slate-600">
          {loginRequired ? <><Link className="font-medium text-emerald-700 underline" href="/login">Log in</Link> to report this listing.</> : message}
        </p>
      ) : null}
    </div>
  );
}