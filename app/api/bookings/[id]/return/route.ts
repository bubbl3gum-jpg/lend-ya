import { rentalStageRoute } from "@/lib/rental-route";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return rentalStageRoute(request, params, "return");
}
