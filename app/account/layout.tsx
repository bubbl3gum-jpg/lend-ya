import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
 if (!await getCurrentUser()) redirect("/login");
 return <main><SiteHeader /><div className="mx-auto max-w-5xl px-6 py-10"><nav className="mb-6 flex flex-wrap gap-4"><Link href="/account">Settings</Link><Link href="/account/activity">Activity logs</Link><Link href="/account/verification">Trust &amp; verification</Link><Link href="/dashboard">Dashboard</Link></nav>{children}</div></main>;
}
