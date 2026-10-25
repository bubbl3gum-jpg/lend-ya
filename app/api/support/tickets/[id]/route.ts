import { ticketApi } from "@/lib/support/tickets";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return ticketApi(request, (await params).id);
}
