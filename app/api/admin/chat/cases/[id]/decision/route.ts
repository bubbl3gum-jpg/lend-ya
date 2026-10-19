import { chatApi, integer, json } from "@/lib/chat/http";
import { decide } from "@/lib/chat/moderation";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => decide(u.id,integer((await ctx.params).id),await json(request)),true); }
