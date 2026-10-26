"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { marketplaceLinks } from "@/lib/marketplace/navigation";
import { HeritageAccountMenu } from "@/components/heritage/account-menu";
import { WheatMark } from "@/components/heritage/experience";
export function MarketplaceNavigation() {
  const pathname = usePathname();
  return (
    <>
      <nav className="heritage-primary-navigation" aria-label="Marketplace">
        {marketplaceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="heritage-mobile-navigation">
        <HeritageAccountMenu
          name="Marketplace"
          triggerLabel="Explore"
          menuTitle="The marketplace"
          navigationLabel="Marketplace"
          closeLabel="Close marketplace navigation"
          links={marketplaceLinks}
        />
      </div>
    </>
  );
}
export function MarketplaceRail() {
  const pathname = usePathname();
  return (
    <aside className="heritage-market-rail">
      <WheatMark />
      <p className="catalogue-eyebrow">
        Lend.
        <br />
        Borrow.
        <br />
        Grow.
      </p>
      <nav aria-label="Marketplace sections">
        {marketplaceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="heritage-rail-note">
        Small things.
        <br />
        Big possibilities.
      </p>
    </aside>
  );
}
