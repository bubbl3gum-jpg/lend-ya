import { AdminCaseDirectory } from "@/components/admin/cases";
import type { SearchParams } from "@/lib/admin/query";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <AdminCaseDirectory kind="reports" searchParams={searchParams} />;
}
