import { AdminBookingDetail } from "@/components/admin/details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminBookingDetail params={params} />;
}
