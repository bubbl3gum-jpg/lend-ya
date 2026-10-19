import { chatApi, json, page, integer, fail } from "@/lib/chat/http";
import { sendMessage, history } from "@/lib/chat/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, ctx: Context) { return chatApi(async (u) => { const { params, limit } = page(request,["after","before","limit"]); if (params.has("after") && params.has("before")) fail(400,"INVALID_INPUT","Use after or before, not both."); return history(u.id,integer((await ctx.params).id),limit,params.has("after") ? integer(params.get("after"),0) : undefined,params.has("before") ? integer(params.get("before")) : undefined); }); }
export async function POST(request: Request, ctx: Context) { return chatApi(async (u) => sendMessage(u.id,integer((await ctx.params).id),await json(request))); }
