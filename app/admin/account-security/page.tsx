import { notFound, redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { readOwnAdminSession } from "@/lib/admin/own-session";
import {
  AdminPanel,
  AdminTitle,
  DetailFields,
  StatusBadge,
} from "@/components/admin/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Security overview · Hustlen’ Admin" };

const sessionTime = (value: string) => (
  <time dateTime={value}>
    {new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone: "UTC",
    }).format(new Date(value))}
  </time>
);

export default async function OwnSessionSecurityPage() {
  await requireAdminPage();
  const result = await readOwnAdminSession();
  if (!result.ok) {
    if (result.status === 401) redirect("/login");
    notFound();
  }
  const summary = result.summary;
  return (
    <>
      <AdminTitle
        title="Security overview"
        description="Authentication information for your current Admin session only."
      />
      <div className="space-y-6">
        <AdminPanel title="Your current session">
          <DetailFields
            fields={[
              [
                "Session status",
                <StatusBadge key="status" status={summary.status} />,
              ],
              ["Authentication", "Legacy Admin sign-in"],
              ["Session created", sessionTime(summary.createdAt)],
              ["Session expires", sessionTime(summary.expiresAt)],
            ]}
          />
          <p className="mt-5 text-sm text-slate-600">
            Times are shown in UTC. Status was validated when this page loaded;
            it does not extend your session.
          </p>
          <a
            className="mt-3 inline-block rounded text-sm font-medium text-emerald-800 underline underline-offset-4"
            href="/admin/account-security"
          >
            Reload session status
          </a>
        </AdminPanel>
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <AdminPanel title="Optional passkey verification">
            <p className="font-medium text-slate-900">
              Passkey status unavailable here
            </p>
            <p className="mt-2 text-sm text-slate-600">
              This overview cannot confirm passkey enrollment or verification.
              Signing in as an Admin does not establish passkey verification.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Passkey management remains a separate controlled development
              pilot. Enrollment, verification, revocation and recovery are not
              available on this page.
            </p>
          </AdminPanel>
          <AdminPanel title="Future staff authorization">
            <p className="text-sm text-slate-600">
              Legacy Admin authentication, optional passkey verification and
              future staff permissions are separate. This overview does not
              issue staff memberships, grants or approval authority.
            </p>
          </AdminPanel>
        </div>
      </div>
    </>
  );
}
