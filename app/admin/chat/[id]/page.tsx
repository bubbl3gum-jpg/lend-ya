import { requireAdminPage } from "@/lib/admin/auth";
import { integer } from "@/lib/chat/http";
import { ChatCase } from "@/components/chat/reviewer";
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminPage();return <ChatCase id={integer((await params).id)}/>;}
