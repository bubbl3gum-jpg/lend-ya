import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonObject, internalServerError } from "@/lib/api-response";
export async function PATCH(request: Request) {
 const user = await getCurrentUser(); if (!user) return apiError("Authentication required.", 401);
 const body = await readJsonObject(request);
 if (!body || typeof body.name !== "string" || !body.name.trim() || body.name.length > 100) return apiError("Name must contain 1–100 characters.", 400);
 try { await prisma.user.update({ where: { id: user.id }, data: { name: body.name.trim() } }); return Response.json({ saved: true }); } catch (error) { return internalServerError("PATCH account", error); }
}
