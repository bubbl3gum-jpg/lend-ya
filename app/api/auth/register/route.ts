import { Prisma } from "@prisma/client";
import { apiError, internalServerError, readJsonObject } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseEmail,
  parsePassword,
  parseRequiredString,
} from "@/lib/api-validation";

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

  const name = parseRequiredString(body.name, 120);
  const email = parseEmail(body.email);
  const password = parsePassword(body.password, 8);
  if (!name || !email || !password) {
    return apiError(
      "Provide a name (up to 120 characters), valid email, and password between 8 and 128 characters.",
      400,
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "USER",
        verificationStatus: "UNVERIFIED",
      },
      select: safeUserSelect,
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("An account with this email already exists.", 409);
    }
    return internalServerError("POST /api/auth/register", error);
  }
}