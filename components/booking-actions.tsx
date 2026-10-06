"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingActionsProps = {
  bookingId: number;
  currentUserId: number;
  ownerId: number;
  renterId: number;
  status: string;
  handoffPerformerId?: number | null;
  hasDispute?: boolean;
};

export function BookingActions({
  bookingId,
  currentUserId,
  ownerId,
  renterId,
  status,
  handoffPerformerId = null,
  hasDispute = false,
}: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conditionConfirmed, setConditionConfirmed] = useState(false);
  const [conditionNotes, setConditionNotes] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");

  async function send(path: string, method: "PATCH" | "POST", body: Record<string, unknown>) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update booking.");
      }
      router.refresh();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown booking update error.";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function patch(action: string, body: Record<string, unknown> = {}) {
    return send(`/api/bookings/${bookingId}`, "PATCH", { action, ...body });
  }

  function post(route: "handoff" | "return" | "dispute", body: Record<string, unknown> = {}) {
    return send(`/api/bookings/${bookingId}/${route}`, "POST", body);
  }

  const isOwner = currentUserId === ownerId;
  const isRenter = currentUserId === renterId;
  const isParticipant = isOwner || isRenter;

  return (
    <div className="space-y-3">
      {status === "PENDING" && isOwner ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => patch("accept")} disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">Accept</button>
          <button type="button" onClick={() => patch("reject")} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Reject</button>
        </div>
      ) : null}

      {status === "CONFIRMED" && isParticipant ? (
        <button type="button" onClick={() => post("handoff", { conditionConfirmed: true })} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">Start Handoff</button>
      ) : null}

      {status === "HANDOFF_PENDING" && isParticipant && handoffPerformerId !== currentUserId ? (
        <button type="button" onClick={() => post("handoff", { conditionConfirmed: true })} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">Confirm Handoff</button>
      ) : null}

      {status === "HANDOFF_PENDING" && isParticipant && handoffPerformerId === currentUserId ? (
        <p className="text-sm text-slate-600">Waiting for the other participant to confirm the handoff.</p>
      ) : null}

      {status === "IN_USE" && isRenter ? (
        <button type="button" onClick={() => post("return")} disabled={loading} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60">Return Item</button>
      ) : null}

      {status === "RETURN_PENDING" && isOwner ? (
        <button type="button" onClick={() => patch("inspect")} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">Start Inspection</button>
      ) : null}

      {status === "RETURN_PENDING" && isRenter ? (
        <p className="text-sm text-slate-600">Return submitted. Waiting for the owner to inspect it.</p>
      ) : null}

      {status === "INSPECTION" && isOwner ? (
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            <span className="mb-1 block font-medium">Inspection notes</span>
            <textarea value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={conditionConfirmed} onChange={(event) => setConditionConfirmed(event.target.checked)} />
            I inspected the returned item condition
          </label>
          <button type="button" onClick={() => patch("complete", { conditionConfirmed, conditionNotes })} disabled={loading || !conditionConfirmed} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">Confirm Return</button>
        </div>
      ) : null}

      {status === "INSPECTION" && isRenter ? (
        <p className="text-sm text-slate-600">The owner is inspecting the return.</p>
      ) : null}

      {(status === "RETURN_PENDING" || status === "INSPECTION") && isParticipant ? (
        hasDispute ? (
          <p className="text-sm font-medium text-rose-700">A dispute has been opened for this booking.</p>
        ) : disputeOpen ? (
          <form onSubmit={async (event) => {
            event.preventDefault();
            const opened = await post("dispute", { reason: disputeReason, description: disputeDescription });
            if (opened) setDisputeOpen(false);
          }} className="space-y-3 rounded-xl border border-rose-200 p-4">
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">Reason</span>
              <input value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} maxLength={120} required className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1 block font-medium">What is wrong?</span>
              <textarea value={disputeDescription} onChange={(event) => setDisputeDescription(event.target.value)} maxLength={2000} rows={3} required className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Open Dispute</button>
              <button type="button" onClick={() => setDisputeOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Close</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setDisputeOpen(true)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Report a problem</button>
        )
      ) : null}

      {(status === "PENDING" || status === "CONFIRMED") && isParticipant ? (
        <button type="button" onClick={() => patch("cancel")} disabled={loading} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60">Cancel booking</button>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
