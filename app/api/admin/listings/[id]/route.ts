import { adminApi, AdminInputError } from "@/lib/admin/auth";
import { adminRecordId } from "@/lib/admin/query";
import { getAdminListing } from "@/lib/admin/data";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminApi(async () => {
    const record = await getAdminListing(adminRecordId((await params).id));
    if (!record) throw new AdminInputError("Record not found.", 404);
    return { record };
  });
}
