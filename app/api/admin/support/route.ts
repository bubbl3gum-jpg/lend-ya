import { adminApi } from "@/lib/admin/auth";
import { getSupportWorkspace } from "@/lib/admin/support";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminApi(() => getSupportWorkspace(new URL(request.url).searchParams));
}
