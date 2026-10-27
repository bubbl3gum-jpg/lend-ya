import { readJsonObject, internalServerError } from "@/lib/api-response";
import {
  changePassword,
  passwordChangeActor,
  PasswordChangeError,
} from "@/lib/password-change/service";
import { passwordChangeConfig } from "@/lib/password-change/config";
function reply(code: string, status: number) {
  return Response.json(
    { code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(status === 429 ? { "Retry-After": "900" } : {}),
      },
    },
  );
}
export async function POST(request: Request) {
  try {
    let config;
    try {
      config = passwordChangeConfig();
    } catch {
      return reply("UNAVAILABLE", 404);
    }
    if (
      request.headers.get("origin") !== config.origin ||
      new URL(request.url).origin !== config.origin ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("x-hustlen-password-change") !== "1"
    )
      return reply("ORIGIN", 403);
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
    )
      return reply("INPUT", 415);
    if (new URL(request.url).search) return reply("INPUT", 400);
    await passwordChangeActor();
    await changePassword(await readJsonObject(request));
    return Response.json(
      { changed: true, reauthenticationRequired: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof PasswordChangeError)
      return reply(error.code, error.status);
    const response = internalServerError("POST account/password", error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
