import { InvestigationContext } from "@/components/admin/investigation-context";
import type { SearchParams } from "@/lib/admin/query";
import { AdminListingDetail } from "@/components/admin/details";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AdminListingDetail
      params={params}
      investigationContext={
        <InvestigationContext
          kind="LISTING"
          recordId={(await params).id}
          searchParams={searchParams}
        />
      }
    />
  );
}
