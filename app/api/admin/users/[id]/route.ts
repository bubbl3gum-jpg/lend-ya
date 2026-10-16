import { adminApi, AdminInputError } from "@/lib/admin/auth";
import { adminRecordId } from "@/lib/admin/query";
import { getAdminUser } from "@/lib/admin/data";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminApi(async () => {
    const record = await getAdminUser(adminRecordId((await params).id));
    if (!record) throw new AdminInputError("Record not found.", 404);
    return { record };
  });
}
