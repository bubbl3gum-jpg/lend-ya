import { requireAdminPage } from "@/lib/admin/auth";
import { ChatQueue } from "@/components/chat/reviewer";
export default async function Page(){await requireAdminPage();return <ChatQueue/>;}
