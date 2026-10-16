/** MVP rental clock: Asia/Taipei (UTC+08:00), maximum 90 elapsed days. */
export const MAX_RENTAL_DAYS = 90;
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
export function formatRentalTime(date: Date | string) {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date)) + " (Asia/Taipei)"
  );
}
