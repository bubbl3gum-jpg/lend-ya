import { adminMutation, moderateListing } from "@/lib/admin/mutations";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminMutation(request, async (adminId, body) =>
    moderateListing((await params).id, adminId, body),
  );
}
