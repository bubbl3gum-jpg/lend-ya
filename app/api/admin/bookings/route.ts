import { adminApi } from "@/lib/admin/auth";
import { parseAdminQuery } from "@/lib/admin/query";
import { getAdminDirectory } from "@/lib/admin/data";
export async function GET(request: Request) {
  return adminApi(async () =>
    getAdminDirectory(
      "bookings",
      parseAdminQuery(new URL(request.url).searchParams, "bookings"),
    ),
  );
}
