import {studioApi} from "@/lib/item-studio/service";
export const dynamic="force-dynamic";
export async function GET(request:Request){return studioApi(request);}
export async function POST(request:Request){return studioApi(request);}
