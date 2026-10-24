import { passkeyPilotRequest } from "@/lib/passkey-pilot";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return passkeyPilotRequest(request);
}
export async function POST(request: Request) {
  return passkeyPilotRequest(request);
}
