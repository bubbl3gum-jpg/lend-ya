import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { chatAvailable } from "@/lib/chat/config";
import { integer } from "@/lib/chat/http";
import { SiteHeader } from "@/components/site-header";
import { ConversationView } from "@/components/chat/participant";
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const user=await getCurrentUser();if(!user)redirect("/login");
  return <main><SiteHeader/><div className="mx-auto max-w-4xl p-6">{chatAvailable(user.id)?<ConversationView id={integer((await params).id)} userId={user.id}/>:<p>Private chat is disabled for this account.</p>}</div></main>;
}
