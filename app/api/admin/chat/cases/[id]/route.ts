import { chatApi, integer } from "@/lib/chat/http";
import { readCase } from "@/lib/chat/moderation";
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) { return chatApi(async (u) => readCase(u.id,integer((await ctx.params).id)),true); }
