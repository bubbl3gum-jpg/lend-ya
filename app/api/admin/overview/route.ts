import { adminApi } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/admin/data";
export async function GET() {
  return adminApi(getAdminOverview);
}
