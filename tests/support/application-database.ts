import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import type { Browser } from "playwright";
/** A random session written directly in the owned DB must be readable by this app before any mutating API request. */
export async function verifyApplicationDatabase(
  browser: Browser,
  prisma: PrismaClient,
  baseURL: string,
  runId: string,
) {
  const nonce = randomBytes(24).toString("hex"),
    token = randomBytes(32).toString("hex");
  const email = `mrt-canary-${runId}-${nonce}@example.test`;
  const user = await prisma.user.create({
    data: {
      name: "MRT database identity canary",
      email,
      passwordHash: "not-a-login-credential",
    },
  });
  const context = await browser.newContext({ baseURL });
  try {
    await prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await context.addCookies([
      {
        name: "p2p_session",
        value: token,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const response = await context.request.get("/api/auth/me");
    assert.equal(
      response.status(),
      200,
      "App database identity check failed. No mutating API tests were started.",
    );
    const body = await response.json();
    assert.equal(body.user.id, user.id, "App uses a different database.");
    assert.equal(body.user.email, email, "App uses a different database.");
  } finally {
    await context.close();
    await prisma.user.delete({ where: { id: user.id, email } });
  }
}
