export type BookingPolicy = { maxDurationDays: number; maxNotesUnits: number };

export class BookingPolicyError extends Error {}

/** Server-only settings; import the type, not the resolver, in client modules. */
export function resolveBookingPolicy(
  env: Record<string, string | undefined>,
): BookingPolicy {
  function limit(name: string, fallback: number, maximum: number) {
    const raw = env[name];
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value) || value > maximum)
      throw new BookingPolicyError(`${name} must be an integer from 1 to ${maximum}.`);
    return value;
  }
  return {
    maxDurationDays: limit("BOOKING_MAX_DURATION_DAYS", 90, 365),
    maxNotesUnits: limit("BOOKING_MAX_NOTES_UNITS", 2000, 10000),
  };
}

/** Raw UTF-16 length is checked before trimming for storage/hash compatibility. */
export function bookingPolicyError(
  start: Date, end: Date, notes: unknown, policy: BookingPolicy, now: number,
): string | null {
  if (start.getTime() <= now) return "Start time must be in the future.";
  if (end <= start) return "The booking end date must be after the start date.";
  if (end.getTime() - start.getTime() > policy.maxDurationDays * 86400000)
    return `Maximum rental duration is ${policy.maxDurationDays} days.`;
  if (notes !== undefined && (typeof notes !== "string" || notes.length > policy.maxNotesUnits))
    return `Notes must be text of at most ${policy.maxNotesUnits} UTF-16 units.`;
  return null;
}
