import Link from "next/link";
import { passkeyPilotAvailable } from "@/lib/passkey-pilot";
import { requireAdminPage } from "@/lib/admin/auth";
import {
  AdminNavigation,
  AdminBreadcrumbs,
} from "@/components/admin/navigation";
import { LogoutButton } from "@/components/logout-button";
export const metadata = { title: "Hustlen’ · Admin Control Center" };
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  const passkeyPilot = await passkeyPilotAvailable();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-emerald-600 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-emerald-600">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to main content
      </a>
      <aside className="bg-slate-950 p-5 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto">
        <Link href="/admin" className="text-xl font-semibold">
          Hustlen’ Admin
        </Link>
        <p className="mb-8 mt-2 text-xs text-slate-400">Control Center</p>
        <div className="hidden lg:block">
          <AdminNavigation passkeyPilot={passkeyPilot} />
        </div>
        <details className="lg:hidden">
          <summary className="mb-3 cursor-pointer rounded-xl border border-slate-700 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
            Admin navigation
          </summary>
          <AdminNavigation passkeyPilot={passkeyPilot} />
        </details>
        <Link href="/" className="mt-6 block text-sm text-slate-400">
          Open marketplace
        </Link>
      </aside>
      <div className="min-w-0 lg:ml-64">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b bg-white px-5 py-4 sm:px-8">
          <AdminBreadcrumbs />
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="max-w-full break-words text-sm">
              {admin.name} · Administrator
            </span>
            <LogoutButton />
          </div>
        </header>
        <main
          id="admin-content"
          tabIndex={-1}
          className="mx-auto min-w-0 max-w-7xl p-5 sm:p-8 lg:p-8 xl:p-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
