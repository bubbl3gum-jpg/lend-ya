"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MeetupVerification } from "@/components/meetup-verification";
import { RentalEvidenceForm } from "@/components/rental-evidence-form";

type BookingActionsProps = {
  documentationPilot?:boolean;
  bookingId: number;
  currentUserId: number;
  ownerId: number;
  renterId: number;
  status: string;
  handoffPerformerId?: number | null;
  hasDispute?: boolean;
  inspectionRecorded?: boolean;
};
export function BookingActions({
  documentationPilot=false,
  bookingId,
  currentUserId,
  ownerId,
  renterId,
  status,
  hasDispute = false,
  inspectionRecorded = false,
}: BookingActionsProps) {
  const router = useRouter();
  const [meetupEnabled, setMeetupEnabled] = useState(false),
    [meetupProof, setMeetupProof] = useState<string | null>(null);
  const onMeetup = useCallback((enabled: boolean, proof: string | null) => {
    setMeetupEnabled(enabled);
    setMeetupProof(proof);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const isOwner = currentUserId === ownerId;
  const isBorrower = currentUserId === renterId;
  const isParticipant = isOwner || isBorrower;
  const saved = (feedback: string) => {
    setMessage(feedback);
    router.refresh();
  };
  async function send(action: string, body: Record<string, unknown> = {}) {
    if (
      !window.confirm(
        action === "dispute"
          ? "Open a dispute for administrative review?"
          : `Confirm ${action} booking?`,
      )
    )
      return false;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        action === "dispute"
          ? `/api/bookings/${bookingId}/dispute`
          : `/api/bookings/${bookingId}`,
        {
          method: action === "dispute" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json",...(documentationPilot?{"X-Hustlen-Documentation-Agreement":"1"}:{}) },
          body: JSON.stringify({ action, ...body }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to update booking.");
      saved(
        action === "dispute"
          ? "Dispute saved. Administrative review is required."
          : "Booking updated.",
      );
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update booking.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const buttonClass =
    "rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-50";
  return (
    <div className="space-y-4">
      <MeetupVerification
        bookingId={bookingId}
        userId={currentUserId}
        isOwner={isOwner}
        bookingStatus={status}
        onState={onMeetup}
      />
      {(status === "PENDING" || status === "CONFIRMED") && isParticipant ? (
        <>
          <label className="grid gap-1 text-sm">
            Cancellation or rejection reason (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              rows={2}
              className="rounded-xl border p-2"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {status === "PENDING" && isOwner ? (
              <>
                <button
                  disabled={busy}
                  onClick={() => send("accept")}
                  className={buttonClass}
                >
                  Accept request
                </button>
                <button
                  disabled={busy}
                  onClick={() => send("reject", { reason })}
                  className={buttonClass}
                >
                  Reject request
                </button>
              </>
            ) : null}
            <button
              disabled={busy}
              onClick={() => send("cancel", { reason })}
              className={buttonClass}
            >
              Cancel booking
            </button>
          </div>
        </>
      ) : null}
      {status === "CONFIRMED" && isOwner ? (
        <RentalEvidenceForm
          bookingId={bookingId}
          actorId={currentUserId}
          action="handoff"
          title="Submit owner handoff"
          collectSerialNumber
          onSaved={saved}
        />
      ) : null}
      {status === "CONFIRMED" && isBorrower ? (
        <p className="text-sm">
          Waiting for the owner to submit the handoff condition record.
        </p>
      ) : null}
      {status === "HANDOFF_PENDING" && isBorrower ? (
        <RentalEvidenceForm
          bookingId={bookingId}
          actorId={currentUserId}
          action="handoff"
          title="Confirm receipt as borrower"
          meetupChallengeId={meetupEnabled ? meetupProof : undefined}
          requirePhysicalReceipt={meetupEnabled}
          onSaved={saved}
        />
      ) : null}
      {status === "HANDOFF_PENDING" && isOwner ? (
        <p className="text-sm">
          Owner handoff saved. Waiting for the borrower to review and confirm
          receipt.
        </p>
      ) : null}
      {status === "IN_USE" && isBorrower ? (
        <RentalEvidenceForm
          bookingId={bookingId}
          actorId={currentUserId}
          action="return"
          title="Submit item return"
          onSaved={saved}
        />
      ) : null}
      {status === "RETURN_PENDING" && isOwner && !meetupEnabled ? (
        <button
          disabled={busy}
          onClick={() => send("inspect")}
          className={buttonClass}
        >
          Begin return inspection
        </button>
      ) : null}
      {status === "RETURN_PENDING" && isBorrower ? (
        <p className="text-sm">Return saved. Waiting for owner inspection.</p>
      ) : null}
      {status === "INSPECTION" && isOwner && !inspectionRecorded ? (
        <RentalEvidenceForm
          bookingId={bookingId}
          actorId={currentUserId}
          action="inspection"
          title="Save owner inspection decision"
          onSaved={saved}
        />
      ) : null}
      {status === "INSPECTION" && inspectionRecorded ? (
        <p className="text-sm text-amber-800">
          A condition concern was recorded. Completion is blocked; open a
          dispute for administrative review.
        </p>
      ) : null}
      {status === "INSPECTION" && isBorrower && !inspectionRecorded ? (
        <p className="text-sm">The owner is inspecting your return.</p>
      ) : null}
      {["IN_USE", "RETURN_PENDING", "INSPECTION"].includes(status) &&
      isParticipant &&
      !hasDispute ? (
        disputeOpen ? (
          <form
            className="space-y-3 rounded-xl border border-rose-200 p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                await send("dispute", {
                  reason: disputeReason,
                  description: disputeDescription,
                })
              )
                setDisputeOpen(false);
            }}
          >
            <label className="grid gap-1 text-sm">
              Dispute reason
              <input
                required
                maxLength={120}
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                className="rounded-xl border p-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Concern details
              <textarea
                required
                maxLength={2000}
                value={disputeDescription}
                onChange={(event) => setDisputeDescription(event.target.value)}
                rows={3}
                className="rounded-xl border p-2"
              />
            </label>
            <button disabled={busy} className={buttonClass}>
              Submit dispute
            </button>
            <button
              type="button"
              onClick={() => setDisputeOpen(false)}
              className={buttonClass}
            >
              Close form
            </button>
          </form>
        ) : (
          <button className={buttonClass} onClick={() => setDisputeOpen(true)}>
            Open dispute
          </button>
        )
      ) : null}
      {status === "ADMIN_CLOSED" ? (
        <p className="rounded-xl bg-slate-100 p-4 text-sm">
          This returned rental was closed by an administrator after reviewing
          the recorded inspection. Participant evidence is preserved. This does
          not represent normal completion, verified-review eligibility, or a
          payment settlement.
        </p>
      ) : null}
      {status === "DISPUTED" ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          Administrative review is required. Condition evidence is preserved.
          Normal rental completion is blocked.
        </p>
      ) : null}
      {busy ? <p role="status">Saving booking…</p> : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
