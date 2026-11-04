/** Legacy/local rental clock. Never use this permissive parser for new booking API writes. */
export function parseRentalTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      value,
    );
  if (!match) return null;
  const [, y, m, d, h, min, sec = "0", fraction = "", zone = "+08:00"] = match;
  const parts = [y, m, d, h, min, sec].map(Number);
  if (
    +y < 2000 ||
    +y > 9999 ||
    +m < 1 ||
    +m > 12 ||
    +d < 1 ||
    +h > 23 ||
    +min > 59 ||
    +sec > 59
  )
    return null;
  const wall = new Date(
    Date.UTC(
      parts[0],
      parts[1] - 1,
      parts[2],
      parts[3],
      parts[4],
      parts[5],
      Number(fraction.padEnd(3, "0")),
    ),
  );
  if (wall.getUTCMonth() !== +m - 1 || wall.getUTCDate() !== +d) return null;
  const offset =
    zone === "Z"
      ? 0
      : (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6))) *
        (zone[0] === "+" ? 1 : -1);
  if (zone !== "Z" && (+zone.slice(1, 3) > 23 || +zone.slice(4, 6) > 59))
    return null;
  return new Date(wall.getTime() - offset * 60000);
}
export function rentalDays(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

/** Explicit instants only; precision is bounded to PostgreSQL/JS milliseconds. */
export function parseBookingInstant(value: unknown): Date | null {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      value.endsWith("-00:00")) return null;
  const result = parseRentalTime(value);
  return result && result.getUTCFullYear() >= 2000 && result.getUTCFullYear() <= 9999 ? result : null;
}

/** datetime-local always denotes Taipei wall time, never the device's zone. */
export function taipeiInputInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) return null;
  return parseBookingInstant(`${value}+08:00`)?.toISOString() ?? null;
}
/** Display parsing is independent of new-booking policy, including year limits. */
function rentalDisplayInstant(value: unknown): Date | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? new Date(time) : null;
  }
  if (typeof value !== "string" || value.endsWith("-00:00")) return null;
  const match = /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || match[1] === "-000000") return null;
  const [, y, m, d, h, min, sec = "0", fraction = "", zone] = match;
  if (+m < 1 || +m > 12 || +d < 1 || +h > 23 || +min > 59 || +sec > 59) return null;
  // setUTCFullYear avoids Date.UTC's special 1900 mapping for years 00–99.
  const wall = new Date(0);
  wall.setUTCFullYear(+y, +m - 1, +d);
  wall.setUTCHours(+h, +min, +sec, Number(fraction.padEnd(3, "0")));
  if (wall.getUTCFullYear() !== +y || wall.getUTCMonth() !== +m - 1 || wall.getUTCDate() !== +d) return null;
  if (zone !== "Z" && (+zone.slice(1, 3) > 23 || +zone.slice(4, 6) > 59)) return null;
  const offset = zone === "Z" ? 0 :
    (+zone.slice(1, 3) * 60 + +zone.slice(4, 6)) * (zone[0] === "+" ? 1 : -1);
  const instant = new Date(wall.getTime() - offset * 60000);
  return Number.isFinite(instant.getTime()) ? instant : null;
}

/** Never interpret unzoned strings, mutate a Date, or throw on malformed history. */
export function formatRentalTime(
  value: unknown,
  locale: "en" | "en-US" | "en-GB" | "zh-TW" = "en-US",
  precision: "minute" | "second" = "minute",
): string {
  const unavailable = locale === "zh-TW" ? "時間無法顯示" : "Time unavailable";
  try {
    const date = rentalDisplayInstant(value);
    if (!date) return unavailable;
    const language = locale === "en" ? "en-GB" : locale;
    const text = new Intl.DateTimeFormat(language, {
      timeZone: "Asia/Taipei",
      ...(date.getUTCFullYear() <= 0 ? {
        year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        ...(precision === "second" ? { second: "2-digit" } : {}), era: "short",
      } : { dateStyle: "medium", timeStyle: precision === "second" ? "medium" : "short" }),
    }).format(date);
    const zone = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei", timeZoneName: "longOffset", hour: "numeric",
    }).formatToParts(date).find(part => part.type === "timeZoneName")?.value;
    if (!zone) return unavailable;
    return `${text} (Asia/Taipei, ${zone.replace(/^GMT/, "UTC")})`;
  } catch {
    return unavailable;
  }
}
