import { SiteHeader } from "@/components/site-header";
import { supportCandidatePage } from "@/lib/support-staff-candidate/page";
import { SupportCandidateWorkbench } from "@/components/support-candidate-workbench";
export const dynamic = "force-dynamic";
export default async function Page() {
  await supportCandidatePage("requester");
  return (
    <>
      <SiteHeader />
      <SupportCandidateWorkbench kind="requester" />
    </>
  );
}
