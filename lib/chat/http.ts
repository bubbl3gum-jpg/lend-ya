import { logOperationalError } from "../operational-error";
import { getCurrentUser } from "@/lib/auth";
import { readJsonObject } from "@/lib/api-response";
import { isSerializationConflict } from "@/lib/database-conflicts";
import { chatAvailable } from "./config";
export class ChatError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function fail(status: number, code: string, message: string): never { throw new ChatError(status, code, message); }
export function integer(value: unknown, minimum = 1): number {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < minimum || n > 2147483647) fail(400, "INVALID_INPUT", "Invalid integer.");
  return n;
}
export function fields(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some((key) => !allowed.includes(key))) fail(400, "INVALID_INPUT", "Unexpected input field.");
}
export function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(400, "INVALID_INPUT", `Text must contain 1–${max} characters.`);
  return value.trim();
}
export function explanation(value: unknown, max: number): string {
  const result=text(value,max);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(result)) fail(400,"INVALID_INPUT","Control characters are not accepted in explanations.");
  return result;
}
export async function json(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") fail(415, "INVALID_INPUT", "Use application/json.");
  const body = await readJsonObject(request);
  if (!body) fail(400, "INVALID_INPUT", "Provide a JSON object of at most 32 KB.");
  return body;
}
export function page(request: Request, allowed: string[]) {
  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) fail(400, "INVALID_INPUT", "Unknown or repeated query parameter.");
  const limit = params.has("limit") ? integer(params.get("limit")) : 20;
  if (limit > 50) fail(400, "INVALID_INPUT", "Page limit is 50.");
  return { params, limit };
}
export async function chatApi(run: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<unknown>, admin = false) {
  let response: Response;
  try {
    const user = await getCurrentUser();
    if (!user) fail(401, "AUTH_REQUIRED", "Authentication required.");
    if (admin && (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")) fail(403, "REVIEWER_REQUIRED", "Active administrator permission required.");
    if (!admin && !chatAvailable(user.id)) fail(503, "CHAT_DISABLED", "Private chat is not enabled for this account.");
    response = Response.json(await run(user));
  } catch (error) {
    if (error instanceof ChatError) response = Response.json({ error: error.message, code: error.code, ...(error.code === "MESSAGE_REJECTED" ? { outcome: "REJECTED" } : {}) }, { status: error.status });
    else if (isSerializationConflict(error) || (error && typeof error === "object" && "code" in error && ["P2002", "P2003"].includes(String(error.code)))) response = Response.json({ error: "Record changed concurrently. Retry with the same request key.", code: "RETRY_CONFLICT" }, { status: 409 });
    else {
      // Prisma error objects may contain query parameters/private text. Never log them here.
      logOperationalError("chat.request", error);
      response = Response.json({ error: "Chat request could not be completed.", code: "INTERNAL_ERROR" }, { status: 500 });
    }
  }
  response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Vary", "Cookie");
  return response;
}
