export const workbenchCategories = {
  BOOKING_CASES: "Booking cases",
  RENTAL_END_PASSED: "Past agreed rental end",
  CUSTODY_REVIEW: "Custody records to check",
  LISTING_REVIEW: "Listing review",
  OPEN_REPORTS: "Open listing reports",
  OPEN_DISPUTES: "Open rental disputes",
} as const;
export type WorkbenchCategory = keyof typeof workbenchCategories;
export const workbenchReasons = {
  DISPUTED_BOOKING_STATE: "Booking has DISPUTED status",
  OPEN_RENTAL_CASE: "Booking has an open rental dispute",
  AGREED_END_PASSED_RETURN_UNCONFIRMED:
    "Agreed rental end passed; physical return is not confirmed",
  HANDOFF_RECORD_INCOMPLETE:
    "State requires bilateral handoff; confirmation record is incomplete",
  RETURN_RECORD_INCOMPLETE: "Return-stage confirmation record is incomplete",
  INSPECTION_RECORD_INCOMPLETE:
    "Completed state has incomplete accepted inspection",
  ADMIN_CLOSED_RETURN_UNCONFIRMED:
    "Administrative closure does not confirm physical return",
  ADMIN_RESTRICTED: "Listing is administratively restricted",
  OPEN_LISTING_REPORT: "Listing has an open report",
  OPEN_REPORT: "Listing report remains OPEN",
  OPEN_DISPUTE: "Rental dispute remains OPEN",
} as const;
export type Reason = keyof typeof workbenchReasons;

export const workbenchCategoryKinds = {
  BOOKING_CASES: "BOOKING",
  RENTAL_END_PASSED: "BOOKING",
  CUSTODY_REVIEW: "BOOKING",
  LISTING_REVIEW: "LISTING",
  OPEN_REPORTS: "REPORT",
  OPEN_DISPUTES: "DISPUTE",
} as const satisfies Record<WorkbenchCategory, string>;
