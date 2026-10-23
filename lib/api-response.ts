import { logOperationalError } from "./operational-error";
import { MarketplaceRestrictionError } from "@/lib/marketplace-permissions";
export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const reader = request.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function readOptionalJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text.trim()) {
      return {};
    }

    const body: unknown = JSON.parse(text);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function internalServerError(context: string, error: unknown): Response {
  if (error instanceof MarketplaceRestrictionError)
    return apiError(error.message, 403);
  const errorId = logOperationalError(context, error);
  const response = apiError("Internal server error", 500);
  response.headers.set("X-Error-Id", errorId);
  return response;
}
