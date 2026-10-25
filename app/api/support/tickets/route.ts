import { ticketApi } from "@/lib/support/tickets";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return ticketApi(request);
}
export async function POST(request: Request) {
  return ticketApi(request);
}
