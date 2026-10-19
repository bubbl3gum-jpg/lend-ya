import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { chatAvailable } from "@/lib/chat/config";
import { SiteHeader } from "@/components/site-header";
import { Inbox } from "@/components/chat/participant";
export default async function Page() {
  const user=await getCurrentUser();if(!user)redirect("/login");
  return <main><SiteHeader/><div className="mx-auto max-w-4xl space-y-5 p-6"><h1 className="text-3xl font-semibold">Messages</h1>{chatAvailable(user.id)?<Inbox/>:<p>Private chat is disabled pending acceptance and policy review. Existing rental controls remain available from your dashboard.</p>}</div></main>;
}
