const rentedBookingStatuses = new Set([
  "HANDOFF_PENDING",
  "IN_USE",
  "RETURN_PENDING",
  "INSPECTION",
]);

export type ListingAvailability = "AVAILABLE" | "RENTED" | "FLAGGED";

export function getListingAvailability(input: {
  bookings: Array<{ status: string }>;
  openReports: Array<unknown>;
}): ListingAvailability {
  if (
    input.openReports.length > 0 ||
    input.bookings.some((booking) => booking.status === "DISPUTED")
  ) {
    return "FLAGGED";
  }

  if (input.bookings.some((booking) => rentedBookingStatuses.has(booking.status))) {
    return "RENTED";
  }

  return "AVAILABLE";
}