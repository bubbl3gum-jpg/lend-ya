import { randomUUID } from "node:crypto";

// Deliberate allowlists: messages, stacks, causes, queries, meta, URLs and arbitrary
// properties never enter the log. Context must be a static source-code label.
const safeNames = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "DatabaseError",
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientInitializationError",
  "PrismaClientValidationError",
  "PrismaClientRustPanicError",
]);
const safeCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EACCES",
  "ENOENT",
  "23502",
  "23503",
  "23505",
  "40001",
  "40P01",
  "55P03",
  "42P01",
  "42703",
  "53300",
  "57P01",
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1010",
  "P1017",
  "P2002",
  "P2003", "P2010", "P2021", "P2022", "P2028", "P2037", "23514", "28P01", "3D000", "57014",
  "P2024",
  "P2025",
  "P2034",
]);
function ownString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  // Do not execute custom getters, stringify arbitrary objects or traverse causes.
  try {
    const field = Object.getOwnPropertyDescriptor(value, key);
    return field && "value" in field && typeof field.value === "string"
      ? field.value
      : undefined;
  } catch {
    return undefined;
  }
}
export function logOperationalError(context: string, error: unknown) {
  const errorId = randomUUID();
  let name = ownString(error, "name");
  if (!name) {
    try { name = error instanceof Error ? "Error" : "Unknown"; }
    catch { name = "Unknown"; }
  }
  const code = ownString(error, "code");
  const record = {
    event: "operation_failed",
    errorId,
    context: /^[A-Za-z0-9 /_.:[\]-]{1,80}$/.test(context)
      ? context
      : "unknown_operation",
    errorType: safeNames.has(name) ? name : "Unknown",
    code: code && safeCodes.has(code) ? code : "UNCLASSIFIED",
  };
  console.error(JSON.stringify(record));
  return errorId;
}
