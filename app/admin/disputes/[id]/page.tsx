import { AdminCaseDetail } from "@/components/admin/cases";
import { InvestigationContext } from "@/components/admin/investigation-context";
import type { SearchParams } from "@/lib/admin/query";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AdminCaseDetail
      kind="disputes"
      params={params}
      historySearchParams={searchParams}
      investigationContext={
        <InvestigationContext
          kind="DISPUTE"
          recordId={(await params).id}
          searchParams={searchParams}
        />
      }
    />
  );
}
