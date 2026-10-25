import { supportCandidateApi } from "@/lib/support-staff-candidate/bridge";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return supportCandidateApi(request, "staff");
}
