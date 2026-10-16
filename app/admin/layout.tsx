import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import {
  AdminNavigation,
  AdminBreadcrumbs,
} from "@/components/admin/navigation";
import { LogoutButton } from "@/components/logout-button";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="bg-slate-950 p-5 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64">
        <Link href="/admin" className="text-xl font-semibold">
          Lend Ya Admin
        </Link>
        <p className="mb-8 mt-2 text-xs text-slate-400">
          Moderation and investigations
        </p>
        <div className="hidden lg:block">
          <AdminNavigation />
        </div>
        <details className="lg:hidden">
          <summary className="mb-3 cursor-pointer rounded-xl border border-slate-700 px-3 py-2">
            Admin navigation
          </summary>
          <AdminNavigation />
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
        <main className="min-w-0 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
