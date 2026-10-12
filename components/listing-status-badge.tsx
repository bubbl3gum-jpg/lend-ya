import type { ListingAvailability } from "@/lib/listing-status";

const badgeStyle: Record<ListingAvailability, { label: string; className: string }> = {
  AVAILABLE: { label: "Available", className: "bg-emerald-100 text-emerald-800" },
  RENTED: { label: "Rented", className: "bg-amber-100 text-amber-900" },
  FLAGGED: { label: "Flagged", className: "bg-rose-100 text-rose-800" },
};

export function ListingStatusBadge({ status }: { status: ListingAvailability }) {
  const badge = badgeStyle[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}