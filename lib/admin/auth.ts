import "server-only";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { apiError, internalServerError } from "@/lib/api-response";
export class AdminInputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE") notFound();
  return user;
}
export async function adminApi(
  read: () => Promise<unknown>,
): Promise<Response> {
  let response: Response;
  try {
    const user = await getCurrentUser();
    if (!user) response = apiError("Authentication required.", 401);
    else if (user.role !== "ADMIN" || user.accountStatus !== "ACTIVE")
      response = apiError("Administrator permission required.", 403);
    else response = Response.json(await read());
  } catch (error) {
    response =
      error instanceof AdminInputError
        ? apiError(error.message, error.status)
        : internalServerError("Admin read request", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
