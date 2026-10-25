export const ticketCategories = [
  "RENTAL_HANDOFF_RETURN",
  "LISTING_PROBLEM",
  "ACCOUNT_HELP",
  "OTHER_SUPPORT",
] as const;
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export function ticketInput(body: Record<string, unknown>) {
  if (
    Object.keys(body).some(
      (k) =>
        ![
          "categoryCode",
          "subject",
          "description",
          "requestKey",
          "bookingId",
          "listingId",
          "reportId",
          "disputeId",
        ].includes(k),
    )
  )
    throw Error("Unknown ticket field.");
  const text = (key: string, max: number) => {
    const v = body[key];
    if (
      typeof v !== "string" ||
      !v.trim() ||
      v.trim().length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)
    )
      throw Error("Invalid ticket text.");
    return v.trim();
  };
  if (
    !(ticketCategories as readonly unknown[]).includes(body.categoryCode) ||
    !uuid(body.requestKey)
  )
    throw Error("Invalid category or request key.");
  const links = {
    bookingId: null as number | null,
    listingId: null as number | null,
    reportId: null as number | null,
    disputeId: null as number | null,
  };
  for (const k of Object.keys(links) as (keyof typeof links)[])
    if (body[k] !== undefined && body[k] !== null) {
      if (
        typeof body[k] !== "number" ||
        !Number.isInteger(body[k]) ||
        Number(body[k]) < 1 ||
        Number(body[k]) > 2147483647
      )
        throw Error("Invalid related record.");
      links[k] = Number(body[k]);
    }
  if (Object.values(links).filter((v) => v !== null).length > 1)
    throw Error("Choose one primary related record.");
  return {
    categoryCode: body.categoryCode as string,
    subject: text("subject", 120),
    description: text("description", 2000),
    requestKey: body.requestKey,
    ...links,
  };
}
