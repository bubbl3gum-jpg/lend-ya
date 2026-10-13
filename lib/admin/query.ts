import { BookingStatus } from "@prisma/client";
import { parsePathId } from "@/lib/api-validation";
import { AdminInputError } from "@/lib/admin/auth";
export type Directory = "users" | "listings" | "bookings";
export type AdminQuery = {
  page: number;
  pageSize: number;
  q: string;
  role?: "USER" | "ADMIN";
  accountStatus?: "ACTIVE" | "SUSPENDED";
  restricted?: boolean;
  status?: string;
  category?: string;
  ownerId?: number;
  renterId?: number;
};
export type SearchParams = Record<string, string | string[] | undefined>;
export function toSearchParams(params: SearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value))
      value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.set(key, value);
  }
  return query;
}
export function parseAdminQuery(
  params: URLSearchParams,
  kind: Directory,
): AdminQuery {
  const allowed = [
    "q",
    "page",
    "pageSize",
    ...(kind === "users"
      ? ["role", "accountStatus"]
      : kind === "listings"
        ? ["status", "category", "ownerId", "restricted"]
        : ["status", "ownerId", "renterId"]),
  ];
  for (const key of params.keys())
    if (!allowed.includes(key) || params.getAll(key).length !== 1)
      throw new AdminInputError("Unknown or repeated query parameter.");
  const integer = (key: string, fallback: number, maximum: number) => {
    const text = params.get(key);
    if (text === null || text === "") return fallback;
    const value = parsePathId(text);
    if (value === null || value > maximum)
      throw new AdminInputError(`${key} must be between 1 and ${maximum}.`);
    return value;
  };
  const q = (params.get("q") ?? "").trim();
  if (q.length > 120)
    throw new AdminInputError("Search must be 120 characters or fewer.");
  const result: AdminQuery = {
    page: integer("page", 1, 1000000),
    pageSize: integer("pageSize", 20, 100),
    q,
  };
  const role = params.get("role");
  if (role) {
    if (role !== "ADMIN" && role !== "USER")
      throw new AdminInputError("Invalid role filter.");
    result.role = role;
  }
  const accountStatus = params.get("accountStatus");
  if (accountStatus) {
    if (!["ACTIVE", "SUSPENDED"].includes(accountStatus))
      throw new AdminInputError("Invalid account status.");
    result.accountStatus = accountStatus as "ACTIVE" | "SUSPENDED";
  }
  const restricted = params.get("restricted");
  if (restricted) {
    if (!["true", "false"].includes(restricted))
      throw new AdminInputError("Invalid restriction filter.");
    result.restricted = restricted === "true";
  }
  const status = params.get("status");
  if (status) {
    const statuses: string[] =
      kind === "listings"
        ? ["ACTIVE", "INACTIVE"]
        : Object.values(BookingStatus);
    if (!statuses.includes(status))
      throw new AdminInputError("Invalid status filter.");
    result.status = status;
  }
  const category = params.get("category")?.trim();
  if (category) {
    if (category.length > 80)
      throw new AdminInputError("Invalid category filter.");
    result.category = category;
  }
  for (const key of ["ownerId", "renterId"] as const)
    if (params.get(key)) result[key] = integer(key, 1, 2147483647);
  return result;
}
export function adminRecordId(text: string): number {
  const id = parsePathId(text);
  if (id === null)
    throw new AdminInputError("Record ID must be a positive database integer.");
  return id;
}
