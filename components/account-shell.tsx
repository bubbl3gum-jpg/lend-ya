"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeritageSurface, WheatMark } from "@/components/heritage/experience";
import { useLocale } from "@/components/i18n/locale";
import type { Locale } from "@/lib/i18n/core";
import type { Appearance } from "@/lib/heritage/appearance";

const sections = [
  ["/account", "01", "account.personal"],
  ["/account/activity", "02", "nav.activity"],
  ["/account/verification", "03", "account.trust"],
] as const;

export function AccountShell({
  header,
  children,
  initialTheme,
  initialLocale,
}: {
  initialTheme: Appearance;
  initialLocale: Locale;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <HeritageSurface initialTheme={initialTheme} initialLocale={initialLocale}>
      <AccountShellContent header={header}>{children}</AccountShellContent>
    </HeritageSurface>
  );
}
function AccountShellContent({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const pathname = usePathname();
  return (
    <>
      <a className="catalogue-skip" href="#account-content">
        {t("account.skip")}
      </a>
      {header}
      <main className="catalogue-page">
        <div className="catalogue-running">
          <span>{t("account.book")}</span>
          <span>{t("account.edition")}</span>
        </div>
        <div className="catalogue-heading">
          <p className="catalogue-eyebrow">{t("account.kicker")}</p>
          <h1>{t("account.title")}</h1>
          <p>{t("account.intro")}</p>
        </div>
        <div className="catalogue-layout">
          <nav className="catalogue-index" aria-label={t("account.sections")}>
            <div className="heritage-index-art">
              <WheatMark />
              <p>
                {t("nav.small")}
                <br />
                {t("account.considered")}
              </p>
            </div>
            <p className="catalogue-eyebrow">{t("account.index")}</p>
            {sections.map(([href, number, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
              >
                <span aria-hidden="true">{number}</span>
                {t(label)}
              </Link>
            ))}
            <Link href="/dashboard">
              <span aria-hidden="true">↗</span>
              {t("account.back")}
            </Link>
          </nav>
          <div id="account-content" tabIndex={-1} className="catalogue-content">
            {pathname !== "/account" && (
              <p className="catalogue-scope-note">
                {t("account.recordsEnglish")}
              </p>
            )}
            <div lang={pathname === "/account" ? undefined : "en"}>
              {children}
            </div>
          </div>
        </div>
        <footer className="catalogue-footer">
          <span>Hustlen’</span>
          <p>{t("account.footer")}</p>
          <span>{t("account.footerEdition")}</span>
        </footer>
      </main>
    </>
  );
}
