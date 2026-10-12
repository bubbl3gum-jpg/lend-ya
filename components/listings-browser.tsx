"use client";

import { useState } from "react";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

type Props = {
  listings: ListingCardData[];
  categories: string[];
  stations: string[];
};

export function ListingsBrowser({ listings, categories, stations }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [station, setStation] = useState("ALL");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = listings.filter((listing) => {
    const matchesQuery = !normalizedQuery || [listing.title, listing.description, listing.category]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesCategory = category === "ALL" || listing.category === category;
    const matchesStatus = status === "ALL" || listing.availability === status;
    const matchesStation = station === "ALL" || listing.pickupStations.includes(station);
    return matchesQuery && matchesCategory && matchesStatus && matchesStation;
  });

  return (
    <>
      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(10rem,0.7fr))]">
        <label className="text-sm font-medium text-slate-700">
          Search items
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or keywords" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
            <option value="ALL">All categories</option>
            {categories.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
            <option value="ALL">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="RENTED">Rented</option>
            <option value="FLAGGED">Flagged</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Pickup station
          <select value={station} onChange={(event) => setStation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
            <option value="ALL">All stations</option>
            {stations.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-slate-600" aria-live="polite">{filtered.length} {filtered.length === 1 ? "listing" : "listings"}</p>
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      ) : (
        <p className="border-t border-slate-200 py-8 text-slate-600">No listings match these filters.</p>
      )}
    </>
  );
}