"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingActionsProps = {
  bookingId: number;
  currentUserId: number;
  ownerId: number;
  renterId: number;
  status: string;
  listingType: "RENTAL" | "SERVICE";
};

export function BookingActions({ bookingId, currentUserId, ownerId, renterId, status, listingType }: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function trigger(action: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update booking.");
      }

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown booking update error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isOwner = currentUserId === ownerId;
  const isRenter = currentUserId === renterId;

  return (
    <div className="space-y-3">
      {status === "PENDING" && isOwner ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => trigger("accept")} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">Accept</button>
          <button type="button" onClick={() => trigger("reject")} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Reject</button>
        </div>
      ) : null}

      {status === "CONFIRMED" && isOwner ? (
        <button type="button" onClick={() => trigger("start")} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">Mark in use</button>
      ) : null}

      {status === "IN_USE" && isRenter ? (
        <button type="button" onClick={() => trigger("return")} disabled={loading} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-60">Mark returned</button>
      ) : null}

      {status === "RETURN_PENDING" && (isOwner || isRenter) ? (
        <button type="button" onClick={() => trigger("complete")} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">Complete booking</button>
      ) : null}

      {listingType === "SERVICE" && status === "CONFIRMED" && (isOwner || isRenter) ? (
        <button type="button" onClick={() => trigger("complete")} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">Complete service</button>
      ) : null}

      {status !== "COMPLETED" && status !== "CANCELLED" && (isOwner || isRenter) ? (
        <button type="button" onClick={() => trigger("cancel")} disabled={loading} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60">Cancel booking</button>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
