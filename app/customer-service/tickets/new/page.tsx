import {
  requireTicketPage,
  TicketShell,
} from "@/components/support-ticket-pages";
import { SupportTicketForm } from "@/components/support-ticket-form";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requireTicketPage();
  return (
    <TicketShell title="Create support ticket">
      <SupportTicketForm />
    </TicketShell>
  );
}
