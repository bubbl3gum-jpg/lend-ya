export const CAMERA_DIAGNOSTIC_STAGES = [
  "start",
  "invalidated",
  "frame-error",
  "decoded",
  "stale-callback",
  "decoder-imported",
  "decoder-initialized",
  "verify-request",
  "verified",
  "challenge-rejected",
  "initialization-error",
  "frame",
  "native-decoded",
  "half-attempt",
  "half-decoded",
  "rotate-attempt",
  "rotate-decoded",
  "track-interrupted",
] as const;
export const CAMERA_DIAGNOSTIC_CATEGORIES = [
  "NotFoundException",
  "ChecksumException",
  "FormatException",
  "ReferenceError",
  "TypeError",
  "NotAllowedError",
  "NotReadableError",
  "NotFoundError",
  "AbortError",
  "SecurityError",
  "booking-stage",
  "format",
  "booking",
  "purpose",
  "Unknown",
] as const;
/** Explicit development test observer only; arbitrary values cannot enter diagnostics. */
export function cameraDiagnostic(stage: string, category?: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_HUSTLEN_CAMERA_DIAGNOSTICS !== "owned-test" ||
    !(CAMERA_DIAGNOSTIC_STAGES as readonly string[]).includes(stage)
  )
    return;
  const safeCategory =
    category &&
    (CAMERA_DIAGNOSTIC_CATEGORIES as readonly string[]).includes(category)
      ? category
      : category
        ? "Unknown"
        : undefined;
  window.dispatchEvent(
    new CustomEvent("hustlen-camera-diagnostic", {
      detail: { stage, ...(safeCategory ? { category: safeCategory } : {}) },
    }),
  );
}
export function cameraErrorCategory(error: unknown) {
  if (!error || typeof error !== "object") return "Unknown";
  // ZXing's explicit kind survives minification; constructor names need not.
  let kind: unknown;
  try {
    if ("getKind" in error && typeof error.getKind === "function")
      kind = error.getKind();
  } catch {}
  const candidates = [
    kind,
    (error as { name?: unknown }).name,
    error.constructor?.name,
  ];
  return (
    candidates.find(
      (value): value is (typeof CAMERA_DIAGNOSTIC_CATEGORIES)[number] =>
        typeof value === "string" &&
        (CAMERA_DIAGNOSTIC_CATEGORIES as readonly string[]).includes(value),
    ) ?? "Unknown"
  );
}
