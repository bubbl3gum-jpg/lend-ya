import { companionApi } from "@/lib/assistant/server";
export const dynamic="force-dynamic";
export async function POST(request:Request){return companionApi(request);}
