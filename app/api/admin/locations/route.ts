import { adminApi } from "@/lib/admin/auth";
import { getAdminLocations } from "@/lib/admin/locations";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminApi(() => getAdminLocations(new URL(request.url).searchParams));
}
