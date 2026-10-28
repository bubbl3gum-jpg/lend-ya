import { identityApi } from "@/lib/identity/service";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return identityApi(request); }
export async function POST(request: Request) { return identityApi(request); }
