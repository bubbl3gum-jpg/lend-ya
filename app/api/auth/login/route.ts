import { authenticationLimit } from "@/lib/auth-rate-limit";
import {
  apiError,
  internalServerError,
  readJsonObject,
} from "@/lib/api-response";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseEmail, parsePassword } from "@/lib/api-validation";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  verificationStatus: true,
  createdAt: true,
} as const;

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body) {
    return apiError("Request body must be a valid JSON object.", 400);
  }

  const email = parseEmail(body.email);
  const password = parsePassword(body.password, 1);
  if (!email || !password) {
    return apiError("Provide a valid email and password.", 400);
  }

  try {
    const limited = await authenticationLimit("login", email);
    if (limited) return limited;
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...safeUserSelect, passwordHash: true },
    });

    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? `scrypt$unregistered-account$${"0".repeat(128)}`,
    );
    if (!user || !valid) {
      return apiError("Invalid email or password.", 401);
    }

    await createSession(user.id);
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return internalServerError("POST /api/auth/login", error);
  }
}
