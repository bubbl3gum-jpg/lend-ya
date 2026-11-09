import { authenticationRequestError } from "@/lib/auth-request";
import { apiError, readJsonObject } from "@/lib/api-response";
import { parseEmail } from "@/lib/api-validation";
import { prisma } from "@/lib/prisma";
import { readEmailConfig } from "@/lib/email/config";
import { emailDeliveryAvailable, queueRecoveryRequest } from "@/lib/email/outbox";
import { normalizeRecoveryIp, recoveryConfirmation } from "@/lib/password-recovery";
import { randomInt } from "node:crypto";

export async function POST(request: Request): Promise<Response> {
  const invalidRequest = authenticationRequestError(request);
  if (invalidRequest) return invalidRequest;
  const startedAt = performance.now();
  const body = await readJsonObject(request);
  if (!body) {
    return apiError("Request body must be a valid JSON object.", 400);
  }

  // Retain contact compatibility until the dedicated page replaces the dialog.
  const email = parseEmail(body.email ?? body.contact);
  if (!email) {
    return apiError("Provide a valid email address.", 400);
  }

  const unavailable = () => Response.json(
    { error: "Account recovery email delivery is not available yet. Please try again later." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
  try {
    const config = readEmailConfig();
    // Availability is platform-wide, checked before looking up any account.
    if (!config || !(await emailDeliveryAvailable(prisma))) return unavailable();
    // Without a configured trusted proxy, local development shares one conservative IP bucket.
    const ipAddress = config.clientIpHeader
      ? normalizeRecoveryIp(request.headers.get(config.clientIpHeader) ?? "") : "127.0.0.1";
    if (!ipAddress) return unavailable();
    await queueRecoveryRequest(prisma, config, { email, ipAddress });
    // Mask routine lookup/enqueue timing differences; no provider call is on this request path.
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 250 + randomInt(75) - (performance.now() - startedAt))));
    return Response.json({ message: recoveryConfirmation }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[POST /api/auth/forgot-password] Recovery request could not be queued.");
    return unavailable();
  }
}
