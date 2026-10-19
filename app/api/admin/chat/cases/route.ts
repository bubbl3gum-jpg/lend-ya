import { chatApi, page, integer } from "@/lib/chat/http";
import { queue } from "@/lib/chat/moderation";
export async function GET(request: Request) { return chatApi(async (u) => { const { params, limit } = page(request,["before","limit"]); return queue(u.id,limit,params.has("before") ? integer(params.get("before")) : undefined); },true); }
