import { adminApi, AdminInputError } from "@/lib/admin/auth";
import { adminRecordId } from "@/lib/admin/query";
import { caseDetail } from "@/lib/admin/cases";
export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminApi(async () => {
    const record = await caseDetail(
      "disputes",
      adminRecordId((await params).id),
    );
    if (!record) throw new AdminInputError("Case not found.", 404);
    return { record };
  });
}
