export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    v,
  );
export type Command = {
  action: "CREATE" | "EDIT" | "PUBLISH" | "WITHDRAW" | "ARCHIVE";
  requestId: string;
  id?: string;
  version?: number;
  title?: string;
  body?: string;
  startsAt?: string;
  expiresAt?: string;
};
export function parseCommand(input: Record<string, unknown>): Command {
  const action = input.action;
  if (
    typeof action !== "string" ||
    !["CREATE", "EDIT", "PUBLISH", "WITHDRAW", "ARCHIVE"].includes(
      String(action),
    ) ||
    !uuid(input.requestId)
  )
    throw Error("Invalid action or request identifier.");
  const content = action === "CREATE" || action === "EDIT",
    window = action === "PUBLISH";
  const allowed = [
    "action",
    "requestId",
    ...(action === "CREATE" ? [] : ["id", "version"]),
    ...(content ? ["title", "body"] : []),
    ...(window ? ["startsAt", "expiresAt"] : []),
  ];
  if (Object.keys(input).some((k) => !allowed.includes(k)))
    throw Error("Unknown announcement field.");
  if (
    action !== "CREATE" &&
    (!uuid(input.id) ||
      !Number.isSafeInteger(input.version) ||
      Number(input.version) < 1)
  )
    throw Error("Invalid announcement revision.");
  if (content)
    for (const [key, max] of [
      ["title", 120],
      ["body", 4000],
    ] as const) {
      const v = input[key];
      if (
        typeof v !== "string" ||
        !v.trim() ||
        v.length > max ||
        /[\u0000-\u0008\u000b-\u001f\u007f<>]/.test(v)
      )
        throw Error(
          "Use bounded plain text without markup or control characters.",
        );
    }
  if (window) {
    for (const k of ["startsAt", "expiresAt"])
      if (
        typeof input[k] !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(
          input[k] as string,
        ) ||
        !Number.isFinite(Date.parse(input[k] as string)) ||
        new Date(input[k] as string).getUTCFullYear() < 2000 ||
        new Date(input[k] as string).getUTCFullYear() > 2100 ||
        new Date(input[k] as string).toISOString().replace(".000Z", "Z") !==
          (input[k] as string).replace(".000Z", "Z")
      )
        throw Error(
          "Use explicit UTC publication times between years 2000 and 2100 (test policy).",
        );
    if (
      Date.parse(input.expiresAt as string) <=
        Date.parse(input.startsAt as string) ||
      Date.parse(input.expiresAt as string) -
        Date.parse(input.startsAt as string) >
        31 * 86400000
    )
      throw Error(
        "Publication window must be positive and at most 31 days (test policy).",
      );
  }
  return Object.fromEntries(
    allowed.filter((k) => input[k] !== undefined).map((k) => [k, input[k]]),
  ) as Command;
}
export function displayState(
  row: { state: string; startsAt: Date | null; expiresAt: Date | null },
  now: Date,
) {
  if (row.state !== "PUBLISHED") return row.state;
  return row.startsAt! > now
    ? "SCHEDULED"
    : row.expiresAt! <= now
      ? "EXPIRED"
      : "ACTIVE";
}
