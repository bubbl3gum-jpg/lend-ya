import Link from "next/link";
import { T } from "@/components/i18n/locale";
import { HeritageAccountMenu } from "@/components/heritage/account-menu";
import { HeritageSurface } from "@/components/heritage/experience";
import { MarketplaceNavigation } from "@/components/marketplace/navigation";
import { readLocale } from "@/lib/i18n/server";
import { MarketplaceHeaderFrame } from "@/components/marketplace/navigation";
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
    <MarketplaceHeaderFrame
      railNavigation={railNavigation}
      suspended={currentUser?.accountStatus === "SUSPENDED"}
    >
      <div className="heritage-navigation-controls flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-medium">
        <MarketplaceNavigation />
        {currentUser ? (
          <>
            <HeritageAccountMenu
              name={currentUser.name}
              actions={<LogoutButton />}
              links={[
                ...(currentUser.role === "ADMIN"
                  ? [{ href: "/admin", label: "nav.admin" as const }]
                  : []),
                { href: "/dashboard", label: "nav.dashboard" as const },
                ...(chatAvailable(currentUser.id)
                  ? [{ href: "/messages", label: "nav.messages" as const }]
                  : []),
                { href: "/account", label: "nav.settings" as const },
                {
                  href: `/profile/${currentUser.id}`,
                  label: "nav.profile" as const,
                },
                { href: "/account/activity", label: "nav.activity" as const },
                {
                  href: "/dashboard#listings",
                  label: "nav.myListings" as const,
                },
                {
                  href: "/dashboard#borrowings",
                  label: "nav.borrowings" as const,
                },
                {
                  href: "/account/verification",
                  label: "nav.trust" as const,
                },
                {
                  href: "/#experience-preferences",
                  label: "nav.preferences" as const,
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
              <T id="nav.login" />
            </Link>
            <Link className="heritage-auth-link" href="/register">
              <T id="nav.signup" />
            </Link>
          </>
        )}
      </div>
    </MarketplaceHeaderFrame>
  );
  return catalogue ? (
    header
  ) : (
    <HeritageSurface
      chromeOnly
      initialTheme={await readAppearance()}
      initialLocale={await readLocale()}
    >
      {header}
    </HeritageSurface>
  );
}
