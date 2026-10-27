"use client";
import { useLocale } from "@/components/i18n/locale";
import { formatMoney } from "@/lib/i18n/core";
import { categoryLabel } from "@/lib/i18n/listings";
import { DiscoveryPending } from "@/components/i18n/discovery";
import Image from "next/image";
import Link from "next/link";
import { ListingReportButton } from "@/components/listing-report-button";
import { ListingStatusBadge } from "@/components/listing-status-badge";
import type { ListingAvailability } from "@/lib/listing-status";

export type ListingCardData = {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  availability: ListingAvailability;
  pickupStations: string[];
  photoUrl: string | null;
};

export function ListingCard({
  listing,
  compact = false,
}: {
  listing: ListingCardData;
  compact?: boolean;
}) {
  const { locale, t } = useLocale();
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300">
      <Link
        href={`/listings/${listing.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <DiscoveryPending />
        <div
          className={`relative overflow-hidden bg-slate-100 ${compact ? "aspect-[16/9]" : "aspect-[4/3]"}`}
        >
          {listing.photoUrl ? (
            <Image
              src={listing.photoUrl}
              alt={listing.title}
              fill
              sizes={
                compact
                  ? "(max-width: 768px) 100vw, 40vw"
                  : "(max-width: 768px) 100vw, 33vw"
              }
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#e7f3ee_0%,#f0f4f1_50%,#e8eef0_100%)] text-sm font-medium text-slate-500">
              {t("listing.photo")}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-emerald-800">
                {categoryLabel(locale, listing.category)}
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900">
                {listing.title}
              </h2>
            </div>
            <ListingStatusBadge status={listing.availability} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            {listing.description}
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-lg font-semibold text-slate-900">
              {formatMoney(locale, listing.price)}
            </span>
            <span className="text-sm text-slate-600">{t("listing.day")}</span>
          </div>
          {!compact ? (
            <p className="mt-2 text-xs text-slate-500">{listing.condition}</p>
          ) : null}
          {listing.pickupStations.length > 0 ? (
            <p className="mt-2 line-clamp-1 text-xs text-slate-500">
              {t("listing.pickup", {
                stations: listing.pickupStations.join(", "),
              })}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="px-4 pb-3">
        <ListingReportButton listingId={listing.id} />
      </div>
    </article>
  );
}
