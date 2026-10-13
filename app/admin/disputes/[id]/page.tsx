import { AdminCaseDetail } from "@/components/admin/cases";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <AdminCaseDetail kind="disputes" params={params} />;
}
