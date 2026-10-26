import { readLocale } from "@/lib/i18n/server";
import { readAppearance } from "@/lib/heritage/appearance";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { AccountShell } from "@/components/account-shell";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <AccountShell
      initialTheme={await readAppearance()}
      initialLocale={await readLocale()}
      header={<SiteHeader catalogue />}
    >
      {children}
    </AccountShell>
  );
}
