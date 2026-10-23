import { getCurrentUser } from "@/lib/auth";
import { parsePathId } from "@/lib/api-validation";
import { readJsonObject } from "@/lib/api-response";
import { RentalError } from "@/lib/rental-errors";
import { isSerializationConflict } from "@/lib/database-conflicts";
import {
  status,
  enroll,
  checkIn,
  acknowledgeFallback,
  issue,
  verify,
  receiveReturn,
  assistance,
  temporaryLocation,
} from "@/lib/meetup/service";
async function route(
  request: Request,
  params: Promise<{ id: string; operation: string }>,
) {
  let response: Response;
  try {
    const user = await getCurrentUser();
    if (!user) throw new RentalError("Authentication required.", 401);
    const { id: raw, operation } = await params,
      id = parsePathId(raw);
    if (id === null) throw new RentalError("Invalid booking ID.", 400);
    if (request.method === "GET") {
      if (operation !== "status")
        throw new RentalError("Unknown meetup operation.", 404);
      response = Response.json(await status(id, user.id));
    } else {
      if (
        request.headers.get("content-type")?.split(";")[0] !==
        "application/json"
      )
        throw new RentalError("Use JSON for verification requests.", 415);
      const body = await readJsonObject(request);
      if (!body)
        throw new RentalError("Provide a JSON object of at most 32 KB.", 400);
      const handlers: Record<
        string,
        (
          id: number,
          uid: number,
          body: Record<string, unknown>,
        ) => Promise<object>
      > = {
        "test-location": temporaryLocation,
        assistance,
        enroll,
        checkin: checkIn,
        fallback: acknowledgeFallback,
        issue,
        verify,
        receipt: receiveReturn,
      };
      const handler = Object.hasOwn(handlers, operation)
        ? handlers[operation]
        : null;
      if (!handler) throw new RentalError("Unknown meetup operation.", 404);
      const result = await handler(id, user.id, body);
      response =
        "failure" in result
          ? Response.json(
              { error: result.failure },
              { status: "status" in result ? Number(result.status) : 409 },
            )
          : Response.json(result);
    }
  } catch (error) {
    if (error instanceof RentalError)
      response = Response.json(
        { error: error.message },
        { status: error.status },
      );
    else if (isSerializationConflict(error))
      response = Response.json(
        {
          error:
            "Booking changed concurrently; retry with the same request key.",
        },
        { status: 409 },
      );
    else {
      console.error("[meetup] request failed; private details omitted");
      response = Response.json(
        {
          error:
            "Meetup verification unavailable. Your existing evidence is preserved; request assistance.",
        },
        { status: 503 },
      );
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; operation: string }> },
) {
  return route(request, params);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; operation: string }> },
) {
  return route(request, params);
}
