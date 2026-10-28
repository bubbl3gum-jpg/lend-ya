import { notFound } from "next/navigation";
import { identitySummary } from "@/lib/identity/service";
import { IdentityWorkspace } from "@/components/identity-workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  let initial;
  try { initial = await identitySummary(); } catch { notFound(); }
  return <IdentityWorkspace initial={initial} />;
}
