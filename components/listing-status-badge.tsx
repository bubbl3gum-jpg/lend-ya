"use client";
import { useLocale } from "@/components/i18n/locale";
import type { MessageId } from "@/lib/i18n/catalogues";
import type { ListingAvailability } from "@/lib/listing-status";

const badgeStyle: Record<
  ListingAvailability,
  { label: MessageId; className: string }
> = {
  AVAILABLE: {
    label: "listing.available",
    className: "bg-emerald-100 text-emerald-800",
  },
  RENTED: { label: "listing.rented", className: "bg-amber-100 text-amber-900" },
  FLAGGED: { label: "listing.flagged", className: "bg-rose-100 text-rose-800" },
};

export function ListingStatusBadge({
  status,
}: {
  status: ListingAvailability;
}) {
  const { t } = useLocale();
  const badge = badgeStyle[status];
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
    >
      {t(badge.label)}
    </span>
  );
}
