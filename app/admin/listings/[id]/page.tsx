import { AdminListingDetail } from "@/components/admin/details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminListingDetail params={params} />;
}
