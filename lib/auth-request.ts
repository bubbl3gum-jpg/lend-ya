import { apiError } from "@/lib/api-response";

export function authenticationRequestError(request: Request): Response | null {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return apiError("Use application/json.", 415);
  return null;
}
