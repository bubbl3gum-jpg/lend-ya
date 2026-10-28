import {inspectionApi} from "@/lib/inspection/service";
export const dynamic="force-dynamic";
export async function GET(request:Request){return inspectionApi(request);}
export async function POST(request:Request){return inspectionApi(request);}
