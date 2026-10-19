import { chatApi, integer, json, fields } from "@/lib/chat/http";
import { claim } from "@/lib/chat/moderation";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => { fields(await json(request),[]); return claim(u.id,integer((await ctx.params).id)); },true); }
