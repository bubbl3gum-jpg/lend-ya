import { adminApi } from "@/lib/admin/auth";
import { caseDirectory } from "@/lib/admin/cases";
export function GET(request: Request) {
  return adminApi(() =>
    caseDirectory("disputes", new URL(request.url).searchParams),
  );
}
