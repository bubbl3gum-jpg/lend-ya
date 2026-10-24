import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { passkeyPilotAvailable } from "@/lib/passkey-pilot";
import { AdminTitle } from "@/components/admin/ui";
import { AdminPasskeys } from "@/components/admin/passkeys";
export default async function AdminSecurityPage() {
  await requireAdminPage();
  if (!(await passkeyPilotAvailable())) notFound();
  return (
    <>
      <AdminTitle
        title="Security"
        description="Manage your passkeys in Hustlen’s controlled development pilot."
      />
      <AdminPasskeys />
    </>
  );
}
