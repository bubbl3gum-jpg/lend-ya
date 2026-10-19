import { chatApi, integer, json } from "@/lib/chat/http";
import { coordination } from "@/lib/chat/service";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => coordination(u.id,integer((await ctx.params).id),await json(request))); }
