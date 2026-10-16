"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MRTStationSelector } from "./mrt/MRTStationSelector";
import type { DatabaseStation } from "@/lib/mrt/network";
type Editable = {
  id: number;
  title: string;
  description: string;
  condition: string;
  price: string;
  deposit: string;
  status: string;
  stationIds: number[];
};
export function EditListingForm({
  listing,
  stations,
}: {
  listing: Editable;
  stations: DatabaseStation[];
}) {
  const [stationIds, setStationIds] = useState(listing.stationIds);
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4 rounded-xl bg-white p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const values = new FormData(event.currentTarget);
        try {
          const response = await fetch(`/api/listings/${listing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stationIds,
              title: values.get("title"),
              description: values.get("description"),
              condition: values.get("condition"),
              price: Number(values.get("price")),
              deposit:
                values.get("deposit") === ""
                  ? null
                  : Number(values.get("deposit")),
              status: values.get("status"),
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          router.push(`/listings/${listing.id}`);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {(["title", "description", "condition", "price", "deposit"] as const).map(
        (field) => (
          <label key={field} className="grid gap-1 capitalize">
            {field}
            {field === "description" ? (
              <textarea
                name={field}
                defaultValue={listing[field]}
                required
                maxLength={5000}
                className="rounded border p-2"
              />
            ) : (
              <input
                name={field}
                defaultValue={listing[field]}
                required={field !== "deposit"}
                type={
                  field === "price" || field === "deposit" ? "number" : "text"
                }
                min={field === "price" ? "0.01" : "0"}
                step="0.01"
                maxLength={200}
                className="rounded border p-2"
              />
            )}
          </label>
        ),
      )}
      <label>
        Status{" "}
        <select
          name="status"
          defaultValue={listing.status}
          className="rounded border p-2"
        >
          <option>ACTIVE</option>
          <option>INACTIVE</option>
        </select>
      </label>
      <MRTStationSelector
        mode="owner"
        stations={stations}
        selectedIds={stationIds}
        onChange={setStationIds}
      />
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      <button disabled={busy} className="rounded bg-emerald-700 p-3 text-white">
        {busy ? "Saving…" : "Save listing"}
      </button>
    </form>
  );
}
