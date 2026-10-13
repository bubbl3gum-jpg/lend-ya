import { adminMutation, moderateUser } from "@/lib/admin/mutations";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminMutation(request, async (adminId, body) =>
    moderateUser((await params).id, adminId, body),
  );
}
