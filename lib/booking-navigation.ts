import type { BookingStatus } from "@prisma/client";

// Explicit/exhaustive: disputes and unconfirmed physical returns are still active.
export const bookingGroups: Record<BookingStatus, "active" | "history"> = {
  PENDING: "active",
  CONFIRMED: "active",
  HANDOFF_PENDING: "active",
  IN_USE: "active",
  RETURN_PENDING: "active",
  INSPECTION: "active",
  DISPUTED: "active",
  COMPLETED: "history",
  CANCELLED: "history",
  ADMIN_CLOSED: "history",
};
