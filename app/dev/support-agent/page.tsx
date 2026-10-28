import { SiteHeader } from "@/components/site-header";
import { supportCandidatePage } from "@/lib/support-staff-candidate/page";
import { SupportCandidateWorkbench } from "@/components/support-candidate-workbench";
import { companionEnabled } from "@/lib/assistant/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  await supportCandidatePage("staff");
  return (
    <>
      <SiteHeader />
      <SupportCandidateWorkbench kind="staff" companionAvailable={companionEnabled()} />
    </>
  );
}
