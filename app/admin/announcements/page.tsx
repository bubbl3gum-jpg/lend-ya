import { requireAdminPage } from "@/lib/admin/auth";
import {
  announcementDirectory,
  candidateAvailable,
} from "@/lib/announcements/service";
import { AnnouncementWorkspace } from "@/components/admin/announcements";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireAdminPage();
  return (
    <AnnouncementWorkspace
      rows={JSON.parse(JSON.stringify(await announcementDirectory()))}
      candidate={await candidateAvailable()}
    />
  );
}
