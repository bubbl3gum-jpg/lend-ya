import { chatApi, integer, page } from "@/lib/chat/http";
import { ownCases } from "@/lib/chat/service";
export async function GET(request:Request){return chatApi(async u=>{const {params,limit}=page(request,["before","limit"]);return ownCases(u.id,limit,params.has("before")?integer(params.get("before")):undefined);});}
