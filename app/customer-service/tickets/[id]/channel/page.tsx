import { ownChannel } from "@/lib/support/channels";
import { TicketShell, failTicketPage } from "@/components/support-ticket-pages";
import { SupportRequesterChannel } from "@/components/support-requester-channel";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = (await params).id;
  let channel: Awaited<ReturnType<typeof ownChannel>>;
  try {
    channel = await ownChannel(id);
  } catch (e) {
    failTicketPage(e);
  }
  if (Object.keys(await searchParams).length)
    return (
      <TicketShell title="Requester-only test channel">
        <p role="alert">Unknown channel parameters.</p>
      </TicketShell>
    );
  return (
    <TicketShell title="Requester-only test channel">
      <SupportRequesterChannel
        ticketId={id}
        initialChannel={
          channel
            ? { ...channel, createdAt: channel.createdAt.toISOString() }
            : null
        }
      />
    </TicketShell>
  );
}
