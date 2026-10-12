import type { Prisma } from "@prisma/client";
// Optional structured evidence is stored only when the stage is submitted.
// Counterparty confirmation certifies the immutable submitted evidence.
export function parseEvidence(body: Record<string, unknown>): { photos?: Prisma.InputJsonValue; checklist?: Prisma.InputJsonValue } | null {
 const result: { photos?: Prisma.InputJsonValue; checklist?: Prisma.InputJsonValue } = {};
 if (body.photos !== undefined) {
  if (!Array.isArray(body.photos) || body.photos.length > 8 || !body.photos.every(url => typeof url === "string" && /^https:\/\/[^\s]+$/.test(url) && url.length <= 1000)) return null;
  result.photos = body.photos;
 }
 if (body.checklist !== undefined) {
  if (!body.checklist || typeof body.checklist !== "object" || Array.isArray(body.checklist)) return null;
  const entries = Object.entries(body.checklist);
  if (entries.length > 20 || !entries.every(([key,value]) => key.length > 0 && key.length <= 100 && typeof value === "boolean")) return null;
  result.checklist = body.checklist as Record<string, boolean>;
 }
 return result;
}
