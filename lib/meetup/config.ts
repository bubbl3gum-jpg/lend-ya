export function previewParticipant(userId: number) {
  return (process.env.MEETUP_PREVIEW_USER_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Number.isSafeInteger)
    .includes(userId);
}
export function secret() {
  const value = process.env.MEETUP_CODE_SECRET;
  if (!value || value.length < 32)
    throw Error(
      "Meetup preview requires a server-side secret of at least 32 characters",
    );
  return value;
}
export function ttlSeconds() {
  const n = Number(process.env.MEETUP_CHALLENGE_TTL_SECONDS ?? 180);
  if (!Number.isInteger(n) || n < 30 || n > 300)
    throw Error("Invalid challenge validity configuration");
  return n;
}
export function checkInTtlSeconds() {
  const n = Number(process.env.MEETUP_CHECKIN_TTL_SECONDS ?? 600);
  if (!Number.isInteger(n) || n < 60 || n > 1800)
    throw Error("Invalid check-in validity configuration");
  return n;
}
