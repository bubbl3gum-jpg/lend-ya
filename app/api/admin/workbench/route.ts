import { adminApi } from "@/lib/admin/auth";
import { getOperationsWorkbench } from "@/lib/admin/workbench";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return adminApi(() =>
    getOperationsWorkbench(new URL(request.url).searchParams),
  );
}
