"use client";
import { useEffect, useId, useRef, useState } from "react";
import { checklistItems, checklistAnswers } from "@/lib/rental-checklist";

type Props = {
  bookingId: number;
  actorId?: number;
  meetupChallengeId?: string | null;
  requirePhysicalReceipt?: boolean;
  action: "handoff" | "return" | "inspection";
  title: string;
  onSaved: (message: string) => void;
  collectSerialNumber?: boolean;
};
export function RentalEvidenceForm({
  bookingId,
  action,
  title,
  onSaved,
  collectSerialNumber = false,
  actorId,
  meetupChallengeId,
  requirePhysicalReceipt = false,
}: Props) {
  const notesId = useId();
  const [physicalReceipt, setPhysicalReceipt] = useState(false);
  const draftKey = `hustlen:condition-draft:${bookingId}:${action}:${actorId ?? "participant"}`;
  const initialized = useRef(false);
  const [notes, setNotes] = useState("");
  const [serial, setSerial] = useState("");
  const [checklist, setChecklist] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [decision, setDecision] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    initialized.current = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          if (typeof draft.notes === "string") setNotes(draft.notes);
          if (typeof draft.serial === "string") setSerial(draft.serial);
          if (draft.checklist && typeof draft.checklist === "object")
            setChecklist(draft.checklist);
        }
      } catch {}
      initialized.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);
  useEffect(() => {
    if (initialized.current) {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ notes, serial, checklist }),
        );
      } catch {}
    }
  }, [draftKey, notes, serial, checklist]);
  return (
    <form
      className="space-y-4 rounded-2xl border border-slate-200 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          !window.confirm(
            `${title}? This condition record will be saved permanently.`,
          )
        )
          return;
        setError("");
        setBusy(true);
        try {
          const data = new FormData();
          data.set(
            "payload",
            JSON.stringify({
              conditionNotes: notes,
              ...(requirePhysicalReceipt
                ? { meetupChallengeId, physicalReceipt }
                : {}),
              ...(collectSerialNumber ? { serialNumber: serial } : {}),
              checklist,
              conditionConfirmed: confirmed,
              returnConfirmed: action === "return" && confirmed,
              ...(action === "inspection"
                ? { acceptable: decision === "acceptable" }
                : {}),
            }),
          );
          files.forEach((file) => data.append("photos", file));
          const response = await fetch(`/api/bookings/${bookingId}/${action}`, {
            method: "POST",
            body: data,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || "Unable to save condition evidence.",
            );
          try {
            sessionStorage.removeItem(draftKey);
          } catch {}
          onSaved(
            result.inspectionAccepted === false
              ? "Inspection concern saved. The booking remains under inspection; open a dispute for administrative review."
              : "Condition evidence and confirmation saved.",
          );
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Unable to save evidence.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-600">
        Review the saved evidence above. Record defects and uncertainty
        honestly; confirmation acknowledges this record, not a claim that the
        item is perfect.
      </p>
      {requirePhysicalReceipt && (
        <>
          <p>
            Verify the pickup QR or one-time code first. Your own checklist and
            acknowledgement are still required.
          </p>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={physicalReceipt}
              onChange={(e) => setPhysicalReceipt(e.target.checked)}
            />
            I have physically received the equipment after inspecting it.
          </label>
        </>
      )}
      <p className="text-sm">
        Draft notes and checklist stay in this tab until saved; close the tab on
        shared devices. Photos must be reselected after refresh. Photograph
        equipment only, not participants or strangers.
      </p>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="font-medium">Condition checklist</legend>
        {Object.entries(checklistItems).map(([key, label]) => (
          <label
            key={key}
            className="grid gap-1 text-sm sm:grid-cols-2 sm:items-center"
          >
            <span>{label}</span>
            <select
              required
              value={checklist[key] ?? ""}
              onChange={(event) =>
                setChecklist((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              className="rounded-xl border p-2"
            >
              <option value="">Select an answer</option>
              {checklistAnswers.map((answer) => (
                <option key={answer} value={answer}>
                  {answer.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className="grid gap-1 text-sm">
          <label htmlFor={notesId}>Condition notes</label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={2000}
            rows={3}
            className="rounded-xl border p-2"
            placeholder="Describe visible damage, missing accessories or anything that could not be checked."
          />
        </div>
        {collectSerialNumber ? (
          <label className="grid gap-1 text-sm">
            Serial number (optional)
            <input
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              maxLength={120}
              className="rounded-xl border p-2"
            />
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          Condition photos (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <span className="text-slate-500">
            Up to 8 still photos, 5 MB each, 20 MB total. JPEG, PNG or WebP;
            maximum 4096 × 4096 pixels.
          </span>
        </label>
        {action === "inspection" ? (
          <label className="grid gap-1 text-sm">
            Inspection decision
            <select
              required
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
              className="rounded-xl border p-2"
            >
              <option value="">Select a decision</option>
              <option value="acceptable">Acceptable — complete rental</option>
              <option value="problem">
                Problem found — keep under inspection
              </option>
            </select>
          </label>
        ) : null}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          <span>
            {action === "return"
              ? "I am returning the item and acknowledge the recorded return condition."
              : action === "inspection"
                ? "I have inspected the returned item and acknowledge this decision and condition record."
                : "I have reviewed the item and acknowledge the recorded condition and handoff."}
          </span>
        </label>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        disabled={
          busy ||
          !confirmed ||
          (requirePhysicalReceipt &&
            (!meetupChallengeId || !physicalReceipt)) ||
          (action === "inspection" && !decision)
        }
        className="rounded-xl bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "Saving evidence…" : title}
      </button>
    </form>
  );
}
