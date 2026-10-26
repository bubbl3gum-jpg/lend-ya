import Link from "next/link";
import { HeritageAccountMenu } from "@/components/heritage/account-menu";
import { WheatMark } from "@/components/heritage/experience";
import { chatAvailable } from "@/lib/chat/config";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader({
  catalogue = false,
}: { catalogue?: boolean } = {}) {
  const currentUser = await getCurrentUser();

  return (
    <header
      className={
        catalogue
          ? "catalogue-masthead"
          : "border-b border-slate-200 bg-white/90 backdrop-blur-sm"
      }
    >
      <nav className="mx-auto flex flex-wrap max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-semibold text-slate-900">
          {catalogue ? (
            <>
              <WheatMark className="heritage-brand-mark" />
              <span>
                Hustlen’<small>Lend. Borrow. Grow.</small>
              </span>
            </>
          ) : (
            "MRT Market"
          )}
        </Link>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-medium">
          <Link
            href="/listings"
            className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-slate-100"
          >
            Browse
          </Link>
          <Link
            href="/customer-service"
            className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-slate-100"
          >
            Customer service
          </Link>

          {currentUser ? (
            <>
              {catalogue ? (
                <HeritageAccountMenu
                  name={currentUser.name}
                  links={[
                    ...(currentUser.role === "ADMIN"
                      ? [{ href: "/admin", label: "Admin Desktop" }]
                      : []),
                    { href: "/dashboard", label: "Dashboard" },
                    ...(chatAvailable(currentUser.id)
                      ? [{ href: "/messages", label: "Messages" }]
                      : []),
                    { href: "/account", label: "Account settings" },
                    {
                      href: `/profile/${currentUser.id}`,
                      label: "Public profile view",
                    },
                    { href: "/account/activity", label: "Activity logs" },
                    { href: "/dashboard#listings", label: "My listings" },
                    {
                      href: "/dashboard#borrowings",
                      label: "My borrowings · active & historical",
                    },
                    {
                      href: "/account/verification",
                      label: "Trustworthiness & profile verification",
                    },
                  ]}
                />
              ) : (
                <details className="relative">
                  <summary className="cursor-pointer max-w-[calc(100vw-3rem)] break-words rounded-full bg-slate-900 px-4 py-2 text-white">
                    Account center · {currentUser.name}
                  </summary>
                  <div className="absolute right-0 z-50 mt-2 grid w-full sm:w-72 max-w-[calc(100vw-3rem)] gap-3 rounded-xl border bg-white p-5 shadow-lg">
                    {currentUser.role === "ADMIN" ? (
                      <Link href="/admin">Admin Desktop</Link>
                    ) : null}
                    <Link href="/dashboard">Dashboard</Link>
                    {chatAvailable(currentUser.id) && (
                      <Link href="/messages">Messages</Link>
                    )}
                    <Link href="/account">Account settings</Link>
                    <Link href={`/profile/${currentUser.id}`}>
                      Public profile view
                    </Link>
                    <Link href="/account/activity">Activity logs</Link>
                    <Link href="/dashboard#listings">My listings</Link>
                    <Link href="/dashboard#borrowings">
                      My borrowings · active &amp; historical
                    </Link>
                    <Link href="/account/verification">
                      Trustworthiness &amp; profile verification
                    </Link>
                  </div>
                </details>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:bg-slate-50"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
      {currentUser?.accountStatus === "SUSPENDED" ? (
        <p
          role="status"
          className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900"
        >
          Your account is suspended. New listings, bookings, approvals and
          reviews are restricted. You can still view existing rentals, return
          items, inspect returns and submit disputes or safety reports.
        </p>
      ) : null}
    </header>
  );
}
