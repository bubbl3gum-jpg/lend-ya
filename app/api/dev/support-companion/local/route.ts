import { localInferenceApi } from "@/lib/local-inference/server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:Request){return localInferenceApi(request);}
