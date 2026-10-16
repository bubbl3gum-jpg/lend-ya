import { AdminUserDetail } from "@/components/admin/details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminUserDetail params={params} />;
}
