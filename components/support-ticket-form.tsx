"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ticketCategories } from "@/lib/support/input";
export function SupportTicketForm() {
  const router = useRouter(),
    key = useRef<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        key.current ??= crypto.randomUUID();
        const relation = form.get("relatedType") as string,
          id = String(form.get("relatedId") ?? "");
        if ((relation && !id) || (!relation && id)) {
          setError("Choose both a related record type and its ID, or neither.");
          return;
        }
        const body = {
          categoryCode: form.get("categoryCode"),
          subject: form.get("subject"),
          description: form.get("description"),
          requestKey: key.current,
          ...(relation && id ? { [relation]: Number(id) } : {}),
        };
        setBusy(true);
        setError("");
        try {
          const r = await fetch("/api/support/tickets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
            data = await r.json();
          if (!r.ok) throw Error(data.error ?? "Submission unavailable.");
          router.push(`/customer-service/tickets/${data.ticket.id}`);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Submission unavailable. Retry with the same content.",
          );
          setBusy(false);
        }
      }}
    >
      <label className="grid gap-1">
        Category
        <select
          aria-label="Category"
          name="categoryCode"
          onChange={() => {
            key.current = null;
          }}
          className="rounded-lg border p-3"
        >
          {ticketCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Subject
        <input
          name="subject"
          required
          maxLength={120}
          className="rounded-lg border p-3"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      <label className="grid gap-1">
        Description
        <textarea
          name="description"
          required
          maxLength={2000}
          rows={5}
          className="rounded-lg border p-3"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      <p className="text-sm text-slate-600">
        Text only. Do not submit credentials, ID documents, private chat,
        evidence or location coordinates. No attachment or messaging service is
        available.
      </p>
      <label className="grid gap-1">
        Related record
        <select
          aria-label="Related record"
          name="relatedType"
          className="rounded-lg border p-3"
          onChange={() => {
            key.current = null;
          }}
        >
          <option value="">None</option>
          <option value="bookingId">My booking</option>
          <option value="listingId">My owned listing</option>
          <option value="reportId">My submitted listing report</option>
          <option value="disputeId">My opened dispute</option>
        </select>
      </label>
      <label className="grid gap-1">
        Related record ID
        <input
          name="relatedId"
          type="number"
          min="1"
          max="2147483647"
          className="rounded-lg border p-3"
          onChange={() => {
            key.current = null;
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      ) : null}
      <button
        disabled={busy}
        className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit ticket"}
      </button>
    </form>
  );
}
