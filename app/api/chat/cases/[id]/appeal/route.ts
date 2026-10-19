import { chatApi, integer, json } from "@/lib/chat/http";
import { appeal } from "@/lib/chat/service";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => appeal(u.id,integer((await ctx.params).id),await json(request))); }
