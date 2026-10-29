import {recoveryApi} from "@/lib/recovery-room/service";
export const dynamic="force-dynamic";
export async function GET(r:Request){return recoveryApi(r);}
export async function POST(r:Request){return recoveryApi(r);}
