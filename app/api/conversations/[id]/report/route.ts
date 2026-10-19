import { chatApi, integer, json } from "@/lib/chat/http";
import { reportContact } from "@/lib/chat/service";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => reportContact(u.id,integer((await ctx.params).id),await json(request))); }
