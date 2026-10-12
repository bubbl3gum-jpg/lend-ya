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
              <details className="relative">
                <summary className="cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-white">Account center · {currentUser.name}</summary>
                <div className="absolute right-0 z-50 mt-2 grid w-72 gap-3 rounded-xl border bg-white p-5 shadow-lg">
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/account">Account settings</Link>
                  <Link href={`/profile/${currentUser.id}`}>Public profile view</Link>
                  <Link href="/account/activity">Activity logs</Link>
                  <Link href="/dashboard#listings">My listings</Link>
                  <Link href="/dashboard#borrowings">My borrowings · active &amp; historical</Link>
                  <Link href="/account/verification">Trustworthiness &amp; profile verification</Link>
                </div>
              </details>
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
