"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categoryDetailFields, listingCategories, type ListingCategory } from "@/lib/listing-options";

type Station = { id: number; code: string; name: string };

type CreateListingFormProps = {
  stations: Station[];
};

export function CreateListingForm({ stations }: CreateListingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ListingCategory>(listingCategories[0]);
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("150.00");
  const [deposit, setDeposit] = useState("500.00");
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleStation(stationId: number) {
    setSelectedStations((current) =>
      current.includes(stationId)
        ? current.filter((id) => id !== stationId)
        : [...current, stationId],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (photos.length === 0) {
        throw new Error("Upload at least one item photo before publishing.");
      }
      if (selectedStations.length === 0) {
        throw new Error("Select at least one pickup station.");
      }

      const payload = new FormData();
      payload.set("title", title);
      payload.set("description", description);
      payload.set("category", category);
      payload.set("condition", condition);
      payload.set("price", price);
      payload.set("deposit", deposit);
      payload.set("stationIds", JSON.stringify(selectedStations));
      for (const field of categoryDetailFields[category]) {
        payload.set(`detail_${field.key}`, categoryDetails[field.key] ?? "");
      }
      photos.forEach((photo) => payload.append("photos", photo));
      if (video) payload.set("video", video);

      const response = await fetch("/api/listings", {
        method: "POST",
        body: payload,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to create listing.");
      }

      router.push(`/listings/${result.listing.id}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Listing title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Category
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ListingCategory);
              setCategoryDetails({});
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none"
          >
            {listingCategories.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Price
          <input
            type="number"
            min="1"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

          <label className="block text-sm font-medium text-slate-700">
            Deposit
            <input type="number" min="0" step="0.01" value={deposit} onChange={(event) => setDeposit(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none" />
          </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Condition
          <input
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Describe the item's condition, age, size and dimensions, included accessories, and technical specifications. Mention any wear or limitations a renter should know about."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-emerald-500 focus:outline-none"
            required
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">Include condition, age, dimensions, accessories, and technical specifications where relevant.</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {categoryDetailFields[category].map((field) => (
          <label key={field.key} className="block text-sm font-medium text-slate-700">
            {field.label}
            <input value={categoryDetails[field.key] ?? ""} onChange={(event) => setCategoryDetails((current) => ({ ...current, [field.key]: event.target.value }))} maxLength={180} placeholder={field.placeholder} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Item photos <span className="text-rose-700">Required</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={(event) => setPhotos(Array.from(event.target.files ?? []))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-100 file:px-3 file:py-1.5 file:font-medium file:text-emerald-900" />
          <span className="mt-1 block text-xs font-normal text-slate-500">JPEG, PNG, or WebP. Up to 8 photos, 10 MB each.</span>
          {photos.length > 0 ? <span className="mt-1 block text-xs font-normal text-slate-600">{photos.length} photo{photos.length === 1 ? "" : "s"} selected</span> : null}
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Item video <span className="font-normal text-slate-500">Optional</span>
          <input type="file" accept="video/mp4,video/webm" onChange={(event) => setVideo(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-medium file:text-slate-800" />
          <span className="mt-1 block text-xs font-normal text-slate-500">MP4 or WebM, up to 30 MB.</span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Pickup stations</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {stations.map((station) => (
            <label key={station.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" checked={selectedStations.includes(station.id)} onChange={() => toggleStation(station.id)} />
              {station.name}
            </label>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Publishing..." : "Publish listing"}
      </button>
    </form>
  );
}
