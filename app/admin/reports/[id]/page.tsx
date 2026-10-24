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
      kind="reports"
      params={params}
      investigationContext={
        <InvestigationContext
          kind="REPORT"
          recordId={(await params).id}
          searchParams={searchParams}
        />
      }
    />
  );
}
