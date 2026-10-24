import { InvestigationContext } from "@/components/admin/investigation-context";
import type { SearchParams } from "@/lib/admin/query";
import { AdminBookingDetail } from "@/components/admin/details";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AdminBookingDetail
      params={params}
      investigationContext={
        <InvestigationContext
          kind="BOOKING"
          recordId={(await params).id}
          searchParams={searchParams}
        />
      }
    />
  );
}
