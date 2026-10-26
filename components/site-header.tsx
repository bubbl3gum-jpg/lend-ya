import Link from "next/link";
import { HeritageAccountMenu } from "@/components/heritage/account-menu";
import { HeritageSurface, WheatMark } from "@/components/heritage/experience";
import { MarketplaceNavigation } from "@/components/marketplace/navigation";
import { readAppearance } from "@/lib/heritage/appearance";
import { chatAvailable } from "@/lib/chat/config";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// `catalogue` means an existing HeritageSurface owns this header; standalone callers get only themed chrome.
export async function SiteHeader({
  catalogue = false,
  railNavigation = false,
}: { catalogue?: boolean; railNavigation?: boolean } = {}) {
  const currentUser = await getCurrentUser();
  const header = (
    <header
      className={
        railNavigation
          ? "catalogue-masthead heritage-has-rail"
          : "catalogue-masthead"
      }
    >
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
        aria-label="Hustlen’ site header"
      >
        <Link
          href="/"
          className="heritage-home-brand"
          aria-label="Hustlen’ home"
        >
          <WheatMark className="heritage-brand-mark" />
          <span>
            Hustlen’<small>Lend. Borrow. Grow.</small>
          </span>
        </Link>
        <div className="heritage-navigation-controls flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-medium">
          <MarketplaceNavigation />
          {currentUser ? (
            <>
              <HeritageAccountMenu
                name={currentUser.name}
                actions={<LogoutButton />}
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
                  {
                    href: "/#experience-preferences",
                    label: "Appearance & sound",
                  },
                ]}
              />
              <div className="heritage-header-logout">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link className="heritage-auth-link" href="/login">
                Log in
              </Link>
              <Link className="heritage-auth-link" href="/register">
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
  return catalogue ? (
    header
  ) : (
    <HeritageSurface chromeOnly initialTheme={await readAppearance()}>
      {header}
    </HeritageSurface>
  );
}
