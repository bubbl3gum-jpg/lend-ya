import { apiError, internalServerError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("Authentication required.", 401);
    }

    return Response.json({ user });
  } catch (error) {
    return internalServerError("GET /api/auth/me", error);
  }
}