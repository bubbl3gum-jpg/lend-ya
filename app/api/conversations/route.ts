import { chatApi, json, page, integer } from "@/lib/chat/http";
import { createConversation, inbox } from "@/lib/chat/service";
export async function GET(request: Request) { return chatApi(async (u) => { const { params, limit } = page(request,["before","limit"]); return inbox(u.id,limit,params.has("before") ? integer(params.get("before")) : undefined); }); }
export async function POST(request: Request) { return chatApi(async (u) => createConversation(u.id,await json(request))); }
