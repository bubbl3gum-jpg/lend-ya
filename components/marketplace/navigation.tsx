"use client";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale";
import { usePathname } from "next/navigation";
import { marketplaceLinks } from "@/lib/marketplace/navigation";
import { HeritageAccountMenu } from "@/components/heritage/account-menu";
import { WheatMark } from "@/components/heritage/experience";
export function MarketplaceNavigation() {
  const pathname = usePathname();
  const { t } = useLocale();
  return (
    <>
      <nav
        className="heritage-primary-navigation"
        aria-label={t("nav.marketplace")}
      >
        {marketplaceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {t(link.label)}
          </Link>
        ))}
      </nav>
      <div className="heritage-mobile-navigation">
        <HeritageAccountMenu
          name="Marketplace"
          triggerLabel="nav.explore"
          menuTitle="nav.marketTitle"
          navigationLabel="nav.marketplace"
          closeLabel="nav.closeMarket"
          links={marketplaceLinks}
        />
      </div>
    </>
  );
}
export function MarketplaceRail() {
  const pathname = usePathname();
  const { t } = useLocale();
  return (
    <aside className="heritage-market-rail">
      <WheatMark />
      <p className="catalogue-eyebrow">
        {t("home.lend")}
        <br />
        {t("home.borrow")}
        <br />
        {t("home.grow")}
      </p>
      <nav aria-label={t("nav.sections")}>
        {marketplaceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {t(link.label)}
          </Link>
        ))}
      </nav>
      <p className="heritage-rail-note">
        {t("nav.small")}
        <br />
        {t("nav.possibilities")}
      </p>
    </aside>
  );
}

export function MarketplaceHeaderFrame({
  children,
  railNavigation,
  suspended,
}: {
  children: React.ReactNode;
  railNavigation: boolean;
  suspended: boolean;
}) {
  const { locale, t } = useLocale();
  return (
    <header
      lang={locale}
      className={
        railNavigation
          ? "catalogue-masthead heritage-has-rail"
          : "catalogue-masthead"
      }
    >
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
        aria-label={t("nav.site")}
      >
        <Link
          href="/"
          className="heritage-home-brand"
          aria-label={t("nav.homeName")}
        >
          <WheatMark className="heritage-brand-mark" />
          <span>
            Hustlen’<small>{t("nav.motto")}</small>
          </span>
        </Link>
        {children}
      </nav>
      {suspended ? (
        <p
          role="status"
          className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900"
        >
          {t("nav.suspended")}
        </p>
      ) : null}
    </header>
  );
}
