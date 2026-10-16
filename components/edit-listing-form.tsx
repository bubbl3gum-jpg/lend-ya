"use client";
import { MRTStationSelector } from "./mrt/MRTStationSelector";
import type { DatabaseStation } from "@/lib/mrt/network";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  listingCategories,
  categoryDetailFields,
  type ListingCategory,
} from "@/lib/listing-options";
type Editable = {
  id: number;
  title: string;
  description: string;
  condition: string;
  price: string;
  deposit: string;
  status: string;
  category: string;
  categoryDetails: unknown;
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
  const router = useRouter(),
    [category, setCategory] = useState(listing.category as ListingCategory),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const details =
    listing.categoryDetails && typeof listing.categoryDetails === "object"
      ? (listing.categoryDetails as Record<string, string>)
      : {};
  return (
    <form
      className="grid min-w-0 gap-4 rounded-xl bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const values = new FormData(e.currentTarget);
        const categoryDetails = Object.fromEntries(
          (categoryDetailFields[category] ?? []).map((f) => [
            f.key,
            values.get(`detail_${f.key}`),
          ]),
        );
        try {
          const r = await fetch(`/api/listings/${listing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: values.get("title"),
                description: values.get("description"),
                condition: values.get("condition"),
                price: Number(values.get("price")),
                deposit:
                  values.get("deposit") === ""
                    ? null
                    : Number(values.get("deposit")),
                status: values.get("status"),
                category,
                categoryDetails,
                stationIds,
              }),
            }),
            data = await r.json();
          if (!r.ok) throw new Error(data.error);
          router.push(`/listings/${listing.id}`);
          router.refresh();
        } catch (error) {
          setError(error instanceof Error ? error.message : "Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {(["title", "description", "condition", "price", "deposit"] as const).map(
        (field) => (
          <label key={field} className="grid min-w-0 gap-1 capitalize">
            {field}
            {field === "description" ? (
              <textarea
                name={field}
                defaultValue={listing[field]}
                required
                maxLength={5000}
                className="min-w-0 rounded border p-2"
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
                className="min-w-0 rounded border p-2"
              />
            )}
          </label>
        ),
      )}
      <label className="grid min-w-0 gap-1">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ListingCategory)}
          className="min-w-0 rounded border p-2"
        >
          {listingCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {(categoryDetailFields[category] ?? []).map((field) => (
        <label key={`${category}-${field.key}`} className="grid gap-1">
          {field.label}
          <input
            name={`detail_${field.key}`}
            defaultValue={
              category === listing.category ? (details[field.key] ?? "") : ""
            }
            maxLength={180}
            className="min-w-0 rounded border p-2"
          />
        </label>
      ))}
      <MRTStationSelector
        mode="owner"
        stations={stations}
        selectedIds={stationIds}
        onChange={setStationIds}
      />
      <label>
        Status
        <select
          name="status"
          defaultValue={listing.status}
          className="ml-2 rounded border p-2"
        >
          <option>ACTIVE</option>
          <option>INACTIVE</option>
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      ) : null}
      <button disabled={busy} className="rounded bg-emerald-700 p-3 text-white">
        {busy ? "Saving…" : "Save listing"}
      </button>
    </form>
  );
}
