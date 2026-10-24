import { staffReadPilotRequest } from "@/lib/staff-read-pilot/bridge";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return staffReadPilotRequest(request);
}
