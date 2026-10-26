import { labApi } from "@/lib/geofencing-lab/service";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> },
) {
  return labApi(request, (await params).operation);
}
