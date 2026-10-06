import { internalServerError } from "@/lib/api-response";
import { deleteCurrentSession } from "@/lib/auth";

export async function POST(): Promise<Response> {
  try {
    await deleteCurrentSession();
    return Response.json({ success: true });
  } catch (error) {
    return internalServerError("POST /api/auth/logout", error);
  }
}