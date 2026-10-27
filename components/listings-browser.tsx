"use client";

import { useLocale } from "@/components/i18n/locale";
import { formatNumber } from "@/lib/i18n/core";
import { categoryLabel } from "@/lib/i18n/listings";
import { useState } from "react";
import { ListingCard, type ListingCardData } from "@/components/listing-card";

type Props = {
  listings: ListingCardData[];
  categories: string[];
  stations: string[];
  initialCategory?: string;
};

export function ListingsBrowser({
  listings,
  categories,
  stations,
  initialCategory = "ALL",
}: Props) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState("ALL");
  const [station, setStation] = useState("ALL");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = listings.filter((listing) => {
    const matchesQuery =
      !normalizedQuery ||
      [
        listing.title,
        listing.description,
        listing.category,
        categoryLabel(locale, listing.category),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    const matchesCategory = category === "ALL" || listing.category === category;
    const matchesStatus = status === "ALL" || listing.availability === status;
    const matchesStation =
      station === "ALL" || listing.pickupStations.includes(station);
    return matchesQuery && matchesCategory && matchesStatus && matchesStation;
  });

  return (
    <>
      <div
        id="marketplace-filters"
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(10rem,0.7fr))]"
      >
        <label className="text-sm font-medium text-slate-700">
          {t("browse.search")}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("browse.placeholder")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t("browse.category")}
          <select
            aria-label={t("browse.category")}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="ALL">{t("browse.allCategories")}</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {categoryLabel(locale, entry)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t("browse.status")}
          <select
            aria-label={t("browse.status")}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="ALL">{t("browse.allStatuses")}</option>
            <option value="AVAILABLE">{t("listing.available")}</option>
            <option value="RENTED">{t("listing.rented")}</option>
            <option value="FLAGGED">{t("listing.flagged")}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t("browse.station")}
          <select
            aria-label={t("browse.station")}
            value={station}
            onChange={(event) => setStation(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <option value="ALL">{t("browse.allStations")}</option>
            {stations.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-slate-600" aria-live="polite">
        {t(filtered.length === 1 ? "browse.countOne" : "browse.countMany", {
          count: formatNumber(locale, filtered.length),
        })}
      </p>
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="border-t border-slate-200 py-8 text-slate-600">
          {t("browse.empty")}
        </p>
      )}
    </>
  );
}
