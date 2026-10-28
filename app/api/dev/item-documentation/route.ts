import { documentationApi } from "@/lib/item-documentation/service";
export const dynamic="force-dynamic";
export async function GET(request:Request){return documentationApi(request);}
export async function POST(request:Request){return documentationApi(request);}
