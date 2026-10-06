import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-semibold text-slate-900">MRT Market</Link>

        <div className="flex items-center gap-2 text-sm font-medium">
          <Link href="/listings" className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-slate-100">Browse</Link>
          <Link href="/customer-service" className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-slate-100">Customer service</Link>

          {currentUser ? (
            <>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                Signed in: {currentUser.name}
              </span>
              <Link href="/dashboard" className="rounded-full bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700">Dashboard</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:bg-slate-50">Log in</Link>
              <Link href="/register" className="rounded-full bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
