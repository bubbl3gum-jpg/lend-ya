import { adminApi } from "@/lib/admin/auth";
import { getCaseHistory } from "@/lib/admin/case-history";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminApi(async () =>
    getCaseHistory(
      "DISPUTE",
      (await params).id,
      new URL(request.url).searchParams,
    ),
  );
}
