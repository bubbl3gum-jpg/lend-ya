import { channelApi } from "@/lib/support/channels";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return channelApi(request, "channel", (await params).id);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return channelApi(request, "channel", (await params).id);
}
