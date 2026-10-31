import {translationApi} from "@/lib/translation-sidecar/server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:Request){return translationApi(request);}
