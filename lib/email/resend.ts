import type { EmailMessage } from "./templates";

export type DeliveryResult =
  | { outcome: "accepted"; providerId: string }
  | { outcome: "temporary" | "permanent" | "unavailable"; code: string; retryAfterMs?: number };

/** All errors are mapped to fixed codes. Provider messages may contain recipients or links. */
export async function sendWithResend(
  apiKey: string, jobId: string, message: EmailMessage, fetcher: typeof fetch = fetch,
): Promise<DeliveryResult> {
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `hustlen-email/${jobId}` },
      body: JSON.stringify(message),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      if (typeof body?.id === "string" && /^[a-f0-9-]{36}$/i.test(body.id)) return { outcome: "accepted", providerId: body.id };
      return { outcome: "temporary", code: "INVALID_PROVIDER_RESPONSE" };
    }
    const retryHeader = response.headers.get("retry-after");
    const retrySeconds = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : null;
    const retryDate = retryHeader ? Date.parse(retryHeader) : NaN;
    const retryAfterMs = retrySeconds !== null ? Math.min(retrySeconds * 1000, 86_400_000)
      : Number.isFinite(retryDate) ? Math.min(Math.max(retryDate - Date.now(), 0), 86_400_000) : undefined;
    if (response.status === 401 || (response.status === 403 && ["restricted_api_key", "invalid_permission", "suspended_api_key"].includes(body?.name))) {
      return { outcome: "unavailable", code: "PROVIDER_AUTH", retryAfterMs: 300_000 };
    }
    if (response.status === 429) return { outcome: "unavailable", code: "PROVIDER_LIMIT", retryAfterMs: Math.max(retryAfterMs ?? 60_000, 60_000) };
    if (response.status >= 500) return { outcome: "unavailable", code: "PROVIDER_UNAVAILABLE", retryAfterMs: 30_000 };
    if (response.status === 408 || (response.status === 409 && body?.name === "concurrent_idempotent_requests")) {
      return { outcome: "temporary", code: "PROVIDER_BUSY", retryAfterMs };
    }
    return { outcome: "permanent", code: "PROVIDER_REJECTED" };
  } catch {
    return { outcome: "unavailable", code: "PROVIDER_NETWORK", retryAfterMs: 30_000 };
  }
}
