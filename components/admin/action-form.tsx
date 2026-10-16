"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Option = { value: string; label: string };
export function AdminActionForm({
  endpoint,
  method = "POST",
  title,
  options,
  field = "decision",
  fixed = {},
  dispute = false,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  title: string;
  options: Option[];
  field?: string;
  fixed?: Record<string, string | boolean>;
  dispute?: boolean;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-700">
        This decision is persisted with your identity, time and required reason.
        Existing evidence remains intact.
      </p>
      <form
        className="mt-4 grid min-w-0 gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget),
            selected = String(form.get(field));
          if (
            !window.confirm(
              `Confirm ${title}: ${selected}? This action will be recorded in the audit log.`,
            )
          )
            return;
          setBusy(true);
          setMessage("");
          setError(false);
          try {
            const body: Record<string, unknown> = {
              ...fixed,
              [field]: field === "restricted" ? selected === "true" : selected,
              reason: String(form.get("reason")),
            };
            if (dispute) {
              body.outcome = String(form.get("outcome"));
              body.adminNotes = String(form.get("adminNotes"));
            }
            const response = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
              data = await response.json();
            if (!response.ok)
              throw new Error(data.error || "Administrative action failed.");
            setMessage("Decision saved and audit record created.");
            router.refresh();
          } catch (err) {
            setError(true);
            setMessage(
              err instanceof Error
                ? err.message
                : "Administrative action failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          Decision
          <select
            name={field}
            required
            disabled={busy}
            className="min-w-0 max-w-full rounded-lg border bg-white p-2"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {dispute ? (
          <>
            <label className="grid gap-1 text-sm">
              Booking consequence
              <select
                name="outcome"
                required
                className="min-w-0 max-w-full rounded-lg border bg-white p-2"
              >
                <option value="CONTINUE_RETURN">
                  Await return · no return record exists
                </option>
                <option value="RESUME_INSPECTION">
                  Resume owner inspection · not yet inspected
                </option>
                <option value="CLOSE_RETURNED">
                  Close returned rental · owner inspection required
                </option>
              </select>
            </label>
            <p className="text-sm">
              Administrative closure is separate from normal completion and does
              not enable reviews or move funds. Missing return or inspection
              evidence cannot be fabricated.
            </p>
            <label className="grid gap-1 text-sm">
              Confidential internal notes
              <textarea
                name="adminNotes"
                maxLength={2000}
                className="min-w-0 rounded-lg border bg-white p-2"
              />
            </label>
          </>
        ) : null}
        <label className="grid gap-1 text-sm">
          {dispute
            ? "Participant-visible decision explanation"
            : "Required administrative reason"}
          <textarea
            name="reason"
            required
            minLength={1}
            maxLength={2000}
            className="min-w-0 rounded-lg border bg-white p-2"
          />
        </label>
        <button
          disabled={busy}
          className="justify-self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Confirm decision"}
        </button>
      </form>
      {message ? (
        <p
          role={error ? "alert" : "status"}
          className={`mt-3 break-words text-sm ${error ? "text-rose-800" : "text-emerald-800"}`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
