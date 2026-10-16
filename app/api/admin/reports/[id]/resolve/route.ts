import { adminMutation, resolveReport } from "@/lib/admin/mutations";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return adminMutation(request, async (adminId, body) =>
    resolveReport((await params).id, adminId, body),
  );
}
