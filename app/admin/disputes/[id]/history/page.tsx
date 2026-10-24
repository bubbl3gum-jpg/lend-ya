import { CaseHistoryView } from "@/components/admin/case-history";
import type { SearchParams } from "@/lib/admin/query";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CaseHistoryView
      kind="DISPUTE"
      id={(await params).id}
      searchParams={searchParams}
    />
  );
}
