import { readOwnAdminSession } from "@/lib/admin/own-session";
import { apiError, internalServerError } from "@/lib/api-response";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let response: Response;
  try {
    const result = await readOwnAdminSession();
    if (!result.ok)
      response = apiError(
        result.status === 401
          ? "Authentication required."
          : "Administrator permission required.",
        result.status,
      );
    else if (new URL(request.url).search)
      response = apiError("This summary does not accept selectors.", 400);
    else response = Response.json(result.summary);
  } catch (error) {
    response = internalServerError("Admin own-session read", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
