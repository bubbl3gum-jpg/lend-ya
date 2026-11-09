import { authenticationRequestError } from "@/lib/auth-request";
import { apiError, readJsonObject } from "@/lib/api-response";
import { clearSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newPasswordRequirements, parseNewPassword } from "@/lib/password";
import { isRecoveryToken, resetRecoveredPassword } from "@/lib/password-recovery";
import { readEmailConfig } from "@/lib/email/config";
import { enqueuePasswordChangedEmail } from "@/lib/email/outbox";

export async function POST(request: Request): Promise<Response> {
  const invalidRequest = authenticationRequestError(request);
  if (invalidRequest) return invalidRequest;
  const body = await readJsonObject(request);
  if (!body) return apiError("Request body must be a valid JSON object.", 400);
  const password = parseNewPassword(body.password);
  if (!password) return apiError(newPasswordRequirements, 400);
  if (body.confirmPassword !== password) return apiError("Passwords must match.", 400);
  const invalidLink = () => Response.json(
    { error: "This password reset link is invalid or has expired. Please request a new link." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
  if (!isRecoveryToken(body.token)) return invalidLink();
  try {
    // A temporarily missing provider key must not prevent a reset or notification enqueue.
    const config = readEmailConfig(process.env, false);
    const result = await resetRecoveredPassword(prisma, body.token, password,
      config ? (transaction, change) => enqueuePasswordChangedEmail(transaction, config, change) : undefined,
    );
    if (!result) return invalidLink();
    await clearSessionCookie();
    return Response.json(
      { message: "Your password has been reset. Please log in with your new password." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Database errors may contain parameters; never log credentials or password hashes.
    console.error("[POST /api/auth/reset-password] Password reset could not be completed.");
    return apiError("Unable to reset your password. Please try again later.", 500);
  }
}
