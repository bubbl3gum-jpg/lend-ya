import { apiError, readJsonObject } from "@/lib/api-response";
import { parseEmail, parseRequiredString } from "@/lib/api-validation";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body) {
    return apiError("Request body must be a valid JSON object.", 400);
  }

  const contact = parseRequiredString(body.contact, 254);
  if (!contact) {
    return apiError("Provide an email address or phone number.", 400);
  }
  const email = parseEmail(contact);
  const phone = contact.replace(/[\s().-]/g, "");
  const validPhone = /^\+?\d{7,15}$/.test(phone);
  if (!email && !validPhone) {
    return apiError("Provide a valid email address or phone number.", 400);
  }

  return Response.json({
    message: "Password recovery delivery is not configured. In production, instructions would be sent if this address matches an account.",
  });
}