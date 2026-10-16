/** Prisma's pg adapter wraps raw row-lock conflicts (P2010) differently from writes (P2034). */
export function isSerializationConflict(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 8) return false;
  const value = error as Record<string, unknown>;
  if (
    value.code === "P2034" ||
    value.code === "40001" ||
    value.originalCode === "40001"
  )
    return true;
  return [value.cause, value.meta, value.driverAdapterError].some((cause) =>
    isSerializationConflict(cause, depth + 1),
  );
}
