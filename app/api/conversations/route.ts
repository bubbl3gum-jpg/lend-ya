import { chatApi, json, page } from "@/lib/chat/http";
import { createConversation, inbox } from "@/lib/chat/service";
export async function GET(request: Request) { return chatApi(async (u) => { const { params, limit } = page(request,["before","limit"]); return inbox(u.id,limit,params.get("before") ?? undefined); }); }
export async function POST(request: Request) { return chatApi(async (u) => createConversation(u.id,await json(request))); }
