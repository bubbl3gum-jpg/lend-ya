export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
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
  console.error(`[${context}]`, error);
  return apiError("Internal server error", 500);
}