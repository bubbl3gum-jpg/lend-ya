import { AdminDirectory } from "@/components/admin/directory";
import type { SearchParams } from "@/lib/admin/query";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <AdminDirectory kind="listings" searchParams={searchParams} />;
}
