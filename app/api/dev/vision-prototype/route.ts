import {reviewApi} from "@/lib/vision-prototype/review-server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:Request){return reviewApi(request);}
