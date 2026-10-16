import { adminApi } from "@/lib/admin/auth";
import { caseDirectory } from "@/lib/admin/cases";
export function GET(request: Request) {
  return adminApi(() =>
    caseDirectory("audit-logs", new URL(request.url).searchParams),
  );
}
